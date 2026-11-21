//! `GET /v1/panchanga/rashifal`: the scored rashifal for a day's window.
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
use jyotish::rashifal::{Period, rashifal_for_day};
use patro::day::{DayError, resolve_request_jd};
use serde_json::json;
use timescale::CivilDay;

use crate::{
    respond::{
        Query, detail, detail_json, era_400, era_error, era_params_errors, json_payload,
        siddhanta_error,
    },
    state::AppState,
};

/// `DAILY_PANCHANGA_CACHE_CONTROL`.
const CACHE_CONTROL: &str = "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400";

/// `era_params` then `period: Literal[...]`: the period (when valid) and pydantic's
/// 422 items, in declaration order.
fn period_and_errors(q: &Query) -> (Option<Period>, Vec<serde_json::Value>) {
    let mut errors = era_params_errors(q);
    let parsed = match q.get("period") {
        None => Some(Period::Daily),
        Some(raw) => {
            let parsed = Period::parse(raw);
            if parsed.is_none() {
                let expected = "'daily', 'weekly', 'monthly' or 'yearly'";
                errors.push(json!({
                    "type": "literal_error",
                    "loc": ["query", "period"],
                    "msg": format!("Input should be {expected}"),
                    "input": raw,
                    "ctx": {"expected": expected},
                }));
            }
            parsed
        }
    };
    (parsed, errors)
}

fn unprocessable(errors: Vec<serde_json::Value>) -> Response {
    detail_json(
        StatusCode::UNPROCESSABLE_ENTITY,
        &serde_json::Value::Array(errors),
    )
}

/// The period, or every pydantic 422 in one list as `FastAPI` collects them.
pub(crate) fn period(q: &Query) -> Result<Period, Response> {
    match period_and_errors(q) {
        (Some(p), errors) if errors.is_empty() => Ok(p),
        (_, errors) => Err(unprocessable(errors)),
    }
}

fn day_error(error: DayError) -> Response {
    match error {
        DayError::NotPorted(message) => detail(StatusCode::NOT_IMPLEMENTED, &message),
        DayError::BadRequest(message) => detail(StatusCode::BAD_REQUEST, &message),
        DayError::Era(message) => era_400(&message),
        other => detail(StatusCode::BAD_REQUEST, &other.to_string()),
    }
}

/// The anchor day (`day_jd_for_request` + `date_if_supported`), with the route's own
/// error for days a Python `date` cannot hold.
pub(crate) fn anchor_day(
    q: &Query,
    location: &panchanga::daily::Location,
) -> Result<CivilDay, Response> {
    let jd =
        resolve_request_jd(q, q.get("date").map(String::as_str), location).map_err(day_error)?;
    let civil = CivilDay::from_jd_ut(jd);
    // Python's `date_if_supported` gate: no `datetime.date` before 1582-10-15 either.
    if !civil.is_datetime_range() {
        return Err(detail(
            StatusCode::BAD_REQUEST,
            "Rashifal is available for CE-representable dates only.",
        ));
    }
    Ok(civil)
}

/// `GET /v1/panchanga/rashifal`.
pub(crate) async fn rashifal(
    State(state): State<AppState>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    let started = Instant::now();
    if let Some(r) = era_error(&q).or_else(|| siddhanta_error(&q)) {
        return r;
    }
    let period = match period(&q) {
        Ok(p) => p,
        Err(response) => return response,
    };
    let location = match super::panchanga::location(&q, &state) {
        Ok(loc) => loc,
        Err(response) => return response,
    };
    let day = match anchor_day(&q, &location) {
        Ok(day) => day,
        Err(response) => return response,
    };
    let payload = match rashifal_for_day(day, &location, period) {
        Ok(payload) => payload,
        Err(error) => return detail(StatusCode::BAD_REQUEST, &error.to_string()),
    };
    json_payload(&payload, &q, &headers, CACHE_CONTROL, None, started)
}

/// pydantic's `int` query parsing for a birth part: absent → `None`, junk → a 422 item.
fn birth_int(q: &Query, key: &str, errors: &mut Vec<serde_json::Value>) -> Option<i64> {
    let raw = q.get(key)?;
    let parsed = raw.trim().parse::<i64>().ok();
    if parsed.is_none() {
        errors.push(json!({
            "type": "int_parsing", "loc": ["query", key],
            "msg": "Input should be a valid integer, unable to parse string as an integer",
            "input": raw,
        }));
    }
    parsed
}

