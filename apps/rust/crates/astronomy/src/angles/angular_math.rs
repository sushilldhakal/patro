//! Degree arithmetic on the circle, with Python's float `%` semantics.

/// `deg % 360` as Python computes it: always in [0, 360), never −0.0.
#[must_use]
pub fn wrap360(deg: f64) -> f64 {
    let r = deg % 360.0;
    if r == 0.0 {
        0.0
    } else if r < 0.0 {
        r + 360.0
    } else {
        r
    }
}

/// The angle folded into (−180, 180]: how far ahead (+) or behind (−) of zero.
#[must_use]
pub fn signed180(deg: f64) -> f64 {
    let d = wrap360(deg);
    if d > 180.0 { d - 360.0 } else { d }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wraps_like_python() {
        assert_eq!(wrap360(-1.0), 359.0, "negative wraps up");
        assert_eq!(wrap360(725.0), 5.0, "two turns drop");
        assert!(wrap360(-720.0).is_sign_positive(), "no negative zero");
        assert_eq!(signed180(181.0), -179.0, "past half a turn is behind");
        assert_eq!(signed180(180.0), 180.0, "half a turn stays ahead");
    }
}
