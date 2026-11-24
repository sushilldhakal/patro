//! `ephdata analytic-fit`: fits the built-in series to the kernel and writes the constants.
//!
//! For each of the Sun, the Moon and Rahu: a polynomial in time plus the trigonometric terms
//! (integer multiples of the lunar-solar arguments) that most reduce the residual, picked one
//! at a time and refitted together by least squares. The target is the kernel's own apparent
//! sidereal longitude, so ΔT, nutation, aberration and the ayanamsha are all inside the fit.

#![allow(
    clippy::many_single_char_names,
    clippy::similar_names,
    clippy::cast_possible_truncation,
    clippy::cast_precision_loss,
    reason = "a numeric fitting tool: matrices and Julian Days use the usual short names"
)]

use std::{error::Error, fmt::Write as _, path::Path};

use ephdata::{
    Body, Sky,
    analytic::{self, Term, arguments, centuries, phase, planet_longitude_j2000, series_at},
    deltat::{J2000, ut_to_tt},
};

struct Rng(u64);

impl Rng {
    fn next(&mut self) -> f64 {
        self.0 = self
            .0
            .wrapping_mul(6_364_136_223_846_793_005)
            .wrapping_add(1_442_695_040_888_963_407);
        (self.0 >> 11) as f64 / (1u64 << 53) as f64
    }
}

fn jd_of_year(year: f64) -> f64 {
    J2000 + (year - 2000.0) * 365.25
}

/// Instants to fit or test on: half near the present, the rest across the kernel.
fn samples(n: usize, lo: f64, hi: f64, seed: u64) -> Vec<f64> {
    let mut rng = Rng(seed);
    let (near_a, near_b) = (jd_of_year(1700.0).max(lo), jd_of_year(2300.0).min(hi));
    (0..n)
        .map(|i| {
            if i % 2 == 0 {
                near_a + rng.next() * (near_b - near_a)
            } else {
                lo + rng.next() * (hi - lo)
            }
        })
        .collect()
}

/// Every combination of the five arguments within the limits, one of each ± pair.
fn candidates(limits: [i8; 5], weight: i32) -> Vec<[i8; 5]> {
    let mut out = Vec::new();
    let range = |l: i8| -l..=l;
    for d in range(limits[0]) {
        for m in range(limits[1]) {
            for mp in range(limits[2]) {
                for f in range(limits[3]) {
                    for om in range(limits[4]) {
                        let arg = [d, m, mp, f, om];
                        let first = arg.iter().find(|k| **k != 0);
                        let w: i32 = arg.iter().map(|k| i32::from(k.abs())).sum();
                        if first.is_some_and(|k| *k > 0) && w <= weight {
                            out.push(arg);
                        }
                    }
                }
            }
        }
    }
    out
}

fn dot(a: &[f64], b: &[f64]) -> f64 {
    a.iter().zip(b).map(|(x, y)| x * y).sum()
}

/// Solves `g x = b` for a symmetric positive-definite `g` by Cholesky, with a small ridge.
fn solve(g: &[Vec<f64>], b: &[f64]) -> Vec<f64> {
    let k = b.len();
    let mut l = vec![vec![0.0; k]; k];
    for i in 0..k {
        for j in 0..=i {
            let mut sum = g[i][j];
            if i == j {
                sum += g[i][i] * 1e-12;
            }
            for p in 0..j {
                sum -= l[i][p] * l[j][p];
            }
            l[i][j] = if i == j {
                sum.max(1e-300).sqrt()
            } else {
                sum / l[j][j]
            };
        }
    }
    let mut y = vec![0.0; k];
    for i in 0..k {
        let mut s = b[i];
        for p in 0..i {
            s -= l[i][p] * y[p];
        }
        y[i] = s / l[i][i];
    }
    let mut x = vec![0.0; k];
    for i in (0..k).rev() {
        let mut s = y[i];
        for p in i + 1..k {
            s -= l[p][i] * x[p];
        }
        x[i] = s / l[i][i];
    }
    x
}

struct Fitted {
    poly: [f64; 6],
    terms: Vec<Term>,
}

