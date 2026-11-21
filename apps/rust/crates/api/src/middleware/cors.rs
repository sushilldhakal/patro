//! CORS, as Starlette's `CORSMiddleware` answers it for the Python server
//! (`allow_origins` = the defaults + `CORS_ALLOW_ORIGINS`, every listed method,
//! `allow_headers=["*"]`, no credentials). Outermost but for timing, so even early
//! 400s (bad era dates) reach the browser readable.

use std::sync::OnceLock;

use axum::{
    body::Body,
    extract::Request,
    http::{HeaderMap, HeaderValue, Method, StatusCode, header},
    middleware::Next,
    response::{IntoResponse, Response},
};

/// `DEFAULT_CORS_ORIGINS` in `app/main.py`.
const DEFAULT_ORIGINS: [&str; 7] = [
    "https://vedicpatro.com",
    "https://www.vedicpatro.com",
    "https://sushilldhakal.github.io",
    "http://localhost:5173",
    "http://localhost:5175",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5175",
];

const METHODS: [&str; 6] = ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"];

/// The defaults, then `CORS_ALLOW_ORIGINS` (comma separated), without repeats.
fn origins() -> &'static [String] {
    static ORIGINS: OnceLock<Vec<String>> = OnceLock::new();
    ORIGINS.get_or_init(|| {
        let configured = std::env::var("CORS_ALLOW_ORIGINS").unwrap_or_default();
        let mut out: Vec<String> = Vec::new();
        for origin in DEFAULT_ORIGINS
            .iter()
            .map(|s| (*s).to_owned())
            .chain(configured.split(',').map(|s| s.trim().to_owned()))
            .filter(|s| !s.is_empty())
        {
            if !out.contains(&origin) {
                out.push(origin);
            }
        }
        out
    })
}

fn allowed(origin: &str) -> bool {
    origins().iter().any(|o| o == "*" || o == origin)
}

/// `MutableHeaders.add_vary_header("Origin")`.
fn add_vary_origin(headers: &mut HeaderMap) {
    let value = match headers.get(header::VARY).and_then(|v| v.to_str().ok()) {
        Some(existing) => format!("{existing}, Origin"),
        None => "Origin".to_owned(),
    };
    if let Ok(v) = HeaderValue::from_str(&value) {
        headers.insert(header::VARY, v);
    }
}

fn preflight(origin: &str, request: &HeaderMap) -> Response {
    let method = request
        .get(header::ACCESS_CONTROL_REQUEST_METHOD)
        .and_then(|v| v.to_str().ok())
        .unwrap_or_default();
    let mut failures = Vec::new();
    if !allowed(origin) {
        failures.push("origin");
    }
    if !METHODS.contains(&method) {
        failures.push("method");
    }
    let mut headers = HeaderMap::new();
    headers.insert(
        header::ACCESS_CONTROL_ALLOW_METHODS,
        HeaderValue::from_static("GET, POST, PATCH, PUT, DELETE, OPTIONS"),
    );
    headers.insert(
        header::ACCESS_CONTROL_MAX_AGE,
        HeaderValue::from_static("600"),
    );
    if let Ok(v) = HeaderValue::from_str(origin)
        && allowed(origin)
    {
        headers.insert(header::ACCESS_CONTROL_ALLOW_ORIGIN, v);
    }
    headers.insert(header::VARY, HeaderValue::from_static("Origin"));
    // `allow_headers=["*"]`: whatever the browser asks for.
    if let Some(requested) = request.get(header::ACCESS_CONTROL_REQUEST_HEADERS) {
        headers.insert(header::ACCESS_CONTROL_ALLOW_HEADERS, requested.clone());
    }
    let (status, body) = if failures.is_empty() {
        (StatusCode::OK, "OK".to_owned())
    } else {
        (
            StatusCode::BAD_REQUEST,
            format!("Disallowed CORS {}", failures.join(", ")),
        )
    };
    headers.insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("text/plain; charset=utf-8"),
    );
    (status, headers, Body::from(body)).into_response()
}

/// The CORS layer.
pub(crate) async fn cors(request: Request, next: Next) -> Response {
    let Some(origin) = request
        .headers()
        .get(header::ORIGIN)
        .and_then(|v| v.to_str().ok())
        .map(str::to_owned)
    else {
        return next.run(request).await;
    };
    if request.method() == Method::OPTIONS
        && request
            .headers()
            .contains_key(header::ACCESS_CONTROL_REQUEST_METHOD)
    {
        return preflight(&origin, request.headers());
    }
    let mut response = next.run(request).await;
    if allowed(&origin)
        && let Ok(v) = HeaderValue::from_str(&origin)
    {
        let headers = response.headers_mut();
        headers.insert(header::ACCESS_CONTROL_ALLOW_ORIGIN, v);
        add_vary_origin(headers);
    }
    response
}
