//! Catalog routes: cities, documents, elements, and meta.
#![expect(
    clippy::result_large_err,
    reason = "a rejected request is answered with its axum Response, built once"
)]

use std::time::Instant;

use axum::{
    extract::{Path, Query as AxumQuery, State},
    http::{HeaderMap, StatusCode},
    response::Response,
};
use patro::catalog::{self, CatalogError};
use serde_json::json;

use crate::{
    handlers::panchanga::location,
    respond::{Query, detail, era_error, json_compact, json_payload, siddhanta_error},
    state::AppState,
};

fn parse_i64(q: &Query, key: &str) -> Result<Option<i64>, Response> {
    q.get(key).map_or(Ok(None), |v| {
        v.parse::<i64>().map(Some).map_err(|_| {
            detail(
                StatusCode::BAD_REQUEST,
                &format!("{key} must be an integer"),
            )
        })
    })
}

fn parse_i32(q: &Query, key: &str) -> Result<Option<i32>, Response> {
    parse_i64(q, key).and_then(|v| {
        v.map(i32::try_from)
            .transpose()
            .map_err(|_| detail(StatusCode::BAD_REQUEST, &format!("{key} is out of range")))
    })
}

fn parse_u32(q: &Query, key: &str) -> Result<Option<u32>, Response> {
    parse_i64(q, key).and_then(|v| {
        v.map(u32::try_from)
            .transpose()
            .map_err(|_| detail(StatusCode::BAD_REQUEST, &format!("{key} must be >= 0")))
    })
}

fn parse_f64(q: &Query, key: &str) -> Result<Option<f64>, Response> {
    q.get(key).map_or(Ok(None), |v| {
        v.parse::<f64>()
            .map(Some)
            .map_err(|_| detail(StatusCode::BAD_REQUEST, &format!("{key} must be a number")))
    })
}

fn handle(error: CatalogError) -> Response {
    match error {
        CatalogError::BadRequest(message) => detail(StatusCode::BAD_REQUEST, &message),
        CatalogError::NotFound(message) => detail(StatusCode::NOT_FOUND, &message),
        CatalogError::ServiceUnavailable(message) => {
            detail(StatusCode::SERVICE_UNAVAILABLE, &message)
        }
        CatalogError::NotImplemented(message) => detail(StatusCode::NOT_IMPLEMENTED, &message),
        CatalogError::Internal(_) | _ => {
            detail(StatusCode::INTERNAL_SERVER_ERROR, "internal error")
        }
    }
}

fn gate(state: &AppState, q: &Query) -> Option<Response> {
    era_error(q).or_else(|| siddhanta_error(state, q))
}

/// `GET /v1/cities/search`.
pub async fn cities_search(
    State(state): State<AppState>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    if let Some(resp) = gate(&state, &q) {
        return resp;
    }
    let started = Instant::now();
    let Some(query) = q.get("q").map(String::as_str) else {
        return detail(StatusCode::BAD_REQUEST, "q is required");
    };
    let limit = q
        .get("limit")
        .and_then(|v| v.parse::<usize>().ok())
        .unwrap_or(10)
        .clamp(1, 50);
    let country = q.get("country").map(|c| c.to_uppercase());
    match catalog::cities_search(&state.cities, query, limit, country.as_deref()) {
        Ok(payload) => json_compact(&payload, &q, &headers, None, None, started),
        Err(error) => handle(error),
    }
}

/// `GET /v1/cities/nearest`.
pub async fn cities_nearest(
    State(state): State<AppState>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    if let Some(resp) = gate(&state, &q) {
        return resp;
    }
    let started = Instant::now();
    let lat = match parse_f64(&q, "lat") {
        Ok(Some(v)) => v,
        Ok(None) => return detail(StatusCode::BAD_REQUEST, "lat is required"),
        Err(resp) => return resp,
    };
    let lon = match parse_f64(&q, "lon") {
        Ok(Some(v)) => v,
        Ok(None) => return detail(StatusCode::BAD_REQUEST, "lon is required"),
        Err(resp) => return resp,
    };
    let country = q.get("country").map(|c| c.to_uppercase());
    match catalog::cities_nearest(&state.cities, lat, lon, country.as_deref()) {
        Ok(payload) => json_compact(&payload, &q, &headers, None, None, started),
        Err(error) => handle(error),
    }
}

/// `GET /v1/cities/popular`.
pub async fn cities_popular(
    State(state): State<AppState>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    if let Some(resp) = gate(&state, &q) {
        return resp;
    }
    let started = Instant::now();
    match catalog::cities_popular(&state.cities) {
        Ok(payload) => json_compact(&payload, &q, &headers, None, None, started),
        Err(error) => handle(error),
    }
}

