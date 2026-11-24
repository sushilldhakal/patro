//! Astronomy for Vedic Patro: graha positions and everything derived from them.
//!
//! Layers, bottom up:
//! - [`position`]: one [`position::Ephemeris`] trait; the Surya Siddhanta
//!   ([`surya_siddhanta`], the patro's default) and drik (feature `drik`) behind it.
//! - [`angles`]: the angas as one table of (angle, span).
//! - [`solver`]: a bracketed secant that finds when an angle reaches a value.
//! - [`yearly`] and [`events`]: every anga boundary, generated once per chunk of
//!   time and read back in O(log n); the source of truth the calendar consumes.
//! - [`cache`]: bounded O(1) in-memory caches.
//!
//! [`engine`] keeps the primitives the panchanga builders call directly.

pub mod angles;
pub mod cache;
pub mod drik;
mod drik_lagna;
pub mod engine;
pub mod events;
pub mod position;
pub mod solver;
pub mod surya_siddhanta;
pub mod system;
pub mod yearly;

pub use drik::DrikSky;
pub use system::{System, install_surya_index, surya_index};
