//! Year-span graha routes: panchak, graha-asta, graha-vakri, eclipses
//! (`api/patro.py`), and the day-level graha-sthiti.
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
use patro::date_key::{py_int, to_jd, year_span_jd};
use serde_json::{Value, json};
use timescale::CivilDay;

use super::panchanga::{location, path_int, signed_browse_year, year_directive};
use crate::{
    respond::{Query, detail, era_400, era_error, json_payload, siddhanta_error},
    state::AppState,
};

/// A year route's era: the `era` query (default `bs`), trimmed and lowercased.
fn era_param(q: &Query) -> String {
    q.get("era")
        .map(|e| e.trim().to_lowercase())
        .filter(|e| !e.is_empty())
        .unwrap_or_else(|| "bs".to_owned())
}

/// `validated_year_span_jd`: the span the era middleware resolved from a `?year=`
/// (with `era=` and no month/day), else `year_span_jd(era, path year)`.
fn year_span(q: &Query, era: &str, year: i64) -> Result<(f64, f64), Response> {
    let display = q
        .get("era")
        .map(|e| e.trim().to_lowercase())
        .filter(|e| !e.is_empty());
    let as_int = |k: &str| {
        q.get(k)
            .filter(|v| !v.trim().is_empty())
            .and_then(|v| py_int(v))
    };
    if let (Some(display), Some(qyear)) = (display, as_int("year")) {
        let parse_era = ["inputEra", "input_era"]
            .iter()
            .find_map(|k| q.get(*k).filter(|v| !v.is_empty()))
            .map(|v| v.trim().to_lowercase())
            .filter(|v| !v.is_empty())
            .unwrap_or(display);
        let (month, day) = (as_int("month"), as_int("day"));
        to_jd(&parse_era, qyear, month, day).map_err(|m| era_400(&m))?;
        if month.is_none() && day.is_none() {
            return year_span_jd(&parse_era, qyear).map_err(|m| era_400(&m));
        }
    }
    year_span_jd(era, year).map_err(|m| detail(StatusCode::BAD_REQUEST, &m))
}

/// `_cache_year_hint`: a BS-ish year for the past/live cache directive.
fn cache_year_hint(era: &str, year: i64) -> i32 {
    let y = i32::try_from(year).unwrap_or(i32::MAX);
    match era {
        "ad" => y.saturating_add(56),
        "bc" | "bbs" => -y.abs(),
        _ => y,
    }
}

/// `stamp_year_era`: the year/era labels and `gregorian_range`.
fn stamp_year_era(
    mut payload: Value,
    era: &str,
    year: i64,
    span: (f64, f64),
) -> Result<Value, Response> {
    if let Value::Object(fields) = &mut payload {
        if era == "ad" || era == "bc" {
            fields.insert("ad_year".into(), json!(year));
            fields.insert("era".into(), json!(era));
        } else {
            fields.insert("bs_year".into(), json!(signed_browse_year(era, year)?));
            fields.insert("era".into(), json!("bs"));
        }
        fields.insert(
            "gregorian_range".into(),
            json!({
                "start": CivilDay::from_jd_ut(span.0).to_string(),
                "end": CivilDay::from_jd_ut(span.1).to_string(),
            }),
        );
    }
    Ok(payload)
}

/// The shared front half of a year route: gate, path year, location, span.
struct YearRequest {
    loc: panchanga::daily::Location,
    era: String,
    year: i64,
    span: (f64, f64),
}

fn year_request(q: &Query, state: &AppState, raw_year: &str) -> Result<YearRequest, Response> {
    if let Some(r) = era_error(q).or_else(|| siddhanta_error(state, q)) {
        return Err(r);
    }
    let year = path_int(raw_year, "year")?;
    let loc = location(q, state)?;
    let era = era_param(q);
    let span = year_span(q, &era, year)?;
    Ok(YearRequest {
        loc,
        era,
        year,
        span,
    })
}

/// `GET /v1/nepal/panchak/year/{year}`.
pub(crate) async fn panchak_year(
    State(state): State<AppState>,
    Path(raw): Path<String>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    let started = Instant::now();
    let r = match year_request(&q, &state, &raw) {
        Ok(r) => r,
        Err(resp) => return resp,
    };
    let (span, loc) = (r.span, r.loc.clone());
    let Ok(payload) =
        tokio::task::spawn_blocking(move || jyotish::panchak::panchak_span(span.0, span.1, &loc))
            .await
    else {
        return detail(StatusCode::INTERNAL_SERVER_ERROR, "internal error");
    };
    match stamp_year_era(payload, &r.era, r.year, r.span) {
        Ok(p) => json_payload(
            &p,
            &q,
            &headers,
            year_directive(cache_year_hint(&r.era, r.year)),
            None,
            started,
        ),
        Err(resp) => resp,
    }
}

use super::gochar::gochar_error;

