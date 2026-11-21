//! The closed-form lagna crossing on its own terms: the ascendant reads the target
//! at the answer, did not before it, and nothing earlier crossed it.

use astronomy::surya_siddhanta::{ascendant, next_ascendant_crossing, next_lagna_change};

fn unit(x: &mut u64) -> f64 {
    *x ^= *x << 13;
    *x ^= *x >> 7;
    *x ^= *x << 17;
    #[expect(clippy::cast_precision_loss, reason = "uniform fraction")]
    let u = (*x >> 11) as f64 / (1_u64 << 53) as f64;
    u
}

/// Whether the sidereal ascendant at `t` has just reached `target` (within a quarter turn past it).
fn at_or_past(t: f64, lat: f64, lon: f64, target: f64) -> bool {
    (ascendant(t, lat, lon) - target).rem_euclid(360.0) < 90.0
}

#[test]
fn the_ascendant_reaches_the_target_at_the_answer() {
    let mut x: u64 = 0xA24B_AED4_963E_E407;
    for _ in 0..800 {
        let jd = 600_000.0 + unit(&mut x) * 2_000_000.0;
        let (lat, lon) = (-62.0 + unit(&mut x) * 124.0, -180.0 + unit(&mut x) * 360.0);
        let target = unit(&mut x) * 360.0;
        let t = next_ascendant_crossing(jd, lat, lon, target).expect("the point rises");
        assert!(
            t > jd && t < jd + 1.01,
            "within a sidereal day: {t} after {jd}"
        );
        assert!(
            at_or_past(t, lat, lon, target),
            "reads the target at {t} (lat {lat}, target {target})"
        );
        assert!(
            !at_or_past(t - 6e-4, lat, lon, target),
            "had not reached it 52 s earlier (lat {lat}, target {target})"
        );
        // Nothing earlier: no upward crossing of the target between the start and the answer.
        let offset = |at: f64| {
            let d = (ascendant(at, lat, lon) - target).rem_euclid(360.0);
            if d > 180.0 { d - 360.0 } else { d }
        };
        let mut at = jd;
        let mut before = offset(at);
        while at < t - 6e-4 {
            at += 1.0 / 144.0;
            let now = offset(at.min(t - 6e-4));
            assert!(
                !(before < 0.0 && now >= 0.0 && before > -90.0 && now < 90.0),
                "crossed the target before {t}, around {at}"
            );
            before = now;
        }
    }
}

#[test]
fn the_next_sign_change_enters_the_next_sign() {
    let mut x: u64 = 0x1234_5678_9ABC_DEF1;
    for _ in 0..400 {
        let jd = 2_400_000.0 + unit(&mut x) * 100_000.0;
        let (lat, lon) = (-50.0 + unit(&mut x) * 100.0, unit(&mut x) * 360.0);
        let now = (ascendant(jd, lat, lon) / 30.0).floor();
        let t = next_lagna_change(jd, lat, lon).expect("changes");
        let (before, after) = (
            (ascendant(t - 3e-4, lat, lon) / 30.0).floor(),
            (ascendant(t + 3e-4, lat, lon) / 30.0).floor(),
        );
        assert_eq!(before, now, "still in the starting sign shortly before {t}");
        assert_eq!(
            after,
            (now + 1.0).rem_euclid(12.0),
            "in the next sign shortly after {t}"
        );
    }
}

#[test]
fn a_point_that_never_rises_is_none() {
    // Far north in the text's frame, part of the ecliptic never rises.
    let none = (0..360)
        .filter(|d| next_ascendant_crossing(2_460_000.0, 80.0, 85.0, f64::from(*d)).is_none())
        .count();
    assert!(
        none > 0,
        "some of the ecliptic never rises at 80 degrees north"
    );
}
