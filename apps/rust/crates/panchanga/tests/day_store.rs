//! The persistent day store: a stored payload comes back exactly as computed.

use panchanga::daily::{Location, Precompute, build_daily, precompute_day, stored_day};
use timescale::{CivilDay, Zone};

#[test]
fn stored_days_round_trip_exactly() {
    let dir = std::env::temp_dir().join(format!("patro-day-store-{}", std::process::id()));
    let _ = std::fs::create_dir_all(&dir);
    let path = dir.join("days.sqlite");
    let _ = std::fs::remove_file(&path);
    // SAFETY: set before the store's first use, in this single-test binary.
    unsafe { std::env::set_var("PATRO_RS_PANCHANGA_CACHE", &path) };
    assert!(panchanga::store::enabled());

    let location = Location {
        system: astronomy::System::SuryaSiddhanta,
        lat: 27.7172,
        lon: 85.324,
        zone: Zone::kathmandu(),
        name: "Kathmandu".into(),
        city_id: Some(1_283_240),
    };
    for day in [
        CivilDay::new(2026, 3, 12),
        CivilDay::new(2026, 11, 1),
        CivilDay::new(1990, 5, 10),
    ] {
        // Computed now (and written to the store on the way).
        let computed = build_daily(day, &location).expect("day builds");
        let stored = stored_day(day, &location).expect("stored");
        assert_eq!(
            &stored,
            computed.tree(),
            "{day}: the stored payload reads back exactly"
        );
        assert_eq!(
            precompute_day(day, &location, Precompute::SkipStored),
            Ok(false),
            "{day} is already stored"
        );
        assert_eq!(precompute_day(day, &location, Precompute::Force), Ok(true));
        assert_eq!(stored_day(day, &location), Some(computed.tree().clone()));
    }
    let stats = panchanga::store::stats();
    assert_eq!(stats["rows"], 3);
    assert_eq!(stats["cities"], 1);
    let _ = std::fs::remove_dir_all(&dir);
}
