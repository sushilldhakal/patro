//! `patro::date_key` against Python's `engine/calendar/date_keys.py` (`scripts/gen_date_key_golden.py`).

use patro::date_key::{civil_day_for_date_key, greg_day_for_date_key, parse_date_key};
use serde_json::{Value, json};
use timescale::CivilDay;

fn day(d: CivilDay) -> Value {
    json!({"day": [d.year, d.month, d.day]})
}

#[test]
fn date_keys_match_python() {
    let cases: Vec<Value> = serde_json::from_str(include_str!("fixtures/date_key_golden.json"))
        .expect("fixture parses");
    let mut failures = Vec::new();
    for case in &cases {
        let key = case["key"].as_str().expect("key");
        let era = case["era"].as_str().expect("era");
        let parse = match parse_date_key(key, era) {
            Ok(jd) => json!({"jd": jd}),
            Err(e) => json!({"err": e}),
        };
        let greg = match greg_day_for_date_key(key, era) {
            Ok(d) => day(d),
            Err(e) => json!({"err": e}),
        };
        let civil = civil_day_for_date_key(key, era).map_or(Value::Null, day);
        for (name, got) in [("parse", parse), ("greg", greg), ("civil", civil)] {
            if got != case[name] {
                failures.push(format!(
                    "{key:?} {era:?} {name}: rust {got} python {}",
                    case[name]
                ));
            }
        }
    }
    assert!(
        failures.is_empty(),
        "{} mismatches:\n{}",
        failures.len(),
        failures[..failures.len().min(30)].join("\n")
    );
}
