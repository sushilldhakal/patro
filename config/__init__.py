"""Application configuration — loads .env from project root on import."""

from __future__ import annotations

import os

from dotenv import load_dotenv

from engine.astronomy.paths import PROJECT_ROOT

load_dotenv(PROJECT_ROOT / ".env")


def cors_origins() -> list[str] | None:
    raw = os.getenv("CORS_ALLOW_ORIGINS", "").strip()
    if not raw:
        return None
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


def log_level() -> str:
    return os.getenv("LOG_LEVEL", "INFO").upper()


def api_public_prefix() -> str:
    """Browser-visible URL prefix when nginx proxies /api/* to this app.

    Example: API_PUBLIC_PREFIX=/api so Swagger at /api/docs fetches /api/openapi.json
    instead of /openapi.json (which the SPA would answer with index.html).
    """
    raw = (os.getenv("API_PUBLIC_PREFIX") or "").strip().rstrip("/")
    if not raw:
        return ""
    return raw if raw.startswith("/") else f"/{raw}"


def api_version() -> str:
    """URL version segment for public, cacheable data endpoints (default "v1").

    Public data routes are mounted under this segment (…/api/v1/panchanga/…) so a
    backend engine change can bump the version (v1 → v2), which the CDN sees as a
    brand-new object — no Cloudflare purge needed. Auth/profile routes stay
    unversioned and are never edge-cached.
    """
    raw = (os.getenv("API_VERSION") or "v1").strip().strip("/")
    return raw or "v1"


# ─── Auth / database ───────────────────────────────────────────────────────────


def database_url() -> str | None:
    """SQLAlchemy URL for the user/auth database.

    Example: postgresql+psycopg://patro:secret@127.0.0.1:5432/patro
    When unset, the auth/profile routes are disabled (the panchanga API still runs).
    """
    return (os.getenv("DATABASE_URL") or "").strip() or None


def jwt_secret() -> str:
    """Secret used to sign access/refresh tokens. MUST be set in production."""
    return os.getenv("JWT_SECRET", "dev-insecure-change-me")


def google_client_id() -> str | None:
    """Google OAuth Web client ID. Used as the audience when verifying ID tokens.
    When unset, the /auth/google route returns 503."""
    return (os.getenv("GOOGLE_CLIENT_ID") or "").strip() or None


def facebook_app_id() -> str | None:
    """Facebook app ID. When unset, POST /auth/facebook returns 503."""
    return (os.getenv("FACEBOOK_APP_ID") or "").strip() or None


def facebook_app_secret() -> str | None:
    """Facebook app secret — server-only, used to verify access tokens."""
    return (os.getenv("FACEBOOK_APP_SECRET") or "").strip() or None


def access_token_ttl_minutes() -> int:
    return int(os.getenv("ACCESS_TOKEN_TTL_MINUTES", "30"))


def refresh_token_ttl_days() -> int:
    return int(os.getenv("REFRESH_TOKEN_TTL_DAYS", "30"))


def frontend_url() -> str:
    """Base URL of the web app — used to build email verification / reset links."""
    return (os.getenv("FRONTEND_URL", "https://dpatro.vercel.app") or "").rstrip("/")


# ─── Email (SMTP) ──────────────────────────────────────────────────────────────


def smtp_config() -> dict[str, object] | None:
    """SMTP settings for transactional email; None disables real sending (links logged)."""
    host = (os.getenv("SMTP_HOST") or "").strip()
    if not host:
        return None
    return {
        "host": host,
        "port": int(os.getenv("SMTP_PORT", "587")),
        "user": os.getenv("SMTP_USER", ""),
        "password": os.getenv("SMTP_PASSWORD", ""),
        "from_addr": os.getenv("SMTP_FROM", os.getenv("SMTP_USER", "noreply@vedicpatro.com")),
        "from_name": os.getenv("SMTP_FROM_NAME", "Vedic Patro"),
        "reply_to": os.getenv("SMTP_REPLY_TO", "").strip(),
        "use_tls": os.getenv("SMTP_USE_TLS", "true").lower() == "true",
    }
