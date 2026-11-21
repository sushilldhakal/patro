//! The angas and their boundaries against the Python server under the Surya Siddhanta.

#[path = "../../../tests/support/parity.rs"]
#[expect(dead_code, reason = "this test uses part of the shared comparator")]
mod parity;

use std::sync::LazyLock;

use panchanga::{
    karana, karana_end, karana_start, moon_pada_end, moon_rashi_end, nakshatra, nakshatra_end,
    nakshatra_start, sun_nakshatra_end, tithi, tithi_end, tithi_start, vara, yoga, yoga_end,
    yoga_start,
};
use serde_json::Value;
use timescale::{UtcInstant, Zone};

static GOLDEN: LazyLock<Value> = LazyLock::new(|| {
    serde_json::from_str(include_str!("fixtures/panchanga_golden.json"))
        .expect("golden file is valid JSON")
});

fn cases(name: &str) -> &'static [Value] {
    GOLDEN[name]
        .as_array()
        .unwrap_or_else(|| panic!("golden file has no {name}"))
}
fn f(v: &Value) -> f64 {
    v.as_f64().unwrap_or_else(|| panic!("not a number: {v}"))
}
fn n(v: &Value) -> u32 {
    u32::try_from(v.as_i64().unwrap_or_else(|| panic!("not an integer: {v}"))).expect("fits u32")
}
fn same(got: f64, want: &Value, what: &str) {
    assert_eq!(
        got.to_bits(),
        f(want).to_bits(),
        "{what}: rust {got:?} vs python {want}"
    );
}

#[test]
fn angas_match() {
    for c in cases("angas") {
        let jd = f(&c[0]);
        let (t, w) = (tithi(jd), &c[1]);
        assert_eq!(
            (t.number, t.display_number, t.paksha.name()),
            (
                n(&w["number"]),
                n(&w["display_number"]),
                w["paksha"].as_str().expect("paksha")
            ),
            "tithi {c}"
        );
        same(t.progress, &w["progress"], "tithi progress");
        same(t.elongation, &w["elongation"], "elongation");
        let (k, w) = (nakshatra(jd), &c[2]);
        assert_eq!(
            (k.number, k.pada, k.name()),
            (
                n(&w["number"]),
                n(&w["pada"]),
                w["name"].as_str().expect("name")
            ),
            "nakshatra {c}"
        );
        same(k.progress, &w["progress"], "nakshatra progress");
        let (y, w) = (yoga(jd), &c[3]);
        assert_eq!(
            (y.number, y.name()),
            (n(&w["number"]), w["name"].as_str().expect("name")),
            "yoga {c}"
        );
        same(y.progress, &w["progress"], "yoga progress");
        let (kr, w) = (karana(jd), &c[4]);
        assert_eq!(
            (kr.number, kr.name()),
            (n(&w["number"]), w["name"].as_str().expect("name")),
            "karana {c}"
        );
        same(kr.progress, &w["progress"], "karana progress");
    }
}

#[test]
fn vara_matches() {
    for c in cases("vara") {
        let zone = Zone::get(c[1].as_str().expect("zone")).expect("known zone");
        assert_eq!(vara(f(&c[0]), &zone).number, n(&c[2]), "vara {c}");
    }
}

#[test]
fn boundaries_land_within_the_allowed_drift() {
    for c in cases("finders") {
        let at: UtcInstant = c[1].as_str().expect("iso").parse().expect("parses");
        let got = match c[0].as_str().expect("name") {
            "tithi_end" => tithi_end(at),
            "tithi_start" => tithi_start(at),
            "nakshatra_end" => nakshatra_end(at),
            "nakshatra_start" => nakshatra_start(at),
            "yoga_end" => yoga_end(at),
            "yoga_start" => yoga_start(at),
            "karana_end" => karana_end(at),
            "karana_start" => karana_start(at),
            "moon_rashi_end" => moon_rashi_end(at),
            "moon_pada_end" => moon_pada_end(at),
            "sun_nakshatra_end" => sun_nakshatra_end(at),
            other => panic!("unknown finder {other}"),
        };
        let want = c[2].as_str().expect("iso");
        // Python searched a fixed window and answered with its edge when the
        // boundary lay beyond it (the Sun stays in a nakshatra for ~13 days, a
        // 30-hour window cannot hold its end). The engine finds the real boundary.
        let name = c[0].as_str().expect("name");
        let window_hours = match name {
            "moon_rashi_end" => 60,
            "moon_pada_end" => 8,
            _ => 30,
        };
        let edge = if name.ends_with("_start") {
            at.add_hours(-window_hours)
        } else {
            at.add_hours(window_hours)
        };
        if want.parse::<UtcInstant>().ok() == Some(edge) {
            let beyond = if name.ends_with("_start") {
                got <= edge
            } else {
                got >= edge
            };
            assert!(
                beyond,
                "{c}: rust {got} is inside the window python gave up at"
            );
            continue;
        }
        assert!(
            parity::text_close(&got.to_string(), want),
            "{c}: rust {got} vs python {want}"
        );
    }
}
