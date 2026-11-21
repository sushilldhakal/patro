//! The Rust port against the production Python module, case by case.
//!
//! `tests/fixtures/surya_siddhanta_golden.json` is written by
//! `apps/rust/scripts/gen_surya_siddhanta_golden.py` from
//! `apps/api/engine/astronomy/siddhanta/surya_siddhanta_math.py`.

use std::sync::LazyLock;

use astronomy::surya_siddhanta::{
    Body, Crossing, Direction, Eclipse, EclipseKind, LocalSolarEclipse, MeanBody, altitude,
    apsis_longitude, ascendant, ayanamsha, eclipse_measures, elongation, equation_of_time_days,
    equatorial, local_sidereal_degrees, mean_longitude, mean_sign_ingresses_since_kali,
    next_eclipse, next_rise_or_set, next_syzygy, node_longitude, solar_eclipse_local,
    true_longitude_and_speed, true_position,
};
use serde_json::Value;

static GOLDEN: LazyLock<Value> = LazyLock::new(|| {
    serde_json::from_str(include_str!("fixtures/surya_siddhanta_golden.json"))
        .expect("golden file is valid JSON")
});

/// Largest difference allowed for angles (degrees) and moments (days).
///
/// Python's `math.hypot` and the platform `hypot` can differ in the last bit, and an
/// iterative search can turn that into a few more; 1e-9 days is 86 microseconds.
const TOLERANCE: f64 = 1e-9;

/// Counts how many values match bit for bit and the largest difference seen.
#[derive(Debug, Default)]
struct Tally {
    exact: usize,
    total: usize,
    worst: f64,
}

impl Tally {
    fn check(&mut self, what: &str, got: f64, want: f64) {
        self.total += 1;
        if got.to_bits() == want.to_bits() {
            self.exact += 1;
            return;
        }
        let diff = (got - want).abs();
        self.worst = self.worst.max(diff);
        assert!(
            diff <= TOLERANCE,
            "{what}: rust {got:?} vs python {want:?} (diff {diff:e})"
        );
    }

    fn check_opt(&mut self, what: &str, got: Option<f64>, want: &Value) {
        match (got, want.as_f64()) {
            (Some(g), Some(w)) => self.check(what, g, w),
            (None, None) => {
                self.total += 1;
                self.exact += 1;
            }
            (g, _) => panic!("{what}: rust {g:?} vs python {want}"),
        }
    }

    fn report(&self, name: &str) {
        assert!(self.total > 0, "{name}: no cases ran");
        println!(
            "{name}: {}/{} bit-identical, worst diff {:e}",
            self.exact, self.total, self.worst
        );
    }
}

fn cases(name: &str) -> &'static [Value] {
    GOLDEN[name]
        .as_array()
        .unwrap_or_else(|| panic!("golden file has no {name}"))
}

fn f(v: &Value) -> f64 {
    v.as_f64().unwrap_or_else(|| panic!("not a number: {v}"))
}

fn body(v: &Value) -> Body {
    v.as_str()
        .and_then(|s| s.parse().ok())
        .unwrap_or_else(|| panic!("not a body: {v}"))
}

fn direction(v: &Value) -> Direction {
    if v.as_bool() == Some(true) {
        Direction::Backward
    } else {
        Direction::Forward
    }
}

#[test]
fn mean_apsis_and_node_longitudes() {
    let mut t = Tally::default();
    for c in cases("mean_longitude") {
        let key: MeanBody = c[0]
            .as_str()
            .and_then(|s| s.parse().ok())
            .expect("mean body");
        t.check(
            &format!("mean {c}"),
            mean_longitude(key, f(&c[1])),
            f(&c[2]),
        );
    }
    for c in cases("apsis_longitude") {
        t.check_opt(
            &format!("apsis {c}"),
            apsis_longitude(body(&c[0]), f(&c[1])),
            &c[2],
        );
    }
    for c in cases("node_longitude") {
        t.check_opt(
            &format!("node {c}"),
            node_longitude(body(&c[0]), f(&c[1])),
            &c[2],
        );
    }
    t.report("mean/apsis/node");
}

#[test]
fn true_positions_and_speeds() {
    let mut t = Tally::default();
    for c in cases("true_position") {
        let (lon, lat) = true_position(body(&c[0]), f(&c[1]));
        t.check(&format!("lon {c}"), lon, f(&c[2]));
        t.check(&format!("lat {c}"), lat, f(&c[3]));
    }
    for c in cases("true_longitude_and_speed") {
        let (lon, speed) = true_longitude_and_speed(body(&c[0]), f(&c[1]));
        t.check(&format!("lon {c}"), lon, f(&c[2]));
        t.check(&format!("speed {c}"), speed, f(&c[3]));
    }
    t.report("true position/speed");
}

#[test]
fn sign_ingresses_are_exact_integers() {
    for c in cases("mean_sign_ingresses_since_kali") {
        let key: MeanBody = c[0]
            .as_str()
            .and_then(|s| s.parse().ok())
            .expect("mean body");
        let want = c[2].as_i64().expect("integer");
        assert_eq!(
            mean_sign_ingresses_since_kali(key, f(&c[1])),
            want,
            "case {c}"
        );
    }
}

