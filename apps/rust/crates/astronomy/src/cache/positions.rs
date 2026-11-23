//! Per-JD memo for true positions and ayanamsha.
//!
//! Positions are pure functions of `(system, body, jd)` (Surya Siddhanta is
//! pure arithmetic; drik is pure given the loaded kernel, which is immutable
//! once built), so repeated evaluations at the same JD are safe to memoize.
//! One daily panchanga request evaluates the Sun/Moon pair ~5 times at the
//! sunrise JD and the 8-graha table twice at the same three JDs
//! (`jd`, `jd +/- 0.5`); one kundali request evaluates the birth-JD table
//! three times. This memo collapses those repeats to hash lookups.
//!
//! The memo lives at the **backend** level — inside
//! `surya_siddhanta::true_position` / `ayanamsha` and
//! `DrikSky::true_position` / `ayanamsha` — not on `System`: the speed
//! computation (`true_longitude_and_speed`) calls the backend `true_position`
//! directly, three times per body, so a `System`-level memo would never see
//! those evaluations and the graha table would still pay full price.
//!
//! Rules, so a later reader does not "improve" this into a bug:
//! - Key on the **exact** JD bits. Never quantize: SS longitudes move in
//!   steps of ~10 s and the goldens compare bit-exactly.
//! - Only `(system, body, jd)` is keyed. Anything depending on observer
//!   latitude/longitude (`altitude`, `ascendant`, `equatorial`) is NOT
//!   memoized here; it benefits indirectly through the memoized calls inside.
//! - Non-finite JDs are never cached.
//! - The Drik part of the key is the sky address. Skies are leaked once at
//!   startup and never dropped, so an address is never reused for a
//!   different kernel in practice.
//! - Values never go stale (pure functions, immutable kernel), so eviction
//!   is purely a memory decision: the shared `Cache` bounds it.
//!
//! Capacities: one request's working set is ~24-50 position entries (8
//! bodies x 3 JDs, plus the Sun/Moon pair at a few JDs); 4096 covers ~100
//! concurrent in-flight requests. Each entry is ~56 bytes, so well under
//! 1 MB. Ayanamsha has one entry per distinct JD, so 1024 is ample.

use std::sync::LazyLock;

use crate::cache::Cache;

/// Key for a true position: (system key, body discriminant, JD bits).
pub(crate) type PosKey = (usize, u8, u64);

/// Key for an ayanamsha: (system key, JD bits).
pub(crate) type AyanKey = (usize, u64);

/// Memoized `(longitude, latitude)` per `(system, body, jd)`.
pub(crate) static POSITIONS: LazyLock<Cache<PosKey, (f64, f64)>> =
    LazyLock::new(|| Cache::new(4096));

/// Memoized ayanamsha per `(system, jd)`.
pub(crate) static AYANAMSHA: LazyLock<Cache<AyanKey, f64>> = LazyLock::new(|| Cache::new(1024));

/// The memoized position for `(system_key, body, jd)`, computing it with
/// `compute` (outside the cache lock) on a miss. Non-finite JDs bypass
/// the memo. Backend `true_position` implementations call this.
pub(crate) fn memo_position(
    system_key: usize,
    body: u8,
    jd_ut: f64,
    compute: impl FnOnce() -> (f64, f64),
) -> (f64, f64) {
    if !jd_ut.is_finite() {
        return compute();
    }
    POSITIONS.get_or_insert_with((system_key, body, jd_ut.to_bits()), compute)
}

/// The memoized ayanamsha for `(system_key, jd)`. Backend `ayanamsha`
/// implementations call this.
pub(crate) fn memo_ayanamsha(system_key: usize, jd_ut: f64, compute: impl FnOnce() -> f64) -> f64 {
    if !jd_ut.is_finite() {
        return compute();
    }
    AYANAMSHA.get_or_insert_with((system_key, jd_ut.to_bits()), compute)
}

#[cfg(test)]
mod tests {
    use crate::{System, surya_siddhanta::Body};

    #[test]
    fn memo_returns_identical_values_and_distinguishes_bodies() {
        let system = System::SuryaSiddhanta;
        let jd = 2_460_000.5;
        let sun = system.true_position(Body::Sun, jd);
        let sun_again = system.true_position(Body::Sun, jd);
        assert_eq!(
            sun.0.to_bits(),
            sun_again.0.to_bits(),
            "repeat Sun at the same JD is bit-identical"
        );
        assert_eq!(
            sun.1.to_bits(),
            sun_again.1.to_bits(),
            "repeat Sun latitude is bit-identical"
        );
        let moon = system.true_position(Body::Moon, jd);
        assert_ne!(
            moon.0.to_bits(),
            sun.0.to_bits(),
            "Moon and Sun at the same JD differ"
        );
        let sun_later = system.true_position(Body::Sun, jd + 0.5);
        assert_ne!(
            sun_later.0.to_bits(),
            sun.0.to_bits(),
            "Sun half a day later differs"
        );
        let ayan = system.ayanamsha(jd);
        assert_eq!(
            ayan.to_bits(),
            system.ayanamsha(jd).to_bits(),
            "repeat ayanamsha is bit-identical"
        );
    }
}
