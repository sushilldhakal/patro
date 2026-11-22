//! `/v1/nepal/gochar/…`: the transit table, ingress timelines and the yearly summary.

use std::time::Instant;

use axum::{
    extract::{Path, Query as AxumQuery, State},
    http::{HeaderMap, StatusCode},
    response::Response,
};
use jyotish::{
    Graha,
    gochar::{GocharError, Level, Upcoming, gochar, gochar_ingress, gochar_year},
};
use serde_json::{Value, json};
use timescale::CivilDay;

use super::panchanga::{location, path_int, signed_browse_year, year_directive};
use crate::{
    respond::{
        DEFAULT, Query, detail, detail_json, era_error, flag, json_payload, siddhanta_error,
    },
    state::AppState,
};

pub(crate) fn gochar_error(error: GocharError) -> Response {
    match error {
        GocharError::Daily(panchanga::daily::DailyError::BeforeGregorian(day)) => detail(
            StatusCode::NOT_IMPLEMENTED,
            &format!("{day}: days before 1582-10-15 are not ported to the Rust server yet"),
        ),
        other => detail(StatusCode::BAD_REQUEST, &other.to_string()),
    }
}

/// The common gate: era and siddhanta middleware errors.
fn gate(state: &AppState, q: &Query) -> Option<Response> {
    era_error(q).or_else(|| siddhanta_error(state, q))
}

/// `GET /v1/nepal/gochar/{date_key}` (`era`, default `bs`; `upcoming`).
pub(crate) async fn gochar_day(
    State(state): State<AppState>,
    Path(date_key): Path<String>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    let started = Instant::now();
    if let Some(r) = gate(&state, &q) {
        return r;
    }
    let loc = match location(&q, &state) {
        Ok(l) => l,
        Err(r) => return r,
    };
    let upcoming = match flag(&q, "upcoming") {
        Ok(true) => Upcoming::Include,
        Ok(false) => Upcoming::Skip,
        Err(r) => return r,
    };
    let era = q
        .get("era")
        .map_or_else(|| "bs".to_owned(), |e| e.trim().to_lowercase());
    let Some(civil) = patro::date_key::civil_day_for_date_key(&date_key, &era) else {
        return detail(
            StatusCode::BAD_REQUEST,
            &format!(
                "{} is not a date this era can read",
                patro::date_key::py_repr_str(&date_key)
            ),
        );
    };
    let jd = civil.to_jd_ut();
    match tokio::task::spawn_blocking(move || gochar(jd, &loc, upcoming)).await {
        Ok(Ok(payload)) => json_payload(&payload, &q, &headers, DEFAULT, None, started),
        Ok(Err(e)) => gochar_error(e),
        Err(_) => detail(StatusCode::INTERNAL_SERVER_ERROR, "internal error"),
    }
}

/// `GET /v1/nepal/gochar/jd/{jd_ut}`.
pub(crate) async fn gochar_jd(
    State(state): State<AppState>,
    Path(raw): Path<String>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    let started = Instant::now();
    if let Some(r) = gate(&state, &q) {
        return r;
    }
    let Ok(jd_ut) = raw.trim().parse::<f64>() else {
        return detail_json(
            StatusCode::UNPROCESSABLE_ENTITY,
            &json!([{
                "type": "float_parsing", "loc": ["path", "jd_ut"],
                "msg": "Input should be a valid number, unable to parse string as a number",
                "input": raw,
            }]),
        );
    };
    let loc = match location(&q, &state) {
        Ok(l) => l,
        Err(r) => return r,
    };
    let upcoming = match flag(&q, "upcoming") {
        Ok(true) => Upcoming::Include,
        Ok(false) => Upcoming::Skip,
        Err(r) => return r,
    };
    let civil = CivilDay::from_jd_ut(jd_ut);
    let jd = civil.to_jd_ut();
    match tokio::task::spawn_blocking(move || gochar(jd, &loc, upcoming)).await {
        Ok(Ok(payload)) => json_payload(&payload, &q, &headers, DEFAULT, None, started),
        Ok(Err(e)) => gochar_error(e),
        Err(_) => detail(StatusCode::INTERNAL_SERVER_ERROR, "internal error"),
    }
}

