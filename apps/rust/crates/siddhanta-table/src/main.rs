//! `siddhanta-table`: build, check and fixture-export a STAB position table.
//!
//! ```text
//! siddhanta-table build <out> <first_year> <last_year> <step_hours>
//! siddhanta-table check <table> [random_samples]
//! siddhanta-table fixtures <table> <out.json> [count]
//! siddhanta-table cheb-measure <first_year> [segments]
//! siddhanta-table cheb-build <out> <first_year> <last_year> [segment_days] [degrees]
//! siddhanta-table cheb-check <table> [random_samples]
//! siddhanta-table drik-measure <kernel.veph> [segments] [segment_days]
//! siddhanta-table drik-build <kernel.veph> <out> <first_year> <last_year> [segment_days] [degrees]
//! siddhanta-table drik-check <kernel.veph> <table> [random_samples]
//! siddhanta-table drik-fixtures <kernel.veph> <table> <out.json> [count]
//! ```
//!
//! `build` samples the Surya Siddhanta from 1 January of `first_year` to 1
//! January of `last_year + 1` (00:00 UT), so the file covers the whole of
//! `last_year`. `check` interpolates random instants inside the table and
//! reports the worst error against the direct formulas, in arcseconds.
//! `fixtures` writes JSON expectations for the TypeScript client test: direct
//! positions and the panchanga derivations the client must reproduce from the
//! table alone.
//!
//! The `cheb-*` commands are the fallback file: the same motion as
//! Chebyshev coefficients (see `cheb.rs`), for the client to carry with it.
//! `cheb-measure [segments] [segment_days]` — segments spread across
//! 1900–2100, so a degree that only holds in one year does not pass.
//! degrees (comma-separated, Sun first — the measured defaults are in
//! `CHEB_DEGREES`); `cheb-check` verifies it like `check` does.
//!
//! The `drik-*` commands are the same file for the other system: the
//! coefficients are fitted to our own ephemeris (`Sky::sidereal_longitude`
//! and `Sky::true_node` — the exact functions the server's Drik path
//! uses), the header carries the ayanamsha and mean Sun fitted from the
//! kernel as straight lines, and the file is `CHEB0002`. They run where
//! the Drik kernel lives; this workspace has no kernel data, so no Drik
//! file is built here — only the tool and its synthetic-kernel test.

#![expect(
    clippy::cast_possible_truncation,
    clippy::cast_sign_loss,
    clippy::cast_precision_loss,
    reason = "the table format is u24/f32 by design (longitudes wrap at 360, speeds are small), and the sample counts are bounded by the year range and step; every cast's range is checked by the tests"
)]

use std::{fmt::Write as _, path::PathBuf, process::ExitCode, sync::Arc};

use astronomy::{
    System,
    drik::DrikSky,
    surya_siddhanta::{
        Body, MAHAYUGA_DAYS, MeanBody, ayanamsha, mean_longitude, true_longitude_and_speed,
    },
};
use ephdata::{Body as SkyBody, Kernel, Sky, kernel::WANTED};
use siddhanta_table::{
    Table, TableError,
    cheb::{self, ChebTable},
    serialise,
};
use timescale::{Calendar, julday};

/// Measured Chebyshev degrees per body (Sun, Moon, Mars, Mercury, Jupiter,
/// Venus, Saturn, Rahu) at 32-day segments — `cheb-measure` over 100 segments
/// spread across 1900–2100 said [4, 17, 15, 28, 13, 19, 8, 4], and the
/// full-range check of that file then failed only the Moon (13.6" against a
/// 10.8" budget): the Moon's longitude carries the text's own ~14 s steps
/// (up to 9" jumps), and a degree-17 polynomial leaves ~4" of fit error on
/// top of them. Degree 22 brings the Moon to 8.95" over 5000 random instants
/// across the whole range. Mercury needs 28 in its worst segments: near an
/// inferior conjunction its geocentric longitude swings and reverses inside
/// one 32-day window. `cheb-check` re-verifies these over the whole file;
/// raise them if it ever fails.
const CHEB_DEGREES: [usize; 8] = [4, 22, 15, 28, 13, 19, 8, 4];

const SYSTEM: System = System::SuryaSiddhanta;
/// Kathmandu, the location the fixtures' lagna is computed for.
const FIXTURE_LAT: f64 = 27.7172;
const FIXTURE_LON: f64 = 85.3240;

fn wrap360(x: f64) -> f64 {
    x.rem_euclid(360.0)
}

/// The instantaneous derivative of a body's sidereal longitude, °/day.
///
/// NOT the speed the API shows: the text defines speed as the ±0.5-day
/// central difference, and that differs from the true derivative by more
/// than the interpolation budget for the Moon (its higher derivatives are
/// large). Hermite needs the true derivative; the displayed speed is the
/// central difference of the table itself, at ±0.5 days, which the client
/// computes from interpolated longitudes.
fn true_derivative(body: Body, jd: f64) -> f64 {
    // A central difference, but NOT a tiny one: the text's longitudes are
    // computed from revolution counts in the tens of millions, so an f64
    // evaluation carries ~0.04 arcsec of noise, and differencing at 0.001 d
    // amplifies that into a useless slope (measured: 12.16 vs 12.46 °/day
    // for the Moon). At 0.05 d the noise is ~1e-4 °/day and the truncation
    // (f'''·δ²/6) is smaller still, which keeps the Hermite error far under
    // the 1-arcsecond budget.
    let delta = 0.05; // ~72 minutes
    let (before, _) = astronomy::surya_siddhanta::true_position(body, jd - delta);
    let (after, _) = astronomy::surya_siddhanta::true_position(body, jd + delta);
    let mut diff = after - before;
    diff -= 360.0 * (diff / 360.0).round();
    diff / (2.0 * delta)
}

fn sample_at(jd: f64) -> Vec<u8> {
    // One longitude per body (u32 counts of 1e-6°), one speed (the Moon's).
    // Every other body's speed is the central difference of its own
    // neighbouring samples, read back by the reader — so only the Moon pays
    // the extra derivative here, and the build runs a third faster.
    let mut bytes = Vec::with_capacity(siddhanta_table::SAMPLE_BYTES);
    for body in Body::ALL {
        let (lon, _) = true_longitude_and_speed(body, jd);
        let counts = ((wrap360(lon) * siddhanta_table::LON_COUNTS_PER_DEGREE).round() as u32)
            % siddhanta_table::LON_COUNTS;
        bytes.extend_from_slice(&counts.to_le_bytes());
    }
    // The Moon's speed goes after all eight longitudes, not after the Moon's.
    bytes.extend_from_slice(&(true_derivative(Body::Moon, jd) as f32).to_le_bytes());
    bytes
}

/// The mean Sun's exact rate, °/day: 360° × the Sun's revolutions per
/// mahayuga, over the days in a mahayuga. The *nirayana* mean Sun is exactly
/// linear in JD, so the header stores one anchor value plus this rate
/// instead of a value per sample. (The sayana mean Sun is not linear — it
/// carries the ayanamsha's own ~50"/year drift — so the reader adds the
/// ayanamsha to the nirayana value.)
fn mean_sun_rate() -> f64 {
    360.0 * MeanBody::Sun.revolutions_per_mahayuga() as f64 / MAHAYUGA_DAYS as f64
}

