//! Which lunations are adhik (before or after a kshaya) and which is the kshaya, for the two
//! years the owner described (BS 2039 and 2085).

use panchanga::daily::Location;
use patro::festivals::month_kinds_payload;

fn kinds(bs_year: i32) -> Vec<(String, String, String)> {
    let payload = month_kinds_payload(bs_year, &Location::kathmandu()).expect("payload");
    payload["lunations"]
        .as_array()
        .expect("lunations")
        .iter()
        .map(|l| {
            (
                l["kind"].as_str().unwrap_or_default().to_owned(),
                l["month_name"].as_str().unwrap_or_default().to_owned(),
                l["lost_month_name"].as_str().unwrap_or_default().to_owned(),
            )
        })
        .collect()
}

#[test]
fn bs_2039_samsarpa_ashwin_kshaya_magh_malimlucha_phalgun() {
    assert_eq!(
        kinds(2039),
        vec![
            ("adhik_samsarpa".into(), "Ashwin".into(), String::new()),
            ("kshaya".into(), "Poush".into(), "Magh".into()),
            ("adhik_malimlucha".into(), "Falgun".into(), String::new()),
        ]
    );
}

#[test]
fn bs_2085_samsarpa_kartik_kshaya_poush_malimlucha_chaitra() {
    assert_eq!(
        kinds(2085),
        vec![
            ("adhik_samsarpa".into(), "Kartik".into(), String::new()),
            ("kshaya".into(), "Mangsir".into(), "Poush".into()),
            ("adhik_malimlucha".into(), "Chaitra".into(), String::new()),
        ]
    );
}

#[test]
fn an_adhik_far_from_any_kshaya_is_an_ordinary_year_adhik() {
    // BS 2080 has an adhik Shrawan with no kshaya near it.
    let found = kinds(2080);
    assert_eq!(found.len(), 1, "{found:?}");
    assert_eq!(found[0].0, "adhik_ordinary_year");
}
