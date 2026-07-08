"""Surya Panchanga — FastAPI application factory."""

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

import config
from services.startup import warm_holiday_cache

logging.basicConfig(level=config.log_level())
logger = logging.getLogger(__name__)

DEFAULT_CORS_ORIGINS = (
    "https://dpatro.vercel.app",
    "https://sushilldhakal.github.io",
    "http://localhost:5173",
    "http://localhost:5175",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5175",
)
VERCEL_PREVIEW_ORIGIN_REGEX = r"https://.*\.vercel\.app"


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
    if config.database_url():
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
        except Exception:
            logger.exception("Failed to initialise auth database")
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


app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_origin_regex=VERCEL_PREVIEW_ORIGIN_REGEX,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# JSON here compresses ~10×+ (full month: 1.17 MB → ~100 KB over the wire).
# Skips responses that already set Content-Encoding (pre-gzipped year cache).
app.add_middleware(GZipMiddleware, minimum_size=1024)

# ── routers ───────────────────────────────────────────────────────────────────

from api import cities, kundali, meta, panchanga, patro  # noqa: E402

app.include_router(meta.router)
app.include_router(cities.router)
app.include_router(kundali.router)
app.include_router(panchanga.router)
app.include_router(patro.router)

if config.database_url():
    from app.routers import auth as auth_router
    from app.routers import profiles as profiles_router
    app.include_router(auth_router.router)
    app.include_router(profiles_router.router)
else:
    logger.warning("DATABASE_URL not set — auth/profile routes are disabled")