fn cmd_build(out: &str, first_year: i32, last_year: i32, step_hours: f64) -> Result<(), String> {
    if step_hours <= 0.0 || step_hours > 24.0 {
        return Err("step_hours must be between 0 and 24".to_string());
    }
    if last_year < first_year {
        return Err("last_year is before first_year".to_string());
    }
    let first_jd = julday(first_year, 1, 1, 0.0, Calendar::Gregorian);
    let last_jd = julday(last_year + 1, 1, 1, 0.0, Calendar::Gregorian);
    let step_days = step_hours / 24.0;
    let count = ((last_jd - first_jd) / step_days).round() as usize + 1;
    let mut samples = Vec::with_capacity(count * siddhanta_table::SAMPLE_BYTES);
    for i in 0..count {
        samples.extend_from_slice(&sample_at(first_jd + i as f64 * step_days));
    }
    let table = Table {
        first_jd,
        step_days,
        // Nirayana: the anchor is the exactly-linear quantity. The reader
        // adds the ayanamsha for the sayana value.
        mean_sun0: wrap360(mean_longitude(MeanBody::Sun, first_jd)),
        mean_sun_rate: mean_sun_rate(),
        samples,
    };
    let bytes = serialise(&table);
    std::fs::write(out, &bytes).map_err(|e| format!("writing {out}: {e}"))?;
    println!(
        "wrote {out}: {} samples, {} bytes, {:.1} days apart, JD {:.1}–{:.1}",
        count,
        bytes.len(),
        step_days,
        first_jd,
        table.last_jd()
    );
    Ok(())
}

/// Deterministic pseudo-random instants (xorshift, fixed seed) inside a range.
fn random_jds(from: f64, to: f64, count: usize) -> Vec<f64> {
    let mut state: u64 = 0x9E37_79B9_7F4A_7C15;
    let mut out = Vec::with_capacity(count);
    for _ in 0..count {
        state ^= state << 13;
        state ^= state >> 7;
        state ^= state << 17;
        let u = (state >> 11) as f64 / (1u64 << 53) as f64;
        out.push(from + u * (to - from));
    }
    out
}

fn cmd_check(path: &str, count: usize) -> Result<(), String> {
    let table = siddhanta_table::open(&PathBuf::from(path))
        .map_err(|e: TableError| format!("reading {path}: {e}"))?;
    // The budget is NOT zero: the text's longitudes are a step function in
    // time. `revolution_fraction` adds the ahargana to the days from creation
    // to Kali (~7.14e11), and an f64 there moves in steps of ~1.6e-4 days
    // (~14 s), so a longitude jumps by up to speed × 1.6e-4 days between
    // adjacent steps — ~7" for the Moon. The server computes the same steps
    // (its goldens compare bit-exactly because Python does the same), so the
    // table can only match the function to within its own step, never better.
    // A finer table step cannot help: the steps are in the function, not the
    // table. The budget is that step, with margin, plus 0.5" for the
    // interpolation itself and the u32 longitude step (0.0036").
    let mut worst = [0.0f64; 8];
    let mut worst_jd = [0.0f64; 8];
    let mut fastest = [0.0f64; 8];
    for jd in random_jds(table.first_jd, table.last_jd(), count) {
        let Some(got) = table.positions_at(jd) else {
            continue;
        };
        for (i, body) in Body::ALL.iter().enumerate() {
            let (lon, speed) = true_longitude_and_speed(*body, jd);
            fastest[i] = fastest[i].max(speed.abs());
            let mut err = (wrap360(got.longitude[i] - lon)).abs();
            if err > 180.0 {
                err = 360.0 - err;
            }
            if err > worst[i] {
                worst[i] = err;
                worst_jd[i] = jd;
            }
        }
    }
    let mut failures = Vec::new();
    for (i, body) in Body::ALL.iter().enumerate() {
        let budget_arcsec = fastest[i] * 2.0e-4 * 3600.0 + 0.5;
        let arcsec = worst[i] * 3600.0;
        println!(
            "{:8} worst {:9.4} arcsec at JD {:.4} (budget {:6.2})",
            body.name(),
            arcsec,
            worst_jd[i],
            budget_arcsec
        );
        if arcsec > budget_arcsec {
            failures.push(format!(
                "{} error {arcsec:.4} arcsec exceeds its {budget_arcsec:.2} budget",
                body.name()
            ));
        }
    }
    if failures.is_empty() {
        println!("within budget over {count} random instants");
        Ok(())
    } else {
        Err(failures.join("; "))
    }
}

fn cmd_fixtures(path: &str, out: &str, count: usize) -> Result<(), String> {
    let table = siddhanta_table::open(&PathBuf::from(path))
        .map_err(|e: TableError| format!("reading {path}: {e}"))?;
    let mut rows = String::from("[\n");
    let jds = random_jds(table.first_jd, table.last_jd(), count);
    for (k, jd) in jds.iter().enumerate() {
        // Direct values, NOT the table's interpolation: the TypeScript test
        // must prove its own interpolation reproduces the formulas, so the
        // fixture is the authority, not a copy of the table.
        let mut longitude = [0.0f64; 8];
        let mut speed = [0.0f64; 8];
        for (i, body) in Body::ALL.iter().enumerate() {
            (longitude[i], speed[i]) = true_longitude_and_speed(*body, *jd);
        }
        let aya = ayanamsha(*jd);
        let mean_sun = wrap360(mean_longitude(MeanBody::Sun, *jd) + aya);
        let tithi = panchanga::tithi(SYSTEM, *jd);
        let nak = panchanga::nakshatra(SYSTEM, *jd);
        let yoga = panchanga::yoga(SYSTEM, *jd);
        let karana = panchanga::karana(SYSTEM, *jd);
        let moon = longitude[1];
        let sun = longitude[0];
        let rashi = |lon: f64| (lon.div_euclid(30.0) as u32) + 1;
        let fmt_list = |xs: &[f64]| {
            xs.iter()
                .map(|x| format!("{x:.6}"))
                .collect::<Vec<_>>()
                .join(", ")
        };
        let _ = write!(
            rows,
            "  {{\"jd\": {jd:.6}, \"longitude\": [{}], \"speed\": [{}], \"ayanamsha\": {:.6}, \"mean_sun_sayana\": {:.6}, \"tithi\": {}, \"tithi_progress\": {:.6}, \"nakshatra\": {}, \"pada\": {}, \"nakshatra_progress\": {:.6}, \"yoga\": {}, \"yoga_progress\": {:.6}, \"karana\": {}, \"karana_progress\": {:.6}, \"moon_rashi\": {}, \"sun_rashi\": {}, \"lagna\": {:.6}}}",
            fmt_list(&longitude),
            fmt_list(&speed),
            aya,
            mean_sun,
            tithi.number,
            tithi.progress,
            nak.number,
            nak.pada,
            nak.progress,
            yoga.number,
            yoga.progress,
            karana.number,
            karana.progress,
            rashi(moon),
            rashi(sun),
            astronomy::surya_siddhanta::ascendant(*jd, FIXTURE_LAT, FIXTURE_LON),
        );
        rows.push_str(if k + 1 == count { "\n" } else { ",\n" });
    }
    rows.push_str("]\n");
    std::fs::write(out, rows).map_err(|e| format!("writing {out}: {e}"))?;
    println!("wrote {out}: {count} fixtures from {path}");
    Ok(())
}

fn cmd_sun(path: &str, out: &str, days: usize) -> Result<(), String> {
    // Sunrise/sunset for consecutive days from the table's first sample,
    // Kathmandu, from the same solver the server uses (centre, geometric
    // horizon). The TypeScript test compares its own solver against these.
    let table = siddhanta_table::open(&PathBuf::from(path))
        .map_err(|e: TableError| format!("reading {path}: {e}"))?;
    let mut rows = String::from("[\n");
    for k in 0..days {
        let start = table.first_jd + k as f64;
        let rise = SYSTEM.next_rise_or_set(
            Body::Sun,
            start,
            FIXTURE_LAT,
            FIXTURE_LON,
            astronomy::surya_siddhanta::Crossing::Rise,
        );
        let set = SYSTEM.next_rise_or_set(
            Body::Sun,
            start,
            FIXTURE_LAT,
            FIXTURE_LON,
            astronomy::surya_siddhanta::Crossing::Set,
        );
        let (Some(rise), Some(set)) = (rise, set) else {
            return Err(format!("no sunrise/sunset on day {k} from JD {start}"));
        };
        let _ = write!(
            rows,
            "  {{\"start_jd\": {start:.6}, \"sunrise_jd\": {rise:.6}, \"sunset_jd\": {set:.6}}}",
        );
        rows.push_str(if k + 1 == days { "\n" } else { ",\n" });
    }
    rows.push_str("]\n");
    std::fs::write(out, rows).map_err(|e| format!("writing {out}: {e}"))?;
    println!("wrote {out}: {days} days of sunrise/sunset from {path}");
    Ok(())
}