/// `GET /meta/capabilities`.
pub async fn meta_capabilities(
    State(state): State<AppState>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    if let Some(resp) = gate(&state, &q) {
        return resp;
    }
    let started = Instant::now();
    let payload = catalog::capabilities();
    json_compact(
        &payload,
        &q,
        &headers,
        Some(catalog::CAPABILITIES_CACHE_CONTROL),
        Some(catalog::CAPABILITIES_CACHE_CONTROL),
        started,
    )
}

/// `GET /about`.
pub async fn about(
    State(state): State<AppState>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    if let Some(resp) = gate(&state, &q) {
        return resp;
    }
    let started = Instant::now();
    let payload = catalog::about();
    json_compact(&payload, &q, &headers, None, None, started)
}

/// `GET /v1/panchanga/elements`.
pub async fn panchanga_elements(
    State(state): State<AppState>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    if let Some(resp) = gate(&state, &q) {
        return resp;
    }
    let started = Instant::now();
    let payload = json!({"elements": catalog::elements_list()});
    json_compact(&payload, &q, &headers, None, None, started)
}

/// `GET /v1/panchanga/element/{name}/day/{date_key}`.
pub async fn panchanga_element_day(
    State(state): State<AppState>,
    Path((name, date_key)): Path<(String, String)>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    if let Some(resp) = gate(&state, &q) {
        return resp;
    }
    let started = Instant::now();
    let era = q.get("era").map_or("ad", String::as_str);
    let loc = match location(&q, &state) {
        Ok(loc) => loc,
        Err(resp) => return resp,
    };
    match catalog::element_day(&name, &date_key, era, &loc) {
        Ok(payload) => json_compact(&payload, &q, &headers, None, None, started),
        Err(error) => handle(error),
    }
}

/// `GET /v1/panchanga/element/{name}/spans`.
pub async fn panchanga_element_spans(
    State(state): State<AppState>,
    Path(name): Path<String>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    if let Some(resp) = gate(&state, &q) {
        return resp;
    }
    let started = Instant::now();
    let loc = match location(&q, &state) {
        Ok(loc) => loc,
        Err(resp) => return resp,
    };
    let start_jd = match parse_f64(&q, "start_jd") {
        Ok(v) => v,
        Err(resp) => return resp,
    };
    let end_jd = match parse_f64(&q, "end_jd") {
        Ok(v) => v,
        Err(resp) => return resp,
    };
    let year = match parse_i32(&q, "year") {
        Ok(v) => v,
        Err(resp) => return resp,
    };
    let month = match parse_u32(&q, "month") {
        Ok(v) => v,
        Err(resp) => return resp,
    };
    let bounds = match catalog::spans_window(
        start_jd,
        end_jd,
        q.get("era").map(String::as_str),
        year,
        month,
    ) {
        Ok(v) => v,
        Err(error) => return handle(error),
    };
    match catalog::element_spans(&name, bounds.0, bounds.1, &loc) {
        Ok(payload) => json_compact(&payload, &q, &headers, None, None, started),
        Err(error) => handle(error),
    }
}

/// `GET /v1/panchanga/element/{name}/month/{bs_year}/{bs_month}`.
pub async fn panchanga_element_month(
    State(state): State<AppState>,
    Path((name, bs_year, bs_month)): Path<(String, i32, u32)>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    if let Some(resp) = gate(&state, &q) {
        return resp;
    }
    let started = Instant::now();
    let loc = match location(&q, &state) {
        Ok(loc) => loc,
        Err(resp) => return resp,
    };
    match catalog::element_month(&name, bs_year, bs_month, &loc) {
        Ok(payload) => json_compact(&payload, &q, &headers, None, None, started),
        Err(error) => handle(error),
    }
}

/// `GET /v1/documents`.
pub async fn documents_list(
    State(state): State<AppState>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    if let Some(resp) = gate(&state, &q) {
        return resp;
    }
    let started = Instant::now();
    let (cache, cdn) = state.documents.list_cache_headers();
    match catalog::documents_list(&state.documents) {
        Ok(payload) => json_payload(&payload, &q, &headers, cache, Some(cdn), started),
        Err(error) => handle(error),
    }
}

/// `GET /v1/documents/{slug}`.
pub async fn document_detail(
    State(state): State<AppState>,
    Path(slug): Path<String>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    if let Some(resp) = gate(&state, &q) {
        return resp;
    }
    let started = Instant::now();
    let cache = state.documents.document_cache_header();
    match catalog::document_detail(&state.documents, &slug) {
        Ok(payload) => json_payload(&payload, &q, &headers, cache, Some(cache), started),
        Err(error) => handle(error),
    }
}

