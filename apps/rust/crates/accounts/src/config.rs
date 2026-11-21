//! The account layer's settings, read from the same variables `config.py` reads.
//!
//! The one exception is the database URL: `PATRO_RS_DATABASE_URL`, never
//! `DATABASE_URL`, so the Rust server cannot reach the production database by
//! inheriting the Python app's environment.

use std::env;

fn var(name: &str) -> Option<String> {
    env::var(name)
        .ok()
        .map(|v| v.trim().to_owned())
        .filter(|v| !v.is_empty())
}

fn int_var(name: &str, default: i64) -> i64 {
    var(name).and_then(|v| v.parse().ok()).unwrap_or(default)
}

fn truthy(name: &str) -> Option<bool> {
    let v = var(name)?.to_lowercase();
    match v.as_str() {
        "1" | "true" | "yes" => Some(true),
        "0" | "false" | "no" => Some(false),
        _ => None,
    }
}

/// SMTP settings (`SMTP_HOST` set), as `config.smtp_config()`.
#[derive(Debug, Clone)]
pub struct Smtp {
    /// Server host.
    pub host: String,
    /// Server port (587).
    pub port: u16,
    /// Login user ("" = no login).
    pub user: String,
    /// Login password.
    pub password: String,
    /// The From address.
    pub from_addr: String,
    /// The From display name.
    pub from_name: String,
    /// Optional Reply-To.
    pub reply_to: Option<String>,
    /// `STARTTLS` before login.
    pub use_tls: bool,
}

/// Everything the account routes read from the environment.
#[derive(Debug, Clone)]
pub struct AccountConfig {
    /// The Postgres URL (a `+psycopg` driver suffix is accepted and dropped).
    pub database_url: String,
    /// HS256 secret for access tokens (`JWT_SECRET`).
    pub jwt_secret: String,
    /// Access-token lifetime in minutes.
    pub access_ttl_minutes: i64,
    /// Refresh-token lifetime in days.
    pub refresh_ttl_days: i64,
    /// Where email links point (`FRONTEND_URL`, no trailing slash).
    pub frontend_url: String,
    /// Accepted Google ID-token audiences.
    pub google_client_ids: Vec<String>,
    /// Accepted Apple identity-token audiences.
    pub apple_client_ids: Vec<String>,
    /// Facebook app id and secret.
    pub facebook: Option<(String, String)>,
    /// SMTP; `None` logs emails instead.
    pub smtp: Option<Smtp>,
    /// `X-Admin-Key` for the admin analytics routes.
    pub admin_api_key: Option<String>,
    /// Signed-in accounts allowed on the admin routes (lower-case).
    pub admin_emails: Vec<String>,
    /// Pool size (`DB_POOL_SIZE` + `DB_MAX_OVERFLOW`).
    pub pool_size: usize,
}

fn csv(name: &str) -> Vec<String> {
    var(name)
        .map(|v| {
            v.split(',')
                .map(str::trim)
                .filter(|p| !p.is_empty())
                .map(str::to_owned)
                .collect()
        })
        .unwrap_or_default()
}

fn dedup(ids: Vec<String>) -> Vec<String> {
    let mut out: Vec<String> = Vec::new();
    for id in ids {
        if !out.contains(&id) {
            out.push(id);
        }
    }
    out
}

impl AccountConfig {
    /// The settings, or `None` when the account layer is off: no
    /// `PATRO_RS_DATABASE_URL`, `AUTH_DATABASE_ENABLED=false`, or
    /// `PATRO_LOCAL_DEV=true` without `AUTH_DATABASE_ENABLED=true`.
    #[must_use]
    pub fn from_env() -> Option<Self> {
        let url = var("PATRO_RS_DATABASE_URL")?;
        let explicit = truthy("AUTH_DATABASE_ENABLED");
        if explicit == Some(false)
            || (explicit.is_none() && truthy("PATRO_LOCAL_DEV") == Some(true))
        {
            return None;
        }
        Some(Self::with_url(&url))
    }

    /// The settings for an explicit database URL (tests).
    #[must_use]
    pub fn with_url(url: &str) -> Self {
        let mut google = Vec::new();
        for key in [
            "GOOGLE_CLIENT_ID",
            "GOOGLE_IOS_CLIENT_ID",
            "GOOGLE_ANDROID_CLIENT_ID",
        ] {
            if let Some(v) = var(key) {
                google.push(v);
            }
        }
        google.extend(csv("GOOGLE_CLIENT_IDS"));
        let bundle = match env::var("APPLE_BUNDLE_ID") {
            Ok(v) if !v.is_empty() => v.trim().to_owned(),
            _ => "com.vedicpatro.mobile".to_owned(),
        };
        let mut apple: Vec<String> = Some(bundle).filter(|b| !b.is_empty()).into_iter().collect();
        if let Some(v) = var("APPLE_SERVICES_ID") {
            apple.push(v);
        }
        apple.extend(csv("APPLE_CLIENT_IDS"));
        let facebook = match (var("FACEBOOK_APP_ID"), var("FACEBOOK_APP_SECRET")) {
            (Some(id), Some(secret)) => Some((id, secret)),
            _ => None,
        };
        let smtp = var("SMTP_HOST").map(|host| {
            let user = env::var("SMTP_USER").unwrap_or_default();
            Smtp {
                host,
                port: u16::try_from(int_var("SMTP_PORT", 587)).unwrap_or(587),
                password: env::var("SMTP_PASSWORD").unwrap_or_default(),
                from_addr: env::var("SMTP_FROM").unwrap_or_else(|_| {
                    if user.is_empty() {
                        "noreply@vedicpatro.com".to_owned()
                    } else {
                        user.clone()
                    }
                }),
                user,
                from_name: env::var("SMTP_FROM_NAME").unwrap_or_else(|_| "Vedic Patro".to_owned()),
                reply_to: var("SMTP_REPLY_TO"),
                use_tls: env::var("SMTP_USE_TLS").map_or(true, |v| v.to_lowercase() == "true"),
            }
        });
        let pool = int_var("DB_POOL_SIZE", 3).max(1) + int_var("DB_MAX_OVERFLOW", 2).max(0);
        Self {
            database_url: url.replacen("+psycopg", "", 1),
            jwt_secret: env::var("JWT_SECRET")
                .unwrap_or_else(|_| "dev-insecure-change-me".to_owned()),
            access_ttl_minutes: int_var("ACCESS_TOKEN_TTL_MINUTES", 30),
            refresh_ttl_days: int_var("REFRESH_TOKEN_TTL_DAYS", 365),
            frontend_url: env::var("FRONTEND_URL")
                .unwrap_or_else(|_| "https://vedicpatro.com".to_owned())
                .trim_end_matches('/')
                .to_owned(),
            google_client_ids: dedup(google),
            apple_client_ids: dedup(apple),
            facebook,
            smtp,
            admin_api_key: var("ADMIN_API_KEY"),
            admin_emails: csv("ADMIN_EMAILS")
                .into_iter()
                .map(|e| e.to_lowercase())
                .collect(),
            pool_size: usize::try_from(pool).unwrap_or(5).max(4) * 4,
        }
    }
}
