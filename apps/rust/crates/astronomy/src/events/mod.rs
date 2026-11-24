//! The event engine: when each anga, rashi and sankranti begins, from cached tables.
//!
//! This is the single source of truth for astronomical boundaries. The calendar,
//! panchanga blocks, festivals and muhurta read events from here instead of each
//! searching for them again.

mod sankranti;

pub use sankranti::{next_sankranti, prev_sankranti};

use crate::{
    angles::Anga,
    position::Ephemeris,
    solver::Crossing,
    yearly::{CHUNK_DAYS, chunk},
};

#[expect(
    clippy::cast_possible_truncation,
    reason = "Julian Days over the chunk length fit an i64"
)]
fn chunk_of(jd: f64) -> i64 {
    (jd / CHUNK_DAYS).floor() as i64
}

/// How many empty chunks a lookup crosses before giving up (no positions).
const MAX_EMPTY_CHUNKS: i64 = 64;

const NONE: Crossing = Crossing {
    jd: f64::NAN,
    multiple: 0,
};

/// The first boundary of `anga` strictly after `jd` (`jd` NaN if none can be found).
#[must_use]
pub fn next_event(eph: &(impl Ephemeris + ?Sized), anga: Anga, jd: f64) -> Crossing {
    if !jd.is_finite() {
        return NONE;
    }
    for index in (0..MAX_EMPTY_CHUNKS).map(|k| chunk_of(jd) + k) {
        let table = chunk(eph, anga, index);
        let i = table.partition_point(|c| c.jd <= jd);
        if let Some(c) = table.get(i) {
            return *c;
        }
    }
    NONE
}

/// The last boundary of `anga` at or before `jd` (`jd` NaN if none can be found).
#[must_use]
pub fn prev_event(eph: &(impl Ephemeris + ?Sized), anga: Anga, jd: f64) -> Crossing {
    if !jd.is_finite() {
        return NONE;
    }
    for index in (0..MAX_EMPTY_CHUNKS).map(|k| chunk_of(jd) - k) {
        let table = chunk(eph, anga, index);
        let i = table.partition_point(|c| c.jd <= jd);
        if i > 0 {
            return table[i - 1];
        }
    }
    NONE
}

/// Every boundary of `anga` with `from < jd <= to`, in order.
#[must_use]
pub fn events_between(
    eph: &(impl Ephemeris + ?Sized),
    anga: Anga,
    from: f64,
    to: f64,
) -> Vec<Crossing> {
    let mut out = Vec::new();
    for index in chunk_of(from)..=chunk_of(to) {
        let table = chunk(eph, anga, index);
        out.extend(table.iter().filter(|c| from < c.jd && c.jd <= to));
    }
    out
}

/// The first boundary after `jd` at which `anga` enters span `multiple`.
#[must_use]
pub fn next_entry(eph: &(impl Ephemeris + ?Sized), anga: Anga, multiple: u32, jd: f64) -> Crossing {
    let mut at = jd;
    for _ in 0..anga.count() {
        let c = next_event(eph, anga, at);
        if c.multiple == multiple || c.jd.is_nan() {
            return c;
        }
        at = c.jd;
    }
    NONE
}

/// The last boundary at or before `jd` at which `anga` entered span `multiple`.
#[must_use]
pub fn prev_entry(eph: &(impl Ephemeris + ?Sized), anga: Anga, multiple: u32, jd: f64) -> Crossing {
    let mut at = jd;
    for _ in 0..anga.count() {
        let c = prev_event(eph, anga, at);
        if c.multiple == multiple || c.jd.is_nan() {
            return c;
        }
        at = c.jd - 1e-9;
    }
    NONE
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::position::SuryaSiddhanta;

    #[test]
    fn events_are_ordered_and_bracket_the_instant() {
        let eph = SuryaSiddhanta;
        for anga in Anga::ALL {
            for k in 0..40 {
                let jd = 2_460_000.25 + f64::from(k) * 3.7;
                let (prev, next) = (prev_event(&eph, anga, jd), next_event(&eph, anga, jd));
                assert!(prev.jd <= jd && jd < next.jd, "{anga:?} at {jd}");
                let index_before = anga.index(&eph.pos(next.jd - 1e-6));
                let index_after = anga.index(&eph.pos(next.jd + 1e-6));
                assert_ne!(index_before, index_after, "{anga:?} changes at {}", next.jd);
                assert_eq!(index_after, next.multiple, "{anga:?} enters its multiple");
            }
        }
    }

    #[test]
    fn a_year_of_tithis_is_about_371() {
        let n = events_between(&SuryaSiddhanta, Anga::Tithi, 2_460_000.0, 2_460_365.25).len();
        assert!((368..=375).contains(&n), "{n} tithis");
    }
}
