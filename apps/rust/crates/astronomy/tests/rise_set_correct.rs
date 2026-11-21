//! Rise and set on their own terms: the body's centre is on the horizon at the
//! answer, rising for a rise and setting for a set, and it is the first crossing.

use astronomy::surya_siddhanta::{Body, Crossing, altitude, next_rise_or_set};

fn check(body: Body, jd: f64, lat: f64, lon: f64, crossing: Crossing) -> bool {
    let Some(t) = next_rise_or_set(body, jd, lat, lon, crossing, 0.0) else {
        return false;
    };
    assert!(
        t > jd && t < jd + 1.6,
        "{body} within the search window: {t} after {jd}"
    );
    let (before, after) = (
        altitude(body, t - 3e-4, lat, lon),
        altitude(body, t + 3e-4, lat, lon),
    );
    match crossing {
        Crossing::Rise => assert!(
            before < 0.0 && after > 0.0,
            "{body} rising at {t}: {before} -> {after}"
        ),
        Crossing::Set => assert!(
            before > 0.0 && after < 0.0,
            "{body} setting at {t}: {before} -> {after}"
        ),
    }
    // The first crossing: none earlier between the start and the answer.
    let mut altitudes = Vec::new();
    let mut at = jd;
    while at < t - 3e-4 {
        altitudes.push(altitude(body, at, lat, lon));
        at += 1.0 / 144.0;
    }
    let earlier = altitudes
        .windows(2)
        .filter(|w| (w[0] < 0.0) != (w[1] < 0.0) && ((w[1] > w[0]) == (crossing == Crossing::Rise)))
        .count();
    assert_eq!(earlier, 0, "{body}: no earlier {crossing:?} before {t}");
    true
}

#[test]
fn bodies_cross_the_horizon_at_the_answer() {
    let mut x: u64 = 0xD1B5_4A32_D192_ED03;
    let mut unit = || {
        x ^= x << 13;
        x ^= x >> 7;
        x ^= x << 17;
        #[expect(clippy::cast_precision_loss, reason = "uniform fraction")]
        let u = (x >> 11) as f64 / (1_u64 << 53) as f64;
        u
    };
    let mut found = [0_u32; 3];
    for _ in 0..500 {
        let jd = 600_000.0 + unit() * 2_000_000.0;
        let (lat, lon) = (-62.0 + unit() * 124.0, -180.0 + unit() * 360.0);
        for crossing in [Crossing::Rise, Crossing::Set] {
            for (i, body) in [Body::Sun, Body::Moon, Body::Venus].into_iter().enumerate() {
                found[i] += u32::from(check(body, jd, lat, lon, crossing));
            }
        }
    }
    assert!(found[0] >= 990, "the Sun crosses almost always: {found:?}");
    assert!(
        found[1] >= 900,
        "the Moon crosses in most windows: {found:?}"
    );
}

#[test]
fn the_moon_rises_about_fifty_minutes_later_each_day() {
    let (lat, lon) = (27.7172, 85.324);
    let mut jd = 2_460_000.25;
    let mut previous =
        next_rise_or_set(Body::Moon, jd, lat, lon, Crossing::Rise, 0.0).expect("rises");
    for _ in 0..28 {
        jd = previous + 0.1;
        let next = next_rise_or_set(Body::Moon, jd, lat, lon, Crossing::Rise, 0.0).expect("rises");
        let gap_minutes = (next - previous) * 1440.0;
        assert!(
            (1380.0..=1530.0).contains(&gap_minutes),
            "{gap_minutes} minutes between moonrises"
        );
        previous = next;
    }
}
