//! The account layer of the Python API (`app/routers/{auth,profiles,guidance,events,install_analytics}.py`):
//! accounts and sessions, saved birth profiles, devices and reminder rules,
//! saved events with their `.ics` feed and invitations, and anonymous install
//! counting — all on Postgres.
//!
//! It is mounted only when `PATRO_RS_DATABASE_URL` is set (see [`AccountConfig`]).
//! The rules and messages follow `engine/identity` and `services/identity`;
//! HTTP lives in the `api` crate.

pub mod accounts;
pub mod analytics;
pub mod config;
pub mod credentials;
pub mod db;
pub mod email;
pub mod emailer;
pub mod events;
pub mod places;
pub mod profiles;
pub mod providers;
pub mod pydt;
pub mod reminders;
pub mod watchlist;

pub use config::AccountConfig;

use std::sync::{Arc, Mutex};

use deadpool_postgres::Pool;

/// A refused request: the status and `detail` the Python router answers with.
#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
pub enum AccountError {
    /// 409 `Email already registered`.
    #[error("Email already registered")]
    EmailAlreadyRegistered,
    /// 401 `Invalid email or password`.
    #[error("Invalid email or password")]
    InvalidCredentials,
    /// 403 `Account disabled`.
    #[error("Account disabled")]
    AccountDisabled,
    /// 400: an email link that is unknown, used or expired.
    #[error("{0}")]
    InvalidLink(String),
    /// 401: a refresh token that is unknown, rotated, revoked or expired.
    #[error("{0}")]
    InvalidSession(String),
    /// A sign-in provider refused the token (401) or is not configured (503).
    #[error("{message}")]
    Provider {
        /// The message shown.
        message: String,
        /// 503 instead of 401.
        not_configured: bool,
    },
    /// 404 with this detail (`Profile not found`, `Event not found`, …).
    #[error("{0}")]
    NotFound(String),
    /// 422 with a plain string detail (`BadEvent`, `BadWeekdays`).
    #[error("{0}")]
    Unprocessable(String),
    /// 429 `Too many requests`.
    #[error("Too many requests")]
    TooManyRequests,
    /// The database failed: a 500.
    #[error("database error: {0}")]
    Database(String),
}

impl AccountError {
    /// The HTTP status the Python router maps this to.
    #[must_use]
    pub const fn status(&self) -> u16 {
        match self {
            Self::EmailAlreadyRegistered => 409,
            Self::InvalidCredentials | Self::InvalidSession(_) => 401,
            Self::AccountDisabled => 403,
            Self::InvalidLink(_) => 400,
            Self::Provider { not_configured, .. } => {
                if *not_configured {
                    503
                } else {
                    401
                }
            }
            Self::NotFound(_) => 404,
            Self::Unprocessable(_) => 422,
            Self::TooManyRequests => 429,
            Self::Database(_) => 500,
        }
    }

    pub(crate) fn profile_not_found() -> Self {
        Self::NotFound("Profile not found".to_owned())
    }
}

impl From<tokio_postgres::Error> for AccountError {
    fn from(e: tokio_postgres::Error) -> Self {
        Self::Database(e.to_string())
    }
}

impl From<deadpool_postgres::PoolError> for AccountError {
    fn from(e: deadpool_postgres::PoolError) -> Self {
        Self::Database(e.to_string())
    }
}

/// Whether a database error is a unique-constraint violation.
pub(crate) fn is_unique_violation(e: &tokio_postgres::Error) -> bool {
    e.code() == Some(&tokio_postgres::error::SqlState::UNIQUE_VIOLATION)
}

/// The account layer: the pool, settings and the provider key caches.
#[derive(Debug, Clone)]
pub struct Accounts {
    pool: Pool,
    config: Arc<AccountConfig>,
    providers: Arc<providers::Providers>,
    outbox: Option<Outbox>,
}

/// Captured emails (tests): each one as JSON instead of being sent.
pub type Outbox = Arc<Mutex<Vec<serde_json::Value>>>;

impl Accounts {
    /// The same layer, with emails captured in `outbox` instead of sent.
    #[must_use]
    pub fn with_outbox(mut self, outbox: Outbox) -> Self {
        self.outbox = Some(outbox);
        self
    }

    /// Captures an email when an outbox is set; `true` means "do not send".
    pub fn capture(&self, mail: serde_json::Value) -> bool {
        let Some(outbox) = &self.outbox else {
            return false;
        };
        outbox
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
            .push(mail);
        true
    }

    /// Connects lazily to `config.database_url`.
    ///
    /// # Errors
    ///
    /// The database URL does not parse.
    pub fn new(config: AccountConfig) -> Result<Self, AccountError> {
        let pool = db::pool(&config.database_url, config.pool_size)?;
        Ok(Self {
            pool,
            config: Arc::new(config),
            providers: Arc::new(providers::Providers::new()),
            outbox: None,
        })
    }

    /// Creates the tables if missing (call once at start).
    ///
    /// # Errors
    ///
    /// The database is unreachable or refuses the DDL.
    pub async fn init(&self) -> Result<(), AccountError> {
        db::init(&self.pool).await
    }

    /// The settings.
    #[must_use]
    pub fn config(&self) -> &AccountConfig {
        &self.config
    }

    pub(crate) async fn client(&self) -> Result<deadpool_postgres::Object, AccountError> {
        Ok(self.pool.get().await?)
    }
}
