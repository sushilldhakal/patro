//! NEPSE share prices: the live market, one scrip's intraday ticks and daily history.

use axum::{
    Json,
    extract::{Path, Query, State},
    http::header,
    response::IntoResponse,
};
use serde::Deserialize;
use serde_json::json;

use common::{AppError, AppResult};

use crate::state::AppState;

/// `GET /v1/nepse/live` — every traded scrip's latest quote.
///
/// # Errors
///
/// Nothing has been read yet and merolagani cannot be reached.
pub async fn live(State(state): State<AppState>) -> AppResult<impl IntoResponse> {
    let live = state.nepse.live().await.map_err(upstream)?;
    // The feed stopped: send no prices, so no app shows old ones as current.
    if live.is_stale(jiff::Timestamp::now()) {
        return Ok((
            [(header::CACHE_CONTROL, "public, max-age=30")],
            Json(live.stale_marker()),
        ));
    }
    let cache = if live.market_open {
        "public, max-age=15"
    } else {
        "public, max-age=300"
    };
    Ok((
        [(header::CACHE_CONTROL, cache)],
        Json(live.as_ref().clone()),
    ))
}

/// Query of the intraday route.
#[derive(Debug, Deserialize)]
pub struct DayQuery {
    /// Trading day `YYYY-MM-DD` (Nepal); today when absent.
    pub date: Option<String>,
}

/// `GET /v1/nepse/stocks/{symbol}/intraday` — one day's price points.
///
/// # Errors
///
/// An unknown scrip, a bad date, or no source could be read.
pub async fn intraday(
    State(state): State<AppState>,
    Path(symbol): Path<String>,
    Query(query): Query<DayQuery>,
) -> AppResult<impl IntoResponse> {
    let symbol = known_symbol(&state, &symbol).await?;
    let today = jiff::Timestamp::now()
        .to_zoned(
            jiff::tz::Offset::from_seconds(20_700)
                .map_err(AppError::internal)?
                .to_time_zone(),
        )
        .date();
    let date = match query.date.as_deref().filter(|d| !d.is_empty()) {
        None => today,
        Some(text) => text
            .parse::<jiff::civil::Date>()
            .map_err(|_| AppError::BadRequest("date must be YYYY-MM-DD".into()))?,
    };
    let points = state
        .nepse
        .intraday(&symbol, date)
        .await
        .map_err(upstream)?;
    let cache = if date >= today {
        "public, max-age=30"
    } else {
        "public, max-age=86400"
    };
    Ok((
        [(header::CACHE_CONTROL, cache)],
        Json(json!({ "symbol": symbol, "date": date.to_string(), "points": points })),
    ))
}

/// `GET /v1/nepse/stocks/{symbol}/daily` — every trading day `[date, open, high, low, close, volume]`.
///
/// # Errors
///
/// An unknown scrip, or the store could not be read.
pub async fn daily(
    State(state): State<AppState>,
    Path(symbol): Path<String>,
) -> AppResult<impl IntoResponse> {
    let symbol = known_symbol(&state, &symbol).await?;
    let days = state.nepse.daily(&symbol).await.map_err(upstream)?;
    Ok((
        [(header::CACHE_CONTROL, "public, max-age=300")],
        Json(json!({ "symbol": symbol, "days": days })),
    ))
}

/// The upper-cased symbol, if it is a listed scrip (so no request can make the server
/// fetch history for made-up names).
async fn known_symbol(state: &AppState, symbol: &str) -> AppResult<String> {
    let symbol = symbol.trim().to_ascii_uppercase();
    let shaped =
        (1..=12).contains(&symbol.len()) && symbol.bytes().all(|b| b.is_ascii_alphanumeric());
    if !shaped || !state.nepse.knows(&symbol).await {
        return Err(AppError::NotFound(format!("no NEPSE scrip {symbol}")));
    }
    Ok(symbol)
}

fn upstream(error: String) -> AppError {
    tracing::warn!(%error, "NEPSE request failed");
    AppError::internal(std::io::Error::other(error))
}

/// Query of the period route.
#[derive(Debug, Deserialize)]
pub struct PeriodQuery {
    /// Calendar days back: 7, 31, 366 or 1827.
    pub days: u32,
}

/// `GET /v1/nepse/period?days=N` — every scrip's close before the window and what traded in it,
/// for the week-to-five-year top movers and most traded (the app adds today's live price).
///
/// # Errors
///
/// A window other than a week, month, year or five years, or the store could not be read.
pub async fn period(
    State(state): State<AppState>,
    Query(query): Query<PeriodQuery>,
) -> AppResult<impl IntoResponse> {
    if ![7, 31, 366, 1827].contains(&query.days) {
        return Err(AppError::BadRequest(
            "days must be 7, 31, 366 or 1827".into(),
        ));
    }
    let (from, rows) = state.nepse.period(query.days).await.map_err(upstream)?;
    Ok((
        [(header::CACHE_CONTROL, "public, max-age=300")],
        Json(json!({ "days": query.days, "from": from, "rows": rows })),
    ))
}
