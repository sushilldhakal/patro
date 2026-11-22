//! `System::Drik` against the solver path and against its own definitions: the index is
//! read through the system, rise and set sit on their horizon, the ascendant reaches the
//! degree asked for, and the frames agree with the text where both are right.
//!
//! Needs the pilot files: set `PATRO_RS_EPHDATA` to a folder holding `kernel.veph` and
//! `events.vidx`. Skipped without it.

use std::{path::PathBuf, sync::Arc};

use astronomy::{
    DrikSky, System,
    angles::Anga,
    events::next_event,
    surya_siddhanta::{Body, Crossing},
};
use ephdata::{Index, Sky};

fn systems() -> Option<(System, System)> {
    let dir = PathBuf::from(std::env::var_os("PATRO_RS_EPHDATA")?);
    let sky = Arc::new(Sky::open(&dir.join("kernel.veph")).ok()?);
    let index = Arc::new(Index::open(&dir.join("events.vidx")).ok()?);
    let leak = |s: DrikSky| System::Drik(Box::leak(Box::new(s)));
    Some((
        leak(DrikSky::new(Arc::clone(&sky), Some(index))),
        leak(DrikSky::new(sky, None)),
    ))
}

const JD_2026_11_22: f64 = 2_461_366.5;
const KATHMANDU: (f64, f64) = (27.7172, 85.324);

#[test]
fn the_system_reads_the_index_the_solver_would_find() {
    let Some((indexed, solved)) = systems() else {
        eprintln!("PATRO_RS_EPHDATA not set: skipped");
        return;
    };
    for anga in [Anga::Tithi, Anga::Nakshatra, Anga::Yoga, Anga::Karana] {
        for k in 0..40 {
            let jd = JD_2026_11_22 + f64::from(k) * 9.37;
            let (i, s) = (
                next_event(&indexed, anga, jd),
                next_event(&solved, anga, jd),
            );
            assert_eq!(i.multiple, s.multiple, "{anga:?} at {jd}");
            assert!(
                (i.jd - s.jd).abs() < 1e-6,
                "{anga:?} at {jd}: {} s",
                (i.jd - s.jd).abs() * 86_400.0
            );
        }
    }
}

#[test]
fn rise_and_set_sit_on_the_horizon() {
    let Some((system, _)) = systems() else {
        return;
    };
    let places = [
        KATHMANDU,
        (40.7128, -74.006),
        (-33.8688, 151.2093),
        (64.1466, -21.9426),
    ];
    for (lat, lon) in places {
        for day in 0..30 {
            let start = JD_2026_11_22 - 5.75 - lon / 360.0 + f64::from(day) * 11.0;
            for crossing in [Crossing::Rise, Crossing::Set] {
                let Some(t) = system.next_rise_or_set(Body::Sun, start, lat, lon, crossing) else {
                    continue;
                };
                assert!(t > start && t < start + 1.6, "{lat} {day}: {t} vs {start}");
                let alt = system.altitude(Body::Sun, t, lat, lon);
                assert!(
                    (alt + 0.8333).abs() < 2e-3,
                    "{lat},{lon} day {day} {crossing:?}: altitude {alt}"
                );
            }
        }
    }
}

#[test]
fn the_first_crossing_is_the_first_one() {
    let Some((system, _)) = systems() else {
        return;
    };
    let (lat, lon) = KATHMANDU;
    for body in [Body::Sun, Body::Moon] {
        for day in 0..24 {
            let start = JD_2026_11_22 - 0.25 + f64::from(day) * 1.07;
            let Some(t) = system.next_rise_or_set(body, start, lat, lon, Crossing::Rise) else {
                continue;
            };
            // Brute force: the altitude never crosses upward before `t` (to a minute).
            // The Sun's horizon is its refracted upper limb, the Moon's adds its parallax.
            let h0 = match body {
                Body::Moon => {
                    let (_, _, km) = system.drik().expect("drik").equatorial(body, t);
                    0.7275 * (6378.14 / km).asin().to_degrees() - 0.5667
                }
                _ => -0.8333,
            };
            let h = |jd: f64| system.altitude(body, jd, lat, lon) - h0;
            let mut jd = start;
            let mut prev = h(jd);
            let mut first = None;
            while jd < start + 1.6 {
                jd += 1.0 / 1440.0;
                let now = h(jd);
                if prev < 0.0 && now >= 0.0 && first.is_none() {
                    first = Some(jd);
                }
                prev = now;
            }
            let first = first.expect("a crossing in 1.6 days");
            assert!(
                (first - t).abs() < 4.0 / 1440.0,
                "{body:?} day {day}: {} min",
                (first - t) * 1440.0
            );
        }
    }
}

