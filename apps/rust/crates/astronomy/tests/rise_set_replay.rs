//! Solved-and-replayed rise/set against the full scan, across latitudes and eras.

use astronomy::surya_siddhanta::{Body, Crossing, next_rise_or_set, next_rise_or_set_scan};

#[test]
fn sun_rise_and_set_match_the_full_scan() {
    let mut x: u64 = 0xD1B5_4A32_D192_ED03;
    let mut next = || {
        x ^= x << 13;
        x ^= x >> 7;
        x ^= x << 17;
        #[expect(clippy::cast_precision_loss, reason = "uniform fraction")]
        let u = (x >> 11) as f64 / (1_u64 << 53) as f64;
        u
    };
    for _ in 0..4000 {
        let jd = 600_000.0 + next() * 2_000_000.0;
        let lat = -66.0 + next() * 132.0;
        let lon = -180.0 + next() * 360.0;
        for crossing in [Crossing::Rise, Crossing::Set] {
            let fast = next_rise_or_set(Body::Sun, jd, lat, lon, crossing, 0.0);
            let full = next_rise_or_set_scan(Body::Sun, jd, lat, lon, crossing, 0.0);
            assert_eq!(
                fast.map(f64::to_bits),
                full.map(f64::to_bits),
                "{crossing:?} jd {jd} lat {lat} lon {lon}"
            );
        }
    }
}

#[test]
fn moon_still_matches_the_full_scan() {
    for k in 0..300 {
        let jd = 2_450_000.0 + f64::from(k) * 1.37;
        for crossing in [Crossing::Rise, Crossing::Set] {
            assert_eq!(
                next_rise_or_set(Body::Moon, jd, 27.7, 85.3, crossing, 0.0).map(f64::to_bits),
                next_rise_or_set_scan(Body::Moon, jd, 27.7, 85.3, crossing, 0.0).map(f64::to_bits),
                "{crossing:?} {jd}"
            );
        }
    }
}