/// `GET /v1/documents/{slug}/chapters/{chapter_number}`.
pub async fn document_chapter_detail(
    State(state): State<AppState>,
    Path((slug, chapter_number)): Path<(String, i64)>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    if let Some(resp) = gate(&state, &q) {
        return resp;
    }
    let direction = q.get("direction").map_or("next", String::as_str);
    if direction != "next" && direction != "prev" {
        return detail(StatusCode::BAD_REQUEST, "direction must be next or prev");
    }
    let limit = match parse_i64(&q, "limit") {
        Ok(v) => v,
        Err(resp) => return resp,
    };
    let cursor = match parse_i64(&q, "cursor") {
        Ok(v) => v,
        Err(resp) => return resp,
    };
    let started = Instant::now();
    let cache = state.documents.document_cache_header();
    match catalog::document_chapter_detail(
        &state.documents,
        &slug,
        chapter_number,
        limit,
        cursor,
        direction,
        q.get("verse").map(String::as_str),
    ) {
        Ok(payload) => json_payload(&payload, &q, &headers, cache, Some(cache), started),
        Err(error) => handle(error),
    }
}

/// `GET /v1/veda/details/{kind}`.
pub async fn veda_details(
    State(state): State<AppState>,
    Path(kind): Path<String>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    if let Some(resp) = gate(&state, &q) {
        return resp;
    }
    let Some(value) = q.get("value").map(String::as_str).filter(|v| !v.is_empty()) else {
        return detail(StatusCode::BAD_REQUEST, "value is required");
    };
    let offset = q
        .get("offset")
        .and_then(|v| v.parse::<i64>().ok())
        .unwrap_or(0);
    let limit = q
        .get("limit")
        .and_then(|v| v.parse::<i64>().ok())
        .unwrap_or(50)
        .clamp(1, 200);
    let started = Instant::now();
    let cache = state.documents.document_cache_header();
    match catalog::veda_detail(
        &state.documents,
        &kind,
        value,
        q.get("slug").map(String::as_str),
        offset,
        limit,
    ) {
        Ok(payload) => json_payload(&payload, &q, &headers, cache, Some(cache), started),
        Err(error) => handle(error),
    }
}

/// `GET /v1/veda/details/{kind}/values`.
pub async fn veda_detail_values(
    State(state): State<AppState>,
    Path(kind): Path<String>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    if let Some(resp) = gate(&state, &q) {
        return resp;
    }
    let started = Instant::now();
    let cache = state.documents.document_cache_header();
    match catalog::veda_detail_values(&state.documents, &kind, q.get("slug").map(String::as_str)) {
        Ok(payload) => json_payload(&payload, &q, &headers, cache, Some(cache), started),
        Err(error) => handle(error),
    }
}

/// `GET /v1/veda/daily`.
pub async fn veda_daily(
    State(state): State<AppState>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    if let Some(resp) = gate(&state, &q) {
        return resp;
    }
    let started = Instant::now();
    let cache = state.documents.veda_daily_cache_header();
    match catalog::veda_daily(&state.documents, q.get("date").map(String::as_str)) {
        Ok(payload) => json_payload(&payload, &q, &headers, cache, Some(cache), started),
        Err(error) => handle(error),
    }
}

/// `GET /v1/asset/{key}`: a 302 to the asset's current link (signed when the bucket is private).
///
/// The static data files (static.vedicpatro.com) link recordings and images here, because a
/// signed link written into a file would expire long before the file does.
pub async fn asset_redirect(State(state): State<AppState>, Path(key): Path<String>) -> Response {
    let safe = !key.is_empty()
        && key
            .split('/')
            .all(|s| !s.is_empty() && s != "." && s != "..")
        && key
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '_' | '/' | '-'));
    let Some(location) = safe.then(|| state.documents.asset_location(&key)).flatten() else {
        return detail(StatusCode::NOT_FOUND, "No such asset");
    };
    Response::builder()
        .status(StatusCode::FOUND)
        .header(axum::http::header::LOCATION, location)
        // Well inside a signed link's life (at least ttl - window, 6 h by default).
        .header(axum::http::header::CACHE_CONTROL, "public, max-age=600")
        .body(axum::body::Body::empty())
        .unwrap_or_else(|_| detail(StatusCode::INTERNAL_SERVER_ERROR, "internal error"))
}
