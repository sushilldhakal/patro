//! Festival and holiday routes.
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
use timescale::{CivilDay, Moment};

use serde_json::json;

use crate::{
    respond::{
        IMMUTABLE, LIVE, Query, detail, detail_json, era_error, flag, json_payload,
        json_plain_payload, siddhanta_error,
    },
    state::AppState,
};

fn pydantic_ge(field: &str, input: &str, ge: i64) -> Response {
    detail_json(
        StatusCode::UNPROCESSABLE_ENTITY,
        &json!([{
            "type": "greater_than_equal",
            "loc": ["query", field],
            "msg": format!("Input should be greater than or equal to {ge}"),
            "input": input,
            "ctx": {"ge": ge},
        }]),
    )
}

fn pydantic_le(field: &str, input: &str, le: i64) -> Response {
    detail_json(
        StatusCode::UNPROCESSABLE_ENTITY,
        &json!([{
            "type": "less_than_equal",
            "loc": ["query", field],
            "msg": format!("Input should be less than or equal to {le}"),
            "input": input,
            "ctx": {"le": le},
        }]),
    )
}

fn pydantic_literal_era_bs_ad(input: &str) -> Response {
    detail_json(
        StatusCode::UNPROCESSABLE_ENTITY,
        &json!([{
            "type": "literal_error",
            "loc": ["query", "era"],
            "msg": "Input should be 'bs' or 'ad'",
            "input": input,
            "ctx": {"expected": "'bs' or 'ad'"},
        }]),
    )
}

fn parse_i32(q: &Query, key: &str, default: Option<i32>) -> Result<i32, Response> {
    match q.get(key) {
        Some(raw) => raw.parse::<i32>().map_err(|_| {
            detail(
                StatusCode::UNPROCESSABLE_ENTITY,
                &format!("{key}: Input should be a valid integer"),
            )
        }),
        None => default.ok_or_else(|| {
            detail(
                StatusCode::UNPROCESSABLE_ENTITY,
                &format!("{key}: Field required"),
            )
        }),
    }
}

fn parse_u32_opt(q: &Query, key: &str) -> Result<Option<u32>, Response> {
    q.get(key)
        .map(|raw| {
            raw.parse::<u32>().map_err(|_| {
                detail(
                    StatusCode::UNPROCESSABLE_ENTITY,
                    &format!("{key}: Input should be a valid integer"),
                )
            })
        })
        .transpose()
}

fn parse_i32_opt(q: &Query, key: &str, default: i32) -> Result<i32, Response> {
    q.get(key).map_or(Ok(default), |raw| {
        raw.parse::<i32>().map_err(|_| {
            detail(
                StatusCode::UNPROCESSABLE_ENTITY,
                &format!("{key}: Input should be a valid integer"),
            )
        })
    })
}

fn parse_usize_opt(q: &Query, key: &str, default: usize) -> Result<usize, Response> {
    q.get(key).map_or(Ok(default), |raw| {
        raw.parse::<usize>().map_err(|_| {
            detail(
                StatusCode::UNPROCESSABLE_ENTITY,
                &format!("{key}: Input should be a valid integer"),
            )
        })
    })
}

fn current_bs_year() -> i32 {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_or(0.0, |d| d.as_secs_f64());
    let today = CivilDay::from_jd_ut(2_440_587.5 + now / 86400.0);
    calendar::civil_to_bs(today).map_or(0, |bs| bs.year)
}

fn local_today(location: &panchanga::daily::Location) -> CivilDay {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_or(0.0, |d| d.as_secs_f64());
    location
        .zone
        .local_day(Moment::from_jd(2_440_587.5 + now / 86400.0))
}

fn invalid_isoformat_detail(raw: &str) -> String {
    if raw.contains('\'') && !raw.contains('"') {
        format!("Invalid isoformat string: \"{raw}\"")
    } else {
        format!("Invalid isoformat string: '{raw}'")
    }
}

