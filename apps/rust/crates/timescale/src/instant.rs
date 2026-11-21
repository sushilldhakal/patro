//! UTC instants that behave like the Python server's `datetime`.

use std::{fmt, str::FromStr};

use crate::{
    civil::{CivilDay, calendar_for_jd},
    julian::{Calendar, julday, revjul},
};

const MICROS_PER_SECOND: i64 = 1_000_000;
const MICROS_PER_DAY: i64 = 86_400 * MICROS_PER_SECOND;

/// A UTC instant to the microsecond, proleptic Gregorian, years 1–9999: Python's
/// aware `datetime` in UTC.
///
/// The Python server bisects for anga boundaries in `datetime` space, so this type
/// copies its arithmetic: microsecond resolution, `timedelta / 2` rounding half to
/// even, and [`UtcInstant::from_jd_truncated`] dropping fractional seconds the way
/// `datetime_from_jd` does.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct UtcInstant {
    /// Microseconds since 0001-01-01T00:00:00 UTC.
    micros: i64,
}

impl UtcInstant {
    /// The instant at a UTC wall-clock time, or `None` outside 0001–9999 or for an invalid date.
    #[must_use]
    pub fn from_utc(
        day: CivilDay,
        hour: u32,
        minute: u32,
        second: u32,
        micro: u32,
    ) -> Option<Self> {
        if !day.is_datetime_range_gregorian()
            || hour > 23
            || minute > 59
            || second > 59
            || micro > 999_999
        {
            return None;
        }
        let secs = i64::from(hour) * 3600 + i64::from(minute) * 60 + i64::from(second);
        Some(Self {
            micros: days_from_civil(day) * MICROS_PER_DAY
                + secs * MICROS_PER_SECOND
                + i64::from(micro),
        })
    }

