//! Eclipses (Burgess, chapters IV and V).
//!
//! Lunar (ch. IV): at the opposition the Moon's disc and the Earth's shadow are
//! measured in minutes; the Moon's latitude against half their sum says whether,
//! and how much, she is eclipsed, and the half-durations follow from it.
//! Solar (ch. V): the same at the conjunction, but seen from the observer, so the
//! Moon's parallax in longitude (लम्बन) moves the middle of the eclipse and its
//! parallax in latitude (नति) moves her latitude.

use super::{
    Direction,
    body::{Body, MeanBody},
    frame::{OBLIQUITY, altitude, ascendant_sayana, ayanamsha, local_sidereal_degrees},
    modulo::{py_mod, signed, wrap},
    position::{true_longitude_and_speed, true_position},
    yuga::MAHAYUGA_DAYS,
};

/// Diameters in yojanas (IV.1, I.59) and orbits in yojanas (XII.80–90).
const SUN_DIAMETER_YOJANAS: f64 = 6500.0;
const MOON_DIAMETER_YOJANAS: f64 = 480.0;
const EARTH_DIAMETER_YOJANAS: f64 = 1600.0;
const MOON_ORBIT_YOJANAS: f64 = 324_000.0;
const SUN_ORBIT_YOJANAS: f64 = 4_331_500.0;
/// Yojanas per minute of arc on the Moon's orbit (IV.3: "divide by 15").
const YOJANAS_PER_MINUTE: f64 = 15.0;
/// Lunations searched before giving up on finding an eclipse (several per year occur).
const MAX_LUNATIONS: usize = 48;
/// Mean synodic month (days), only for the first guess of a syzygy.
const SYNODIC_DAYS: f64 = 29.530_588;

/// Mean daily motion (degrees per day) of a mean body.
#[expect(
    clippy::cast_precision_loss,
    reason = "revolution and day counts are exact as f64"
)]
fn mean_daily_motion(body: MeanBody) -> f64 {
    360.0 * body.revolutions_per_mahayuga() as f64 / MAHAYUGA_DAYS as f64
}

/// Moon − Sun, degrees [0, 360).
#[must_use]
pub fn elongation(jd_ut: f64) -> f64 {
    wrap(true_position(Body::Moon, jd_ut).0 - true_position(Body::Sun, jd_ut).0)
}

/// JD of the next (or previous) moment the elongation equals `target` (0 new, 180 full).
#[must_use]
pub fn next_syzygy(jd_ut: f64, target: f64, direction: Direction) -> f64 {
    let now = elongation(jd_ut);
    let mut ahead = py_mod(target - now, 360.0);
    match direction {
        Direction::Backward => ahead = if ahead > 1e-6 { ahead - 360.0 } else { -360.0 },
        Direction::Forward if ahead < 1e-6 => ahead = 360.0,
        Direction::Forward => {}
    }
    let mut t = jd_ut + ahead / (360.0 / SYNODIC_DAYS);
    for _ in 0..8 {
        let (_, moon_speed) = true_longitude_and_speed(Body::Moon, t);
        let (_, sun_speed) = true_longitude_and_speed(Body::Sun, t);
        let step = signed(target - elongation(t)) / (moon_speed - sun_speed);
        t += step;
        if step.abs() < 1e-7 {
            break;
        }
    }
    t
}

/// The Moon's latitude in minutes, north positive.
#[must_use]
pub fn moon_latitude_minutes(jd_ut: f64) -> f64 {
    true_position(Body::Moon, jd_ut).1 * 60.0
}

/// The discs of Sun and Moon, the Earth's shadow and the relative motion, in minutes.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct EclipseMeasures {
    /// The Sun's disc brought to the Moon's orbit, minutes.
    pub sun: f64,
    /// The Moon's disc, minutes.
    pub moon: f64,
    /// The Earth's shadow at the Moon's orbit, minutes.
    pub shadow: f64,
    /// Moon's motion from the Sun, minutes of arc per day.
    pub relative: f64,
    /// The greatest parallax: four ghatis of the Moon's motion from the Sun (V.9), minutes.
    pub parallax: f64,
}