#[test]
fn frames() {
    let mut t = Tally::default();
    for c in cases("ayanamsha") {
        t.check(&format!("ayanamsha {c}"), ayanamsha(f(&c[0])), f(&c[1]));
    }
    for c in cases("equatorial") {
        let (ra, dec) = equatorial(f(&c[0]), f(&c[1]));
        t.check(&format!("ra {c}"), ra, f(&c[2]));
        t.check(&format!("dec {c}"), dec, f(&c[3]));
    }
    for c in cases("local_sidereal_degrees") {
        t.check(
            &format!("lst {c}"),
            local_sidereal_degrees(f(&c[0]), f(&c[1])),
            f(&c[2]),
        );
    }
    for c in cases("equation_of_time_days") {
        t.check(
            &format!("eot {c}"),
            equation_of_time_days(f(&c[0])),
            f(&c[1]),
        );
    }
    for c in cases("altitude") {
        t.check(
            &format!("alt {c}"),
            altitude(body(&c[0]), f(&c[1]), f(&c[2]), f(&c[3])),
            f(&c[4]),
        );
    }
    for c in cases("ascendant") {
        t.check(
            &format!("lagna {c}"),
            ascendant(f(&c[0]), f(&c[1]), f(&c[2])),
            f(&c[3]),
        );
    }
    t.report("frames");
}

#[test]
fn rise_and_set() {
    let mut t = Tally::default();
    for c in cases("next_rise_or_set") {
        let crossing = if c[4].as_bool() == Some(true) {
            Crossing::Rise
        } else {
            Crossing::Set
        };
        let got = next_rise_or_set(body(&c[0]), f(&c[1]), f(&c[2]), f(&c[3]), crossing, 0.0);
        // Python bisected to about a millisecond; the engine solves the crossing.
        // Same crossing, within 1e-8 days (0.86 ms).
        match (got, c[5].as_f64()) {
            (Some(g), Some(w)) => assert!((g - w).abs() <= 1e-8, "rise/set {c}: rust {g} vs {w}"),
            (g, w) => assert_eq!(g.is_some(), w.is_some(), "rise/set {c}"),
        }
        t.total += 1;
        t.exact += 1;
    }
    t.report("rise/set");
}

#[test]
fn syzygies_and_eclipse_measures() {
    let mut t = Tally::default();
    for c in cases("elongation") {
        t.check(&format!("elongation {c}"), elongation(f(&c[0])), f(&c[1]));
    }
    for c in cases("next_syzygy") {
        t.check(
            &format!("syzygy {c}"),
            next_syzygy(f(&c[0]), f(&c[1]), direction(&c[2])),
            f(&c[3]),
        );
    }
    for c in cases("eclipse_measures") {
        let m = eclipse_measures(f(&c[0]));
        let w = &c[1];
        for (name, got) in [
            ("sun", m.sun),
            ("moon", m.moon),
            ("shadow", m.shadow),
            ("relative", m.relative),
            ("parallax", m.parallax),
        ] {
            t.check(&format!("measures.{name} {c}"), got, f(&w[name]));
        }
    }
    t.report("syzygy/measures");
}

#[test]
fn eclipses() {
    let mut t = Tally::default();
    for c in cases("next_eclipse") {
        let kind = if c[1] == "lunar" {
            EclipseKind::Lunar
        } else {
            EclipseKind::Solar
        };
        let got = next_eclipse(f(&c[0]), kind, direction(&c[2]));
        let want = &c[3];
        let what = format!("eclipse {}", &c.to_string()[..60.min(c.to_string().len())]);
        match got {
            None => assert!(want.is_null(), "{what}: rust found none, python {want}"),
            Some(Eclipse::Solar(e)) => {
                assert_eq!(want["kind"], "solar", "{what}");
                assert_eq!(want["type"], e.eclipse_type.name(), "{what}");
                t.check(&what, e.max_jd, f(&want["max_jd"]));
            }
            Some(Eclipse::Lunar(e)) => {
                assert_eq!(want["kind"], "lunar", "{what}");
                assert_eq!(want["type"], e.eclipse_type.name(), "{what}");
                t.check(&what, e.max_jd, f(&want["max_jd"]));
                t.check(&what, e.magnitude, f(&want["magnitude"]));
                t.check_opt(&what, e.partial.map(|p| p.0), &want["partial_begin_jd"]);
                t.check_opt(&what, e.partial.map(|p| p.1), &want["partial_end_jd"]);
                t.check_opt(&what, e.total.map(|p| p.0), &want["total_begin_jd"]);
                t.check_opt(&what, e.total.map(|p| p.1), &want["total_end_jd"]);
                assert!(
                    want["penumbral_begin_jd"].is_null(),
                    "the text has no penumbra"
                );
            }
        }
    }
    for c in cases("solar_eclipse_local") {
        let got: Option<LocalSolarEclipse> = solar_eclipse_local(f(&c[0]), f(&c[1]), f(&c[2]));
        let w = &c[3];
        let what = format!("local {}", c[0]);
        let Some(e) = got else {
            assert_eq!(w, &serde_json::json!({"visible": false}), "{what}");
            continue;
        };
        assert_eq!(w["visible"], e.visible, "{what}");
        assert_eq!(w["local_type"], e.local_type.name(), "{what}");
        t.check(&what, e.local_max_jd, f(&w["local_max_jd"]));
        t.check_opt(&what, e.local_begin_jd, &w["local_begin_jd"]);
        t.check_opt(&what, e.local_end_jd, &w["local_end_jd"]);
        t.check(&what, e.local_magnitude, f(&w["local_magnitude"]));
    }
    t.report("eclipses");
}
