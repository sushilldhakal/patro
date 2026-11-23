//! Surya Siddhanta positions, precomputed into a table file.
//!
//! The format (`STAB0001`) and the reasoning behind it live in this crate's
//! `README.md`. In short: one sample every few hours, eight bodies' sidereal
//! longitudes and speeds plus the ayanamsha and the mean Sun (sayana), so a
//! reader can interpolate a position at any instant and a client can derive
//! graha, tithi, nakshatra, pada, yoga, karana and lagna without ever
//! evaluating a Surya Siddhanta formula.
//!
//! Longitudes are stored wrapped (0–360°): an unwrapped longitude over 200
//! years reaches ~26 million degrees, where an f32 has ~2° of resolution.
//! The reader unwraps the two bracketing samples against each other, which is
//! unambiguous because no body moves 180° in one step.

#![expect(
    clippy::cast_possible_truncation,
    clippy::cast_sign_loss,
    clippy::cast_precision_loss,
    clippy::cast_possible_wrap,
    reason = "numeric code: Julian Days, bit widths and table offsets move between f64 and integers on purpose, every one range-checked by the format or the tests"
)]

use std::path::Path;

use thiserror::Error;

/// Magic, format version 1.
pub const MAGIC: &[u8; 8] = b"STAB0001";
/// Header size in bytes: magic, body count, sample count, first JD, step.
pub const HEADER: usize = 32;
/// Bodies, in [`astronomy::Body::ALL`] order.
pub const BODIES: usize = 8;
/// Bytes per sample: 8 bodies × (f32 longitude, f32 speed) + f32 ayanamsha
/// + f32 mean Sun (sayana).
pub const SAMPLE_BYTES: usize = BODIES * 8 + 8;

/// A position table read from a `STAB` file, or a slice of one.
#[derive(Debug, Clone)]
pub struct Table {
    /// Julian Day (UT) of the first sample.
    pub first_jd: f64,
    /// Days between samples.
    pub step_days: f64,
    /// Samples, each `SAMPLE_BYTES` bytes, in file order.
    pub samples: Vec<u8>,
}

/// Positions at an instant: sidereal longitudes and speeds per body, in
/// [`astronomy::Body::ALL`] order, plus the ayanamsha and the mean Sun
/// (sayana), all degrees (speeds in degrees per day).
///
/// The speed is the instantaneous derivative of the longitude — what Hermite
/// interpolation needs — not the speed the API shows. The text defines speed
/// as the ±0.5-day central difference; a client that wants the displayed
/// speed takes the central difference of this table at ±0.5 days.
#[derive(Debug, Clone, Copy)]
pub struct Positions {
    /// Sidereal longitude, wrapped 0–360°.
    pub longitude: [f64; BODIES],
    /// Speed, degrees per day.
    pub speed: [f64; BODIES],
    /// Ayanamsha, degrees.
    pub ayanamsha: f64,
    /// Mean Sun, sayana, degrees.
    pub mean_sun_sayana: f64,
}

/// What can go wrong reading a `STAB` file.
#[derive(Debug, Error)]
pub enum TableError {
    /// The first eight bytes are not `STAB0001`.
    #[error("not a STAB file (bad magic)")]
    BadMagic,
    /// Fewer than 32 bytes, so there is no header to read.
    #[error("file is too short for a STAB header")]
    TooShort,
    /// The header's body count is not the eight this reader knows.
    #[error("header says {0} bodies, this reader knows {1}")]
    BodyCount(u32, usize),
    /// The header's sample count does not match the file's length.
    #[error("sample count {0} does not match the file length")]
    SampleCount(u32),
    /// The step is zero, negative or not a number.
    #[error("step {0} is not a positive number of days")]
    BadStep(f64),
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

fn read_f32(bytes: &[u8], at: usize) -> f32 {
    f32::from_le_bytes([bytes[at], bytes[at + 1], bytes[at + 2], bytes[at + 3]])
}

/// Parses a whole `STAB` file's bytes. A slice produced by [`Table::slice`]
/// parses back identically, so a client can treat a server answer as a
/// table of its own.
///
/// # Errors
///
/// [`TableError::TooShort`] for fewer than 32 bytes, [`TableError::BadMagic`]
/// for a wrong magic, [`TableError::BodyCount`] for a header that names a
/// different body count, [`TableError::BadStep`] for a non-positive step, and
/// [`TableError::SampleCount`] when the bytes do not hold the header's
/// samples.
pub fn parse(bytes: &[u8]) -> Result<Table, TableError> {
    if bytes.len() < HEADER {
        return Err(TableError::TooShort);
    }
    if &bytes[..8] != MAGIC {
        return Err(TableError::BadMagic);
    }
    let bodies = read_u32(bytes, 8);
    if bodies as usize != BODIES {
        return Err(TableError::BodyCount(bodies, BODIES));
    }
    let count = read_u32(bytes, 12);
    let first_jd = read_f64(bytes, 16);
    let step_days = read_f64(bytes, 24);
    if !step_days.is_finite() || step_days <= 0.0 {
        return Err(TableError::BadStep(step_days));
    }
    if bytes.len() != HEADER + count as usize * SAMPLE_BYTES {
        return Err(TableError::SampleCount(count));
    }
    Ok(Table {
        first_jd,
        step_days,
        samples: bytes[HEADER..].to_vec(),
    })
}

/// Reads a `STAB` file from disk.
///
/// # Errors
///
/// [`TableError::Io`] when the file cannot be read, and the same errors as
/// [`parse`] for a malformed file.
pub fn open(path: &Path) -> Result<Table, TableError> {
    let bytes = std::fs::read(path).map_err(|e| TableError::Io(path.to_path_buf(), e))?;
    parse(&bytes)
}

/// Writes a table's bytes: header, then samples.
#[must_use]
pub fn serialise(table: &Table) -> Vec<u8> {
    let mut out = Vec::with_capacity(HEADER + table.samples.len());
    out.extend_from_slice(MAGIC);
    out.extend_from_slice(&(BODIES as u32).to_le_bytes());
    out.extend_from_slice(&((table.samples.len() / SAMPLE_BYTES) as u32).to_le_bytes());
    out.extend_from_slice(&table.first_jd.to_le_bytes());
    out.extend_from_slice(&table.step_days.to_le_bytes());
    out.extend_from_slice(&table.samples);
    out
}

fn wrap360(x: f64) -> f64 {
    x.rem_euclid(360.0)
}

impl Table {
    /// Number of samples.
    #[must_use]
    pub fn sample_count(&self) -> usize {
        self.samples.len() / SAMPLE_BYTES
    }

