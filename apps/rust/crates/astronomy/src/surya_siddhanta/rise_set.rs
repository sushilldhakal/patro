//! Rise and set of a body's centre on the true horizon.

use super::{body::Body, frame::altitude};

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

/// First JD (UT) after `jd_start` when the body's centre crosses `horizon` degrees,
/// or `None` if it does not within 1.6 days.
///
/// The text takes rise and set at the centre on the true horizon, with no refraction;
/// the engine passes `horizon = 0.0`.
#[must_use]
#[expect(
    clippy::cast_possible_truncation,
    clippy::cast_sign_loss,
    reason = "the window over the step is the constant 76.8, truncated like Python's int()"
)]
pub fn next_rise_or_set(
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
