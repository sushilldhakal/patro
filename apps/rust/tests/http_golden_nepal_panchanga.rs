//! Nepal patro HTTP parity against real `FastAPI` responses (`gen_http_golden_nepal_patro.py`).

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

#[tokio::test]
async fn nepal_panchanga_responses_match_fastapi() {
    let mut failures: Vec<String> = Vec::new();
    let golden: Value =
        serde_json::from_str(include_str!("fixtures/http_golden_nepal_panchanga.json"))
            .expect("nepal patro golden JSON");
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
        if let Some(why) = support::parity::difference(&body, want) {
            let at = body
                .bytes()
                .zip(want.bytes())
                .position(|(a, b)| a != b)
                .unwrap_or(body.len().min(want.len()));
            let lo = at.saturating_sub(120);
            failures.push(format!(
                "{path}: body differs [{why}] at byte {at}\n rust:   …{}…\n python: …{}…",
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
            if (k == "cache-control" || k == "cdn-cache-control")
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
