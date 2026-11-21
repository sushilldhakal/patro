//! Python's float `%`, so wrapped angles match the Python server bit for bit.

/// `x % m` with Python's semantics: the result takes the divisor's sign, and an
/// exact zero is `+0.0` for a positive divisor (Rust's `rem_euclid` can give `-0.0`).
pub(crate) fn py_mod(x: f64, m: f64) -> f64 {
    let r = x % m;
    if r == 0.0 {
        0.0_f64.copysign(m)
    } else if (m < 0.0) != (r < 0.0) {
        r + m
    } else {
        r
    }
}

/// Into [0, 360).
pub(crate) fn wrap(deg: f64) -> f64 {
    py_mod(deg, 360.0)
}

/// Into (−180, 180].
pub(crate) fn signed(deg: f64) -> f64 {
    let d = py_mod(deg, 360.0);
    if d > 180.0 { d - 360.0 } else { d }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn matches_python_float_modulo() {
        assert_eq!(py_mod(-1.0, 360.0), 359.0);
        assert_eq!(py_mod(725.0, 360.0), 5.0);
        assert_eq!(
            py_mod(-1e-20, 360.0),
            360.0,
            "python rounds a tiny negative up to the divisor"
        );
        assert!(
            py_mod(-0.0, 360.0).is_sign_positive(),
            "python never returns -0.0 here"
        );
        assert!(py_mod(-720.0, 360.0).is_sign_positive());
    }

    #[test]
    fn signed_is_half_open_at_180() {
        assert_eq!(signed(180.0), 180.0);
        assert_eq!(signed(181.0), -179.0);
        assert_eq!(signed(-180.0), 180.0);
    }
}
