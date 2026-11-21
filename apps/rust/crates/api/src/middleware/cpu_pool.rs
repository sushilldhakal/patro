//! Computing requests run on the blocking pool, not on the async workers.
//!
//! The panchanga, gochar and kundali builders are CPU-bound for milliseconds to
//! seconds. Run on a Tokio worker they would stall every other request on that
//! worker (health checks, cache hits, slow clients). A request admitted by load
//! shedding (so at most `LOAD_SHED_MAX_SHARED + LOAD_SHED_MAX_PERSONAL` at once)
//! is driven to completion on a blocking thread instead; the pool's size is set in
//! `main.rs` (`PATRO_RS_BLOCKING_THREADS`) with room for a nested blocking task per
//! request.

use axum::{
    extract::Request,
    http::StatusCode,
    middleware::Next,
    response::{IntoResponse, Response},
};

use super::load_shed::lane_for;

/// The CPU-pool layer.
pub(crate) async fn cpu_pool(request: Request, next: Next) -> Response {
    if lane_for(request.uri().path()).is_none() {
        return next.run(request).await;
    }
    let handle = tokio::runtime::Handle::current();
    match tokio::task::spawn_blocking(move || handle.block_on(next.run(request))).await {
        Ok(response) => response,
        Err(error) => {
            tracing::error!(%error, "request task failed");
            (StatusCode::INTERNAL_SERVER_ERROR, "internal error").into_response()
        }
    }
}
