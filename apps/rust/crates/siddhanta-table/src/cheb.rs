//! Surya Siddhanta positions as Chebyshev coefficients — the fallback file.
//!
//! The STAB table (`lib.rs`) is the server's lookup: a sample every 12 h.
//! This is the same motion as a mathematical representation, for the client
//! to carry with it: each body, over each 32-day segment, is one Chebyshev
//! polynomial, and the client evaluates it with Clenshaw's recurrence. No
//! server is involved at all — that is the point. The file is small enough
//! to ship inside the app, so the phone can still show a panchanga when the
//! server is slow or unreachable, and the same evaluator reads a Drik
//! coefficient file (different data, same shape) when one exists.
//!
//! Why coefficients instead of samples: a slow body is smooth, so it needs
//! few coefficients (Jupiter ~6 per 32 days); the Moon is fast, so it needs
//! many (~24). A sample table pays the same 12 h step for every body; a
//! coefficient file pays per body what that body needs. The format is
//! `CHEB0001`:
//!
//! ```text
//! 0   "CHEB0001"
//! 8   u32 body count (= 8), u32 segment count
//! 16  f64 first JD (UT), f64 segment length in days
//! 32  f64 mean Sun (nirayana) at the first JD, f64 its exact rate °/day
//! 48  8 × u8 Chebyshev degree per body, in Body::ALL order
//! 56  per segment, per body: (degree + 1) f32 coefficients
//! ```
//!
//! The coefficients fit the *unwrapped* longitude over the segment, so the
//! reader evaluates the polynomial and wraps the result to 0–360°. The
//! ayanamsha is not stored in a `CHEB0001` file — it is the same ten-line
//! formula the STAB reader uses — and the mean Sun is the same header
//! anchor + rate (the nirayana mean Sun is exactly linear; the reader adds
//! the ayanamsha for the sayana value).
//!
//! A Drik file is `CHEB0002`: the same 56 header bytes, plus 16 more — the
//! ayanamsha at the first JD and its rate, fitted as a straight line from
//! the kernel (Lahiri precession is linear to well under an arcsecond over
//! the file's range; the builder measures the fit and refuses a bad one).
//! There is no closed-form Lahiri formula in the reader, so the file
//! carries the two numbers instead of the reader guessing them. The mean
//! Sun is the same header anchor + rate, fitted from the kernel's Sun.
//!
//! ```text
//! CHEB0002 header: CHEB0001's 56 bytes, then
//! 56  f64 ayanamsha at the first JD, f64 its rate °/day
//! 72  per segment, per body: (degree + 1) f32 coefficients
//! ```
//!
//! The speed beside a longitude is the derivative of the polynomial, taken
//! as a ±0.05-day central difference of the evaluation itself — the
//! polynomial is smooth (it has none of the direct function's ~14 s
//! steps), so that difference is accurate to ~1e-6 °/day. The displayed
//! speed, as everywhere, is the ±0.5-day central difference of the
//! longitude, taken from the evaluation.

use std::path::Path;

use astronomy::surya_siddhanta::ayanamsha;
use thiserror::Error;

/// Magic, format version 1 (Surya Siddhanta: ayanamsha from the formula).
pub const MAGIC: &[u8; 8] = b"CHEB0001";
/// Magic, format version 2 (Drik: ayanamsha fitted from the kernel).
pub const MAGIC2: &[u8; 8] = b"CHEB0002";
/// Header size in bytes: magic, body count, segment count, first JD,
/// segment length, mean Sun anchor, mean Sun rate, degrees.
pub const HEADER: usize = 56;
/// Header size of a version-2 file: the version-1 header plus the
/// ayanamsha anchor and rate.
pub const HEADER2: usize = 72;
/// Bodies, in [`astronomy::surya_siddhanta::Body::ALL`] order.
pub const BODIES: usize = 8;
/// Default segment length, in days: the length the design was measured at.
pub const SEGMENT_DAYS: f64 = 32.0;

/// A Chebyshev coefficient table read from a `CHEB` file.
#[derive(Debug, Clone)]
pub struct ChebTable {
    /// Julian Day (UT) of the first segment's start.
    pub first_jd: f64,
    /// Days per segment.
    pub segment_days: f64,
    /// Chebyshev degree per body, in body order.
    pub degrees: [usize; BODIES],
    /// Mean Sun (nirayana), degrees, at `first_jd`.
    pub mean_sun0: f64,
    /// Mean Sun's exact rate, degrees per day.
    pub mean_sun_rate: f64,
    /// Ayanamsha (anchor at `first_jd`, rate °/day), fitted from the
    /// kernel: `Some` in a `CHEB0002` (Drik) file, `None` in a `CHEB0001`
    /// (Surya Siddhanta) file, where the reader uses the text's formula.
    pub ayanamsha: Option<(f64, f64)>,
    /// Coefficients, segment by segment, body by body, (degree + 1) f32s
    /// each, in file order.
    pub coefficients: Vec<f32>,
}

