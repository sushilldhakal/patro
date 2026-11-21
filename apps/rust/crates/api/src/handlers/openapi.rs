//! `/openapi.json`, `/docs`, `/redoc` and `/docs/oauth2-redirect`: `FastAPI`'s schema
//! and docs pages, recorded from the Python app (`scripts/gen_openapi_assets.py`).
//! The Rust server keeps Python's routes, parameters and shapes, so the same schema
//! describes it. `API_PUBLIC_PREFIX` (nginx serving under `/api`) rewrites the URLs
//! the way `FastAPI`'s `root_path` does.

use std::{sync::OnceLock, time::Instant};

use axum::{http::HeaderMap, response::Response};

use crate::respond::raw_payload;

const OPENAPI: &str = include_str!("../../assets/openapi/openapi.json");
const DOCS: &str = include_str!("../../assets/openapi/docs.html");
const REDOC: &str = include_str!("../../assets/openapi/redoc.html");
const OAUTH2_REDIRECT: &str = include_str!("../../assets/openapi/oauth2-redirect.html");
const HTML: &str = "text/html; charset=utf-8";

/// `config.api_public_prefix()`: trimmed, no trailing slash, leading slash added.
fn prefix() -> &'static str {
    static PREFIX: OnceLock<String> = OnceLock::new();
    PREFIX.get_or_init(|| {
        let raw = std::env::var("API_PUBLIC_PREFIX").unwrap_or_default();
        let raw = raw.trim().trim_end_matches('/');
        if raw.is_empty() {
            String::new()
        } else if raw.starts_with('/') {
            raw.to_owned()
        } else {
            format!("/{raw}")
        }
    })
}

/// The schema; with a prefix `FastAPI` appends `"servers":[{"url":"<prefix>"}]`.
fn schema() -> &'static str {
    static SCHEMA: OnceLock<String> = OnceLock::new();
    SCHEMA.get_or_init(|| {
        let p = prefix();
        if p.is_empty() {
            return OPENAPI.to_owned();
        }
        let body = OPENAPI.trim_end().strip_suffix('}').unwrap_or(OPENAPI);
        let url = serde_json::to_string(p).unwrap_or_else(|_| format!("\"{p}\""));
        format!(r#"{body},"servers":[{{"url":{url}}}]}}"#)
    })
}

fn prefixed(page: &'static str, cell: &'static OnceLock<String>) -> &'static str {
    cell.get_or_init(|| {
        let p = prefix();
        page.replace("'/openapi.json'", &format!("'{p}/openapi.json'"))
            .replace("\"/openapi.json\"", &format!("\"{p}/openapi.json\""))
            .replace(
                "'/docs/oauth2-redirect'",
                &format!("'{p}/docs/oauth2-redirect'"),
            )
    })
}

/// `GET /openapi.json`.
pub(crate) async fn openapi_json(headers: HeaderMap) -> Response {
    raw_payload(
        schema().to_owned(),
        "application/json",
        &[],
        &headers,
        1024,
        Instant::now(),
    )
}

/// `GET /docs` (Swagger UI).
pub(crate) async fn docs(headers: HeaderMap) -> Response {
    static PAGE: OnceLock<String> = OnceLock::new();
    raw_payload(
        prefixed(DOCS, &PAGE).to_owned(),
        HTML,
        &[],
        &headers,
        1024,
        Instant::now(),
    )
}

/// `GET /redoc`.
pub(crate) async fn redoc(headers: HeaderMap) -> Response {
    static PAGE: OnceLock<String> = OnceLock::new();
    raw_payload(
        prefixed(REDOC, &PAGE).to_owned(),
        HTML,
        &[],
        &headers,
        1024,
        Instant::now(),
    )
}

/// `GET /docs/oauth2-redirect`.
pub(crate) async fn oauth2_redirect(headers: HeaderMap) -> Response {
    raw_payload(
        OAUTH2_REDIRECT.to_owned(),
        HTML,
        &[],
        &headers,
        1024,
        Instant::now(),
    )
}

#[cfg(test)]
mod tests {
    #[test]
    fn schema_is_json() {
        let v: serde_json::Value = serde_json::from_str(super::OPENAPI).expect("schema parses");
        assert_eq!(v["info"]["title"], "Surya Panchanga API");
    }
}