fn wrap180(x: f64) -> f64 {
    (x + 180.0).rem_euclid(360.0) - 180.0
}

/// Unwrapped longitudes of `body` at the Chebyshev nodes of `[a, b]`, in
/// node order (time descending). Adjacent nodes are at most a few days
/// apart, so unwrapping against the previous node is unambiguous.
fn segment_values(body: Body, a: f64, b: f64, degree: usize) -> Vec<f64> {
    let xs = cheb::nodes(degree + 1);
    let mut values = Vec::with_capacity(degree + 1);
    let mut prev: Option<f64> = None;
    for x in &xs {
        let jd = f64::midpoint(a, b) + (b - a) / 2.0 * x;
        let (lon, _) = true_longitude_and_speed(body, jd);
        let lon = match prev {
            None => lon,
            Some(p) => p + wrap180(lon - p),
        };
        prev = Some(lon);
        values.push(lon);
    }
    values
}

/// Worst error, in degrees, of a degree-`degree` Chebyshev fit of `body`
/// over `[a, b]`, against the direct formulas at every quarter day — plus
/// the fastest speed seen, for the budget.
fn cheb_fit_error(body: Body, a: f64, b: f64, degree: usize) -> (f64, f64) {
    let values = segment_values(body, a, b, degree);
    let coeffs: Vec<f32> = cheb::fit_coefficients(&values, degree)
        .iter()
        .map(|c| *c as f32)
        .collect();
    let mut worst: f64 = 0.0;
    let mut fastest: f64 = 0.0;
    let steps = ((b - a) / 0.25).round() as usize;
    for i in 0..=steps {
        let jd = a + i as f64 * 0.25;
        let x = 2.0 * (jd - a) / (b - a) - 1.0;
        let got = cheb::clenshaw(&coeffs, x);
        let (lon, speed) = true_longitude_and_speed(body, jd);
        fastest = fastest.max(speed.abs());
        worst = worst.max(wrap180(got - lon).abs());
    }
    (worst, fastest)
}

fn cmd_cheb_measure(count: usize, segment_days: f64) -> Result<(), String> {
    // Segments spread across the whole 1900–2100 range, not consecutive ones
    // from a single year: three segments from the year 2000 said Venus
    // needed degree 4, and the full-range check then measured 121" for it
    // near an inferior conjunction. A degree that only holds in one year
    // is not a degree.
    let range_start = julday(1900, 1, 1, 0.0, Calendar::Gregorian);
    let range_end = julday(2100, 1, 1, 0.0, Calendar::Gregorian);
    let mut degrees = [0usize; 8];
    for (i, body) in Body::ALL.iter().enumerate() {
        let mut need = 0;
        for s in 0..count {
            let a = range_start + (range_end - range_start) * s as f64 / count as f64;
            let b = a + segment_days;
            for degree in 4..=64 {
                let (worst, fastest) = cheb_fit_error(*body, a, b, degree);
                let budget = fastest * 2.0e-4 + 0.5 / 3600.0;
                if worst <= budget {
                    need = need.max(degree);
                    if degree > 4 {
                        println!(
                            "{:8} segment {} (JD {:.0}) degree {:2}: worst {:7.4} arcsec (budget {:6.2})",
                            body.name(),
                            s,
                            a,
                            degree,
                            worst * 3600.0,
                            budget * 3600.0
                        );
                    }
                    break;
                }
                if degree == 64 {
                    return Err(format!(
                        "{} needs more than degree 64 on segment {} (worst {:.2} arcsec)",
                        body.name(),
                        s,
                        worst * 3600.0
                    ));
                }
            }
        }
        degrees[i] = need;
    }
    let per_segment = degrees.iter().map(|d| d + 1).sum::<usize>() * 4;
    let segments = ((range_end - range_start) / segment_days).ceil() as usize;
    println!("measured degrees (Sun first): {degrees:?}");
    println!(
        "{segment_days:.0}-day segments: {per_segment} bytes/segment, ~{} bytes for 1900–2100",
        segments * per_segment
    );
    Ok(())
}

fn cmd_cheb_build(
    out: &str,
    first_year: i32,
    last_year: i32,
    segment_days: f64,
    degrees: [usize; 8],
) -> Result<(), String> {
    if segment_days <= 0.0 || segment_days > 64.0 {
        return Err("segment_days must be between 0 and 64".to_string());
    }
    if last_year < first_year {
        return Err("last_year is before first_year".to_string());
    }
    let first_jd = julday(first_year, 1, 1, 0.0, Calendar::Gregorian);
    let last_jd = julday(last_year + 1, 1, 1, 0.0, Calendar::Gregorian);
    let count = ((last_jd - first_jd) / segment_days).ceil() as usize;
    let mut coefficients = Vec::with_capacity(count * cheb::segment_bytes(&degrees) / 4);
    for s in 0..count {
        let a = first_jd + s as f64 * segment_days;
        let b = a + segment_days;
        for (i, body) in Body::ALL.iter().enumerate() {
            let values = segment_values(*body, a, b, degrees[i]);
            coefficients.extend(
                cheb::fit_coefficients(&values, degrees[i])
                    .iter()
                    .map(|c| *c as f32),
            );
        }
    }
    let table = ChebTable {
        first_jd,
        segment_days,
        degrees,
        mean_sun0: wrap360(mean_longitude(MeanBody::Sun, first_jd)),
        mean_sun_rate: mean_sun_rate(),
        // Version 1: the reader uses the text's ayanamsha formula.
        ayanamsha: None,
        coefficients,
    };
    let bytes = cheb::serialise(&table);
    std::fs::write(out, &bytes).map_err(|e| format!("writing {out}: {e}"))?;
    println!(
        "wrote {out}: {} segments, {} bytes, {:.0}-day segments, JD {:.1}–{:.1}",
        count,
        bytes.len(),
        segment_days,
        first_jd,
        table.last_jd()
    );
    Ok(())
}

fn cmd_cheb_check(path: &str, count: usize) -> Result<(), String> {
    let table = cheb::open(&PathBuf::from(path))
        .map_err(|e: cheb::ChebError| format!("reading {path}: {e}"))?;
    let mut worst = [0.0f64; 8];
    let mut worst_jd = [0.0f64; 8];
    let mut fastest = [0.0f64; 8];
    for jd in random_jds(table.first_jd, table.last_jd(), count) {
        let Some(got) = table.positions_at(jd) else {
            continue;
        };
        for (i, body) in Body::ALL.iter().enumerate() {
            let (lon, speed) = true_longitude_and_speed(*body, jd);
            fastest[i] = fastest[i].max(speed.abs());
            let mut err = (wrap360(got.longitude[i] - lon)).abs();
            if err > 180.0 {
                err = 360.0 - err;
            }
            if err > worst[i] {
                worst[i] = err;
                worst_jd[i] = jd;
            }
        }
    }
    let mut failures = Vec::new();
    for (i, body) in Body::ALL.iter().enumerate() {
        let budget_arcsec = fastest[i] * 2.0e-4 * 3600.0 + 0.5;
        let arcsec = worst[i] * 3600.0;
        println!(
            "{:8} worst {:9.4} arcsec at JD {:.4} (budget {:6.2})",
            body.name(),
            arcsec,
            worst_jd[i],
            budget_arcsec
        );
        if arcsec > budget_arcsec {
            failures.push(format!(
                "{} error {arcsec:.4} arcsec exceeds its {budget_arcsec:.2} budget",
                body.name()
            ));
        }
    }
    if failures.is_empty() {
        println!("within budget over {count} random instants");
        Ok(())
    } else {
        Err(failures.join("; "))
    }
}

