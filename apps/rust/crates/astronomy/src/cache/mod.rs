//! In-memory caches for computed astronomy: O(1) to read back, bounded in size.
//!
//! Persistent storage is left to the layers above (the response cache and the
//! precomputed day store): a year of events recomputes in about a millisecond,
//! faster than reading it back from disk, so this crate stays free of I/O.

mod memory;

pub use memory::Cache;