/// Positions at an instant, in the same shape as the STAB reader's, so the
/// same derivation code runs on either source.
#[derive(Debug, Clone, Copy)]
pub struct Positions {
    /// Sidereal longitude, wrapped 0–360°.
    pub longitude: [f64; BODIES],
    /// Speed, degrees per day (derivative of the fitted polynomial).
    pub speed: [f64; BODIES],
    /// Ayanamsha, degrees.
    pub ayanamsha: f64,
    /// Mean Sun, sayana, degrees.
    pub mean_sun_sayana: f64,
}

/// What can go wrong reading a `CHEB` file.
#[derive(Debug, Error)]
pub enum ChebError {
    /// The first eight bytes are not `CHEB0001`.
    #[error("not a CHEB file (bad magic)")]
    BadMagic,
    /// Fewer than 56 bytes, so there is no header to read.
    #[error("file is too short for a CHEB header")]
    TooShort,
    /// The header's body count is not the eight this reader knows.
    #[error("header says {0} bodies, this reader knows {1}")]
    BodyCount(u32, usize),
    /// The header's segment count does not match the file's length.
    #[error("segment count {0} does not match the file length")]
    SegmentCount(u32),
    /// The segment length is zero, negative or not a number.
    #[error("segment length {0} is not a positive number of days")]
    BadSegment(f64),
    /// The mean Sun rate is not a finite number.
    #[error("mean Sun rate {0} is not a finite number")]
    BadRate(f64),
    /// The ayanamsha rate in a version-2 header is not a finite number.
    #[error("ayanamsha rate {0} is not a finite number")]
    BadAyanamshaRate(f64),
    /// The file could not be read.
    #[error("could not read {0}: {1}")]
    Io(std::path::PathBuf, std::io::Error),
}

fn read_u32(bytes: &[u8], at: usize) -> u32 {
    u32::from_le_bytes([bytes[at], bytes[at + 1], bytes[at + 2], bytes[at + 3]])
}

fn read_f64(bytes: &[u8], at: usize) -> f64 {
    f64::from_le_bytes([
        bytes[at],
        bytes[at + 1],
        bytes[at + 2],
        bytes[at + 3],
        bytes[at + 4],
        bytes[at + 5],
        bytes[at + 6],
        bytes[at + 7],
    ])
}

/// Bytes of one segment: (degree + 1) f32 coefficients per body.
#[must_use]
pub fn segment_bytes(degrees: &[usize; BODIES]) -> usize {
    degrees.iter().map(|d| (d + 1) * 4).sum()
}

/// Chebyshev coefficients of `values` at the `degree + 1` Chebyshev nodes
/// of [-1, 1], in node order `x_k = cos(pi (k + 0.5) / (degree + 1))`.
///
/// The returned coefficients use the plain-sum convention with the first
/// one halved: `f(x) = c_0 + c_1 T_1(x) + ... + c_N T_N(x)`, which is what
/// [`clenshaw`] evaluates.
#[must_use]
pub fn fit_coefficients(values: &[f64], degree: usize) -> Vec<f64> {
    let n = degree + 1;
    let mut coeffs = vec![0.0; n];
    for (j, coeff) in coeffs.iter_mut().enumerate() {
        let mut sum = 0.0;
        for (k, y) in values.iter().enumerate() {
            sum += y * (std::f64::consts::PI * j as f64 * (k as f64 + 0.5) / n as f64).cos();
        }
        *coeff = 2.0 * sum / n as f64;
    }
    coeffs[0] /= 2.0;
    coeffs
}

/// Node positions `x_k = cos(pi (k + 0.5) / (n))` for `n` nodes, in [-1, 1].
#[must_use]
pub fn nodes(n: usize) -> Vec<f64> {
    (0..n)
        .map(|k| (std::f64::consts::PI * (k as f64 + 0.5) / n as f64).cos())
        .collect()
}

/// Evaluates a Chebyshev series (coefficients as [`fit_coefficients`]
/// returns them) at `x` in [-1, 1], by Clenshaw's recurrence.
#[must_use]
pub fn clenshaw(coeffs: &[f32], x: f64) -> f64 {
    let mut b1 = 0.0;
    let mut b2 = 0.0;
    for &c in coeffs.iter().skip(1).rev() {
        let b0 = 2.0 * x * b1 - b2 + f64::from(c);
        b2 = b1;
        b1 = b0;
    }
    x * b1 - b2 + f64::from(coeffs[0])
}

