//! Building responses the way the `FastAPI` app sends them.
#![expect(
    clippy::result_large_err,
    reason = "a rejected request is answered with its axum Response, built once"
)]

use std::{collections::HashMap, io::Write as _, time::Instant};

use axum::{
    http::{HeaderMap, HeaderName, HeaderValue, StatusCode, header},
    response::{IntoResponse, Response},
};
use common::pyjson::{Style, dumps};
use flate2::{Compression, write::GzEncoder};
use serde_json::{Value, json};

/// `DEFAULT_CACHE_CONTROL`: what `serve_cached_json` sends when a route names none.
pub(crate) const DEFAULT: &str =
    "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800";
/// Edge directive for past BS years (`_IMMUTABLE_CACHE_CONTROL`).
pub(crate) const IMMUTABLE: &str =
    "public, max-age=86400, s-maxage=31536000, stale-while-revalidate=2592000, immutable";
/// Edge directive for the current and later BS years (`_LIVE_CACHE_CONTROL`).
pub(crate) const LIVE: &str = "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";
/// What the Redis layer adds to every public directive (`with_stale_if_error`).
const STALE_IF_ERROR: &str = "stale-if-error=86400";

/// The raw query, last value winning as Starlette reads it.
pub(crate) type Query = HashMap<String, String>;

/// `{"detail": …}` with a status, as `HTTPException` answers.
///
/// Carries the calculation headers: the siddhanta middleware wraps every route.
pub(crate) fn detail(status: StatusCode, message: &str) -> Response {
    detail_json(status, &json!(message))
}

/// `{"detail": …}` for a structured detail (pydantic 422 arrays, etc.).
pub(crate) fn detail_json(status: StatusCode, detail: &Value) -> Response {
    let body = dumps(&json!({"detail": detail}), Style::Compact);
    (status, CALC_HEADERS, body).into_response()
}

/// Content type plus the siddhanta middleware's headers.
const CALC_HEADERS: [(&str, &str); 3] = [
    ("content-type", "application/json"),
    ("x-siddhanta", "surya_siddhanta"),
    ("x-ayanamsha", "surya_siddhanta"),
];

/// pydantic's bool parsing for a query flag; `None` for an absent flag, `Err` for junk.
pub(crate) fn flag(q: &Query, name: &str) -> Result<bool, Response> {
    match q.get(name).map(|v| v.to_lowercase()) {
        None => Ok(false),
        Some(v) if matches!(v.as_str(), "true" | "1" | "yes" | "on" | "t" | "y") => Ok(true),
        Some(v) if matches!(v.as_str(), "false" | "0" | "no" | "off" | "f" | "n") => Ok(false),
        Some(_) => Err(detail_json(
            StatusCode::UNPROCESSABLE_ENTITY,
            &json!([{
                "type": "bool_parsing", "loc": ["query", name],
                "msg": "Input should be a valid boolean, unable to interpret input",
                "input": q.get(name),
            }]),
        )),
    }
}

fn with_stale_if_error(directive: &str) -> String {
    if directive.starts_with("public") && !directive.contains("stale-if-error") {
        format!("{directive}, {STALE_IF_ERROR}")
    } else {
        directive.to_owned()
    }
}

/// The body as sent, and the size `GZipMiddleware` judged it by. Python's era
/// middleware sits outside `GZip`, so `GZip` saw the compact route body before the era
/// layer re-rendered it: the 1024-byte threshold applies to that size.
fn rendered_body(payload: &Value, q: &Query) -> (String, PreEraLen) {
    let compact = dumps(payload, Style::Compact);
    let pre = PreEraLen(compact.len());
    let Some(era) = era_of(q) else {
        return (compact, pre);
    };
    let language = match q.get("language").map(|l| l.trim().to_lowercase()) {
        Some(l) if l == "en" || l == "ne" => l,
        _ => patro::era::era_language(&era).to_owned(),
    };
    (
        dumps(
            &patro::era::render_for_era(payload, &era, &language),
            Style::Default,
        ),
        pre,
    )
}

/// The body size `GZipMiddleware` saw, before the era layer re-rendered it; read
/// by the identity-path `Vary` layer.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) struct PreEraLen(pub(crate) usize);

/// Tags a response with the size `GZip` judged.
fn tagged(mut response: Response, pre: PreEraLen) -> Response {
    response.extensions_mut().insert(pre);
    response
}

