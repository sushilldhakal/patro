//! Rise and set of a body's centre on the true horizon.

use super::{
    body::Body,
    frame::{altitude, ayanamsha, equatorial, local_sidereal_degrees},
    modulo::wrap,
    position::true_position,
};
use crate::{solver::illinois, yearly::rise_set_cached};

/// Which horizon crossing to find.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Crossing {
    /// The centre comes up through the horizon.
    Rise,
    /// The centre goes down through the horizon.
    Set,
}

/// Scan step (days) for rise/set searches.
const SCAN_STEP: f64 = 1.0 / 48.0;
/// Scan window (days): the Moon can take ~25 h to rise again.
const SCAN_WINDOW: f64 = 1.6;
/// Bisection steps once a crossing is bracketed (~1 ms).
const BISECTIONS: usize = 32;
/// Half-width (days, ~43 min) of the bracket around the Sun's predicted crossing.
const SUN_BRACKET: f64 = 0.03;
/// Half-width (days) of the band around a solved crossing where the altitude is
/// evaluated rather than inferred. Positions move in 2^-13-day steps, and at each
/// step right ascension and sidereal time jump by slightly different amounts, so
/// near the horizon the altitude can flip sign more than once within one step.
const STAIRCASE_BAND: f64 = 2.5e-4;
/// Days between successive returns of the Sun's hour angle (one solar day).
const SOLAR_DAY_IN_HOUR_ANGLE: f64 = 1.0;

/// The first rise or set of `body` after `jd_start` (JD UT), or `None` when it
/// does not cross within 1.6 days.
///
/// The contract is the Python search's: a 30-minute scan for the first bracketing
/// pair, then 32 bisections, returning the final midpoint. For the Sun the crossing
/// is predicted from the hour angle and solved directly; the scan and bisection are
/// then replayed against that root, evaluating the altitude only next to it, so
/// the answer is the same float the full search returns. Results are memoized per
/// start, place and horizon.
#[must_use]
pub fn next_rise_or_set(
    body: Body,
    jd_start: f64,
    latitude: f64,
    longitude: f64,
    crossing: Crossing,
    horizon: f64,
) -> Option<f64> {
    rise_set_cached(
        body,
        crossing,
        jd_start,
        latitude,
        longitude,
        horizon,
        || {
            let root = match body {
                Body::Sun => sun_crossing(jd_start, latitude, longitude, crossing, horizon),
                _ => None,
            };
            search(body, jd_start, latitude, longitude, crossing, horizon, root)
        },
    )
}

/// The full 30-minute scan and bisection, evaluating the altitude everywhere: the
/// behaviour [`next_rise_or_set`] reproduces, kept for the comparison tests.
#[doc(hidden)]
#[must_use]
pub fn next_rise_or_set_scan(
    body: Body,
    jd_start: f64,
    latitude: f64,
    longitude: f64,
    crossing: Crossing,
    horizon: f64,
) -> Option<f64> {
    search(body, jd_start, latitude, longitude, crossing, horizon, None)
}

/// The Python search. With `root` known, "is the body up at `t`?" is answered by
/// comparing `t` with the root, except within [`STAIRCASE_BAND`] of it.
#[expect(
    clippy::cast_possible_truncation,
    clippy::cast_sign_loss,
    reason = "the window over the step is the constant 76.8, truncated like Python's int()"
)]
fn search(
    body: Body,
    jd_start: f64,
    latitude: f64,
    longitude: f64,
    crossing: Crossing,
    horizon: f64,
    root: Option<f64>,
) -> Option<f64> {
    let rising = crossing == Crossing::Rise;
    let up = |t: f64| match root {
        Some(r) if (t - r).abs() >= STAIRCASE_BAND => (t >= r) == rising,
        _ => altitude(body, t, latitude, longitude) - horizon >= 0.0,
    };
    let (mut t0, mut up0) = (jd_start, up(jd_start));
    let steps = (SCAN_WINDOW / SCAN_STEP) as usize;
    for _ in 0..steps {
        let t1 = t0 + SCAN_STEP;
        let up1 = up(t1);
        let crossed = if rising { !up0 && up1 } else { up0 && !up1 };
        if crossed {
            let (mut lo, mut hi) = (t0, t1);
            for _ in 0..BISECTIONS {
                let mid = f64::midpoint(lo, hi);
                if up(mid) == rising {
                    hi = mid;
                } else {
                    lo = mid;
                }
            }
            return Some(f64::midpoint(lo, hi));
        }
        (t0, up0) = (t1, up1);
    }
    None
}

/// The Sun's first crossing after `jd_start`, solved directly: the hour angle of
/// the crossing (from the declination, as the text derives day length from the
/// ascensional difference) predicts it, and a bracketed secant finishes it.
/// `None` near the poles or when the prediction does not bracket a crossing; the
/// full scan decides those.
fn sun_crossing(
    jd_start: f64,
    latitude: f64,
    longitude: f64,
    crossing: Crossing,
    horizon: f64,
) -> Option<f64> {
    let rising = crossing == Crossing::Rise;
    let mid = jd_start + 0.5;
    let (ra, dec) = equatorial(true_position(Body::Sun, mid).0 + ayanamsha(mid), 0.0);
    let (phi, d) = (latitude.to_radians(), dec.to_radians());
    let cos_h0 = (horizon.to_radians().sin() - phi.sin() * d.sin()) / (phi.cos() * d.cos());
    if cos_h0.is_nan() || cos_h0.abs() >= 0.85 {
        return None;
    }
    let h0 = cos_h0.acos().to_degrees();
    let hour_now = local_sidereal_degrees(jd_start, longitude) - ra;
    let target = if rising { -h0 } else { h0 };
    let estimate = jd_start + wrap(target - hour_now) / 360.0;
    let (lo, hi) = (estimate - SUN_BRACKET, estimate + SUN_BRACKET);
    // The same crossing a day earlier must be clearly before the start, or the
    // prediction may have skipped one that falls just after it.
    let day_earlier = estimate - SOLAR_DAY_IN_HOUR_ANGLE;
    if lo <= jd_start
        || day_earlier + 2.0 * SUN_BRACKET >= jd_start
        || hi >= jd_start + SCAN_WINDOW - SCAN_STEP
    {
        return None;
    }
    let sign = if rising { 1.0 } else { -1.0 };
    let g = |t: f64| sign * (altitude(Body::Sun, t, latitude, longitude) - horizon);
    let (g_lo, g_hi) = (g(lo), g(hi));
    if !(g_lo < 0.0 && g_hi > 0.0) {
        return None;
    }
    Some(illinois(g, lo, g_lo, hi, g_hi))
}
