//! The Postgres pool and schema (`database/db.py` and `database/models.py`).
//!
//! The tables, columns, indexes and constraints are the ones `SQLAlchemy`'s
//! `create_all` makes, so the Rust server and the Python app can share one
//! database. Python's `_ensure_*` column patches become `ADD COLUMN IF NOT EXISTS`.

use std::{str::FromStr, time::SystemTime};

use deadpool_postgres::{Manager, ManagerConfig, Pool, RecyclingMethod};
use jiff::Timestamp;
use tokio_postgres::NoTls;

use crate::AccountError;

/// Builds the pool for `url` (no connection is made yet).
///
/// # Errors
///
/// The URL does not parse.
pub fn pool(url: &str, size: usize) -> Result<Pool, AccountError> {
    let config = tokio_postgres::Config::from_str(url)
        .map_err(|e| AccountError::Database(format!("bad database URL: {e}")))?;
    let manager = Manager::from_config(
        config,
        NoTls,
        ManagerConfig {
            recycling_method: RecyclingMethod::Fast,
        },
    );
    Pool::builder(manager)
        .max_size(size)
        .build()
        .map_err(|e| AccountError::Database(e.to_string()))
}

const SCHEMA: &str = r"
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    email VARCHAR(320) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_verified BOOLEAN NOT NULL,
    is_active BOOLEAN NOT NULL,
    apple_user_id VARCHAR(128),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email ON users (email);
