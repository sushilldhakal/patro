//! Sankranti on its own terms: the Sun is in the new rashi at the entry and in the
//! old one a moment before.

use calendar::{find_sankranti_after_jd, sun_rashi_at_jd};

#[test]
fn the_sun_changes_rashi_exactly_at_the_entry() {
    for k in 0..400_u32 {
        let jd = 2_300_000.0 + f64::from(k) * 211.7;
        let target = (sun_rashi_at_jd(jd) + 1) % 12;
        let entry =
            find_sankranti_after_jd(target, jd, 40).expect("the next entry is within 40 days");
        assert!(entry > jd, "the entry is ahead of {jd}");
        assert_eq!(
            sun_rashi_at_jd(entry + 2e-8),
            target,
            "in {target} just after {entry}"
        );
        assert_eq!(
            sun_rashi_at_jd(entry - 2e-8),
            (target + 11) % 12,
            "in the old rashi just before"
        );
    }
}

#[test]
fn an_entry_far_beyond_the_reach_is_not_found() {
    let jd = 2_460_000.0;
    let target = (sun_rashi_at_jd(jd) + 6) % 12;
    assert!(
        find_sankranti_after_jd(target, jd, 10).is_none(),
        "six rashis ahead is out of a 10-day reach"
    );
}
