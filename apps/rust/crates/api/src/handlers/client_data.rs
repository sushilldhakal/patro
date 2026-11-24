//! Batches of stored astronomy for clients: `GET /v1/{siddhanta,drik}/cheb`.
//!
//! The apps carry a window of years themselves (BS 1950 to 2150). For any year outside it
//! they ask here, a few years at a time, and keep the answer. The server does no maths: the
//! slice is a copy of stored segments (`ChebTable::slice`), in the same format as the file the
//! apps carry, so one reader serves both. It holds graha positions only; the apps work out every
//! boundary from them.
//!
//! `from_jd` and `to_jd` are Julian Days (UT), at most 4000 days apart. 501 when the file is
//! not loaded, 400 for a bad window, 404 when the window is outside the file.

use axum::{
    extract::{Query as AxumQuery, State},
    http::{StatusCode, header},
    response::Response,
};

use super::siddhanta::jd_param;
use crate::{
    respond::{Query, detail},
    state::AppState,
};

/// Longest window one request may ask for, in days (about eleven years).
const MAX_WINDOW_DAYS: f64 = 4000.0;

/// Which system's file a request is for.
#[derive(Clone, Copy)]
enum Sys {
    Surya,
    Drik,
}

fn window(q: &Query) -> Result<(f64, f64), String> {
    let from = jd_param(q, "from_jd")?;
    let to = jd_param(q, "to_jd")?;
    if from >= to {
        return Err("from_jd must be before to_jd".to_string());
    }
    if to - from > MAX_WINDOW_DAYS {
        return Err("window is longer than 4000 days; ask for a shorter one".to_string());
    }
    Ok((from, to))
}

fn octets(bytes: Vec<u8>) -> Response {
    Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, "application/octet-stream")
        .header(header::CACHE_CONTROL, "public, max-age=604800")
        .body(axum::body::Body::from(bytes))
        .unwrap_or_else(|_| {
            detail(
                StatusCode::INTERNAL_SERVER_ERROR,
                "could not build response",
            )
        })
}

fn cheb_slice(state: &AppState, sys: Sys, q: &Query) -> Response {
    let (from, to) = match window(q) {
        Ok(w) => w,
        Err(e) => return detail(StatusCode::BAD_REQUEST, &e),
    };
    let table = match sys {
        Sys::Surya => &state.surya_cheb,
        Sys::Drik => &state.drik_cheb,
    };
    let Some(table) = table else {
        return detail(StatusCode::NOT_IMPLEMENTED, "chebyshev file is not loaded");
    };
    match table.slice(from, to) {
        Some(cut) => octets(siddhanta_table::cheb::serialise(&cut)),
        None => detail(
            StatusCode::NOT_FOUND,
            "window is outside the chebyshev file",
        ),
    }
}

/// `GET /v1/siddhanta/cheb`: Surya Siddhanta graha positions.
pub async fn surya_cheb(AxumQuery(q): AxumQuery<Query>, State(s): State<AppState>) -> Response {
    cheb_slice(&s, Sys::Surya, &q)
}

/// `GET /v1/drik/cheb`: Drik graha positions.
pub async fn drik_cheb(AxumQuery(q): AxumQuery<Query>, State(s): State<AppState>) -> Response {
    cheb_slice(&s, Sys::Drik, &q)
}
