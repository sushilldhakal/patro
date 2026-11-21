//! Starlette's `GZipMiddleware` identity path: a response it does not compress
//! (the client did not accept gzip) still gets `Accept-Encoding` appended to `Vary`
//! when the body is at least `minimum_size` (1024) bytes. The handlers already
//! answer the gzip path the way `GZipResponder` does.

use axum::{
    body::HttpBody,
    extract::Request,
    http::{HeaderValue, header},
    middleware::Next,
    response::Response,
};

const MINIMUM_SIZE: u64 = 1024;

/// The identity-path `Vary` layer.
pub(crate) async fn identity_vary(request: Request, next: Next) -> Response {
    let accepts_gzip = request
        .headers()
        .get(header::ACCEPT_ENCODING)
        .and_then(|v| v.to_str().ok())
        .is_some_and(|v| v.contains("gzip"));
    let mut response = next.run(request).await;
    if accepts_gzip || response.headers().contains_key(header::CONTENT_ENCODING) {
        return response;
    }
    // The size GZip judged: before the era layer re-rendered the body, when a
    // handler says so; the body itself otherwise (unknown length: a stream).
    let size = response
        .extensions()
        .get::<crate::respond::PreEraLen>()
        .map(|p| p.0 as u64)
        .or_else(|| response.body().size_hint().exact());
    let big = size.is_none_or(|n| n >= MINIMUM_SIZE);
    if big {
        let headers = response.headers_mut();
        let value = match headers.get(header::VARY).and_then(|v| v.to_str().ok()) {
            Some(existing) => format!("{existing}, Accept-Encoding"),
            None => "Accept-Encoding".to_owned(),
        };
        if let Ok(v) = HeaderValue::from_str(&value) {
            headers.insert(header::VARY, v);
        }
    }
    response
}
