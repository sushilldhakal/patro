//! Observer time zones from the IANA database, with the Python server's fallbacks.

use jiff::{
    Timestamp, civil,
    tz::{AmbiguousOffset, TimeZone},
};

use crate::{
    civil::CivilDay,
    instant::{Moment, UtcInstant},
};

/// An IANA time zone, such as `Asia/Kathmandu` (+05:41:16 until 1919, +05:30 until 1985,
/// +05:45 since).
///
/// The zone data is compiled into the binary (`jiff`'s bundled tzdb), so every
/// machine answers the same way.
#[derive(Debug, Clone)]
pub struct Zone {
    name: String,
    tz: TimeZone,
}

/// A time zone name the IANA database does not know.
#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
#[error("unknown observer timezone: {0}")]
pub struct UnknownZoneError(String);

impl Zone {
    /// Looks a zone up by its IANA name.
    ///
    /// # Errors
    ///
    /// When the name is not in the bundled IANA database.
    pub fn get(name: &str) -> Result<Self, UnknownZoneError> {
        let tz = jiff::tz::db()
            .get(name)
            .map_err(|_| UnknownZoneError(name.to_owned()))?;
        Ok(Self {
            name: name.to_owned(),
            tz,
        })
    }

    /// Nepal's zone, the server's default observer.
    ///
    /// # Panics
    ///
    /// Never: `Asia/Kathmandu` is in the bundled database.
    #[must_use]
    pub fn kathmandu() -> Self {
        Self::get("Asia/Kathmandu").expect("Asia/Kathmandu is in the bundled tzdb")
    }

    /// The IANA name.
    #[must_use]
    pub fn name(&self) -> &str {
        &self.name
    }

    /// UTC offset in seconds at an instant.
    ///
    /// # Panics
    ///
    /// Never for a `UtcInstant`: years 1–9999 are inside jiff's range.
    #[must_use]
    pub fn offset_seconds_at(&self, instant: UtcInstant) -> i32 {
        let ts =
            Timestamp::from_microsecond(instant.unix_micros()).expect("years 1-9999 are in range");
        self.tz.to_offset(ts).seconds()
    }

    /// An instant on this zone's wall clock (`dt.astimezone(tz)`).
    #[must_use]
    pub fn local(&self, instant: UtcInstant) -> crate::LocalDateTime {
        instant.at_offset(self.offset_seconds_at(instant))
    }

    /// Offset in seconds of a local wall-clock time. A time in a gap or an overlap
    /// takes the offset in force before the transition, as Python's `fold=0` does
    /// (jiff's "compatible" would take the later one in a gap).
    /// UTC offset in seconds of local `hour`:00 on `day` (`datetime.combine(day, time(hour), tz)`),
    /// or the reference offset when the day is outside the database's range.
    #[must_use]
    pub fn offset_at_local(&self, day: CivilDay, hour: i8) -> i32 {
        self.offset_of_local(day, hour)
            .unwrap_or_else(|| self.reference_offset_seconds())
    }

    /// The instant of a local wall-clock time (`datetime.combine(day, time(h, m, s, us), tz)`):
    /// a time in a gap or an overlap takes the offset in force before the transition
    /// (`fold=0`). `None` outside the database's range or for an invalid time.
    #[must_use]
    pub fn local_to_utc(
        &self,
        day: CivilDay,
        hour: u32,
        minute: u32,
        second: u32,
        micro: u32,
    ) -> Option<UtcInstant> {
        let offset = self.offset_of_wall(
            day,
            i8::try_from(hour).ok()?,
            i8::try_from(minute).ok()?,
            i8::try_from(second).ok()?,
        )?;
        UtcInstant::from_utc(day, hour, minute, second, micro)
            .map(|wall| wall.add_seconds(-i64::from(offset)))
    }

    fn offset_of_local(&self, day: CivilDay, hour: i8) -> Option<i32> {
        self.offset_of_wall(day, hour, 0, 0)
    }

    fn offset_of_wall(&self, day: CivilDay, hour: i8, minute: i8, second: i8) -> Option<i32> {
        let date = civil::Date::new(
            i16::try_from(day.year).ok()?,
            i8::try_from(day.month).ok()?,
            i8::try_from(day.day).ok()?,
        )
        .ok()?;
        let offset = match self
            .tz
            .to_ambiguous_timestamp(date.at(hour, minute, second, 0))
            .offset()
        {
            AmbiguousOffset::Unambiguous { offset } => offset,
            AmbiguousOffset::Gap { before, .. } | AmbiguousOffset::Fold { before, .. } => before,
        };
        Some(offset.seconds())
    }

    /// The zone's modern offset, read at local 2000-06-15 12:00: what the Python server
    /// uses for days the tz database cannot place (before 1582-10-15 and BCE).
    ///
    /// # Panics
    ///
    /// Never: 2000-06-15 is inside every zone's range.
    #[must_use]
    pub fn reference_offset_seconds(&self) -> i32 {
        self.offset_of_local(CivilDay::new(2000, 6, 15), 12)
            .expect("2000-06-15 is in range")
    }

    /// Offset in seconds at local midnight starting `day` (`_utc_offset_days`): the real
    /// offset for a `datetime`-range day, the reference offset otherwise.
    #[must_use]
    pub fn midnight_offset_seconds(&self, day: CivilDay) -> i32 {
        if day.is_datetime_range() {
            self.offset_of_local(day, 0)
                .unwrap_or_else(|| self.reference_offset_seconds())
        } else {
            self.reference_offset_seconds()
        }
    }

    /// The local civil day of a moment (`astimezone(tz).date()`, or the reference
    /// offset applied to the Julian Day for pre-`datetime` moments).
    #[must_use]
    pub fn local_day(&self, moment: Moment) -> CivilDay {
        match moment {
            Moment::Utc(i) => {
                i.add_micros(i64::from(self.offset_seconds_at(i)) * 1_000_000)
                    .fields()
                    .0
            }
            Moment::Jd(jd) => {
                CivilDay::from_jd_ut(jd + f64::from(self.reference_offset_seconds()) / 86400.0)
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn kathmandu_offsets_follow_history() {
        let z = Zone::kathmandu();
        let at = |y| UtcInstant::from_utc(CivilDay::new(y, 6, 1), 0, 0, 0, 0).expect("valid");
        assert_eq!(z.offset_seconds_at(at(1900)), 5 * 3600 + 41 * 60 + 16);
        assert_eq!(z.offset_seconds_at(at(1950)), 5 * 3600 + 30 * 60);
        assert_eq!(z.offset_seconds_at(at(2026)), 5 * 3600 + 45 * 60);
        // 1986-01-01 00:00 local is in the 15-minute gap; fold=0 keeps +05:30.
        assert_eq!(
            z.midnight_offset_seconds(CivilDay::new(1986, 1, 1)),
            5 * 3600 + 30 * 60
        );
        assert!(Zone::get("Mars/Olympus").is_err());
    }
}