/// `GET /v1/nepal/graha-asta/year/{year}`: अस्त periods, the Moon's included.
pub(crate) async fn graha_asta_year(
    State(state): State<AppState>,
    Path(raw): Path<String>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    let started = Instant::now();
    let r = match year_request(&q, &state, &raw) {
        Ok(r) => r,
        Err(resp) => return resp,
    };
    let (span, loc) = (r.span, r.loc.clone());
    let built = tokio::task::spawn_blocking(move || {
        jyotish::graha_detail::graha_asta_span(span.0, span.1, &loc)
    })
    .await;
    let payload = match built {
        Ok(Ok(p)) => p,
        Ok(Err(e)) => return gochar_error(e),
        Err(_) => return detail(StatusCode::INTERNAL_SERVER_ERROR, "internal error"),
    };
    match stamp_year_era(payload, &r.era, r.year, r.span) {
        Ok(p) => json_payload(
            &p,
            &q,
            &headers,
            year_directive(cache_year_hint(&r.era, r.year)),
            None,
            started,
        ),
        Err(resp) => resp,
    }
}

/// `GET /v1/nepal/graha-vakri/year/{year}`: वक्री/मार्गी stations (no year stamp).
pub(crate) async fn graha_vakri_year(
    State(state): State<AppState>,
    Path(raw): Path<String>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    let started = Instant::now();
    let r = match year_request(&q, &state, &raw) {
        Ok(r) => r,
        Err(resp) => return resp,
    };
    let (span, loc) = (r.span, r.loc);
    let built = tokio::task::spawn_blocking(move || {
        jyotish::graha_detail::graha_vakri_span(span.0, span.1, &loc)
    })
    .await;
    match built {
        Ok(Ok(p)) => json_payload(&p, &q, &headers, crate::respond::DEFAULT, None, started),
        Ok(Err(e)) => gochar_error(e),
        Err(_) => detail(StatusCode::INTERNAL_SERVER_ERROR, "internal error"),
    }
}

/// `GET /v1/nepal/graha-sthiti/{date_key}` (`era`, default `ad`).
pub(crate) async fn graha_sthiti(
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
    let era = q
        .get("era")
        .map(|e| e.trim().to_lowercase())
        .filter(|e| !e.is_empty())
        .unwrap_or_else(|| "ad".to_owned());
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
    match tokio::task::spawn_blocking(move || jyotish::graha_detail::graha_sthiti(jd, &loc)).await {
        Ok(Ok(p)) => json_payload(&p, &q, &headers, crate::respond::DEFAULT, None, started),
        Ok(Err(e)) => gochar_error(e),
        Err(_) => detail(StatusCode::INTERNAL_SERVER_ERROR, "internal error"),
    }
}

/// `GET /v1/nepal/eclipse/{kind}/year/{year}`.
pub(crate) async fn eclipse_year(
    State(state): State<AppState>,
    Path((kind, raw)): Path<(String, String)>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    let started = Instant::now();
    if !matches!(kind.as_str(), "solar" | "lunar") {
        if let Some(r) = era_error(&q).or_else(|| siddhanta_error(&state, &q)) {
            return r;
        }
        return crate::respond::detail_json(
            StatusCode::UNPROCESSABLE_ENTITY,
            &json!([{
                "type": "literal_error", "loc": ["path", "kind"],
                "msg": "Input should be 'solar' or 'lunar'", "input": kind,
                "ctx": {"expected": "'solar' or 'lunar'"},
            }]),
        );
    }
    let r = match year_request(&q, &state, &raw) {
        Ok(r) => r,
        Err(resp) => return resp,
    };
    if r.loc.system.is_drik() {
        // Eclipses are computed from the text's own Moon latitude and shadow rules; drik has
        // no ported rule set (Besselian elements) yet, so say so rather than serve the
        // text's eclipses under drik's name.
        return detail(
            StatusCode::NOT_IMPLEMENTED,
            "eclipses are not available with siddhanta=drik yet; use siddhanta=surya_siddhanta",
        );
    }
    let which = if kind == "solar" {
        astronomy::surya_siddhanta::EclipseKind::Solar
    } else {
        astronomy::surya_siddhanta::EclipseKind::Lunar
    };
    let (span, loc) = (r.span, r.loc.clone());
    let Ok(payload) = tokio::task::spawn_blocking(move || {
        jyotish::graha_detail::eclipse_span(span.0, span.1, which, &loc)
    })
    .await
    else {
        return detail(StatusCode::INTERNAL_SERVER_ERROR, "internal error");
    };
    match stamp_year_era(payload, &r.era, r.year, r.span) {
        Ok(p) => json_payload(
            &p,
            &q,
            &headers,
            year_directive(cache_year_hint(&r.era, r.year)),
            None,
            started,
        ),
        Err(resp) => resp,
    }
}