/// A JSON 200 from a plain route (no explicit cache headers), with the
/// calculation headers and optional gzip as `FastAPI`'s `GZip` middleware does.
pub(crate) fn json_plain_payload(
    payload: &Value,
    q: &Query,
    request_headers: &HeaderMap,
    started: Instant,
) -> Response {
    let (body, pre) = rendered_body(payload, q);
    let mut headers = HeaderMap::new();
    let set = |h: &mut HeaderMap, k: &'static str, v: &str| {
        if let Ok(v) = HeaderValue::from_str(v) {
            h.insert(k, v);
        }
    };
    set(&mut headers, "content-type", "application/json");
    set(&mut headers, "x-siddhanta", "surya_siddhanta");
    set(&mut headers, "x-ayanamsha", "surya_siddhanta");
    let gzip = request_headers
        .get(header::ACCEPT_ENCODING)
        .and_then(|v| v.to_str().ok())
        .is_some_and(|v| v.to_lowercase().contains("gzip"))
        && pre.0 >= 1024;
    let bytes = if gzip {
        let mut enc = GzEncoder::new(Vec::with_capacity(body.len() / 4), Compression::new(6));
        if enc.write_all(body.as_bytes()).is_ok() {
            if let Ok(compressed) = enc.finish() {
                set(&mut headers, "content-encoding", "gzip");
                set(&mut headers, "vary", "Accept-Encoding");
                set(
                    &mut headers,
                    "server-timing",
                    &format!("app;dur={:.1}", started.elapsed().as_secs_f64() * 1000.0),
                );
                return tagged((StatusCode::OK, headers, compressed).into_response(), pre);
            }
        }
        body.into_bytes()
    } else {
        body.into_bytes()
    };
    set(
        &mut headers,
        "server-timing",
        &format!("app;dur={:.1}", started.elapsed().as_secs_f64() * 1000.0),
    );
    tagged((StatusCode::OK, headers, bytes).into_response(), pre)
}

/// A 200 body with its own content type and headers (a `StreamingResponse`), the
/// calculation headers, and gzip when accepted (`GZipMiddleware` compresses streams
/// whatever their size).
pub(crate) fn raw_payload(
    body: String,
    content_type: &str,
    extra: &[(&'static str, &str)],
    request_headers: &HeaderMap,
    min_gzip: usize,
    started: Instant,
) -> Response {
    let mut headers = HeaderMap::new();
    let set = |h: &mut HeaderMap, k: &'static str, v: &str| {
        if let Ok(v) = HeaderValue::from_str(v) {
            h.insert(k, v);
        }
    };
    set(&mut headers, "content-type", content_type);
    for (k, v) in extra {
        set(&mut headers, k, v);
    }
    set(&mut headers, "x-siddhanta", "surya_siddhanta");
    set(&mut headers, "x-ayanamsha", "surya_siddhanta");
    set(
        &mut headers,
        "server-timing",
        &format!("app;dur={:.1}", started.elapsed().as_secs_f64() * 1000.0),
    );
    let gzip = request_headers
        .get(header::ACCEPT_ENCODING)
        .and_then(|v| v.to_str().ok())
        .is_some_and(|v| v.to_lowercase().contains("gzip"))
        && body.len() >= min_gzip;
    if gzip {
        let mut enc = GzEncoder::new(Vec::with_capacity(body.len() / 4), Compression::new(6));
        if enc.write_all(body.as_bytes()).is_ok()
            && let Ok(compressed) = enc.finish()
        {
            set(&mut headers, "content-encoding", "gzip");
            set(&mut headers, "vary", "Accept-Encoding");
            return (StatusCode::OK, headers, compressed).into_response();
        }
    }
    (StatusCode::OK, headers, body.into_bytes()).into_response()
}

/// A JSON 200 a route answers with `Cache-Control` and `CDN-Cache-Control` both set to
/// `private, no-store` (no `Vary` of its own; `GZipMiddleware` adds one when it compresses).
pub(crate) fn json_no_store_payload(
    payload: &Value,
    q: &Query,
    request_headers: &HeaderMap,
    started: Instant,
) -> Response {
    let mut response = json_plain_payload(payload, q, request_headers, started);
    let headers = response.headers_mut();
    headers.insert(
        header::CACHE_CONTROL,
        HeaderValue::from_static("private, no-store"),
    );
    headers.insert(
        "cdn-cache-control",
        HeaderValue::from_static("private, no-store"),
    );
    response
}

/// A JSON 200 from a route that sets its own `Cache-Control` and `Vary:
/// Accept-Encoding` on a `JSONResponse` (no CDN directive): `GZipMiddleware` then
/// appends a second `Accept-Encoding` to `Vary` when it compresses.
pub(crate) fn json_private_payload(
    payload: &Value,
    q: &Query,
    request_headers: &HeaderMap,
    cache_control: &str,
    started: Instant,
) -> Response {
    let mut response = json_plain_payload(payload, q, request_headers, started);
    let gzipped = response.headers().contains_key(header::CONTENT_ENCODING);
    let vary = if gzipped {
        "Accept-Encoding, Accept-Encoding"
    } else {
        "Accept-Encoding"
    };
    let headers = response.headers_mut();
    if let Ok(v) = HeaderValue::from_str(cache_control) {
        headers.insert(header::CACHE_CONTROL, v);
    }
    headers.insert(header::VARY, HeaderValue::from_static(vary));
    response
}

/// A JSON 200 with the panchanga cache headers: the era layer's rendering when the
/// request named `era`, the compact cached bytes otherwise; gzip when accepted.
pub(crate) fn json_payload(
    payload: &Value,
    q: &Query,
    request_headers: &HeaderMap,
    cache_control: &str,
    cdn_cache_control: Option<&str>,
    started: Instant,
) -> Response {
    cached_json(
        payload,
        q,
        request_headers,
        (cache_control, cdn_cache_control),
        started,
        RouteVary::Set,
    )
}

/// [`json_payload`] for a route that returns its own `JSONResponse` with cache
/// headers but no `Vary` of its own (the day and at-time routes): `Vary` is then
/// only what `GZipMiddleware` adds.
pub(crate) fn json_response_payload(
    payload: &Value,
    q: &Query,
    request_headers: &HeaderMap,
    cache_control: &str,
    cdn_cache_control: Option<&str>,
    started: Instant,
) -> Response {
    cached_json(
        payload,
        q,
        request_headers,
        (cache_control, cdn_cache_control),
        started,
        RouteVary::None,
    )
}

/// Whether the route sets `Vary: Accept-Encoding` itself (the response cache does).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum RouteVary {
    Set,
    None,
}

