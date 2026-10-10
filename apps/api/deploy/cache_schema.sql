-- Reference schema for the computed-cache tables (sait + panchanga blobs).
--
-- You do NOT normally need to run this: the FastAPI app creates these tables
-- automatically on startup (Base.metadata.create_all) when DATABASE_URL is set.
-- Apply it by hand only if the app's Postgres role lacks CREATE TABLE and the
-- tables must be provisioned by a DBA. Safe to re-run (IF NOT EXISTS).

-- Persisted sait / muhurta listings: one row per (bs_year, category, location).
-- A stale engine_version is treated as a miss, so a rules change recomputes.
CREATE TABLE IF NOT EXISTS sait_cache (
    id             VARCHAR(36) PRIMARY KEY,      -- app-generated UUID
    bs_year        INTEGER     NOT NULL,
    category       VARCHAR(48) NOT NULL,
    location_key   VARCHAR(80) NOT NULL,
    engine_version VARCHAR(16) NOT NULL,
    payload        TEXT        NOT NULL,          -- serialized {"months": {...}, ...}
    computed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_sait_cache_key UNIQUE (bs_year, category, location_key)
);

-- Shared key->bytes cache for computed panchanga payloads (year / month / day).
-- The key embeds CACHE_PAYLOAD_VERSION (e.g. "year_v24_..." / "v24_..."), so a
-- payload-shape bump simply stops reading the old rows; startup prunes them.
CREATE TABLE IF NOT EXISTS blob_cache (
    cache_key  VARCHAR(255) PRIMARY KEY,          -- versioned filename stem
    data       BYTEA        NOT NULL,             -- gzip-compressed JSON bytes
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);
