//! Our own built-in drik: positions from a short series, with no data file.
//!
//! The role Moshier's ephemeris plays for Swiss Ephemeris: when the kernel is not there (a
//! phone, a date outside its file, a server started without data) the Sun, the Moon and Rahu
//! come from a trigonometric series, and the five planets from mean orbital elements. The
//! series is not copied from anyone: `analytic-fit` (in `main.rs`) fits it to this crate's
//! own kernel, by least squares over arguments of the lunar and solar theory, and writes the
//! constants that `analytic_data.rs` holds. The same constants go into the apps
//! (`packages/domain/src/astronomy/drik-analytic-data.ts`), so the server and a phone run the
//! same model.
//!
//! Accuracy is approximate by design, and the fit reports it per century of the kernel's span.
//! Time is TT: the caller converts from UT with [`crate::deltat`].

use crate::deltat::J2000;

/// One term of a series: integer multiples of five arguments, and the sine and cosine amplitudes.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Term {
    /// Multiples of D, M, M′, F and the lunar node Ω.
    pub arg: [i8; 5],
    /// Amplitude of the sine, degrees.
    pub sin: f64,
    /// Amplitude of the cosine, degrees.
    pub cos: f64,
}

/// A fitted series: a polynomial in `u = T / 10` (T in Julian centuries of TT from J2000)
/// plus trigonometric terms. Longitudes are sidereal and unwrapped in the polynomial.
#[derive(Debug, Clone, Copy)]
pub struct Series {
    /// Coefficients of `u^0 .. u^5`, degrees.
    pub poly: [f64; 6],
    /// The harmonic terms.
    pub terms: &'static [Term],
}

/// Julian centuries of TT from J2000.
#[must_use]
pub fn centuries(jd_tt: f64) -> f64 {
    (jd_tt - J2000) / 36_525.0
}

/// The five arguments at `t`, in radians: D, M, M′, F, Ω (Meeus, ch. 47).
#[must_use]
pub fn arguments(t: f64) -> [f64; 5] {
    let d = 297.850_192_1 + t * (445_267.111_403_4 + t * (-0.001_881_9 + t / 545_868.0));
    let m = 357.529_109_2 + t * (35_999.050_290_9 + t * (-0.000_153_6 + t / 24_490_000.0));
    let mp = 134.963_396_4 + t * (477_198.867_505_5 + t * (0.008_741_4 + t / 69_699.0));
    let f = 93.272_095_0 + t * (483_202.017_523_3 + t * (-0.003_653_9 - t / 3_526_000.0));
    let om = 125.044_547_9 + t * (-1_934.136_289_1 + t * (0.002_075_4 + t / 467_441.0));
    [d, m, mp, f, om].map(f64::to_radians)
}

/// The phase of a term.
#[must_use]
pub fn phase(arg: &[i8; 5], a: &[f64; 5]) -> f64 {
    arg.iter().zip(a).map(|(&k, x)| f64::from(k) * x).sum()
}

/// The unwrapped sidereal longitude of a series at `t` (centuries of TT), degrees.
#[must_use]
pub fn series_at(poly: &[f64; 6], terms: &[Term], t: f64) -> f64 {
    let u = t / 10.0;
    let mut value = poly.iter().rev().fold(0.0, |acc, c| acc * u + c);
    let a = arguments(t);
    for term in terms {
        let p = phase(&term.arg, &a);
        value += term.sin * p.sin() + term.cos * p.cos();
    }
    value
}

/// Mean orbital elements: the value at J2000 and its change per century (Standish, JPL, valid
/// 1800-2050, still within a degree or two for a few thousand years).
#[derive(Debug, Clone, Copy)]
pub struct Elements {
    /// Semi-major axis, au.
    pub a: [f64; 2],
    /// Eccentricity.
    pub e: [f64; 2],
    /// Inclination, degrees.
    pub i: [f64; 2],
    /// Mean longitude, degrees.
    pub l: [f64; 2],
    /// Longitude of perihelion, degrees.
    pub peri: [f64; 2],
    /// Longitude of the ascending node, degrees.
    pub node: [f64; 2],
}

