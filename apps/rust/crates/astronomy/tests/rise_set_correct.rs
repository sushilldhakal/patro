//! Sunrise on its own terms: the Sun's centre is on the horizon at the answer,
//! rising for a rise and setting for a set, and it is the first crossing.

use astronomy::surya_siddhanta::{Body, Crossing, altitude, next_rise_or_set};

#[test]
fn the_sun_crosses_the_horizon_at_the_answer() {
    let mut x: u64 = 0xD1B5_4A32_D192_ED03;
    let mut unit = || {
        x ^= x << 13;
        x ^= x >> 7;
        x ^= x << 17;
        #[expect(clippy::cast_precision_loss, reason = "uniform fraction")]
        let u = (x >> 11) as f64 / (1_u64 << 53) as f64;
        u
    };
    for _ in 0..600 {
        let jd = 600_000.0 + unit() * 2_000_000.0;
        let (lat, lon) = (-60.0 + unit() * 120.0, -180.0 + unit() * 360.0);
        for crossing in [Crossing::Rise, Crossing::Set] {
            let t = next_rise_or_set(Body::Sun, jd, lat, lon, crossing, 0.0).expect("it crosses");
            assert!(t > jd && t < jd + 1.6, "within the search window");
            let (before, after) = (
                altitude(Body::Sun, t - 3e-4, lat, lon),
                altitude(Body::Sun, t + 3e-4, lat, lon),
            );
            match crossing {
                Crossing::Rise => assert!(
                    before < 0.0 && after > 0.0,
                    "rising at {t}: {before} -> {after}"
                ),
                Crossing::Set => assert!(
                    before > 0.0 && after < 0.0,
                    "setting at {t}: {before} -> {after}"
                ),
            }
            // First crossing: a day-long dark or light spell cannot precede it.
            let mut altitudes = Vec::new();
            let mut at = jd;
            while at < t {
                altitudes.push(altitude(Body::Sun, at, lat, lon));
                at += 1.0 / 48.0;
            }
            let crossings = altitudes
                .windows(2)
                .filter(|w| {
                    (w[0] < 0.0) != (w[1] < 0.0) && ((w[1] > w[0]) == (crossing == Crossing::Rise))
                })
                .count();
            assert_eq!(crossings, 0, "no earlier {crossing:?} before {t}");
        }
    }
}
