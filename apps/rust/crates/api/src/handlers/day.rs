//! Day-facing panchanga routes and date converters.
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

use patro::{
    month::Embed,
    nepal_panchanga::{Style, day_state_with_holidays, render_day, render_month},
    presentation::Locale,
};
use serde_json::{Value, json};

use crate::{
    handlers::panchanga::{location, month_error, path_int, signed_browse_year},
    respond::{
        Query, detail, detail_json, era_error, flag, json_plain_payload, json_response_fields,
        raw_payload, siddhanta_error,
    },
    state::AppState,
};

const DAILY_CACHE_CONTROL: &str =
    "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400";

/// `reference=sunrise|midnight`.
fn reference(q: &Query) -> Result<&str, Response> {
    match q.get("reference").map(|s| s.trim().to_lowercase()) {
        None => Ok("sunrise"),
        Some(v) if v == "sunrise" || v == "midnight" => {
            if v == "sunrise" {
                Ok("sunrise")
            } else {
                Ok("midnight")
            }
        }
        Some(_) => Err(detail(
            StatusCode::UNPROCESSABLE_ENTITY,
            "reference: Input should be 'sunrise' or 'midnight'",
        )),
    }
}

fn day_error(error: patro::day::DayError) -> Response {
    match error {
        patro::day::DayError::BadRequest(message) => detail(StatusCode::BAD_REQUEST, &message),
        patro::day::DayError::NotPorted(message) => detail(StatusCode::NOT_IMPLEMENTED, &message),
        patro::day::DayError::Era(message) => crate::respond::era_400(&message),
        _ => detail(StatusCode::BAD_REQUEST, &error.to_string()),
    }
}

fn parse_ad_date(text: &str) -> Result<timescale::CivilDay, patro::day::DayError> {
    let parts: Vec<&str> = text.split('-').collect();
    if parts.len() != 3 {
        return Err(patro::day::DayError::BadRequest(format!(
            "Invalid date: {text}"
        )));
    }
    let year = parts[0]
        .parse::<i32>()
        .map_err(|_| patro::day::DayError::BadRequest(format!("Invalid date: {text}")))?;
    let month = parts[1]
        .parse::<u32>()
        .map_err(|_| patro::day::DayError::BadRequest(format!("Invalid date: {text}")))?;
    let day = parts[2]
        .parse::<u32>()
        .map_err(|_| patro::day::DayError::BadRequest(format!("Invalid date: {text}")))?;
    if year < 1 || !(1..=12).contains(&month) || !(1..=31).contains(&day) {
        return Err(patro::day::DayError::BadRequest(format!(
            "Invalid date: {text}"
        )));
    }
    Ok(timescale::CivilDay::new(year, month, day))
}

fn day_build_options(q: &Query) -> Result<patro::day::DayBuildOptions, Response> {
    let include_detail = if q.contains_key("detail") {
        flag(q, "detail")?
    } else {
        true
    };
    let slim = flag(q, "slim")?;
    let festivals = flag(q, "festivals")?;
    Ok(patro::day::DayBuildOptions {
        detail: if include_detail {
            patro::day::DetailMode::Include
        } else {
            patro::day::DetailMode::Exclude
        },
        slim: if slim {
            patro::day::SlimMode::Slim
        } else {
            patro::day::SlimMode::Keep
        },
        festivals: if festivals {
            patro::day::FestivalMode::Include
        } else {
            patro::day::FestivalMode::Exclude
        },
    })
}

fn resolve_and_build_day(
    state: &AppState,
    date_key: Option<&str>,
    forced_jd: Option<f64>,
    q: &Query,
    headers: &HeaderMap,
) -> Response {
    let started = Instant::now();
    if let Some(r) = era_error(q).or_else(|| siddhanta_error(state, q)) {
        return r;
    }
    let location = match super::panchanga::location(q, state) {
        Ok(loc) => loc,
        Err(response) => return response,
    };
    let civil = match flag(q, "civil") {
        Ok(v) => v,
        Err(response) => return response,
    };
    let midnight = match reference(q) {
        Ok(r) => r == "midnight",
        Err(response) => return response,
    };
    let options = match day_build_options(q) {
        Ok(o) => o,
        Err(response) => return response,
    };
    let jd = match forced_jd {
        Some(value) => value,
        None => match patro::day::resolve_request_jd(q, date_key, &location) {
            Ok(value) => value,
            Err(error) => return day_error(error),
        },
    };
    let variant = patro::day::DayVariant {
        midnight,
        civil_timeline: civil,
    };
    let fields = match patro::day::day_fields_for_jd_with(jd, &location, options, variant) {
        Ok(fields) => fields,
        Err(error) => return day_error(error),
    };
    json_response_fields(&fields, q, headers, DAILY_CACHE_CONTROL, None, started)
}

/// `GET /v1/panchanga/{date_key}`.
pub(crate) async fn panchanga_day(
    State(state): State<AppState>,
    Path(date_key): Path<String>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    resolve_and_build_day(&state, Some(&date_key), None, &q, &headers)
}

