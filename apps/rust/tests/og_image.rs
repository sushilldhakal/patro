//! `/og-image`: the share card is a 1200×630 PNG with the headers Python sends. (Python's
//! own PNG is a Chromium screenshot or a Pillow card, so its pixels are not compared; the
//! card's layout is the Pillow one, drawn by the `og` crate.)

use std::io::Read as _;

use api::AppState;
use axum::{
    body::{Body, to_bytes},
    http::{Request, StatusCode, header},
};
use common::AppConfig;
use flate2::read::GzDecoder;
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

async fn get(path: &str, accept: Option<&str>) -> axum::response::Response {
    let mut request = Request::builder().uri(path);
    if let Some(accept) = accept {
        request = request.header(header::ACCEPT_ENCODING, accept);
    }
    app()
        .oneshot(request.body(Body::empty()).expect("request"))
        .await
        .expect("response")
}

fn png_size(png: &[u8]) -> (u32, u32) {
    assert_eq!(&png[..8], b"\x89PNG\r\n\x1a\n", "PNG signature");
    let be = |at: usize| u32::from_be_bytes([png[at], png[at + 1], png[at + 2], png[at + 3]]);
    (be(16), be(20))
}

#[tokio::test]
async fn the_card_is_a_cached_1200_by_630_png() {
    let response = get("/og-image?date=2026-11-21&place=Pokhara&city=1283240", None).await;
    assert_eq!(response.status(), StatusCode::OK);
    let headers = response.headers();
    assert_eq!(headers[header::CONTENT_TYPE], "image/png");
    let cache = "public, max-age=86400, s-maxage=604800, immutable";
    assert_eq!(headers[header::CACHE_CONTROL], cache);
    assert_eq!(headers["cdn-cache-control"], cache);
    let body = to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("body");
    assert_eq!(png_size(&body), (1200, 630));
}

#[tokio::test]
async fn a_client_that_takes_gzip_gets_the_png_gzipped() {
    let response = get("/og-image?date=2026-11-21", Some("gzip")).await;
    assert_eq!(response.headers()[header::CONTENT_ENCODING], "gzip");
    let compressed = to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("body");
    let mut png = Vec::new();
    GzDecoder::new(&compressed[..])
        .read_to_end(&mut png)
        .expect("gunzip");
    assert_eq!(png_size(&png), (1200, 630));
}

#[tokio::test]
async fn a_bad_date_or_place_still_draws_and_bad_types_are_422() {
    // Python degrades a bad date to today and an unknown place to Kathmandu.
    for path in [
        "/og-image?date=nonsense",
        "/og-image?city=999999999",
        "/og-image",
    ] {
        assert_eq!(get(path, None).await.status(), StatusCode::OK, "{path}");
    }
    for path in [
        "/og-image?city=abc",
        "/og-image?lat=x",
        "/og-image?full=maybe",
    ] {
        assert_eq!(
            get(path, None).await.status(),
            StatusCode::UNPROCESSABLE_ENTITY,
            "{path}"
        );
    }
}
