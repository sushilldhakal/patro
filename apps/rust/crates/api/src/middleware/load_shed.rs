//! Bounded computing work: a fast 503 instead of a long queue
//! (`app/load_shed_middleware.py`).
//!
//! Two lanes cap the requests that compute at once: `personal` (answers unique to
//! one person: kundali, personal rashifal, sait personalize, vastu sketch) and
//! `shared` (every other public data route), so a rush of first-time kundali opens
//! never starves the calendar. A request waits up to `LOAD_SHED_QUEUE_S` seconds
//! for a slot, then gets 503 with `Retry-After`. The phone falls back to its
//! offline copy and retries. Health is never shed.
//!
//! Python's limits are per worker process; the Rust server is one process, so set
//! `LOAD_SHED_MAX_SHARED` / `LOAD_SHED_MAX_PERSONAL` to the whole server's budget.

use std::{sync::OnceLock, time::Duration};

use axum::{
    body::Body,
    extract::Request,
    http::{HeaderValue, StatusCode, header},
    middleware::Next,
    response::{IntoResponse, Response},
};
use tokio::sync::Semaphore;

/// `PERSONAL_MARKERS`.
const PERSONAL_MARKERS: [&str; 10] = [
    "/kundali/detail",
    "/kundali/report",
    "/kundali/vimshottari",
    "/kundali/dasha/expand",
    "/kundali/milan",
    "/shadbala",
    "/panchanga/rashifal/personal",
    "/panchanga/rashifal/janma",
    "/nepal/sait/",
    "/vastu/sketch",
];

/// `_NEVER_SHED`.
const NEVER_SHED: [&str; 7] = [
    "/health",
    "/analytics/",
    "/admin/",
    "/auth",
    "/profiles",
    "/events",
    "/devices",
];

/// A load-shedding lane.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum Lane {
    Shared,
    Personal,
}

impl Lane {
    const fn name(self) -> &'static str {
        match self {
            Self::Shared => "shared",
            Self::Personal => "personal",
        }
    }
}

/// `lane_for`: the lane a path computes in, or `None` when it is never shed.
pub(crate) fn lane_for(path: &str) -> Option<Lane> {
    if NEVER_SHED.iter().any(|m| path.contains(m)) {
        return None;
    }
    if !path.contains("/v1/") && !path.ends_with("/og-image") {
        return None;
    }
    for marker in PERSONAL_MARKERS {
        if path.contains(marker) {
            if marker == "/nepal/sait/" && !path.ends_with("/personalize") {
                break;
            }
            return Some(Lane::Personal);
        }
    }
    Some(Lane::Shared)
}

fn env_or<T: std::str::FromStr>(name: &str, default: T) -> T {
    std::env::var(name)
        .ok()
        .and_then(|v| v.trim().parse().ok())
        .unwrap_or(default)
}

struct Limits {
    enabled: bool,
    queue: Duration,
    shared: Semaphore,
    personal: Semaphore,
}

fn limits() -> &'static Limits {
    static LIMITS: OnceLock<Limits> = OnceLock::new();
    LIMITS.get_or_init(|| Limits {
        enabled: std::env::var("LOAD_SHED").map_or(true, |v| v.trim() != "0"),
        queue: Duration::from_secs_f64(env_or("LOAD_SHED_QUEUE_S", 4.0_f64).max(0.0)),
        shared: Semaphore::new(env_or("LOAD_SHED_MAX_SHARED", 24_usize).max(1)),
        personal: Semaphore::new(env_or("LOAD_SHED_MAX_PERSONAL", 6_usize).max(1)),
    })
}

/// `_busy`: Python's `json.dumps` body and headers.
fn busy(lane: Lane) -> Response {
    let body = format!(
        r#"{{"detail": "Server busy, please retry shortly.", "lane": "{}"}}"#,
        lane.name()
    );
    let mut response = (StatusCode::SERVICE_UNAVAILABLE, Body::from(body)).into_response();
    let headers = response.headers_mut();
    headers.insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("application/json"),
    );
    headers.insert(header::RETRY_AFTER, HeaderValue::from_static("2"));
    headers.insert(header::CACHE_CONTROL, HeaderValue::from_static("no-store"));
    headers.insert("cdn-cache-control", HeaderValue::from_static("no-store"));
    response
}

/// The load-shedding layer.
pub(crate) async fn load_shed(request: Request, next: Next) -> Response {
    let limits = limits();
    let lane = if limits.enabled {
        lane_for(request.uri().path())
    } else {
        None
    };
    let Some(lane) = lane else {
        return next.run(request).await;
    };
    let semaphore = match lane {
        Lane::Shared => &limits.shared,
        Lane::Personal => &limits.personal,
    };
    let Ok(Ok(_permit)) = tokio::time::timeout(limits.queue, semaphore.acquire()).await else {
        tracing::warn!(
            lane = lane.name(),
            path = request.uri().path(),
            "load shed: lane full, 503"
        );
        return busy(lane);
    };
    next.run(request).await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn lanes_follow_python() {
        assert_eq!(lane_for("/health"), None);
        assert_eq!(lane_for("/v1/panchanga/2083/7"), Some(Lane::Shared));
        assert_eq!(lane_for("/v1/kundali/detail"), Some(Lane::Personal));
        assert_eq!(lane_for("/v1/nepal/sait/2083/vivah"), Some(Lane::Shared));
        assert_eq!(
            lane_for("/v1/nepal/sait/2083/vivah/personalize"),
            Some(Lane::Personal)
        );
        assert_eq!(lane_for("/share/og-image"), Some(Lane::Shared));
        assert_eq!(lane_for("/share/panchanga"), None);
    }
}
