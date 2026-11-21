//! `_guard_private_cache`: any path containing `/auth` or `/profiles` is forced
//! `private, no-store` (and the CDN directive too), so tokens and per-user data
//! never sit in a shared cache, whatever the route or status.

use axum::{
    extract::Request,
    http::{HeaderValue, header},
    middleware::Next,
    response::Response,
};

const MARKERS: [&str; 2] = ["/auth", "/profiles"];

/// Sets the private directives on matching paths.
pub(crate) async fn private_cache(request: Request, next: Next) -> Response {
    let private = MARKERS.iter().any(|m| request.uri().path().contains(m));
    let mut response = next.run(request).await;
    if private {
        let h = response.headers_mut();
        h.insert(
            header::CACHE_CONTROL,
            HeaderValue::from_static("private, no-store"),
        );
        h.insert(
            "cdn-cache-control",
            HeaderValue::from_static("private, no-store"),
        );
    }
    response
}