#[test]
fn the_ascendant_reaches_the_degree_asked_for() {
    let Some((system, _)) = systems() else {
        return;
    };
    let (lat, lon) = KATHMANDU;
    for k in 0..48 {
        let from = JD_2026_11_22 + f64::from(k) * 0.37;
        let target = f64::from(k * 7 % 360) + 0.25;
        let t = system
            .next_ascendant_crossing(from, lat, lon, target)
            .expect("a crossing at 27°N");
        assert!(t > from && t < from + 1.01, "{k}: {}", t - from);
        let asc = system.ascendant(t, lat, lon);
        let miss = (asc - target + 540.0).rem_euclid(360.0) - 180.0;
        assert!(miss.abs() < 2e-3, "{k}: ascendant {asc} for {target}");
    }
    // The lagna changes sign at a multiple of 30°.
    let change = system
        .next_lagna_change(JD_2026_11_22, lat, lon)
        .expect("a change");
    let asc = system.ascendant(change + 1e-5, lat, lon);
    assert!(
        asc.rem_euclid(30.0) < 0.1,
        "just past a sign edge, got {asc}"
    );
}

#[test]
fn greenwich_sidereal_time_at_j2000() {
    // GMST at 2000-01-01 12:00 UT1 is 280.460 618 37° (the IAU 2006 value to 1e-3°).
    let gmst = DrikSky::greenwich_sidereal_degrees(2_451_545.0);
    assert!((gmst - 280.460_6).abs() < 2e-3, "{gmst}");
}

#[test]
fn the_equation_of_time_agrees_with_the_text() {
    let Some((system, _)) = systems() else {
        return;
    };
    for k in 0..24 {
        let jd = JD_2026_11_22 + f64::from(k) * 15.2;
        let drik = system.equation_of_time_days(jd) * 1440.0;
        let text = System::SuryaSiddhanta.equation_of_time_days(jd) * 1440.0;
        assert!(
            (drik - text).abs() < 4.0,
            "day {k}: drik {drik:.2} min, text {text:.2} min"
        );
    }
}

#[test]
fn outside_the_kernel_it_says_so() {
    let Some((system, _)) = systems() else {
        return;
    };
    assert!(system.supports_jd(JD_2026_11_22));
    assert!(!system.supports_jd(1_000_000.0), "before AD 1");
    assert!(!system.supports_jd(3_000_000.0), "after AD 2947");
    assert!(system.true_position(Body::Sun, 3_000_000.0).0.is_nan());
    assert_eq!(system.supported_years().map(|(a, _)| a), Some(1));
    assert!(
        System::SuryaSiddhanta.supports_jd(1_000_000.0),
        "the text answers anywhere"
    );
}

#[test]
fn stored_stations_are_the_planets_turning_points() {
    let Some((system, solved)) = systems() else {
        return;
    };
    for body in [
        Body::Mercury,
        Body::Venus,
        Body::Mars,
        Body::Jupiter,
        Body::Saturn,
    ] {
        let events = system
            .station_events(body, JD_2026_11_22, JD_2026_11_22 + 800.0)
            .expect("the index covers 2026");
        assert!(events.len() >= 2, "{body:?}: {events:?}");
        for pair in events.windows(2) {
            assert_ne!(
                pair[0].1, pair[1].1,
                "{body:?} alternates retrograde and direct"
            );
        }
        for (jd, retrograde) in events {
            // The longitude stops moving: over a minute either side it changes by far
            // less than a day's motion, and afterwards it runs the way the event says.
            let d = |t: f64| system.true_position(body, t).0;
            let slip = |a: f64, b: f64| (b - a + 540.0).rem_euclid(360.0) - 180.0;
            let around = slip(d(jd - 1.0 / 1440.0), d(jd + 1.0 / 1440.0)).abs();
            assert!(
                around < 2e-4,
                "{body:?} at {jd}: moved {around}° in two minutes"
            );
            let after = slip(d(jd + 2.0), d(jd + 4.0));
            assert_eq!(
                after < 0.0,
                retrograde,
                "{body:?} at {jd}: motion after is {after}"
            );
        }
    }
    // The text has no stored stations, and no index means none either.
    assert!(
        System::SuryaSiddhanta
            .station_events(Body::Mars, 0.0, 1.0)
            .is_none()
    );
    assert!(
        solved
            .station_events(Body::Mars, JD_2026_11_22, JD_2026_11_22 + 800.0)
            .is_none()
    );
}
