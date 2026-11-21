//! The API's use cases, framework-free: what a route returns, before HTTP.
//!
//! A port of `services/panchanga/panchanga_api.py` (month grid), the daily and festival
//! use cases, and `app/era_middleware.py`'s response rendering.

pub mod at_time;
mod caches;
pub mod catalog;
mod catalog_documents;
pub mod date_key;
pub mod day;
pub mod era;
pub mod festivals;
pub mod month;
pub mod nepal_panchanga;
pub mod presentation;
pub mod reference;
pub mod sait;
pub mod seasons;
pub mod year;

pub use caches::{bs_year_festivals, gregorian_year_festivals};
