//! Frames: the ayanamsha, equatorial coordinates, sidereal time, altitude and lagna.

use super::{
    body::{Body, MeanBody},
    modulo::{py_mod, signed, wrap},
    position::true_position,
    yuga::{MAHAYUGA_DAYS, YEAR_DAYS, mean_longitude, revolution_fraction},
};

/// Obliquity of the ecliptic (Burgess II.28): 24°.
pub const OBLIQUITY: f64 = 24.0;
/// Revolutions of the equinox's libration per mahayuga.
const AYANA_REVS_MAHAYUGA: i64 = 600;
/// Amplitude of the libration, degrees.
const AYANA_AMPLITUDE: f64 = 27.0;

/// अयनांश: sayana − nirayana, the libration of the equinox (±27°).
///
/// Zero at the Kali epoch and again 3600 years later (~499 CE); negative between
/// them, positive since, about +22.9° in 2026.
///
/// Memoized per `jd` in `cache::positions`, as for [`true_position`].
#[must_use]
pub fn ayanamsha(jd_ut: f64) -> f64 {
    crate::cache::memo_ayanamsha(0, jd_ut, || ayanamsha_uncached(jd_ut))
}

fn ayanamsha_uncached(jd_ut: f64) -> f64 {
    let arc = 360.0 * revolution_fraction(AYANA_REVS_MAHAYUGA, MAHAYUGA_DAYS, jd_ut);
    let quadrant_arc = py_mod(arc, 180.0);
    let bhuja = if quadrant_arc <= 90.0 {
        quadrant_arc
    } else {
        180.0 - quadrant_arc
    };
    let sign = if arc < 180.0 { -1.0 } else { 1.0 };
    sign * bhuja * AYANA_AMPLITUDE / 90.0
}

/// (right ascension, declination) in degrees for the text's 24° obliquity.
#[must_use]
pub fn equatorial(sayana_longitude: f64, latitude: f64) -> (f64, f64) {
    let (lam, beta, eps) = (
        sayana_longitude.to_radians(),
        latitude.to_radians(),
        OBLIQUITY.to_radians(),
    );
    let ra = (lam.sin() * eps.cos() - beta.tan() * eps.sin()).atan2(lam.cos());
    let dec = (beta.sin() * eps.cos() + beta.cos() * eps.sin() * lam.sin()).asin();
    (wrap(ra.to_degrees()), dec.to_degrees())
}

/// Degrees the sidereal time advances in a day: a full turn plus the mean Sun's motion.
pub(super) const SIDEREAL_RATE: f64 = 360.0 + 360.0 / YEAR_DAYS;

/// Local sidereal time as an angle: the mean Sun's sayana longitude + the mean-solar hour angle.
#[must_use]
pub fn local_sidereal_degrees(jd_ut: f64, longitude: f64) -> f64 {
    let mean_sun = mean_longitude(MeanBody::Sun, jd_ut) + ayanamsha(jd_ut);
    let local_mean_days = jd_ut + longitude / 360.0 + 0.5;
    wrap(mean_sun + 360.0 * py_mod(local_mean_days, 1.0) - 180.0)
}

/// Apparent − mean solar time, in days.
#[must_use]
pub fn equation_of_time_days(jd_ut: f64) -> f64 {
    let mean_sun = mean_longitude(MeanBody::Sun, jd_ut) + ayanamsha(jd_ut);
    let (ra, _) = equatorial(true_position(Body::Sun, jd_ut).0 + ayanamsha(jd_ut), 0.0);
    signed(mean_sun - ra) / 360.0
}

/// Geometric altitude (degrees) of a body's centre.
#[must_use]
pub fn altitude(body: Body, jd_ut: f64, latitude: f64, longitude: f64) -> f64 {
    let (lon, lat) = true_position(body, jd_ut);
    let (ra, dec) = equatorial(lon + ayanamsha(jd_ut), lat);
    let hour = (local_sidereal_degrees(jd_ut, longitude) - ra).to_radians();
    let (phi, d) = (latitude.to_radians(), dec.to_radians());
    (phi.sin() * d.sin() + phi.cos() * d.cos() * hour.cos())
        .asin()
        .to_degrees()
}

/// The rising point of the ecliptic (sayana), for the text's obliquity.
#[must_use]
pub fn ascendant_sayana(jd_ut: f64, latitude: f64, longitude: f64) -> f64 {
    let ramc = local_sidereal_degrees(jd_ut, longitude).to_radians();
    let (eps, phi) = (OBLIQUITY.to_radians(), latitude.to_radians());
    let asc = ramc
        .cos()
        .atan2(-(ramc.sin() * eps.cos() + phi.tan() * eps.sin()));
    wrap(asc.to_degrees())
}

/// लग्न (निरयण).
#[must_use]
pub fn ascendant(jd_ut: f64, latitude: f64, longitude: f64) -> f64 {
    wrap(ascendant_sayana(jd_ut, latitude, longitude) - ayanamsha(jd_ut))
}
