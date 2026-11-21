//! Instants the Python server keeps as a bare Julian Day (`UtInstant`), and the
//! trait that lets the panchanga builders run on either kind.
//!
//! Python's builders are duck-typed: the same code bisects, adds `timedelta`s and
//! formats clocks whether it holds a `datetime` (1582-10-15 on) or a `UtInstant`
//! (Julian and BCE days). [`PyInstant`] is that shared surface. [`UtcInstant`]
//! keeps its `datetime` arithmetic; [`JdInstant`] copies `UtInstant`'s: float
//! Julian Days, with every difference passed through a `timedelta` (so rounded to
//! the microsecond) the way `UtInstant.__sub__` builds one.

use std::fmt;

use crate::{
    Zone,
    civil::{CivilDay, calendar_for_jd},
    instant::{Moment, UtcInstant, divide_and_round, timedelta_micros},
    julian::{julday, revjul},
};

const MICROS_PER_SECOND: i64 = 1_000_000;

/// A UT instant stored as a Julian Day: Python's `UtInstant`, used for every
/// instant `datetime` cannot hold (before 1582-10-15, and BCE).
#[derive(Debug, Clone, Copy, PartialEq, PartialOrd)]
pub struct JdInstant(pub f64);

/// An instant on a wall clock, as the Python builders read one.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct WallClock {
    /// The local civil day.
    pub day: CivilDay,
    /// `HH:MM:SS`.
    pub hms: String,
    /// `HH:MM`.
    pub hm: String,
    /// The ISO text Python prints for it (`isoformat()`, or the offset-less
    /// `local` of `format_ut_instant_local` for a Julian Day instant).
    pub iso: String,
}

/// What the panchanga builders need from an instant, in Python's semantics.
pub trait PyInstant: Copy + PartialEq + PartialOrd + fmt::Debug + fmt::Display {
    /// Julian Day (UT).
    fn to_jd(self) -> f64;

    /// `self + timedelta(microseconds=micros)`.
    #[must_use]
    fn add_micros(self, micros: i64) -> Self;

    /// `(self - earlier)` as a `timedelta`, in microseconds.
    fn micros_since(self, earlier: Self) -> i64;

    /// `self + timedelta(seconds=seconds)` for a float.
    #[must_use]
    fn add_seconds_f64(self, seconds: f64) -> Self {
        self.add_micros(timedelta_micros(seconds, MICROS_PER_SECOND))
    }

    /// `dt.astimezone(tz)` read through `strftime`/`isoformat`/`date()`.
    ///
    /// A `UtInstant`'s `astimezone` returns itself, so a Julian Day instant reads
    /// its UTC fields here: the duck-typed Python paths print UTC for those days.
    fn astimezone(self, zone: &Zone) -> WallClock;

    /// `format_ut_instant_local`: the zone's clock for a `datetime`; for a Julian
    /// Day instant the zone's modern offset (read at 2000-06-15) with every field
    /// truncated.
    fn wall(self, zone: &Zone) -> WallClock;

    /// `local_civil_fields`: like [`PyInstant::wall`], but a Julian Day instant
    /// rounds its seconds (guarding the :60 seam) instead of truncating them.
    fn civil_fields(self, zone: &Zone) -> WallClock;

    /// The UTC offset (seconds) the zone's clock shows for this instant: the real
    /// one for a `datetime`, the modern reference offset for a Julian Day instant.
    fn utc_offset_seconds(self, zone: &Zone) -> i32;

    /// The Julian Day when this is a `UtInstant`, `None` for a `datetime`.
    fn as_jd_instant(self) -> Option<f64>;

    /// This kind's reading of an engine result: a `datetime` takes only a
    /// [`Moment::Utc`]; a Julian Day instant takes either, by its Julian Day.
    fn from_moment(moment: Moment) -> Option<Self>;

    /// This instant as the engine's [`Moment`].
    fn moment(self) -> Moment;

    /// `parse_ephemeris_instant` of what [`fmt::Display`] writes.
    fn parse_py(text: &str) -> Option<Self>;

    /// The instant at a Julian Day, as `ut_instant_from_jd` hands it back for
    /// this kind (a `datetime` truncates to the second).
    fn from_jd(jd: f64) -> Option<Self>;

    /// `self + timedelta(days=days)` for a float.
    #[must_use]
    fn add_days_f64(self, days: f64) -> Self {
        self.add_micros(timedelta_micros(days, MICROS_PER_SECOND * 86_400))
    }

    /// `self + timedelta(seconds=seconds)`.
    #[must_use]
    fn add_seconds(self, seconds: i64) -> Self {
        self.add_micros(seconds * MICROS_PER_SECOND)
    }