// ---- Drik: the same CHEB file, fitted to our own ephemeris ----
//
// The server's Drik path answers from `Sky::sidereal_longitude` (apparent
// sidereal longitude) and `Sky::true_node` (Rahu) — the exact functions
// below, so the file agrees with the server to the fit error, not to a
// second implementation. The file's bodies are in the same order as the
// Surya Siddhanta file's: Sun, Moon, Mars, Mercury, Jupiter, Venus,
// Saturn, Rahu. Uranus, Neptune and Pluto stay in the kernel only: no
// panchanga derivation reads them, and the fallback is a panchanga file.
//
// The Drik longitudes are smooth — the kernel is Chebyshev polynomials
// plus smooth corrections, with none of the text's ~14 s steps — so the
// budget here is a flat 0.5 arcseconds, not the step floor the Surya
// Siddhanta check carries. The header's mean Sun and ayanamsha are
// straight lines fitted from the kernel over the file's range (the range
// is year-aligned, so the Sun's annual equation of centre averages out
// of the fit; the ayanamsha is precession, linear to far under an
// arcsecond over 200 years). Both fits are measured and reported, and
// the build refuses a bad one.

/// The seven planets the Drik file stores, in file order (Rahu, the
/// eighth, is the true node, not a body).
const DRIK_BODIES: [SkyBody; 7] = [
    SkyBody::Sun,
    SkyBody::Moon,
    SkyBody::Mars,
    SkyBody::Mercury,
    SkyBody::Jupiter,
    SkyBody::Venus,
    SkyBody::Saturn,
];

/// File-order body names, for the reports.
const DRIK_NAMES: [&str; 8] = [
    "Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu",
];

/// Starting degrees (Sun first) until `drik-measure` is run on a real
/// kernel: the Surya Siddhanta degrees, which are generous for the smooth
/// Drik motion. A smaller measured set makes a smaller file; the build
/// prints what it used, and `drik-check` re-verifies it.
const DRIK_DEGREES: [usize; 8] = CHEB_DEGREES;

/// A Drik longitude from the kernel: the apparent sidereal longitude for
/// bodies 0–6, the true node for body 7 (Rahu).
fn drik_longitude(sky: &Sky, body: usize, jd: f64) -> Result<f64, String> {
    let got = if body < 7 {
        sky.sidereal_longitude(DRIK_BODIES[body], jd)
    } else {
        sky.true_node(jd)
    };
    got.map_err(|e| format!("kernel: {e}"))
}

/// The displayed speed the API shows: the ±0.5-day central difference of
/// the kernel longitude, the same definition the Surya Siddhanta path
/// uses.
fn drik_speed(sky: &Sky, body: usize, jd: f64) -> Result<f64, String> {
    let delta = 0.5;
    let before = drik_longitude(sky, body, jd - delta)?;
    let after = drik_longitude(sky, body, jd + delta)?;
    Ok(wrap180(after - before) / (2.0 * delta))
}

/// Unwrapped Drik longitudes at the Chebyshev nodes of `[a, b]`, in node
/// order (time descending), like `segment_values` for the text.
fn drik_segment_values(
    sky: &Sky,
    body: usize,
    a: f64,
    b: f64,
    degree: usize,
) -> Result<Vec<f64>, String> {
    let xs = cheb::nodes(degree + 1);
    let mut values = Vec::with_capacity(degree + 1);
    let mut prev: Option<f64> = None;
    for x in &xs {
        let jd = f64::midpoint(a, b) + (b - a) / 2.0 * x;
        let lon = drik_longitude(sky, body, jd)?;
        let lon = match prev {
            None => lon,
            Some(p) => p + wrap180(lon - p),
        };
        prev = Some(lon);
        values.push(lon);
    }
    Ok(values)
}

/// Worst error, in degrees, of a degree-`degree` Chebyshev fit of a Drik
/// body over `[a, b]`, against the kernel at every 0.05 days. The sampling
/// is finer than the Surya Siddhanta measure's quarter day: the Drik
/// budget is a flat 0.5", with no step floor to absorb a worst instant
/// between samples, so the measure must see the peaks the check will.
fn drik_fit_error(sky: &Sky, body: usize, a: f64, b: f64, degree: usize) -> Result<f64, String> {
    let values = drik_segment_values(sky, body, a, b, degree)?;
    let coeffs: Vec<f32> = cheb::fit_coefficients(&values, degree)
        .iter()
        .map(|c| *c as f32)
        .collect();
    let mut worst: f64 = 0.0;
    let steps = ((b - a) / 0.05).round() as usize;
    for i in 0..=steps {
        let jd = a + i as f64 * 0.05;
        let x = 2.0 * (jd - a) / (b - a) - 1.0;
        let got = cheb::clenshaw(&coeffs, x);
        let lon = drik_longitude(sky, body, jd)?;
        worst = worst.max(wrap180(got - lon).abs());
    }
    Ok(worst)
}

/// The fit budget for a Drik body: the motion is smooth, so only the fit
/// itself is budgeted, at half an arcsecond.
const DRIK_BUDGET_DEG: f64 = 0.5 / 3600.0;

/// The table's range must sit inside the kernel's coverage with its day
/// of margin (light-time looks back from the first instant, and the
/// table's year boundaries are midnight while the kernel's are noon).
/// A kernel that fails this was extracted too narrowly; the message says
/// so instead of the kernel's own out-of-range error.
fn check_coverage(sky: &Sky, first_jd: f64, last_jd: f64, what: &str) -> Result<(), String> {
    let (a, b) = sky.coverage_jd_ut();
    if first_jd < a || last_jd > b {
        return Err(format!(
            "{what} needs JD {first_jd:.1}–{last_jd:.1}, but the kernel covers JD {a:.1}–{b:.1} (a day of margin for light-time is already counted); extract a wider kernel"
        ));
    }
    Ok(())
}

/// Eight comma-separated degrees from the command line, Sun first, or
/// the command's measured defaults when none are given.
fn degrees_arg(
    args: &[String],
    at: usize,
    default: [usize; 8],
    cmd: &str,
) -> Result<[usize; 8], String> {
    match args.get(at) {
        Some(s) => {
            let mut d = [0usize; 8];
            for (i, part) in s.split(',').enumerate().take(8) {
                d[i] = part
                    .parse()
                    .map_err(|_| "degrees must be numbers".to_string())?;
            }
            if d.contains(&0) {
                return Err(format!("{cmd} needs 8 comma-separated degrees, Sun first"));
            }
            Ok(d)
        }
        None => Ok(default),
    }
}

fn open_sky(kernel: &str) -> Result<Sky, String> {
    Sky::open(&PathBuf::from(kernel)).map_err(|e| format!("reading {kernel}: {e}"))
}

fn measure_degrees(
    sky: &Sky,
    range_start: f64,
    range_end: f64,
    count: usize,
    segment_days: f64,
) -> Result<[usize; 8], String> {
    let mut degrees = [0usize; 8];
    for body in 0..8 {
        let mut need = 0;
        for s in 0..count {
            // The segment must end inside the range: the kernel stops
            // at `range_end`, and a segment starting near it would run
            // past the data. (The Surya Siddhanta formulas are defined
            // everywhere, so its measure never noticed this.)
            let a =
                range_start + (range_end - segment_days - range_start) * s as f64 / count as f64;
            let b = a + segment_days;
            for degree in 4..=64 {
                let worst = drik_fit_error(sky, body, a, b, degree)?;
                if worst <= DRIK_BUDGET_DEG {
                    need = need.max(degree);
                    if degree > 4 {
                        println!(
                            "{:8} segment {} (JD {:.0}) degree {:2}: worst {:7.4} arcsec",
                            DRIK_NAMES[body],
                            s,
                            a,
                            degree,
                            worst * 3600.0
                        );
                    }
                    break;
                }
                if degree == 64 {
                    return Err(format!(
                        "{} needs more than degree 64 on segment {} (worst {:.2} arcsec)",
                        DRIK_NAMES[body],
                        s,
                        worst * 3600.0
                    ));
                }
            }
        }
        degrees[body] = need;
    }
    Ok(degrees)
}

