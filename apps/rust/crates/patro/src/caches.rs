//! Process-wide memos for results that never change for a (year, location), bounded so
//! a stream of new coordinates cannot grow memory without limit.

use std::sync::{Arc, LazyLock};

use panchanga::{daily::Location, memo::Memo};
use serde_json::Value;

type Key = (i32, String);

/// Festival year lists kept per memo: the popular cities across a few years. A year's
/// list is a few hundred kilobytes, so this caps each memo at well under 100 MB.
const FESTIVAL_CAPACITY: usize = 256;

static FESTIVALS: LazyLock<Memo<Key, [Value]>> = LazyLock::new(|| Memo::new(FESTIVAL_CAPACITY));
static GREGORIAN_FESTIVALS: LazyLock<Memo<Key, [Value]>> =
    LazyLock::new(|| Memo::new(FESTIVAL_CAPACITY));

/// `ObserverLocation.cache_key()` of the festival location.
fn location_key(location: &Location) -> String {
    format!(
        "{:.4}_{:.4}_{}",
        location.lat,
        location.lon,
        location.zone.name()
    )
}

/// A BS year's festivals at a location, memoized (`get_bs_festivals`).
#[must_use]
pub fn bs_year_festivals(bs_year: i32, location: &Location) -> Arc<[Value]> {
    let key = (
        bs_year,
        location_key(&festivals::festival_location(location)),
    );
    FESTIVALS.get_or_insert_with(&key, || {
        festivals::generate_bs_festivals(bs_year, location).into()
    })
}

/// A Gregorian year's festivals at a location, memoized (`get_festivals`): the list a
/// single day's festivals are read from (`festivals_on_date`).
#[must_use]
pub fn gregorian_year_festivals(gregorian_year: i32, location: &Location) -> Arc<[Value]> {
    let festival_location = festivals::festival_location(location);
    let key = (gregorian_year, location_key(&festival_location));
    GREGORIAN_FESTIVALS.get_or_insert_with(&key, || {
        festivals::generate_festivals(gregorian_year, &festival_location).into()
    })
}
