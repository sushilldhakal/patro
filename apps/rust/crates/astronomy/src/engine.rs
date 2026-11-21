//! The engine primitives every panchanga builder calls, answered by the Surya Siddhanta.
//!
//! A port of the parts of `EngineBase` / `SuryaSiddhantaEngine` (`engine.py`,
//! `surya_siddhanta_engine.py`) and `SunService` (`sun.py`) that the angas, their
//! boundaries, sankrantis and the month grid use. Longitudes are sidereal in the
//! text's own frame; the engine wraps them once more into [0, 360) as Python does.

use timescale::{CivilDay, Moment, UtcInstant, Zone};

use crate::surya_siddhanta::{Body, Crossing, next_rise_or_set, true_position};

/// Python's float `%` for a positive divisor, as the engine applies it to longitudes.
fn wrap360(deg: f64) -> f64 {
    let r = deg % 360.0;
    if r == 0.0 {
        0.0
    } else if r < 0.0 {
        r + 360.0
    } else {
        r
    }
}

/// Sidereal longitude (degrees, [0, 360)) of a body, as `EngineBase._calc` returns it.
#[must_use]
pub fn longitude(body: Body, jd_ut: f64) -> f64 {
    wrap360(true_position(body, jd_ut).0)
}

/// Sidereal longitude of the Sun.
#[must_use]
pub fn sun_longitude(jd_ut: f64) -> f64 {
    longitude(Body::Sun, jd_ut)
}

/// Sidereal longitude of the Moon.
#[must_use]
pub fn moon_longitude(jd_ut: f64) -> f64 {
    longitude(Body::Moon, jd_ut)
}

/// (Sun, Moon) sidereal longitudes at one instant.
#[must_use]
pub fn sun_moon_longitudes(jd_ut: f64) -> (f64, f64) {
    (sun_longitude(jd_ut), moon_longitude(jd_ut))
}

/// The Moon's phase angle and lit fraction, from the text's own Sun and Moon
/// (`SuryaSiddhantaEngine.phenomena`): phase angle = 180° − elongation, lit part
/// (1 − cos e) / 2.
#[must_use]
pub fn moon_phase_angle_and_fraction(jd_ut: f64) -> (f64, f64) {
    let sun = true_position(Body::Sun, jd_ut).0;
    let moon = true_position(Body::Moon, jd_ut).0;
    let d = wrap360(moon - sun);
    let elongation = (if d > 180.0 { d - 360.0 } else { d }).abs();
    (
        180.0 - elongation,
        (1.0 - elongation.to_radians().cos()) / 2.0,
    )
}

/// Where an observer stands: latitude and longitude in degrees, and their time zone.
#[derive(Debug, Clone)]
pub struct Observer {
    /// Degrees north.
    pub latitude: f64,
    /// Degrees east.
    pub longitude: f64,
    /// Civil time zone, which decides where a local day starts.
    pub zone: Zone,
}

/// Julian Day of local midnight starting `day` for this observer.
///
/// A `datetime`-range day goes through a UTC `datetime` and `julian_day`, as the
/// Python `rise(date, …)` path does; any other day subtracts the offset from the
/// day's Julian Day, as `rise_civil` does. The two can differ in the last bit,
/// and the Python server takes the first for every CE day.
fn local_midnight_jd(day: CivilDay, zone: &Zone) -> f64 {
    let offset = zone.midnight_offset_seconds(day);
    match UtcInstant::from_utc(day, 0, 0, 0, 0) {
        Some(midnight) if day.is_datetime_range() => {
            midnight.add_micros(-i64::from(offset) * 1_000_000).to_jd()
        }
        _ => day.to_jd_ut() - f64::from(offset) / 86400.0,
    }
}

/// Whether coordinates fall in Nepal's bounding box (`timescale.is_nepal_observer`).
///
/// The Python engine resolves the rise/set midnight anchor with
/// `resolve_observer_timezone(name, lat=, lon=)`, which forces Asia/Kathmandu for
/// any point inside this box whatever zone the caller named. Kept so rise/set
/// match: it matters for akshamsha, whose reference point (27.7172°N, 86.25°E)
/// is inside the box while a foreign observer's latitude on that meridian is not.
#[must_use]
pub fn is_nepal_observer(latitude: f64, longitude: f64) -> bool {
    (26.35..=30.45).contains(&latitude) && (80.05..=88.20).contains(&longitude)
}

/// The first rise or set of `body` after local midnight starting `day`, or `None`
/// when it does not cross within the search window (circumpolar).
///
/// Returned as the Python engine returns it: a `datetime` truncated to the whole
/// second for CE days, the bare Julian Day before 1582-10-15.
#[must_use]
pub fn rise_set_on_day(
    body: Body,
    day: CivilDay,
    observer: &Observer,
    crossing: Crossing,
) -> Option<Moment> {
    let kathmandu;
    let zone = if is_nepal_observer(observer.latitude, observer.longitude) {
        kathmandu = Zone::kathmandu();
        &kathmandu
    } else {
        &observer.zone
    };
    let jd_start = local_midnight_jd(day, zone);
    next_rise_or_set(
        body,
        jd_start,
        observer.latitude,
        observer.longitude,
        crossing,
        0.0,
    )
    .map(Moment::from_jd)
}

/// The first rise or set of `body` at or after an instant (the panchanga day boundary).
#[must_use]
pub fn rise_set_after(
    body: Body,
    after: Moment,
    observer: &Observer,
    crossing: Crossing,
) -> Option<Moment> {
    next_rise_or_set(
        body,
        after.to_jd(),
        observer.latitude,
        observer.longitude,
        crossing,
        0.0,
    )
    .map(Moment::from_jd)
}

/// Sunrise on the civil day holding `jd_ut` (`SunService.sunrise`).
#[must_use]
pub fn sunrise(jd_ut: f64, observer: &Observer) -> Option<Moment> {
    rise_set_on_day(
        Body::Sun,
        CivilDay::from_jd_ut(jd_ut),
        observer,
        Crossing::Rise,
    )
}

/// Sunset on the civil day holding `jd_ut` (`SunService.sunset`).
#[must_use]
pub fn sunset(jd_ut: f64, observer: &Observer) -> Option<Moment> {
    rise_set_on_day(
        Body::Sun,
        CivilDay::from_jd_ut(jd_ut),
        observer,
        Crossing::Set,
    )
}