fn cmd_drik_measure(kernel: &str, count: usize, segment_days: f64) -> Result<(), String> {
    let kernel_file =
        Kernel::open(&PathBuf::from(kernel)).map_err(|e| format!("reading {kernel}: {e}"))?;
    let sky = Sky::new(kernel_file).map_err(|e| format!("kernel: {e}"))?;
    // Segments spread across the kernel's own coverage, not a fixed year
    // range: a degree that only holds in one year is not a degree. The
    // coverage already leaves a day of margin for light-time at each end.
    // Three segments under-measure (the same lesson as the Surya
    // Siddhanta file, where three segments from one year missed Venus
    // at 121"): the default here is 21, spread across the range.
    let (range_start, range_end) = sky.coverage_jd_ut();
    let degrees = measure_degrees(&sky, range_start, range_end, count, segment_days)?;
    let per_segment = degrees.iter().map(|d| d + 1).sum::<usize>() * 4;
    let segments = ((range_end - range_start) / segment_days).ceil() as usize;
    println!("measured degrees (Sun first): {degrees:?}");
    println!(
        "{segment_days:.0}-day segments: {per_segment} bytes/segment, ~{} bytes for the kernel's range",
        segments * per_segment
    );
    Ok(())
}

/// Least-squares line through (jd, unwrapped value) samples: the anchor
/// at `first_jd`, the rate, and the worst residual in degrees. The caller
/// decides whether the residual is an error: for the ayanamsha it must be
/// tiny (precession is linear); for the Sun it is the equation of centre,
/// ~1.9°, and is not an error at all.
fn fit_line(first_jd: f64, samples: &[(f64, f64)]) -> (f64, f64, f64) {
    let n = samples.len() as f64;
    let (mut sx, mut sy, mut sxx, mut sxy) = (0.0, 0.0, 0.0, 0.0);
    for &(jd, v) in samples {
        let x = jd - first_jd;
        sx += x;
        sy += v;
        sxx += x * x;
        sxy += x * v;
    }
    let denom = n * sxx - sx * sx;
    let rate = (n * sxy - sx * sy) / denom;
    let anchor = (sy - rate * sx) / n;
    let mut worst: f64 = 0.0;
    for &(jd, v) in samples {
        worst = worst.max(wrap180(anchor + rate * (jd - first_jd) - v).abs());
    }
    (anchor, rate, worst)
}

/// The header's fitted lines: the mean Sun (anchor, rate) and the
/// ayanamsha (anchor, rate, worst residual).
struct HeaderFits {
    mean_sun: (f64, f64),
    ayanamsha: (f64, f64, f64),
}

/// Straight-line fits of the mean Sun and the ayanamsha from the kernel,
/// sampled every 5 days over the file's range, unwrapped as they go.
fn drik_header_fits(sky: &Sky, first_jd: f64, last_jd: f64) -> Result<HeaderFits, String> {
    let mut sun_samples: Vec<(f64, f64)> = Vec::new();
    let mut aya_samples: Vec<(f64, f64)> = Vec::new();
    let mut prev_sun: Option<f64> = None;
    let mut prev_aya: Option<f64> = None;
    let mut jd = first_jd;
    while jd <= last_jd {
        let sun = drik_longitude(sky, 0, jd)?;
        let sun = match prev_sun {
            None => sun,
            Some(p) => p + wrap180(sun - p),
        };
        prev_sun = Some(sun);
        sun_samples.push((jd, sun));
        let aya = sky.ayanamsha(jd);
        let aya = match prev_aya {
            None => aya,
            Some(p) => p + wrap180(aya - p),
        };
        prev_aya = Some(aya);
        aya_samples.push((jd, aya));
        jd += 5.0;
    }
    let (mean_sun0, mean_sun_rate, _) = fit_line(first_jd, &sun_samples);
    let (aya0, aya_rate, aya_resid) = fit_line(first_jd, &aya_samples);
    // The mean Sun's rate must advance one sidereal year per 365.25636
    // days: the fit is over whole years, so the annual term averages out,
    // and a rate that fails this has an unwrapping fault, not astronomy.
    if (mean_sun_rate * 365.25636 - 360.0).abs() > 0.05 {
        return Err(format!(
            "mean Sun rate {mean_sun_rate:.9} °/day does not advance 360° in a sidereal year"
        ));
    }
    if aya_resid > 0.005 {
        return Err(format!(
            "ayanamsha is not linear over the range (residual {aya_resid:.4}°)"
        ));
    }
    Ok(HeaderFits {
        mean_sun: (wrap360(mean_sun0), mean_sun_rate),
        ayanamsha: (wrap360(aya0), aya_rate, aya_resid),
    })
}

fn cmd_drik_build(
    kernel: &str,
    out: &str,
    first_year: i32,
    last_year: i32,
    segment_days: f64,
    degrees: [usize; 8],
) -> Result<(), String> {
    if segment_days <= 0.0 || segment_days > 64.0 {
        return Err("segment_days must be between 0 and 64".to_string());
    }
    if last_year < first_year {
        return Err("last_year is before first_year".to_string());
    }
    let sky = open_sky(kernel)?;
    let first_jd = julday(first_year, 1, 1, 0.0, Calendar::Gregorian);
    let last_jd = julday(last_year + 1, 1, 1, 0.0, Calendar::Gregorian);
    check_coverage(&sky, first_jd, last_jd, "the Drik table")?;
    let fits = drik_header_fits(&sky, first_jd, last_jd)?;
    let (mean_sun0, mean_sun_rate) = fits.mean_sun;
    let (aya0, aya_rate, aya_resid) = fits.ayanamsha;
    let count = ((last_jd - first_jd) / segment_days).ceil() as usize;
    let mut coefficients = Vec::with_capacity(count * cheb::segment_bytes(&degrees) / 4);
    for s in 0..count {
        let a = first_jd + s as f64 * segment_days;
        let b = a + segment_days;
        for (body, &degree) in degrees.iter().enumerate() {
            let values = drik_segment_values(&sky, body, a, b, degree)?;
            coefficients.extend(
                cheb::fit_coefficients(&values, degree)
                    .iter()
                    .map(|c| *c as f32),
            );
        }
    }
    let table = ChebTable {
        first_jd,
        segment_days,
        degrees,
        mean_sun0,
        mean_sun_rate,
        ayanamsha: Some((aya0, aya_rate)),
        coefficients,
    };
    let bytes = cheb::serialise(&table);
    std::fs::write(out, &bytes).map_err(|e| format!("writing {out}: {e}"))?;
    println!(
        "wrote {out}: {} segments, {} bytes, {:.0}-day segments, JD {:.1}–{:.1}",
        count,
        bytes.len(),
        segment_days,
        first_jd,
        table.last_jd()
    );
    println!(
        "mean Sun {mean_sun0:.6}° + {mean_sun_rate:.9}°/day; ayanamsha {aya0:.6}° + {aya_rate:.9}°/day (residual {aya_resid:.5}°)"
    );
    Ok(())
}