    /// `self + timedelta(hours=hours)`.
    #[must_use]
    fn add_hours(self, hours: i64) -> Self {
        self.add_seconds(hours * 3600)
    }

    /// `(self - earlier).total_seconds()`.
    #[expect(
        clippy::cast_precision_loss,
        reason = "day-scale spans in microseconds are far below 2^53"
    )]
    fn seconds_since(self, earlier: Self) -> f64 {
        self.micros_since(earlier) as f64 / 1_000_000.0
    }

    /// `start + (end - start) / 2`, the `timedelta` halved half to even.
    #[must_use]
    fn midpoint(start: Self, end: Self) -> Self {
        start.add_micros(divide_and_round(end.micros_since(start), 2))
    }

    /// `start + (end - start) / divisor`.
    #[must_use]
    fn fraction(start: Self, end: Self, divisor: i64) -> Self {
        start.add_micros(divide_and_round(end.micros_since(start), divisor))
    }

    /// `((end - start) / divisor).total_seconds()`.
    #[expect(
        clippy::cast_precision_loss,
        reason = "day-scale spans in microseconds are far below 2^53"
    )]
    fn span_divided_seconds(start: Self, end: Self, divisor: i64) -> f64 {
        divide_and_round(end.micros_since(start), divisor) as f64 / 1_000_000.0
    }
}

impl PyInstant for UtcInstant {
    fn to_jd(self) -> f64 {
        Self::to_jd(self)
    }

    fn add_micros(self, micros: i64) -> Self {
        Self::add_micros(self, micros)
    }

    fn micros_since(self, earlier: Self) -> i64 {
        Self::micros_since(self, earlier)
    }

    fn astimezone(self, zone: &Zone) -> WallClock {
        let local = zone.local(self);
        WallClock {
            day: local.day(),
            hms: local.hms(),
            hm: local.hm(),
            iso: local.to_string(),
        }
    }

    fn wall(self, zone: &Zone) -> WallClock {
        PyInstant::astimezone(self, zone)
    }

    fn civil_fields(self, zone: &Zone) -> WallClock {
        PyInstant::astimezone(self, zone)
    }

    fn utc_offset_seconds(self, zone: &Zone) -> i32 {
        zone.offset_seconds_at(self)
    }

    fn as_jd_instant(self) -> Option<f64> {
        None
    }

    fn from_jd(jd: f64) -> Option<Self> {
        Self::from_jd_truncated(jd)
    }

    fn parse_py(text: &str) -> Option<Self> {
        text.parse().ok()
    }

    fn from_moment(moment: Moment) -> Option<Self> {
        match moment {
            Moment::Utc(t) => Some(t),
            Moment::Jd(_) => None,
        }
    }

    fn moment(self) -> Moment {
        Moment::Utc(self)
    }
}

/// `(year, month, day, hour)` of a Julian Day in the calendar of its era.
fn parts(jd: f64) -> (i32, u32, u32, f64) {
    revjul(jd, calendar_for_jd(jd))
}

fn hms(h: i64, m: i64, s: i64) -> (String, String) {
    (format!("{h:02}:{m:02}:{s:02}"), format!("{h:02}:{m:02}"))
}

#[expect(
    clippy::cast_possible_truncation,
    clippy::cast_precision_loss,
    reason = "Python int() of an hour in [0, 24) and its fractions"
)]
impl PyInstant for JdInstant {
    fn to_jd(self) -> f64 {
        self.0
    }

    fn add_micros(self, micros: i64) -> Self {
        Self(self.0 + (micros as f64 / 1_000_000.0) / 86400.0)
    }

    fn micros_since(self, earlier: Self) -> i64 {
        timedelta_micros((self.0 - earlier.0) * 86400.0, MICROS_PER_SECOND)
    }

    fn astimezone(self, _zone: &Zone) -> WallClock {
        let (year, month, day, hour) = parts(self.0);
        let h = hour as i64;
        let frac = hour - hour.floor();
        let m = (frac * 60.0) as i64;
        let s = (((frac * 60.0) % 1.0) * 60.0) as i64;
        let (hms, hm) = hms(h, m, s);
        WallClock {
            day: CivilDay::new(year, month, day),
            hms,
            hm,
            iso: self.to_string(),
        }
    }

    fn wall(self, zone: &Zone) -> WallClock {
        let local_jd = self.0 + f64::from(zone.reference_offset_seconds()) / 86400.0;
        let (year, month, day, hour) = parts(local_jd);
        let h = hour as i64;
        let m = ((hour - h as f64) * 60.0) as i64;
        let s = (((hour - h as f64) * 60.0 - m as f64) * 60.0) as i64;
        let (hms, hm) = hms(h, m, s);
        let day = CivilDay::new(year, month, day);
        WallClock {
            day,
            iso: format!("{day}T{hms}"),
            hms,
            hm,
        }
    }

