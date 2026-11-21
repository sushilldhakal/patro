//! `GET /health`.

use axum::{Json, extract::State};
use serde::Serialize;

use crate::state::AppState;

/// Same fields as the Python `/health` that both servers can answer.
/// (Python also reports its own cache counters, which have no Rust equivalent yet.)
#[derive(Debug, Serialize)]
pub struct Health {
    /// Always `"ok"` when the server answers.
    pub status: &'static str,
    /// Whether the city database is present.
    pub cities_db: bool,
}

/// Liveness and the presence of the reference data.
pub async fn health(State(state): State<AppState>) -> Json<Health> {
    Json(Health {
        status: "ok",
        cities_db: state.config.cities_db().is_file(),
    })
}
