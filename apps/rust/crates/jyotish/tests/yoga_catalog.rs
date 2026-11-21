//! `full_yoga_catalog` against Python on 4,000 random charts (`scripts/gen_yoga_golden.py`).

use jyotish::{
    Graha,
    chart::{ChartInputs, RawPlanet, ShadbalaFacts, build_chart},
    yogas::{full_yoga_catalog, yogas_api},
};
use serde_json::Value;
use timescale::{CivilDay, UtcInstant};

fn f(v: &Value) -> f64 {
    v.as_f64().expect("number")
}

#[test]
fn yoga_catalog_matches_python() {
    let golden: Value =
        serde_json::from_str(include_str!("fixtures/yoga_catalog.json")).expect("golden");
    let now = UtcInstant::from_utc(CivilDay::new(2026, 1, 1), 0, 0, 0, 0).expect("now");
    let mut failures = Vec::new();
    for (n, case) in golden.as_array().expect("cases").iter().enumerate() {
        let lons = case["lons"].as_array().expect("lons");
        let retro = case["retro"].as_array().expect("retro");
        let planets: [RawPlanet; 9] = std::array::from_fn(|i| RawPlanet {
            longitude: f(&lons[i]),
            retrograde: retro[i].as_bool().expect("bool"),
        });
        let mut sb: [ShadbalaFacts; 9] = Default::default();
        for (i, d) in case["dig"].as_array().expect("dig").iter().enumerate() {
            if let Some(dig) = d.as_f64() {
                sb[i] = ShadbalaFacts {
                    status: Some("ok".into()),
                    ratio: Some(1.0),
                    dig: Some(dig),
                };
            }
        }
        let chart = build_chart(
            &planets,
            &ChartInputs {
                lagna_lon: f(&case["lagna"]),
                shadbala: &sb,
                timeline: None,
                now,
                is_day: case["is_day"].as_bool(),
                gulika_lon: case["gulika"].as_f64(),
                mandi_lon: case["mandi"].as_f64(),
            },
        );
        let rows = full_yoga_catalog(&chart);
        let present: String = rows
            .iter()
            .map(|r| if r.present { '1' } else { '0' })
            .collect();
        let want = case["present"].as_str().expect("present");
        if present != want {
            let diffs: Vec<String> = present
                .chars()
                .zip(want.chars())
                .enumerate()
                .filter(|(_, (a, b))| a != b)
                .map(|(i, (a, _))| format!("{}={a}", rows.get(i).map_or("?", |r| r.key.as_str())))
                .collect();
            failures.push(format!(
                "chart {n}: len {} vs {}; {}",
                present.len(),
                want.len(),
                diffs.join(", ")
            ));
            continue;
        }
        let api = yogas_api(&rows);
        if let Some(want) = case.get("kula") {
            let got = api
                .as_array()
                .and_then(|a| a.iter().find(|r| r["key"] == "kulavardhana"))
                .map(|r| r["evaluation"].clone());
            if got.as_ref() != Some(want) {
                failures.push(format!(
                    "chart {n}: kulavardhana evaluation {got:?} vs {want}"
                ));
            }
        }
        for raja in case["raja"].as_array().expect("raja") {
            let at = usize::try_from(raja[0].as_u64().expect("index")).expect("index");
            let row = &api[at];
            if row["key"] != raja[1]
                || raja.get(2).is_some_and(|t| row["descEn"] != *t)
                || raja.get(3).is_some_and(|t| row["descNe"] != *t)
            {
                failures.push(format!("chart {n}: raja row {at} {row} vs {raja}"));
            }
        }
    }
    let _ = Graha::Sun;
    assert!(
        failures.is_empty(),
        "{} of {} charts differ:\n{}",
        failures.len(),
        golden.as_array().map_or(0, Vec::len),
        failures
            .iter()
            .take(30)
            .cloned()
            .collect::<Vec<_>>()
            .join("\n")
    );
}
