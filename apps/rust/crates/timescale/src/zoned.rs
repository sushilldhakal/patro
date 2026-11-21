//! Instants the Python server holds as zone-aware local `datetime`s.
//!
//! The midnight-reference day (`build_panchanga_civil_day`) hands the panchanga
//! builders `datetime(y, m, d, tzinfo=ZoneInfo(...))` bounds, so every instant
//! derived from them prints `isoformat()` on the observer's clock
//! (`2026-11-01T00:40:38.964844+05:45`), and an ISO string read back with
//! `fromisoformat` carries a fixed offset.
//!
//! [`ZonedInstant`] prints the same way, but its arithmetic is real UTC
//! arithmetic. Python adds and subtracts same-zone datetimes on the wall clock,
//! which shifts every bisection on a DST transition day by the change; that is
//! a Python bug the Rust port does not copy (see `rust_divergences.py`).

use std::{
    collections::HashMap,
    fmt,
    sync::{Mutex, OnceLock},
};

use crate::{
    Zone,
    instant::{Moment, UtcInstant},
    jd_instant::{PyInstant, WallClock},
};

/// How a [`ZonedInstant`] picks its printed offset.
#[derive(Debug, Clone, Copy)]
enum Clock {
    /// A `ZoneInfo`: the zone's offset at the instant.
    Zone(&'static Zone),
    /// A fixed `timezone(timedelta(...))` from `fromisoformat`.
    Fixed(i32),
}

/// A UTC instant shown on an observer's clock (Python's aware local `datetime`).
#[derive(Debug, Clone, Copy)]
pub struct ZonedInstant {
    utc: UtcInstant,
    clock: Clock,
}

impl PartialEq for ZonedInstant {
    /// Aware datetimes compare as UTC instants.
    fn eq(&self, other: &Self) -> bool {
        self.utc == other.utc
    }
}

impl PartialOrd for ZonedInstant {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        Some(self.utc.cmp(&other.utc))
    }
}

/// One leaked copy of each zone, so a [`ZonedInstant`] can stay `Copy`. The IANA
/// database is finite, so this is bounded.
fn interned(zone: &Zone) -> &'static Zone {
    static ZONES: OnceLock<Mutex<HashMap<String, &'static Zone>>> = OnceLock::new();
    let mut map = ZONES
        .get_or_init(|| Mutex::new(HashMap::new()))
        .lock()
        .unwrap_or_else(std::sync::PoisonError::into_inner);
    map.entry(zone.name().to_owned())
        .or_insert_with(|| Box::leak(Box::new(zone.clone())))
}

impl ZonedInstant {
    /// `instant.astimezone(zone)`.
    #[must_use]
    pub fn new(utc: UtcInstant, zone: &Zone) -> Self {
        Self {
            utc,
            clock: Clock::Zone(interned(zone)),
        }
    }

    /// `datetime(day, 00:00, tzinfo=zone)`: local midnight (`fold=0`).
    #[must_use]
    pub fn local_midnight(day: crate::CivilDay, zone: &Zone) -> Option<Self> {
        zone.local_to_utc(day, 0, 0, 0, 0)
            .map(|utc| Self::new(utc, zone))
    }

    /// The UTC instant.
    #[must_use]
    pub const fn utc(self) -> UtcInstant {
        self.utc
    }

    fn offset_seconds(self) -> i32 {
        match self.clock {
            Clock::Zone(zone) => zone.offset_seconds_at(self.utc),
            Clock::Fixed(offset) => offset,
        }
    }

    const fn with_utc(self, utc: UtcInstant) -> Self {
        Self {
            utc,
            clock: self.clock,
        }
    }