/// The eclipse measures at `jd_ut` (IV.2–5).
///
/// Each body's diameter is scaled by its true over mean daily motion; the Sun's is
/// brought to the Moon's orbit; the shadow is the सूची (the Earth's diameter scaled
/// like the Moon's) less the Sun's excess over the Earth, scaled by the Moon's
/// diameter over the Sun's.
#[must_use]
pub fn eclipse_measures(jd_ut: f64) -> EclipseMeasures {
    let (_, moon_speed) = true_longitude_and_speed(Body::Moon, jd_ut);
    let (_, sun_speed) = true_longitude_and_speed(Body::Sun, jd_ut);
    let moon_ratio = moon_speed / mean_daily_motion(MeanBody::Moon);
    let sun_ratio = sun_speed / mean_daily_motion(MeanBody::Sun);
    let sun_yojanas = SUN_DIAMETER_YOJANAS * sun_ratio;
    let moon_yojanas = MOON_DIAMETER_YOJANAS * moon_ratio;
    let suchi = EARTH_DIAMETER_YOJANAS * moon_ratio;
    let shadow_yojanas = suchi
        - (sun_yojanas - EARTH_DIAMETER_YOJANAS) * MOON_DIAMETER_YOJANAS / SUN_DIAMETER_YOJANAS;
    let relative = (moon_speed - sun_speed) * 60.0;
    EclipseMeasures {
        sun: sun_yojanas * MOON_ORBIT_YOJANAS / SUN_ORBIT_YOJANAS / YOJANAS_PER_MINUTE,
        moon: moon_yojanas / YOJANAS_PER_MINUTE,
        shadow: shadow_yojanas / YOJANAS_PER_MINUTE,
        relative,
        parallax: relative / YOJANAS_PER_MINUTE,
    }
}

/// Which side of the middle a contact lies on.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Side {
    Before,
    After,
}

/// Half-duration in days for a contact at `reach` minutes, refined (IV.12–13).
///
/// The text recomputes the Moon's latitude at the found contact and repeats; so
/// does this, three times.
fn half_duration(
    middle: f64,
    reach: f64,
    relative: f64,
    latitude_at: impl Fn(f64) -> f64,
    side: Side,
) -> Option<f64> {
    let contact = |half: f64| {
        if side == Side::Before {
            middle - half
        } else {
            middle + half
        }
    };
    let mut latitude = latitude_at(middle);
    if latitude.abs() >= reach {
        return None;
    }
    let mut half = (reach * reach - latitude * latitude).sqrt() / relative;
    for _ in 0..3 {
        latitude = latitude_at(contact(half));
        if latitude.abs() >= reach {
            return Some(half);
        }
        half = (reach * reach - latitude * latitude).sqrt() / relative;
    }
    Some(half)
}

/// How much of the disc an eclipse covers.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum EclipseType {
    /// The whole disc.
    Total,
    /// The Moon inside the Sun's disc, leaving a ring.
    Annular,
    /// Part of the disc.
    Partial,
}

impl EclipseType {
    /// The lowercase name the API uses.
    #[must_use]
    pub const fn name(self) -> &'static str {
        match self {
            Self::Total => "total",
            Self::Annular => "annular",
            Self::Partial => "partial",
        }
    }
}

/// A lunar eclipse by chapter IV. The text has no penumbra.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct LunarEclipse {
    /// Total or partial.
    pub eclipse_type: EclipseType,
    /// JD (UT) of the middle: the opposition.
    pub max_jd: f64,
    /// Eclipsed part (ग्रास) over the Moon's disc.
    pub magnitude: f64,
    /// First and last contact with the shadow, when the refinement finds both.
    pub partial: Option<(f64, f64)>,
    /// Start and end of totality, when total and found.
    pub total: Option<(f64, f64)>,
}

/// A solar eclipse somewhere on Earth (chapter V).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct SolarEclipse {
    /// Total or annular when central for some place, else partial.
    pub eclipse_type: EclipseType,
    /// JD (UT) of the conjunction.
    pub max_jd: f64,
}