/// Mercury, Venus, Earth-Moon barycentre, Mars, Jupiter, Saturn.
pub const PLANETS: [Elements; 6] = [
    Elements {
        a: [0.387_099_27, 0.000_000_37],
        e: [0.205_635_93, 0.000_019_06],
        i: [7.004_979_02, -0.005_947_49],
        l: [252.250_323_50, 149_472.674_111_75],
        peri: [77.457_796_28, 0.160_476_89],
        node: [48.330_765_93, -0.125_340_81],
    },
    Elements {
        a: [0.723_335_66, 0.000_003_90],
        e: [0.006_776_72, -0.000_041_07],
        i: [3.394_676_05, -0.000_788_90],
        l: [181.979_099_50, 58_517.815_387_29],
        peri: [131.602_467_18, 0.002_683_29],
        node: [76.679_842_55, -0.277_694_18],
    },
    Elements {
        a: [1.000_002_61, 0.000_005_62],
        e: [0.016_711_23, -0.000_043_92],
        i: [-0.000_015_31, -0.012_946_68],
        l: [100.464_571_66, 35_999.372_449_81],
        peri: [102.937_681_93, 0.323_273_64],
        node: [0.0, 0.0],
    },
    Elements {
        a: [1.523_710_34, 0.000_018_47],
        e: [0.093_394_10, 0.000_078_82],
        i: [1.849_691_42, -0.008_131_31],
        l: [-4.553_432_05, 19_140.302_684_99],
        peri: [-23.943_629_59, 0.444_410_88],
        node: [49.559_538_91, -0.292_573_43],
    },
    Elements {
        a: [5.202_887_00, -0.000_116_07],
        e: [0.048_386_24, -0.000_132_53],
        i: [1.304_396_95, -0.001_837_14],
        l: [34.396_440_51, 3_034.746_127_75],
        peri: [14.728_479_83, 0.212_526_68],
        node: [100.473_909_09, 0.204_691_06],
    },
    Elements {
        a: [9.536_675_94, -0.001_250_60],
        e: [0.053_861_79, -0.000_509_91],
        i: [2.485_991_87, 0.001_936_09],
        l: [49.954_244_23, 1_222.493_622_01],
        peri: [92.598_878_31, -0.418_972_16],
        node: [113.662_424_48, -0.288_677_94],
    },
];

fn at(pair: [f64; 2], t: f64) -> f64 {
    pair[0] + pair[1] * t
}

/// The heliocentric ecliptic x, y of a body on its orbit at `t`, au (J2000 ecliptic).
fn heliocentric(el: &Elements, t: f64) -> (f64, f64) {
    let (a, e) = (at(el.a, t), at(el.e, t));
    let incl = at(el.i, t).to_radians();
    let peri = at(el.peri, t);
    let node = at(el.node, t).to_radians();
    let m = (at(el.l, t) - peri + 180.0).rem_euclid(360.0) - 180.0;
    let m = m.to_radians();
    let mut ecc = m + e * m.sin();
    for _ in 0..8 {
        ecc -= (ecc - e * ecc.sin() - m) / (1.0 - e * ecc.cos());
    }
    let (xp, yp) = (a * (ecc.cos() - e), a * (1.0 - e * e).sqrt() * ecc.sin());
    let w = peri.to_radians() - node;
    let (cw, sw, co, so, ci) = (w.cos(), w.sin(), node.cos(), node.sin(), incl.cos());
    (
        (cw * co - sw * so * ci) * xp + (-sw * co - cw * so * ci) * yp,
        (cw * so + sw * co * ci) * xp + (-sw * so + cw * co * ci) * yp,
    )
}

/// The geocentric longitude of planet `index` (0 Mercury, 1 Venus, 2 Mars, 3 Jupiter,
/// 4 Saturn) on the J2000 ecliptic, degrees in [0, 360), at `t` centuries of TT.
#[must_use]
pub fn planet_longitude_j2000(index: usize, t: f64) -> f64 {
    // PLANETS is Mercury, Venus, Earth, Mars, Jupiter, Saturn: skip Earth.
    let row = if index < 2 { index } else { index + 1 };
    let (px, py) = heliocentric(&PLANETS[row], t);
    let (ex, ey) = heliocentric(&PLANETS[2], t);
    (py - ey).atan2(px - ex).to_degrees().rem_euclid(360.0)
}
