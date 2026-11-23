//! `POST /v1/generate/*`: the precompute jobs (`api/patro.py`).
//!
//! `/v1/generate/panchanga/{bs_year}` and `/v1/generate/panchanga/popular/{bs_year}`
//! fill the persistent day store (`panchanga::store`, `PATRO_RS_PANCHANGA_CACHE`)
//! for every day of a BS year; `/v1/generate/{year}` builds the year's festival and
//! holiday lists (kept in memory). Response shapes are Python's.
#![expect(
    clippy::result_large_err,
    reason = "a rejected request is answered with its axum Response, built once"
)]

use std::collections::HashMap;

use axum::{
    extract::{Path, Query as AxumQuery, State},
    http::{HeaderMap, StatusCode},
    response::Response,
};
use panchanga::daily::{Location, Precompute, precompute_day};
use serde_json::{Value, json};
use timescale::CivilDay;

use crate::{
    handlers::panchanga::{location, path_int},
    respond::{Query, detail, flag, json_plain_payload},
    state::AppState,
};

/// Kathmandu's GeoNames id (`KATHMANDU_CITY_ID`).
const KATHMANDU_CITY_ID: i64 = 1_283_240;

/// `_validate_bs_year`.
fn signed_year(raw: &str, name: &str) -> Result<i32, Response> {
    let year = path_int(raw, name)?;
    i32::try_from(year)
        .ok()
        .filter(|y| (-3_891_138..=-1).contains(y) || (1..=17_053).contains(y))
        .ok_or_else(|| {
            detail(
                StatusCode::BAD_REQUEST,
                "year must be a signed patro year (-3891138..-1 = BBS, 1..17053 = BS; 0 invalid)",
            )
        })
}

/// `resolve_cache_keys`: `(location_key, city_id)` as Python reports them.
fn cache_keys(location: &Location) -> (String, i64) {
    if let Some(city) = location.city_id {
        return (format!("city:{city}"), city);
    }
    if (location.lat - 27.7172).abs() < 0.02
        && (location.lon - 85.3240).abs() < 0.02
        && location.zone.name() == "Asia/Kathmandu"
    {
        return (format!("city:{KATHMANDU_CITY_ID}"), KATHMANDU_CITY_ID);
    }
    (patro::festivals::location_key(location), 0)
}

/// Every civil day of a BS year.
fn year_days(bs_year: i32) -> Result<Vec<CivilDay>, Response> {
    let bad = |e: calendar::BsError| detail(StatusCode::BAD_REQUEST, &e.to_string());
    let start = calendar::month_start(bs_year, 1).map_err(bad)?;
    let next = calendar::month_start(bs_year + 1, 1).map_err(bad)?;
    #[expect(clippy::cast_possible_truncation, reason = "a year has under 400 days")]
    let n = (next.to_jd_ut() - start.to_jd_ut()).round() as i32;
    Ok((0..n).map(|i| start.add_days(i)).collect())
}

/// `precompute_range`: days written.
fn precompute(location: &Location, days: &[CivilDay], force: Precompute) -> Result<i64, Response> {
    let mut written = 0;
    for &day in days {
        match precompute_day(day, location, force) {
            Ok(true) => written += 1,
            Ok(false) => {}
            Err(panchanga::daily::DailyError::BeforeGregorian(_)) => {
                return Err(detail(
                    StatusCode::NOT_IMPLEMENTED,
                    "precomputing days before 1582-10-15 is not supported",
                ));
            }
            Err(e) => return Err(detail(StatusCode::BAD_REQUEST, &e.to_string())),
        }
    }
    Ok(written)
}

fn force_of(q: &Query) -> Result<Precompute, Response> {
    Ok(if flag(q, "force")? {
        Precompute::Force
    } else {
        Precompute::SkipStored
    })
}

fn blocking(work: impl FnOnce() -> Result<Value, Response>) -> Result<Value, Response> {
    // The handlers already run on the cpu_pool blocking thread, so a nested
    // spawn_blocking here only cost a second thread per request.
    work()
}

/// `POST /v1/generate/panchanga/{bs_year}`.
pub(crate) async fn panchanga_year(
    State(state): State<AppState>,
    Path(raw): Path<String>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    let started = std::time::Instant::now();
    let result = async {
        let bs_year = signed_year(&raw, "bs_year")?;
        let location = location(&q, &state)?;
        let force = force_of(&q)?;
        blocking(move || {
            let days = year_days(bs_year)?;
            let (location_key, city_id) = cache_keys(&location);
            let written = if panchanga::store::enabled() {
                precompute(&location, &days, force)?
            } else {
                0
            };
            Ok(json!({
                "status": "generated", "bs_year": bs_year,
                "location_key": location_key, "city_id": city_id,
                "days_written": written, "days_total": days.len(),
                "cache": panchanga::store::stats(),
            }))
        })
    }
    .await;
    match result {
        Ok(payload) => json_plain_payload(&payload, &Query::new(), &headers, started),
        Err(response) => response,
    }
}

/// `POST /v1/generate/panchanga/popular/{bs_year}`.
pub(crate) async fn panchanga_popular(
    State(state): State<AppState>,
    Path(raw): Path<String>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    let started = std::time::Instant::now();
    let result = async {
        let bs_year = signed_year(&raw, "bs_year")?;
        let force = force_of(&q)?;
        let mut locations = Vec::new();
        for id in geography::POPULAR_CITY_IDS {
            let query: Query = HashMap::from([("city_id".to_owned(), id.to_string())]);
            locations.push((id, location(&query, &state)?));
        }
        blocking(move || {
            let days = year_days(bs_year)?;
            let mut results = Vec::new();
            let mut total = 0;
            for (id, location) in &locations {
                let (location_key, _) = cache_keys(location);
                let written = if panchanga::store::enabled() {
                    precompute(location, &days, force)?
                } else {
                    0
                };
                total += written;
                results.push(
                    json!({"city_id": id, "location_key": location_key, "days_written": written}),
                );
            }
            Ok(json!({
                "status": "generated", "bs_year": bs_year,
                "cities": locations.len(), "days_total_per_city": days.len(),
                "total_rows_written": total, "results": results,
                "cache": panchanga::store::stats(),
            }))
        })
    }
    .await;
    match result {
        Ok(payload) => json_plain_payload(&payload, &Query::new(), &headers, started),
        Err(response) => response,
    }
}

/// `POST /v1/generate/{year}`: the BS year's festival and holiday lists.
pub(crate) async fn holiday_year(
    State(state): State<AppState>,
    Path(raw): Path<String>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    let started = std::time::Instant::now();
    let result = async {
        let bs_year = signed_year(&raw, "year")?;
        let location = location(&q, &state)?;
        blocking(move || {
            let payload = patro::festivals::bs_holidays_payload(bs_year, &location, None)
                .map_err(|m| detail(StatusCode::BAD_REQUEST, &m))?;
            let field = |k: &str| payload.get(k).cloned().unwrap_or(Value::Null);
            Ok(json!({
                "status": "generated",
                "bs_year": field("bs_year"),
                "gregorian_range": field("gregorian_range"),
                "count": field("count"),
                "cache_key": patro::festivals::location_key(&location),
                "generated_at": field("generated_at"),
            }))
        })
    }
    .await;
    match result {
        Ok(payload) => json_plain_payload(&payload, &Query::new(), &headers, started),
        Err(response) => response,
    }
}
