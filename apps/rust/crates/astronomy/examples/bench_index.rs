//! Event lookups three ways: the Surya Siddhanta chunk solver (what the server runs
//! today), our own ephemeris solved on demand, and our own ephemeris with the stored
//! event index. One variant per process so memory is comparable.
//!
//! `PATRO_RS_EPHDATA=<dir> cargo run -p astronomy --example bench_index -- ss|own|index`

use std::{path::PathBuf, process::Command, sync::Arc, time::Instant};

use astronomy::{
    angles::Anga,
    events::{events_between, next_event, prev_event},
    position::{Ephemeris, OwnDrik, SuryaSiddhanta},
};
use ephdata::{Index, Sky};

fn rss_mb() -> f64 {
    let kb = Command::new("ps")
        .args(["-o", "rss=", "-p", &std::process::id().to_string()])
        .output()
        .ok()
        .and_then(|o| {
            String::from_utf8_lossy(&o.stdout)
                .trim()
                .parse::<f64>()
                .ok()
        });
    kb.unwrap_or(0.0) / 1024.0
}

const PANCHANGA: [Anga; 4] = [Anga::Tithi, Anga::Karana, Anga::Nakshatra, Anga::Yoga];

/// What one panchanga day asks of the engine: the running and next boundary of each.
fn day(eph: &impl Ephemeris, jd: f64) -> f64 {
    let mut sink = 0.0;
    for anga in PANCHANGA {
        sink += prev_event(eph, anga, jd).jd + next_event(eph, anga, jd).jd;
    }
    sink
}

fn run(eph: &impl Ephemeris, label: &str, from: f64, to: f64) {
    let before = rss_mb();
    // Cold: 3000 instants 130 days apart, each in a stretch never seen before.
    let spread: Vec<f64> = (0..3000)
        .map(|k| from + 30.0 + f64::from(k) * (to - from - 60.0) / 3000.0 + 0.37)
        .collect();
    let t = Instant::now();
    let mut sink = 0.0;
    for &jd in &spread {
        sink += day(eph, jd);
    }
    let cold = t.elapsed();
    // Warm: the same instants again.
    let t = Instant::now();
    for &jd in &spread {
        sink += day(eph, jd);
    }
    let warm = t.elapsed();
    // A year of every anga's boundaries at once (what a year view reads).
    let t = Instant::now();
    let mut n = 0;
    for k in 0..40 {
        let a = from + 100.0 + f64::from(k) * 9000.0;
        for anga in PANCHANGA {
            n += events_between(eph, anga, a, a + 365.25).len();
        }
    }
    let years = t.elapsed();
    let per = |d: std::time::Duration, count: f64| d.as_secs_f64() * 1e6 / count;
    println!("{label}");
    println!(
        "  panchanga day, cold  {:>9.1} µs   ({:.0}/s)",
        per(cold, 3000.0),
        3000.0 / cold.as_secs_f64()
    );
    println!(
        "  panchanga day, warm  {:>9.1} µs   ({:.0}/s)",
        per(warm, 3000.0),
        3000.0 / warm.as_secs_f64()
    );
    println!(
        "  40 years x 4 angas   {:>9.1} ms   ({n} events)",
        years.as_secs_f64() * 1e3
    );
    println!(
        "  memory               {:>9.1} MB resident (+{:.1} MB since start of run)",
        rss_mb(),
        rss_mb() - before
    );
    if sink.is_nan() {
        println!("(nan)");
    }
}

fn main() {
    let which = std::env::args().nth(1).unwrap_or_else(|| "ss".into());
    let dir = PathBuf::from(std::env::var_os("PATRO_RS_EPHDATA").expect("PATRO_RS_EPHDATA"));
    let index = Arc::new(Index::open(&dir.join("events.vidx")).expect("index"));
    let (a, b) = index.coverage();
    println!("baseline memory {:.1} MB", rss_mb());
    match which.as_str() {
        "ss" => run(
            &SuryaSiddhanta,
            "Surya Siddhanta, chunk solver (the server today)",
            a,
            b,
        ),
        "own" => {
            let sky = Arc::new(Sky::open(&dir.join("kernel.veph")).expect("kernel"));
            run(&OwnDrik::new(sky), "Own ephemeris, solved on demand", a, b);
        }
        _ => {
            let sky = Arc::new(Sky::open(&dir.join("kernel.veph")).expect("kernel"));
            run(
                &OwnDrik::new(sky).with_index(index),
                "Own ephemeris, stored event index",
                a,
                b,
            );
        }
    }
}
