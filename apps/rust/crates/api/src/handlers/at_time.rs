//! `GET /v1/panchanga/at-time`: the panchanga at a moment.
#![expect(
    clippy::result_large_err,
    reason = "a rejected request is answered with its axum Response, built once"
)]

use std::time::Instant;

use axum::{
    extract::{Query as AxumQuery, State},
    http::{HeaderMap, StatusCode},
    response::Response,
};
use patro::{
    at_time::{
        AtInstant, CACHE_CONTROL, InstantQuery, at_time_fields, at_time_fields_jd,
        resolve_instant_any,
    },
    date_key::{py_int, to_jd},
    day::DayError,
};

use crate::{
    respond::{
        Query, detail, detail_json, era_400, era_error, json_response_fields, siddhanta_error,
    },
    state::AppState,
};

pub(crate) fn day_error(error: DayError) -> Response {
    match error {
        DayError::NotPorted(message) => detail(StatusCode::NOT_IMPLEMENTED, &message),
        DayError::Era(message) => era_400(&message),
        other => detail(StatusCode::BAD_REQUEST, &other.to_string()),
    }
}

/// Starlette's `float` query parsing for `jd`: absent → `None`, junk → pydantic's 422.
pub(crate) fn jd_param(q: &Query) -> Result<Option<f64>, Response> {
    let Some(raw) = q.get("jd") else {
        return Ok(None);
    };
    raw.trim().parse::<f64>().map(Some).map_err(|_| {
        detail_json(
            StatusCode::UNPROCESSABLE_ENTITY,
            &serde_json::json!([{
                "type": "float_parsing",
                "loc": ["query", "jd"],
                "msg": "Input should be a valid number, unable to parse string as a number",
                "input": raw,
            }]),
        )
    })
}

/// The day the era middleware resolved from `inputEra` + `year`/`month`/`day`
/// (`_era_jd`): only when `era` is given and all three parts are integers.
pub(crate) fn era_parts_jd(q: &Query) -> Result<Option<f64>, Response> {
    let display = q
        .get("era")
        .map(|e| e.trim().to_lowercase())
        .filter(|e| !e.is_empty());
    let Some(display) = display else {
        return Ok(None);
    };
    let as_int = |k: &str| {
        q.get(k)
            .filter(|v| !v.trim().is_empty())
            .and_then(|v| py_int(v))
    };
    let (Some(year), Some(month), Some(day)) = (as_int("year"), as_int("month"), as_int("day"))
    else {
        return Ok(None);
    };
    let input = ["inputEra", "input_era"]
        .iter()
        .find_map(|k| q.get(*k).filter(|v| !v.is_empty()))
        .map(|v| v.trim().to_lowercase())
        .filter(|v| !v.is_empty())
        .unwrap_or(display);
    to_jd(&input, year, Some(month), Some(day))
        .map(Some)
        .map_err(|message| era_400(&message))
}

/// `GET /v1/panchanga/at-time`.
pub(crate) async fn panchanga_at_time(
    State(state): State<AppState>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    let started = Instant::now();
    if let Some(r) = era_error(&q).or_else(|| siddhanta_error(&q)) {
        return r;
    }
    let jd = match jd_param(&q) {
        Ok(Some(jd)) => Some(jd),
        Ok(None) => match era_parts_jd(&q) {
            Ok(parts) => parts,
            Err(response) => return response,
        },
        Err(response) => return response,
    };
    let location = match super::panchanga::location(&q, &state) {
        Ok(loc) => loc,
        Err(response) => return response,
    };
    let query = InstantQuery {
        datetime: q.get("datetime").map(String::as_str),
        jd,
        clock: q.get("clock").map(String::as_str),
    };
    let payload = match resolve_instant_any(query, &location).and_then(|instant| match instant {
        AtInstant::Utc(utc) => at_time_fields(utc, &location),
        AtInstant::Jd(jd) => at_time_fields_jd(jd, &location),
    }) {
        Ok(payload) => payload,
        Err(error) => return day_error(error),
    };
    json_response_fields(&payload, &q, &headers, CACHE_CONTROL, None, started)
}
