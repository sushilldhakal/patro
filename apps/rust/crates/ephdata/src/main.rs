//! `ephdata`: build and check the ephemeris files.
//!
//! ```text
//! ephdata extract <out.veph> <from_year> <to_year> <step_km> <kernel.bsp>...
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
    kernel::WANTED,
};

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
        "analytic-fit" => {
            // The built-in series, fitted to the kernel: writes the Rust and TypeScript constants.
            let sky = Sky::open(Path::new(&arg(&args, 2, "veph")?))?;
            // Optional `from_year to_year`: fit and report only that span (default: the kernel's).
            let years = match (args.get(5), args.get(6)) {
                (Some(a), Some(b)) => Some((a.parse()?, b.parse()?)),
                _ => None,
            };
            fit::run(
                &sky,
                Path::new(&arg(&args, 3, "out.rs")?),
                Path::new(&arg(&args, 4, "out.ts")?),
                years,
            )?;
        }
        _ => return Err("commands: extract, dump, lon, analytic-fit".into()),
    }
    let _ = ut_to_et;
    Ok(())
}
