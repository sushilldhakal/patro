//! Golden checks for `/v1/nepal/sait/*` routes against `FastAPI` snapshots.

use std::io::Read as _;

use api::AppState;
use axum::{body::Body, http::Request};
use common::AppConfig;
use flate2::read::GzDecoder;
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

fn maybe_stale_if_error(name: &str, value: &str) -> String {
    if (name == "cache-control" || name == "cdn-cache-control")
        && value.starts_with("public")
        && !value.contains("stale-if-error")
    {
        format!("{value}, stale-if-error=86400")
    } else {
        value.to_owned()
    }
}

#[tokio::test]
async fn sait_responses_match_fastapi() {
    let golden: Value = serde_json::from_str(include_str!("fixtures/http_golden_sait.json"))
        .expect("sait golden JSON");

    let keep = [
        "cache-control",
        "cdn-cache-control",
        "vary",
        "content-type",
        "x-siddhanta",
        "x-ayanamsha",
    ];

    for case in golden.as_array().expect("list") {
        let path = case["path"].as_str().expect("path");
        let req = Request::get(path)
            .header("accept-encoding", "gzip")
            .body(Body::empty())
            .expect("request");
        let res = app().oneshot(req).await.expect("router");
        let status = res.status().as_u16();
        let headers = res.headers().clone();
        let bytes = axum::body::to_bytes(res.into_body(), 1 << 26)
            .await
            .expect("body");

        let body = if headers.get("content-encoding").is_some_and(|v| v == "gzip") {
            let mut text = String::new();
            GzDecoder::new(&bytes[..])
                .read_to_string(&mut text)
                .expect("gzip");
            text
        } else {
            String::from_utf8(bytes.to_vec()).expect("utf8")
        };

        assert_eq!(
            status,
            case["status"]
                .as_u64()
                .and_then(|s| u16::try_from(s).ok())
                .expect("status"),
            "{path}: body={body}"
        );

        let want_body = case["body"].as_str().expect("body");
        if body != want_body {
            let at = body
                .chars()
                .zip(want_body.chars())
                .position(|(a, b)| a != b)
                .unwrap_or(body.chars().count().min(want_body.chars().count()));
            let lo = at.saturating_sub(80);
            let rust_snip: String = body.chars().skip(lo).take(160).collect();
            let py_snip: String = want_body.chars().skip(lo).take(160).collect();
            panic!(
                "{path}: body differs at char {at} (rust len {}, py len {})\n rust:   …{rust_snip}…\n python: …{py_snip}…",
                body.len(),
                want_body.len()
            );
        }

        for name in keep {
            let expected = case["headers"]
                .as_object()
                .and_then(|h| h.get(name))
                .and_then(Value::as_str)
                .map(|v| maybe_stale_if_error(name, v));
            assert_eq!(
                headers.get(name).and_then(|h| h.to_str().ok()),
                expected.as_deref(),
                "{path}: header {name}"
            );
        }
    }
}