/// `GET /v1/festivals/bs/{bs_year}`.
pub(crate) async fn festivals_bs_year(
    State(state): State<AppState>,
    Path(bs_year): Path<i64>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    let started = Instant::now();
    if let Some(r) = era_error(&q).or_else(|| siddhanta_error(&state, &q)) {
        return r;
    }
    let location = match super::panchanga::location(&q, &state) {
        Ok(location) => location,
        Err(r) => return r,
    };
    let Ok(year) = i32::try_from(bs_year) else {
        return detail(
            StatusCode::BAD_REQUEST,
            "year must be a signed patro year (-3891138..-1 = BBS, 1..17053 = BS; 0 invalid)",
        );
    };
    let month = match parse_u32_opt(&q, "month") {
        Ok(month) => month,
        Err(r) => return r,
    };
    let payload = match patro::festivals::bs_festivals_payload(year, &location, month) {
        Ok(payload) => payload,
        Err(message) => return detail(StatusCode::BAD_REQUEST, &message),
    };
    json_plain_payload(&payload, &q, &headers, started)
}

/// `GET /v1/festivals/{date_key}`.
pub(crate) async fn festivals_day(
    State(state): State<AppState>,
    Path(date_key): Path<String>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    let started = Instant::now();
    if let Some(r) = era_error(&q).or_else(|| siddhanta_error(&state, &q)) {
        return r;
    }
    let location = match super::panchanga::location(&q, &state) {
        Ok(location) => location,
        Err(r) => return r,
    };
    let era = q.get("era").map_or("bs", String::as_str);
    let payload = match patro::festivals::festivals_for_date_payload(&date_key, &location, era) {
        Ok(payload) => payload,
        Err(message) => return detail(StatusCode::BAD_REQUEST, &message),
    };
    json_plain_payload(&payload, &q, &headers, started)
}

/// `GET /v1/holidays/{year}`.
pub(crate) async fn holidays_year(
    State(state): State<AppState>,
    Path(year): Path<i64>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    let started = Instant::now();
    if let Some(r) = era_error(&q).or_else(|| siddhanta_error(&state, &q)) {
        return r;
    }
    let location = match super::panchanga::location(&q, &state) {
        Ok(location) => location,
        Err(r) => return r,
    };
    let Ok(year) = i32::try_from(year) else {
        return detail(
            StatusCode::BAD_REQUEST,
            "year must be a signed patro year (-3891138..-1 = BBS, 1..17053 = BS; 0 invalid)",
        );
    };
    let month = match parse_u32_opt(&q, "month") {
        Ok(month) => month,
        Err(r) => return r,
    };
    let payload = match patro::festivals::bs_holidays_payload(year, &location, month) {
        Ok(payload) => payload,
        Err(message) => return detail(StatusCode::BAD_REQUEST, &message),
    };
    json_plain_payload(&payload, &q, &headers, started)
}

/// `GET /v1/nepal/festivals`.
pub(crate) async fn nepal_festivals(
    State(state): State<AppState>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    let started = Instant::now();
    if let Some(r) = era_error(&q).or_else(|| siddhanta_error(&state, &q)) {
        return r;
    }
    let location = match super::panchanga::location(&q, &state) {
        Ok(location) => location,
        Err(r) => return r,
    };
    let year = match parse_i32(&q, "year", None) {
        Ok(year) => year,
        Err(r) => return r,
    };
    let era = q.get("era").map_or("bs", String::as_str);
    let month = match parse_u32_opt(&q, "month") {
        Ok(month) => month,
        Err(r) => return r,
    };
    let tradition = q.get("tradition").map(String::as_str);
    let signed = if matches!(era, "bs" | "bbs") {
        match patro::festivals::signed_bs_year_from_browse(era, year) {
            Ok(signed) => Some(signed),
            Err(message) => return detail(StatusCode::BAD_REQUEST, &message),
        }
    } else {
        None
    };
    let payload = match patro::festivals::festival_listing_payload(
        year, era, &location, month, tradition, signed,
    ) {
        Ok(payload) => payload,
        Err(message) => return detail(StatusCode::BAD_REQUEST, &message),
    };
    json_plain_payload(&payload, &q, &headers, started)
}

