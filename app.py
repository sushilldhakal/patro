"""Surya Panchanga computation API — structured time-state service."""

import asyncio
import logging
from contextlib import asynccontextmanager
from datetime import date
from typing import Literal

from fastapi import FastAPI, HTTPException, Query

from core.location import resolve_location
from service.holiday_generator import (
    HolidayCacheMissError,
    get_bs_holidays,
    holidays_on_date,
    precompute_bs_year,
)
from service.panchanga_api import (
    build_calendar_header,
    build_daily_state,
    build_festivals_for_date,
    build_kundali,
    build_month_calendar,
    resolve_panchanga_date,
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
    title="Surya Panchanga API",
    description="Panchanga computation engine — daily state, month calendar, festivals, kundali",
    version="2.0.0",
    lifespan=lifespan,
)


def _location(lat, lon, timezone):
    try:
        return resolve_location(lat=lat, lon=lon, timezone=timezone)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


def _validate_bs_year(year: int) -> None:
    if not 2000 <= year <= 2200:
        raise HTTPException(status_code=400, detail="year must be a BS year between 2000 and 2200")


def _validate_bs_month(month: int) -> None:
    if not 1 <= month <= 12:
        raise HTTPException(status_code=400, detail="month must be 1..12")


# --- Health ---


@app.get("/health")
def health():
    warmed = getattr(app.state, "precomputed_bs_years", None)
    return {"status": "ok", "precomputed_bs_years": warmed}


# --- Core Panchanga ---


@app.get("/panchanga/{bs_year}/{bs_month}")
def panchanga_month(
    bs_year: int,
    bs_month: int,
    lat: float | None = Query(None),
    lon: float | None = Query(None),
    timezone: str | None = Query(None),
    full: bool = Query(False, description="Include full daily state per day"),
):
    """BS month calendar — Patro grid as structured JSON."""
    _validate_bs_year(bs_year)
    _validate_bs_month(bs_month)
    location = _location(lat, lon, timezone)
    try:
        return build_month_calendar(bs_year, bs_month, location, full=full)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/panchanga/{date_key}")
def panchanga_day(
    date_key: str,
    lat: float | None = Query(None),
    lon: float | None = Query(None),
    timezone: str | None = Query(None),
    era: Literal["bs", "ad"] = Query("bs", description="Date era: bs (2083-10-12) or ad (2027-01-25)"),
    festivals: bool = Query(False, description="Include festivals on this day"),
    detail: bool = Query(True, description="Include full computation detail block"),
):
    """Daily panchanga — single-day astronomical time-state."""
    location = _location(lat, lon, timezone)
    try:
        greg = resolve_panchanga_date(date_key, era=era)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return build_daily_state(
        greg,
        location,
        include_festivals=festivals,
        include_detail=detail,
    )


# --- Festivals ---


@app.get("/festivals/{date_key}")
def festivals_day(
    date_key: str,
    lat: float | None = Query(None),
    lon: float | None = Query(None),
    timezone: str | None = Query(None),
    era: Literal["bs", "ad"] = Query("bs"),
):
    """Festivals active on a BS or AD date."""
    location = _location(lat, lon, timezone)
    try:
        return build_festivals_for_date(date_key, location, era=era)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/holidays/{year}")
def holidays(
    year: int,
    month: int | None = Query(None, ge=1, le=12, description="Bikram Sambat month (1–12)"),
    lat: float | None = Query(None),
    lon: float | None = Query(None),
    timezone: str | None = Query(None),
):
    """BS-year festival list (cache-backed)."""
    _validate_bs_year(year)
    location = _location(lat, lon, timezone)
    try:
        return get_bs_holidays(year, location, cache_only=True, bs_month=month)
    except HolidayCacheMissError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post("/generate/{year}")
def generate_year(
    year: int,
    lat: float | None = Query(None),
    lon: float | None = Query(None),
    timezone: str | None = Query(None),
):
    """Precompute holiday cache for a BS year."""
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


# --- Calendar header ---


@app.get("/calendar/header/{bs_year}/{bs_month}")
def calendar_header(
    bs_year: int,
    bs_month: int,
    lat: float | None = Query(None),
    lon: float | None = Query(None),
    timezone: str | None = Query(None),
):
    """Multi-era calendar header (BS, AD, lunar, Shaka, Nepal Sambat)."""
    _validate_bs_year(bs_year)
    _validate_bs_month(bs_month)
    location = _location(lat, lon, timezone)
    try:
        return build_calendar_header(bs_year, bs_month, location)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


# --- Kundali ---


@app.get("/kundali/{date_key}")
def kundali(
    date_key: str,
    lat: float | None = Query(None),
    lon: float | None = Query(None),
    timezone: str | None = Query(None),
    era: Literal["bs", "ad"] = Query("bs"),
):
    """Planetary positions at sunrise (udaya)."""
    location = _location(lat, lon, timezone)
    try:
        return build_kundali(date_key, location, era=era)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


# --- Legacy aliases (v1) ---


@app.get("/day/{target_date}")
def day_view_legacy(
    target_date: date,
    lat: float | None = Query(None),
    lon: float | None = Query(None),
    timezone: str | None = Query(None),
):
    location = _location(lat, lon, timezone)
    return holidays_on_date(target_date, location)


@app.get("/patro/{bs_year}/{bs_month}")
def patro_month_legacy(
    bs_year: int,
    bs_month: int,
    lat: float | None = Query(None),
    lon: float | None = Query(None),
    timezone: str | None = Query(None),
    panchanga: bool = Query(True),
):
    _validate_bs_year(bs_year)
    _validate_bs_month(bs_month)
    location = _location(lat, lon, timezone)
    try:
        return generate_bs_month_patro(bs_year, bs_month, location, include_panchanga=panchanga)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/patro/{bs_year}")
def patro_year_legacy(
    bs_year: int,
    lat: float | None = Query(None),
    lon: float | None = Query(None),
    timezone: str | None = Query(None),
    panchanga: bool = Query(True),
):
    _validate_bs_year(bs_year)
    location = _location(lat, lon, timezone)
    try:
        return generate_patro(bs_year, location, include_panchanga=panchanga)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="0.0.0.0", port=8080, reload=True)
