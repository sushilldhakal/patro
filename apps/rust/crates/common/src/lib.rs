//! Shared building blocks: configuration and the error type every crate returns.

pub mod config;
pub mod error;
pub mod keyprobe;
pub mod pyjson;
pub mod pyser;

pub use config::AppConfig;
pub use error::{AppError, AppResult};