/// Greedy forward selection of terms, refitting the polynomial and every chosen term each time.
fn fit_series(ts: &[f64], ys: &[f64], cands: &[[i8; 5]], max_terms: usize, min_amp: f64) -> Fitted {
    let n = ts.len();
    let angles: Vec<[f64; 5]> = ts.iter().map(|t| arguments(*t)).collect();
    let mut cols: Vec<Vec<f64>> = (0..6)
        .map(|k| ts.iter().map(|t| (t / 10.0).powi(k)).collect())
        .collect();
    let sin_cos: Vec<(Vec<f64>, Vec<f64>)> = cands
        .iter()
        .map(|c| {
            let ph: Vec<f64> = angles.iter().map(|a| phase(c, a)).collect();
            (
                ph.iter().map(|p| p.sin()).collect(),
                ph.iter().map(|p| p.cos()).collect(),
            )
        })
        .collect();
    let mut gram: Vec<Vec<f64>> = cols
        .iter()
        .map(|a| cols.iter().map(|b| dot(a, b)).collect())
        .collect();
    let mut rhs: Vec<f64> = cols.iter().map(|c| dot(c, ys)).collect();
    let mut chosen: Vec<usize> = Vec::new();
    let mut coef = solve(&gram, &rhs);
    loop {
        let residual: Vec<f64> = (0..n)
            .map(|i| ys[i] - cols.iter().zip(&coef).map(|(c, w)| c[i] * w).sum::<f64>())
            .collect();
        if chosen.len() >= max_terms {
            break;
        }
        let mut best = (usize::MAX, 0.0, 0.0);
        for (c, (s, co)) in sin_cos.iter().enumerate() {
            if chosen.contains(&c) {
                continue;
            }
            let (ss, cc) = (dot(s, s).max(1e-12), dot(co, co).max(1e-12));
            let (rs, rc) = (dot(s, &residual), dot(co, &residual));
            let score = rs * rs / ss + rc * rc / cc;
            let amp = ((rs / ss).powi(2) + (rc / cc).powi(2)).sqrt();
            if score > best.1 {
                best = (c, score, amp);
            }
        }
        if best.0 == usize::MAX || best.2 < min_amp {
            break;
        }
        chosen.push(best.0);
        for col in [&sin_cos[best.0].0, &sin_cos[best.0].1] {
            let row: Vec<f64> = cols.iter().map(|c| dot(c, col)).collect();
            for (g, v) in gram.iter_mut().zip(&row) {
                g.push(*v);
            }
            let mut full = row;
            full.push(dot(col, col));
            gram.push(full);
            rhs.push(dot(col, ys));
            cols.push(col.clone());
        }
        coef = solve(&gram, &rhs);
    }
    let mut poly = [0.0; 6];
    poly.copy_from_slice(&coef[..6]);
    let terms = chosen
        .iter()
        .enumerate()
        .map(|(j, c)| Term {
            arg: cands[*c],
            sin: coef[6 + 2 * j],
            cos: coef[7 + 2 * j],
        })
        .collect();
    Fitted { poly, terms }
}

fn arcsec(deg: f64) -> f64 {
    ((deg + 180.0).rem_euclid(360.0) - 180.0).abs() * 3600.0
}

fn rust_series(name: &str, f: &Fitted) -> String {
    let mut s = format!(
        "/// {name}.\npub const {}: Series = Series {{\n    poly: {:?},\n    terms: &[\n",
        name.to_uppercase().split(' ').next().unwrap_or(""),
        f.poly
    );
    for t in &f.terms {
        let _ = writeln!(
            s,
            "        Term {{ arg: {:?}, sin: {:?}, cos: {:?} }},",
            t.arg, t.sin, t.cos
        );
    }
    s.push_str("    ],\n};\n");
    s
}

fn ts_series(name: &str, f: &Fitted) -> String {
    let mut s = format!(
        "export const {name}_SERIES: AnalyticSeries = {{\n  poly: {:?},\n  terms: [\n",
        f.poly
    );
    for t in &f.terms {
        let _ = writeln!(
            s,
            "    [{}, {}, {}, {}, {}, {:?}, {:?}],",
            t.arg[0], t.arg[1], t.arg[2], t.arg[3], t.arg[4], t.sin, t.cos
        );
    }
    s.push_str("  ],\n};\n");
    s
}

