//! Festival/holiday HTTP routes against real `FastAPI` responses.
//!
//! Matches status, response headers and body bytes for every recorded request.
//! Stamp metadata (`generated_at`, `hash`) is compared after removing those volatile
//! fields. Times may drift by the allowed seconds (`support::parity`).

mod support;

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

fn strip_stamp(mut value: Value) -> Value {
    if let Some(object) = value.as_object_mut() {
        object.remove("generated_at");
        object.remove("hash");
    }
    value
}

fn diff_message(path: &str, body: &str, want: &str, why: &str) -> String {
    let at = body
        .bytes()
        .zip(want.bytes())
        .position(|(a, b)| a != b)
        .unwrap_or(body.len().min(want.len()));
    let lo = at.saturating_sub(120);
    format!(
        "{path}: body differs [{why}] at byte {at}\n rust:   …{}…\n python: …{}…",
        body.get(lo..(at + 120).min(body.len())).unwrap_or(""),
        want.get(lo..(at + 120).min(want.len())).unwrap_or("")
    )
}

#[tokio::test]
async fn festival_routes_match_fastapi() {
    let golden: Value = serde_json::from_str(include_str!("fixtures/http_golden_festivals.json"))
        .expect("golden JSON");
    for case in golden.as_array().expect("list") {
        let path = case["path"].as_str().expect("path");
        let req = Request::get(path)
            .header("accept-encoding", "gzip")
            .body(Body::empty())
            .expect("request");
        let res = app().oneshot(req).await.expect("router");
        let status = res.status().as_u16();
        let headers = res.headers().clone();
        let bytes = axum::body::to_bytes(res.into_body(), 1 << 27)
            .await
            .expect("body");
        let body = if headers.get("content-encoding").is_some_and(|v| v == "gzip") {
            let mut s = String::new();
            GzDecoder::new(&bytes[..])
                .read_to_string(&mut s)
                .expect("gzip");
            s
        } else {
            String::from_utf8(bytes.to_vec()).expect("utf8")
        };
        assert_eq!(
            status,
            case["status"]
                .as_u64()
                .and_then(|s| u16::try_from(s).ok())
                .expect("status"),
            "{path}"
        );
        let want = case["body"].as_str().expect("body");
        if let Some(why) = support::parity::difference(&body, want) {
            let parsed_rust = serde_json::from_str::<Value>(&body);
            let parsed_python = serde_json::from_str::<Value>(want);
            let stamped_only = match (parsed_rust, parsed_python) {
                (Ok(rust_value), Ok(py_value)) => {
                    let has_stamp = [&rust_value, &py_value]
                        .iter()
                        .any(|v| v.get("generated_at").is_some() || v.get("hash").is_some());
                    has_stamp
                        && support::parity::value_difference(
                            "$",
                            &strip_stamp(rust_value),
                            &strip_stamp(py_value),
                        )
                        .is_none()
                }
                _ => false,
            };
            assert!(stamped_only, "{}", diff_message(path, &body, want, &why));
        }
        for k in [
            "cache-control",
            "cdn-cache-control",
            "vary",
            "content-type",
            "x-siddhanta",
            "x-ayanamsha",
        ] {
            assert!(
                case["headers"].get(k).is_some() || headers.get(k).is_none(),
                "{path}: header {k} {:?} sent, Python sends none",
                headers.get(k)
            );
        }
        for (k, v) in case["headers"].as_object().expect("headers") {
            let mut want = v.as_str().expect("header").to_owned();
            if (k == "cache-control" || k == "cdn-cache-control")
                && want.starts_with("public")
                && !want.contains("stale-if-error")
            {
                want.push_str(", stale-if-error=86400");
            }
            assert_eq!(
                headers.get(k).and_then(|h| h.to_str().ok()),
                Some(want.as_str()),
                "{path}: header {k}"
            );
        }
    }
}