/// `GET /v1/nepal/holidays`.
pub(crate) async fn nepal_holidays(
    State(state): State<AppState>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    let started = Instant::now();
    if let Some(r) = era_error(&q).or_else(|| siddhanta_error(&state, &q)) {
        return r;
    }
    let location = match super::panchanga::location(&q, &state) {
        Ok(location) => location,
        Err(r) => return r,
    };
    let year = match parse_i32(&q, "year", None) {
        Ok(year) => year,
        Err(r) => return r,
    };
    let era = q.get("era").map_or("bs", String::as_str);
    let month = match parse_u32_opt(&q, "month") {
        Ok(month) => month,
        Err(r) => return r,
    };
    let signed = if matches!(era, "bs" | "bbs") {
        match patro::festivals::signed_bs_year_from_browse(era, year) {
            Ok(signed) => Some(signed),
            Err(message) => return detail(StatusCode::BAD_REQUEST, &message),
        }
    } else {
        None
    };
    let payload =
        match patro::festivals::holiday_listing_payload(year, era, &location, month, signed) {
            Ok(payload) => payload,
            Err(message) => return detail(StatusCode::BAD_REQUEST, &message),
        };
    json_plain_payload(&payload, &q, &headers, started)
}

/// `GET /v1/nepal/festivals/upcoming`.
pub(crate) async fn nepal_upcoming_festivals(
    State(state): State<AppState>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    let started = Instant::now();
    if let Some(r) = era_error(&q).or_else(|| siddhanta_error(&state, &q)) {
        return r;
    }
    let location = match super::panchanga::location(&q, &state) {
        Ok(location) => location,
        Err(r) => return r,
    };
    let start = match q.get("from") {
        Some(raw) => match raw
            .split('-')
            .map(str::parse::<u32>)
            .collect::<Result<Vec<_>, _>>()
        {
            Ok(parts) if parts.len() == 3 => {
                let year = i32::try_from(parts[0]).unwrap_or(0);
                let civil = CivilDay::new(year, parts[1], parts[2]);
                if timescale::UtcInstant::from_utc(civil, 0, 0, 0, 0).is_none() {
                    return detail(StatusCode::BAD_REQUEST, &invalid_isoformat_detail(raw));
                }
                civil
            }
            _ => return detail(StatusCode::BAD_REQUEST, &invalid_isoformat_detail(raw)),
        },
        None => local_today(&location),
    };
    let days = match parse_i32_opt(&q, "days", 90) {
        Ok(days) if (1..=366).contains(&days) => days,
        Ok(days) => {
            let raw = q.get("days").map_or("90", String::as_str);
            return if days < 1 {
                pydantic_ge("days", raw, 1)
            } else {
                pydantic_le("days", raw, 366)
            };
        }
        Err(r) => return r,
    };
    let limit = match parse_usize_opt(&q, "limit", 15) {
        Ok(limit) if (1..=60).contains(&limit) => limit,
        Ok(limit) => {
            let raw = q.get("limit").map_or("15", String::as_str);
            return if limit < 1 {
                pydantic_ge("limit", raw, 1)
            } else {
                pydantic_le("limit", raw, 60)
            };
        }
        Err(r) => return r,
    };
    let scope = match flag(&q, "holidays_only") {
        Ok(true) => patro::festivals::UpcomingScope::HolidaysOnly,
        Ok(false) => patro::festivals::UpcomingScope::All,
        Err(r) => return r,
    };
    let payload =
        patro::festivals::upcoming_festivals_payload(&location, start, days, limit, scope);
    json_plain_payload(&payload, &q, &headers, started)
}