/// Parses a whole `CHEB` file's bytes: version 1 (`CHEB0001`, 56-byte
/// header, ayanamsha from the Surya Siddhanta formula) or version 2
/// (`CHEB0002`, 72-byte header, ayanamsha fitted from the kernel).
///
/// # Errors
///
/// [`ChebError::TooShort`] for fewer than 56 bytes, [`ChebError::BadMagic`]
/// for a wrong magic, [`ChebError::BodyCount`] for a header that names a
/// different body count, [`ChebError::BadSegment`] for a non-positive
/// segment length, [`ChebError::BadRate`] for a non-finite mean Sun rate,
/// [`ChebError::BadAyanamshaRate`] for a non-finite ayanamsha rate, and
/// [`ChebError::SegmentCount`] when the bytes do not hold the header's
/// segments.
pub fn parse(bytes: &[u8]) -> Result<ChebTable, ChebError> {
    if bytes.len() < HEADER {
        return Err(ChebError::TooShort);
    }
    let v2 = if &bytes[..8] == MAGIC2 {
        true
    } else if &bytes[..8] == MAGIC {
        false
    } else {
        return Err(ChebError::BadMagic);
    };
    let header = if v2 { HEADER2 } else { HEADER };
    if bytes.len() < header {
        return Err(ChebError::TooShort);
    }
    let bodies = read_u32(bytes, 8);
    if bodies as usize != BODIES {
        return Err(ChebError::BodyCount(bodies, BODIES));
    }
    let segments = read_u32(bytes, 12);
    let first_jd = read_f64(bytes, 16);
    let segment_days = read_f64(bytes, 24);
    if !segment_days.is_finite() || segment_days <= 0.0 {
        return Err(ChebError::BadSegment(segment_days));
    }
    let mean_sun0 = read_f64(bytes, 32);
    let mean_sun_rate = read_f64(bytes, 40);
    if !mean_sun_rate.is_finite() {
        return Err(ChebError::BadRate(mean_sun_rate));
    }
    let ayanamsha = if v2 {
        let anchor = read_f64(bytes, 56);
        let rate = read_f64(bytes, 64);
        if !rate.is_finite() {
            return Err(ChebError::BadAyanamshaRate(rate));
        }
        Some((anchor, rate))
    } else {
        None
    };
    let mut degrees = [0usize; BODIES];
    for b in 0..BODIES {
        degrees[b] = bytes[48 + b] as usize;
    }
    let want = header + segments as usize * segment_bytes(&degrees);
    if bytes.len() != want {
        return Err(ChebError::SegmentCount(segments));
    }
    let mut coefficients = Vec::with_capacity(bytes.len() - header);
    for chunk in bytes[header..].chunks_exact(4) {
        coefficients.push(f32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]));
    }
    Ok(ChebTable {
        first_jd,
        segment_days,
        degrees,
        mean_sun0,
        mean_sun_rate,
        ayanamsha,
        coefficients,
    })
}

/// Reads a `CHEB` file from disk.
///
/// # Errors
///
/// [`ChebError::Io`] when the file cannot be read, and the same errors as
/// [`parse`] for a malformed file.
pub fn open(path: &Path) -> Result<ChebTable, ChebError> {
    let bytes = std::fs::read(path).map_err(|e| ChebError::Io(path.to_path_buf(), e))?;
    parse(&bytes)
}

/// Writes a table's bytes: header, then coefficients. A table with a
/// fitted ayanamsha writes `CHEB0002` (72-byte header); without one it
/// writes `CHEB0001` (56-byte header).
#[must_use]
pub fn serialise(table: &ChebTable) -> Vec<u8> {
    let header = if table.ayanamsha.is_some() {
        HEADER2
    } else {
        HEADER
    };
    let mut out = Vec::with_capacity(header + table.coefficients.len() * 4);
    out.extend_from_slice(if table.ayanamsha.is_some() {
        MAGIC2
    } else {
        MAGIC
    });
    out.extend_from_slice(&(BODIES as u32).to_le_bytes());
    let seg_bytes = segment_bytes(&table.degrees);
    out.extend_from_slice(&((table.coefficients.len() * 4 / seg_bytes) as u32).to_le_bytes());
    out.extend_from_slice(&table.first_jd.to_le_bytes());
    out.extend_from_slice(&table.segment_days.to_le_bytes());
    out.extend_from_slice(&table.mean_sun0.to_le_bytes());
    out.extend_from_slice(&table.mean_sun_rate.to_le_bytes());
    for &d in &table.degrees {
        out.push(d as u8);
    }
    if let Some((anchor, rate)) = table.ayanamsha {
        out.extend_from_slice(&anchor.to_le_bytes());
        out.extend_from_slice(&rate.to_le_bytes());
    }
    for &c in &table.coefficients {
        out.extend_from_slice(&c.to_le_bytes());
    }
    out
}