    /// Julian Day (UT) of the last sample.
    #[must_use]
    pub fn last_jd(&self) -> f64 {
        self.first_jd + (self.sample_count().saturating_sub(1) as f64) * self.step_days
    }

    /// A self-contained table holding samples `from..to` (inclusive, clamped
    /// to the table). This is what the server sends for a date window.
    #[must_use]
    pub fn slice(&self, from_jd: f64, to_jd: f64) -> Table {
        let n = self.sample_count();
        if n == 0 || to_jd < self.first_jd || from_jd > self.last_jd() {
            return Table {
                first_jd: from_jd,
                step_days: self.step_days,
                samples: Vec::new(),
            };
        }
        let first = ((from_jd - self.first_jd) / self.step_days).floor() as isize;
        let last = ((to_jd - self.first_jd) / self.step_days).ceil() as isize;
        let first = first.clamp(0, n as isize - 1) as usize;
        let last = last.clamp(0, n as isize - 1) as usize;
        let start = first * SAMPLE_BYTES;
        let end = (last + 1) * SAMPLE_BYTES;
        Table {
            first_jd: self.first_jd + first as f64 * self.step_days,
            step_days: self.step_days,
            samples: self.samples[start..end].to_vec(),
        }
    }

    /// Positions at `jd_ut`, or `None` outside the sampled range.
    ///
    /// Cubic Hermite per body over the two bracketing samples (the stored
    /// speeds make the curve follow the true motion); the ayanamsha and the
    /// mean Sun interpolate linearly — the mean Sun is exactly linear, and
    /// the ayanamsha is a sine with a ~7200-year period.
    #[must_use]
    pub fn positions_at(&self, jd_ut: f64) -> Option<Positions> {
        let n = self.sample_count();
        if n == 0 || !jd_ut.is_finite() || jd_ut < self.first_jd || jd_ut > self.last_jd() {
            return None;
        }
        let at = (jd_ut - self.first_jd) / self.step_days;
        let i = (at.floor() as usize).min(n - 1);
        let t = (at - i as f64).clamp(0.0, 1.0);
        if i + 1 >= n {
            return Some(self.sample_positions(i));
        }
        let (h00, h10, h01, h11) = hermite_basis(t);
        let h = self.step_days;
        let mut longitude = [0.0; BODIES];
        let mut speed = [0.0; BODIES];
        for b in 0..BODIES {
            let (lon0, sp0) = self.body_at(i, b);
            let (mut lon1, sp1) = self.body_at(i + 1, b);
            // Unwrap the next sample against this one: the pair is adjacent,
            // so the true motion between them is far under 180°.
            lon1 += 360.0 * ((lon0 - lon1) / 360.0).round();
            longitude[b] = wrap360(h00 * lon0 + h10 * h * sp0 + h01 * lon1 + h11 * h * sp1);
            // Derivative of the Hermite curve, per day.
            let (d00, d10, d01, d11) = hermite_derivative(t);
            speed[b] = (d00 * lon0 + d10 * h * sp0 + d01 * lon1 + d11 * h * sp1) / h;
        }
        let (aya0, mean0) = self.scalars_at(i);
        let (aya1, mean1) = self.scalars_at(i + 1);
        Some(Positions {
            longitude,
            speed,
            ayanamsha: aya0 + (aya1 - aya0) * t,
            mean_sun_sayana: mean0 + (mean1 - mean0) * t,
        })
    }