/// The birth query parameters, with pydantic's 422 items for unparsable parts.
pub(crate) fn birth_query<'a>(
    q: &'a Query,
    errors: &mut Vec<serde_json::Value>,
) -> patro::at_time::BirthQuery<'a> {
    patro::at_time::BirthQuery {
        birth: q.get("birth").map(String::as_str),
        birth_tz: q.get("birth_tz").map_or("Asia/Kathmandu", String::as_str),
        birth_era: q.get("birth_era").map(String::as_str),
        birth_year: birth_int(q, "birth_year", errors),
        birth_month: birth_int(q, "birth_month", errors),
        birth_day: birth_int(q, "birth_day", errors),
        birth_clock: q.get("birth_clock").map(String::as_str),
    }
}

/// `GET /v1/panchanga/rashifal/janma`: the janma nakshatra and Moon rashi of a birth.
pub(crate) async fn janma(AxumQuery(q): AxumQuery<Query>, headers: HeaderMap) -> Response {
    let started = Instant::now();
    if let Some(r) = era_error(&q).or_else(|| siddhanta_error(&q)) {
        return r;
    }
    let mut errors = Vec::new();
    let query = birth_query(&q, &mut errors);
    if !errors.is_empty() {
        return unprocessable(errors);
    }
    let jd = match patro::at_time::birth_jd(&query, None) {
        Ok(jd) => jd,
        Err(error) => return day_error(error),
    };
    let (nakshatra, rashi) = jyotish::rashifal::janma_at_jd(jd);
    crate::respond::json_plain_payload(
        &json!({"janma_nakshatra": nakshatra, "janma_rashi": rashi}),
        &q,
        &headers,
        started,
    )
}

/// A required `float` query parameter, with pydantic's 422 item when missing or junk.
fn required_float(q: &Query, key: &str, errors: &mut Vec<serde_json::Value>) -> Option<f64> {
    let Some(raw) = q.get(key) else {
        errors.push(json!({
            "type": "missing", "loc": ["query", key], "msg": "Field required", "input": null,
        }));
        return None;
    };
    let parsed = raw.trim().parse::<f64>().ok();
    if parsed.is_none() {
        errors.push(json!({
            "type": "float_parsing", "loc": ["query", key],
            "msg": "Input should be a valid number, unable to parse string as a number",
            "input": raw,
        }));
    }
    parsed
}

fn now_utc() -> timescale::UtcInstant {
    let micros = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_or(0, |d| i64::try_from(d.as_micros()).unwrap_or(0));
    timescale::UtcInstant::from_utc(CivilDay::new(1970, 1, 1), 0, 0, 0, 0)
        .expect("the Unix epoch is a valid instant")
        .add_micros(micros)
}

/// `GET /v1/panchanga/rashifal/personal`: the rashifal cast on one birth chart.
pub(crate) async fn personal(
    State(state): State<AppState>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    let started = Instant::now();
    if let Some(r) = era_error(&q).or_else(|| siddhanta_error(&q)) {
        return r;
    }
    let mut errors = Vec::new();
    let birth_lat = required_float(&q, "birth_lat", &mut errors);
    let birth_lon = required_float(&q, "birth_lon", &mut errors);
    let query = birth_query(&q, &mut errors);
    let (period, rest) = period_and_errors(&q);
    errors.extend(rest);
    let (Some(birth_lat), Some(birth_lon), Some(period), true) =
        (birth_lat, birth_lon, period, errors.is_empty())
    else {
        return unprocessable(errors);
    };
    let location = match super::panchanga::location(&q, &state) {
        Ok(loc) => loc,
        Err(response) => return response,
    };
    let day = match anchor_day(&q, &location) {
        Ok(day) => day,
        Err(response) => return response,
    };
    let moment = match patro::at_time::birth_instant(&query, Some((birth_lat, birth_lon))) {
        Ok(m) => m,
        Err(error) => return day_error(error),
    };
    let natal = jyotish::rashifal::NatalChart::cast(
        moment.utc,
        moment.wall,
        &moment.zone,
        birth_lat,
        birth_lon,
    );
    let payload = match jyotish::rashifal::personal_rashifal_for_day(
        &natal,
        day,
        &location,
        period,
        now_utc(),
    ) {
        Ok(payload) => payload,
        Err(error) => return detail(StatusCode::BAD_REQUEST, &error.to_string()),
    };
    crate::respond::json_private_payload(&payload, &q, &headers, "private, max-age=120", started)
}
