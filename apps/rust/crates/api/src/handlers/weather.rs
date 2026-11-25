//! Shared weather forecast endpoint.

use axum::{
    Json,
    extract::{Query, State},
};
use serde::Deserialize;
use serde_json::{Value, json};

use common::{AppError, AppResult};

use crate::state::AppState;

#[derive(Debug, Deserialize)]
/// Query parameters for a nearby-city forecast.
pub struct ForecastQuery {
    /// A picked city; wins over `lat`/`lon` when it exists.
    pub city_id: Option<i64>,
    /// Latitude in decimal degrees. Defaults to Kathmandu.
    pub lat: Option<f64>,
    /// Longitude in decimal degrees. Defaults to Kathmandu.
    pub lon: Option<f64>,
}

/// `GET /v1/weather/forecast?lat=…&lon=…` — the nearest city forecast, shared across users.
///
/// # Errors
///
/// Bad coordinates, a city lookup failure, or Open-Meteo failing with nothing cached.
pub async fn forecast(
    State(state): State<AppState>,
    Query(query): Query<ForecastQuery>,
) -> AppResult<Json<Value>> {
    let requested_lat = query.lat.unwrap_or(27.7172);
    let requested_lon = query.lon.unwrap_or(85.324);
    if !requested_lat.is_finite() || !(-90.0..=90.0).contains(&requested_lat) {
        return Err(AppError::BadRequest(
            "lat must be between -90 and 90".into(),
        ));
    }
    if !requested_lon.is_finite() || !(-180.0..=180.0).contains(&requested_lon) {
        return Err(AppError::BadRequest(
            "lon must be between -180 and 180".into(),
        ));
    }

    // Snap to a populated nearby city, so a neighborhood's users share one forecast.
    let picked = match query.city_id {
        Some(id) => state.cities.by_id(id).map_err(AppError::internal)?,
        None => None,
    };
    let nearby = match picked {
        Some(city) => Some(city),
        None => state
            .cities
            .nearest(requested_lat, requested_lon, 1_000, 60.0)
            .map_err(AppError::internal)?,
    };
    let (city, lat, lon, key) = if let Some(city) = nearby {
        let name = if city.ascii_name.is_empty() {
            city.name
        } else {
            city.ascii_name
        };
        (name, city.lat, city.lon, format!("city:{}", city.id))
    } else {
        // In unpopulated regions, use a tenth-degree grid rather than exact GPS.
        let lat = (requested_lat * 10.0).round() / 10.0;
        let lon = (requested_lon * 10.0).round() / 10.0;
        (
            "Nearby location".to_owned(),
            lat,
            lon,
            format!("grid:{lat:.1}:{lon:.1}"),
        )
    };

    let (forecast, fetched_at, cached) =
        state
            .weather
            .forecast(key, lat, lon)
            .await
            .map_err(|error| {
                tracing::error!(%error, "Open-Meteo forecast request failed");
                AppError::internal(error)
            })?;
    Ok(Json(json!({
        "location": {"name": city, "latitude": lat, "longitude": lon},
        "forecast": forecast,
        "forecast_days": 16,
        "display_days": 7,
        "source": "Open-Meteo",
        "fetched_at": fetched_at,
        "cached": cached
    })))
}