fn cached_json(
    payload: &Value,
    q: &Query,
    request_headers: &HeaderMap,
    (cache_control, cdn_cache_control): (&str, Option<&str>),
    started: Instant,
    route_vary: RouteVary,
) -> Response {
    let (body, pre) = rendered_body(payload, q);
    let directive = with_stale_if_error(cache_control);
    let cdn_directive = with_stale_if_error(cdn_cache_control.unwrap_or(cache_control));
    let mut headers = HeaderMap::new();
    let set = |h: &mut HeaderMap, k: &'static str, v: &str| {
        if let Ok(v) = HeaderValue::from_str(v) {
            h.insert(k, v);
        }
    };
    set(&mut headers, "cache-control", &directive);
    set(&mut headers, "cdn-cache-control", &cdn_directive);
    if route_vary == RouteVary::Set {
        set(&mut headers, "vary", "Accept-Encoding");
    }
    set(&mut headers, "content-type", "application/json");
    set(&mut headers, "x-siddhanta", "surya_siddhanta");
    set(&mut headers, "x-ayanamsha", "surya_siddhanta");
    let gzip = request_headers
        .get(header::ACCEPT_ENCODING)
        .and_then(|v| v.to_str().ok())
        .is_some_and(|v| v.to_lowercase().contains("gzip"))
        // Cached bytes are stored gzipped whatever their size; a plain
        // `JSONResponse` is compressed by `GZipMiddleware` from 1024 bytes.
        && (route_vary == RouteVary::Set || pre.0 >= 1024);
    let bytes = if gzip {
        let mut enc = GzEncoder::new(Vec::with_capacity(body.len() / 4), Compression::new(6));
        if enc.write_all(body.as_bytes()).is_ok() {
            if let Ok(compressed) = enc.finish() {
                set(&mut headers, "content-encoding", "gzip");
                set(&mut headers, "vary", "Accept-Encoding");
                set(
                    &mut headers,
                    "server-timing",
                    &format!("app;dur={:.1}", started.elapsed().as_secs_f64() * 1000.0),
                );
                return tagged((StatusCode::OK, headers, compressed).into_response(), pre);
            }
        }
        body.into_bytes()
    } else {
        body.into_bytes()
    };
    set(
        &mut headers,
        "server-timing",
        &format!("app;dur={:.1}", started.elapsed().as_secs_f64() * 1000.0),
    );
    tagged((StatusCode::OK, headers, bytes).into_response(), pre)
}

/// The display era a request named, if any (`EraMiddleware` renders only then).
pub(crate) fn era_of(q: &Query) -> Option<String> {
    q.get("era")
        .map(|e| e.trim().to_lowercase())
        .filter(|e| !e.is_empty())
}

