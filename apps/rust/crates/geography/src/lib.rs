//! Cities and observers: GeoNames lookups in `cities.db` and the request's location.
//!
//! A port of `services/geography/cities_db.py` (lookup half) and
//! `services/geography/observer_location.py` + `engine/astronomy/location.py`
//! (`resolve_location_from_query`, `resolve_location`).

mod cities;
mod location;

pub use cities::{Cities, CitiesError, City, POPULAR_CITY_IDS};
pub use location::{LocationError, LocationQuery, resolve_coordinates, resolve_location};
