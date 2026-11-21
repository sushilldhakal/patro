//! CORS answers against Starlette's `CORSMiddleware` (`gen_http_golden_cors.py`).

use api::AppState;
use axum::{
    body::Body,
    http::{Method, Request},
};
use common::AppConfig;
use serde_json::Value;
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

#[tokio::test]
async fn cors_matches_starlette() {
    let golden: Value = serde_json::from_str(include_str!("fixtures/http_golden_cors.json"))
        .expect("cors golden JSON");
    for case in golden.as_array().expect("list") {
        let method = Method::from_bytes(case["method"].as_str().expect("method").as_bytes())
            .expect("method");
        let path = case["path"].as_str().expect("path");
        let mut req = Request::builder().method(method.clone()).uri(path);
        for (k, v) in case["request_headers"].as_object().expect("headers") {
            req = req.header(k.as_str(), v.as_str().expect("value"));
        }
        let res = app()
            .oneshot(req.body(Body::empty()).expect("request"))
            .await
            .expect("router");
        let label = format!("{method} {path} {}", case["request_headers"]);
        assert_eq!(u64::from(res.status().as_u16()), case["status"], "{label}");
        let headers = res.headers().clone();
        for k in [
            "access-control-allow-origin",
            "access-control-allow-methods",
            "access-control-allow-headers",
            "access-control-max-age",
            "access-control-allow-credentials",
            "vary",
        ] {
            assert_eq!(
                headers.get(k).and_then(|h| h.to_str().ok()),
                case["headers"].get(k).and_then(Value::as_str),
                "{label}: header {k}"
            );
        }
        if method == Method::OPTIONS {
            assert_eq!(
                headers.get("content-type").and_then(|h| h.to_str().ok()),
                case["headers"]["content-type"].as_str(),
                "{label}: content-type"
            );
            let body = axum::body::to_bytes(res.into_body(), 1 << 20)
                .await
                .expect("body");
            assert_eq!(
                std::str::from_utf8(&body).expect("utf8"),
                case["body"].as_str().expect("body"),
                "{label}: body"
            );
        }
    }
}