/// The era middleware's own 400 for an unknown `era` / `inputEra`.
///
/// When `era` + `year` + `month` are all present, also mirrors the middleware's
/// `to_jd(...)` month check (`month must be 1..12; got N`) with default JSON
/// separators — `FastAPI`'s festival listings hit this before the handler runs.
pub(crate) fn era_error(q: &Query) -> Option<Response> {
    if let Some(raw) = q.get("era") {
        let e = raw.trim().to_lowercase();
        if !e.is_empty() && !matches!(e.as_str(), "ad" | "bc" | "bs" | "bbs") {
            return Some(era_400(&format!(
                "era must be one of ad, bc, bs, bbs; got {}",
                py_repr_str(raw)
            )));
        }
    }
    for key in ["inputEra", "input_era"] {
        if let Some(raw) = q.get(key) {
            let e = raw.trim().to_lowercase();
            if !e.is_empty() && !matches!(e.as_str(), "ad" | "bc" | "bs" | "bbs") {
                return Some(era_400(&format!(
                    "inputEra must be one of ad, bc, bs, bbs; got {}",
                    py_repr_str(raw)
                )));
            }
        }
    }
    if era_of(q).is_some()
        && q.get("year").is_some_and(|y| y.parse::<i32>().is_ok())
        && let Some(raw) = q.get("month")
        && let Ok(month) = raw.parse::<i32>()
        && !(1..=12).contains(&month)
    {
        return Some(era_400(&format!("month must be 1..12; got {month}")));
    }
    None
}

/// pydantic's 422 items for `era_params` (`jd: float`, `year: int >= 1`,
/// `month: 1..=12`, `day: int >= 1`), in declaration order.
pub(crate) fn era_params_errors(q: &Query) -> Vec<Value> {
    let mut errors = Vec::new();
    if let Some(raw) = q.get("jd")
        && raw.trim().parse::<f64>().is_err()
    {
        errors.push(json!({
            "type": "float_parsing", "loc": ["query", "jd"],
            "msg": "Input should be a valid number, unable to parse string as a number", "input": raw,
        }));
    }
    for (key, le) in [("year", None), ("month", Some(12)), ("day", None)] {
        let Some(raw) = q.get(key) else { continue };
        match raw.trim().parse::<i64>() {
            Err(_) => errors.push(json!({
                "type": "int_parsing", "loc": ["query", key],
                "msg": "Input should be a valid integer, unable to parse string as an integer", "input": raw,
            })),
            Ok(v) if v < 1 => errors.push(json!({
                "type": "greater_than_equal", "loc": ["query", key],
                "msg": "Input should be greater than or equal to 1", "input": raw, "ctx": {"ge": 1},
            })),
            Ok(v) if le.is_some_and(|le| v > le) => errors.push(json!({
                "type": "less_than_equal", "loc": ["query", key],
                "msg": format!("Input should be less than or equal to {}", le.unwrap_or(12)),
                "input": raw, "ctx": {"le": le},
            })),
            Ok(_) => {}
        }
    }
    errors
}

/// The siddhanta middleware's check: only the Surya Siddhanta is ported.
pub(crate) fn siddhanta_error(q: &Query) -> Option<Response> {
    let raw = q.get("siddhanta")?;
    let v = raw.trim().to_lowercase().replace('-', "_");
    match v.as_str() {
        "" | "surya_siddhanta" | "surya" | "ss" => None,
        "drik" => Some(detail(
            StatusCode::NOT_IMPLEMENTED,
            "siddhanta=drik is not ported to the Rust server yet",
        )),
        _ => Some(python_json_400(&format!(
            "siddhanta must be one of drik, surya_siddhanta; got {}",
            py_repr_str(raw)
        ))),
    }
}

/// A 400 whose body Python wrote with `json.dumps` default separators.
fn python_json_400(message: &str) -> Response {
    let body = dumps(&json!({"detail": message}), Style::Default);
    (
        StatusCode::BAD_REQUEST,
        [(header::CONTENT_TYPE, "application/json")],
        body,
    )
        .into_response()
}

/// The era middleware's 400: default separators, inside the siddhanta middleware.
pub(crate) fn era_400(message: &str) -> Response {
    let body = dumps(&json!({"detail": message}), Style::Default);
    (StatusCode::BAD_REQUEST, CALC_HEADERS, body).into_response()
}

/// Python `repr()` of a short string, for error messages.
fn py_repr_str(s: &str) -> String {
    if s.contains('\'') && !s.contains('"') {
        format!("\"{s}\"")
    } else {
        format!("'{}'", s.replace('\'', "\\'"))
    }
}