/// `GET /v1/panchanga/today`.
pub(crate) async fn panchanga_day_today(
    State(state): State<AppState>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    resolve_and_build_day(&state, Some("today"), None, &q, &headers)
}

/// `GET /v1/panchanga` (query form: `?jd=` or `?year=&month=&day=`).
pub(crate) async fn panchanga_day_query(
    State(state): State<AppState>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    resolve_and_build_day(&state, None, None, &q, &headers)
}

/// `GET /v1/panchanga/jd/{jd_ut}`.
pub(crate) async fn panchanga_day_jd(
    State(state): State<AppState>,
    Path(jd_ut): Path<f64>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    resolve_and_build_day(&state, None, Some(jd_ut), &q, &headers)
}

/// `GET /v1/calendar/header/{bs_year}/{bs_month}`.
pub(crate) async fn calendar_header(
    State(state): State<AppState>,
    Path((bs_year, bs_month)): Path<(i64, i64)>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    let started = Instant::now();
    if let Some(r) = era_error(&q).or_else(|| siddhanta_error(&state, &q)) {
        return r;
    }
    let location = match super::panchanga::location(&q, &state) {
        Ok(loc) => loc,
        Err(response) => return response,
    };
    let signed = match i32::try_from(bs_year) {
        Ok(value) if value != 0 && (-3_891_138..=17_053).contains(&value) => value,
        _ => {
            return detail(
                StatusCode::BAD_REQUEST,
                "year must be a signed patro year (-3891138..-1 = BBS, 1..17053 = BS; 0 invalid)",
            );
        }
    };
    let month = match u32::try_from(bs_month) {
        Ok(value) if (1..=12).contains(&value) => value,
        _ => return detail(StatusCode::BAD_REQUEST, "month must be 1..12"),
    };
    let payload = match patro::day::calendar_header(signed, month, &location) {
        Ok(value) => value,
        Err(error) => return day_error(error),
    };
    json_plain_payload(&payload, &q, &headers, started)
}

/// `GET /v1/convert/ad-to-bs/{ad_date}`.
pub(crate) async fn convert_ad_to_bs(
    State(state): State<AppState>,
    Path(ad_date): Path<String>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    let started = Instant::now();
    if let Some(r) = era_error(&q).or_else(|| siddhanta_error(&state, &q)) {
        return r;
    }
    let ad = match parse_ad_date(&ad_date) {
        Ok(value) => value,
        Err(error) => return day_error(error),
    };
    let payload = match patro::day::convert_ad_to_bs(ad) {
        Ok(value) => value,
        Err(error) => return day_error(error),
    };
    json_plain_payload(&payload, &q, &headers, started)
}

/// `GET /v1/convert/bs-to-ad/{bs_date}`.
pub(crate) async fn convert_bs_to_ad(
    State(state): State<AppState>,
    Path(bs_date): Path<String>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    let started = Instant::now();
    if let Some(r) = era_error(&q).or_else(|| siddhanta_error(&state, &q)) {
        return r;
    }
    let payload = match patro::day::convert_bs_to_ad(&bs_date) {
        Ok(value) => value,
        Err(error) => return day_error(error),
    };
    json_plain_payload(&payload, &q, &headers, started)
}

/// pydantic `Literal` checks for query values, in declaration order.
fn literal_errors(q: &Query, checks: &[(&str, &[&str], &str)]) -> Vec<Value> {
    let mut errors = Vec::new();
    for (key, allowed, expected) in checks {
        if let Some(raw) = q.get(*key)
            && !allowed.contains(&raw.as_str())
        {
            errors.push(json!({
                "type": "literal_error", "loc": ["query", key],
                "msg": format!("Input should be {expected}"), "input": raw,
                "ctx": {"expected": expected},
            }));
        }
    }
    errors
}

const FORMATS: &[&str] = &["raw", "surya", "toyanath", "canonical", "patro", "dayblock"];
const FORMATS_EXPECTED: &str = "'raw', 'surya', 'toyanath', 'canonical', 'patro' or 'dayblock'";
const VARIANTS: &[&str] = &["default", "nepal_official", "toyanath", "surya"];
const VARIANTS_EXPECTED: &str = "'default', 'nepal_official', 'toyanath' or 'surya'";

fn locale_of(q: &Query) -> Locale {
    if q.get("locale").is_some_and(|l| l == "ne") {
        Locale::Ne
    } else {
        Locale::En
    }
}

/// The formatted body: text for `dayblock` + `output=text`, JSON otherwise.
fn formatted(
    payload: &Value,
    q: &Query,
    style: Style,
    headers: &HeaderMap,
    started: Instant,
) -> Response {
    if style == Style::Dayblock && q.get("output").is_some_and(|o| o == "text") {
        return raw_payload(
            payload["text"].as_str().unwrap_or("").to_owned(),
            "text/plain; charset=utf-8",
            &[],
            headers,
            1024,
            started,
        );
    }
    json_plain_payload(payload, q, headers, started)
}

