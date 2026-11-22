//! A reader for JPL SPK kernels (DAF, little-endian, segment type 2).
//!
//! Only what the extraction needs: the segment summaries and their Chebyshev records.

use std::path::Path;

/// Why a kernel could not be read.
#[derive(Debug, thiserror::Error)]
pub enum DafError {
    /// The file could not be read.
    #[error("cannot read the kernel: {0}")]
    Io(#[from] std::io::Error),
    /// The file is not an SPK this reader understands.
    #[error("unsupported kernel: {0}")]
    Unsupported(&'static str),
}

/// One type-2 segment: Chebyshev records of equal length and span.
#[derive(Debug, Clone)]
pub struct RawSegment {
    /// NAIF id of the target body.
    pub target: i32,
    /// NAIF id of the centre.
    pub center: i32,
    /// First covered second (TDB seconds since J2000).
    pub start: f64,
    /// Last covered second.
    pub end: f64,
    /// Start of the first record.
    pub init: f64,
    /// Seconds per record.
    pub intlen: f64,
    /// Coefficients per component.
    pub ncoef: usize,
    /// Number of records.
    pub nrec: usize,
    /// For every record: x, y, z coefficients (`3 * ncoef` numbers), without the
    /// record's midpoint and radius, which the regular spacing already gives.
    pub coefs: Vec<f64>,
}

fn f64_at(data: &[u8], word: usize) -> f64 {
    let at = word * 8;
    f64::from_le_bytes(data[at..at + 8].try_into().unwrap_or([0; 8]))
}

fn i32_at(data: &[u8], at: usize) -> i32 {
    i32::from_le_bytes(data[at..at + 4].try_into().unwrap_or([0; 4]))
}

/// Reads every type-2 segment of the SPK at `path`.
///
/// # Errors
///
/// [`DafError`] for an unreadable or unsupported file.
pub fn read_spk(path: &Path) -> Result<Vec<RawSegment>, DafError> {
    let data = std::fs::read(path)?;
    if data.len() < 1024 || !data.starts_with(b"DAF/SPK") {
        return Err(DafError::Unsupported("not a DAF/SPK file"));
    }
    if &data[88..96] != b"LTL-IEEE" {
        return Err(DafError::Unsupported("only little-endian kernels"));
    }
    let (nd, ni) = (i32_at(&data, 8), i32_at(&data, 12));
    if (nd, ni) != (2, 6) {
        return Err(DafError::Unsupported("an SPK has two doubles and six ints"));
    }
    let mut record = usize::try_from(i32_at(&data, 76)).unwrap_or(0);
    let mut out = Vec::new();
    while record != 0 {
        let base = (record - 1) * 1024;
        let word = base / 8;
        // next record number (0 ends the list), previous, summary count
        let next = f64_at(&data, word);
        let count = f64_at(&data, word + 2);
        let count = count as usize;
        for s in 0..count {
            let sw = word + 3 + s * 5;
            let (start, end) = (f64_at(&data, sw), f64_at(&data, sw + 1));
            let ints = (sw + 2) * 8;
            let (target, center) = (i32_at(&data, ints), i32_at(&data, ints + 4));
            let data_type = i32_at(&data, ints + 12);
            let first = usize::try_from(i32_at(&data, ints + 16)).unwrap_or(0);
            let last = usize::try_from(i32_at(&data, ints + 20)).unwrap_or(0);
            if data_type != 2 || first == 0 || last < first + 4 {
                continue;
            }
            let init = f64_at(&data, last - 4);
            let intlen = f64_at(&data, last - 3);
            let rsize = f64_at(&data, last - 2) as usize;
            let nrec = f64_at(&data, last - 1) as usize;
            if rsize < 5 || (rsize - 2) % 3 != 0 {
                return Err(DafError::Unsupported("a malformed Chebyshev record size"));
            }
            let ncoef = (rsize - 2) / 3;
            let mut coefs = Vec::with_capacity(nrec * 3 * ncoef);
            for r in 0..nrec {
                let rec = first - 1 + r * rsize;
                for k in 0..3 * ncoef {
                    coefs.push(f64_at(&data, rec + 2 + k));
                }
            }
            out.push(RawSegment {
                target,
                center,
                start,
                end,
                init,
                intlen,
                ncoef,
                nrec,
                coefs,
            });
        }
        record = next as usize;
    }
    Ok(out)
}