ALTER TABLE users ADD COLUMN IF NOT EXISTS apple_user_id VARCHAR(128);
CREATE UNIQUE INDEX IF NOT EXISTS ix_users_apple_user_id ON users (apple_user_id);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    replaced_by_id VARCHAR(36),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_refresh_tokens_user_id ON refresh_tokens (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS ix_refresh_tokens_token_hash ON refresh_tokens (token_hash);
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS replaced_by_id VARCHAR(36);

CREATE TABLE IF NOT EXISTS email_tokens (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    kind VARCHAR(20) NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_email_tokens_user_id ON email_tokens (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS ix_email_tokens_token_hash ON email_tokens (token_hash);
CREATE INDEX IF NOT EXISTS ix_email_tokens_user_kind ON email_tokens (user_id, kind);

CREATE TABLE IF NOT EXISTS profiles (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    full_name VARCHAR(120) NOT NULL,
    phone VARCHAR(32),
    email VARCHAR(320),
    gender VARCHAR(16),
    country VARCHAR(80),
    city VARCHAR(120),
    location_label VARCHAR(200),
    latitude FLOAT,
    longitude FLOAT,
    timezone VARCHAR(64),
    birth_date VARCHAR(32),
    birth_time VARCHAR(16),
    birth_era VARCHAR(4),
    notes TEXT,
    is_default BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_profiles_user_id ON profiles (user_id);

CREATE TABLE IF NOT EXISTS devices (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    push_token VARCHAR(255) NOT NULL,
    platform VARCHAR(16) NOT NULL,
    timezone VARCHAR(64),
    locale VARCHAR(16),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    CONSTRAINT uq_devices_push_token UNIQUE (push_token)
);
CREATE INDEX IF NOT EXISTS ix_devices_user_id ON devices (user_id);

CREATE TABLE IF NOT EXISTS reminders (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    profile_id VARCHAR(36) REFERENCES profiles (id) ON DELETE CASCADE,
    window_kind VARCHAR(8) NOT NULL,
    window_key VARCHAR(48) NOT NULL,
    lead_minutes INTEGER NOT NULL,
    weekdays VARCHAR(20) NOT NULL,
    label VARCHAR(120),
    enabled BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_reminders_user_id ON reminders (user_id);

CREATE TABLE IF NOT EXISTS user_watchlists (
    user_id VARCHAR(36) NOT NULL PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    items TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS calendar_feeds (
    user_id VARCHAR(36) NOT NULL PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    token VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    synced_at TIMESTAMP WITH TIME ZONE,
    synced_app VARCHAR(8)
);
CREATE UNIQUE INDEX IF NOT EXISTS ix_calendar_feeds_token ON calendar_feeds (token);
ALTER TABLE calendar_feeds ADD COLUMN IF NOT EXISTS synced_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE calendar_feeds ADD COLUMN IF NOT EXISTS synced_app VARCHAR(8);

CREATE TABLE IF NOT EXISTS calendar_events (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    profile_id VARCHAR(36) REFERENCES profiles (id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    location VARCHAR(200),
    notes TEXT,
    all_day BOOLEAN NOT NULL,
    starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
    timezone VARCHAR(64) NOT NULL,
    kind VARCHAR(16) DEFAULT 'event' NOT NULL,
    priority INTEGER DEFAULT '0' NOT NULL,
    repeat VARCHAR(16) NOT NULL,
    alerts VARCHAR(40) NOT NULL,
    source_kind VARCHAR(16),
    source_key VARCHAR(64),
    invitees TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_calendar_events_user_id ON calendar_events (user_id);
CREATE INDEX IF NOT EXISTS ix_calendar_events_starts_at ON calendar_events (starts_at);
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS kind VARCHAR(16) NOT NULL DEFAULT 'event';
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 0;
ALTER TABLE calendar_events ALTER COLUMN kind TYPE VARCHAR(16);

CREATE TABLE IF NOT EXISTS app_installations (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    installation_id VARCHAR(36) NOT NULL,
    platform VARCHAR(16) NOT NULL,
    app_version VARCHAR(32),
    os_version VARCHAR(32),
    country_code VARCHAR(2),
    user_id VARCHAR(36) REFERENCES users (id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL,
    first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS ix_app_installations_installation_id ON app_installations (installation_id);
CREATE INDEX IF NOT EXISTS ix_app_installations_user_id ON app_installations (user_id);
CREATE INDEX IF NOT EXISTS ix_app_installations_first_seen_at ON app_installations (first_seen_at);
CREATE INDEX IF NOT EXISTS ix_app_installations_last_seen_at ON app_installations (last_seen_at);

CREATE TABLE IF NOT EXISTS app_installation_events (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    installation_id VARCHAR(36) NOT NULL,
    event_type VARCHAR(24) NOT NULL,
    app_version VARCHAR(32),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_app_installation_events_installation_id ON app_installation_events (installation_id);
CREATE INDEX IF NOT EXISTS ix_app_installation_events_created ON app_installation_events (created_at);

CREATE TABLE IF NOT EXISTS app_daily_sessions (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    day VARCHAR(10) NOT NULL,
    platform VARCHAR(16) NOT NULL,
    sessions INTEGER NOT NULL,
    CONSTRAINT uq_app_daily_sessions_day_platform UNIQUE (day, platform)
);
";

/// Creates the tables if they are missing; safe on every start.
///
/// # Errors
///
/// The database is unreachable or refuses the DDL.
pub async fn init(pool: &Pool) -> Result<(), AccountError> {
    let client = pool.get().await?;
    // One server-wide lock so two workers starting together do not race the DDL.
    client
        .batch_execute(&format!(
            "SELECT pg_advisory_lock(727274); {SCHEMA} SELECT pg_advisory_unlock(727274);"
        ))
        .await?;
    Ok(())
}

/// A random version-4 UUID string (the `_uuid` default of the Python models).
#[must_use]
pub fn new_id() -> String {
    uuid::Uuid::new_v4().to_string()
}

/// A Postgres `timestamptz` value as a [`Timestamp`] (microsecond precision).
#[must_use]
pub fn ts(value: SystemTime) -> Timestamp {
    Timestamp::try_from(value).unwrap_or(Timestamp::UNIX_EPOCH)
}

/// A [`Timestamp`] as the `SystemTime` Postgres stores, truncated to microseconds.
#[must_use]
pub fn sys(value: Timestamp) -> SystemTime {
    let micros = value.as_microsecond();
    let truncated = Timestamp::from_microsecond(micros).unwrap_or(value);
    SystemTime::from(truncated)
}

/// The current time, truncated to microseconds.
#[must_use]
pub fn now() -> Timestamp {
    let t = Timestamp::now();
    Timestamp::from_microsecond(t.as_microsecond()).unwrap_or(t)
}

/// pydantic's JSON form of an aware UTC `datetime`: `2026-01-02T03:04:05Z`,
/// with six fraction digits when there are microseconds.
#[must_use]
pub fn iso_z(value: Timestamp) -> String {
    let dt = value.to_zoned(jiff::tz::TimeZone::UTC).datetime();
    let micros = dt.subsec_nanosecond() / 1000;
    let base = format!(
        "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}",
        dt.year(),
        dt.month(),
        dt.day(),
        dt.hour(),
        dt.minute(),
        dt.second()
    );
    if micros == 0 {
        format!("{base}Z")
    } else {
        format!("{base}.{micros:06}Z")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pydantic_datetime_format() {
        let t: Timestamp = "2026-01-02T03:04:05.6Z".parse().expect("parses");
        assert_eq!(iso_z(t), "2026-01-02T03:04:05.600000Z");
        let t: Timestamp = "2026-01-02T03:04:05+05:45".parse().expect("parses");
        assert_eq!(iso_z(t), "2026-01-01T21:19:05Z");
    }
}