/// An eclipse found by [`next_eclipse`].
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Eclipse {
    /// Of the Moon.
    Lunar(LunarEclipse),
    /// Of the Sun.
    Solar(SolarEclipse),
}

impl Eclipse {
    /// JD (UT) of the middle of the eclipse.
    #[must_use]
    pub const fn max_jd(&self) -> f64 {
        match self {
            Self::Lunar(e) => e.max_jd,
            Self::Solar(e) => e.max_jd,
        }
    }
}

/// Which body is eclipsed.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum EclipseKind {
    /// The Moon, at full moon.
    Lunar,
    /// The Sun, at new moon.
    Solar,
}

/// Start and end around `middle`, when both refinements find a contact.
fn contacts(
    middle: f64,
    reach: f64,
    relative: f64,
    latitude_at: impl Fn(f64) -> f64 + Copy,
) -> Option<(f64, f64)> {
    let before = half_duration(middle, reach, relative, latitude_at, Side::Before)?;
    let after = half_duration(middle, reach, relative, latitude_at, Side::After)?;
    Some((middle - before, middle + after))
}

/// The lunar eclipse at this opposition, or `None` when the Moon passes clear of the shadow.
#[must_use]
pub fn lunar_eclipse_at(full_moon_jd: f64) -> Option<LunarEclipse> {
    let m = eclipse_measures(full_moon_jd);
    let latitude = moon_latitude_minutes(full_moon_jd);
    let half_sum = f64::midpoint(m.shadow, m.moon);
    if latitude.abs() >= half_sum {
        return None;
    }
    let eclipsed = half_sum - latitude.abs(); // ग्रास
    let is_total = eclipsed >= m.moon;
    let total = if is_total {
        let half_difference = (m.shadow - m.moon) / 2.0;
        contacts(
            full_moon_jd,
            half_difference,
            m.relative,
            moon_latitude_minutes,
        )
    } else {
        None
    };
    Some(LunarEclipse {
        eclipse_type: if is_total {
            EclipseType::Total
        } else {
            EclipseType::Partial
        },
        max_jd: full_moon_jd,
        magnitude: eclipsed / m.moon,
        partial: contacts(full_moon_jd, half_sum, m.relative, moon_latitude_minutes),
        total,
    })
}

/// A solar eclipse somewhere on Earth: the Moon's parallax can carry her onto the Sun
/// from some place when her latitude is under half the discs plus the greatest parallax.
#[must_use]
pub fn solar_eclipse_global(new_moon_jd: f64) -> Option<SolarEclipse> {
    let m = eclipse_measures(new_moon_jd);
    let latitude = moon_latitude_minutes(new_moon_jd);
    let half_sum = f64::midpoint(m.sun, m.moon);
    if latitude.abs() >= half_sum + m.parallax {
        return None;
    }
    let central = latitude.abs() < m.parallax;
    let eclipse_type = match (central, m.moon >= m.sun) {
        (true, true) => EclipseType::Total,
        (true, false) => EclipseType::Annular,
        (false, _) => EclipseType::Partial,
    };
    Some(SolarEclipse {
        eclipse_type,
        max_jd: new_moon_jd,
    })
}

fn solar_type(sun: f64, moon: f64, latitude: f64) -> EclipseType {
    if latitude.abs() < (moon - sun).abs() / 2.0 {
        if moon >= sun {
            EclipseType::Total
        } else {
            EclipseType::Annular
        }
    } else {
        EclipseType::Partial
    }
}

