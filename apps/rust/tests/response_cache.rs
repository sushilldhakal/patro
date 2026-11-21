//! The shared response cache end to end, on an in-memory store.

use std::sync::Arc;

use api::{AppState, middleware::response_cache};
use axum::{body::Body, http::Request};
use common::AppConfig;
use tower::ServiceExt;

fn app() -> axum::Router {
    api::router(AppState::new(AppConfig {
        host: "127.0.0.1".into(),
        port: 0,
        data_dir: concat!(env!("CARGO_MANIFEST_DIR"), "/../api/data").into(),
        request_timeout_secs: 120,
        log_filter: "warn".into(),
    }))
}

/// `Accept-Encoding` sent with a request.
const GZIP: &str = "gzip";
const IDENTITY: &str = "identity";

async fn get(path: &str, encoding: &str) -> (u16, axum::http::HeaderMap, Vec<u8>) {
    let req = Request::get(path).header("accept-encoding", encoding);
    let res = app()
        .oneshot(req.body(Body::empty()).expect("request"))
        .await
        .expect("router");
    let status = res.status().as_u16();
    let headers = res.headers().clone();
    let body = axum::body::to_bytes(res.into_body(), 1 << 26)
        .await
        .expect("body")
        .to_vec();
    (status, headers, body)
}

#[tokio::test]
async fn miss_then_hit_serves_the_same_bytes() {
    response_cache::install_store(Arc::new(response_cache::MemoryStore::default()));
    let path = "/v1/convert/ad-to-bs/2026-03-12";
    let (s1, h1, b1) = get(path, IDENTITY).await;
    assert_eq!(s1, 200);
    assert_eq!(
        h1.get("x-cache").and_then(|v| v.to_str().ok()),
        Some("MISS")
    );
    let (s2, h2, b2) = get(path, IDENTITY).await;
    assert_eq!(s2, 200);
    assert_eq!(h2.get("x-cache").and_then(|v| v.to_str().ok()), Some("HIT"));
    assert_eq!(b1, b2, "a hit replays the computed body");

    // A gzip client gets the stored compressed bytes back as they were stored.
    let month = "/v1/panchanga/2083/7?city_id=1283240";
    let (_, m1, plain) = get(month, IDENTITY).await;
    assert_eq!(
        m1.get("x-cache").and_then(|v| v.to_str().ok()),
        Some("MISS")
    );
    let (_, m2, gz) = get(month, GZIP).await;
    assert_eq!(m2.get("x-cache").and_then(|v| v.to_str().ok()), Some("HIT"));
    assert_eq!(
        m2.get("content-encoding").and_then(|v| v.to_str().ok()),
        Some("gzip")
    );
    let mut unzipped = String::new();
    std::io::Read::read_to_string(&mut flate2::read::GzDecoder::new(&gz[..]), &mut unzipped)
        .expect("gzip");
    assert_eq!(unzipped.as_bytes(), &plain[..]);

    // Never cached: documents (Cloudflare only) and non-200 answers.
    let (_, d, _) = get("/v1/documents", IDENTITY).await;
    assert!(d.get("x-cache").is_none());
    let (s, bad, _) = get("/v1/panchanga/2083/13?city_id=1283240", IDENTITY).await;
    assert_eq!(s, 400);
    assert_eq!(
        bad.get("x-cache").and_then(|v| v.to_str().ok()),
        Some("BYPASS")
    );
}
