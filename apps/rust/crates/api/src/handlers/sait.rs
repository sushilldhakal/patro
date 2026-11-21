//! `/v1/nepal/sait/...` routes.
#![expect(
    clippy::result_large_err,
    reason = "a rejected request is answered with its axum Response, built once"
)]

use std::{collections::BTreeSet, io::Write as _};

use axum::{
    extract::{Path, Query as AxumQuery, State},
    http::{HeaderMap, HeaderValue, StatusCode, header},
    response::{IntoResponse, Response},
};
use common::pyjson::{Style, dumps};
use flate2::{Compression, write::GzEncoder};
use geography::{LocationError, LocationQuery};
use panchanga::daily::Location;
use patro::sait::{
    SaitError, get_sait_about, get_sait_about_all, get_sait_detail, get_sait_month_all,
    get_sait_month_entries, list_sait_categories, list_sait_years, personalize_for_birth,
};
use serde_json::json;
use timescale::CivilDay;

use crate::{
    respond::{IMMUTABLE, LIVE, Query, detail as detail_response, era_error, siddhanta_error},
    state::AppState,
};

const SAIT_CUSTOM_CACHE_CONTROL: &str =
    "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400";
const STALE_IF_ERROR: &str = "stale-if-error=86400";

/// Whether the route itself already sets `Vary: Accept-Encoding` (detail/personalize).
#[derive(Debug, Clone, Copy)]
enum RouteVary {
    /// Handler sets `Vary` before gzip may append another copy (Python quirk).
    AcceptEncoding,
    /// No route-level Vary; gzip alone may add one.
    None,
}

fn with_stale_if_error(directive: &str) -> String {
    if directive.starts_with("public") && !directive.contains("stale-if-error") {
        format!("{directive}, {STALE_IF_ERROR}")
    } else {
        directive.to_owned()
    }
}

fn emit_json(
    payload: &serde_json::Value,
    q: &Query,
    headers: &HeaderMap,
    cache_control: Option<&str>,
    route_vary: RouteVary,
) -> Response {
    // Starlette GZip sees the handler body *before* EraMiddleware rewrites it
    // (compact, no era/language). Gzip + Vary must follow that pre-era size.
    let compact = dumps(payload, Style::Compact);
    let body = match crate::respond::era_of(q) {
        Some(era) => {
            let language = match q.get("language").map(|l| l.trim().to_lowercase()) {
                Some(language) if language == "en" || language == "ne" => language,
                _ => patro::era::era_language(&era).to_owned(),
            };
            dumps(
                &patro::era::render_for_era(payload, &era, &language),
                Style::Default,
            )
        }
        None => compact.clone(),
    };
    let mut out = HeaderMap::new();
    out.insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("application/json"),
    );
    out.insert("x-siddhanta", HeaderValue::from_static("surya_siddhanta"));
    out.insert("x-ayanamsha", HeaderValue::from_static("surya_siddhanta"));
    if let Some(cache) = cache_control {
        if let Ok(value) = HeaderValue::from_str(&with_stale_if_error(cache)) {
            out.insert("cache-control", value.clone());
            out.insert("cdn-cache-control", value);
        }
        if matches!(route_vary, RouteVary::AcceptEncoding) {
            out.insert("vary", HeaderValue::from_static("Accept-Encoding"));
        }
    }
    let accept_gzip = headers
        .get(header::ACCEPT_ENCODING)
        .and_then(|v| v.to_str().ok())
        .is_some_and(|v| v.to_lowercase().contains("gzip"));
    let python_gzip_threshold = 1024;
    if accept_gzip && compact.len() >= python_gzip_threshold {
        let mut encoder = GzEncoder::new(Vec::with_capacity(body.len() / 4), Compression::new(6));
        if encoder.write_all(body.as_bytes()).is_ok() {
            if let Ok(compressed) = encoder.finish() {
                out.insert("content-encoding", HeaderValue::from_static("gzip"));
                if let Some(existing) = out.get("vary").and_then(|v| v.to_str().ok()) {
                    if let Ok(v) = HeaderValue::from_str(&format!("{existing}, Accept-Encoding")) {
                        out.insert("vary", v);
                    }
                } else {
                    out.insert("vary", HeaderValue::from_static("Accept-Encoding"));
                }
                return (StatusCode::OK, out, compressed).into_response();
            }
        }
    }
    let mut response = (StatusCode::OK, out, body).into_response();
    response
        .extensions_mut()
        .insert(crate::respond::PreEraLen(compact.len()));
    response
}

