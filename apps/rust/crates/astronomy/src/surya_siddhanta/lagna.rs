//! When the rising sign reaches a given degree, in closed form.
//!
//! The ascendant is a function of one quantity, the sidereal time (RAMC), through
//! `asc = atan2(cos θ, −(sin θ cos ε + tan φ sin ε))`. Inverting it gives the θ at
//! which the ecliptic point λ is rising, and θ grows at a known rate (a turn a day
//! plus the mean Sun's motion), so the time follows without any search. The text's
//! positions move in ten-second steps, so the answer is then snapped to the step
//! where the ascendant actually reads the target, a bracket a few evaluations deep.

use crate::solver::illinois;

use super::{
    frame::{OBLIQUITY, SIDEREAL_RATE, ascendant, ayanamsha, local_sidereal_degrees},
    modulo::{signed, wrap},
};

/// Half-width (days, ~35 s) of the first snapping bracket around the closed-form time.
const FIRST_BRACKET: f64 = 4e-4;

/// The sidereal time (degrees) at which the ecliptic point `sayana` is rising at
/// `latitude`, or `None` where it never rises (the polar circle's far side).
fn ramc_for_ascendant(sayana: f64, latitude: f64) -> Option<f64> {
    let (lambda, eps, tan_phi) = (
        sayana.to_radians(),
        OBLIQUITY.to_radians(),
        latitude.to_radians().tan(),
    );
    // cos θ cos λ + sin θ cos ε sin λ = −tan φ sin ε sin λ, i.e. R cos(θ − δ) = c.
    let (a, b) = (lambda.cos(), eps.cos() * lambda.sin());
    let (r, delta) = (a.hypot(b), b.atan2(a));
    let c = -tan_phi * eps.sin() * lambda.sin();
    let ratio = c / r;
    if ratio.abs() > 1.0 || r == 0.0 {
        return None;
    }
    let spread = ratio.acos();
    // Of the two solutions only one has the ascendant (not its opposite) at λ: the
    // one whose (cos θ, −(sin θ cos ε + tan φ sin ε)) points along (sin λ, cos λ).
    [delta + spread, delta - spread]
        .into_iter()
        .max_by(|x, y| {
            let facing = |t: &f64| {
                t.cos() * lambda.sin() - (t.sin() * eps.cos() + tan_phi * eps.sin()) * lambda.cos()
            };
            facing(x).total_cmp(&facing(y))
        })
        .map(|t| wrap(t.to_degrees()))
}

/// The first instant after `jd_from` (JD UT) at which the sidereal ascendant at
/// (`latitude`, `longitude`) reaches `target` degrees, or `None` where the rising
/// point never reaches it.
#[must_use]
pub fn next_ascendant_crossing(
    jd_from: f64,
    latitude: f64,
    longitude: f64,
    target: f64,
) -> Option<f64> {
    let target = wrap(target);
    let sayana = wrap(target + ayanamsha(jd_from));
    let ramc = ramc_for_ascendant(sayana, latitude)?;
    let ahead = wrap(ramc - local_sidereal_degrees(jd_from, longitude));
    let estimate = jd_from + ahead / SIDEREAL_RATE;
    let f = |t: f64| signed(ascendant(t, latitude, longitude) - target);
    let mut half = FIRST_BRACKET;
    for _ in 0..6 {
        let (lo, hi) = (estimate - half, estimate + half);
        let (f_lo, f_hi) = (f(lo), f(hi));
        if f_lo < 0.0 && f_hi >= 0.0 {
            let root = illinois(f, lo, f_lo, hi, f_hi);
            return (root > jd_from).then_some(root);
        }
        half *= 4.0;
    }
    None
}

/// The first instant after `jd_from` at which the sidereal ascendant enters the
/// next 30° sign.
#[must_use]
pub fn next_lagna_change(jd_from: f64, latitude: f64, longitude: f64) -> Option<f64> {
    let current = ascendant(jd_from, latitude, longitude);
    let target = ((current / 30.0).floor() + 1.0) * 30.0;
    next_ascendant_crossing(jd_from, latitude, longitude, target)
}
