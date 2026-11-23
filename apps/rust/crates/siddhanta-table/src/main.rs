//! `siddhanta-table`: build, check and fixture-export a STAB position table.
//!
//! ```text
//! siddhanta-table build <out> <first_year> <last_year> <step_hours>
//! siddhanta-table check <table> [random_samples]
//! siddhanta-table fixtures <table> <out.json> [count]
//! ```
//!
//! `build` samples the Surya Siddhanta from 1 January of `first_year` to 1
//! January of `last_year + 1` (00:00 UT), so the file covers the whole of
//! `last_year`. `check` interpolates random instants inside the table and
//! reports the worst error against the direct formulas, in arcseconds.
//! `fixtures` writes JSON expectations for the TypeScript client test: direct
//! positions and the panchanga derivations the client must reproduce from the
//! table alone.

#![expect(
    clippy::cast_possible_truncation,
    clippy::cast_sign_loss,
    clippy::cast_precision_loss,
    reason = "the table format is u24/f32 by design (longitudes wrap at 360, speeds are small), and the sample counts are bounded by the year range and step; every cast's range is checked by the tests"
)]

use std::{fmt::Write as _, path::PathBuf, process::ExitCode};

use astronomy::{
    System,
    surya_siddhanta::{
        Body, MAHAYUGA_DAYS, MeanBody, ayanamsha, mean_longitude, true_longitude_and_speed,
    },
};
use siddhanta_table::{Table, TableError, serialise};
use timescale::{Calendar, julday};

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
        _ => Err("usage: siddhanta-table build <out> <first_year> <last_year> <step_hours>\n       siddhanta-table check <table> [random_samples]\n       siddhanta-table fixtures <table> <out.json> [count]\n       siddhanta-table sun <table> <out.json> [days]".to_string()),
    };
    match result {
        Ok(()) => ExitCode::SUCCESS,
        Err(e) => {
            eprintln!("error: {e}");
            ExitCode::FAILURE
        }
    }
}
