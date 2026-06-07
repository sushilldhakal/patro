"""Nepali Holiday & Panchanga Patro API — stable contract v1."""

import asyncio
import logging
from contextlib import asynccontextmanager
from datetime import date

from fastapi import FastAPI, HTTPException, Query

from core.location import resolve_location
from panchanga.daily import build_daily_panchanga
from service.holiday_generator import (
    HolidayCacheMissError,
    get_bs_holidays,
    holidays_on_date,
    precompute_bs_year,
)
from service.patro_generator import generate_bs_month_patro, generate_patro
from service.startup import warm_holiday_cache

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    loop = asyncio.get_running_loop()
    try:
        warmed = await loop.run_in_executor(None, warm_holiday_cache)
        app.state.precomputed_bs_years = warmed
    except Exception:
        logger.exception("Startup holiday precompute failed")
        app.state.precomputed_bs_years = []
    yield


app = FastAPI(
    title="Nepali Panchanga Patro API",
    description="Festival dates + daily panchanga + BS Patro generation",
    version="1.1.0",
    lifespan=lifespan,
)


def _location(lat, lon, timezone):
    try:
        return resolve_location(lat=lat, lon=lon, timezone=timezone)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/health")
def health():
    warmed = getattr(app.state, "precomputed_bs_years", None)
    return {
        "status": "ok",
        "precomputed_bs_years": warmed,
    }


# --- Holidays (BS year, cache-backed) ---


def _validate_bs_year(year: int) -> None:
    if not 2000 <= year <= 2200:
        raise HTTPException(status_code=400, detail="year must be a BS year between 2000 and 2200")


@app.post("/generate/{year}")
def generate_year(
    year: int,
    lat: float | None = Query(None),
    lon: float | None = Query(None),
    timezone: str | None = Query(None),
):
    """Precompute holiday cache for a BS year (runs Swiss Ephemeris once)."""
    _validate_bs_year(year)
    location = _location(lat, lon, timezone)
    payload = precompute_bs_year(year, location)
    return {
        "status": "generated",
        "bs_year": payload["bs_year"],
        "gregorian_range": payload["gregorian_range"],
        "count": payload["count"],
        "cache_key": location.cache_key(),
        "generated_at": payload["generated_at"],
    }


@app.get("/holidays/{year}")
def holidays(
    year: int,
    month: int | None = Query(None, ge=1, le=12, description="Bikram Sambat month (1–12)"),
    lat: float | None = Query(None),
    lon: float | None = Query(None),
    timezone: str | None = Query(None),
):
    """Return precomputed BS-year holidays (instant; no runtime ephemeris)."""
    _validate_bs_year(year)
    location = _location(lat, lon, timezone)
    try:
        return get_bs_holidays(year, location, cache_only=True, bs_month=month)
    except HolidayCacheMissError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        ) from exc


@app.get("/day/{target_date}")
def day_view(
    target_date: date,
    lat: float | None = Query(None),
    lon: float | None = Query(None),
    timezone: str | None = Query(None),
):
    location = _location(lat, lon, timezone)
    return holidays_on_date(target_date, location)


# --- Panchanga Patro (new) ---


@app.get("/panchanga/{target_date}")
def panchanga_day(
    target_date: date,
    lat: float | None = Query(None),
    lon: float | None = Query(None),
    timezone: str | None = Query(None),
    festivals: bool = Query(True, description="Include active festivals on this day"),
):
    """Full daily panchanga: tithi, nakshatra, yoga, karana, vaara, rashi, ritu, ayanamsa, sun/moon times, planets."""
    location = _location(lat, lon, timezone)
    return build_daily_panchanga(target_date, location, include_festivals=festivals)


@app.get("/patro/{bs_year}/{bs_month}")
def patro_month(
    bs_year: int,
    bs_month: int,
    lat: float | None = Query(None),
    lon: float | None = Query(None),
    timezone: str | None = Query(None),
    panchanga: bool = Query(True, description="Include daily panchanga per cell"),
):
    """BS month grid with panchanga + festivals per day."""
    if not 2000 <= bs_year <= 2200:
        raise HTTPException(status_code=400, detail="bs_year out of supported range")
    if not 1 <= bs_month <= 12:
        raise HTTPException(status_code=400, detail="bs_month must be 1..12")

    location = _location(lat, lon, timezone)
    try:
        return generate_bs_month_patro(bs_year, bs_month, location, include_panchanga=panchanga)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/patro/{bs_year}")
def patro_year(
    bs_year: int,
    lat: float | None = Query(None),
    lon: float | None = Query(None),
    timezone: str | None = Query(None),
    panchanga: bool = Query(True),
):
    """Full BS year Patro: 12 months + festival index."""
    if not 2000 <= bs_year <= 2200:
        raise HTTPException(status_code=400, detail="bs_year out of supported range")

    location = _location(lat, lon, timezone)
    try:
        return generate_patro(bs_year, location, include_panchanga=panchanga)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="0.0.0.0", port=8080, reload=True)