    /// The UTC civil date and clock: (day, hour, minute, second, microsecond).
    #[must_use]
    #[expect(
        clippy::cast_possible_truncation,
        clippy::cast_sign_loss,
        reason = "remainders of a day are small and non-negative"
    )]
    pub fn fields(self) -> (CivilDay, u32, u32, u32, u32) {
        let days = self.micros.div_euclid(MICROS_PER_DAY);
        let rem = self.micros.rem_euclid(MICROS_PER_DAY);
        let secs = rem / MICROS_PER_SECOND;
        (
            civil_from_days(days),
            (secs / 3600) as u32,
            (secs / 60 % 60) as u32,
            (secs % 60) as u32,
            (rem % MICROS_PER_SECOND) as u32,
        )
    }

    /// Julian Day (UT), the way the Python engine's `julian_day` computes it.
    #[must_use]
    pub fn to_jd(self) -> f64 {
        let (day, hour, minute, second, micro) = self.fields();
        let hours = f64::from(hour)
            + f64::from(minute) / 60.0
            + (f64::from(second) + f64::from(micro) / 1_000_000.0) / 3600.0;
        julday(day.year, day.month, day.day, hours, Calendar::Gregorian)
    }

    /// `datetime_from_jd`: the instant of a Julian Day with fractional seconds dropped,
    /// or `None` when `datetime` cannot hold the day (before 1582-10-15 or BCE).
    #[must_use]
    #[expect(
        clippy::cast_possible_truncation,
        clippy::cast_sign_loss,
        clippy::cast_precision_loss,
        reason = "int() of an hour in [0, 24) and back, as in Python; values below 60 are exact"
    )]
    pub fn from_jd_truncated(jd: f64) -> Option<Self> {
        let (year, month, day, hour) = revjul(jd, calendar_for_jd(jd));
        let civil = CivilDay::new(year, month, day);
        if !civil.is_datetime_range() {
            return None;
        }
        let h = hour as i64;
        let minutes = (hour - h as f64) * 60.0;
        let mi = minutes as i64;
        let s = ((minutes - mi as f64) * 60.0) as i64;
        Self::from_utc(civil, h as u32, mi as u32, s as u32, 0)
    }

    /// This instant moved by whole microseconds.
    #[must_use]
    pub const fn add_micros(self, micros: i64) -> Self {
        Self {
            micros: self.micros + micros,
        }
    }

    /// This instant moved by whole hours.
    #[must_use]
    pub const fn add_hours(self, hours: i64) -> Self {
        self.add_micros(hours * 3600 * MICROS_PER_SECOND)
    }

    /// This instant rounded up to a whole second.
    #[must_use]
    pub const fn ceil_to_second(self) -> Self {
        match self.micros.rem_euclid(MICROS_PER_SECOND) {
            0 => self,
            over => self.add_micros(MICROS_PER_SECOND - over),
        }
    }

    /// Microseconds from `earlier` to `self`.
    #[must_use]
    pub const fn micros_since(self, earlier: Self) -> i64 {
        self.micros - earlier.micros
    }

    /// `start + (end - start) / 2` with Python's `timedelta` rounding (half to even).
    #[must_use]
    pub fn midpoint(start: Self, end: Self) -> Self {
        start.add_micros(divide_and_round(end.micros - start.micros, 2))
    }

    /// `((end - start) / divisor).total_seconds()`: the timedelta divided as `CPython`
    /// does (microseconds rounded half to even), then read as float seconds.
    #[must_use]
    #[expect(
        clippy::cast_precision_loss,
        reason = "day-scale spans in microseconds are far below 2^53"
    )]
    pub fn span_divided_seconds(start: Self, end: Self, divisor: i64) -> f64 {
        divide_and_round(end.micros - start.micros, divisor) as f64 / 1_000_000.0
    }

    /// This instant moved by whole seconds.
    #[must_use]
    pub const fn add_seconds(self, seconds: i64) -> Self {
        self.add_micros(seconds * MICROS_PER_SECOND)
    }

    /// `self + timedelta(seconds=seconds)` with a float, rounded to the microsecond as `CPython` does.
    #[must_use]
    pub fn add_seconds_f64(self, seconds: f64) -> Self {
        self.add_micros(timedelta_micros(seconds, MICROS_PER_SECOND))
    }

    /// `self + timedelta(days=days)` with a float, rounded to the microsecond as `CPython` does.
    #[must_use]
    pub fn add_days_f64(self, days: f64) -> Self {
        self.add_micros(timedelta_micros(days, MICROS_PER_DAY))
    }

    /// `self - timedelta(days=days)`: the timedelta is rounded first, then negated.
    #[must_use]
    pub fn sub_days_f64(self, days: f64) -> Self {
        self.add_micros(-timedelta_micros(days, MICROS_PER_DAY))
    }

    /// `(self - earlier).total_seconds()`: exact microseconds over 10⁶, correctly rounded.
    #[must_use]
    #[expect(
        clippy::cast_precision_loss,
        reason = "a span of a few days in microseconds is far below 2^53"
    )]
    pub fn seconds_since(self, earlier: Self) -> f64 {
        (self.micros - earlier.micros) as f64 / 1_000_000.0
    }

    /// This instant as a wall clock `offset_seconds` east of UTC.
    #[must_use]
    pub const fn at_offset(self, offset_seconds: i32) -> LocalDateTime {
        LocalDateTime {
            instant: self,
            offset_seconds,
        }
    }

    /// Microseconds since the Unix epoch, for time zone lookups.
    pub(crate) const fn unix_micros(self) -> i64 {
        self.micros - UNIX_EPOCH_MICROS
    }
}

impl CivilDay {
    /// Inside 0001–9999 and a real Gregorian date (no cutover check: `datetime` is proleptic).
    fn is_datetime_range_gregorian(self) -> bool {
        (1..=9999).contains(&self.year) && self.is_valid_gregorian()
    }
}

impl fmt::Display for UtcInstant {
    /// ISO 8601 with `+00:00`, seconds always, microseconds when non-zero (Python `isoformat`).
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let (day, h, m, s, us) = self.fields();
        write!(f, "{day}T{h:02}:{m:02}:{s:02}")?;
        if us != 0 {
            write!(f, ".{us:06}")?;
        }
        f.write_str("+00:00")
    }
}

/// An instant seen on a wall clock with a fixed UTC offset: Python's `dt.astimezone(tz)`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct LocalDateTime {
    instant: UtcInstant,
    offset_seconds: i32,
}