/// `GET /v1/nepal/special-months/{bs_year}`.
pub(crate) async fn nepal_special_months(
    State(state): State<AppState>,
    Path(bs_year): Path<i64>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    let started = Instant::now();
    if let Some(r) = era_error(&q).or_else(|| siddhanta_error(&state, &q)) {
        return r;
    }
    let location = match super::panchanga::location(&q, &state) {
        Ok(location) => location,
        Err(r) => return r,
    };
    let Ok(year) = i32::try_from(bs_year) else {
        return detail(
            StatusCode::BAD_REQUEST,
            "year must be a signed patro year (-3891138..-1 = BBS, 1..17053 = BS; 0 invalid)",
        );
    };
    let payload = match patro::festivals::special_months_payload(year, &location) {
        Ok(payload) => payload,
        Err(message) => return detail(StatusCode::BAD_REQUEST, &message),
    };
    let directive = if year < current_bs_year() {
        IMMUTABLE
    } else {
        LIVE
    };
    json_payload(&payload, &q, &headers, directive, None, started)
}

/// `GET /v1/nepal/sankranti/year/{ad_year}`.
pub(crate) async fn nepal_sankranti_year(
    State(state): State<AppState>,
    Path(ad_year): Path<i64>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    let started = Instant::now();
    if let Some(r) = era_error(&q).or_else(|| siddhanta_error(&state, &q)) {
        return r;
    }
    let location = match super::panchanga::location(&q, &state) {
        Ok(location) => location,
        Err(r) => return r,
    };
    let Ok(year) = i32::try_from(ad_year) else {
        return detail(StatusCode::BAD_REQUEST, "year is out of range");
    };
    let payload = match patro::festivals::sankranti_year_payload(year, &location) {
        Ok(payload) => payload,
        Err(message) => return detail(StatusCode::BAD_REQUEST, &message),
    };
    json_plain_payload(&payload, &q, &headers, started)
}

/// `GET /v1/nepal/sankranti/{date_key}`.
pub(crate) async fn nepal_sankranti_day(
    State(state): State<AppState>,
    Path(date_key): Path<String>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    let started = Instant::now();
    if let Some(r) = siddhanta_error(&state, &q) {
        return r;
    }
    // FastAPI declares `era: Literal["bs", "ad"]` on this route (not the wider EraQuery).
    let era = match q.get("era").map(String::as_str) {
        None | Some("bs") => "bs",
        Some("ad") => "ad",
        Some(raw) => return pydantic_literal_era_bs_ad(raw),
    };
    let location = match super::panchanga::location(&q, &state) {
        Ok(location) => location,
        Err(r) => return r,
    };
    let payload = match patro::festivals::sankranti_day_payload(&date_key, era, &location) {
        Ok(payload) => payload,
        Err(message) => return detail(StatusCode::BAD_REQUEST, &message),
    };
    json_plain_payload(&payload, &q, &headers, started)
}

/// `GET /v1/nepal/panchanga/year/{bs_year}`.
pub(crate) async fn nepal_panchanga_year(
    State(state): State<AppState>,
    Path(bs_year): Path<i64>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    let started = Instant::now();
    if let Some(r) = era_error(&q).or_else(|| siddhanta_error(&state, &q)) {
        return r;
    }
    let location = match super::panchanga::location(&q, &state) {
        Ok(location) => location,
        Err(r) => return r,
    };
    let Ok(year) = i32::try_from(bs_year) else {
        return detail(
            StatusCode::BAD_REQUEST,
            "year must be a signed patro year (-3891138..-1 = BBS, 1..17053 = BS; 0 invalid)",
        );
    };
    let payload = match patro::festivals::bs_year_summary_payload(year, &location) {
        Ok(payload) => payload,
        Err(message) => {
            let status = if message.contains("not ported") {
                StatusCode::NOT_IMPLEMENTED
            } else {
                StatusCode::BAD_REQUEST
            };
            return detail(status, &message);
        }
    };
    json_plain_payload(&payload, &q, &headers, started)
}
