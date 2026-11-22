//! Sankranti: the moment the sidereal Sun enters a rashi, from the event engine.

use astronomy::{
    System,
    engine::sun_longitude,
    events::{next_sankranti, prev_sankranti},
};

/// The rashi 0–11 (Mesha … Meena) the sidereal Sun is in.
#[must_use]
#[expect(
    clippy::cast_possible_truncation,
    clippy::cast_sign_loss,
    reason = "longitude / 30 is in [0, 12]"
)]
pub fn sun_rashi_at_jd(system: System, jd: f64) -> u32 {
    (sun_longitude(system, jd) / 30.0) as u32 % 12
}

/// The Sun's entry into `target_rashi` (0 = Mesha) near `after_jd`, as a Julian Day.
///
/// With the Sun already in `target_rashi` that is the entry just behind `after_jd`;
/// otherwise the next one ahead. `max_days` is how far from `after_jd` the entry may
/// be (twelve times that when the Sun is not in the rashi before the target); `None`
/// if it is farther.
#[must_use]
pub fn find_sankranti_after_jd(
    system: System,
    target_rashi: u32,
    after_jd: f64,
    max_days: u32,
) -> Option<f64> {
    let eph = system;
    let before_target = (target_rashi + 11) % 12;
    let current = sun_rashi_at_jd(system, after_jd);
    let (entry, reach) = if current == target_rashi {
        (prev_sankranti(&eph, target_rashi, after_jd).jd, max_days)
    } else if current == before_target {
        (next_sankranti(&eph, target_rashi, after_jd).jd, max_days)
    } else {
        (
            next_sankranti(&eph, target_rashi, after_jd).jd,
            max_days * 12,
        )
    };
    (entry.is_finite() && (entry - after_jd).abs() <= f64::from(reach)).then_some(entry)
}
