//! The boundaries of every anga, generated incrementally in fixed chunks of time.

use std::sync::{Arc, LazyLock};

use crate::{
    angles::Anga,
    cache::Cache,
    position::Ephemeris,
    solver::{Crossing, next_crossing},
};

/// Length of one table chunk, in days. Small enough that a cold single-day request
/// pays well under a millisecond per anga; large enough that year views touch few.
pub const CHUNK_DAYS: f64 = 64.0;

type Key = (&'static str, Anga, i64);

static TABLES: LazyLock<Cache<Key, Arc<[Crossing]>>> = LazyLock::new(|| Cache::new(8192));

fn build(eph: &(impl Ephemeris + ?Sized), anga: Anga, index: i64) -> Arc<[Crossing]> {
    #[expect(
        clippy::cast_precision_loss,
        reason = "chunk numbers are far below 2^52"
    )]
    let start = index as f64 * CHUNK_DAYS;
    let end = start + CHUNK_DAYS;
    let angle = |jd: f64| anga.angle(&eph.pos(jd));
    std::iter::successors(
        Some(next_crossing(angle, anga.span(), anga.mean_rate(), start)),
        |prev| {
            Some(next_crossing(
                angle,
                anga.span(),
                anga.mean_rate(),
                prev.jd + 1e-6,
            ))
        },
    )
    .take_while(|c| c.jd < end)
    .collect()
}

/// The crossings of `anga` in chunk `index` (`[index × CHUNK_DAYS, (index + 1) × CHUNK_DAYS)`),
/// sorted by time; built on first use and cached.
#[must_use]
pub fn chunk(eph: &(impl Ephemeris + ?Sized), anga: Anga, index: i64) -> Arc<[Crossing]> {
    TABLES.get_or_insert_with((eph.name(), anga, index), || build(eph, anga, index))
}
