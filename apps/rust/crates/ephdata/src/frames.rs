//! Our own coordinate transformations: ICRS → the mean equator and ecliptic of date.
//!
//! IAU 2006 precession in the Fukushima–Williams form with the frame bias, and the
//! IAU 2006 mean obliquity. Nutation is deliberately absent: a sidereal longitude is
//! measured from a zero point fixed among the stars, so nutation of the equinox
//! cancels (the equation of the equinoxes enters only sidereal *time*).

/// Arcseconds to radians.
const AS: f64 = std::f64::consts::PI / 648_000.0;

/// A 3×3 rotation, row-major.
pub type Mat3 = [[f64; 3]; 3];

fn horner(t: f64, c: &[f64]) -> f64 {
    c.iter().rev().fold(0.0, |acc, k| acc * t + k)
}

/// `Rx(φ)` as SOFA's `iauRx` applies it (a rotation of the frame).
fn rx(phi: f64, r: &Mat3) -> Mat3 {
    let (s, c) = phi.sin_cos();
    mul(&[[1.0, 0.0, 0.0], [0.0, c, s], [0.0, -s, c]], r)
}

fn rz(phi: f64, r: &Mat3) -> Mat3 {
    let (s, c) = phi.sin_cos();
    mul(&[[c, s, 0.0], [-s, c, 0.0], [0.0, 0.0, 1.0]], r)
}

/// `a · b`.
#[must_use]
pub fn mul(a: &Mat3, b: &Mat3) -> Mat3 {
    let mut out = [[0.0; 3]; 3];
    for (i, row) in out.iter_mut().enumerate() {
        for (j, cell) in row.iter_mut().enumerate() {
            *cell = (0..3).map(|k| a[i][k] * b[k][j]).sum();
        }
    }
    out
}

/// `m · v`.
#[must_use]
pub fn apply(m: &Mat3, v: &[f64; 3]) -> [f64; 3] {
    [
        m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
        m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
        m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
    ]
}

/// `mᵀ · v`.
#[must_use]
pub fn apply_transpose(m: &Mat3, v: &[f64; 3]) -> [f64; 3] {
    [
        m[0][0] * v[0] + m[1][0] * v[1] + m[2][0] * v[2],
        m[0][1] * v[0] + m[1][1] * v[1] + m[2][1] * v[2],
        m[0][2] * v[0] + m[1][2] * v[1] + m[2][2] * v[2],
    ]
}

/// IAU 2006 mean obliquity of the ecliptic, radians; `t` in Julian centuries of TT
/// from J2000.
#[must_use]
pub fn mean_obliquity(t: f64) -> f64 {
    horner(
        t,
        &[
            84_381.406,
            -46.836_769,
            -0.000_183_1,
            0.002_003_40,
            -0.000_000_576,
            -0.000_000_043_4,
        ],
    ) * AS
}

/// The bias-precession matrix: ICRS vector → mean equator and equinox of date.
#[must_use]
pub fn bias_precession(t: f64) -> Mat3 {
    let gamb = horner(
        t,
        &[
            -0.052_928,
            10.556_378,
            0.493_204_4,
            -0.000_312_38,
            -0.000_002_788,
            0.000_000_026_0,
        ],
    ) * AS;
    let phib = horner(
        t,
        &[
            84_381.412_819,
            -46.811_016,
            0.051_126_8,
            0.000_532_89,
            -0.000_000_440,
            -0.000_000_017_6,
        ],
    ) * AS;
    let psib = horner(
        t,
        &[
            -0.041_775,
            5_038.481_484,
            1.558_417_5,
            -0.000_185_22,
            -0.000_026_452,
            -0.000_000_014_8,
        ],
    ) * AS;
    let eps = mean_obliquity(t);
    let identity = [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]];
    let r = rz(gamb, &identity);
    let r = rx(phib, &r);
    let r = rz(-psib, &r);
    rx(-eps, &r)
}

/// ICRS vector → mean ecliptic and equinox of date.
#[must_use]
pub fn ecliptic_of_date(t: f64) -> Mat3 {
    rx(mean_obliquity(t), &bias_precession(t))
}

/// Longitude (degrees, [0, 360)), latitude (degrees) and length of a vector.
#[must_use]
pub fn spherical(v: &[f64; 3]) -> (f64, f64, f64) {
    let r = (v[0] * v[0] + v[1] * v[1] + v[2] * v[2]).sqrt();
    let lon = v[1].atan2(v[0]).to_degrees().rem_euclid(360.0);
    let lat = (v[2] / r).asin().to_degrees();
    (lon, lat, r)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn j2000_obliquity_and_a_pure_rotation() {
        assert!((mean_obliquity(0.0).to_degrees() - 23.439_279_4).abs() < 1e-6);
        let m = ecliptic_of_date(1.234);
        let n = mul(
            &m,
            &[
                [m[0][0], m[1][0], m[2][0]],
                [m[0][1], m[1][1], m[2][1]],
                [m[0][2], m[1][2], m[2][2]],
            ],
        );
        for (i, row) in n.iter().enumerate() {
            for (j, v) in row.iter().enumerate() {
                assert!((v - f64::from(u8::from(i == j))).abs() < 1e-14, "{i}{j}");
            }
        }
    }

    #[test]
    fn precession_is_about_fifty_arcseconds_a_year() {
        // A vector on the J2000 ecliptic at longitude 0 moves ~1.39° a century.
        let e = ecliptic_of_date(0.0);
        let v = apply_transpose(&e, &[1.0, 0.0, 0.0]);
        let (lon, _, _) = spherical(&apply(&ecliptic_of_date(1.0), &v));
        assert!((lon - 1.396_97).abs() < 5e-3, "{lon}");
    }
}
