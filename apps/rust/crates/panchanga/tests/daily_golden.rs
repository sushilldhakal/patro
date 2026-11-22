//! The daily panchanga against the Python builder's real payloads.
//!
//! Every key the Rust builder emits must be in the Python payload, in the same order,
//! with an identical value (compared as serialized JSON).

#[path = "../../../tests/support/parity.rs"]
#[expect(dead_code, reason = "this test uses part of the shared comparator")]
mod parity;

use std::sync::LazyLock;

use panchanga::daily::{Location, build_daily};
use serde_json::Value;
use timescale::{CivilDay, Zone};

static GOLDEN: LazyLock<Value> = LazyLock::new(|| {
    serde_json::from_str(include_str!("fixtures/daily_golden.json"))
        .expect("golden file is valid JSON")
});

fn first_difference(path: &str, got: &Value, want: &Value) -> Option<String> {
    parity::value_difference(path, got, want)
}

#[test]
fn daily_payloads_match_python_within_the_allowed_drift() {
    let cases = GOLDEN.as_array().expect("a list of days");
    for case in cases {
        let date = case["date"].as_str().expect("date");
        let mut parts = date
            .splitn(3, '-')
            .map(|p| p.parse::<u32>().expect("number"));
        let (y, m, d) = (
            parts.next().expect("y"),
            parts.next().expect("m"),
            parts.next().expect("d"),
        );
        let loc = &case["location"];
        let location = Location {
            lat: loc["lat"].as_f64().expect("lat"),
            lon: loc["lon"].as_f64().expect("lon"),
            zone: Zone::get(loc["timezone"].as_str().expect("tz")).expect("known zone"),
            name: loc["name"].as_str().expect("name").to_owned(),
            city_id: loc["city_id"].as_i64(),
        };
        let day = CivilDay::new(i32::try_from(y).expect("year"), m, d);
        let daily = build_daily(day, &location).unwrap_or_else(|e| panic!("{date}: {e}"));
        let got = daily.tree();
        let full = case["payload"].as_object().expect("payload object");
        let keys: Vec<&String> = got.as_object().expect("object").keys().collect();
        let python_order: Vec<&String> = full.keys().filter(|k| keys.contains(k)).collect();
        assert_eq!(keys, python_order, "{date}: key order");
        let want = &Value::Object(
            keys.iter()
                .map(|k| ((*k).clone(), full[*k].clone()))
                .collect(),
        );
        if let Some(diff) = first_difference("", got, want) {
            panic!("{date} {}: {diff}", location.name);
        }
    }
    let daily = build_daily(CivilDay::new(2026, 11, 1), &Location::kathmandu()).expect("builds");
    let built = daily.tree();
    let n = built.as_object().map_or(0, serde_json::Map::len);
    println!(
        "{} daily payloads match python (times within the allowed drift) on {n} of 54 keys",
        cases.len()
    );
}
