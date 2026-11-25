//! HTTP layer: routes, handlers and middleware. Business logic lives in other crates.

mod body;
pub mod handlers;
pub mod middleware;
pub mod news;
mod respond;
pub mod routes;
pub mod state;
pub mod weather;

pub use routes::router;
pub use state::AppState;
