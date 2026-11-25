//! HTTP layer: routes, handlers and middleware. Business logic lives in other crates.

mod body;
pub mod handlers;
pub mod middleware;
mod respond;
pub mod routes;
pub mod state;
pub mod weather;

pub use routes::router;
pub use state::AppState;
