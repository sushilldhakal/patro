//! State shared by every request.

use std::sync::{Arc, OnceLock};

use common::AppConfig;
use geography::Cities;
use patro::catalog::{DocumentsService, documents_service};

/// Shared by every request. Connection pools (Postgres, Redis) join it in step 2.
#[derive(Debug, Clone)]
pub struct AppState {
    /// Settings, read once at startup.
    pub config: Arc<AppConfig>,
    /// The GeoNames city database.
    pub cities: Cities,
    /// Documents and Veda catalog data.
    pub documents: DocumentsService,
    /// A fixed "now" for tests; the system clock when `None`.
    pub fixed_now: Option<timescale::UtcInstant>,
    /// The account layer (Postgres), when `PATRO_RS_DATABASE_URL` is set.
    pub accounts: Option<accounts::Accounts>,
    /// Vastu reference data, read on first use.
    vastu: Arc<OnceLock<Result<Arc<vastu::Rules>, String>>>,
}

impl AppState {
    /// State for one running server.
    #[must_use]
    pub fn new(config: AppConfig) -> Self {
        let cities = Cities::new(config.cities_db());
        let documents = documents_service(&config.data_dir);
        Self {
            config: Arc::new(config),
            cities,
            documents,
            fixed_now: None,
            accounts: None,
            vastu: Arc::new(OnceLock::new()),
        }
    }

    /// The same state with the account layer mounted.
    #[must_use]
    pub fn with_accounts(mut self, accounts: accounts::Accounts) -> Self {
        self.accounts = Some(accounts);
        self
    }

    /// The same state with "now" pinned (for goldens of routes that read the clock).
    #[must_use]
    pub const fn with_fixed_now(mut self, now: timescale::UtcInstant) -> Self {
        self.fixed_now = Some(now);
        self
    }

    /// The Vastu zone uses, room index and room sizes.
    ///
    /// # Errors
    ///
    /// The data files are missing or malformed.
    pub fn vastu(&self) -> Result<Arc<vastu::Rules>, String> {
        self.vastu
            .get_or_init(|| {
                vastu::Rules::load(&self.config.data_dir)
                    .map(Arc::new)
                    .map_err(|e| e.to_string())
            })
            .clone()
    }

    /// The current moment: the pinned one in tests, the system clock otherwise.
    ///
    /// # Panics
    ///
    /// Never: the Unix epoch is a valid instant.
    #[must_use]
    pub fn now(&self) -> timescale::UtcInstant {
        self.fixed_now.unwrap_or_else(|| {
            let micros = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map_or(0, |d| i64::try_from(d.as_micros()).unwrap_or(0));
            timescale::UtcInstant::from_utc(timescale::CivilDay::new(1970, 1, 1), 0, 0, 0, 0)
                .expect("the Unix epoch is a valid instant")
                .add_micros(micros)
        })
    }
}