    fn civil_fields(self, zone: &Zone) -> WallClock {
        let local_jd = self.0 + f64::from(zone.reference_offset_seconds()) / 86400.0;
        let (year, month, day, hour) = parts(local_jd);
        let mut h = hour as i64;
        let mut m = ((hour - h as f64) * 60.0) as i64;
        let mut s = py_round_half_even(((hour - h as f64) * 60.0 - m as f64) * 60.0);
        if s >= 60 {
            s = 0;
            m += 1;
        }
        if m >= 60 {
            m = 0;
            h += 1;
        }
        let (hms, hm) = hms(h, m, s);
        let day = CivilDay::new(year, month, day);
        WallClock {
            day,
            iso: format!("{day}T{hms}"),
            hms,
            hm,
        }
    }

    fn utc_offset_seconds(self, zone: &Zone) -> i32 {
        zone.reference_offset_seconds()
    }

    fn as_jd_instant(self) -> Option<f64> {
        Some(self.0)
    }

    fn from_jd(jd: f64) -> Option<Self> {
        Some(Self(jd))
    }

    fn parse_py(text: &str) -> Option<Self> {
        Self::parse_expanded(text)
    }

    fn from_moment(moment: Moment) -> Option<Self> {
        Some(Self(moment.to_jd()))
    }

    fn moment(self) -> Moment {
        Moment::Jd(self.0)
    }
}

/// Python's `round(x)` to an int (half to even).
#[expect(
    clippy::cast_possible_truncation,
    clippy::float_cmp,
    reason = "seconds of a minute fit; the exact-half test is Python's"
)]
fn py_round_half_even(x: f64) -> i64 {
    let r = x.round();
    if (r - x).abs() == 0.5 && r % 2.0 != 0.0 {
        (r - x.signum()) as i64
    } else {
        r as i64
    }
}

impl fmt::Display for JdInstant {
    /// `format_expanded_utc_iso`: `±YYYY-MM-DDTHH:MM:SS.ffffff+00:00`.
    #[expect(
        clippy::cast_possible_truncation,
        clippy::cast_precision_loss,
        reason = "int() of whole hours and minutes, as in Python"
    )]
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let (year, month, day, hour) = parts(self.0);
        let total = hour.max(0.0) * 3600.0;
        let h = (total / 3600.0).floor() as i64;
        let rem = total - h as f64 * 3600.0;
        let m = (rem / 60.0).floor() as i64;
        let mut sec = rem - m as f64 * 60.0;
        if sec >= 59.999_999_5 {
            sec = 59.999_999;
        }
        let day = CivilDay::new(year, month, day);
        write!(f, "{day}T{h:02}:{m:02}:{sec:09.6}+00:00")
    }
}

impl JdInstant {
    /// `jd_from_expanded_utc_iso`: read back what [`fmt::Display`] writes.
    ///
    /// Returns `None` for text that is not an expanded ISO instant.
    #[must_use]
    pub fn parse_expanded(text: &str) -> Option<Self> {
        let (sign, body) = text.strip_prefix('-').map_or((1, text), |rest| (-1, rest));
        let (date, time) = body.split_once(['T', ' '])?;
        let mut d = date.splitn(3, '-');
        let year: i32 = d.next()?.parse().ok()?;
        let month: u32 = d.next()?.parse().ok()?;
        let day: u32 = d.next()?.parse().ok()?;
        let time = time.get(..time.find(['+', 'Z']).unwrap_or(time.len()))?;
        let mut t = time.splitn(3, ':');
        let h: u32 = t.next()?.parse().ok()?;
        let mi: u32 = t.next()?.parse().ok()?;
        let second: f64 = t.next().map_or(Some(0.0), |s| s.parse().ok())?;
        let hour = f64::from(h) + f64::from(mi) / 60.0 + second / 3600.0;
        let civil = CivilDay::new(sign * year, month, day);
        Some(Self(julday(civil.year, month, day, hour, civil.calendar())))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn expanded_iso_round_trips_to_the_microsecond() {
        let t = JdInstant(1_705_060.524_553_528_5);
        assert_eq!(t.to_string(), "-0044-03-15T00:35:21.424864+00:00");
        let back = JdInstant::parse_expanded(&t.to_string()).expect("parses");
        assert!((back.0 - t.0).abs() < 1e-9);
    }

    #[test]
    fn wall_clock_uses_the_modern_offset() {
        let t = JdInstant(1_705_060.524_553_528_5);
        let w = t.wall(&Zone::kathmandu());
        assert_eq!(w.iso, "-0044-03-15T06:20:21");
        assert_eq!(w.hm, "06:20");
    }
}
