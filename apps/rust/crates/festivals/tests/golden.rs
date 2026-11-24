//! Festival lists against the production Python festival engine.

use std::sync::LazyLock;

use festivals::{festival_location, festivals_for_day, generate_bs_festivals, generate_festivals};
use panchanga::daily::Location;
use serde_json::Value;
use timescale::{CivilDay, Zone};

static GOLDEN: LazyLock<Value> = LazyLock::new(|| {
    serde_json::from_str(include_str!("fixtures/festival_golden.json"))
        .expect("golden file is valid JSON")
});

fn location(v: &Value) -> Location {
    Location {
        system: astronomy::System::SuryaSiddhanta,
        lat: v["lat"].as_f64().expect("lat"),
        lon: v["lon"].as_f64().expect("lon"),
        zone: Zone::get(v["timezone"].as_str().expect("tz")).expect("zone"),
        name: v["name"].as_str().expect("name").to_owned(),
        city_id: v["city_id"].as_i64(),
    }
}

fn year(v: &Value) -> i32 {
    i32::try_from(v.as_i64().expect("year")).expect("fits")
}

/// First differing row, for a readable failure.
fn compare(what: &str, got: &[Value], want: &Value) {
    let want = want.as_array().expect("list");
    for (i, (g, w)) in got.iter().zip(want).enumerate() {
        assert_eq!(
            serde_json::to_string(g).expect("json"),
            serde_json::to_string(w).expect("json"),
            "{what} row {i}"
        );
    }
    let ids = |l: &mut dyn Iterator<Item = &Value>| {
        l.map(|f| f["id"].as_str().unwrap_or_default().to_owned())
            .collect::<Vec<_>>()
    };
    assert_eq!(
        got.len(),
        want.len(),
        "{what}: count; rust ids {:?} python ids {:?}",
        ids(&mut got.iter()),
        ids(&mut want.iter())
    );
}

/// The masa a kshaya lunation swallows, in the BS years the golden holds. Python (production)
/// drops that masa's lunar festivals; the owner's rule (`month_type_rules_v1.json`) moves them
/// into the lunation after the kshaya, which `month_type_rules.rs` checks against the dates the
/// owner stated. So these rows are left out of the Python comparison, on both sides.
const LOST_MASA: [(i32, &str); 2] = [(2039, "Magh"), (2085, "Poush")];

fn without_lost_masa(bs_year: i32, festivals: &[Value]) -> Vec<Value> {
    let lost = LOST_MASA
        .iter()
        .find(|(y, _)| *y == bs_year)
        .map(|(_, masa)| *masa);
    festivals
        .iter()
        .filter(|f| {
            let rule = festivals::rule(f["id"].as_str().unwrap_or_default());
            let is_lost = lost.is_some_and(|masa| {
                rule.get("type").and_then(Value::as_str) == Some("lunar")
                    && rule.get("lunar_month").and_then(Value::as_str) == Some(masa)
            });
            !is_lost
        })
        .cloned()
        .collect()
}

#[test]
fn bs_years_match() {
    for case in GOLDEN["bs_years"].as_array().expect("list") {
        let y = year(&case["bs_year"]);
        let loc = location(&case["location"]);
        let got = without_lost_masa(y, &generate_bs_festivals(y, &loc));
        let want = without_lost_masa(y, case["festivals"].as_array().expect("list"));
        compare(&format!("BS {y} {}", loc.name), &got, &Value::Array(want));
    }
}

#[test]
fn gregorian_years_match() {
    for case in GOLDEN["gregorian_years"].as_array().expect("list") {
        let y = year(&case["year"]);
        let loc = festival_location(&location(&case["location"]));
        compare(
            &format!("AD {y} {}", loc.name),
            &generate_festivals(y, &loc),
            &case["festivals"],
        );
    }
}

#[test]
fn days_match() {
    let all = generate_bs_festivals(2083, &Location::kathmandu());
    for case in GOLDEN["days"].as_array().expect("list") {
        let s = case["date"].as_str().expect("date");
        let mut p = s.splitn(3, '-').map(|x| x.parse::<u32>().expect("n"));
        let day = CivilDay::new(
            i32::try_from(p.next().expect("y")).expect("y"),
            p.next().expect("m"),
            p.next().expect("d"),
        );
        compare(s, &festivals_for_day(&all, day), &case["festivals"]);
    }
}