fn wrap360(x: f64) -> f64 {
    x.rem_euclid(360.0)
}

impl ChebTable {
    /// Number of segments.
    #[must_use]
    pub fn segment_count(&self) -> usize {
        let seg_bytes = segment_bytes(&self.degrees);
        self.coefficients
            .len()
            .checked_mul(4)
            .and_then(|bytes| bytes.checked_div(seg_bytes))
            .unwrap_or(0)
    }

    /// Julian Day (UT) of the last instant covered.
    #[must_use]
    pub fn last_jd(&self) -> f64 {
        self.first_jd + self.segment_count() as f64 * self.segment_days
    }

    /// Mean Sun (nirayana), degrees, at `jd_ut`: the header anchor advanced
    /// at the exact rate.
    #[must_use]
    pub fn mean_sun_at(&self, jd_ut: f64) -> f64 {
        wrap360(self.mean_sun0 + self.mean_sun_rate * (jd_ut - self.first_jd))
    }

    /// Ayanamsha, degrees, at `jd_ut`: the header's fitted line for a
    /// version-2 (Drik) table, the text's formula for a version-1 table.
    #[must_use]
    pub fn ayanamsha_at(&self, jd_ut: f64) -> f64 {
        match self.ayanamsha {
            Some((anchor, rate)) => wrap360(anchor + rate * (jd_ut - self.first_jd)),
            None => ayanamsha(jd_ut),
        }
    }

    /// The whole segments covering `[from_jd, to_jd]`, as a table of its own: what the
    /// server sends a client for years the client does not carry. Segments are copied
    /// bit for bit, and the anchors move to the new start, so it reads back the same.
    /// `None` when the window does not overlap the table.
    #[must_use]
    pub fn slice(&self, from_jd: f64, to_jd: f64) -> Option<Self> {
        let n = self.segment_count();
        if n == 0
            || from_jd.is_nan()
            || to_jd.is_nan()
            || from_jd >= to_jd
            || to_jd < self.first_jd
            || from_jd > self.last_jd()
        {
            return None;
        }
        let first = (((from_jd - self.first_jd) / self.segment_days)
            .floor()
            .max(0.0) as usize)
            .min(n - 1);
        let last =
            (((to_jd - self.first_jd) / self.segment_days).ceil() as usize).clamp(first + 1, n);
        let seg = segment_bytes(&self.degrees) / 4;
        let first_jd = self.first_jd + first as f64 * self.segment_days;
        Some(Self {
            first_jd,
            segment_days: self.segment_days,
            degrees: self.degrees,
            mean_sun0: self.mean_sun_at(first_jd),
            mean_sun_rate: self.mean_sun_rate,
            ayanamsha: self
                .ayanamsha
                .map(|(_, rate)| (self.ayanamsha_at(first_jd), rate)),
            coefficients: self.coefficients[first * seg..last * seg].to_vec(),
        })
    }

    /// Offset, in f32 coefficients, of a body's coefficients in a segment.
    fn body_offset(&self, body: usize) -> usize {
        self.degrees[..body].iter().map(|d| d + 1).sum()
    }

    /// A body's unwrapped longitude at `jd_ut`, or `None` outside the range.
    fn longitude_unwrapped(&self, jd_ut: f64, body: usize) -> Option<f64> {
        if !jd_ut.is_finite() || jd_ut < self.first_jd || jd_ut > self.last_jd() {
            return None;
        }
        let at = (jd_ut - self.first_jd) / self.segment_days;
        let seg = (at.floor() as usize).min(self.segment_count().saturating_sub(1));
        let seg_start = self.first_jd + seg as f64 * self.segment_days;
        let x = (2.0 * (jd_ut - seg_start) / self.segment_days - 1.0).clamp(-1.0, 1.0);
        let seg_bytes = segment_bytes(&self.degrees) / 4;
        let base = seg * seg_bytes + self.body_offset(body);
        let n = self.degrees[body] + 1;
        Some(clenshaw(&self.coefficients[base..base + n], x))
    }

