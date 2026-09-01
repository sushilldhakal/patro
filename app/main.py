"""Surya Panchanga — FastAPI application factory."""

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.era_middleware import EraMiddleware
from engine.astronomy.engine import EphemerisError
from fastapi.middleware.gzip import GZipMiddleware

import config
from services.startup import warm_holiday_cache

logging.basicConfig(level=config.log_level())
logger = logging.getLogger(__name__)

DEFAULT_CORS_ORIGINS = (
    "https://vedicpatro.com",
    "https://www.vedicpatro.com",
    "https://sushilldhakal.github.io",
    "http://localhost:5173",
    "http://localhost:5175",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5175",
)


async def _warm_holiday_cache_background(app: FastAPI) -> None:
    loop = asyncio.get_running_loop()
    try:
        warmed = await loop.run_in_executor(None, warm_holiday_cache)
        app.state.precomputed_bs_years = warmed
    except Exception:
        logger.exception("Startup holiday precompute failed")
        app.state.precomputed_bs_years = []


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.precomputed_bs_years = []
    from services.startup import ensure_swiss_ephemeris_files

    loop = asyncio.get_running_loop()
    try:
        await loop.run_in_executor(None, ensure_swiss_ephemeris_files)
    except Exception:
        logger.exception("Ephemeris provisioning failed")

    from engine.astronomy.engine import ephemeris_path, _configure_ephemeris

    configured = _configure_ephemeris()
    if configured:
        logger.info("Swiss Ephemeris (.se1) active from %s", ephemeris_path())
    else:
        logger.warning(
            "Swiss Ephemeris files not found — running on the built-in Moshier model. "
            "Run `python scripts/install_ephemeris.py` to install them."
        )
    if config.auth_database_enabled():
        from database.db import init_db
        try:
            init_db()
            logger.info("Auth database ready")
            if config.google_client_id():
                logger.info("Google sign-in enabled")
            else:
                logger.warning("GOOGLE_CLIENT_ID is not set — POST /auth/google will return 503")
            if config.facebook_app_id() and config.facebook_app_secret():
                logger.info("Facebook sign-in enabled")
            else:
                logger.warning(
                    "FACEBOOK_APP_ID / FACEBOOK_APP_SECRET not set — POST /auth/facebook will return 503"
                )
            logger.info("Apple sign-in audiences: %s", ", ".join(config.apple_client_ids()) or "(none)")
        except Exception:
            logger.exception("Failed to initialise auth database")
    elif config.database_url() and config.local_dev_mode():
        logger.info(
            "PATRO_LOCAL_DEV — skipping auth database (panchanga-only); "
            "set AUTH_DATABASE_ENABLED=true when local Postgres is up"
        )
    elif config.database_url():
        logger.warning("DATABASE_URL is set but auth database is disabled")
    warm_task = asyncio.create_task(_warm_holiday_cache_background(app))
    yield
    warm_task.cancel()
    try:
        await warm_task
    except asyncio.CancelledError:
        pass


_prefix = config.api_public_prefix()

app = FastAPI(
    title="Surya Panchanga API",
    version="2.2.0",
    lifespan=lifespan,
    contact={"name": "Surya Panchanga", "url": "https://github.com/sushilldhakal/patro"},
    license_info={"name": "MIT"},
    # root_path is prepended to openapi_url in Swagger UI (/api + /openapi.json).
    root_path=_prefix,
    openapi_url="/openapi.json",
)


def _cors_origins() -> list[str]:
    configured = config.cors_origins() or []
    merged: list[str] = []
    seen: set[str] = set()
    for origin in (*DEFAULT_CORS_ORIGINS, *configured):
        if origin not in seen:
            seen.add(origin)
            merged.append(origin)
    return merged


