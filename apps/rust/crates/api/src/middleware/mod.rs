//! Cross-cutting layers. Outside in: request tracing, a request timeout, then the
//! versioned edge lifetime (`?cv=`) on fixed-day responses.

use std::time::Duration;

use axum::{Router, http::StatusCode};

mod versioned;
use tower_http::{timeout::TimeoutLayer, trace::TraceLayer};

/// Wraps the routes in the shared layers.
pub fn apply(router: Router, timeout: Duration) -> Router {
    router
        .layer(axum::middleware::from_fn(
            versioned::versioned_edge_lifetime,
        ))
        // 504 like nginx gives the Python server when it runs past proxy_read_timeout.
        .layer(TimeoutLayer::with_status_code(
            StatusCode::GATEWAY_TIMEOUT,
            timeout,
        ))
        .layer(TraceLayer::new_for_http())
}