/// `GET /v1/nepal/gochar/year/{bs_year}`.
pub(crate) async fn gochar_year_summary(
    State(state): State<AppState>,
    Path(raw): Path<String>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    let started = Instant::now();
    if let Some(r) = gate(&state, &q) {
        return r;
    }
    let year = match path_int(&raw, "bs_year") {
        Ok(y) => y,
        Err(r) => return r,
    };
    let loc = match location(&q, &state) {
        Ok(l) => l,
        Err(r) => return r,
    };
    let signed = match signed_browse_year("bs", year) {
        Ok(y) => y,
        Err(r) => return r,
    };
    match tokio::task::spawn_blocking(move || gochar_year(signed, &loc)).await {
        Ok(Ok(payload)) => json_payload(
            &payload,
            &q,
            &headers,
            year_directive(signed),
            None,
            started,
        ),
        Ok(Err(e)) => gochar_error(e),
        Err(_) => detail(StatusCode::INTERNAL_SERVER_ERROR, "internal error"),
    }
}

/// The 422 items for the ingress query (`from`, `to` required; `level` literal).
fn ingress_query_errors(q: &Query) -> Vec<Value> {
    let mut errors = Vec::new();
    for key in ["from", "to"] {
        if !q.contains_key(key) {
            errors.push(json!({
                "type": "missing", "loc": ["query", key], "msg": "Field required", "input": null,
            }));
        }
    }
    if let Some(raw) = q.get("level")
        && Level::parse(raw).is_none()
    {
        let expected = "'pada', 'nakshatra', 'rashi', 'patro' or 'udayast'";
        errors.push(json!({
            "type": "literal_error", "loc": ["query", "level"],
            "msg": format!("Input should be {expected}"), "input": raw,
            "ctx": {"expected": expected},
        }));
    }
    errors
}

/// `GET /v1/nepal/gochar/ingress?from=&to=&era=&level=&grahas=`.
pub(crate) async fn gochar_ingress_range(
    State(state): State<AppState>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    let started = Instant::now();
    if let Some(r) = gate(&state, &q) {
        return r;
    }
    let loc = match location(&q, &state) {
        Ok(l) => l,
        Err(r) => return r,
    };
    let errors = ingress_query_errors(&q);
    if !errors.is_empty() {
        return detail_json(StatusCode::UNPROCESSABLE_ENTITY, &Value::Array(errors));
    }
    let level = q
        .get("level")
        .and_then(|l| Level::parse(l))
        .unwrap_or(Level::Pada);
    let grahas: Option<Vec<Graha>> = match q.get("grahas").filter(|g| !g.is_empty()) {
        None => None,
        Some(raw) => {
            let names: Vec<&str> = raw
                .split(',')
                .map(str::trim)
                .filter(|g| !g.is_empty())
                .collect();
            let unknown: Vec<&str> = names
                .iter()
                .copied()
                .filter(|g| Graha::from_key(g).is_none())
                .collect();
            if !unknown.is_empty() {
                return detail(
                    StatusCode::BAD_REQUEST,
                    &format!("Unknown graha(s): {}", unknown.join(", ")),
                );
            }
            Some(names.into_iter().filter_map(Graha::from_key).collect())
        }
    };
    let era = q
        .get("era")
        .map_or_else(|| "ad".to_owned(), |e| e.trim().to_lowercase());
    let (from_raw, to_raw) = (q["from"].clone(), q["to"].clone());
    let from_civil = patro::date_key::civil_day_for_date_key(&from_raw, &era);
    let to_civil = patro::date_key::civil_day_for_date_key(&to_raw, &era);
    let (from, to) = match (from_civil, to_civil) {
        // An endpoint before 1582-10-15 takes the Julian Day path directly.
        (Some(f), Some(t)) if !f.is_datetime_range() || !t.is_datetime_range() => (f, t),
        _ => match (
            patro::date_key::greg_day_for_date_key(&from_raw, &era),
            patro::date_key::greg_day_for_date_key(&to_raw, &era),
        ) {
            (Ok(f), Ok(t)) => (f, t),
            (Err(e), _) | (_, Err(e)) => return detail(StatusCode::BAD_REQUEST, &e),
        },
    };
    let built = tokio::task::spawn_blocking(move || {
        gochar_ingress(
            from.to_jd_ut(),
            to.to_jd_ut(),
            &loc,
            level,
            grahas.as_deref(),
        )
    })
    .await;
    match built {
        Ok(Ok(payload)) => json_payload(&payload, &q, &headers, DEFAULT, None, started),
        Ok(Err(e)) => gochar_error(e),
        Err(_) => detail(StatusCode::INTERNAL_SERVER_ERROR, "internal error"),
    }
}