    /// `datetime.fromisoformat` of an aware ISO string (`±HH:MM[:SS]` or `Z`).
    #[must_use]
    pub fn parse_iso(text: &str) -> Option<Self> {
        if let Some(body) = text.strip_suffix('Z') {
            return Self::parse_iso(&format!("{body}+00:00"));
        }
        let t = text.find('T')?;
        let sign_at = t + text[t..].rfind(['+', '-'])?;
        let (body, offset) = text.split_at(sign_at);
        let sign = if offset.starts_with('-') { -1 } else { 1 };
        let mut parts = offset[1..].split(':').map(str::parse::<i32>);
        let h = parts.next()?.ok()?;
        let m = parts.next()?.ok()?;
        let s = parts.next().map_or(Some(0), Result::ok)?;
        let offset_seconds = sign * (h * 3600 + m * 60 + s);
        let wall: UtcInstant = format!("{body}+00:00").parse().ok()?;
        Some(Self {
            utc: wall.add_seconds(-i64::from(offset_seconds)),
            clock: Clock::Fixed(offset_seconds),
        })
    }
}

impl fmt::Display for ZonedInstant {
    /// `isoformat()` on the instant's own clock.
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        fmt::Display::fmt(&self.utc.at_offset(self.offset_seconds()), f)
    }
}

impl PyInstant for ZonedInstant {
    fn to_jd(self) -> f64 {
        self.utc.to_jd()
    }

    fn add_micros(self, micros: i64) -> Self {
        self.with_utc(self.utc.add_micros(micros))
    }

    fn micros_since(self, earlier: Self) -> i64 {
        self.utc.micros_since(earlier.utc)
    }

    fn ceil_second(self) -> Self {
        self.with_utc(self.utc.ceil_second())
    }

    fn astimezone(self, zone: &Zone) -> WallClock {
        PyInstant::astimezone(self.utc, zone)
    }

    fn wall(self, zone: &Zone) -> WallClock {
        PyInstant::wall(self.utc, zone)
    }

    fn civil_fields(self, zone: &Zone) -> WallClock {
        PyInstant::civil_fields(self.utc, zone)
    }

    fn utc_offset_seconds(self, zone: &Zone) -> i32 {
        zone.offset_seconds_at(self.utc)
    }

    fn as_jd_instant(self) -> Option<f64> {
        None
    }

    /// An engine result is a UTC `datetime`.
    fn from_moment(moment: Moment) -> Option<Self> {
        match moment {
            Moment::Utc(utc) => Some(Self {
                utc,
                clock: Clock::Fixed(0),
            }),
            Moment::Jd(_) => None,
        }
    }

    fn moment(self) -> Moment {
        Moment::Utc(self.utc)
    }

    fn parse_py(text: &str) -> Option<Self> {
        Self::parse_iso(text)
    }

    /// Read back from its own text, the instant keeps its zone: Python's fixed
    /// offset from `fromisoformat` goes stale once arithmetic crosses a DST change.
    fn reparse(self) -> Self {
        Self::parse_iso(&self.to_string()).map_or(self, |parsed| self.with_utc(parsed.utc))
    }

    fn from_jd(jd: f64) -> Option<Self> {
        UtcInstant::from_jd_truncated(jd).map(|utc| Self {
            utc,
            clock: Clock::Fixed(0),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::CivilDay;

    #[test]
    fn midnight_prints_on_the_local_clock() {
        let zone = Zone::kathmandu();
        let m = ZonedInstant::local_midnight(CivilDay::new(2026, 11, 1), &zone).expect("in range");
        assert_eq!(m.to_string(), "2026-11-01T00:00:00+05:45");
        assert_eq!(m.utc().to_string(), "2026-10-31T18:15:00+00:00");
    }

    #[test]
    fn parsed_offsets_round_trip() {
        let text = "2026-11-01T00:40:38.964844+05:45";
        let t = ZonedInstant::parse_iso(text).expect("parses");
        assert_eq!(t.to_string(), text);
        assert_eq!(t.utc().to_string(), "2026-10-31T18:55:38.964844+00:00");
        let ny = ZonedInstant::parse_iso("2026-03-08T03:54:28-04:00").expect("parses");
        assert_eq!(ny.utc().to_string(), "2026-03-08T07:54:28+00:00");
    }
}
