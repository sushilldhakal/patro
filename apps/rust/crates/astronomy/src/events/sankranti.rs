//! Sankrantis: the Sun entering a rashi, read from the event tables.

use crate::{angles::Anga, position::Ephemeris, solver::Crossing};

use super::{next_entry, prev_entry};

/// The first time after `jd` that the Sun enters rashi `rashi` (0 = Mesha).
#[must_use]
pub fn next_sankranti(eph: &(impl Ephemeris + ?Sized), rashi: u32, jd: f64) -> Crossing {
    next_entry(eph, Anga::Sankranti, rashi % 12, jd)
}

/// The last time at or before `jd` that the Sun entered rashi `rashi`.
#[must_use]
pub fn prev_sankranti(eph: &(impl Ephemeris + ?Sized), rashi: u32, jd: f64) -> Crossing {
    prev_entry(eph, Anga::Sankranti, rashi % 12, jd)
}
