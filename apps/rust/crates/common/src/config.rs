//! Layered configuration: `config/default.toml`, then `PATRO_RS__*` environment variables.

use std::{net::SocketAddr, path::PathBuf, time::Duration};

use serde::Deserialize;

/// Server settings, read once at startup.
#[derive(Debug, Clone, Deserialize)]
pub struct AppConfig {
    /// Address to listen on.
    pub host: String,
    /// Port to listen on (8100 by default, beside the Python API's 8000).
    pub port: u16,
    /// Folder with the reference SQLite files shared with the Python API.
    pub data_dir: PathBuf,
    /// Seconds before a request is answered with 504.
    pub request_timeout_secs: u64,
    /// `tracing` filter used when `RUST_LOG` is not set.
    pub log_filter: String,
}

impl AppConfig {
    /// Reads `<config_dir>/default.toml` (optional) and the environment.
    ///
    /// # Errors
    ///
    /// When a source cannot be read or a value has the wrong type.
    pub fn load(config_dir: &str) -> Result<Self, config::ConfigError> {
        config::Config::builder()
            .set_default("host", "127.0.0.1")?
            .set_default("port", 8100)?
            .set_default("data_dir", "../api/data")?
            .set_default("request_timeout_secs", 15)?
            .set_default("log_filter", "info")?
            .add_source(config::File::with_name(&format!("{config_dir}/default")).required(false))
            .add_source(
                config::Environment::with_prefix("PATRO_RS")
                    .prefix_separator("__")
                    .separator("__"),
            )
            .build()?
            .try_deserialize()
    }

    /// The socket address to bind.
    ///
    /// # Errors
    ///
    /// When `host` is not an IP address.
    pub fn addr(&self) -> Result<SocketAddr, std::net::AddrParseError> {
        format!("{}:{}", self.host, self.port).parse()
    }

    /// How long a request may run.
    #[must_use]
    pub fn request_timeout(&self) -> Duration {
        Duration::from_secs(self.request_timeout_secs)
    }

    /// Path of the city database shared with the Python API.
    #[must_use]
    pub fn cities_db(&self) -> PathBuf {
        self.data_dir.join("cities.db")
    }

    /// Path of the documents database shared with the Python API.
    #[must_use]
    pub fn documents_db(&self) -> PathBuf {
        self.data_dir.join("documents.db")
    }
}
