//! Rise and set memoized per starting instant and place.
//!
//! A month view asks for each day's sunrise, its sunset and the next day's sunrise;
//! festival rules ask for the same days again and again. Every one of those is the
//! same deterministic search from the same local midnight, so it is computed once.

use std::sync::LazyLock;

use crate::{
    cache::Cache,
    surya_siddhanta::{Body, Crossing},
};

type Key = (Body, Crossing, u64, u64, u64, u64);

static RISE_SET: LazyLock<Cache<Key, Option<f64>>> = LazyLock::new(|| Cache::new(1 << 17));

/// `search(...)` for one body, crossing, start, place and horizon, computed once.
pub fn rise_set_cached(
    body: Body,
    crossing: Crossing,
    jd_start: f64,
    latitude: f64,
    longitude: f64,
    horizon: f64,
    search: impl FnOnce() -> Option<f64>,
) -> Option<f64> {
    let key = (
        body,
        crossing,
        jd_start.to_bits(),
        latitude.to_bits(),
        longitude.to_bits(),
        horizon.to_bits(),
    );
    RISE_SET.get_or_insert_with(key, search)
}
