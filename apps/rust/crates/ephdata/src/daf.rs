//! A reader for JPL SPK kernels (DAF, little-endian, segment type 2).
//!
//! Only what the extraction needs: the segment summaries and their Chebyshev records.

use std::{
    fs::File,
    io::{Read, Seek, SeekFrom},
    path::Path,
};

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

fn i32_at(data: &[u8], at: usize) -> i32 {
    i32::from_le_bytes(data[at..at + 4].try_into().unwrap_or([0; 4]))
}

fn f64_at(data: &[u8], word: usize) -> f64 {
    let at = word * 8;
    f64::from_le_bytes(data[at..at + 8].try_into().unwrap_or([0; 8]))
}

/// Reads `count` doubles starting at the 1-based double `word` of the file.
fn read_words(file: &mut File, word: usize, count: usize) -> Result<Vec<f64>, DafError> {
    file.seek(SeekFrom::Start(((word - 1) * 8) as u64))?;
    let mut bytes = vec![0u8; count * 8];
    file.read_exact(&mut bytes)?;
    Ok(bytes
        .chunks_exact(8)
        .map(|c| f64::from_le_bytes(c.try_into().unwrap_or([0; 8])))
        .collect())
}

/// Reads every type-2 segment of the SPK at `path`, keeping only the records that
/// overlap `[from_second, to_second]` (TDB seconds since J2000). The file is read by
/// seeking, so a multi-gigabyte kernel costs only the records asked for.
///
/// # Errors
///
/// [`DafError`] for an unreadable or unsupported file.
pub fn read_spk(
    path: &Path,
    from_second: f64,
    to_second: f64,
) -> Result<Vec<RawSegment>, DafError> {
    let mut file = File::open(path)?;
    let mut head = vec![0u8; 1024];
    file.read_exact(&mut head)?;
    if !head.starts_with(b"DAF/SPK") {
        return Err(DafError::Unsupported("not a DAF/SPK file"));
    }
    if &head[88..96] != b"LTL-IEEE" {
        return Err(DafError::Unsupported("only little-endian kernels"));
    }
    if (i32_at(&head, 8), i32_at(&head, 12)) != (2, 6) {
        return Err(DafError::Unsupported("an SPK has two doubles and six ints"));
    }
    let mut record = usize::try_from(i32_at(&head, 76)).unwrap_or(0);
    let mut out = Vec::new();
    while record != 0 {
        let mut bytes = vec![0u8; 1024];
        file.seek(SeekFrom::Start(((record - 1) * 1024) as u64))?;
        file.read_exact(&mut bytes)?;
        // next record number (0 ends the list), previous, summary count
        let next = f64_at(&bytes, 0);
        let count = f64_at(&bytes, 2) as usize;
        for s in 0..count {
            let sw = 3 + s * 5;
            let (start, end) = (f64_at(&bytes, sw), f64_at(&bytes, sw + 1));
            let ints = (sw + 2) * 8;
            let (target, center) = (i32_at(&bytes, ints), i32_at(&bytes, ints + 4));
            let data_type = i32_at(&bytes, ints + 12);
            let first = usize::try_from(i32_at(&bytes, ints + 16)).unwrap_or(0);
            let last = usize::try_from(i32_at(&bytes, ints + 20)).unwrap_or(0);
            if data_type != 2 || first == 0 || last < first + 4 {
                continue;
            }
            let tail = read_words(&mut file, last - 3, 4)?;
            let (init, intlen) = (tail[0], tail[1]);
            let (rsize, nrec) = (tail[2] as usize, tail[3] as usize);
            if rsize < 5 || (rsize - 2) % 3 != 0 {
                return Err(DafError::Unsupported("a malformed Chebyshev record size"));
            }
            let ncoef = (rsize - 2) / 3;
            let skip = ((from_second - init) / intlen).floor().max(0.0) as usize;
            let upto = (((to_second - init) / intlen).ceil().max(0.0) as usize).min(nrec);
            let mut coefs = Vec::new();
            if upto > skip {
                // whole records (midpoint, radius, coefficients), then drop the first two
                let words = read_words(&mut file, first + skip * rsize, (upto - skip) * rsize)?;
                coefs.reserve((upto - skip) * 3 * ncoef);
                for rec in words.chunks_exact(rsize) {
                    coefs.extend_from_slice(&rec[2..]);
                }
            }
            out.push(RawSegment {
                target,
                center,
                start,
                end,
                init: init + skip as f64 * intlen,
                intlen,
                ncoef,
                nrec: upto.saturating_sub(skip),
                coefs,
            });
        }
        record = next as usize;
    }
    Ok(out)
}
