//! Vastu: the zone-use reference data and room index (`services/vastu/`), the
//! compass-zone sketch (`engine/vastu/sketch.py`) and the full house-plan engine
//! (`engine/vastu/layout.py` and friends), ported one function for one function.
//!
//! Every float follows the Python server: Python's `round` is half to even, `max()`
//! and `min()` keep the first of equal items, and lists keep Python's order.

pub mod data;
mod geometry;
pub mod house_plan;
mod plan;
pub mod sketch;
mod zones;

pub use data::{Rules, RulesError};
