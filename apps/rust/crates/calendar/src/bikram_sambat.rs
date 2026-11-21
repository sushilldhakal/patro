//! Bikram Sambat: one month grid for every calculation.
//!
//! Every BS month begins on the Kathmandu civil day its Surya Siddhanta sankranti
//! falls on. Month 1 (Baishakh) is found from a sidereal-year extrapolation of a
//! known Mesha sankranti; every later month is chained off the month before it, so
//! the sequence is monotonic by construction.

use std::fmt;

use timescale::{CivilDay, Moment, Zone};

use crate::sankranti::find_sankranti_after_jd;

/// Mean sidereal year (days): the period sankrantis keep.
const SIDEREAL_YEAR_DAYS: f64 = 365.256_363;
/// The first year of the published month table and the civil day it starts: only the
/// first guess for the sidereal extrapolation, never an answer.
const ANCHOR_BS_YEAR: i32 = 2000;
const ANCHOR_START: CivilDay = CivilDay::new(1943, 4, 14);

/// A date in Bikram Sambat. Years are signed: −1 is BBS 1, the year before BS 1.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct BsDate {
    /// Signed BS year.
    pub year: i32,
    /// Month 1 (Baishakh) – 12 (Chaitra).
    pub month: u32,
    /// Day of the month from 1.
    pub day: u32,
}

impl fmt::Display for BsDate {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}-{:02}-{:02}", self.year, self.month, self.day)
    }
}

/// Why a Bikram Sambat date could not be resolved.
#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
#[non_exhaustive]
pub enum BsError {
    /// Month outside 1–12.
    #[error("bs_month must be 1..12")]
    Month,
    /// Day outside the month's length.
    #[error("bs_day must be 1..{length} for BS {year}/{month}")]
    Day {
        /// The year asked for.
        year: i32,
        /// The month asked for.
        month: u32,
        /// How many days that month has.
        length: u32,
    },
    /// The civil day is outside the signed patro axis.
    #[error("civil day {0} is outside patro axis {SIGNED_YEAR_MIN}..{SIGNED_YEAR_MAX}")]
    OutsideAxis(CivilDay),
    /// The sankranti search found no bracket (should not happen in range).
    #[error("could not find sankranti for BS {year}/{month}")]
    Sankranti {
        /// The year asked for.
        year: i32,
        /// The month asked for.
        month: u32,
    },
}

/// Signed patro axis floor under the Surya Siddhanta (`signed_year_min()`).
pub const SIGNED_YEAR_MIN: i32 = -3_891_138;
/// Signed patro axis ceiling (`signed_year_max()`).
pub const SIGNED_YEAR_MAX: i32 = 17_053;

/// Signed year → gapless index: the axis has no year 0, so −1 sits next to +1.
const fn year_index(bs_year: i32) -> i32 {
    if bs_year >= 1 { bs_year } else { bs_year + 1 }
}

fn mesha_start_estimate_jd(bs_year: i32) -> f64 {
    ANCHOR_START.to_jd_ut()
        + f64::from(year_index(bs_year) - year_index(ANCHOR_BS_YEAR)) * SIDEREAL_YEAR_DAYS
}

/// Civil day a month opens on, given the Julian Day its search starts from.
fn opening_day(
    bs_year: i32,
    bs_month: u32,
    search_jd: f64,
    kathmandu: &Zone,
) -> Result<CivilDay, BsError> {
    let sankranti =
        find_sankranti_after_jd(bs_month - 1, search_jd, 45).ok_or(BsError::Sankranti {
            year: bs_year,
            month: bs_month,
        })?;
    Ok(kathmandu.local_day(Moment::from_jd(sankranti)))
}

/// The civil days months 1..=`through` of `bs_year` begin on, chained as in Python.
fn chained_starts(bs_year: i32, through: u32) -> Result<Vec<CivilDay>, BsError> {
    let kathmandu = Zone::kathmandu();
    let mut starts: Vec<CivilDay> = Vec::with_capacity(through as usize);
    for month in 1..=through {
        let search_jd = match starts.last() {
            // ~10 days early, so the Sun is still in Meena and the solve walks onto Mesha.
            None => mesha_start_estimate_jd(bs_year) - 10.0,
            // 25 days in, the Sun is always still in the previous month's sign.
            Some(previous) => previous.to_jd_ut() + 25.0,
        };
        starts.push(opening_day(bs_year, month, search_jd, &kathmandu)?);
    }
    Ok(starts)
}

/// The civil days all twelve months of `bs_year` begin on, solved in one chain.
///
/// Prefer this to twelve [`month_start`] calls: each month is chained off the one
/// before it, so asking month by month repeats the earlier solves.
///
/// # Errors
///
/// [`BsError::Sankranti`] if a sankranti is not found.
pub fn month_starts(bs_year: i32) -> Result<[CivilDay; 12], BsError> {
    let starts = chained_starts(bs_year, 12)?;
    starts.try_into().map_err(|_| BsError::Month)
}

