//! The daily panchanga of Julian and BCE days against Python's `build_daily_panchanga_civil`.
//!
//! The patro date comes from `calendar::locate_patro_day` and must equal the one
//! Python's `locate_patro_day_for_civil` found; the payload must match byte for byte.

#[path = "../../../tests/support/parity.rs"]
#[expect(dead_code, reason = "this test uses part of the shared comparator")]
mod parity;

use std::sync::LazyLock;

use panchanga::daily::{Location, build_daily_civil};
use serde_json::Value;
use timescale::{CivilDay, Zone};

static GOLDEN: LazyLock<Value> = LazyLock::new(|| {
    serde_json::from_str(include_str!("fixtures/daily_civil_golden.json"))
        .expect("golden file is valid JSON")
});

fn first_difference(path: &str, got: &Value, want: &Value) -> Option<String> {
    parity::value_difference(path, got, want)
}

fn int(v: &Value) -> i64 {
    v.as_i64().expect("integer")
}

#[test]
fn civil_daily_payloads_match_python_within_the_allowed_drift() {
    let cases = GOLDEN.as_array().expect("a list of days");
    let mut failures = Vec::new();
    for case in cases {
        let d = &case["date"];
        let day = CivilDay::new(
            i32::try_from(int(&d[0])).expect("year"),
            u32::try_from(int(&d[1])).expect("month"),
            u32::try_from(int(&d[2])).expect("day"),
        );
        let bs = calendar::locate_patro_day(day).unwrap_or_else(|e| panic!("{day}: {e}"));
        let want_bs = &case["bs"];
        assert_eq!(
            (i64::from(bs.year), i64::from(bs.month), i64::from(bs.day)),
            (int(&want_bs[0]), int(&want_bs[1]), int(&want_bs[2])),
            "{day}: patro date"
        );
        let loc = &case["location"];
        let location = Location {
            lat: loc["lat"].as_f64().expect("lat"),
            lon: loc["lon"].as_f64().expect("lon"),
            zone: Zone::get(loc["timezone"].as_str().expect("tz")).expect("known zone"),
            name: loc["name"].as_str().expect("name").to_owned(),
            city_id: loc["city_id"].as_i64(),
        };
        let got = build_daily_civil(day, &location, bs).unwrap_or_else(|e| panic!("{day}: {e}"));
        assert_eq!(
            got.as_object().map(serde_json::Map::len),
            Some(54),
            "{day}: every key"
        );
        if let Some(diff) = first_difference("", &got, &case["payload"]) {
            failures.push(format!("{day} {}: {diff}", location.name));
        }
    }
    assert!(
        failures.is_empty(),
        "{} days differ:\n{}",
        failures.len(),
        failures.join("\n")
    );
}