/// FastAPI/pydantic `int_parsing` body for a bad query integer.
fn pydantic_int_parsing(field: &str, input: &str) -> Response {
    let body = dumps(
        &json!({
            "detail": [{
                "type": "int_parsing",
                "loc": ["query", field],
                "msg": "Input should be a valid integer, unable to parse string as an integer",
                "input": input,
            }]
        }),
        Style::Compact,
    );
    let mut headers = HeaderMap::new();
    headers.insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("application/json"),
    );
    headers.insert("x-siddhanta", HeaderValue::from_static("surya_siddhanta"));
    headers.insert("x-ayanamsha", HeaderValue::from_static("surya_siddhanta"));
    (StatusCode::UNPROCESSABLE_ENTITY, headers, body).into_response()
}

fn location(q: &Query, state: &AppState) -> Result<Location, Response> {
    let parse_f = |k: &str| -> Result<Option<f64>, Response> {
        q.get(k)
            .map(|v| {
                v.parse::<f64>().map_err(|_| {
                    detail_response(
                        StatusCode::UNPROCESSABLE_ENTITY,
                        &format!("{k}: Input should be a valid number"),
                    )
                })
            })
            .transpose()
    };
    let query = LocationQuery {
        lat: parse_f("lat")?,
        lon: parse_f("lon")?,
        timezone: q.get("timezone").cloned(),
        city: q.get("city").cloned(),
        city_id: q
            .get("city_id")
            .map(|v| {
                v.parse::<i64>()
                    .map_err(|_| pydantic_int_parsing("city_id", v))
            })
            .transpose()?,
    };
    geography::resolve_location(&query, &state.cities).map_err(|e| match e {
        LocationError::Invalid(msg) => detail_response(StatusCode::BAD_REQUEST, &msg),
        other => detail_response(StatusCode::SERVICE_UNAVAILABLE, &other.to_string()),
    })
}

fn current_bs_year() -> i32 {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_or(0.0, |d| d.as_secs_f64());
    let today = CivilDay::from_jd_ut(2_440_587.5 + now / 86_400.0);
    calendar::civil_to_bs(today).map_or(0, |bs| bs.year)
}

fn map_error(err: SaitError) -> Response {
    match err {
        SaitError::BadRequest(message) => detail_response(StatusCode::BAD_REQUEST, &message),
        SaitError::NotFound(message) => detail_response(StatusCode::NOT_FOUND, &message),
        SaitError::NotImplemented(message) => {
            detail_response(StatusCode::NOT_IMPLEMENTED, &message)
        }
        _ => detail_response(StatusCode::INTERNAL_SERVER_ERROR, "internal sait error"),
    }
}

fn parse_u32(q: &Query, key: &str) -> Result<Option<u32>, Response> {
    q.get(key)
        .map(|v| v.parse::<u32>().map_err(|_| pydantic_int_parsing(key, v)))
        .transpose()
}

fn parse_i32(q: &Query, key: &str) -> Result<Option<i32>, Response> {
    q.get(key)
        .map(|v| v.parse::<i32>().map_err(|_| pydantic_int_parsing(key, v)))
        .transpose()
}

fn validate_bs_year(bs_year: i32) -> Result<(), Response> {
    if bs_year == 0 || !(-3_891_138..=17053).contains(&bs_year) {
        return Err(detail_response(
            StatusCode::BAD_REQUEST,
            "year must be a signed patro year (-3891138..-1 = BBS, 1..17053 = BS; 0 invalid)",
        ));
    }
    Ok(())
}

fn pre_checks(q: &Query) -> Option<Response> {
    era_error(q).or_else(|| siddhanta_error(q))
}

pub(crate) async fn categories(AxumQuery(q): AxumQuery<Query>, headers: HeaderMap) -> Response {
    if let Some(err) = pre_checks(&q) {
        return err;
    }
    match list_sait_categories() {
        Ok(payload) => emit_json(&payload, &q, &headers, None, RouteVary::None),
        Err(err) => map_error(err),
    }
}

pub(crate) async fn years(AxumQuery(q): AxumQuery<Query>, headers: HeaderMap) -> Response {
    if let Some(err) = pre_checks(&q) {
        return err;
    }
    emit_json(&list_sait_years(), &q, &headers, None, RouteVary::None)
}

pub(crate) async fn about_all(AxumQuery(q): AxumQuery<Query>, headers: HeaderMap) -> Response {
    if let Some(err) = pre_checks(&q) {
        return err;
    }
    match get_sait_about_all() {
        Ok(payload) => emit_json(&payload, &q, &headers, None, RouteVary::None),
        Err(err) => map_error(err),
    }
}

