//! `siddhanta=drik` over HTTP: the same shape as the Surya Siddhanta answer (keys, their
//! order, types, list lengths), drik's own values, the headers, the errors outside the
//! kernel, and `/meta/provenance`.
//!
//! Needs the pilot files: set `PATRO_RS_EPHDATA` to a folder holding `kernel.veph`.
//! Skipped without it.

use api::AppState;
use axum::{body::Body, http::Request};
use common::AppConfig;
use serde_json::Value;
use tower::ServiceExt;

fn app() -> Option<axum::Router> {
    std::env::var_os("PATRO_RS_EPHDATA")?;
    Some(api::router(AppState::new(AppConfig {
        host: "127.0.0.1".into(),
        port: 0,
        data_dir: concat!(env!("CARGO_MANIFEST_DIR"), "/../api/data").into(),
        request_timeout_secs: 120,
        log_filter: "warn".into(),
    })))
}

async fn get(app: &axum::Router, path: &str) -> (u16, axum::http::HeaderMap, Value) {
    let res = app
        .clone()
        .oneshot(Request::get(path).body(Body::empty()).expect("request"))
        .await
        .expect("router");
    let status = res.status().as_u16();
    let headers = res.headers().clone();
    let bytes = axum::body::to_bytes(res.into_body(), 1 << 27)
        .await
        .expect("body");
    let body = serde_json::from_slice(&bytes).unwrap_or(Value::Null);
    (status, headers, body)
}

/// The first place two JSON trees differ in shape: key order, type, list length.
fn shape_diff(a: &Value, b: &Value, at: &str) -> Option<String> {
    match (a, b) {
        (Value::Object(x), Value::Object(y)) => {
            // A span that ends before the next sunrise carries `end_*` fields, one that
            // runs on carries `until_full_night`: a variant of the data, not of the system.
            let optional = |k: &&String| k.starts_with("end_") || k.as_str() == "until_full_night";
            let (kx, ky): (Vec<_>, Vec<_>) = (
                x.keys().filter(|k| !optional(k)).collect(),
                y.keys().filter(|k| !optional(k)).collect(),
            );
            if kx != ky {
                return Some(format!("{at}: keys {kx:?} vs {ky:?}"));
            }
            x.iter()
                .filter(|(k, _)| y.contains_key(*k))
                .find_map(|(k, vx)| shape_diff(vx, &y[k], &format!("{at}.{k}")))
        }
        (Value::Array(x), Value::Array(y)) => {
            // Day counts and event counts differ between systems; compare the first row's shape.
            match (x.first(), y.first()) {
                (Some(fx), Some(fy)) => shape_diff(fx, fy, &format!("{at}[0]")),
                (None, None) => None,
                _ => Some(format!(
                    "{at}: one list is empty ({} vs {})",
                    x.len(),
                    y.len()
                )),
            }
        }
        (Value::Number(x), Value::Number(y)) if x.is_i64() == y.is_i64() => None,
        (Value::Null, Value::Null)
        | (Value::Bool(_), Value::Bool(_))
        | (Value::String(_), Value::String(_)) => None,
        _ => Some(format!("{at}: {a} vs {b}").chars().take(160).collect()),
    }
}

async fn same_shape(app: &axum::Router, path: &str) {
    let sep = if path.contains('?') { '&' } else { '?' };
    let (ss_status, ss_headers, ss) = get(app, path).await;
    let (status, headers, drik) = get(app, &format!("{path}{sep}siddhanta=drik")).await;
    assert_eq!((ss_status, status), (200, 200), "{path}");
    assert_eq!(ss_headers["x-siddhanta"], "surya_siddhanta", "{path}");
    assert_eq!(headers["x-siddhanta"], "drik", "{path}");
    assert_eq!(headers["x-ayanamsha"], "lahiri", "{path}");
    assert_ne!(ss, drik, "{path}: drik must compute its own values");
    if let Some(diff) = shape_diff(&ss, &drik, "") {
        panic!("{path}: shape differs: {diff}");
    }
}

