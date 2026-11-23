//! The engine primitives every panchanga builder calls, answered by the Surya Siddhanta.
//!
//! A port of the parts of `EngineBase` / `SuryaSiddhantaEngine` (`engine.py`,
//! `surya_siddhanta_engine.py`) and `SunService` (`sun.py`) that the angas, their
//! boundaries, sankrantis and the month grid use. Longitudes are sidereal in the
//! text's own frame; the engine wraps them once more into [0, 360) as Python does.

use timescale::{CivilDay, Moment, UtcInstant, Zone};

use crate::{
    System,
    position::Ephemeris,
    surya_siddhanta::{Body, Crossing},
};

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
pub fn longitude(system: System, body: Body, jd_ut: f64) -> f64 {
    wrap360(system.true_position(body, jd_ut).0)
}

/// Sidereal longitude of the Sun.
#[must_use]
pub fn sun_longitude(system: System, jd_ut: f64) -> f64 {
    longitude(system, Body::Sun, jd_ut)
}

/// Sidereal longitude of the Moon.
#[must_use]
pub fn moon_longitude(system: System, jd_ut: f64) -> f64 {
    longitude(system, Body::Moon, jd_ut)
}

/// (Sun, Moon) sidereal longitudes at one instant.
///
/// Routed through [`Ephemeris::pos`], so drik shares one Earth state, one
/// rotation and one ayanamsha for the pair instead of evaluating the Sun and
/// the Moon separately. The Surya Siddhanta pair is the same two longitudes
/// it computes individually, so the values are unchanged for both systems.
#[must_use]
pub fn sun_moon_longitudes(system: System, jd_ut: f64) -> (f64, f64) {
    let pos = system.pos(jd_ut);
    (pos.sun, pos.moon)
}

/// The Moon's phase angle and lit fraction, from the text's own Sun and Moon
/// (`SuryaSiddhantaEngine.phenomena`): phase angle = 180° − elongation, lit part
/// (1 − cos e) / 2.
#[must_use]
pub fn moon_phase_angle_and_fraction(system: System, jd_ut: f64) -> (f64, f64) {
    let pos = system.pos(jd_ut);
    moon_phase_angle_and_fraction_from(pos.sun, pos.moon)
}

/// The Moon's phase angle and lit fraction from an already-computed
/// (Sun, Moon) longitude pair, so callers holding the pair do not evaluate
/// the Sun and the Moon a second time.
#[must_use]
pub fn moon_phase_angle_and_fraction_from(sun: f64, moon: f64) -> (f64, f64) {
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
    /// The siddhanta that answers for this observer.
    pub system: System,
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
    observer
        .system
        .next_rise_or_set(
            body,
            jd_start,
            observer.latitude,
            observer.longitude,
            crossing,
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
    observer
        .system
        .next_rise_or_set(
            body,
            after.to_jd(),
            observer.latitude,
            observer.longitude,
            crossing,
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
