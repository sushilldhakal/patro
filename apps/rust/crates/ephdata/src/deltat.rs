//! ΔT = TT − UT1, and UT → TDB, our own: the Espenak–Meeus polynomials (NASA, 2006).
//!
//! Before 1955 and after the last measured year ΔT is a fit or a forecast, so a Moon
//! longitude carries that uncertainty (0.5″ per ~1 s of ΔT). It is the one input the
//! JPL data cannot supply.

/// J2000 as a Julian Day.
pub const J2000: f64 = 2_451_545.0;

fn poly(t: f64, c: &[f64]) -> f64 {
    c.iter().rev().fold(0.0, |acc, k| acc * t + k)
}

/// ΔT in seconds at a decimal year.
#[must_use]
pub fn delta_t_seconds(year: f64) -> f64 {
    let parabola = |y: f64| {
        let u = (y - 1820.0) / 100.0;
        -20.0 + 32.0 * u * u
    };
    match year {
        y if y < -500.0 => parabola(y),
        y if y < 500.0 => poly(
            y / 100.0,
            &[
                10583.6,
                -1014.41,
                33.78311,
                -5.952_053,
                -0.179_845_2,
                0.022_174_192,
                0.009_031_652_1,
            ],
        ),
        y if y < 1600.0 => poly(
            (y - 1000.0) / 100.0,
            &[
                1574.2,
                -556.01,
                71.234_72,
                0.319_781,
                -0.850_346_3,
                -0.005_050_998,
                0.008_357_207_3,
            ],
        ),
        y if y < 1700.0 => poly(y - 1600.0, &[120.0, -0.9808, -0.01532, 1.0 / 7129.0]),
        y if y < 1800.0 => poly(
            y - 1700.0,
            &[8.83, 0.1603, -0.005_928_5, 0.000_133_36, -1.0 / 1_174_000.0],
        ),
        y if y < 1860.0 => poly(
            y - 1800.0,
            &[
                13.72,
                -0.332_447,
                0.006_861_2,
                0.004_111_6,
                -0.000_374_36,
                0.000_012_127_2,
                -0.000_000_169_9,
                0.000_000_000_875,
            ],
        ),
        y if y < 1900.0 => poly(
            y - 1860.0,
            &[
                7.62,
                0.5737,
                -0.251_754,
                0.016_806_68,
                -0.000_447_362_4,
                1.0 / 233_174.0,
            ],
        ),
        y if y < 1920.0 => poly(
            y - 1900.0,
            &[-2.79, 1.494_119, -0.059_893_9, 0.006_196_6, -0.000_197],
        ),
        y if y < 1941.0 => poly(y - 1920.0, &[21.20, 0.844_93, -0.0761, 0.002_093_6]),
        y if y < 1961.0 => poly(y - 1950.0, &[29.07, 0.407, -1.0 / 233.0, 1.0 / 2547.0]),
        y if y < 1986.0 => poly(y - 1975.0, &[45.45, 1.067, -1.0 / 260.0, -1.0 / 718.0]),
        y if y < 2005.0 => poly(
            y - 2000.0,
            &[
                63.86,
                0.3345,
                -0.060_374,
                0.001_727_5,
                0.000_651_814,
                0.000_023_735_99,
            ],
        ),
        y if y < 2050.0 => poly(y - 2000.0, &[62.92, 0.322_17, 0.005_589]),
        y if y < 2150.0 => parabola(y) - 0.5628 * (2150.0 - y),
        y => parabola(y),
    }
}

/// The decimal year of a Julian Day.
#[must_use]
pub fn year_of(jd: f64) -> f64 {
    2000.0 + (jd - J2000) / 365.25
}

/// Julian Day in TT for a Julian Day in UT.
#[must_use]
pub fn ut_to_tt(jd_ut: f64) -> f64 {
    jd_ut + delta_t_seconds(year_of(jd_ut)) / 86_400.0
}

/// Seconds past J2000 in TDB (the ephemeris argument) for a Julian Day in TT.
#[must_use]
pub fn tt_to_et(jd_tt: f64) -> f64 {
    let g = (357.53 + 0.985_600_3 * (jd_tt - J2000)).to_radians();
    (jd_tt - J2000) * 86_400.0 + 0.001_657 * g.sin()
}

/// Seconds past J2000 in TDB for a Julian Day in UT.
#[must_use]
pub fn ut_to_et(jd_ut: f64) -> f64 {
    tt_to_et(ut_to_tt(jd_ut))
}

/// Julian Day in UT for TDB seconds past J2000 (the inverse, to a microsecond).
#[must_use]
pub fn et_to_ut(et: f64) -> f64 {
    let mut jd_ut = J2000 + et / 86_400.0;
    for _ in 0..4 {
        jd_ut -= (ut_to_et(jd_ut) - et) / 86_400.0;
    }
    jd_ut
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn delta_t_matches_the_known_values() {
        assert!((delta_t_seconds(2000.0) - 63.8).abs() < 0.2);
        assert!((delta_t_seconds(1900.0) + 2.8).abs() < 0.2);
        assert!((delta_t_seconds(1700.0) - 8.8).abs() < 0.2);
    }

    #[test]
    fn the_time_scales_round_trip() {
        for jd in [2_305_447.5, 2_451_545.25, 2_460_000.123_456, 2_600_000.75] {
            assert!((et_to_ut(ut_to_et(jd)) - jd).abs() < 1e-9, "{jd}");
        }
    }
}