fn cmd_drik_check(kernel: &str, path: &str, count: usize) -> Result<(), String> {
    let sky = open_sky(kernel)?;
    let table = cheb::open(&PathBuf::from(path))
        .map_err(|e: cheb::ChebError| format!("reading {path}: {e}"))?;
    check_coverage(&sky, table.first_jd, table.last_jd(), "the Drik check")?;
    let mut worst = [0.0f64; 8];
    let mut worst_jd = [0.0f64; 8];
    let mut worst_aya = 0.0f64;
    for jd in random_jds(table.first_jd, table.last_jd(), count) {
        let Some(got) = table.positions_at(jd) else {
            continue;
        };
        for body in 0..8 {
            let lon = drik_longitude(&sky, body, jd)?;
            let mut err = (wrap360(got.longitude[body] - lon)).abs();
            if err > 180.0 {
                err = 360.0 - err;
            }
            if err > worst[body] {
                worst[body] = err;
                worst_jd[body] = jd;
            }
        }
        worst_aya = worst_aya.max(wrap180(got.ayanamsha - sky.ayanamsha(jd)).abs());
    }
    let mut failures = Vec::new();
    for body in 0..8 {
        let arcsec = worst[body] * 3600.0;
        println!(
            "{:8} worst {:9.4} arcsec at JD {:.4} (budget {:6.2})",
            DRIK_NAMES[body],
            arcsec,
            worst_jd[body],
            DRIK_BUDGET_DEG * 3600.0
        );
        if worst[body] > DRIK_BUDGET_DEG {
            failures.push(format!(
                "{} error {arcsec:.4} arcsec exceeds its 0.50 budget",
                DRIK_NAMES[body]
            ));
        }
    }
    println!(
        "ayanamsha worst {:.5}° (budget 0.00500); mean Sun rate {:.9}°/day",
        worst_aya, table.mean_sun_rate
    );
    if worst_aya > 0.005 {
        failures.push(format!(
            "ayanamsha error {worst_aya:.5}° exceeds its 0.005 budget"
        ));
    }
    if failures.is_empty() {
        println!("within budget over {count} random instants");
        Ok(())
    } else {
        Err(failures.join("; "))
    }
}

fn cmd_drik_fixtures(kernel: &str, path: &str, out: &str, count: usize) -> Result<(), String> {
    let sky = Arc::new(open_sky(kernel)?);
    let table = cheb::open(&PathBuf::from(path))
        .map_err(|e: cheb::ChebError| format!("reading {path}: {e}"))?;
    check_coverage(&sky, table.first_jd, table.last_jd(), "the Drik fixtures")?;
    // `System::Drik` needs a `&'static DrikSky`; a build tool may leak it.
    let drik = Box::leak(Box::new(DrikSky::new(Arc::clone(&sky), None)));
    let system = System::Drik(drik);
    let mut rows = String::from("[\n");
    let jds = random_jds(table.first_jd, table.last_jd(), count);
    for (k, jd) in jds.iter().enumerate() {
        // Direct values from the kernel, NOT the table's interpolation: the
        // TypeScript test must prove its own evaluator reproduces the
        // kernel, so the fixture is the authority, not a copy of the table.
        // The ayanamsha and mean Sun come from the table's header instead:
        // the client reads those from the file, so the fixture pins what
        // the file says, and the check above pins the file against the
        // kernel.
        let mut longitude = [0.0f64; 8];
        let mut speed = [0.0f64; 8];
        for body in 0..8 {
            longitude[body] = drik_longitude(&sky, body, *jd)?;
            speed[body] = drik_speed(&sky, body, *jd)?;
        }
        let aya = table.ayanamsha_at(*jd);
        let mean_sun = wrap360(table.mean_sun_at(*jd) + aya);
        let tithi = panchanga::tithi(system, *jd);
        let nak = panchanga::nakshatra(system, *jd);
        let yoga = panchanga::yoga(system, *jd);
        let karana = panchanga::karana(system, *jd);
        let rashi = |lon: f64| (lon.div_euclid(30.0) as u32) + 1;
        let fmt_list = |xs: &[f64]| {
            xs.iter()
                .map(|x| format!("{x:.6}"))
                .collect::<Vec<_>>()
                .join(", ")
        };
        let _ = write!(
            rows,
            "  {{\"jd\": {jd:.6}, \"longitude\": [{}], \"speed\": [{}], \"ayanamsha\": {:.6}, \"mean_sun_sayana\": {:.6}, \"tithi\": {}, \"tithi_progress\": {:.6}, \"nakshatra\": {}, \"pada\": {}, \"nakshatra_progress\": {:.6}, \"yoga\": {}, \"yoga_progress\": {:.6}, \"karana\": {}, \"karana_progress\": {:.6}, \"moon_rashi\": {}, \"sun_rashi\": {}, \"lagna\": {:.6}}}",
            fmt_list(&longitude),
            fmt_list(&speed),
            aya,
            mean_sun,
            tithi.number,
            tithi.progress,
            nak.number,
            nak.pada,
            nak.progress,
            yoga.number,
            yoga.progress,
            karana.number,
            karana.progress,
            rashi(longitude[1]),
            rashi(longitude[0]),
            system.ascendant(*jd, FIXTURE_LAT, FIXTURE_LON),
        );
        rows.push_str(if k + 1 == count { "\n" } else { ",\n" });
    }
    rows.push_str("]\n");
    std::fs::write(out, rows).map_err(|e| format!("writing {out}: {e}"))?;
    println!("wrote {out}: {count} fixtures from {path}");
    Ok(())
}

fn cmd_drik_sun(kernel: &str, out: &str, days: usize) -> Result<(), String> {
    // Sunrise/sunset for consecutive days from the table's first sample,
    // Kathmandu, from the same solver the server uses for Drik (upper
    // limb, −0.833°). The TypeScript test compares its own solver against
    // these. The days start at the kernel's first whole day, not the
    // table's, so the command does not need a table.
    let sky = Arc::new(open_sky(kernel)?);
    let drik = Box::leak(Box::new(DrikSky::new(Arc::clone(&sky), None)));
    let system = System::Drik(drik);
    let (first, _) = sky.coverage_jd_ut();
    let start0 = first.ceil();
    let mut rows = String::from("[\n");
    for k in 0..days {
        let start = start0 + k as f64;
        let rise = system.next_rise_or_set(
            Body::Sun,
            start,
            FIXTURE_LAT,
            FIXTURE_LON,
            astronomy::surya_siddhanta::Crossing::Rise,
        );
        let set = system.next_rise_or_set(
            Body::Sun,
            start,
            FIXTURE_LAT,
            FIXTURE_LON,
            astronomy::surya_siddhanta::Crossing::Set,
        );
        let (Some(rise), Some(set)) = (rise, set) else {
            return Err(format!("no sunrise/sunset on day {k} from JD {start}"));
        };
        let _ = write!(
            rows,
            "  {{\"start_jd\": {start:.6}, \"sunrise_jd\": {rise:.6}, \"sunset_jd\": {set:.6}}}",
        );
        rows.push_str(if k + 1 == days { "\n" } else { ",\n" });
    }
    rows.push_str("]\n");
    std::fs::write(out, rows).map_err(|e| format!("writing {out}: {e}"))?;
    println!("wrote {out}: {days} days of sunrise/sunset from {kernel}");
    Ok(())
}