    /// Positions at `jd_ut`, or `None` outside the covered range.
    #[must_use]
    pub fn positions_at(&self, jd_ut: f64) -> Option<Positions> {
        if !jd_ut.is_finite() || jd_ut < self.first_jd || jd_ut > self.last_jd() {
            return None;
        }
        let mut longitude = [0.0; BODIES];
        let mut speed = [0.0; BODIES];
        // The polynomial is smooth, so the speed is the central difference
        // of the evaluation itself at ±0.05 d (~72 minutes).
        let delta = 0.05;
        for b in 0..BODIES {
            let lon = self.longitude_unwrapped(jd_ut, b)?;
            longitude[b] = wrap360(lon);
            let lo = (jd_ut - delta).max(self.first_jd);
            let hi = (jd_ut + delta).min(self.last_jd());
            if hi > lo {
                let diff = self.longitude_unwrapped(hi, b)? - self.longitude_unwrapped(lo, b)?;
                speed[b] = diff / (hi - lo);
            }
        }
        let aya = self.ayanamsha_at(jd_ut);
        Some(Positions {
            longitude,
            speed,
            ayanamsha: aya,
            mean_sun_sayana: wrap360(self.mean_sun_at(jd_ut) + aya),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// A table for cos over one segment, fitted at degree 12: cos is entire,
    /// so the fit is exact to ~1e-12 and Clenshaw must reproduce it.
    fn cos_table() -> ChebTable {
        let degree = 12;
        let xs = nodes(degree + 1);
        let values: Vec<f64> = xs.iter().map(|x| (x * 2.0).cos()).collect();
        let mut coeffs: Vec<f32> = fit_coefficients(&values, degree)
            .iter()
            .map(|c| *c as f32)
            .collect();
        // The other seven bodies are constant 0 (degree 0, one coefficient).
        coeffs.extend(std::iter::repeat_n(0.0f32, 7));
        ChebTable {
            first_jd: 2_460_000.0,
            segment_days: 32.0,
            degrees: [degree, 0, 0, 0, 0, 0, 0, 0],
            mean_sun0: 150.0,
            mean_sun_rate: 0.9856,
            ayanamsha: None,
            coefficients: coeffs,
        }
    }

    #[test]
    fn clenshaw_reproduces_a_fitted_cosine() {
        let table = cos_table();
        for x in [-1.0, -0.5, 0.0, 0.3, 0.9, 1.0] {
            let jd = table.first_jd + (f64::midpoint(x, 1.0)) * table.segment_days;
            let got = table.longitude_unwrapped(jd, 0).unwrap();
            assert!((got - (x * 2.0).cos()).abs() < 1e-5, "x={x}: {got}");
        }
    }

    #[test]
    fn serialise_round_trips() {
        let table = cos_table();
        let back = parse(&serialise(&table)).unwrap();
        assert_eq!(back.first_jd, table.first_jd);
        assert_eq!(back.degrees, table.degrees);
        assert_eq!(back.coefficients, table.coefficients);
        assert_eq!(back.ayanamsha, None);
    }

    #[test]
    fn version_two_round_trips_and_uses_its_ayanamsha() {
        let mut table = cos_table();
        table.ayanamsha = Some((24.0, 0.000_038_5));
        let bytes = serialise(&table);
        assert_eq!(&bytes[..8], b"CHEB0002");
        assert_eq!(bytes.len(), HEADER2 + table.coefficients.len() * 4);
        let back = parse(&bytes).unwrap();
        assert_eq!(back.ayanamsha, Some((24.0, 0.000_038_5)));
        assert_eq!(back.coefficients, table.coefficients);
        let at = back.positions_at(back.first_jd + 10.0).unwrap();
        assert!((at.ayanamsha - (24.0 + 0.000_038_5 * 10.0)).abs() < 1e-9);
        assert!(
            (at.mean_sun_sayana - (back.mean_sun_at(back.first_jd + 10.0) + at.ayanamsha)).abs()
                < 1e-9
        );
    }

    #[test]
    fn parse_rejects_a_wrong_magic_and_a_truncated_file() {
        let mut bytes = serialise(&cos_table());
        bytes[0] = b'X';
        assert!(matches!(parse(&bytes), Err(ChebError::BadMagic)));
        bytes = serialise(&cos_table());
        bytes.truncate(HEADER + 4);
        assert!(matches!(parse(&bytes), Err(ChebError::SegmentCount(_))));
    }

    #[test]
    fn positions_at_the_edges_and_outside() {
        let table = cos_table();
        assert!(table.positions_at(table.first_jd).is_some());
        assert!(table.positions_at(table.last_jd()).is_some());
        assert!(table.positions_at(table.first_jd - 1.0).is_none());
        assert!(table.positions_at(table.last_jd() + 1.0).is_none());
    }
}
