//! Our compact binary format for the JPL Chebyshev data, and the evaluator.
//!
//! Layout of a `.veph` file (little-endian, every section 8-byte aligned):
//!
//! ```text
//! 0   "VEPH0002"
//! 8   u32 segment count, u32 reserved
//! 16  f64 first second, f64 last second   (common coverage, TDB s since J2000)
//! 32  per segment, 48 bytes:
//!       i32 target, i32 center, f64 init, f64 intlen, u32 ncoef, u32 nrec,
//!       u64 data offset, f64 step (0 = raw f64 coefficients)
//! ..  per segment, 24 bytes: u8 bit width of coefficient k (packed segments only)
//! ..  per segment: nrec records of the x, y, z Chebyshev coefficients, either 3 * ncoef
//!     raw f64, or bit-packed integers (coefficient / step, each at its own width)
//! ```
//!
//! Every Chebyshev coefficient is kept (the JPL fit is not resampled). What goes is
//! bookkeeping: the per-record midpoint and radius (regular spacing gives them) and
//! unused bodies. A packed segment also rounds each coefficient to a fixed step in
//! km (1 m by default), which sets the position error, and gives each coefficient
//! index only the bits its largest value needs.

use std::{
    cell::RefCell,
    io::Write,
    path::Path,
    sync::atomic::{AtomicU64, Ordering},
};

use crate::daf::{DafError, RawSegment, read_spk};

const MAGIC: &[u8; 8] = b"VEPH0002";
const ENTRY: usize = 48;
const WIDTHS: usize = 24;
const MAX_COEF: usize = 24;
const HEADER: usize = 32;

/// Light speed, km/s.
pub const C_KM_S: f64 = 299_792.458;

