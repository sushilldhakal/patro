"""Application configuration — loads .env from project root on import."""

from __future__ import annotations

import os

from dotenv import load_dotenv

from engine.astronomy.paths import PROJECT_ROOT

load_dotenv(PROJECT_ROOT / ".env")
# Optional overrides for local dev (e.g. PATRO_LOCAL_DEV=true) — not committed.
load_dotenv(PROJECT_ROOT / ".env.local", override=True)


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


def postgres_cache_enabled() -> bool:
    """Use Postgres for shared gzip blob caches (year/month/sait).

    Off when ``DATABASE_URL`` is unset, ``PATRO_LOCAL_DEV=true``, or
    ``BLOB_CACHE_USE_DB=false``. Local dev then uses ``cache/`` on disk and
    computes on miss — no connection to the production blob store.
    """
    if os.getenv("BLOB_CACHE_USE_DB", "").lower() in {"0", "false", "no"}:
        return False
    if os.getenv("PATRO_LOCAL_DEV", "").lower() in {"1", "true", "yes"}:
        return False
    return database_url() is not None


def panchanga_sqlite_cache_enabled() -> bool:
    """Daily panchanga SQLite cache-aside (``data/panchanga_cache.db``).

    Set ``PANCHANGA_CACHE=false`` or ``PATRO_LOCAL_DEV=true`` to always compute
    fresh daily rows locally (useful when the server DB is not copied).
    """
    if os.getenv("PANCHANGA_CACHE", "").lower() in {"0", "false", "no"}:
        return False
    if os.getenv("PATRO_LOCAL_DEV", "").lower() in {"1", "true", "yes"}:
        return False
    return True


def auth_database_enabled() -> bool:
    """Whether to connect at startup and mount ``/auth`` + ``/profiles``.

    ``PATRO_LOCAL_DEV=true`` skips Postgres even when ``DATABASE_URL`` is set in
    ``.env`` (typical panchanga-only laptop dev). Set ``AUTH_DATABASE_ENABLED=true``
    to force auth on locally when Postgres is running.
    """
    explicit = (os.getenv("AUTH_DATABASE_ENABLED") or "").strip().lower()
    if explicit in {"0", "false", "no"}:
        return False
    if explicit in {"1", "true", "yes"}:
        return database_url() is not None
    if os.getenv("PATRO_LOCAL_DEV", "").lower() in {"1", "true", "yes"}:
        return False
    return database_url() is not None


def local_dev_mode() -> bool:
    return os.getenv("PATRO_LOCAL_DEV", "").lower() in {"1", "true", "yes"}


def jwt_secret() -> str:
    """Secret used to sign access/refresh tokens. MUST be set in production."""
    return os.getenv("JWT_SECRET", "dev-insecure-change-me")


def google_client_id() -> str | None:
    """Google OAuth Web client ID. Used as the audience when verifying ID tokens.
    When unset, the /auth/google route returns 503."""
    return (os.getenv("GOOGLE_CLIENT_ID") or "").strip() or None


def google_client_ids() -> list[str]:
    """All Google OAuth client IDs that may appear as the ID-token audience.

    Native iOS/Android tokens often use their own client ID as ``aud``; the web
    GIS button uses ``GOOGLE_CLIENT_ID``. Accept every configured ID so mobile
    and web share one verify path.
    """
    ids: list[str] = []
    for key in ("GOOGLE_CLIENT_ID", "GOOGLE_IOS_CLIENT_ID", "GOOGLE_ANDROID_CLIENT_ID"):
        value = (os.getenv(key) or "").strip()
        if value:
            ids.append(value)
    extra = (os.getenv("GOOGLE_CLIENT_IDS") or "").strip()
    if extra:
        ids.extend(part.strip() for part in extra.split(",") if part.strip())
    seen: set[str] = set()
    unique: list[str] = []
    for item in ids:
        if item not in seen:
            seen.add(item)
            unique.append(item)
    return unique


def apple_client_ids() -> list[str]:
    """Audiences accepted for Sign in with Apple identity tokens.

    Defaults to the iOS bundle ID. Add a Services ID (web) via APPLE_CLIENT_IDS
    or APPLE_SERVICES_ID. When empty, POST /auth/apple returns 503.
    """
    ids: list[str] = []
    bundle = (os.getenv("APPLE_BUNDLE_ID") or "com.vedicpatro.mobile").strip()
    if bundle:
        ids.append(bundle)
    services = (os.getenv("APPLE_SERVICES_ID") or "").strip()
    if services:
        ids.append(services)
    extra = (os.getenv("APPLE_CLIENT_IDS") or "").strip()
    if extra:
        ids.extend(part.strip() for part in extra.split(",") if part.strip())
    seen: set[str] = set()
    unique: list[str] = []
    for item in ids:
        if item not in seen:
            seen.add(item)
            unique.append(item)
    return unique


def facebook_app_id() -> str | None:
    """Facebook app ID. When unset, POST /auth/facebook returns 503."""
    return (os.getenv("FACEBOOK_APP_ID") or "").strip() or None


def facebook_app_secret() -> str | None:
    """Facebook app secret — server-only, used to verify access tokens."""
    return (os.getenv("FACEBOOK_APP_SECRET") or "").strip() or None


# ─── Facebook Page daily post ───────────────────────────────────────────────────

def fb_page_id() -> str | None:
    """Target Facebook Page numeric id for the daily panchanga post. Unset ⇒ the
    poster stays dormant."""
    return (os.getenv("FB_PAGE_ID") or "").strip() or None


def fb_page_access_token() -> str | None:
    """Long-lived Page access token with pages_manage_posts. Unset ⇒ dormant."""
    return (os.getenv("FB_PAGE_ACCESS_TOKEN") or "").strip() or None


def fb_graph_api_version() -> str:
    """Graph API version segment (FB_GRAPH_API_VERSION), e.g. v21.0."""
    return (os.getenv("FB_GRAPH_API_VERSION") or "v21.0").strip()


def access_token_ttl_minutes() -> int:
    return int(os.getenv("ACCESS_TOKEN_TTL_MINUTES", "30"))


def refresh_token_ttl_days() -> int:
    return int(os.getenv("REFRESH_TOKEN_TTL_DAYS", "30"))


def frontend_url() -> str:
    """Base URL of the web app — used to build email verification / reset links."""
    return (os.getenv("FRONTEND_URL", "https://vedicpatro.com") or "").rstrip("/")


# ─── Open Graph share image ─────────────────────────────────────────────────────

def og_screenshot_enabled() -> bool:
    """Render the /og-image preview by screenshotting the real दिन-चक्र chart with
    a headless browser. Set OG_SCREENSHOT=false to fall back to the Pillow card
    (e.g. if the VM can't run Chromium)."""
    return os.getenv("OG_SCREENSHOT", "true").lower() not in {"0", "false", "no"}


def og_preview_base_url() -> str:
    """Base URL the screenshotter loads the /panchanga/og-preview page from.
    Defaults to the front-end URL; override with OG_PREVIEW_BASE_URL (e.g.
    http://127.0.0.1 to render from the same box without a public round-trip)."""
    return (os.getenv("OG_PREVIEW_BASE_URL") or frontend_url()).rstrip("/")


def og_chromium_path() -> str | None:
    """Explicit Chromium executable for Playwright (OG_CHROMIUM_PATH). None → use
    Playwright's bundled browser (installed via `playwright install chromium`)."""
    return os.getenv("OG_CHROMIUM_PATH") or None


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