pub(crate) async fn about_category(
    Path(category): Path<String>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    if let Some(err) = pre_checks(&q) {
        return err;
    }
    match get_sait_about(&category) {
        Ok(payload) => emit_json(&payload, &q, &headers, None, RouteVary::None),
        Err(err) => map_error(err),
    }
}

pub(crate) async fn month_all(
    State(state): State<AppState>,
    Path((bs_year, bs_month)): Path<(i32, u32)>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    if let Some(err) = pre_checks(&q) {
        return err;
    }
    if let Err(err) = validate_bs_year(bs_year) {
        return err;
    }
    let location = match location(&q, &state) {
        Ok(loc) => loc,
        Err(err) => return err,
    };
    match get_sait_month_all(bs_year, bs_month, &location) {
        Ok(payload) => emit_json(&payload, &q, &headers, None, RouteVary::None),
        Err(err) => map_error(err),
    }
}

pub(crate) async fn listing(
    State(state): State<AppState>,
    Path((bs_year, category)): Path<(i32, String)>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    if let Some(err) = pre_checks(&q) {
        return err;
    }
    if let Err(err) = validate_bs_year(bs_year) {
        return err;
    }
    let location = match location(&q, &state) {
        Ok(loc) => loc,
        Err(err) => return err,
    };
    match get_sait_month_entries(bs_year, &category, &location) {
        Ok(payload) => emit_json(&payload, &q, &headers, None, RouteVary::None),
        Err(err) => map_error(err),
    }
}

pub(crate) async fn detail(
    State(state): State<AppState>,
    Path((bs_year, category)): Path<(i32, String)>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    if let Some(err) = pre_checks(&q) {
        return err;
    }
    if let Err(err) = validate_bs_year(bs_year) {
        return err;
    }
    let location = match location(&q, &state) {
        Ok(loc) => loc,
        Err(err) => return err,
    };
    let exclude_rules = q.get("exclude").map_or_else(BTreeSet::new, |raw| {
        raw.split(',')
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .map(ToOwned::to_owned)
            .collect()
    });
    let nakshatra_mode = q.get("nakshatra_mode").map(String::as_str);
    let custom = !exclude_rules.is_empty()
        || nakshatra_mode
            .map(str::trim)
            .is_some_and(|m| !m.is_empty() && !m.eq_ignore_ascii_case("classical"));
    let cache_control = if custom {
        SAIT_CUSTOM_CACHE_CONTROL
    } else if bs_year < current_bs_year() {
        IMMUTABLE
    } else {
        LIVE
    };
    match get_sait_detail(
        bs_year,
        &category,
        &location,
        &exclude_rules,
        nakshatra_mode,
    ) {
        Ok(payload) => emit_json(
            &payload,
            &q,
            &headers,
            Some(cache_control),
            RouteVary::AcceptEncoding,
        ),
        Err(err) => map_error(err),
    }
}

pub(crate) async fn personalize(
    State(state): State<AppState>,
    Path((bs_year, category)): Path<(i32, String)>,
    AxumQuery(q): AxumQuery<Query>,
    headers: HeaderMap,
) -> Response {
    if let Some(err) = pre_checks(&q) {
        return err;
    }
    if let Err(err) = validate_bs_year(bs_year) {
        return err;
    }
    let location = match location(&q, &state) {
        Ok(loc) => loc,
        Err(err) => return err,
    };
    let janma_nakshatra = match parse_u32(&q, "janma_nakshatra") {
        Ok(v) => v,
        Err(err) => return err,
    };
    let janma_rashi = match parse_u32(&q, "janma_rashi") {
        Ok(v) => v,
        Err(err) => return err,
    };
    let birth_year = match parse_i32(&q, "birth_year") {
        Ok(v) => v,
        Err(err) => return err,
    };
    let birth_month = match parse_u32(&q, "birth_month") {
        Ok(v) => v,
        Err(err) => return err,
    };
    let birth_day = match parse_u32(&q, "birth_day") {
        Ok(v) => v,
        Err(err) => return err,
    };
    match personalize_for_birth(
        bs_year,
        &category,
        &location,
        janma_nakshatra,
        janma_rashi,
        q.get("birth").map(String::as_str),
        q.get("birth_tz").map_or("Asia/Kathmandu", String::as_str),
        q.get("birth_era").map(String::as_str),
        birth_year,
        birth_month,
        birth_day,
        q.get("birth_clock").map(String::as_str),
        q.get("gender").map(String::as_str),
    ) {
        Ok(payload) => emit_json(
            &payload,
            &q,
            &headers,
            Some(SAIT_CUSTOM_CACHE_CONTROL),
            RouteVary::AcceptEncoding,
        ),
        Err(err) => map_error(err),
    }
}