    /// One sample's positions with no interpolation (used at the last sample).
    fn sample_positions(&self, i: usize) -> Positions {
        let mut longitude = [0.0; BODIES];
        let mut speed = [0.0; BODIES];
        for b in 0..BODIES {
            (longitude[b], speed[b]) = self.body_at(i, b);
        }
        let (ayanamsha, mean_sun_sayana) = self.scalars_at(i);
        Positions {
            longitude,
            speed,
            ayanamsha,
            mean_sun_sayana,
        }
    }

    /// (longitude, speed) of one body at one sample, as stored.
    fn body_at(&self, sample: usize, body: usize) -> (f64, f64) {
        let at = sample * SAMPLE_BYTES + body * 8;
        (
            f64::from(read_f32(&self.samples, at)),
            f64::from(read_f32(&self.samples, at + 4)),
        )
    }

    /// (ayanamsha, mean Sun) at one sample.
    fn scalars_at(&self, sample: usize) -> (f64, f64) {
        let at = sample * SAMPLE_BYTES + BODIES * 8;
        (
            f64::from(read_f32(&self.samples, at)),
            f64::from(read_f32(&self.samples, at + 4)),
        )
    }
}

/// Cubic Hermite basis at `t` in [0, 1].
fn hermite_basis(t: f64) -> (f64, f64, f64, f64) {
    let t2 = t * t;
    let t3 = t2 * t;
    (
        2.0 * t3 - 3.0 * t2 + 1.0,
        t3 - 2.0 * t2 + t,
        -2.0 * t3 + 3.0 * t2,
        t3 - t2,
    )
}

/// Derivatives of the Hermite basis, with respect to `t`.
fn hermite_derivative(t: f64) -> (f64, f64, f64, f64) {
    let t2 = t * t;
    (
        6.0 * t2 - 6.0 * t,
        3.0 * t2 - 4.0 * t + 1.0,
        -6.0 * t2 + 6.0 * t,
        3.0 * t2 - 2.0 * t,
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    fn one_sample_table() -> Table {
        // One sample: Sun at 100° moving 1°/day, Moon at 200° moving 13°/day.
        let mut samples = vec![0u8; SAMPLE_BYTES];
        samples[0..4].copy_from_slice(&100f32.to_le_bytes());
        samples[4..8].copy_from_slice(&1f32.to_le_bytes());
        samples[8..12].copy_from_slice(&200f32.to_le_bytes());
        samples[12..16].copy_from_slice(&13f32.to_le_bytes());
        samples[64..68].copy_from_slice(&23f32.to_le_bytes());
        samples[68..72].copy_from_slice(&150f32.to_le_bytes());
        Table {
            first_jd: 2_460_000.0,
            step_days: 0.5,
            samples,
        }
    }

    #[test]
    fn serialise_round_trips() {
        let table = one_sample_table();
        let back = parse(&serialise(&table)).unwrap();
        assert_eq!(back.first_jd, table.first_jd);
        assert_eq!(back.step_days, table.step_days);
        assert_eq!(back.samples, table.samples);
    }

    #[test]
    fn parse_rejects_a_wrong_magic_and_a_truncated_file() {
        let mut bytes = serialise(&one_sample_table());
        bytes[0] = b'X';
        assert!(matches!(parse(&bytes), Err(TableError::BadMagic)));
        bytes = serialise(&one_sample_table());
        bytes.truncate(HEADER + 10);
        assert!(matches!(parse(&bytes), Err(TableError::SampleCount(_))));
    }

    #[test]
    fn positions_at_a_sample_are_exact_and_outside_is_none() {
        let table = one_sample_table();
        let pos = table.positions_at(2_460_000.0).unwrap();
        assert!((pos.longitude[0] - 100.0).abs() < 1e-5);
        assert!((pos.longitude[1] - 200.0).abs() < 1e-5);
        assert!((pos.ayanamsha - 23.0).abs() < 1e-5);
        assert!((pos.mean_sun_sayana - 150.0).abs() < 1e-5);
        assert!(table.positions_at(2_459_999.0).is_none());
        assert!(table.positions_at(2_460_001.0).is_none());
    }

    #[test]
    fn slice_keeps_a_self_contained_table() {
        let mut samples = vec![0u8; SAMPLE_BYTES * 5];
        for (i, chunk) in samples.chunks_exact_mut(SAMPLE_BYTES).enumerate() {
            chunk[0..4].copy_from_slice(&(100f32 + i as f32).to_le_bytes());
        }
        let table = Table {
            first_jd: 2_460_000.0,
            step_days: 0.5,
            samples,
        };
        let cut = table.slice(2_460_000.4, 2_460_001.2);
        assert_eq!(cut.sample_count(), 4);
        assert!((cut.first_jd - 2_460_000.0).abs() < 1e-9);
        assert_eq!(cut.positions_at(2_460_000.0).unwrap().longitude[0], 100.0);
        assert!(parse(&serialise(&cut)).is_ok());
    }
}