/// `GET /v1/nepal/panchanga/{date_key}`.
pub(crate) async fn nepal_panchanga_day(
    State(state): State<AppState>,
    Path(date_key): Path<String>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    let started = Instant::now();
    if let Some(r) = era_error(&q).or_else(|| siddhanta_error(&state, &q)) {
        return r;
    }
    let loc = match location(&q, &state) {
        Ok(l) => l,
        Err(r) => return r,
    };
    let errors = literal_errors(
        &q,
        &[
            (
                "era",
                &["ad", "bc", "bs", "bbs"],
                "'ad', 'bc', 'bs' or 'bbs'",
            ),
            ("format", FORMATS, FORMATS_EXPECTED),
            ("variant", VARIANTS, VARIANTS_EXPECTED),
            ("locale", &["en", "ne"], "'en' or 'ne'"),
            ("output", &["json", "text"], "'json' or 'text'"),
        ],
    );
    if !errors.is_empty() {
        return detail_json(StatusCode::UNPROCESSABLE_ENTITY, &Value::Array(errors));
    }
    let era = q.get("era").map_or("bs", String::as_str);
    let Some(civil) = patro::date_key::civil_day_for_date_key(&date_key, era) else {
        return detail(
            StatusCode::BAD_REQUEST,
            &format!("{} is not a date this era can read", py_repr(&date_key)),
        );
    };
    let style = q
        .get("format")
        .and_then(|f| Style::parse(f))
        .unwrap_or(Style::Surya);
    let variant = q
        .get("variant")
        .cloned()
        .unwrap_or_else(|| "default".into());
    let locale = locale_of(&q);
    let built = tokio::task::spawn_blocking(move || {
        day_state_with_holidays(civil, &loc).map(|s| render_day(&s, &loc, style, &variant, locale))
    })
    .await;
    match built {
        Ok(Ok(payload)) => formatted(&payload, &q, style, &headers, started),
        Ok(Err(e)) => day_error(e),
        Err(_) => detail(StatusCode::INTERNAL_SERVER_ERROR, "internal error"),
    }
}

/// Python `repr()` of a short string.
fn py_repr(s: &str) -> String {
    if s.contains('\'') && !s.contains('"') {
        format!("\"{s}\"")
    } else {
        format!("'{}'", s.replace('\\', "\\\\").replace('\'', "\\'"))
    }
}

/// `GET /v1/nepal/panchanga/month/{bs_year}/{bs_month}`.
pub(crate) async fn nepal_panchanga_month(
    State(state): State<AppState>,
    Path((raw_year, raw_month)): Path<(String, String)>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    let started = Instant::now();
    if let Some(r) = era_error(&q).or_else(|| siddhanta_error(&state, &q)) {
        return r;
    }
    let (year, month) = match (
        path_int(&raw_year, "bs_year"),
        path_int(&raw_month, "bs_month"),
    ) {
        (Ok(y), Ok(m)) => (y, m),
        (Err(r), _) | (_, Err(r)) => return r,
    };
    let loc = match location(&q, &state) {
        Ok(l) => l,
        Err(r) => return r,
    };
    let mut errors = literal_errors(
        &q,
        &[
            ("format", FORMATS, FORMATS_EXPECTED),
            ("variant", VARIANTS, VARIANTS_EXPECTED),
        ],
    );
    let full = flag(&q, "full").unwrap_or_else(|_| {
        errors.push(json!({
            "type": "bool_parsing", "loc": ["query", "full"],
            "msg": "Input should be a valid boolean, unable to interpret input",
            "input": q.get("full"),
        }));
        false
    });
    errors.extend(literal_errors(
        &q,
        &[
            ("locale", &["en", "ne"], "'en' or 'ne'"),
            ("output", &["json", "text"], "'json' or 'text'"),
        ],
    ));
    if !errors.is_empty() {
        return detail_json(StatusCode::UNPROCESSABLE_ENTITY, &Value::Array(errors));
    }
    let signed = match signed_browse_year("bs", year) {
        Ok(y) => y,
        Err(r) => return r,
    };
    if !(1..=12).contains(&month) {
        return detail(StatusCode::BAD_REQUEST, "month must be 1..12");
    }
    let style = q
        .get("format")
        .and_then(|f| Style::parse(f))
        .unwrap_or(Style::Patro);
    let variant = q
        .get("variant")
        .cloned()
        .unwrap_or_else(|| "default".into());
    let locale = locale_of(&q);
    let month_u = u32::try_from(month).unwrap_or(1);
    let built = tokio::task::spawn_blocking(move || {
        render_month(
            signed,
            month_u,
            &loc,
            style,
            &variant,
            if full { Embed::Full } else { Embed::Lite },
            locale,
        )
    })
    .await;
    match built {
        Ok(Ok(payload)) => formatted(&payload, &q, style, &headers, started),
        Ok(Err(e)) => month_error(e),
        Err(_) => detail(StatusCode::INTERNAL_SERVER_ERROR, "internal error"),
    }
}