impl LocalDateTime {
    fn wall(self) -> (CivilDay, u32, u32, u32, u32) {
        self.instant
            .add_seconds(i64::from(self.offset_seconds))
            .fields()
    }

    /// `strftime("%H:%M:%S")`.
    #[must_use]
    pub fn hms(self) -> String {
        let (_, h, m, s, _) = self.wall();
        format!("{h:02}:{m:02}:{s:02}")
    }

    /// `strftime("%H:%M")`.
    #[must_use]
    pub fn hm(self) -> String {
        let (_, h, m, _, _) = self.wall();
        format!("{h:02}:{m:02}")
    }

    /// The local civil date.
    #[must_use]
    pub fn day(self) -> CivilDay {
        self.wall().0
    }
}

impl fmt::Display for LocalDateTime {
    /// Python's `isoformat()`: microseconds when non-zero, offset `±HH:MM`, plus `:SS`
    /// when the offset has seconds (Kathmandu Mean Time, `+05:41:16`).
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let (day, h, m, s, us) = self.wall();
        write!(f, "{day}T{h:02}:{m:02}:{s:02}")?;
        if us != 0 {
            write!(f, ".{us:06}")?;
        }
        let sign = if self.offset_seconds < 0 { '-' } else { '+' };
        let off = self.offset_seconds.unsigned_abs();
        write!(f, "{sign}{:02}:{:02}", off / 3600, off / 60 % 60)?;
        if off % 60 != 0 {
            write!(f, ":{:02}", off % 60)?;
        }
        Ok(())
    }
}

/// Text that is not a UTC ISO 8601 instant (`YYYY-MM-DDTHH:MM:SS[.ffffff]+00:00`).
#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
#[error("not a UTC ISO 8601 instant: {0:?}")]
pub struct ParseInstantError(String);

impl FromStr for UtcInstant {
    type Err = ParseInstantError;

    /// Reads what [`fmt::Display`] writes (Python's `isoformat()` of a UTC `datetime`);
    /// `Z` is accepted for `+00:00`.
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let err = || ParseInstantError(s.to_owned());
        let body = s
            .strip_suffix("+00:00")
            .or_else(|| s.strip_suffix('Z'))
            .ok_or_else(err)?;
        let (date, time) = body.split_once('T').ok_or_else(err)?;
        let mut d = date.splitn(3, '-').map(str::parse::<u32>);
        let (Some(Ok(year)), Some(Ok(month)), Some(Ok(day))) = (d.next(), d.next(), d.next())
        else {
            return Err(err());
        };
        let (clock, micro) = match time.split_once('.') {
            Some((clock, frac)) if frac.len() == 6 => {
                (clock, frac.parse::<u32>().map_err(|_| err())?)
            }
            Some(_) => return Err(err()),
            None => (time, 0),
        };
        let mut t = clock.splitn(3, ':').map(str::parse::<u32>);
        let (Some(Ok(h)), Some(Ok(mi)), Some(Ok(sec))) = (t.next(), t.next(), t.next()) else {
            return Err(err());
        };
        let year = i32::try_from(year).map_err(|_| err())?;
        Self::from_utc(CivilDay::new(year, month, day), h, mi, sec, micro).ok_or_else(err)
    }
}

/// An instant as the Python engine hands it back: a `datetime` when it can hold the
/// day, otherwise a bare Julian Day (`UtInstant`).
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Moment {
    /// A `datetime`-range instant.
    Utc(UtcInstant),
    /// Before 1582-10-15 or BCE: the Julian Day (UT) itself.
    Jd(f64),
}

impl Moment {
    /// `datetime_from_jd`: a truncated [`UtcInstant`] when possible, else the Julian Day.
    #[must_use]
    pub fn from_jd(jd: f64) -> Self {
        UtcInstant::from_jd_truncated(jd).map_or(Self::Jd(jd), Self::Utc)
    }

    /// Julian Day (UT).
    #[must_use]
    pub fn to_jd(self) -> f64 {
        match self {
            Self::Utc(i) => i.to_jd(),
            Self::Jd(jd) => jd,
        }
    }
}

