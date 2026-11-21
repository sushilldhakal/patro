//! `_versioned_edge_lifetime`: a public 200 pinned to the current `?cv=` is held at the
//! edge for a month, but only when the URL itself names the day it describes.

use std::collections::HashMap;

use axum::{
    extract::{Query, Request},
    http::{HeaderValue, Method, StatusCode, header},
    middleware::Next,
    response::Response,
};

/// `CACHE_PAYLOAD_VERSION`.
const CACHE_PAYLOAD_VERSION: &str = "6506";
/// `VERSIONED_BROWSER_CACHE_CONTROL` (with the Redis layer's `stale-if-error`).
const VERSIONED_BROWSER: &str =
    "public, max-age=86400, stale-while-revalidate=604800, stale-if-error=86400";
/// `VERSIONED_CDN_CACHE_CONTROL` (with the Redis layer's `stale-if-error`).
const VERSIONED_CDN: &str =
    "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=2592000, stale-if-error=86400";
/// `_FIXED_DAY_QUERY`.
const FIXED_DAY_QUERY: [&str; 5] = ["date", "jd", "year", "from", "bs_year"];

fn is_ymd(s: &str) -> bool {
    let b = s.as_bytes();
    b.len() >= 10
        && b[..4].iter().all(u8::is_ascii_digit)
        && b[4] == b'-'
        && b[5..7].iter().all(u8::is_ascii_digit)
        && b[7] == b'-'
        && b[8..10].iter().all(u8::is_ascii_digit)
}

/// `-?\d` at the start of a segment.
fn starts_signed_digit(s: &str) -> bool {
    let rest = s.strip_prefix('-').unwrap_or(s);
    rest.starts_with(|c: char| c.is_ascii_digit())
}

/// `-?[\d.]` at the start of a segment (a Julian Day).
fn starts_signed_jd(s: &str) -> bool {
    let rest = s.strip_prefix('-').unwrap_or(s);
    rest.starts_with(|c: char| c.is_ascii_digit() || c == '.')
}

fn all_signed_digits(s: &str) -> bool {
    let rest = s.strip_prefix('-').unwrap_or(s);
    !rest.is_empty() && rest.chars().all(|c| c.is_ascii_digit())
}

/// `_FIXED_DAY_PATH.search(path)`.
fn fixed_day_path(path: &str) -> bool {
    let segs: Vec<&str> = path.split('/').collect();
    segs.iter().enumerate().skip(1).any(|(i, seg)| {
        let next = segs.get(i + 1).copied();
        let after = segs.get(i + 2).copied();
        (seg.len() == 10 && is_ymd(seg))
            || (*seg == "jd" && next.is_some_and(starts_signed_jd))
            || (matches!(*seg, "year" | "special-months") && next.is_some_and(starts_signed_digit))
            || (*seg == "patro"
                && next.is_some_and(all_signed_digits)
                && after.is_some_and(|a| a.starts_with(|c: char| c.is_ascii_digit())))
            || (*seg == "gochar" && next.is_some_and(is_ymd))
    })
}

/// `versioned_cache_headers`: whether a response gets the versioned lifetimes.
fn versioned(query: &HashMap<String, String>, path: &str, cache_control: Option<&str>) -> bool {
    if query.get("cv").map(String::as_str) != Some(CACHE_PAYLOAD_VERSION) {
        return false;
    }
    let Some(cc) = cache_control else {
        return false;
    };
    if !cc.starts_with("public") || cc.contains("max-age=0") {
        return false;
    }
    fixed_day_path(path)
        || FIXED_DAY_QUERY
            .iter()
            .any(|k| query.get(*k).is_some_and(|v| !v.is_empty()))
}

/// The middleware.
pub(crate) async fn versioned_edge_lifetime(request: Request, next: Next) -> Response {
    let is_get = request.method() == Method::GET;
    let path = request.uri().path().to_owned();
    let query = Query::<HashMap<String, String>>::try_from_uri(request.uri())
        .map(|q| q.0)
        .unwrap_or_default();
    let mut response = next.run(request).await;
    if is_get && response.status() == StatusCode::OK {
        let cc = response
            .headers()
            .get(header::CACHE_CONTROL)
            .and_then(|v| v.to_str().ok());
        if versioned(&query, &path, cc) {
            let headers = response.headers_mut();
            headers.insert(
                header::CACHE_CONTROL,
                HeaderValue::from_static(VERSIONED_BROWSER),
            );
            headers.insert("cdn-cache-control", HeaderValue::from_static(VERSIONED_CDN));
        }
    }
    response
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fixed_day_paths_match_the_python_regex() {
        for path in [
            "/v1/panchanga/2083-08-05",
            "/v1/panchanga/jd/2461365.5",
            "/v1/panchanga/year/2083",
            "/v1/panchanga/year/-200/sun",
            "/v1/nepal/patro/2083/8",
            "/v1/nepal/special-months/2083",
            "/v1/gochar/2026-11-21",
        ] {
            assert!(fixed_day_path(path), "{path} names a day");
        }
        for path in [
            "/v1/panchanga/2083/8",
            "/v1/panchanga/rashifal",
            "/v1/panchanga/today",
            "/v1/panchanga/at-time",
        ] {
            assert!(!fixed_day_path(path), "{path} names no day");
        }
    }
}