/// Fits the three series and the ayanamsha polynomial, reports the error per two centuries,
/// and writes the Rust and TypeScript constants.
pub(crate) fn run(
    sky: &Sky,
    out_rs: &Path,
    out_ts: &Path,
    years: Option<(f64, f64)>,
) -> Result<(), Box<dyn Error>> {
    let (lo, hi) = sky.coverage_jd_ut();
    let (mut lo, mut hi) = (lo + 5.0, hi - 5.0);
    if let Some((from, to)) = years {
        // Fit and test only the span the app promises, so the error table describes that span.
        lo = lo.max(jd_of_year(from));
        hi = hi.min(jd_of_year(to));
    }
    let fit_at = samples(4500, lo, hi, 7);
    let ts: Vec<f64> = fit_at.iter().map(|j| centuries(ut_to_tt(*j))).collect();
    let unwrap = |lon: f64, pred: f64| lon + 360.0 * ((pred - lon) / 360.0).round();
    let aya: Vec<f64> = fit_at.iter().map(|j| sky.ayanamsha(*j)).collect();
    let mut sun_y = Vec::new();
    let mut moon_y = Vec::new();
    let mut node_y = Vec::new();
    for (i, jd) in fit_at.iter().enumerate() {
        let t = ts[i];
        let (s, m) = sky.sun_moon(*jd)?;
        sun_y.push(unwrap(s, 280.466_46 + 36_000.769_83 * t - aya[i]));
        moon_y.push(unwrap(m, 218.316_447_7 + 481_267.881_234_21 * t - aya[i]));
        node_y.push(unwrap(
            sky.true_node(*jd)?,
            125.044_547_9 - 1_934.136_289_1 * t - aya[i],
        ));
    }
    eprintln!("fitting the Moon...");
    let moon = fit_series(&ts, &moon_y, &candidates([4, 2, 4, 4, 1], 7), 90, 0.000_02);
    eprintln!("fitting the Sun...");
    let sun = fit_series(&ts, &sun_y, &candidates([3, 3, 2, 2, 1], 6), 45, 0.000_01);
    eprintln!("fitting Rahu...");
    let rahu = fit_series(&ts, &node_y, &candidates([4, 2, 4, 4, 1], 6), 45, 0.000_05);
    let aya_fit = fit_series(&ts, &aya, &[], 0, 1.0);
    let ayan0 = sky.ayanamsha(J2000);
    // Each planet's orbit elements are Standish's, fitted to 1800-2050, so over thousands of years
    // the slow mean motions drift (Saturn by 31 degrees at 3000 BCE). A smooth polynomial in time,
    // fitted to the kernel, takes that out; it is only valid over the span being fitted.
    let planet_bodies = [
        Body::Mercury,
        Body::Venus,
        Body::Mars,
        Body::Jupiter,
        Body::Saturn,
    ];
    let mut planet_corr: Vec<Fitted> = Vec::new();
    for (k, body) in planet_bodies.iter().enumerate() {
        let mut residual = Vec::new();
        for (i, jd) in fit_at.iter().enumerate() {
            let model = planet_longitude_j2000(k, ts[i]) - ayan0;
            let truth = sky.sidereal_longitude(*body, *jd)?;
            residual.push(((truth - model + 180.0).rem_euclid(360.0)) - 180.0);
        }
        planet_corr.push(fit_series(&ts, &residual, &[], 0, 1.0));
    }

    // The error, per 200 years, on fresh instants.
    let test = samples(9000, lo, hi, 99);
    let mut buckets: std::collections::BTreeMap<i64, [Vec<f64>; 11]> =
        std::collections::BTreeMap::new();
    for jd in &test {
        let t = centuries(ut_to_tt(*jd));
        let (s, m) = sky.sun_moon(*jd)?;
        let bucket = ((2000.0 + (jd - J2000) / 365.25) / 200.0).floor() as i64 * 200;
        let e = buckets.entry(bucket).or_default();
        e[0].push(arcsec(series_at(&sun.poly, &sun.terms, t) - s));
        e[1].push(arcsec(series_at(&moon.poly, &moon.terms, t) - m));
        e[2].push(arcsec(
            series_at(&rahu.poly, &rahu.terms, t) - sky.true_node(*jd)?,
        ));
        e[3].push(arcsec(
            series_at(&aya_fit.poly, &[], t) - sky.ayanamsha(*jd),
        ));
        let planets = [
            Body::Mercury,
            Body::Venus,
            Body::Mars,
            Body::Jupiter,
            Body::Saturn,
        ];
        let per_planet: Vec<f64> = planets
            .iter()
            .enumerate()
            .map(|(k, b)| {
                let truth = sky.sidereal_longitude(*b, *jd).unwrap_or(0.0);
                arcsec(
                    planet_longitude_j2000(k, t) - ayan0 + series_at(&planet_corr[k].poly, &[], t)
                        - truth,
                ) / 3600.0
            })
            .collect();
        for (k, v) in per_planet.iter().enumerate() {
            e[6 + k].push(*v);
        }
        e[4].push(per_planet.iter().copied().fold(0.0_f64, f64::max));
        e[5].push(arcsec(series_at(&moon.poly, &moon.terms, t) - m) / 3600.0 / 12.19 * 86_400.0);
    }
    println!(
        "{:>7} {:>9} {:>9} | {:>9} {:>9} | {:>8} | {:>7} | {:>9}",
        "from",
        "sun rms\"",
        "sun max\"",
        "moon rms\"",
        "moon max\"",
        "rahu max\"",
        "aya max\"",
        "planet °"
    );
    for (b, v) in &buckets {
        let rms = |x: &[f64]| (x.iter().map(|e| e * e).sum::<f64>() / x.len().max(1) as f64).sqrt();
        let max = |x: &[f64]| x.iter().copied().fold(0.0_f64, f64::max);
        println!(
            "{b:>7} {:>9.1} {:>9.1} | {:>9.1} {:>9.1} | {:>8.1} | {:>7.2} | {:>9.2}  (a tithi end off by up to {:.0} s)",
            rms(&v[0]),
            max(&v[0]),
            rms(&v[1]),
            max(&v[1]),
            max(&v[2]),
            max(&v[3]),
            max(&v[4]),
            max(&v[5])
        );
        println!(
            "          planets, worst degrees: Mercury {:.2} Venus {:.2} Mars {:.2} Jupiter {:.2} Saturn {:.2}",
            max(&v[6]),
            max(&v[7]),
            max(&v[8]),
            max(&v[9]),
            max(&v[10])
        );
    }

    let mut rs = String::from(
        "//! Generated by `ephdata analytic-fit`: do not edit.\n\n#![allow(clippy::unreadable_literal, reason = \"generated constants keep every digit the fit produced\")]\n\nuse crate::analytic::{Series, Term};\n\n",
    );
    let _ = writeln!(
        rs,
        "/// The Lahiri ayanamsha at J2000, degrees.\npub const AYANAMSHA_J2000: f64 = {ayan0:?};\n/// The ayanamsha as a polynomial in `u = T / 10`, degrees.\npub const AYANAMSHA_POLY: [f64; 6] = {:?};",
        aya_fit.poly
    );
    rs.push_str("/// Per-planet correction polynomials (Mercury, Venus, Mars, Jupiter, Saturn) in `u = T / 10`, degrees,\n/// added to the orbit-element longitude minus [`AYANAMSHA_J2000`].\npub const PLANET_CORRECTION: [[f64; 6]; 5] = [\n");
    for c in &planet_corr {
        let _ = writeln!(rs, "    {:?},", c.poly);
    }
    rs.push_str("];\n");
    rs.push_str(&rust_series("Sun", &sun));
    rs.push_str(&rust_series("Moon", &moon));
    rs.push_str(&rust_series("Rahu", &rahu));
    std::fs::write(out_rs, rs)?;

    let mut ts_out = String::from(
        "// Generated by `ephdata analytic-fit` (apps/rust/crates/ephdata): do not edit.\n// A term is [D, M, M', F, Omega, sin amplitude, cos amplitude], amplitudes in degrees.\n\nexport interface AnalyticSeries {\n  /** Coefficients of u^0..u^5, u = T / 10, degrees. */\n  poly: number[];\n  terms: number[][];\n}\n\n",
    );
    let _ = writeln!(
        ts_out,
        "export const AYANAMSHA_J2000 = {ayan0:?};\nexport const AYANAMSHA_POLY = {:?};",
        aya_fit.poly
    );
    ts_out.push_str("export const PLANET_CORRECTION: number[][] = [\n");
    for c in &planet_corr {
        let _ = writeln!(ts_out, "  {:?},", c.poly);
    }
    ts_out.push_str("];\n");
    ts_out.push_str(&ts_series("SUN", &sun));
    ts_out.push_str(&ts_series("MOON", &moon));
    ts_out.push_str(&ts_series("RAHU", &rahu));
    std::fs::write(out_ts, ts_out)?;
    let _ = analytic::PLANETS.len();
    Ok(())
}
