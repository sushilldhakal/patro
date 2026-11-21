//! The five angas at an instant.

use astronomy::engine::{moon_longitude, sun_moon_longitudes};
use timescale::{Moment, Zone};

use crate::names::{
    KARANA_NAMES, NAKSHATRA_NAMES, TITHI_NAMES, VAARA_ENGLISH, VAARA_NAMES, YOGA_NAMES,
};

/// Degrees of elongation per tithi.
pub(crate) const TITHI_SPAN: f64 = 12.0;
/// Degrees per nakshatra (and per yoga).
pub(crate) const NAKSHATRA_SPAN: f64 = 360.0 / 27.0;
/// Degrees of elongation per karana.
pub(crate) const KARANA_SPAN: f64 = 6.0;

/// Python's float `%`: the result takes the divisor's sign (+0.0 for exact zero).
pub(crate) fn py_mod(x: f64, m: f64) -> f64 {
    let r = x % m;
    if r == 0.0 {
        0.0_f64.copysign(m)
    } else if (m < 0.0) != (r < 0.0) {
        r + m
    } else {
        r
    }
}

/// `int(x)` of a non-negative angle ratio, as Python truncates it.
#[expect(
    clippy::cast_possible_truncation,
    clippy::cast_sign_loss,
    reason = "ratios are in [0, 60]"
)]
pub(crate) fn trunc(x: f64) -> u32 {
    x as u32
}

/// Sun→Moon elongation in degrees [0, 360): tithi and karana are both cuts of it.
#[must_use]
pub fn elongation(jd_ut: f64) -> f64 {
    let (sun, moon) = sun_moon_longitudes(jd_ut);
    py_mod(moon - sun, 360.0)
}

/// Bright or dark half of the lunar month.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Paksha {
    /// शुक्ल: tithis 1–15.
    Shukla,
    /// कृष्ण: tithis 16–30.
    Krishna,
}

impl Paksha {
    /// The lowercase name the API uses.
    #[must_use]
    pub const fn name(self) -> &'static str {
        match self {
            Self::Shukla => "shukla",
            Self::Krishna => "krishna",
        }
    }
}

/// The tithi in force at an instant.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Tithi {
    /// 1–30 from Shukla Pratipada.
    pub number: u32,
    /// Shukla or Krishna.
    pub paksha: Paksha,
    /// 1–15 within the paksha.
    pub display_number: u32,
    /// How far through the tithi, 0–1.
    pub progress: f64,
    /// The Moon−Sun angle that defines it.
    pub elongation: f64,
}

impl Tithi {
    /// Name in the Python server's spelling (15 is Purnima or Aausi).
    #[must_use]
    pub fn name(&self) -> &'static str {
        match (self.display_number, self.paksha) {
            (15, Paksha::Shukla) => "Purnima",
            (15, Paksha::Krishna) => "Aausi",
            (n, _) => TITHI_NAMES[n as usize - 1],
        }
    }
}

/// The tithi at `jd_ut`.
#[must_use]
pub fn tithi(jd_ut: f64) -> Tithi {
    let elongation = elongation(jd_ut);
    let number = trunc(elongation / TITHI_SPAN) + 1;
    let paksha = if number <= 15 {
        Paksha::Shukla
    } else {
        Paksha::Krishna
    };
    Tithi {
        number,
        paksha,
        display_number: if number <= 15 { number } else { number - 15 },
        progress: py_mod(elongation, TITHI_SPAN) / TITHI_SPAN,
        elongation,
    }
}

/// The Moon's nakshatra at an instant.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Nakshatra {
    /// 1–27 from Ashwini.
    pub number: u32,
    /// Quarter 1–4.
    pub pada: u32,
    /// How far through the nakshatra, 0–1.
    pub progress: f64,
}

impl Nakshatra {
    /// Name in the Python server's spelling.
    #[must_use]
    pub fn name(&self) -> &'static str {
        NAKSHATRA_NAMES[self.number as usize - 1]
    }
}

/// The Moon's nakshatra at `jd_ut`.
#[must_use]
pub fn nakshatra(jd_ut: f64) -> Nakshatra {
    let raw = moon_longitude(jd_ut) / NAKSHATRA_SPAN;
    let index = trunc(raw) % 27;
    let progress = py_mod(raw, 1.0);
    Nakshatra {
        number: index + 1,
        pada: (trunc(progress * 4.0) + 1).min(4),
        progress,
    }
}

/// The yoga at an instant: a cut of the Sun + Moon longitude sum.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Yoga {
    /// 1–27 from Vishkumbha.
    pub number: u32,
    /// How far through the yoga, 0–1.
    pub progress: f64,
}

impl Yoga {
    /// Name in the Python server's spelling.
    #[must_use]
    pub fn name(&self) -> &'static str {
        YOGA_NAMES[self.number as usize - 1]
    }
}

/// The yoga at `jd_ut`.
#[must_use]
pub fn yoga(jd_ut: f64) -> Yoga {
    let (sun, moon) = sun_moon_longitudes(jd_ut);
    let raw = py_mod(sun + moon, 360.0) / NAKSHATRA_SPAN;
    Yoga {
        number: trunc(raw) % 27 + 1,
        progress: py_mod(raw, 1.0),
    }
}

/// The karana at an instant: half a tithi.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Karana {
    /// 1–60 through the lunation.
    pub number: u32,
    /// How far through the karana, 0–1.
    pub progress: f64,
}

impl Karana {
    /// Name: Kimstughna first, the seven movable ones repeating, the three fixed last.
    #[must_use]
    pub fn name(&self) -> &'static str {
        match self.number - 1 {
            0 => KARANA_NAMES[10],
            i @ 57.. => KARANA_NAMES[7 + (i - 57) as usize],
            i => KARANA_NAMES[((i - 1) % 7) as usize],
        }
    }
}

/// The karana at `jd_ut`.
#[must_use]
pub fn karana(jd_ut: f64) -> Karana {
    let elongation = elongation(jd_ut);
    Karana {
        number: trunc(elongation / KARANA_SPAN) + 1,
        progress: py_mod(elongation, KARANA_SPAN) / KARANA_SPAN,
    }
}

/// The weekday at the observer's local time.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Vara {
    /// 0 = Sunday … 6 = Saturday.
    pub number: u32,
}

impl Vara {
    /// Sanskrit name (Ravivara …).
    #[must_use]
    pub fn name(&self) -> &'static str {
        VAARA_NAMES[self.number as usize]
    }

    /// English name.
    #[must_use]
    pub fn english(&self) -> &'static str {
        VAARA_ENGLISH[self.number as usize]
    }
}

/// The vara at `jd_ut` for an observer in `zone`.
///
/// The offset is read at the instant (truncated to the second, as Python's
/// `datetime_from_jd` gives it), but the weekday comes from the Julian Day itself:
/// `int(jd + offset + 0.5) % 7` is Monday = 0. Before 1582-10-15 the zone's modern
/// offset is used, as the Python server does.
#[must_use]
#[expect(
    clippy::cast_possible_truncation,
    clippy::cast_sign_loss,
    reason = "a Julian Day Number is positive and fits"
)]
pub fn vara(jd_ut: f64, zone: &Zone) -> Vara {
    let offset_seconds = match Moment::from_jd(jd_ut) {
        Moment::Utc(instant) => zone.offset_seconds_at(instant),
        Moment::Jd(_) => zone.reference_offset_seconds(),
    };
    let weekday = ((jd_ut + f64::from(offset_seconds) / 86400.0 + 0.5) as i64 % 7) as u32;
    Vara {
        number: (weekday + 1) % 7,
    }
}