#[tokio::test]
async fn a_day_has_the_same_shape() {
    let Some(app) = app() else { return };
    for path in [
        "/v1/panchanga/2026-11-22?era=ad&full=true",
        "/v1/panchanga/2026-11-22?era=ad&full=true&city_id=5128581",
        "/v1/panchanga/2083-08-07?era=bs",
        "/v1/panchanga/1500-03-05?era=ad",
    ] {
        same_shape(&app, path).await;
    }
}

#[tokio::test]
async fn a_month_a_year_and_an_instant_have_the_same_shape() {
    let Some(app) = app() else { return };
    for path in [
        "/v1/panchanga/2083/7",
        "/v1/panchanga/2083/7?full=true&city_id=1282898",
        "/v1/panchanga/year/2083",
        "/v1/panchanga/year/2083?wheel=true",
        "/v1/panchanga/at-time?datetime=2026-11-22T10:00:00%2B05:45",
        "/v1/planetary/positions?datetime=2026-11-22T10:00:00%2B05:45",
    ] {
        same_shape(&app, path).await;
    }
}

#[tokio::test]
async fn drik_values_are_drik_values() {
    let Some(app) = app() else { return };
    let (_, _, day) = get(
        &app,
        "/v1/panchanga/2026-11-22?era=ad&full=true&siddhanta=drik",
    )
    .await;
    // Kathmandu, 22 Nov 2026: the Sun's upper limb rises at about 06:30 and sets at about 17:10.
    let sun = &day["sun"];
    let hm = |k: &str| {
        let t = sun[k].as_str().expect("clock");
        let (h, m) = t.split_once(':').expect("hh:mm");
        h.parse::<u32>().expect("h") * 60 + m.parse::<u32>().expect("m")
    };
    assert!(
        (6 * 60 + 25..=6 * 60 + 36).contains(&hm("sunrise")),
        "{sun}"
    );
    assert!(
        (17 * 60 + 3..=17 * 60 + 16).contains(&hm("sunset")),
        "{sun}"
    );
    // The Sun is in Vrishchika (sidereal) from 17 Nov to 16 Dec.
    assert_eq!(day["surya_rashi"], "Vrishchika");
}

#[tokio::test]
async fn outside_the_kernel_is_a_clear_error() {
    let Some(app) = app() else { return };
    for path in [
        "/v1/panchanga/3200-01-01?era=ad&siddhanta=drik",
        "/v1/panchanga/-100-01-01?era=ad&siddhanta=drik",
        "/v1/panchanga/year/5000?siddhanta=drik",
        "/v1/panchanga/at-time?datetime=3500-01-01T10:00:00%2B05:45&siddhanta=drik",
    ] {
        let (status, _, body) = get(&app, path).await;
        assert_eq!(status, 400, "{path}");
        let detail = body["detail"].as_str().expect("detail");
        assert!(
            detail.contains("outside the own ephemeris"),
            "{path}: {detail}"
        );
    }
    // The text still answers there.
    let (status, _, _) = get(&app, "/v1/panchanga/3200-01-01?era=ad").await;
    assert_eq!(status, 200);
}

#[tokio::test]
async fn provenance_describes_our_files() {
    let Some(app) = app() else { return };
    let (status, _, body) = get(&app, "/meta/provenance").await;
    assert_eq!(status, 200);
    let p = &body["provenance"];
    assert_eq!(p["engine"], "own_drik");
    assert!(p["ephemeris"]["kernel_bytes"].as_u64().unwrap_or(0) > 1_000_000);
    assert_eq!(p["ephemeris"]["answers_for_years"][0], 1);
    assert_eq!(p["provenance_hash"].as_str().map(str::len), Some(64));
    assert!(body.get("cache").is_some());
}

#[tokio::test]
async fn a_bad_siddhanta_is_still_refused() {
    let Some(app) = app() else { return };
    let (status, _, body) = get(&app, "/v1/panchanga/2026-11-22?era=ad&siddhanta=vakya").await;
    assert_eq!(status, 400);
    assert!(
        body["detail"]
            .as_str()
            .expect("detail")
            .contains("siddhanta must be one of")
    );
}