/// (लम्बन in minutes of longitude, नति in minutes of latitude, north +) for the Moon.
///
/// The greatest parallax P is four ghatis of the Moon's motion from the Sun (V.9).
/// Its part in longitude is `P·cos z·sin(λ − λ_V)` and in latitude P·sin z, where V is
/// the nonagesimal (त्रिभोन लग्न) and z its zenith distance, the altitude of the
/// ecliptic's pole.
fn nonagesimal_parallax(jd_ut: f64, latitude: f64, longitude: f64, relative: f64) -> (f64, f64) {
    let p = relative / YOJANAS_PER_MINUTE;
    let ayan = ayanamsha(jd_ut);
    let nonagesimal = wrap(ascendant_sayana(jd_ut, latitude, longitude) - 90.0);
    let sun_sayana = wrap(true_position(Body::Sun, jd_ut).0 + ayan);
    // Altitude of the north ecliptic pole (RA 270°, dec 90° − obliquity).
    let hour = (local_sidereal_degrees(jd_ut, longitude) - 270.0).to_radians();
    let (phi, dec) = (latitude.to_radians(), (90.0 - OBLIQUITY).to_radians());
    let pole_altitude = (phi.sin() * dec.sin() + phi.cos() * dec.cos() * hour.cos()).asin();
    let in_longitude = p * pole_altitude.cos() * (sun_sayana - nonagesimal).to_radians().sin();
    let in_latitude = -p * pole_altitude.sin();
    (in_longitude, in_latitude)
}

/// A solar eclipse as seen from one place.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct LocalSolarEclipse {
    /// Whether the Sun is above the horizon at the local middle.
    pub visible: bool,
    /// Total, annular or partial from this place.
    pub local_type: EclipseType,
    /// JD (UT) of the local middle, moved by the लम्बन.
    pub local_max_jd: f64,
    /// First contact, when the refinement finds it.
    pub local_begin_jd: Option<f64>,
    /// Last contact, when the refinement finds it.
    pub local_end_jd: Option<f64>,
    /// Eclipsed part over the Sun's disc.
    pub local_magnitude: f64,
}

/// The eclipse as seen from one place: the middle moved by लम्बन, the latitude by नति.
///
/// `None` when the Moon passes clear of the Sun from this place (Python's `{"visible": False}` result).
#[must_use]
pub fn solar_eclipse_local(
    new_moon_jd: f64,
    latitude: f64,
    longitude: f64,
) -> Option<LocalSolarEclipse> {
    let m = eclipse_measures(new_moon_jd);
    let mut middle = new_moon_jd;
    for _ in 0..4 {
        // The text iterates the लम्बन until it settles.
        let (shift, _) = nonagesimal_parallax(middle, latitude, longitude, m.relative);
        middle = new_moon_jd - shift / m.relative;
    }
    let apparent_latitude = |t: f64| {
        moon_latitude_minutes(t) + nonagesimal_parallax(t, latitude, longitude, m.relative).1
    };
    let half_sum = f64::midpoint(m.sun, m.moon);
    let at_middle = apparent_latitude(middle);
    let sun_up = altitude(Body::Sun, middle, latitude, longitude) > 0.0;
    if at_middle.abs() >= half_sum {
        return None;
    }
    let before = half_duration(
        middle,
        half_sum,
        m.relative,
        apparent_latitude,
        Side::Before,
    );
    let after = half_duration(middle, half_sum, m.relative, apparent_latitude, Side::After);
    Some(LocalSolarEclipse {
        visible: sun_up,
        local_type: solar_type(m.sun, m.moon, at_middle),
        local_max_jd: middle,
        local_begin_jd: before.map(|b| middle - b),
        local_end_jd: after.map(|a| middle + a),
        local_magnitude: (half_sum - at_middle.abs()) / m.sun,
    })
}

/// The next (or previous) lunar or solar eclipse after `jd_ut`, by the text's rules.
#[must_use]
pub fn next_eclipse(jd_ut: f64, kind: EclipseKind, direction: Direction) -> Option<Eclipse> {
    let target = match kind {
        EclipseKind::Lunar => 180.0,
        EclipseKind::Solar => 0.0,
    };
    let mut t = jd_ut;
    for _ in 0..MAX_LUNATIONS {
        t = next_syzygy(t, target, direction);
        let found = match kind {
            EclipseKind::Lunar => lunar_eclipse_at(t).map(Eclipse::Lunar),
            EclipseKind::Solar => solar_eclipse_global(t).map(Eclipse::Solar),
        };
        if found.is_some() {
            return found;
        }
        t += if direction == Direction::Backward {
            -1.0
        } else {
            1.0
        };
    }
    None
}
