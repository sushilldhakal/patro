//! Cross-cutting layers. Outside in, as the Python stack: request tracing, CORS,
//! the shared response cache (`PATRO_RS_REDIS_URL`), load shedding, the blocking
//! pool for computing requests, a request timeout, then the versioned edge lifetime (`?cv=`) on
//! fixed-day responses.

use std::time::Duration;

use axum::{Router, http::StatusCode};

mod cors;
mod cpu_pool;
mod identity_vary;
mod load_shed;
mod private_cache;
pub mod response_cache;
mod siddhanta_headers;
mod versioned;
use tower_http::{timeout::TimeoutLayer, trace::TraceLayer};

/// Wraps the routes in the shared layers.
pub fn apply(router: Router, timeout: Duration) -> Router {
    router
        .layer(axum::middleware::from_fn(private_cache::private_cache))
        .layer(axum::middleware::from_fn(
            versioned::versioned_edge_lifetime,
        ))
        .layer(axum::middleware::from_fn(identity_vary::identity_vary))
        // 504 like nginx gives the Python server when it runs past proxy_read_timeout.
        .layer(TimeoutLayer::with_status_code(
            StatusCode::GATEWAY_TIMEOUT,
            timeout,
        ))
        .layer(axum::middleware::from_fn(cpu_pool::cpu_pool))
        .layer(axum::middleware::from_fn(load_shed::load_shed))
        .layer(axum::middleware::from_fn(
            siddhanta_headers::siddhanta_headers,
        ))
        .layer(axum::middleware::from_fn(response_cache::response_cache))
        .layer(axum::middleware::from_fn(cors::cors))
        .layer(TraceLayer::new_for_http())
}
