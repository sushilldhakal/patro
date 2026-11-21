//! `/health` through the full router, as a client sees it.

use api::AppState;
use axum::{body::Body, http::Request};
use common::AppConfig;
use tower::ServiceExt;

fn test_config(data_dir: &str) -> AppConfig {
    AppConfig {
        host: "127.0.0.1".into(),
        port: 0,
        data_dir: data_dir.into(),
        request_timeout_secs: 5,
        log_filter: "warn".into(),
    }
}

async fn get_health(data_dir: &str) -> (u16, serde_json::Value) {
    let app = api::router(AppState::new(test_config(data_dir)));
    let res = app
        .oneshot(Request::get("/health").body(Body::empty()).unwrap())
        .await
        .unwrap();
    let status = res.status().as_u16();
    let bytes = axum::body::to_bytes(res.into_body(), 1 << 16)
        .await
        .unwrap();
    (
        status,
        serde_json::from_slice(&bytes).expect("health answers JSON"),
    )
}

#[tokio::test]
async fn health_reports_ok_and_cities_db() {
    let (status, body) = get_health("../api/data").await;
    assert_eq!(status, 200);
    assert_eq!(body["status"], "ok");
    assert!(body["cities_db"].is_boolean());
}

#[tokio::test]
async fn health_says_false_when_cities_db_is_missing() {
    let (_, body) = get_health("/nonexistent").await;
    assert_eq!(body["cities_db"], false);
}

#[tokio::test]
async fn unknown_path_is_404() {
    let app = api::router(AppState::new(test_config("/nonexistent")));
    let res = app
        .oneshot(Request::get("/v1/nope").body(Body::empty()).unwrap())
        .await
        .unwrap();
    assert_eq!(res.status().as_u16(), 404);
}
