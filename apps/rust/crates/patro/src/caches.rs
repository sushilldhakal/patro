//! Process-wide memos for results that never change for a (year, location).

use std::{
    collections::HashMap,
    sync::{Arc, LazyLock, Mutex},
};

use panchanga::daily::Location;
use serde_json::Value;

type Key = (i32, String);

static FESTIVALS: LazyLock<Mutex<HashMap<Key, Arc<[Value]>>>> = LazyLock::new(Mutex::default);
static GREGORIAN_FESTIVALS: LazyLock<Mutex<HashMap<Key, Arc<[Value]>>>> =
    LazyLock::new(Mutex::default);

/// `ObserverLocation.cache_key()` of the festival location.
fn location_key(location: &Location) -> String {
    format!(
        "{:.4}_{:.4}_{}",
        location.lat,
        location.lon,
        location.zone.name()
    )
}

/// A BS year's festivals at a location, computed once per process (`get_bs_festivals`).
///
/// # Panics
///
/// If the cache lock is poisoned (a thread panicked while holding it).
#[must_use]
pub fn bs_year_festivals(bs_year: i32, location: &Location) -> Arc<[Value]> {
    let key = (
        bs_year,
        location_key(&festivals::festival_location(location)),
    );
    if let Some(hit) = FESTIVALS.lock().expect("festival cache lock").get(&key) {
        return Arc::clone(hit);
    }
    let built: Arc<[Value]> = festivals::generate_bs_festivals(bs_year, location).into();
    let mut cache = FESTIVALS.lock().expect("festival cache lock");
    Arc::clone(cache.entry(key).or_insert(built))
}

/// A Gregorian year's festivals at a location, computed once per process (`get_festivals`):
/// the list a single day's festivals are read from (`festivals_on_date`).
///
/// # Panics
///
/// If the cache lock is poisoned (a thread panicked while holding it).
#[must_use]
pub fn gregorian_year_festivals(gregorian_year: i32, location: &Location) -> Arc<[Value]> {
    let festival_location = festivals::festival_location(location);
    let key = (gregorian_year, location_key(&festival_location));
    if let Some(hit) = GREGORIAN_FESTIVALS
        .lock()
        .expect("festival cache lock")
        .get(&key)
    {
        return Arc::clone(hit);
    }
    let built: Arc<[Value]> =
        festivals::generate_festivals(gregorian_year, &festival_location).into();
    let mut cache = GREGORIAN_FESTIVALS.lock().expect("festival cache lock");
    Arc::clone(cache.entry(key).or_insert(built))
}