/// A JSON 200 with calculation headers and optional cache headers.
pub(crate) fn json_compact(
    payload: &Value,
    q: &Query,
    request_headers: &HeaderMap,
    cache_control: Option<&str>,
    cdn_cache_control: Option<&str>,
    started: Instant,
) -> Response {
    let (body, pre) = rendered_body(payload, q);
    json_body(
        body,
        pre,
        request_headers,
        cache_control,
        cdn_cache_control,
        started,
    )
}

fn json_body(
    body: String,
    pre: PreEraLen,
    request_headers: &HeaderMap,
    cache_control: Option<&str>,
    cdn_cache_control: Option<&str>,
    started: Instant,
) -> Response {
    let mut headers = HeaderMap::new();
    let set = |h: &mut HeaderMap, k: &'static str, v: &str| {
        if let Ok(v) = HeaderValue::from_str(v) {
            h.insert(k, v);
        }
    };
    if let Some(cache) = cache_control {
        set(&mut headers, "cache-control", &with_stale_if_error(cache));
    }
    if let Some(cdn) = cdn_cache_control {
        set(&mut headers, "cdn-cache-control", &with_stale_if_error(cdn));
    }
    set(&mut headers, "content-type", "application/json");
    set(&mut headers, "x-siddhanta", "surya_siddhanta");
    set(&mut headers, "x-ayanamsha", "surya_siddhanta");
    let gzip = request_headers
        .get(header::ACCEPT_ENCODING)
        .and_then(|v| v.to_str().ok())
        .is_some_and(|v| v.to_lowercase().contains("gzip"))
        // `GZipMiddleware(minimum_size=1024)`, which adds `Vary` only when it compresses.
        && pre.0 >= 1024;
    let bytes = if gzip {
        let mut enc = GzEncoder::new(Vec::with_capacity(body.len() / 4), Compression::new(6));
        if enc.write_all(body.as_bytes()).is_ok() {
            if let Ok(compressed) = enc.finish() {
                set(&mut headers, "content-encoding", "gzip");
                set(&mut headers, "vary", "Accept-Encoding");
                set(
                    &mut headers,
                    "server-timing",
                    &format!("app;dur={:.1}", started.elapsed().as_secs_f64() * 1000.0),
                );
                return tagged((StatusCode::OK, headers, compressed).into_response(), pre);
            }
        }
        body.into_bytes()
    } else {
        body.into_bytes()
    };
    set(
        &mut headers,
        "server-timing",
        &format!("app;dur={:.1}", started.elapsed().as_secs_f64() * 1000.0),
    );
    tagged((StatusCode::OK, headers, bytes).into_response(), pre)
}

/// A `serve_cached_json` 200 to a POST: `Cache-Control` and `CDN-Cache-Control` as
/// given (the Redis layer, which adds `stale-if-error`, only handles GET), `Vary`,
/// and the pre-compressed body when gzip is accepted.
pub(crate) fn json_cached_post(
    payload: &Value,
    request_headers: &HeaderMap,
    cache_control: &str,
    started: Instant,
) -> Response {
    let mut response = json_payload(
        payload,
        &Query::new(),
        request_headers,
        cache_control,
        None,
        started,
    );
    let headers = response.headers_mut();
    for name in [
        header::CACHE_CONTROL,
        HeaderName::from_static("cdn-cache-control"),
    ] {
        if let Ok(v) = HeaderValue::from_str(cache_control) {
            headers.insert(name, v);
        }
    }
    response
}

/// `{"detail": …}` with the calculation headers, gzipped (with `Vary`) when the
/// client accepts it and the body reaches `GZipMiddleware`'s 1024-byte minimum.
pub(crate) fn detail_json_gzip(
    status: StatusCode,
    detail: &Value,
    request_headers: &HeaderMap,
) -> Response {
    let body = dumps(&json!({"detail": detail}), Style::Compact);
    let gzip = request_headers
        .get(header::ACCEPT_ENCODING)
        .and_then(|v| v.to_str().ok())
        .is_some_and(|v| v.to_lowercase().contains("gzip"))
        && body.len() >= 1024;
    if gzip {
        let mut enc = GzEncoder::new(Vec::with_capacity(body.len() / 4), Compression::new(6));
        if enc.write_all(body.as_bytes()).is_ok()
            && let Ok(compressed) = enc.finish()
        {
            let mut response = (status, CALC_HEADERS, compressed).into_response();
            let h = response.headers_mut();
            h.insert(header::CONTENT_ENCODING, HeaderValue::from_static("gzip"));
            h.insert(header::VARY, HeaderValue::from_static("Accept-Encoding"));
            return response;
        }
    }
    (status, CALC_HEADERS, body).into_response()
}
