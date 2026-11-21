//! A bracketed secant (Illinois) solver for a forward-sweeping angle.

use crate::angles::signed180;

/// Bracket width (days) at which a root counts as found: about 0.2 ms, the
/// resolution of a Julian Day near the present.
const TOLERANCE_DAYS: f64 = 2e-9;

/// Smallest bracketing step (days): wider than one step of the Surya Siddhanta's
/// staircase (2^-13 day), so a step always reaches the next value.
const MIN_STEP_DAYS: f64 = 2e-4;

/// The root of `f` in `[a, b]`, given `f(a) < 0 <= f(b)`, by the Illinois method.
/// Returns the upper end of the final bracket, where `f` is already non-negative:
/// the first instant the angle has reached its target.
///
/// Surya Siddhanta longitudes move in steps of about ten seconds (the float
/// resolution of days since creation), so `f` may be a staircase. A secant crawls
/// on a staircase; whenever two secant steps fail to halve the bracket, a plain
/// bisection step follows, so the bracket always closes in a bounded number of
/// evaluations and the root is the edge of the step where `f` turns non-negative.
pub fn illinois(f: impl Fn(f64) -> f64, mut a: f64, mut fa: f64, mut b: f64, mut fb: f64) -> f64 {
    let mut kept = 0_i8;
    let mut width = b - a;
    let mut slow = 0_u8;
    for _ in 0..400 {
        if b - a <= TOLERANCE_DAYS {
            break;
        }
        let mut c = if slow >= 2 {
            slow = 0;
            f64::midpoint(a, b)
        } else {
            (a * fb - b * fa) / (fb - fa)
        };
        if !(c > a && c < b) {
            c = f64::midpoint(a, b);
        }
        let fc = f(c);
        if fc >= 0.0 {
            (b, fb) = (c, fc);
            if kept == -1 {
                fa /= 2.0;
            }
            kept = -1;
        } else {
            (a, fa) = (c, fc);
            if kept == 1 {
                fb /= 2.0;
            }
            kept = 1;
        }
        if b - a > width / 2.0 {
            slow += 1;
        } else {
            width = b - a;
            slow = 0;
        }
    }
    b
}

/// One crossing: when an angle reached a multiple of its span, and which multiple.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Crossing {
    /// Julian Day (UT) of the crossing.
    pub jd: f64,
    /// The multiple reached: `angle == multiple × span` (mod 360) at `jd`.
    pub multiple: u32,
}

/// The first instant after `from` where `angle` (degrees, sweeping forward at about
/// `mean_rate` degrees a day) reaches the next multiple of `span`.
///
/// The first step goes straight to where the mean motion puts the crossing; steps
/// repeat until the angle is past it, then the Illinois method closes the bracket.
/// `jd` is NaN when the angle never gets there (positions unavailable).
#[must_use]
#[expect(
    clippy::cast_possible_truncation,
    clippy::cast_sign_loss,
    reason = "the multiple of a span within one turn is below 360"
)]
pub fn next_crossing(angle: impl Fn(f64) -> f64, span: f64, mean_rate: f64, from: f64) -> Crossing {
    let a0 = angle(from);
    let multiple = (a0 / span).floor() + 1.0;
    let target = multiple * span;
    let g = |t: f64| signed180(angle(t) - target);
    let (mut lo, mut g_lo) = (from, signed180(a0 - target));
    let (mut hi, mut g_hi) = (from, g_lo);
    // Step to where the mean motion puts the crossing, at least one staircase step
    // and at least double the last step, until the angle is past the target.
    let mut step = 0.0_f64;
    for _ in 0..128 {
        step = ((-g_lo / mean_rate) * 1.05)
            .max(MIN_STEP_DAYS)
            .max(step * 2.0);
        hi = lo + step;
        g_hi = g(hi);
        if g_hi >= 0.0 {
            break;
        }
        (lo, g_lo) = (hi, g_hi);
    }
    if !(g_hi >= 0.0 && g_lo < 0.0) {
        // No crossing (positions unavailable): report none rather than guess.
        return Crossing {
            jd: f64::NAN,
            multiple: 0,
        };
    }
    let count = (360.0 / span).round();
    Crossing {
        jd: illinois(g, lo, g_lo, hi, g_hi),
        multiple: (multiple % count) as u32,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn finds_a_uniform_crossing() {
        // An angle at 5°, moving 12° a day, reaches 12° at 7/12 of a day.
        let c = next_crossing(|t| (5.0 + 12.0 * t) % 360.0, 12.0, 12.0, 0.0);
        assert!((c.jd - 7.0 / 12.0).abs() < 1e-8, "{c:?}");
        assert_eq!(c.multiple, 1, "the first multiple");
    }

    #[test]
    fn wraps_through_zero() {
        // 355° moving 12°/day reaches 360 ≡ 0 at 5/12 of a day.
        let c = next_crossing(|t| (355.0 + 12.0 * t) % 360.0, 12.0, 12.0, 0.0);
        assert!((c.jd - 5.0 / 12.0).abs() < 1e-8, "{c:?}");
        assert_eq!(c.multiple, 0, "multiple 30 of 30 is 0");
    }

    #[test]
    fn finds_the_edge_of_a_staircase() {
        // An angle that only moves in 1e-4-day steps: the root is a step edge.
        let stairs = |t: f64| (5.0 + 12.0 * (t / 1e-4).floor() * 1e-4) % 360.0;
        let c = next_crossing(stairs, 12.0, 12.0, 0.0);
        let edge = ((7.0 / 12.0) / 1e-4_f64).ceil() * 1e-4;
        assert!((c.jd - edge).abs() < 3e-9, "{c:?} vs {edge}");
    }

    #[test]
    fn copes_with_a_wrong_mean_rate() {
        // A real rate half the guess, then double: the bracket still closes.
        for rate in [6.0, 24.0] {
            let c = next_crossing(|t| (1.0 + rate * t) % 360.0, 12.0, 12.0, 0.0);
            assert!((c.jd - 11.0 / rate).abs() < 1e-8, "{rate}: {c:?}");
        }
    }
}
