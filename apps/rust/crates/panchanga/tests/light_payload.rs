//! The light daily payload (what month and year rows read) is the full payload with
//! the expensive blocks left out: every key it has holds the same value, in the same
//! order, and the keys it drops are exactly the heavy ones.

use panchanga::daily::{Location, build_daily, build_daily_light};
use timescale::{CivilDay, Zone};

const HEAVY: [&str; 17] = [
    "choghadiya",
    "hora",
    "solar_corrections",
    "nivas_shool",
    "tarabalam",
    "tarabala_table",
    "rashifal",
    "chandrabala_table",
    "chandrabalam",
    "chandra_rashi_spans",
    "nakshatra_pada_spans",
    "planets",
    "planets_anchor",
    "lagna",
    "udaya_lagna",
    "panchaka_rahita",
    "lagna_spans",
];

fn places() -> Vec<Location> {
    let city = |lat: f64, lon: f64, zone: &str, name: &str| Location {
        lat,
        lon,
        zone: Zone::get(zone).expect("known zone"),
        name: name.to_owned(),
        city_id: None,
    };
    vec![
        Location::kathmandu(),
        city(40.71, -74.0, "America/New_York", "New York"),
        city(-33.87, 151.21, "Australia/Sydney", "Sydney"),
    ]
}

#[test]
fn light_keeps_every_shared_key_unchanged_and_drops_only_the_heavy_blocks() {
    for location in places() {
        for k in 0..12 {
            let day = CivilDay::new(2026, 1, 3).add_days(k * 29);
            let full = build_daily(day, &location).expect("full builds");
            let light = build_daily_light(day, &location).expect("light builds");
            let (full, light) = (
                full.tree().as_object().expect("object"),
                light.tree().as_object().expect("object"),
            );
            let dropped: Vec<&String> = full
                .keys()
                .filter(|key| !light.contains_key(*key))
                .collect();
            assert!(
                dropped.iter().all(|key| HEAVY.contains(&key.as_str())),
                "{day} {}: dropped only heavy blocks, dropped {dropped:?}",
                location.name
            );
            assert!(
                light.keys().all(|key| full.contains_key(key)),
                "{day}: nothing new"
            );
            let order: Vec<&String> = full.keys().filter(|key| light.contains_key(*key)).collect();
            assert_eq!(
                order,
                light.keys().collect::<Vec<_>>(),
                "{day}: same key order"
            );
            for (key, value) in light {
                if key == "muhurta" {
                    // The light muhurta has the periods and Abhijit, without the timing lists.
                    let (l, f) = (
                        value.as_object().expect("object"),
                        full["muhurta"].as_object().expect("object"),
                    );
                    for (name, part) in l {
                        assert_eq!(part, &f[name], "{day} {}: muhurta.{name}", location.name);
                    }
                    assert!(
                        !l.contains_key("auspicious_timings"),
                        "{day}: no timing lists"
                    );
                } else {
                    assert_eq!(value, &full[key], "{day} {}: {key}", location.name);
                }
            }
        }
    }
}
