-- Reference schema for the auth/profile tables.
--
-- You do NOT normally need to run this: the FastAPI app creates these tables
-- automatically on startup (Base.metadata.create_all) when DATABASE_URL is set.
-- It is provided for documentation, manual provisioning, and backup tooling.

CREATE TABLE IF NOT EXISTS users (
    id            VARCHAR(36)  PRIMARY KEY,
    email         VARCHAR(320) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    is_verified   BOOLEAN      NOT NULL DEFAULT FALSE,
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_users_email ON users (email);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id         VARCHAR(36) PRIMARY KEY,
    user_id    VARCHAR(36) NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_refresh_tokens_user_id ON refresh_tokens (user_id);

CREATE TABLE IF NOT EXISTS email_tokens (
    id         VARCHAR(36) PRIMARY KEY,
    user_id    VARCHAR(36) NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    kind       VARCHAR(20) NOT NULL,            -- 'verify' | 'reset'
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_email_tokens_user_id   ON email_tokens (user_id);
CREATE INDEX IF NOT EXISTS ix_email_tokens_user_kind ON email_tokens (user_id, kind);

CREATE TABLE IF NOT EXISTS profiles (
    id             VARCHAR(36)  PRIMARY KEY,
    user_id        VARCHAR(36)  NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    full_name      VARCHAR(120) NOT NULL,
    phone          VARCHAR(32),
    email          VARCHAR(320),
    gender         VARCHAR(16),
    country        VARCHAR(80),
    city           VARCHAR(120),
    location_label VARCHAR(200),
    latitude       DOUBLE PRECISION,
    longitude      DOUBLE PRECISION,
    timezone       VARCHAR(64),
    birth_date     VARCHAR(32),
    birth_time     VARCHAR(16),
    birth_era      VARCHAR(4),                  -- 'bs' | 'ad'
    notes          TEXT,
    is_default     BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_profiles_user_id ON profiles (user_id);
