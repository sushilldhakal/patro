//! Civil days: Julian calendar before 1582-10-15, Gregorian from it on.

use std::fmt;

use crate::julian::{Calendar, julday, revjul};

/// The first Gregorian day, 1582-10-15, which directly follows Julian 1582-10-04.
pub const GREGORIAN_CUTOVER: CivilDay = CivilDay {
    year: 1582,
    month: 10,
    day: 15,
};
/// Julian Day of 1582-10-15 at 0h UT.
pub const GREGORIAN_CUTOVER_JD: f64 = 2_299_160.5;

/// A civil day label. Astronomical years: 1 BCE is year 0, 255 BCE is `-254`.
///
/// Ordered by (year, month, day), like the Python `CivilDay` tuple.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct CivilDay {
    /// Astronomical year.
    pub year: i32,
    /// Month, 1–12.
    pub month: u32,
    /// Day of the month, 1–31.
    pub day: u32,
}

impl CivilDay {
    /// A civil day from its parts; no validation, like the Python `NamedTuple`.
    #[must_use]
    pub const fn new(year: i32, month: u32, day: u32) -> Self {
        Self { year, month, day }
    }

    /// The calendar this label is read in: Gregorian from 1582-10-15 on.
    #[must_use]
    pub fn calendar(self) -> Calendar {
        if self >= GREGORIAN_CUTOVER {
            Calendar::Gregorian
        } else {
            Calendar::Julian
        }
    }

    /// Julian Day at 0h UT.
    #[must_use]
    pub fn to_jd_ut(self) -> f64 {
        julday(self.year, self.month, self.day, 0.0, self.calendar())
    }

    /// The civil day holding a Julian Day (UT).
    #[must_use]
    pub fn from_jd_ut(jd_ut: f64) -> Self {
        let (year, month, day, _) = revjul(jd_ut, calendar_for_jd(jd_ut));
        Self { year, month, day }
    }

    /// The day `days` later (earlier when negative).
    #[must_use]
    pub fn add_days(self, days: i32) -> Self {
        Self::from_jd_ut(self.to_jd_ut() + f64::from(days))
    }

    /// Whether Python's `datetime.date` can hold this label: CE and on or after the cutover.
    ///
    /// The Python server takes its `datetime` path for these days and its Julian-Day
    /// path for the rest, and the two differ in small ways this port keeps.
    #[must_use]
    pub fn is_datetime_range(self) -> bool {
        self.year >= 1
            && self >= GREGORIAN_CUTOVER
            && self.year <= 9999
            && self.is_valid_gregorian()
    }
}

/// The calendar a Julian Day is read in: Gregorian on or after the cutover instant.
pub(crate) fn calendar_for_jd(jd_ut: f64) -> Calendar {
    if jd_ut >= GREGORIAN_CUTOVER_JD {
        Calendar::Gregorian
    } else {
        Calendar::Julian
    }
}

impl CivilDay {
    /// Whether the label is a real date in the proleptic Gregorian calendar.
    #[must_use]
    pub fn is_valid_gregorian(self) -> bool {
        let day = self;
        let leap = (day.year % 4 == 0 && day.year % 100 != 0) || day.year % 400 == 0;
        let days_in_month = match day.month {
            1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
            4 | 6 | 9 | 11 => 30,
            2 if leap => 29,
            2 => 28,
            _ => return false,
        };
        (1..=days_in_month).contains(&day.day)
    }
}

impl fmt::Display for CivilDay {
    /// ISO-like: 4-digit year, astronomical sign for BCE (`-0056-03-20`).
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        if self.year < 0 {
            write!(f, "-{:04}-{:02}-{:02}", -self.year, self.month, self.day)
        } else {
            write!(f, "{:04}-{:02}-{:02}", self.year, self.month, self.day)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_cutover_skips_ten_labels() {
        let before = CivilDay::new(1582, 10, 4);
        assert_eq!(before.add_days(1), GREGORIAN_CUTOVER);
        assert!(!before.is_datetime_range());
        assert!(GREGORIAN_CUTOVER.is_datetime_range());
    }

    #[test]
    fn bce_formats_with_astronomical_sign() {
        assert_eq!(CivilDay::new(-56, 3, 20).to_string(), "-0056-03-20");
        assert_eq!(CivilDay::new(2026, 11, 1).to_string(), "2026-11-01");
    }
}