/// The Surya Siddhanta event index (`surya.vidx`): every boundary the text's own
/// arithmetic produces, solved once and stored, so a server and a phone read
/// them instead of solving. Same file format as Drik's `events.vidx`.
fn cmd_index(out: &str, first_year: i32, last_year: i32, threads: usize) -> Result<(), String> {
    if last_year <= first_year {
        return Err("last_year must come after first_year".to_string());
    }
    let from = julday(first_year, 1, 1, 0.0, Calendar::Gregorian);
    let to = julday(last_year + 1, 1, 1, 0.0, Calendar::Gregorian);
    let started = std::time::Instant::now();
    let bytes = ephdata::index::build(
        &astronomy::position::SuryaSiddhanta,
        from,
        to,
        threads,
        &|done, total| {
            eprint!(
                "\r{done}/{total} stretches, {:.0}s",
                started.elapsed().as_secs_f64()
            );
        },
    )
    .map_err(|e| format!("building the index: {e}"))?;
    eprintln!();
    std::fs::write(out, &bytes).map_err(|e| format!("writing {out}: {e}"))?;
    let index = ephdata::Index::from_bytes(bytes).map_err(|e| format!("re-reading {out}: {e}"))?;
    println!(
        "wrote {out}: {:.2} MB for AD {first_year}-{last_year} in {:.0}s",
        index.size() as f64 / 1e6,
        started.elapsed().as_secs_f64()
    );
    for kind in ephdata::Kind::ALL {
        println!("{kind:?}: {} events", index.len(kind));
    }
    Ok(())
}

#[expect(clippy::too_many_lines, reason = "one match arm per command")]
fn main() -> ExitCode {
    let args: Vec<String> = std::env::args().collect();
    let result = match args.get(1).map(String::as_str) {
        Some("build") if args.len() == 6 => {
            let first = args[3].parse().unwrap_or(0);
            let last = args[4].parse().unwrap_or(0);
            let step = args[5].parse().unwrap_or(0.0);
            cmd_build(&args[2], first, last, step)
        }
        Some("check") => {
            let count = args.get(3).and_then(|s| s.parse().ok()).unwrap_or(2000);
            cmd_check(&args[2], count)
        }
        Some("fixtures") => {
            let count = args.get(4).and_then(|s| s.parse().ok()).unwrap_or(50);
            cmd_fixtures(&args[2], &args[3], count)
        }
        Some("sun") => {
            let days = args.get(4).and_then(|s| s.parse().ok()).unwrap_or(10);
            cmd_sun(&args[2], &args[3], days)
        }
        Some("index") if args.len() >= 5 => {
            let first = args[3].parse().unwrap_or(0);
            let last = args[4].parse().unwrap_or(0);
            let threads = args.get(5).and_then(|s| s.parse().ok()).unwrap_or(2);
            cmd_index(&args[2], first, last, threads)
        }
        Some("cheb-measure") => {
            let count = args.get(2).and_then(|s| s.parse().ok()).unwrap_or(21);
            let segment_days = args
                .get(3)
                .and_then(|s| s.parse().ok())
                .unwrap_or(cheb::SEGMENT_DAYS);
            cmd_cheb_measure(count, segment_days)
        }
        Some("cheb-build") if args.len() >= 5 => {
            let first = args[3].parse().unwrap_or(0);
            let last = args[4].parse().unwrap_or(0);
            let segment_days = args
                .get(5)
                .and_then(|s| s.parse().ok())
                .unwrap_or(cheb::SEGMENT_DAYS);
            match degrees_arg(&args, 6, CHEB_DEGREES, "cheb-build") {
                Ok(d) => cmd_cheb_build(&args[2], first, last, segment_days, d),
                Err(e) => Err(e),
            }
        }
        Some("cheb-check") => {
            let count = args.get(3).and_then(|s| s.parse().ok()).unwrap_or(2000);
            cmd_cheb_check(&args[2], count)
        }
        Some("drik-synthetic") => {
            // Writes the synthetic kernel the tests build against: a
            // dev tool for generating the TypeScript fixtures, not
            // production data. The positions are circular orbits, not
            // astronomy.
            let bytes = synthetic_kernel_bytes();
            match std::fs::write(&args[2], &bytes) {
                Ok(()) => {
                    println!("wrote {}: {} bytes", args[2], bytes.len());
                    Ok(())
                }
                Err(e) => Err(format!("writing {}: {e}", args[2])),
            }
        }
        Some("drik-measure") => {
            let count = args.get(3).and_then(|s| s.parse().ok()).unwrap_or(21);
            let segment_days = args
                .get(4)
                .and_then(|s| s.parse().ok())
                .unwrap_or(cheb::SEGMENT_DAYS);
            cmd_drik_measure(&args[2], count, segment_days)
        }
        Some("drik-build") if args.len() >= 6 => {
            let first = args[4].parse().unwrap_or(0);
            let last = args[5].parse().unwrap_or(0);
            let segment_days = args
                .get(6)
                .and_then(|s| s.parse().ok())
                .unwrap_or(cheb::SEGMENT_DAYS);
            match degrees_arg(&args, 7, DRIK_DEGREES, "drik-build") {
                Ok(d) => cmd_drik_build(&args[2], &args[3], first, last, segment_days, d),
                Err(e) => Err(e),
            }
        }
        Some("drik-check") => {
            let count = args.get(4).and_then(|s| s.parse().ok()).unwrap_or(2000);
            cmd_drik_check(&args[2], &args[3], count)
        }
        Some("drik-fixtures") => {
            let count = args.get(5).and_then(|s| s.parse().ok()).unwrap_or(50);
            cmd_drik_fixtures(&args[2], &args[3], &args[4], count)
        }
        Some("drik-sun") => {
            let days = args.get(4).and_then(|s| s.parse().ok()).unwrap_or(10);
            cmd_drik_sun(&args[2], &args[3], days)
        }
        _ => Err("usage: siddhanta-table index <out.vidx> <first_year> <last_year> [threads]\n       siddhanta-table build <out> <first_year> <last_year> <step_hours>\n       siddhanta-table check <table> [random_samples]\n       siddhanta-table fixtures <table> <out.json> [count]\n       siddhanta-table cheb-measure <first_year> [segments]\n       siddhanta-table cheb-build <out> <first_year> <last_year> [segment_days] [degrees]\n       siddhanta-table cheb-check <table> [random_samples]\n       siddhanta-table drik-measure <kernel.veph> [segments] [segment_days]\n       siddhanta-table drik-synthetic <out.veph>\n       siddhanta-table drik-build <kernel.veph> <out> <first_year> <last_year> [segment_days] [degrees]\n       siddhanta-table drik-check <kernel.veph> <table> [random_samples]\n       siddhanta-table drik-fixtures <kernel.veph> <table> <out.json> [count]\n       siddhanta-table drik-sun <kernel.veph> <out.json> [days]".to_string()),
    };
    match result {
        Ok(()) => ExitCode::SUCCESS,
        Err(e) => {
            eprintln!("error: {e}");
            ExitCode::FAILURE
        }
    }
}

