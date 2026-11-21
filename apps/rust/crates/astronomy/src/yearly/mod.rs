//! Event tables built once per stretch of time and read back in O(log n).
//!
//! Anga boundaries are global: a tithi ends at the same instant everywhere, so one
//! table serves every city. Only rise and set depend on the observer; those are
//! memoized per day and place.

mod year_events;
mod year_sunrise;

pub use year_events::{CHUNK_DAYS, chunk};
pub use year_sunrise::rise_set_cached;
