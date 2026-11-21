//! Python's float arithmetic where it differs from Rust's: `%`, `//`, `round`.

/// `x % m` with Python's semantics (result takes the divisor's sign).
#[must_use]
pub fn py_mod(x: f64, m: f64) -> f64 {
    let r = x % m;
    if r == 0.0 {
        0.0_f64.copysign(m)
    } else if (m < 0.0) != (r < 0.0) {
        r + m
    } else {
        r
    }
}

/// `x // m`, as `CPython`'s `float_floor_div` computes it.
#[must_use]
pub fn py_floordiv(x: f64, m: f64) -> f64 {
    let mut r = x % m;
    let mut div = (x - r) / m;
    if r == 0.0 {
        r = 0.0_f64.copysign(m);
    } else if (m < 0.0) != (r < 0.0) {
        r += m;
        div -= 1.0;
    }
    let _ = r;
    if div == 0.0 {
        return 0.0_f64.copysign(x / m);
    }
    let mut floor = div.floor();
    if div - floor > 0.5 {
        floor += 1.0;
    }
    floor
}

/// `round(x, ndigits)`: the exact binary value rounded half to even, as `CPython` does.
///
/// # Panics
///
/// Never: a formatted float always parses back.
#[must_use]
pub fn py_round(x: f64, ndigits: usize) -> f64 {
    format!("{x:.ndigits$}")
        .parse()
        .expect("a formatted float parses")
}

/// `stable_round(value, 6)`: round to 9 places, then to 6 (`engine/astronomy/position.py`).
#[must_use]
pub fn stable_round(x: f64) -> f64 {
    py_round(py_round(x, 9), 6)
}

/// `timedelta / n`: microseconds divided with Python's half-to-even rounding.
#[must_use]
pub fn timedelta_div(micros: i64, n: i64) -> i64 {
    let (mut q, r) = (micros.div_euclid(n), micros.rem_euclid(n));
    let r2 = r * 2;
    if r2 > n || (r2 == n && q % 2 == 1) {
        q += 1;
    }
    q
}

/// `round(x)` to an integer, half to even.
#[expect(
    clippy::cast_possible_truncation,
    reason = "durations in seconds are far inside i64"
)]
#[must_use]
pub fn py_round_int(x: f64) -> i64 {
    x.round_ties_even() as i64
}

/// `int(x)` of a non-negative float.
#[expect(
    clippy::cast_possible_truncation,
    reason = "clock components and counts are small"
)]
#[must_use]
pub fn py_int(x: f64) -> i64 {
    x as i64
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn matches_cpython() {
        assert_eq!(py_floordiv(7.5, 2.0), 3.0);
        assert_eq!(py_floordiv(-7.5, 2.0), -4.0);
        assert_eq!(py_round(2.675, 2), 2.67, "2.675 is really 2.67499…");
        assert_eq!(py_round(0.125, 2), 0.12, "exact tie goes to even");
        assert_eq!(py_round_int(2.5), 2);
        assert_eq!(py_round_int(3.5), 4);
    }
}
