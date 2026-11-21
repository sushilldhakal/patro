//! Sankranti brackets from the event engine against the full day-by-day scan.

use calendar::{find_sankranti_after_jd, find_sankranti_after_jd_scan};

#[test]
fn every_target_from_many_starts_matches_the_scan() {
    let mut x: u64 = 0x2545_F491_4F6C_DD1D;
    for _ in 0..600 {
        x ^= x << 13;
        x ^= x >> 7;
        x ^= x << 17;
        #[expect(clippy::cast_precision_loss, reason = "uniform fraction")]
        let jd = 1_000_000.0 + (x >> 11) as f64 / (1_u64 << 53) as f64 * 1_600_000.0;
        let target = u32::try_from(x % 12).expect("below 12");
        for (rashi, days) in [
            (target, 35),
            ((target + 1) % 12, 35),
            ((target + 6) % 12, 400),
        ] {
            assert_eq!(
                find_sankranti_after_jd(rashi, jd, days).map(f64::to_bits),
                find_sankranti_after_jd_scan(rashi, jd, days).map(f64::to_bits),
                "rashi {rashi} after {jd}"
            );
        }
    }
}

#[test]
fn starts_on_a_sankranti_match_the_scan() {
    for k in 0..200 {
        let jd = 2_450_000.0 + f64::from(k) * 9.3;
        let Some(at) = find_sankranti_after_jd_scan(k % 12, jd, 400) else {
            continue;
        };
        for offset in [-1e-6, 0.0, 1e-9, 1e-6] {
            for rashi in [k % 12, (k + 1) % 12] {
                assert_eq!(
                    find_sankranti_after_jd(rashi, at + offset, 35).map(f64::to_bits),
                    find_sankranti_after_jd_scan(rashi, at + offset, 35).map(f64::to_bits),
                    "rashi {rashi} at {}",
                    at + offset
                );
            }
        }
    }
}