# Middleware order matters, and Starlette applies it outermost-last: whatever is
# added last wraps everything added before it. The stack below is, outside in:
#
#   CORS  ->  EraMiddleware  ->  GZip  ->  routes
#
# JSON here compresses ~10×+ (full month: 1.17 MB → ~100 KB over the wire).
# Skips responses that already set Content-Encoding (pre-gzipped year cache).
app.add_middleware(GZipMiddleware, minimum_size=1024)

# Era ⇄ Julian Day gate — the only place a calendar label becomes a Julian Day,
# or the reverse. It sits outside GZip and so may receive an already-compressed
# body (the year cache serves pre-gzipped bytes); it decompresses, rewrites the
# JSON, and recompresses.
app.add_middleware(EraMiddleware)

# CORS must be the OUTERMOST layer. EraMiddleware short-circuits invalid dates
# with its own 400 without calling the rest of the stack, so anything inside it
# never runs for those responses. With CORS inside, every date-validation error
# reached the browser stripped of `Access-Control-Allow-Origin` — unreadable, so
# the app saw an opaque network failure instead of "bbs year must be 1..12942".
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


@app.exception_handler(EphemerisError)
async def _ephemeris_out_of_range(request, exc: EphemerisError):
    """A date with no ephemeris behind it is a bad request, not a server fault.

    The patro year axis is deliberately wider than the Swiss ephemeris files
    (which are per-machine and gitignored), and a year can also pass date
    conversion and only run out of ephemeris once the panchanga is computed.
    Without this the caller got a 500 with an empty body.
    """
    logger.info("ephemeris out of range for %s: %s", request.url.path, exc)
    return JSONResponse(
        status_code=400,
        content={
            "detail": (
                "That date is outside the installed ephemeris range, so no "
                "panchanga can be computed for it."
            )
        },
    )

# User-specific routes must never be cached by a shared/CDN cache (Cloudflare),
# even if a broad cache rule is applied to /api/*. Public panchanga endpoints opt
# in explicitly via their own Cache-Control; everything under these prefixes is
# forced private so tokens and per-user data can't leak from the edge.
_PRIVATE_CACHE_MARKERS = ("/auth", "/profiles")


@app.middleware("http")
async def _guard_private_cache(request, call_next):
    response = await call_next(request)
    path = request.url.path
    if any(marker in path for marker in _PRIVATE_CACHE_MARKERS):
        response.headers["Cache-Control"] = "private, no-store"
        response.headers["CDN-Cache-Control"] = "private, no-store"
    return response

# ── routers ───────────────────────────────────────────────────────────────────

from api import cities, elements, kundali, meta, og, panchanga, patro, vastu  # noqa: E402

# Public data routes are versioned (…/api/v1/…) so an engine bump can rev the
# version and the CDN treats it as a fresh object — no purge. /health and /about
# stay unversioned so uptime/load-balancer probes keep hitting /api/health.
_version_prefix = f"/{config.api_version()}"

app.include_router(meta.router)
# Unversioned: nginx maps /og-image → this route so shared /panchanga links get
# a per-date PNG preview (og:image). Kept off the version prefix so the public
# URL stays a clean /og-image.
app.include_router(og.router)
app.include_router(cities.router, prefix=_version_prefix)
app.include_router(kundali.router, prefix=_version_prefix)
# Element routes are registered before panchanga so the static /panchanga/element(s)
# paths resolve ahead of the catch-all /panchanga/{date_key}.
app.include_router(elements.router, prefix=_version_prefix)
app.include_router(panchanga.router, prefix=_version_prefix)
app.include_router(patro.router, prefix=_version_prefix)
app.include_router(vastu.router, prefix=_version_prefix)

if config.auth_database_enabled():
    from app.routers import auth as auth_router
    from app.routers import profiles as profiles_router
    app.include_router(auth_router.router)
    app.include_router(profiles_router.router)
elif config.local_dev_mode():
    logger.info("PATRO_LOCAL_DEV — auth/profile routes not mounted")
else:
    logger.warning("DATABASE_URL not set — auth/profile routes are disabled")
