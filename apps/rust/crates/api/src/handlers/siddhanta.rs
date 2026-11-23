//! `GET /v1/siddhanta/table`: a slice of the Surya Siddhanta position table.
//!
//! The server does no maths here — it is a lookup, the way drik reads
//! `kernel.veph`. The client asks for the Julian Day window it needs, gets a
//! self-contained STAB table (header + samples) back, and interpolates and
//! derives everything locally (see `packages/domain/src/astronomy/
//! siddhanta-offline.ts`). A year at the table's 12 h step is ~26 KB; a day
//! is 144 bytes plus the 48-byte header.
//!
//! `from_jd` and `to_jd` are Julian Days (UT). The window is capped at 400
//! days so one request cannot ask for the whole file. 501 when no table is
//! loaded, 400 for a bad window, 404 when the window does not overlap the
//! table at all.

use axum::{
    extract::{Query as AxumQuery, State},
    http::{StatusCode, header},
    response::Response,
};

use crate::{
    respond::{Query, detail},
    state::AppState,
};

/// Longest window one request may ask for, in days.
const MAX_WINDOW_DAYS: f64 = 400.0;

fn jd_param(q: &Query, name: &str) -> Result<f64, String> {
    let raw = q
        .get(name)
        .ok_or_else(|| format!("{name}: field required"))?;
    let v: f64 = raw
        .parse()
        .map_err(|_| format!("{name}: Input should be a valid number"))?;
    if v.is_finite() {
        Ok(v)
    } else {
        Err(format!("{name}: Input should be a finite number"))
    }
}

/// `GET /v1/siddhanta/table?from_jd=…&to_jd=…`.
pub async fn table(AxumQuery(q): AxumQuery<Query>, State(state): State<AppState>) -> Response {
    let Some(table) = &state.siddhanta else {
        return detail(StatusCode::NOT_IMPLEMENTED, "siddhanta table is not loaded");
    };
    let from = match jd_param(&q, "from_jd") {
        Ok(v) => v,
        Err(e) => return detail(StatusCode::BAD_REQUEST, &e),
    };
    let to = match jd_param(&q, "to_jd") {
        Ok(v) => v,
        Err(e) => return detail(StatusCode::BAD_REQUEST, &e),
    };
    if from >= to {
        return detail(StatusCode::BAD_REQUEST, "from_jd must be before to_jd");
    }
    if to - from > MAX_WINDOW_DAYS {
        return detail(
            StatusCode::BAD_REQUEST,
            "window is longer than 400 days; ask for a shorter one",
        );
    }
    let cut = table.slice(from, to);
    if cut.sample_count() == 0 {
        return detail(
            StatusCode::NOT_FOUND,
            "window is outside the siddhanta table",
        );
    }
    let bytes = siddhanta_table::serialise(&cut);
    Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, "application/octet-stream")
        .header(header::CACHE_CONTROL, "public, max-age=86400")
        .body(axum::body::Body::from(bytes))
        .unwrap_or_else(|_| {
            detail(
                StatusCode::INTERNAL_SERVER_ERROR,
                "could not build response",
            )
        })
}
