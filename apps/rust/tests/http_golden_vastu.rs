//! `/v1/vastu/*` parity against real `FastAPI` responses (`gen_http_golden_vastu.py`):
//! the four GET routes and the analyze / sketch / house-plan POST bodies.

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

/// The first JSON path where two documents differ.
fn first_diff(path: &str, a: &Value, b: &Value) -> Option<String> {
    match (a, b) {
        (Value::Object(x), Value::Object(y)) => {
            let kx: Vec<&String> = x.keys().collect();
            let ky: Vec<&String> = y.keys().collect();
            if kx != ky {
                return Some(format!("{path}: keys {kx:?} vs {ky:?}"));
            }
            x.iter()
                .find_map(|(k, v)| first_diff(&format!("{path}.{k}"), v, &y[k]))
        }
        (Value::Array(x), Value::Array(y)) => {
            if x.len() != y.len() {
                return Some(format!("{path}: len {} vs {}", x.len(), y.len()));
            }
            x.iter()
                .zip(y)
                .enumerate()
                .find_map(|(i, (v, w))| first_diff(&format!("{path}[{i}]"), v, w))
        }
        _ if a == b => None,
        _ => Some(format!("{path}: {a} vs {b}")),
    }
}

async fn check(golden: &str) {
    let mut failures: Vec<String> = Vec::new();
    let golden: Value = serde_json::from_str(golden).expect("vastu golden JSON");
    for case in golden.as_array().expect("list") {
        let path = case["path"].as_str().expect("path");
        let post = case["method"] == "POST";
        let mut builder = Request::builder()
            .method(if post { "POST" } else { "GET" })
            .uri(path)
            .header("accept-encoding", "gzip");
        let sent = case["request_body"].as_str().map(str::to_owned);
        if sent.is_some() {
            builder = builder.header("content-type", "application/json");
        }
        let req = builder
            .body(sent.clone().map_or_else(Body::empty, Body::from))
            .expect("request");
        let path = format!("{path} {}", sent.as_deref().unwrap_or(""));
        let path = path.as_str();
        let res = app().oneshot(req).await.expect("router");
        let status = res.status().as_u16();
        let headers = res.headers().clone();
        let bytes = axum::body::to_bytes(res.into_body(), 1 << 26)
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
        let want_status = case["status"].as_u64().and_then(|s| u16::try_from(s).ok());
        if Some(status) != want_status {
            failures.push(format!("{path}: status {status} vs python {want_status:?}"));
            continue;
        }
        let want = case["body"].as_str().expect("body");
        if body != want {
            let at = body
                .bytes()
                .zip(want.bytes())
                .position(|(a, b)| a != b)
                .unwrap_or(body.len().min(want.len()));
            let lo = at.saturating_sub(120);
            let structural = match (
                serde_json::from_str::<Value>(&body),
                serde_json::from_str::<Value>(want),
            ) {
                (Ok(a), Ok(b)) => {
                    first_diff("$", &a, &b).unwrap_or_else(|| "same JSON, different bytes".into())
                }
                _ => "unparsable".into(),
            };
            failures.push(format!(
                "{path}: body differs at byte {at} ({structural})\n rust:   …{}…\n python: …{}…",
                body.get(lo..(at + 120).min(body.len())).unwrap_or(""),
                want.get(lo..(at + 120).min(want.len())).unwrap_or("")
            ));
            continue;
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
            if !post
                && (k == "cache-control" || k == "cdn-cache-control")
                && want.starts_with("public")
                && !want.contains("stale-if-error")
            {
                want.push_str(", stale-if-error=86400");
            }
            let got = headers.get(k).and_then(|h| h.to_str().ok());
            if got != Some(want.as_str()) {
                failures.push(format!("{path}: header {k} {got:?} vs python {want:?}"));
            }
        }
    }
    assert!(
        failures.is_empty(),
        "{} mismatches:\n{}",
        failures.len(),
        failures.join("\n")
    );
}

#[tokio::test]
async fn vastu_responses_match_fastapi() {
    check(include_str!("fixtures/http_golden_vastu.json")).await;
}
