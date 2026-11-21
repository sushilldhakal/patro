//! Rise and set of a body's centre on the true horizon.

use super::{
    body::Body,
    frame::{SIDEREAL_RATE, altitude, ayanamsha, equatorial, local_sidereal_degrees},
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

/// Scan step (days) for the Moon's search.
const SCAN_STEP: f64 = 1.0 / 48.0;
/// Scan window (days): the Moon can take ~25 h to rise again.
const SCAN_WINDOW: f64 = 1.6;
/// Bisection steps once a Moon crossing is bracketed (~1 ms).
const BISECTIONS: usize = 32;
/// Half-width (days, ~43 min) of the bracket around a predicted crossing.
const BRACKET: f64 = 0.03;
/// Prediction passes for a body whose right ascension moves quickly (the Moon moves
/// 13° a day against the sky's 361°, so each pass shrinks the error ~25-fold).
const MOVING_BODY_PASSES: usize = 4;

/// The first rise or set of `body` after `jd_start` (JD UT), or `None` when it
/// does not cross within 1.6 days.
///
/// The crossing is solved directly: the body's hour angle at the horizon (from its
/// declination, as the text derives day length from the ascensional difference)
/// predicts the time, and a bracketed secant finishes it in a few evaluations. Near
/// the poles, and when the prediction could have skipped an earlier crossing, a
/// 30-minute scan and a bisection decide. Results are memoized per start, place and
/// horizon.
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
            direct_crossing(body, jd_start, latitude, longitude, crossing, horizon)
                .or_else(|| scan(body, jd_start, latitude, longitude, crossing, horizon))
        },
    )
}

/// The scan-and-bisect search, for bodies and latitudes the direct solution skips.
#[expect(
    clippy::cast_possible_truncation,
    clippy::cast_sign_loss,
    reason = "the window over the step is the constant 76.8, truncated"
)]
fn scan(
    body: Body,
    jd_start: f64,
    latitude: f64,
    longitude: f64,
    crossing: Crossing,
    horizon: f64,
) -> Option<f64> {
    let above = |t: f64| altitude(body, t, latitude, longitude) - horizon;
    let rising = crossing == Crossing::Rise;
    let (mut t0, mut a0) = (jd_start, above(jd_start));
    let steps = (SCAN_WINDOW / SCAN_STEP) as usize;
    for _ in 0..steps {
        let t1 = t0 + SCAN_STEP;
        let a1 = above(t1);
        let crossed = if rising {
            a0 < 0.0 && 0.0 <= a1
        } else {
            a0 >= 0.0 && 0.0 > a1
        };
        if crossed {
            let (mut lo, mut hi) = (t0, t1);
            for _ in 0..BISECTIONS {
                let mid = f64::midpoint(lo, hi);
                if (above(mid) >= 0.0) == rising {
                    hi = mid;
                } else {
                    lo = mid;
                }
            }
            return Some(f64::midpoint(lo, hi));
        }
        (t0, a0) = (t1, a1);
    }
    None
}

/// A body's first crossing after `jd_start`, solved directly: the hour angle of the
/// crossing (from the declination, as the text derives day length from the
/// ascensional difference) predicts it, and a bracketed secant finishes it. The
/// Moon's right ascension moves 13° a day, so its prediction is repeated, each pass
/// shrinking the error about twenty-fold, until it settles within seconds.
/// `None` near the poles or when the prediction does not bracket a crossing; the
/// full scan decides those.
fn direct_crossing(
    body: Body,
    jd_start: f64,
    latitude: f64,
    longitude: f64,
    crossing: Crossing,
    horizon: f64,
) -> Option<f64> {
    let rising = crossing == Crossing::Rise;
    let passes = if body == Body::Sun {
        1
    } else {
        MOVING_BODY_PASSES
    };
    let lst_start = local_sidereal_degrees(jd_start, longitude);
    let phi = latitude.to_radians();
    let mut estimate = jd_start + 0.5;
    for _ in 0..passes {
        let (lon, lat) = true_position(body, estimate);
        let (ra, dec) = equatorial(lon + ayanamsha(estimate), lat);
        let d = dec.to_radians();
        let cos_h0 = (horizon.to_radians().sin() - phi.sin() * d.sin()) / (phi.cos() * d.cos());
        if cos_h0.is_nan() || cos_h0.abs() >= 0.85 {
            return None;
        }
        let h0 = cos_h0.acos().to_degrees();
        let target = if rising { -h0 } else { h0 };
        estimate = jd_start + wrap(target + ra - lst_start) / SIDEREAL_RATE;
    }
    let (lo, hi) = (estimate - BRACKET, estimate + BRACKET);
    // The same crossing a day earlier must be clearly before the start, or the
    // prediction may have skipped one that falls just after it.
    let day_earlier = estimate - 1.0;
    if lo <= jd_start
        || day_earlier + 2.0 * BRACKET >= jd_start
        || hi >= jd_start + SCAN_WINDOW - SCAN_STEP
    {
        return None;
    }
    let sign = if rising { 1.0 } else { -1.0 };
    let g = |t: f64| sign * (altitude(body, t, latitude, longitude) - horizon);
    let (g_lo, g_hi) = (g(lo), g(hi));
    if !(g_lo < 0.0 && g_hi > 0.0) {
        return None;
    }
    Some(illinois(g, lo, g_lo, hi, g_hi))
}
