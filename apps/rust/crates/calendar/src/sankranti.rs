//! Sankranti: the moment the sidereal Sun enters a rashi.

use astronomy::{
    angles::Anga,
    engine::sun_longitude,
    events::{next_event, next_sankranti, prev_event, prev_sankranti},
    position::SuryaSiddhanta,
    solver::near,
};

/// Python's float `%` for a positive divisor (+0.0 for an exact zero).
fn py_mod(x: f64, m: f64) -> f64 {
    let r = x % m;
    if r == 0.0 {
        0.0
    } else if r < 0.0 {
        r + m
    } else {
        r
    }
}

/// The rashi 0–11 (Mesha … Meena) the sidereal Sun is in.
#[must_use]
#[expect(
    clippy::cast_possible_truncation,
    clippy::cast_sign_loss,
    reason = "longitude / 30 is in [0, 12]"
)]
pub fn sun_rashi_at_jd(jd: f64) -> u32 {
    (sun_longitude(jd) / 30.0) as u32 % 12
}

/// Sun's longitude minus `target`, folded into [−180, 180).
/// The Sun's rashi as a bracketing scan sees it, read from the event engine.
///
/// The day-by-day scans that bracket a sankranti only ever ask "which rashi is the
/// Sun in on this grid day?" within a month of the entry into `target`. Given that
/// entry's time, the answer is `prev` before it and `target` after it; the real
/// longitude is evaluated only within a hair of the entry (or everywhere when
/// `after` itself sits on a sankranti), so the scan finds the same bracket it
/// always found while evaluating almost nothing.
pub fn scan_rashi(target_rashi: u32, after_jd: f64) -> impl Fn(f64) -> u32 {
    let eph = SuryaSiddhanta;
    let prev = (target_rashi + 11) % 12;
    let unsure = near(after_jd, next_event(&eph, Anga::Sankranti, after_jd).jd)
        || near(after_jd, prev_event(&eph, Anga::Sankranti, after_jd).jd);
    let entry = if sun_rashi_at_jd(after_jd) == target_rashi {
        prev_sankranti(&eph, target_rashi, after_jd).jd
    } else {
        next_sankranti(&eph, target_rashi, after_jd).jd
    };
    move |jd: f64| {
        if unsure || near(jd, entry) {
            sun_rashi_at_jd(jd)
        } else if jd < entry {
            prev
        } else {
            target_rashi
        }
    }
}

fn angular_error_jd(jd: f64, target: f64) -> f64 {
    py_mod(sun_longitude(jd) - target + 180.0, 360.0) - 180.0
}

fn bisect(target: f64, low_jd: f64, high_jd: f64, tolerance: f64) -> f64 {
    let (mut low, mut high) = (low_jd, high_jd);
    for _ in 0..60 {
        if high - low < tolerance {
            break;
        }
        let mid = f64::midpoint(low, high);
        let mid_err = angular_error_jd(mid, target);
        let low_err = angular_error_jd(low, target);
        if low_err == 0.0 {
            return low;
        }
        if mid_err == 0.0 {
            return mid;
        }
        if low_err * mid_err <= 0.0 {
            high = mid;
        } else {
            low = mid;
        }
    }
    high
}

/// Brent's method on the angular error, falling back to bisection, as in Python.
#[expect(
    clippy::many_single_char_names,
    clippy::float_cmp,
    reason = "the textbook names of Brent's method; its exact-equality tests are kept as in Python"
)]
fn brent(target: f64, low_jd: f64, high_jd: f64, tol: f64) -> f64 {
    let f = |jd: f64| angular_error_jd(jd, target);
    let (mut a, mut b) = (low_jd, high_jd);
    let (mut fa, mut fb) = (f(a), f(b));
    if fa == 0.0 {
        return a;
    }
    if fb == 0.0 {
        return b;
    }
    if fa * fb > 0.0 {
        return bisect(target, a, b, tol);
    }
    if fa.abs() < fb.abs() {
        (a, b, fa, fb) = (b, a, fb, fa);
    }
    let (mut c, mut fc, mut d) = (a, fa, a);
    let mut mflag = true;
    for _ in 0..50 {
        if (b - a).abs() <= tol || fb == 0.0 {
            return b;
        }
        let mut s = if fa != fc && fb != fc {
            (a * fb * fc) / ((fa - fb) * (fa - fc))
                + (b * fa * fc) / ((fb - fa) * (fb - fc))
                + (c * fa * fb) / ((fc - fa) * (fc - fb))
        } else {
            b - fb * (b - a) / (fb - fa)
        };
        let q = (3.0 * a + b) / 4.0;
        let cond1 = !(q.min(b) < s && s < q.max(b));
        let cond2 = mflag && (s - b).abs() >= (b - c).abs() / 2.0;
        let cond3 = !mflag && (s - b).abs() >= (c - d).abs() / 2.0;
        let cond4 = mflag && (b - c).abs() < tol;
        let cond5 = !mflag && (c - d).abs() < tol;
        if cond1 || cond2 || cond3 || cond4 || cond5 {
            s = f64::midpoint(a, b);
            mflag = true;
        } else {
            mflag = false;
        }
        let fs = f(s);
        (d, c) = (c, b);
        fc = fb;
        if fa * fs < 0.0 {
            (b, fb) = (s, fs);
        } else {
            (a, fa) = (s, fs);
        }
        if fa.abs() < fb.abs() {
            (a, b, fa, fb) = (b, a, fb, fa);
        }
    }
    b
}

/// The next sidereal sankranti into `target_rashi` (0 = Mesha) at or after `after_jd`,
/// to one second, or `None` if the day scan finds no bracket within `max_days`.
#[must_use]
pub fn find_sankranti_after_jd(target_rashi: u32, after_jd: f64, max_days: u32) -> Option<f64> {
    find_with(
        target_rashi,
        after_jd,
        max_days,
        scan_rashi(target_rashi, after_jd),
    )
}

/// The same search with the full day-by-day longitude scan, for the comparison tests.
#[doc(hidden)]
#[must_use]
pub fn find_sankranti_after_jd_scan(
    target_rashi: u32,
    after_jd: f64,
    max_days: u32,
) -> Option<f64> {
    find_with(target_rashi, after_jd, max_days, sun_rashi_at_jd)
}

fn find_with(
    target_rashi: u32,
    after_jd: f64,
    max_days: u32,
    rashi_at: impl Fn(f64) -> u32,
) -> Option<f64> {
    let target = f64::from(target_rashi * 30);
    let prev = (target_rashi + 11) % 12;
    let current = sun_rashi_at_jd(after_jd);
    let (low, high) = if current == target_rashi {
        let mut search = after_jd;
        (0..max_days).find_map(|_| {
            search -= 1.0;
            (rashi_at(search) == prev).then_some((search, after_jd))
        })?
    } else if current == prev {
        let mut search = after_jd;
        (0..max_days).find_map(|_| {
            search += 1.0;
            (rashi_at(search) == target_rashi).then_some((after_jd, search))
        })?
    } else {
        let mut search = after_jd;
        let mut found_prev = None;
        (0..max_days * 12).find_map(|_| {
            search += 1.0;
            let rashi = rashi_at(search);
            if rashi == prev {
                found_prev = Some(search);
                None
            } else if rashi == target_rashi {
                found_prev.map(|p| (p, search))
            } else {
                None
            }
        })?
    };
    Some(brent(target, low, high, 1.0 / 86400.0))
}
