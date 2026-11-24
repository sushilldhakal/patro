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
    /// Our own ephemeris, loaded once at startup from `PATRO_RS_EPHDATA`; `None` keeps
    /// `siddhanta=drik` answering 501.
    pub drik: Option<DrikFiles>,
    /// The Surya Siddhanta position table, loaded once at startup from the
    /// file named by `PATRO_RS_SIDDHANTA_TABLE`; `None` keeps
    /// `/v1/siddhanta/table` answering 501.
    pub siddhanta: Option<std::sync::Arc<siddhanta_table::Table>>,
    /// The Surya Siddhanta Chebyshev file (`PATRO_RS_SURYA_CHEB`): batches for clients. `None` answers 501.
    pub surya_cheb: Option<std::sync::Arc<siddhanta_table::cheb::ChebTable>>,
    /// The Drik Chebyshev file (`PATRO_RS_DRIK_CHEB`): batches for clients. `None` answers 501.
    pub drik_cheb: Option<std::sync::Arc<siddhanta_table::cheb::ChebTable>>,
}

/// The own-ephemeris files a server loaded, and the system built on them.
#[derive(Debug, Clone, Copy)]
pub struct DrikFiles {
    /// The system requests with `siddhanta=drik` are answered by.
    pub system: astronomy::System,
    /// Kernel file size, bytes.
    pub kernel_bytes: u64,
}

/// Loads `kernel.veph` from the folder named by
/// `PATRO_RS_EPHDATA`, once. The data is leaked on purpose: it lives as long as the
/// process and every request reads it without reference counting.
fn load_drik() -> Option<DrikFiles> {
    static LOADED: OnceLock<Option<DrikFiles>> = OnceLock::new();
    *LOADED.get_or_init(load_drik_files)
}

fn load_drik_files() -> Option<DrikFiles> {
    let dir = std::path::PathBuf::from(std::env::var_os("PATRO_RS_EPHDATA")?);
    let kernel_path = dir.join("kernel.veph");
    let sky = match ephdata::Sky::open(&kernel_path) {
        Ok(sky) => Arc::new(sky),
        Err(e) => {
            tracing::error!(error = %e, path = %kernel_path.display(), "own ephemeris kernel not loaded: siddhanta=drik stays off");
            return None;
        }
    };
    let size = |p: &std::path::Path| std::fs::metadata(p).map_or(0, |m| m.len());
    let files = DrikFiles {
        kernel_bytes: size(&kernel_path),
        system: astronomy::System::Drik(Box::leak(Box::new(astronomy::DrikSky::new(sky)))),
    };
    tracing::info!(
        kernel_bytes = files.kernel_bytes,
        "own ephemeris loaded: siddhanta=drik is on"
    );
    Some(files)
}

/// A Chebyshev file named by the environment variable `var`, or `None` (logged) when unset or unreadable.
fn load_cheb(var: &str) -> Option<std::sync::Arc<siddhanta_table::cheb::ChebTable>> {
    let path = std::path::PathBuf::from(std::env::var_os(var)?);
    match siddhanta_table::cheb::open(&path) {
        Ok(table) => Some(std::sync::Arc::new(table)),
        Err(e) => {
            tracing::error!(error = %e, var, "chebyshev file not loaded: its batch endpoint stays off");
            None
        }
    }
}

/// Loads the Surya Siddhanta position table (`siddhanta.vtab`, built by the
/// `siddhanta-table` binary) from the file named by `PATRO_RS_SIDDHANTA_TABLE`,
/// once. A missing or unreadable file only logs: the table endpoint answers
/// 501 and the rest of the server is unaffected.
fn load_siddhanta() -> Option<std::sync::Arc<siddhanta_table::Table>> {
    let path = std::env::var_os("PATRO_RS_SIDDHANTA_TABLE")?;
    let path = std::path::PathBuf::from(path);
    match siddhanta_table::open(&path) {
        Ok(table) => {
            tracing::info!(
                first_jd = table.first_jd,
                last_jd = table.last_jd(),
                samples = table.sample_count(),
                "siddhanta table loaded: /v1/siddhanta/table is on"
            );
            Some(std::sync::Arc::new(table))
        }
        Err(e) => {
            tracing::error!(error = %e, path = %path.display(), "siddhanta table not loaded: /v1/siddhanta/table stays off");
            None
        }
    }
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
            drik: load_drik(),
            siddhanta: load_siddhanta(),
            surya_cheb: load_cheb("PATRO_RS_SURYA_CHEB"),
            drik_cheb: load_cheb("PATRO_RS_DRIK_CHEB"),
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