/// The civil day BS `bs_year`/`bs_month` begins.
///
/// # Errors
///
/// [`BsError::Month`] outside 1–12; [`BsError::Sankranti`] if no sankranti is found.
pub fn month_start(bs_year: i32, bs_month: u32) -> Result<CivilDay, BsError> {
    if !(1..=12).contains(&bs_month) {
        return Err(BsError::Month);
    }
    chained_starts(bs_year, bs_month)?
        .pop()
        .ok_or(BsError::Month)
}

/// Days in BS `bs_year`/`bs_month` (29–32).
///
/// # Errors
///
/// As [`month_start`].
#[expect(
    clippy::cast_possible_truncation,
    clippy::cast_sign_loss,
    reason = "a month is 29-32 days"
)]
pub fn month_length(bs_year: i32, bs_month: u32) -> Result<u32, BsError> {
    let start = month_start(bs_year, bs_month)?;
    let next = if bs_month < 12 {
        month_start(bs_year, bs_month + 1)?
    } else {
        month_start(bs_year + 1, 1)?
    };
    Ok((next.to_jd_ut() - start.to_jd_ut()).round() as u32)
}

/// The civil day of a BS date.
///
/// # Errors
///
/// [`BsError::Day`] when the day is outside the month, or as [`month_start`].
#[expect(clippy::cast_possible_wrap, reason = "a day of the month is below 33")]
pub fn bs_to_civil(date: BsDate) -> Result<CivilDay, BsError> {
    let start = month_start(date.year, date.month)?;
    let length = month_length(date.year, date.month)?;
    if !(1..=length).contains(&date.day) {
        return Err(BsError::Day {
            year: date.year,
            month: date.month,
            length,
        });
    }
    Ok(start.add_days(date.day as i32 - 1))
}

/// The BS date of a CE civil day (`gregorian_to_bs` for a `date`).
///
/// # Errors
///
/// As [`month_start`].
#[expect(
    clippy::cast_possible_truncation,
    clippy::cast_sign_loss,
    reason = "a day offset in a month is below 33"
)]
pub fn civil_to_bs(day: CivilDay) -> Result<BsDate, BsError> {
    let mut bs_year = day.year + 57;
    if month_start(bs_year, 1)? > day {
        bs_year -= 1;
    }
    let starts = month_starts(bs_year)?;
    for (month, start) in (1..13u32).zip(&starts).rev() {
        if *start <= day {
            let offset = (day.to_jd_ut() - start.to_jd_ut()).round() as u32;
            return Ok(BsDate {
                year: bs_year,
                month,
                day: offset + 1,
            });
        }
    }
    Err(BsError::Month)
}

/// `_signed_to_index`: signed patro year → gap-free index (no year 0).
const fn signed_to_index(signed: i32) -> i32 {
    if signed < 0 { signed } else { signed - 1 }
}

const fn index_to_signed(index: i32) -> i32 {
    if index < 0 { index } else { index + 1 }
}

/// `locate_patro_day_for_civil`: the signed BS/BBS date of any civil day, Julian
/// and BCE days included.
///
/// A `datetime`-range day takes [`civil_to_bs`]; any other day finds its year by a
/// binary search on the sidereal Mesha estimate, then scans that year and the next
/// month by month, as Python does.
///
/// # Errors
///
/// [`BsError::OutsideAxis`] when no patro year holds the day, or as [`month_start`].
#[expect(
    clippy::cast_possible_truncation,
    clippy::cast_sign_loss,
    reason = "a day offset in a month is below 33"
)]
pub fn locate_patro_day(day: CivilDay) -> Result<BsDate, BsError> {
    if day.is_datetime_range()
        && let Ok(bs) = civil_to_bs(day)
    {
        return Ok(bs);
    }
    let jd = day.to_jd_ut();
    let (mut lo, mut hi) = (
        signed_to_index(SIGNED_YEAR_MIN),
        signed_to_index(SIGNED_YEAR_MAX),
    );
    while lo < hi {
        let mid = (lo + hi + 1).div_euclid(2);
        if mesha_start_estimate_jd(index_to_signed(mid)) <= jd {
            lo = mid;
        } else {
            hi = mid - 1;
        }
    }
    for signed in [index_to_signed(lo), index_to_signed(lo + 1)] {
        if signed == 0 || !(SIGNED_YEAR_MIN..=SIGNED_YEAR_MAX).contains(&signed) {
            continue;
        }
        let starts = month_starts(signed)?;
        let next_year = month_start(signed + 1, 1)?;
        for (i, start) in starts.iter().enumerate() {
            let start_jd = start.to_jd_ut();
            let end_jd = starts.get(i + 1).unwrap_or(&next_year).to_jd_ut();
            let length = (end_jd - start_jd).round();
            if start_jd <= jd && jd < start_jd + length {
                return Ok(BsDate {
                    year: signed,
                    month: i as u32 + 1,
                    day: (jd - start_jd) as u32 + 1,
                });
            }
        }
    }
    Err(BsError::OutsideAxis(day))
}
