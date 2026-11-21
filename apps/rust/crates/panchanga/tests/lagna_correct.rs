//! Lagna spans on their own terms: the spans tile sunrise to sunrise, each sign's
//! navamsha crossings are all listed, and none is made up.

use panchanga::daily::{Location, build_daily};
use timescale::CivilDay;

const PUSHKARA: [(f64, f64); 4] = [(7.0, 9.0), (3.0, 5.0), (6.0, 8.0), (1.0, 3.0)];
const NAVAMSHA: f64 = 30.0 / 9.0;

fn seconds(clock: &str) -> f64 {
    let mut parts = clock.split(':').map(|p| p.parse::<f64>().unwrap_or(0.0));
    parts.next().unwrap_or(0.0) * 3600.0
        + parts.next().unwrap_or(0.0) * 60.0
        + parts.next().unwrap_or(0.0)
}

#[test]
fn spans_tile_the_day_and_list_every_pushkara_crossing() {
    let location = Location::kathmandu();
    for k in 0..40 {
        let day = CivilDay::new(2026, 1, 1).add_days(k * 9);
        let payload = build_daily(day, &location).expect("builds");
        let spans = payload["lagna_spans"].as_array().expect("spans");
        assert_eq!(spans.len(), 12, "{day}: twelve signs between sunrises");
        for pair in spans.windows(2) {
            assert_eq!(
                pair[0]["end_time"], pair[1]["start_time"],
                "{day}: spans meet"
            );
            let (a, b) = (
                pair[0]["number"].as_u64().expect("number"),
                pair[1]["number"].as_u64().expect("number"),
            );
            assert_eq!(b, a % 12 + 1, "{day}: the next sign follows");
        }
        for span in spans {
            let number = usize::try_from(span["number"].as_u64().expect("number")).expect("fits");
            let (a, b) = PUSHKARA[(number - 1) % 4];
            let expected = [(a - 1.0) * NAVAMSHA, (b - 1.0) * NAVAMSHA];
            let start_degree = span["degree_in_rashi"].as_f64().expect("degree");
            let listed: Vec<f64> = span["pushkara_navamsha"]
                .as_array()
                .expect("list")
                .iter()
                .map(|h| h["degree"].as_f64().expect("degree"))
                .collect();
            for degree in expected {
                let rounded = (degree * 1e4).round() / 1e4;
                // A sign entered mid-span (the first one) has already passed its early degrees.
                let passed = start_degree > degree + 0.03;
                assert_eq!(
                    listed.contains(&rounded),
                    !passed,
                    "{day}: sign {number} at {degree:.4} (starts at {start_degree}), listed {listed:?}"
                );
            }
            assert!(listed.len() <= 2, "{day}: at most two crossings in a sign");
            // Each crossing falls inside the span's own hours.
            let (from, to) = (
                seconds(span["start_local_time"].as_str().expect("clock")),
                seconds(span["end_local_time"].as_str().expect("clock")),
            );
            for hit in span["pushkara_navamsha"].as_array().expect("list") {
                let at = seconds(hit["local_time"].as_str().expect("clock"));
                let inside = if from <= to {
                    from - 6.0 <= at && at <= to + 6.0
                } else {
                    at >= from - 6.0 || at <= to + 6.0
                };
                assert!(inside, "{day}: crossing {at} outside {from}..{to}");
            }
        }
    }
}
