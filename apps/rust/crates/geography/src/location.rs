//! The observer a request names (`resolve_location_from_query`).

use panchanga::daily::Location;
use timescale::Zone;

use crate::cities::{Cities, CitiesError, py_round};

/// The location query parameters every panchanga route accepts.
#[derive(Debug, Clone, Default)]
pub struct LocationQuery {
    /// `lat`.
    pub lat: Option<f64>,
    /// `lon`.
    pub lon: Option<f64>,
    /// `timezone`.
    pub timezone: Option<String>,
    /// `city` (a name to search).
    pub city: Option<String>,
    /// `city_id` (wins over `city`).
    pub city_id: Option<i64>,
}

/// Why a location could not be resolved: 400 for bad input, 503 when cities.db is missing.
#[derive(Debug, thiserror::Error)]
#[non_exhaustive]
pub enum LocationError {
    /// Bad request (unknown city, out-of-range coordinates, unknown zone).
    #[error("{0}")]
    Invalid(String),
    /// `cities.db` is missing or unreadable.
    #[error(transparent)]
    Cities(#[from] CitiesError),
}

fn is_nepal(lat: f64, lon: f64, country: Option<&str>) -> bool {
    country.is_some_and(|c| c.eq_ignore_ascii_case("NP"))
        || ((26.35..=30.45).contains(&lat) && (80.05..=88.20).contains(&lon))
}

fn snap_enabled() -> bool {
    std::env::var("SNAP_TO_NEAREST_CITY").map_or(true, |v| {
        !matches!(v.to_lowercase().as_str(), "0" | "false" | "no")
    })
}

fn env_or<T: std::str::FromStr>(name: &str, default: T) -> T {
    std::env::var(name)
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(default)
}

/// Resolve a request's observer: city lookup or nearest-town snapping, the 0.01° grid,
/// Nepal's zone for any point in Nepal, and Kathmandu when nothing is given.
///
/// # Errors
///
/// [`LocationError::Invalid`] for an unknown city or zone or out-of-range
/// coordinates; [`LocationError::Cities`] when `cities.db` cannot be read.
pub fn resolve_location(q: &LocationQuery, cities: &Cities) -> Result<Location, LocationError> {
    let (mut lat, mut lon, mut tz) = (q.lat, q.lon, q.timezone.clone());
    let mut name: Option<String> = None;
    let mut country: Option<String> = None;
    let mut city_id = q.city_id;
    if q.city_id.is_some() || q.city.as_deref().is_some_and(|c| !c.is_empty()) {
        let row = match q.city_id {
            Some(id) => cities.by_id(id)?,
            None => cities
                .search(q.city.as_deref().unwrap_or_default(), 1, None, Some("NP"))?
                .into_iter()
                .next(),
        };
        let Some(row) = row else {
            let label = q.city_id.map_or_else(
                || {
                    format!(
                        "city={}",
                        common::pyjson::py_repr_str(q.city.as_deref().unwrap_or_default())
                    )
                },
                |id| format!("city_id={id}"),
            );
            return Err(LocationError::Invalid(format!("City not found ({label})")));
        };
        city_id = Some(row.id);
        lat = lat.or(Some(row.lat));
        lon = lon.or(Some(row.lon));
        if tz.is_none() {
            tz = Some(
                row.timezone
                    .clone()
                    .filter(|t| !t.is_empty())
                    .unwrap_or_else(|| "Asia/Kathmandu".into()),
            );
        }
        name = Some(if row.ascii_name.is_empty() {
            row.name.clone()
        } else {
            row.ascii_name.clone()
        });
        country = Some(row.country);
    } else if let (true, Some(la), Some(lo)) = (snap_enabled(), q.lat, q.lon) {
        if let Some(snapped) = cities.nearest(
            la,
            lo,
            env_or("NEAREST_CITY_MIN_POPULATION", 1),
            env_or("NEAREST_CITY_MAX_KM", 60.0),
        )? {
            city_id = Some(snapped.id);
            lat = Some(snapped.lat);
            lon = Some(snapped.lon);
            if tz.is_none() {
                tz = Some(
                    snapped
                        .timezone
                        .clone()
                        .filter(|t| !t.is_empty())
                        .unwrap_or_else(|| "Asia/Kathmandu".into()),
                );
            }
            name = Some(if snapped.ascii_name.is_empty() {
                snapped.name.clone()
            } else {
                snapped.ascii_name.clone()
            });
            country = Some(snapped.country);
        }
    }
    finish(Observer {
        lat,
        lon,
        tz,
        name,
        country,
        city_id,
    })
}

/// What city lookup or snapping produced, before the shared range checks.
struct Observer {
    lat: Option<f64>,
    lon: Option<f64>,
    tz: Option<String>,
    name: Option<String>,
    country: Option<String>,
    city_id: Option<i64>,
}

/// The engine's own `resolve_location(lat, lon, timezone)`: raw coordinates on the
/// 0.01° grid with no city lookup and no nearest-town snapping (Kathmandu when all
/// three are absent).
///
/// # Errors
///
/// [`LocationError::Invalid`] for out-of-range coordinates or an unknown zone.
pub fn resolve_coordinates(
    lat: Option<f64>,
    lon: Option<f64>,
    tz: Option<String>,
) -> Result<Location, LocationError> {
    finish(Observer {
        lat,
        lon,
        tz,
        name: None,
        country: None,
        city_id: None,
    })
}

fn finish(o: Observer) -> Result<Location, LocationError> {
    let Observer {
        lat,
        lon,
        tz,
        name,
        country,
        city_id,
    } = o;
    if lat.is_none() && lon.is_none() && tz.is_none() {
        return Ok(Location::kathmandu());
    }
    let raw_lat = lat.unwrap_or(27.7172);
    let raw_lon = lon.unwrap_or(85.324);
    if !(-90.0..=90.0).contains(&raw_lat) {
        return Err(LocationError::Invalid(
            "lat must be between -90 and 90".into(),
        ));
    }
    if !(-180.0..=180.0).contains(&raw_lon) {
        return Err(LocationError::Invalid(
            "lon must be between -180 and 180".into(),
        ));
    }
    let (rlat, rlon) = (py_round(raw_lat, 2), py_round(raw_lon, 2));
    let zone_name = if is_nepal(rlat, rlon, country.as_deref()) {
        "Asia/Kathmandu".to_owned()
    } else {
        tz.clone().unwrap_or_else(|| "Asia/Kathmandu".into())
    };
    let zone = Zone::get(&zone_name)
        .map_err(|_| LocationError::Invalid(format!("Unknown observer timezone: {zone_name}")))?;
    let custom = name.is_none()
        && (lat.is_some() || lon.is_some() || tz.as_deref().is_some_and(|t| t != "Asia/Kathmandu"));
    let display = name.unwrap_or_else(|| {
        if custom {
            "custom".into()
        } else {
            "Kathmandu".into()
        }
    });
    Ok(Location {
        lat: rlat,
        lon: rlon,
        zone,
        name: display,
        city_id,
        // The request's siddhanta is set by the server once it has read the query.
        system: panchanga::System::SuryaSiddhanta,
    })
}
