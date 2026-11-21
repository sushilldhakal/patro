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

/// Scan step (days) for the Moon's search.
const SCAN_STEP: f64 = 1.0 / 48.0;
/// Scan window (days): the Moon can take ~25 h to rise again.
const SCAN_WINDOW: f64 = 1.6;
/// Bisection steps once a Moon crossing is bracketed (~1 ms).
const BISECTIONS: usize = 32;
/// Half-width (days, ~43 min) of the bracket around the Sun's predicted crossing.
const SUN_BRACKET: f64 = 0.03;

/// The first rise or set of `body` after `jd_start` (JD UT), or `None` when it
/// does not cross within 1.6 days.
///
/// The Sun's crossing is solved directly: its hour angle at the horizon (from the
/// declination, as the text derives day length from the ascensional difference)
/// predicts the time, and a bracketed secant finishes it in a few evaluations. The
/// Moon, and the Sun near the poles, use a 30-minute scan and a bisection. Results
/// are memoized per start, place and horizon.
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
            let solved = match body {
                Body::Sun => sun_crossing(jd_start, latitude, longitude, crossing, horizon),
                _ => None,
            };
            solved.or_else(|| scan(body, jd_start, latitude, longitude, crossing, horizon))
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
    let day_earlier = estimate - 1.0;
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