/// A synthetic kernel: every wanted segment is a circular orbit in the
/// ecliptic plane, fitted at degree 4 per 32-day record, over 416 days
/// starting two days before J2000. The positions are not astronomy —
/// the Earth is a circle, the Moon a circle around the EMB — but the
/// Sky evaluates them exactly as it would a real kernel, so a Drik
/// build and check against this Sky proves the builder, not the data.
/// No kernel file, SPK or Swiss data is needed to run it. The two
/// days before J2000 are the light-time margin: the Sky looks back
/// from the first instant, and a kernel that starts exactly at the
/// first instant fails there.
fn synthetic_kernel_bytes() -> Vec<u8> {
    const AU_KM: f64 = 149_597_870.7;
    const NREC: usize = 13;
    const INTLEN: f64 = 32.0 * 86_400.0;
    const START: f64 = -2.0 * 86_400.0;
    // The orbits lie in the ecliptic plane, not the equator: the Sky
    // rotates vectors into the ecliptic of date, so a body on the
    // celestial equator would show a ±2.4° swing in ecliptic
    // longitude as it goes around, and the Sun's fitted rate would
    // come out wrong. The obliquity here is the J2000 mean value.
    let (sin_obl, cos_obl) = 23.439_281_1_f64.to_radians().sin_cos();
    // Coefficients per axis per record: 8 is plenty for the slow
    // bodies (their angle changes ~0.5 rad over a record — a
    // degree-4 fit leaves ~6" jumps at record boundaries, and the
    // Drik fit, whose segments straddle those boundaries, cannot
    // reproduce a jump to 0.5"), but the Moon swings 7.4 rad in 32
    // days, and the Earth follows it, so those two segments need
    // 16 — a degree-4 fit of a full lunar orbit is garbage, and the
    // Sun's longitude inherits it through the Earth's monthly
    // wobble. The real kernel has the same shape: its lunar segment
    // carries more coefficients per record, and JPL's own series are
    // continuous across records, so the real file has no jumps at
    // all.
    let ncoef = |seg: usize| if seg == 2 || seg == 3 { 16 } else { 8 };
    // (radius in AU, period in days, phase) per wanted segment, in
    // WANTED order: Sun, EMB, Earth, Moon, Mercury, Venus, Mars,
    // Jupiter, Saturn, Uranus, Neptune, Pluto.
    let orbits: [(f64, f64, f64); 12] = [
        (0.0, 1.0, 0.0),
        (1.0, 365.25636, 0.0),
        (0.0, 27.321_661, 0.0),
        (384_400.0 / AU_KM, 27.321_661, 0.5),
        (0.387, 87.969, 1.0),
        (0.723, 224.701, 2.0),
        (1.524, 686.980, 3.0),
        (5.203, 4332.589, 4.0),
        (9.537, 10759.22, 5.0),
        (19.191, 30688.5, 6.0),
        (30.069, 60182.0, 0.3),
        (39.482, 90560.0, 0.7),
    ];
    // The Earth, relative to the EMB, is on the opposite side of the
    // barycentre from the Moon, 1/81.3 of the way there.
    let moon_angle = |et: f64| 0.5 + 2.0 * std::f64::consts::PI * (et / 86_400.0) / 27.321_661;
    // Rotate the orbital plane into the ecliptic: (x, y, 0) becomes
    // (x, y·cos ε, y·sin ε).
    let ecliptic = |x: f64, y: f64| [x, y * cos_obl, y * sin_obl];
    // The Moon's orbit is inclined 5.14° to the ecliptic: without
    // that, the node is undefined (its orbit never crosses the
    // ecliptic, so the node is the ratio of two rounding errors) and
    // the fitted Rahu is noise. The Earth sits opposite the Moon
    // across the EMB, on the same inclined line.
    let (sin_inc, cos_inc) = 5.14_f64.to_radians().sin_cos();
    let moon_pos = |et: f64| -> [f64; 3] {
        let a = moon_angle(et);
        let r = 384_400.0;
        let (x, y) = (r * a.cos(), r * a.sin());
        [x, y * cos_inc, y * sin_inc]
    };
    let pos = |seg: usize, et: f64| -> [f64; 3] {
        let (r_au, period, phase) = orbits[seg];
        if seg == 0 {
            return [0.0, 0.0, 0.0];
        }
        if seg == 2 {
            let m = moon_pos(et);
            return [-m[0] / 81.3, -m[1] / 81.3, -m[2] / 81.3];
        }
        if seg == 3 {
            return moon_pos(et);
        }
        let a = phase + 2.0 * std::f64::consts::PI * (et / 86_400.0) / period;
        let r = r_au * AU_KM;
        ecliptic(r * a.cos(), r * a.sin())
    };
    let header_len = 32 + (48 + 24) * WANTED.len();
    let mut out = Vec::with_capacity(header_len + WANTED.len() * NREC * 3 * 16 * 8);
    out.extend_from_slice(b"VEPH0002");
    out.extend_from_slice(&(WANTED.len() as u32).to_le_bytes());
    out.extend_from_slice(&0u32.to_le_bytes());
    out.extend_from_slice(&START.to_le_bytes());
    out.extend_from_slice(&(START + NREC as f64 * INTLEN).to_le_bytes());
    let mut offset = header_len;
    let mut segments_data: Vec<Vec<u8>> = Vec::new();
    for (seg, (target, center)) in WANTED.iter().enumerate() {
        let ncoef = ncoef(seg);
        out.extend_from_slice(&target.to_le_bytes());
        out.extend_from_slice(&center.to_le_bytes());
        out.extend_from_slice(&START.to_le_bytes());
        out.extend_from_slice(&INTLEN.to_le_bytes());
        out.extend_from_slice(&(ncoef as u32).to_le_bytes());
        out.extend_from_slice(&(NREC as u32).to_le_bytes());
        out.extend_from_slice(&(offset as u64).to_le_bytes());
        out.extend_from_slice(&0.0f64.to_le_bytes());
        let mut data = Vec::with_capacity(NREC * 3 * ncoef * 8);
        for rec in 0..NREC {
            let start = START + rec as f64 * INTLEN;
            for axis in 0..3 {
                let xs = cheb::nodes(ncoef);
                let values: Vec<f64> = xs
                    .iter()
                    .map(|x| start + (x + 1.0) / 2.0 * INTLEN)
                    .map(|et| pos(seg, et)[axis])
                    .collect();
                for c in cheb::fit_coefficients(&values, ncoef - 1) {
                    data.extend_from_slice(&c.to_le_bytes());
                }
            }
        }
        offset += data.len();
        segments_data.push(data);
    }
    for _ in 0..WANTED.len() {
        out.extend_from_slice(&[0u8; 24]);
    }
    debug_assert_eq!(
        out.len(),
        header_len,
        "the header is exactly the table and widths"
    );
    for data in segments_data {
        out.extend_from_slice(&data);
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn drik_build_and_check_against_a_synthetic_kernel() {
        let dir = std::env::temp_dir().join(format!("drik-test-{}-build", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let kernel = dir.join("synthetic.veph");
        std::fs::write(&kernel, synthetic_kernel_bytes()).unwrap();
        let kernel = kernel.to_str().unwrap().to_string();
        let out = dir.join("synthetic.cheb");
        let out = out.to_str().unwrap().to_string();
        // The degrees are measured on this synthetic kernel (21 segments
        // spread across its range — three under-measure, the same lesson
        // as the Surya Siddhanta file), not assumed: the Sun needs 5 for
        // the Earth's monthly wobble, the Moon ~23 for the full monthly
        // cycle, Mercury more near an inferior conjunction. The real
        // kernel's degrees will differ; the operator measures them where
        // the kernel lives.
        let sky = open_sky(&kernel).expect("open the synthetic kernel");
        let (range_start, range_end) = sky.coverage_jd_ut();
        let degrees = measure_degrees(&sky, range_start, range_end, 21, 32.0)
            .expect("measure degrees on the synthetic kernel");
        cmd_drik_build(&kernel, &out, 2000, 2000, 32.0, degrees).expect("build");
        let bytes = std::fs::read(&out).unwrap();
        assert_eq!(&bytes[..8], b"CHEB0002", "a Drik file is version 2");
        let table = cheb::open(&PathBuf::from(&out)).expect("read back");
        assert!(
            table.ayanamsha.is_some(),
            "the header carries the ayanamsha"
        );
        cmd_drik_check(&kernel, &out, 500).expect("check within budget");
        let fixtures = dir.join("fixtures.json");
        let fixtures = fixtures.to_str().unwrap().to_string();
        cmd_drik_fixtures(&kernel, &out, &fixtures, 5).expect("fixtures");
        let text = std::fs::read_to_string(&fixtures).unwrap();
        assert!(text.contains("\"lagna\""), "fixtures carry the derivations");
        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn drik_measure_finds_degrees_on_the_synthetic_kernel() {
        let dir = std::env::temp_dir().join(format!("drik-test-{}-measure", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let kernel = dir.join("synthetic.veph");
        std::fs::write(&kernel, synthetic_kernel_bytes()).unwrap();
        let kernel = kernel.to_str().unwrap().to_string();
        cmd_drik_measure(&kernel, 21, 32.0).expect("measure");
        std::fs::remove_dir_all(&dir).ok();
    }
}
