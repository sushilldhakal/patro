//! The calculation headers: every response says which siddhanta computed it.
//!
//! Handlers stamp `x-siddhanta` / `x-ayanamsha` as the Surya Siddhanta; a request that
//! asked for `siddhanta=drik` and was answered (not refused) gets drik's pair instead.

use axum::{
    extract::Request,
    http::{HeaderValue, StatusCode},
    middleware::Next,
    response::Response,
};

fn asks_for_drik(query: Option<&str>) -> bool {
    query.is_some_and(|q| {
        q.split('&')
            .filter_map(|pair| pair.split_once('='))
            .rfind(|(k, _)| *k == "siddhanta")
            .is_some_and(|(_, v)| v.trim().eq_ignore_ascii_case("drik"))
    })
}

/// Rewrites the siddhanta headers of a successful drik response.
pub(super) async fn siddhanta_headers(request: Request, next: Next) -> Response {
    let drik = asks_for_drik(request.uri().query());
    let mut response = next.run(request).await;
    if drik && response.status() != StatusCode::NOT_IMPLEMENTED && response.status().as_u16() < 400
    {
        let headers = response.headers_mut();
        headers.insert("x-siddhanta", HeaderValue::from_static("drik"));
        headers.insert("x-ayanamsha", HeaderValue::from_static("lahiri"));
    }
    response
}
