//! City lookups and location resolution against the production Python.

use std::sync::LazyLock;

use geography::{Cities, City, LocationQuery, resolve_location};
use serde_json::Value;

static GOLDEN: LazyLock<Value> = LazyLock::new(|| {
    serde_json::from_str(include_str!("fixtures/geography_golden.json"))
        .expect("golden file is valid JSON")
});

const DB: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/../../../api/data/cities.db");

/// The database, or `None` where it is not checked out (CI: cities.db is not in git).
fn cities() -> Option<Cities> {
    std::path::Path::new(DB).is_file().then(|| Cities::new(DB))
}

fn json_list(list: &[City]) -> Value {
    Value::Array(list.iter().map(City::to_json).collect())
}

#[test]
fn search_popular_and_nearest() {
    let Some(db) = cities() else { return };
    for case in GOLDEN["search"].as_array().expect("list") {
        let q = case[0].as_str().expect("query");
        assert_eq!(
            json_list(&db.search(q, 15, None, Some("NP")).expect("search")),
            case[1],
            "search {q}"
        );
    }
    assert_eq!(
        json_list(&db.popular().expect("popular")),
        GOLDEN["popular"],
        "popular"
    );
    for case in GOLDEN["nearest"].as_array().expect("list") {
        let (lat, lon) = (
            case[0].as_f64().expect("lat"),
            case[1].as_f64().expect("lon"),
        );
        let got = db
            .nearest(lat, lon, 1, 60.0)
            .expect("nearest")
            .map_or(Value::Null, |c| c.to_json());
        assert_eq!(got, case[2], "nearest {lat},{lon}");
    }
}

#[test]
fn resolve_matches() {
    let Some(db) = cities() else { return };
    for case in GOLDEN["resolve"].as_array().expect("list") {
        let q = &case[0];
        let query = LocationQuery {
            lat: q["lat"].as_f64(),
            lon: q["lon"].as_f64(),
            timezone: q["timezone"].as_str().map(str::to_owned),
            city: q["city"].as_str().map(str::to_owned),
            city_id: q["city_id"].as_i64(),
        };
        let got = resolve_location(&query, &db).expect("resolves").as_json();
        assert_eq!(got, case[1], "resolve {q}");
    }
}