/// Microseconds of `timedelta(<unit>=value)` for a float, following `CPython`'s `accum`:
/// the whole part exactly, the fraction's whole microseconds, then the leftover
/// rounded half to even against the running total.
#[expect(
    clippy::cast_possible_truncation,
    clippy::cast_precision_loss,
    clippy::float_cmp,
    reason = "spans of days in microseconds fit i64 and f64 exactly; the exact half test is CPython's"
)]
pub(crate) fn timedelta_micros(value: f64, unit_micros: i64) -> i64 {
    let whole = value.trunc();
    let frac = value - whole;
    let mut x = (whole as i64) * unit_micros;
    if frac == 0.0 {
        return x;
    }
    let scaled = unit_micros as f64 * frac;
    let scaled_whole = scaled.trunc();
    let leftover = scaled - scaled_whole;
    x += scaled_whole as i64;
    if leftover != 0.0 {
        let mut rounded = leftover.round();
        if (rounded - leftover).abs() == 0.5 {
            let odd = if x % 2 == 0 { 0.0 } else { 1.0 };
            rounded = 2.0 * f64::midpoint(leftover, odd).round() - odd;
        }
        x += rounded as i64;
    }
    x
}

/// Python's `_divide_and_round`: integer division rounding half to even.
pub(crate) fn divide_and_round(a: i64, b: i64) -> i64 {
    let (mut q, r) = (a.div_euclid(b), a.rem_euclid(b));
    let r2 = r * 2;
    let greater_than_half = if b > 0 { r2 > b } else { r2 < b };
    // Python's `q % 2` is never negative.
    if greater_than_half || (r2 == b && q.rem_euclid(2) == 1) {
        q += 1;
    }
    q
}

/// Days since 0001-01-01 (proleptic Gregorian), Python's `date.toordinal() - 1`.
fn days_from_civil(day: CivilDay) -> i64 {
    let (y, m, d) = (
        i64::from(day.year),
        i64::from(day.month),
        i64::from(day.day),
    );
    let y = if m <= 2 { y - 1 } else { y };
    let era = y.div_euclid(400);
    let yoe = y - era * 400;
    let mp = (m + 9) % 12;
    let doy = (153 * mp + 2) / 5 + d - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    era * 146_097 + doe - DAYS_0001_TO_0000_03_01
}

#[expect(
    clippy::cast_possible_truncation,
    clippy::cast_sign_loss,
    reason = "year, month and day of a 0001–9999 instant fit"
)]
fn civil_from_days(days: i64) -> CivilDay {
    let z = days + DAYS_0001_TO_0000_03_01;
    let era = z.div_euclid(146_097);
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146_096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = yoe + era * 400 + i64::from(m <= 2);
    CivilDay::new(y as i32, m as u32, d as u32)
}

/// Days from 0000-03-01 to 0001-01-01 in the proleptic Gregorian calendar.
const DAYS_0001_TO_0000_03_01: i64 = 306;
/// Microseconds from 0001-01-01 to 1970-01-01.
const UNIX_EPOCH_MICROS: i64 = 719_162 * MICROS_PER_DAY;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ordinal_matches_python() {
        assert_eq!(days_from_civil(CivilDay::new(1, 1, 1)), 0);
        assert_eq!(days_from_civil(CivilDay::new(1970, 1, 1)), 719_162);
        assert_eq!(civil_from_days(719_162), CivilDay::new(1970, 1, 1));
        for d in [0, 59, 365, 146_096, 738_000, 3_652_058] {
            assert_eq!(days_from_civil(civil_from_days(d)), d, "day {d}");
        }
    }

    #[test]
    fn halving_rounds_half_to_even() {
        assert_eq!(divide_and_round(3, 2), 2);
        assert_eq!(divide_and_round(5, 2), 2);
        assert_eq!(divide_and_round(7, 2), 4);
        assert_eq!(divide_and_round(-3, 2), -2);
    }

    #[test]
    fn jd_round_trip_truncates_seconds() {
        let i = UtcInstant::from_jd_truncated(2_451_545.25).expect("in range");
        assert_eq!(i.to_string(), "2000-01-01T18:00:00+00:00");
        assert!(
            UtcInstant::from_jd_truncated(2_299_159.5).is_none(),
            "julian days are not datetimes"
        );
    }
}
