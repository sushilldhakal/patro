//! When the drik ascendant reaches a degree: the text's closed form (the sidereal time
//! that puts a point on the horizon, then a bracketed finish) with drik's obliquity,
//! sidereal time and ayanamsha.

use crate::{
    angles::{signed180, wrap360},
    drik::DrikSky,
    solver::illinois,
};

const FIRST_BRACKET: f64 = 4e-4;
const SIDEREAL_RATE: f64 = 360.985_647_366_29;

fn ramc_for_ascendant(sayana: f64, latitude: f64, eps: f64) -> Option<f64> {
    let (lambda, tan_phi) = (sayana.to_radians(), latitude.to_radians().tan());
    let (a, b) = (lambda.cos(), eps.cos() * lambda.sin());
    let (r, delta) = (a.hypot(b), b.atan2(a));
    let c = -tan_phi * eps.sin() * lambda.sin();
    let ratio = c / r;
    if ratio.abs() > 1.0 || r == 0.0 {
        return None;
    }
    let spread = ratio.acos();
    [delta + spread, delta - spread]
        .into_iter()
        .max_by(|x, y| {
            let facing = |t: &f64| {
                t.cos() * lambda.sin() - (t.sin() * eps.cos() + tan_phi * eps.sin()) * lambda.cos()
            };
            facing(x).total_cmp(&facing(y))
        })
        .map(|t| wrap360(t.to_degrees()))
}

/// The first instant after `jd_from` at which the sidereal ascendant reaches `target`.
#[must_use]
pub(crate) fn next_ascendant_crossing(
    sky: &DrikSky,
    jd_from: f64,
    latitude: f64,
    longitude: f64,
    target: f64,
) -> Option<f64> {
    let target = wrap360(target);
    let sayana = wrap360(target + sky.ayanamsha(jd_from));
    let eps = DrikSky::obliquity_of(jd_from);
    let ramc = ramc_for_ascendant(sayana, latitude, eps)?;
    let ahead = wrap360(ramc - DrikSky::local_sidereal_degrees(jd_from, longitude));
    let estimate = jd_from + ahead / SIDEREAL_RATE;
    let f = |t: f64| signed180(sky.ascendant(t, latitude, longitude) - target);
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