/// Why a kernel could not be loaded or evaluated.
#[derive(Debug, thiserror::Error)]
pub enum KernelError {
    /// The file could not be read or written.
    #[error("kernel i/o: {0}")]
    Io(#[from] std::io::Error),
    /// The SPK could not be read.
    #[error(transparent)]
    Spk(#[from] DafError),
    /// The bytes are not a `.veph` file.
    #[error("not a VEPH kernel: {0}")]
    Format(&'static str),
    /// A wanted body is not in the SPK.
    #[error("the SPK has no segment {target} relative to {center}")]
    MissingSegment {
        /// NAIF target.
        target: i32,
        /// NAIF centre.
        center: i32,
    },
    /// A table of boundaries is not in the order the format relies on.
    #[error("{kind} boundaries out of sequence at JD {jd} (event {at})")]
    Sequence {
        /// Which table.
        kind: String,
        /// The Julian Day of the first event that breaks the order.
        jd: f64,
        /// Its position in the table.
        at: usize,
    },
    /// The time is outside the data.
    #[error("second {0} is outside the ephemeris")]
    OutOfRange(f64),
}

/// A position (km) and velocity (km/s).
#[derive(Debug, Clone, Copy, PartialEq, Default)]
pub struct State {
    /// Position.
    pub pos: [f64; 3],
    /// Velocity.
    pub vel: [f64; 3],
}

/// One body relative to its centre: where its records are.
#[derive(Debug, Clone, Copy)]
struct Segment {
    target: i32,
    center: i32,
    init: f64,
    intlen: f64,
    ncoef: usize,
    nrec: usize,
    /// Raw segments: the index of the first coefficient in `Kernel::coefs`.
    /// Packed segments: the byte offset of the first record in `Kernel::packed`.
    at: usize,
    /// The rounding step in km; 0 for raw coefficients.
    step: f64,
    /// Bit width of each coefficient index (packed segments).
    widths: [u8; WIDTHS],
    /// Bits in one axis of a record, and in a whole record.
    axis_bits: usize,
}

/// The segments of the bodies the sky needs, as `(target, center)` pairs: the Sun and
/// the planet barycentres relative to the solar-system barycentre, and the Earth and
/// the Moon relative to the Earth–Moon barycentre.
pub const WANTED: [(i32, i32); 12] = [
    (10, 0),
    (3, 0),
    (399, 3),
    (301, 3),
    (1, 0),
    (2, 0),
    (4, 0),
    (5, 0),
    (6, 0),
    (7, 0),
    (8, 0),
    (9, 0),
];

/// Source of kernel ids, so the per-thread record cache can tell two kernels apart.
static NEXT_KERNEL_ID: AtomicU64 = AtomicU64::new(1);

type Record = [[f64; MAX_COEF]; 3];

/// A decoded record kept for the next evaluation.
struct CachedRecord {
    kernel: u64,
    slot: usize,
    rec: usize,
    data: Record,
}

thread_local! {
    /// The last decoded record of each segment slot, per thread. Evaluations close in
    /// time (the Sun and the Moon several times a day, a day's rise and set) fall in
    /// the same record, so decoding the packed coefficients once serves them all.
    /// Decoding is deterministic: the cache never changes a value.
    static RECORDS: RefCell<[Option<CachedRecord>; 16]> = const { RefCell::new([const { None }; 16]) };
}

/// The evaluator: every wanted segment's Chebyshev coefficients, in memory.
#[derive(Debug, Clone)]
pub struct Kernel {
    id: u64,
    segments: Vec<Segment>,
    coefs: Vec<f64>,
    packed: Vec<u8>,
    first: f64,
    last: f64,
}

/// The pieces of one body's segment from every kernel, joined into one run of records.
fn merge(raw: &[RawSegment], target: i32, center: i32) -> Result<RawSegment, KernelError> {
    let mut parts: Vec<&RawSegment> = raw
        .iter()
        .filter(|s| s.target == target && s.center == center && s.nrec > 0)
        .collect();
    parts.sort_by(|a, b| a.init.total_cmp(&b.init));
    let first = parts
        .first()
        .ok_or(KernelError::MissingSegment { target, center })?;
    let ncoef = parts.iter().map(|p| p.ncoef).max().unwrap_or(first.ncoef);
    let mut out = RawSegment {
        init: first.init,
        coefs: Vec::new(),
        nrec: 0,
        ncoef,
        start: first.start,
        end: first.end,
        ..(*first).clone()
    };
    for part in parts {
        let expected = out.init + out.nrec as f64 * out.intlen;
        if (part.intlen - out.intlen).abs() > 1e-9 {
            return Err(KernelError::Format("kernel pieces differ in record length"));
        }
        // DE441's two halves overlap by a few records; the second piece's records that
        // repeat the first's end are dropped, but only when the grids line up.
        let overlap = (expected - part.init) / out.intlen;
        let skip = if out.nrec > 0 && overlap > 1e-9 {
            if (overlap - overlap.round()).abs() > 1e-6 {
                return Err(KernelError::Format(
                    "kernel pieces overlap off the record grid",
                ));
            }
            overlap.round() as usize
        } else {
            0
        };
        if skip >= part.nrec || (out.nrec > 0 && overlap < -1e-9) {
            if skip >= part.nrec {
                continue;
            }
            return Err(KernelError::Format("kernel pieces leave a gap"));
        }
        // a piece with fewer coefficients is the same series with zero tails
        for rec in part.coefs.chunks_exact(part.ncoef).skip(skip * 3) {
            out.coefs.extend_from_slice(rec);
            out.coefs.resize(out.coefs.len() + ncoef - part.ncoef, 0.0);
        }
        out.nrec += part.nrec - skip;
        out.start = out.start.min(part.start);
        out.end = out.end.max(part.end);
    }
    Ok(out)
}

/// Bits to hold `n` magnitudes plus a sign.
fn bits_for(n: u64) -> u8 {
    (u64::BITS - n.leading_zeros()) as u8 + 1
}

/// A coefficient index's width: the bits its largest rounded value needs.
fn widths_for(seg: &RawSegment, step: f64) -> [u8; WIDTHS] {
    let mut widths = [0u8; WIDTHS];
    for k in 0..seg.ncoef {
        let max = seg
            .coefs
            .chunks_exact(seg.ncoef)
            .map(|axis| axis[k].abs())
            .fold(0.0, f64::max);
        widths[k] = bits_for((max / step).round() as u64);
    }
    widths
}

fn read_bits(bytes: &[u8], bit: usize, width: usize) -> u64 {
    let at = bit / 8;
    let mut word = [0u8; 8];
    let n = (bytes.len() - at).min(8);
    word[..n].copy_from_slice(&bytes[at..at + n]);
    (u64::from_le_bytes(word) >> (bit % 8)) & ((1u64 << width) - 1)
}

fn write_bits(bytes: &mut [u8], bit: usize, width: usize, value: u64) {
    for i in 0..width {
        if value >> i & 1 == 1 {
            bytes[(bit + i) / 8] |= 1 << ((bit + i) % 8);
        }
    }
}

impl Segment {
    /// The coefficients of record `rec`, axis by axis.
    fn record(&self, coefs: &[f64], packed: &[u8], rec: usize) -> [[f64; MAX_COEF]; 3] {
        let n = self.ncoef;
        let mut out = [[0.0; MAX_COEF]; 3];
        if self.step == 0.0 {
            let base = self.at + rec * 3 * n;
            for (axis, row) in out.iter_mut().enumerate() {
                row[..n].copy_from_slice(&coefs[base + axis * n..base + (axis + 1) * n]);
            }
        } else {
            let record_bits = 3 * self.axis_bits;
            let origin = self.at * 8 + rec * record_bits;
            for (axis, row) in out.iter_mut().enumerate() {
                let mut bit = origin + axis * self.axis_bits;
                for (k, slot) in row.iter_mut().enumerate().take(n) {
                    let w = self.widths[k] as usize;
                    let bias = 1i64 << (w - 1);
                    *slot = (read_bits(packed, bit, w) as i64 - bias) as f64 * self.step;
                    bit += w;
                }
            }
        }
        out
    }
}

impl Kernel {
    /// Extracts [`WANTED`] from one or more JPL SPKs (DE441 comes in two halves that
    /// join end to end), keeping only records that overlap
    /// `[from_second, to_second]` (TDB seconds since J2000). With `step_km` above 0
    /// every coefficient is rounded to that step and bit-packed; 0 keeps the JPL
    /// doubles as they are.
    ///
    /// # Errors
    ///
    /// [`KernelError`] for an unreadable SPK or a missing body.
    pub fn from_spk(
        paths: &[&Path],
        from_second: f64,
        to_second: f64,
        step_km: f64,
    ) -> Result<Self, KernelError> {
        let mut raw = Vec::new();
        for path in paths {
            raw.extend(read_spk(path, from_second, to_second)?);
        }
        let mut segments = Vec::new();
        let mut coefs = Vec::new();
        let mut packed = Vec::new();
        let (mut first, mut last) = (f64::NEG_INFINITY, f64::INFINITY);
        for (target, center) in WANTED {
            let merged = merge(&raw, target, center)?;
            let seg = &merged;
            if seg.ncoef > MAX_COEF {
                return Err(KernelError::Format(
                    "more coefficients than the evaluator holds",
                ));
            }
            let skip = ((from_second - seg.init) / seg.intlen).floor().max(0.0) as usize;
            let upto = (((to_second - seg.init) / seg.intlen).ceil() as usize).min(seg.nrec);
            let nrec = upto.saturating_sub(skip);
            let kept = RawSegment {
                coefs: seg.coefs[skip * 3 * seg.ncoef..upto * 3 * seg.ncoef].to_vec(),
                ..seg.clone()
            };
            let mut widths = [0u8; WIDTHS];
            let mut axis_bits = 0;
            let at;
            if step_km > 0.0 {
                widths = widths_for(&kept, step_km);
                axis_bits = widths.iter().map(|w| *w as usize).sum();
                while packed.len() % 8 != 0 {
                    packed.push(0);
                }
                at = packed.len();
                let total_bits = nrec * 3 * axis_bits;
                packed.resize(at + total_bits.div_ceil(8) + 8, 0);
                for r in 0..nrec {
                    let mut bit = at * 8 + r * 3 * axis_bits;
                    for axis in 0..3 {
                        let row =
                            &kept.coefs[(r * 3 + axis) * seg.ncoef..(r * 3 + axis + 1) * seg.ncoef];
                        for (k, c) in row.iter().enumerate() {
                            let w = widths[k] as usize;
                            let n = (c / step_km).round() as i64 + (1i64 << (w - 1));
                            write_bits(&mut packed, bit, w, n as u64);
                            bit += w;
                        }
                    }
                }
            } else {
                at = coefs.len();
                coefs.extend_from_slice(&kept.coefs);
            }
            let init = seg.init + skip as f64 * seg.intlen;
            first = first.max(init.max(seg.start));
            last = last.min((init + nrec as f64 * seg.intlen).min(seg.end));
            segments.push(Segment {
                target,
                center,
                init,
                intlen: seg.intlen,
                ncoef: seg.ncoef,
                nrec,
                at,
                step: step_km,
                widths,
                axis_bits,
            });
        }
        Ok(Self {
            id: NEXT_KERNEL_ID.fetch_add(1, Ordering::Relaxed),
            segments,
            coefs,
            packed,
            first,
            last,
        })
    }

    /// The covered span in seconds (TDB since J2000).
    #[must_use]
    pub const fn coverage(&self) -> (f64, f64) {
        (self.first, self.last)
    }

    /// Bytes the coefficients take (in the file and in memory).
    #[must_use]
    pub fn data_bytes(&self) -> usize {
        self.coefs.len() * 8 + self.packed.len()
    }

    /// Writes the `.veph` file.
    ///
    /// # Errors
    ///
    /// [`KernelError::Io`] when the file cannot be written.
    pub fn write(&self, path: &Path) -> Result<(), KernelError> {
        let mut out = std::io::BufWriter::new(std::fs::File::create(path)?);
        out.write_all(MAGIC)?;
        out.write_all(
            &u32::try_from(self.segments.len())
                .unwrap_or(0)
                .to_le_bytes(),
        )?;
        out.write_all(&0u32.to_le_bytes())?;
        out.write_all(&self.first.to_le_bytes())?;
        out.write_all(&self.last.to_le_bytes())?;
        let table = HEADER + (ENTRY + WIDTHS) * self.segments.len();
        let mut offset = table.div_ceil(8) * 8;
        let mut offsets = Vec::new();
        for s in &self.segments {
            offsets.push(offset);
            out.write_all(&s.target.to_le_bytes())?;
            out.write_all(&s.center.to_le_bytes())?;
            out.write_all(&s.init.to_le_bytes())?;
            out.write_all(&s.intlen.to_le_bytes())?;
            out.write_all(&u32::try_from(s.ncoef).unwrap_or(0).to_le_bytes())?;
            out.write_all(&u32::try_from(s.nrec).unwrap_or(0).to_le_bytes())?;
            out.write_all(&(offset as u64).to_le_bytes())?;
            out.write_all(&s.step.to_le_bytes())?;
            offset += Self::segment_bytes(s).div_ceil(8) * 8;
        }
        for s in &self.segments {
            out.write_all(&s.widths)?;
        }
        out.write_all(&vec![0u8; table.div_ceil(8) * 8 - table])?;
        for s in &self.segments {
            let n = Self::segment_bytes(s);
            if s.step == 0.0 {
                for c in &self.coefs[s.at..s.at + s.nrec * 3 * s.ncoef] {
                    out.write_all(&c.to_le_bytes())?;
                }
            } else {
                out.write_all(&self.packed[s.at..s.at + n])?;
            }
            out.write_all(&vec![0u8; n.div_ceil(8) * 8 - n])?;
        }
        out.flush()?;
        Ok(())
    }

    fn segment_bytes(s: &Segment) -> usize {
        if s.step == 0.0 {
            s.nrec * 3 * s.ncoef * 8
        } else {
            (s.nrec * 3 * s.axis_bits).div_ceil(8) + 8
        }
    }

    /// Reads a `.veph` file.
    ///
    /// # Errors
    ///
    /// [`KernelError`] for an unreadable or malformed file.
    pub fn open(path: &Path) -> Result<Self, KernelError> {
        Self::from_bytes(std::fs::read(path)?)
    }

    /// Parses `.veph` bytes. Packed coefficients stay packed, in the very buffer they
    /// were read into: no second copy.
    ///
    /// # Errors
    ///
    /// [`KernelError::Format`] for malformed bytes.
    pub fn from_bytes(bytes: Vec<u8>) -> Result<Self, KernelError> {
        let bad = KernelError::Format;
        if bytes.len() < HEADER || &bytes[..8] != MAGIC {
            return Err(bad("wrong magic"));
        }
        let u32_at = |at: usize| u32::from_le_bytes(bytes[at..at + 4].try_into().unwrap_or([0; 4]));
        let f64_at = |at: usize| f64::from_le_bytes(bytes[at..at + 8].try_into().unwrap_or([0; 8]));
        let n = u32_at(8) as usize;
        let (first, last) = (f64_at(16), f64_at(24));
        if bytes.len() < HEADER + (ENTRY + WIDTHS) * n {
            return Err(bad("truncated segment table"));
        }
        let widths_at = HEADER + ENTRY * n;
        let mut segments = Vec::with_capacity(n);
        let mut coefs = Vec::new();
        let mut any_packed = false;
        for i in 0..n {
            let e = HEADER + ENTRY * i;
            let ncoef = u32_at(e + 24) as usize;
            let nrec = u32_at(e + 28) as usize;
            let off =
                u64::from_le_bytes(bytes[e + 32..e + 40].try_into().unwrap_or([0; 8])) as usize;
            let step = f64_at(e + 40);
            if ncoef > MAX_COEF {
                return Err(bad("too many coefficients"));
            }
            let mut widths = [0u8; WIDTHS];
            widths.copy_from_slice(&bytes[widths_at + WIDTHS * i..widths_at + WIDTHS * (i + 1)]);
            let axis_bits = widths.iter().map(|w| *w as usize).sum();
            let mut seg = Segment {
                target: i32::from_le_bytes(bytes[e..e + 4].try_into().unwrap_or([0; 4])),
                center: i32::from_le_bytes(bytes[e + 4..e + 8].try_into().unwrap_or([0; 4])),
                init: f64_at(e + 8),
                intlen: f64_at(e + 16),
                ncoef,
                nrec,
                at: 0,
                step,
                widths,
                axis_bits,
            };
            let len = if step == 0.0 {
                nrec * 3 * ncoef * 8
            } else {
                (nrec * 3 * axis_bits).div_ceil(8) + 8
            };
            let data = bytes
                .get(off..off + len)
                .ok_or(bad("truncated coefficients"))?;
            if step == 0.0 {
                seg.at = coefs.len();
                coefs.extend(
                    data.chunks_exact(8)
                        .map(|c| f64::from_le_bytes(c.try_into().unwrap_or([0; 8]))),
                );
            } else {
                any_packed = true;
                seg.at = off;
            }
            segments.push(seg);
        }
        // Packed segments index straight into the file's own bytes.
        let packed = if any_packed { bytes } else { Vec::new() };
        Ok(Self {
            id: NEXT_KERNEL_ID.fetch_add(1, Ordering::Relaxed),
            segments,
            coefs,
            packed,
            first,
            last,
        })
    }

    /// The index of the `(target, center)` segment, for [`Kernel::eval`].
    ///
    /// # Errors
    ///
    /// [`KernelError::MissingSegment`] when the kernel lacks it.
    pub fn segment(&self, target: i32, center: i32) -> Result<usize, KernelError> {
        self.segments
            .iter()
            .position(|s| s.target == target && s.center == center)
            .ok_or(KernelError::MissingSegment { target, center })
    }

    /// The record of segment `slot` at `et`, and the Chebyshev argument in [-1, 1].
    fn locate(&self, slot: usize, et: f64) -> Result<([[f64; MAX_COEF]; 3], f64), KernelError> {
        let s = &self.segments[slot];
        let rel = (et - s.init) / s.intlen;
        if !(0.0..=s.nrec as f64).contains(&rel) || rel.is_nan() {
            return Err(KernelError::OutOfRange(et));
        }
        let rec = (rel.floor() as usize).min(s.nrec - 1);
        let x = 2.0 * (rel - rec as f64) - 1.0;
        let data = RECORDS.with_borrow_mut(|cache| {
            let entry = &mut cache[slot % 16];
            if let Some(hit) = entry
                .as_ref()
                .filter(|c| c.kernel == self.id && c.slot == slot && c.rec == rec)
            {
                return hit.data;
            }
            let data = s.record(&self.coefs, &self.packed, rec);
            *entry = Some(CachedRecord {
                kernel: self.id,
                slot,
                rec,
                data,
            });
            data
        });
        Ok((data, x))
    }

    /// Position and velocity of segment `slot` at `et` seconds past J2000 TDB.
    ///
    /// # Errors
    ///
    /// [`KernelError::OutOfRange`] outside the segment's records.
    pub fn eval(&self, slot: usize, et: f64) -> Result<State, KernelError> {
        let s = &self.segments[slot];
        let (c, x) = self.locate(slot, et)?;
        let n = s.ncoef;
        // T_k and T'_k by recurrence, shared by the three axes.
        let mut t = [0.0_f64; MAX_COEF];
        let mut dt = [0.0_f64; MAX_COEF];
        t[0] = 1.0;
        if n > 1 {
            t[1] = x;
            dt[1] = 1.0;
        }
        for k in 2..n {
            t[k] = 2.0 * x * t[k - 1] - t[k - 2];
            dt[k] = 2.0 * t[k - 1] + 2.0 * x * dt[k - 1] - dt[k - 2];
        }
        let scale = 2.0 / s.intlen;
        let mut out = State::default();
        for axis in 0..3 {
            let (mut p, mut v) = (0.0, 0.0);
            for k in (0..n).rev() {
                p += c[axis][k] * t[k];
                v += c[axis][k] * dt[k];
            }
            out.pos[axis] = p;
            out.vel[axis] = v * scale;
        }
        Ok(out)
    }

    /// Position only: the cheaper evaluation used inside light-time iterations.
    ///
    /// # Errors
    ///
    /// As [`Kernel::eval`].
    pub fn eval_pos(&self, slot: usize, et: f64) -> Result<[f64; 3], KernelError> {
        let n = self.segments[slot].ncoef;
        let (c, x) = self.locate(slot, et)?;
        let mut out = [0.0; 3];
        for (axis, slot) in out.iter_mut().enumerate() {
            // Clenshaw
            let (mut b1, mut b2) = (0.0, 0.0);
            for k in (1..n).rev() {
                let b = 2.0 * x * b1 - b2 + c[axis][k];
                b2 = b1;
                b1 = b;
            }
            *slot = x * b1 - b2 + c[axis][0];
        }
        Ok(out)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// One segment (target 10, centre 0): two records of 3 coefficients per axis.
    fn synthetic(step: f64) -> Vec<u8> {
        // axis coefficients, record 0 then 1: x = 1 + 2T1 + 3T2, y = T1, z = -5
        let coefs: [[f64; 3]; 6] = [
            [1.0, 2.0, 3.0],
            [0.0, 1.0, 0.0],
            [-5.0, 0.0, 0.0],
            [10.0, 0.0, -1.0],
            [0.5, 0.5, 0.5],
            [0.0, 0.0, 2.0],
        ];
        let mut widths = [0u8; WIDTHS];
        for k in 0..3 {
            let max = coefs.iter().map(|a| a[k].abs()).fold(0.0, f64::max);
            widths[k] = if step > 0.0 {
                bits_for((max / step).round() as u64)
            } else {
                0
            };
        }
        let axis_bits: usize = widths.iter().map(|w| *w as usize).sum();
        let data: Vec<u8> = if step == 0.0 {
            coefs
                .iter()
                .flatten()
                .flat_map(|c| c.to_le_bytes())
                .collect()
        } else {
            let mut bytes = vec![0u8; (2 * 3 * axis_bits).div_ceil(8) + 8];
            let mut bit = 0;
            for axis in &coefs {
                for (k, c) in axis.iter().enumerate() {
                    let w = widths[k] as usize;
                    write_bits(
                        &mut bytes,
                        bit,
                        w,
                        ((c / step).round() as i64 + (1i64 << (w - 1))) as u64,
                    );
                    bit += w;
                }
            }
            bytes
        };
        let table = HEADER + (ENTRY + WIDTHS);
        let off = table.div_ceil(8) * 8;
        let mut out = Vec::new();
        out.extend_from_slice(MAGIC);
        out.extend_from_slice(&1u32.to_le_bytes());
        out.extend_from_slice(&0u32.to_le_bytes());
        out.extend_from_slice(&0.0f64.to_le_bytes());
        out.extend_from_slice(&200.0f64.to_le_bytes());
        out.extend_from_slice(&10i32.to_le_bytes());
        out.extend_from_slice(&0i32.to_le_bytes());
        out.extend_from_slice(&0.0f64.to_le_bytes());
        out.extend_from_slice(&100.0f64.to_le_bytes());
        out.extend_from_slice(&3u32.to_le_bytes());
        out.extend_from_slice(&2u32.to_le_bytes());
        out.extend_from_slice(&(off as u64).to_le_bytes());
        out.extend_from_slice(&step.to_le_bytes());
        out.extend_from_slice(&widths);
        out.resize(off, 0);
        out.extend_from_slice(&data);
        out
    }

    #[test]
    fn bits_round_trip_at_every_offset_and_width() {
        let mut bytes = vec![0u8; 64];
        let mut at = 0;
        let values: Vec<(usize, u64)> =
            vec![(3, 5), (17, 99_999), (40, 0xAB_CDEF_1234), (1, 1), (9, 300)];
        for (w, v) in &values {
            write_bits(&mut bytes, at, *w, *v);
            at += w;
        }
        let mut at = 0;
        for (w, v) in &values {
            assert_eq!(read_bits(&bytes, at, *w), *v, "width {w}");
            at += w;
        }
    }

    #[test]
    fn raw_and_packed_segments_evaluate_the_chebyshev_series() {
        for step in [0.0, 0.5] {
            let k = Kernel::from_bytes(synthetic(step)).expect("a valid kernel");
            let slot = k.segment(10, 0).expect("segment");
            // record 0 spans seconds 0..100: at the midpoint x = 0, T1 = 0, T2 = -1
            let s = k.eval(slot, 50.0).expect("in range");
            assert!(
                (s.pos[0] - (1.0 - 3.0)).abs() < 1e-12,
                "x(0) = 1 - 3, step {step}"
            );
            assert!(s.pos[1].abs() < 1e-12 && (s.pos[2] + 5.0).abs() < 1e-12);
            // velocity: dx/dt = (2 + 3*4x) * 2/intlen = 2 * 0.02 at x = 0
            assert!((s.vel[0] - 0.04).abs() < 1e-12, "{}", s.vel[0]);
            // the end of record 0 is x = 1: 1 + 2 + 3 = 6, y = 1
            let e = k.eval_pos(slot, 99.999_999).expect("in range");
            assert!((e[0] - 6.0).abs() < 1e-6 && (e[1] - 1.0).abs() < 1e-6);
            // record 1 starts at 100: x = -1 -> 10 + 0 - 1*T2(-1) = 9
            assert!((k.eval_pos(slot, 100.0).expect("in range")[0] - 9.0).abs() < 1e-9);
            assert!(
                matches!(k.eval(slot, 200.5), Err(KernelError::OutOfRange(_))),
                "past the end"
            );
            assert!(
                matches!(k.eval(slot, -1.0), Err(KernelError::OutOfRange(_))),
                "before the start"
            );
        }
    }

    #[test]
    fn a_kernel_writes_what_it_reads() {
        let k = Kernel::from_bytes(synthetic(0.5)).expect("kernel");
        let path = std::env::temp_dir().join(format!("ephdata-{}.veph", std::process::id()));
        k.write(&path).expect("written");
        let back = Kernel::open(&path).expect("read back");
        std::fs::remove_file(&path).ok();
        let slot = back.segment(10, 0).expect("segment");
        assert_eq!(
            k.eval(k.segment(10, 0).expect("segment"), 37.5)
                .expect("ok"),
            back.eval(slot, 37.5).expect("ok")
        );
        assert!(Kernel::from_bytes(vec![0; 64]).is_err(), "wrong magic");
    }

    fn piece(init: f64, nrec: usize, value: f64) -> RawSegment {
        RawSegment {
            target: 10,
            center: 0,
            start: init,
            end: init + nrec as f64 * 100.0,
            init,
            intlen: 100.0,
            ncoef: 2,
            nrec,
            coefs: vec![value; nrec * 6],
        }
    }

    #[test]
    fn halves_that_overlap_on_the_grid_are_joined_once() {
        // 4 records 0..400, then 5 records from 300 (one repeated): 8 records in all
        let merged = merge(&[piece(300.0, 5, 2.0), piece(0.0, 4, 1.0)], 10, 0).expect("joins");
        assert_eq!((merged.init, merged.nrec), (0.0, 8));
        assert_eq!(merged.coefs.len(), 8 * 6);
        assert!(
            (merged.coefs[3 * 6] - 1.0).abs() < f64::EPSILON,
            "the first half keeps the overlap"
        );
        assert!((merged.coefs[4 * 6] - 2.0).abs() < f64::EPSILON);
        // a gap, an off-grid overlap and a different record length are all refused
        assert!(
            merge(&[piece(0.0, 4, 1.0), piece(500.0, 2, 2.0)], 10, 0).is_err(),
            "gap"
        );
        assert!(
            merge(&[piece(0.0, 4, 1.0), piece(350.0, 2, 2.0)], 10, 0).is_err(),
            "off grid"
        );
        let mut other = piece(400.0, 2, 2.0);
        other.intlen = 50.0;
        assert!(
            merge(&[piece(0.0, 4, 1.0), other], 10, 0).is_err(),
            "record length"
        );
    }
}
