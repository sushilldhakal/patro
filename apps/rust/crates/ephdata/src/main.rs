//! `ephdata`: build and check the ephemeris files.
//!
//! ```text
//! ephdata extract <out.veph> <from_year> <to_year> <step_km> <kernel.bsp>...
//! ephdata index   <in.veph> <out.vidx> <from_year> <to_year> [threads]
//! ephdata dump    <in.veph>            (reads TDB seconds on stdin, prints km)
//! ephdata lon     <in.veph>            (reads UT Julian Days on stdin, prints places)
//! ```

#![expect(
    clippy::cast_precision_loss,
    clippy::too_many_lines,
    reason = "a command-line tool: sizes print as megabytes and each command is one match arm"
)]

mod fit;

use std::{
    error::Error,
    io::{BufRead, Write},
    path::Path,
};

use ephdata::{
    Body, Kernel, Place, Sky,
    deltat::{J2000, ut_to_et},
    index,
    kernel::WANTED,
};

/// A small deterministic generator for repeatable samples.
struct Lcg(u64);

impl Lcg {
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

fn arg(args: &[String], i: usize, what: &str) -> Result<String, Box<dyn Error>> {
    args.get(i)
        .cloned()
        .ok_or_else(|| format!("missing {what}").into())
}

fn main() -> Result<(), Box<dyn Error>> {
    let args: Vec<String> = std::env::args().collect();
    let cmd = arg(&args, 1, "command")?;
    match cmd.as_str() {
        "extract" => {
            let (from, to) = (
                arg(&args, 3, "from_year")?.parse()?,
                arg(&args, 4, "to_year")?.parse()?,
            );
            let step = arg(&args, 5, "step_km")?.parse()?;
            let bsps: Vec<&Path> = args[6..].iter().map(Path::new).collect();
            if bsps.is_empty() {
                return Err("missing kernel.bsp".into());
            }
            let secs = |y: f64| (jd_of_year(y) - J2000) * 86_400.0;
            let kernel = Kernel::from_spk(&bsps, secs(from), secs(to), step)?;
            kernel.write(Path::new(&arg(&args, 2, "out")?))?;
            let (a, b) = kernel.coverage();
            println!(
                "{} segments, {:.1} MB of coefficients, {:.1} to {:.1} (TDB s)",
                WANTED.len(),
                kernel.data_bytes() as f64 / 1e6,
                a,
                b
            );
        }
        "dump" => {
            let kernel = Kernel::open(Path::new(&arg(&args, 2, "veph")?))?;
            let slots: Vec<usize> = WANTED
                .iter()
                .map(|(t, c)| kernel.segment(*t, *c))
                .collect::<Result<_, _>>()?;
            let out = std::io::stdout();
            let mut out = std::io::BufWriter::new(out.lock());
            for line in std::io::stdin().lock().lines() {
                let et: f64 = line?.trim().parse()?;
                write!(out, "{et}")?;
                for &s in &slots {
                    let st = kernel.eval(s, et)?;
                    write!(
                        out,
                        " {:.9} {:.9} {:.9} {:.12e} {:.12e} {:.12e}",
                        st.pos[0], st.pos[1], st.pos[2], st.vel[0], st.vel[1], st.vel[2]
                    )?;
                }
                writeln!(out)?;
            }
        }
        "lon" => {
            let sky = Sky::open(Path::new(&arg(&args, 2, "veph")?))?;
            let bodies = [
                Body::Sun,
                Body::Moon,
                Body::Mercury,
                Body::Venus,
                Body::Mars,
                Body::Jupiter,
                Body::Saturn,
            ];
            let out = std::io::stdout();
            let mut out = std::io::BufWriter::new(out.lock());
            for line in std::io::stdin().lock().lines() {
                let jd: f64 = line?.trim().parse()?;
                write!(
                    out,
                    "{jd} {:.9} {:.10}",
                    ephdata::deltat::ut_to_tt(jd),
                    sky.ayanamsha(jd)
                )?;
                for b in bodies {
                    let e = sky.ecliptic(b, jd, Place::Apparent)?;
                    let a = sky.ecliptic(b, jd, Place::Astrometric)?;
                    write!(
                        out,
                        " {:.10} {:.10} {:.10} {:.10}",
                        e.lon, e.lat, a.lon, a.lat
                    )?;
                }
                writeln!(out, " {:.10}", sky.true_node(jd)?)?;
            }
        }
        "index" => {
            let sky = Sky::open(Path::new(&arg(&args, 2, "veph")?))?;
            let (from, to): (f64, f64) = (
                arg(&args, 4, "from_year")?.parse()?,
                arg(&args, 5, "to_year")?.parse()?,
            );
            let threads = args.get(6).map_or(Ok(2), |t| t.parse())?;
            let started = std::time::Instant::now();
            let bytes = index::build(&sky, jd_of_year(from), jd_of_year(to), threads, &|d, n| {
                eprint!(
                    "\r{d}/{n} stretches, {:.0}s",
                    started.elapsed().as_secs_f64()
                );
            })?;
            eprintln!();
            index::write(Path::new(&arg(&args, 3, "out")?), &bytes)?;
            let idx = index::Index::from_bytes(bytes)?;
            println!(
                "{:.1} MB in {:.0}s",
                idx.size() as f64 / 1e6,
                started.elapsed().as_secs_f64()
            );
            for k in index::Kind::ALL {
                println!("{k:?}: {} events", idx.len(k));
            }
        }
        "analytic-fit" => {
            // The built-in series, fitted to the kernel: writes the Rust and TypeScript constants.
            let sky = Sky::open(Path::new(&arg(&args, 2, "veph")?))?;
            fit::run(
                &sky,
                Path::new(&arg(&args, 3, "out.rs")?),
                Path::new(&arg(&args, 4, "out.ts")?),
            )?;
        }
        "slice" => {
            // A smaller index for a window of years: what an app carries.
            let idx = index::Index::open(Path::new(&arg(&args, 2, "vidx")?))?;
            let (from, to): (f64, f64) = (
                arg(&args, 4, "from_year")?.parse()?,
                arg(&args, 5, "to_year")?.parse()?,
            );
            let bytes = idx.slice(jd_of_year(from), jd_of_year(to))?;
            index::write(Path::new(&arg(&args, 3, "out")?), &bytes)?;
            let cut = index::Index::from_bytes(bytes)?;
            println!("{:.2} MB", cut.size() as f64 / 1e6);
            for k in index::Kind::ALL {
                println!("{k:?}: {} events", cut.len(k));
            }
        }
        "sample" => {
            // Random events for the independent (Python / original JPL) check.
            let idx = index::Index::open(Path::new(&arg(&args, 2, "vidx")?))?;
            let n: usize = arg(&args, 3, "count")?.parse()?;
            let (a, b) = idx.coverage();
            let mut rng = Lcg(arg(&args, 4, "seed")?.parse()?);
            let per = n / 12;
            for kind in index::Kind::ALL {
                for _ in 0..per {
                    let jd = a + 5.0 + rng.next() * (b - a - 10.0);
                    if let Some(c) = idx.next_event(kind, jd) {
                        println!(
                            "{} {} {:.9} {:.9}",
                            kind as usize,
                            c.multiple,
                            c.jd,
                            ephdata::deltat::ut_to_tt(c.jd)
                        );
                    }
                }
            }
            for (g, graha) in index::Graha::ALL.iter().enumerate().take(5) {
                for _ in 0..per {
                    let jd = a + 5.0 + rng.next() * (b - a - 10.0);
                    if let Some((t, rashi)) = idx.next_series(index::Series::Ingress(*graha), jd) {
                        println!(
                            "{} {rashi} {t:.9} {:.9}",
                            20 + g,
                            ephdata::deltat::ut_to_tt(t)
                        );
                    }
                    if let Some((t, retro)) = idx.next_series(index::Series::Station(*graha), jd) {
                        println!(
                            "{} {retro} {t:.9} {:.9}",
                            30 + g,
                            ephdata::deltat::ut_to_tt(t)
                        );
                    }
                }
            }
        }
        "stations" => {
            // Every retrograde station in the index, for comparing two builds.
            let idx = index::Index::open(Path::new(&arg(&args, 2, "vidx")?))?;
            let (a, b) = idx.coverage();
            for (g, graha) in index::Graha::ALL.iter().enumerate().take(5) {
                for (t, retro) in idx.series_between(index::Series::Station(*graha), a, b) {
                    println!(
                        "{} {retro} {t:.9} {:.9}",
                        30 + g,
                        ephdata::deltat::ut_to_tt(t)
                    );
                }
            }
        }
        "check" => {
            let sky = Sky::open(Path::new(&arg(&args, 2, "veph")?))?;
            let idx = index::Index::open(Path::new(&arg(&args, 3, "vidx")?))?;
            let n: usize = arg(&args, 4, "count")?.parse()?;
            // How far either side of a boundary the flip must be seen, in milliseconds. 5 is
            // right for the present; far from it (beyond ~4000 CE, where delta-T is days) the
            // kernel evaluation itself is noisy to a few milliseconds, so use a looser one.
            let tolerance_ms: f64 = args.get(5).map_or(Ok(5.0), |t| t.parse())?;
            let (a, b) = idx.coverage();
            let mut rng = Lcg(99);
            let mut bad = 0usize;
            for kind in index::Kind::ALL {
                for _ in 0..n {
                    let jd = a + 5.0 + rng.next() * (b - a - 10.0);
                    let (Some(prev), Some(next)) =
                        (idx.prev_event(kind, jd), idx.next_event(kind, jd))
                    else {
                        continue;
                    };
                    let at = |t: f64| sky.sun_moon(t).map(|(s, m)| kind.multiple(s, m));
                    let ms = tolerance_ms / 86_400_000.0;
                    // nothing between the two boundaries; each flips where it says
                    let ok = at(jd)? == prev.multiple
                        && at(next.jd - ms)? == prev.multiple
                        && at(next.jd + ms)? == next.multiple
                        && at(prev.jd - ms)? != prev.multiple
                        && at(prev.jd + ms)? == prev.multiple;
                    if !ok {
                        bad += 1;
                        println!("BAD {kind:?} at {jd}: prev {prev:?} next {next:?}");
                    }
                }
            }
            println!(
                "checked {n} random instants per kind at +/-{tolerance_ms} ms: {bad} inconsistent"
            );
        }
        _ => return Err("commands: extract, index, dump, lon, sample, check".into()),
    }
    let _ = ut_to_et;
    Ok(())
}
