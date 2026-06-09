"""Surya Panchanga computation API — structured time-state service."""

import asyncio
import logging
from contextlib import asynccontextmanager
from datetime import date
from typing import Any, Literal

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from app import config
from core.location import resolve_location
from panchanga.bikram_sambat import (
    bs_month_name,
    bs_to_gregorian,
    format_bs_date,
    gregorian_to_bs,
    parse_bs_date,
)
from services.holiday_generator import (
    FestivalCacheMissError,
    HolidayCacheMissError,
    get_bs_holidays,
    holidays_on_date,
    precompute_bs_year,
)
from services.panchanga_api import (
    build_calendar_header,
    build_daily_state,
    build_festivals_for_date,
    build_kundali,
    build_month_calendar,
    resolve_panchanga_date,
)
from services.patro_generator import generate_bs_month_patro, generate_patro
from services.startup import warm_holiday_cache

logging.basicConfig(level=config.log_level())
logger = logging.getLogger(__name__)

DEFAULT_CORS_ORIGINS = (
    "https://sushilldhakal.github.io",
    "http://localhost:5173",
    "http://localhost:5175",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5175",
)


async def _warm_holiday_cache_background(app: FastAPI) -> None:
    """Precompute caches without blocking /health during deploy restarts."""
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
    warm_task = asyncio.create_task(_warm_holiday_cache_background(app))
    yield
    warm_task.cancel()
    try:
        await warm_task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title="Surya Panchanga API",
    description="Panchanga computation engine — daily state, month calendar, festivals, kundali",
    version="2.0.0",
    lifespan=lifespan,
)


def _cors_origins() -> list[str]:
    """Merge env-configured origins with defaults so local dev ports stay allowed."""
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
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
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


def _enrich_holiday_bs_dates(holidays: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Add bs_start_date and bs_end_date to each holiday entry."""
    result = []
    for h in holidays:
        start_ad = date.fromisoformat(h["start_date"])
        end_ad = date.fromisoformat(h["end_date"])
        result.append({
            **h,
            "bs_start_date": format_bs_date(*gregorian_to_bs(start_ad)),
            "bs_end_date": format_bs_date(*gregorian_to_bs(end_ad)),
        })
    return result


def _nepal_holidays_for_ad_year(
    ad_year: int,
    location,
    *,
    cache_only: bool = True,
) -> list[dict[str, Any]]:
    """Collect Nepal public holidays that overlap a Gregorian year from both overlapping BS years."""
    seen: dict[str, dict[str, Any]] = {}
    for bs_year in (ad_year + 56, ad_year + 57):
        try:
            payload = get_bs_holidays(bs_year, location, cache_only=cache_only)
            for h in payload["holidays"]:
                start = date.fromisoformat(h["start_date"])
                end = date.fromisoformat(h["end_date"])
                if start.year <= ad_year <= end.year or start.year == ad_year or end.year == ad_year:
                    seen[h["id"]] = h
        except HolidayCacheMissError:
            pass
    holidays = sorted(seen.values(), key=lambda h: h["start_date"])
    return _enrich_holiday_bs_dates(holidays)


@app.get("/health")
def health():
    warmed = getattr(app.state, "precomputed_bs_years", None)
    return {"status": "ok", "precomputed_bs_years": warmed}


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


@app.get("/festivals/bs/{bs_year}")
def festivals_bs_year(
    bs_year: int,
    month: int | None = Query(None, ge=1, le=12, description="Bikram Sambat month (1–12)"),
    lat: float | None = Query(None),
    lon: float | None = Query(None),
    timezone: str | None = Query(None),
):
    """All festivals/observances for a BS year (includes regional events)."""
    _validate_bs_year(bs_year)
    location = _location(lat, lon, timezone)
    try:
        from services.holiday_generator import FestivalCacheMissError, get_bs_festivals

        return get_bs_festivals(bs_year, location, cache_only=True, bs_month=month)
    except FestivalCacheMissError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


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
    """BS-year public holiday list (cache-backed; festivals are on /festivals)."""
    _validate_bs_year(year)
    location = _location(lat, lon, timezone)
    try:
        return get_bs_holidays(year, location, cache_only=True, bs_month=month)
    except HolidayCacheMissError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/convert/ad-to-bs/{ad_date}")
def convert_ad_to_bs(ad_date: date):
    """Convert an AD (Gregorian) date to Bikram Sambat with full metadata."""
    try:
        bs_year, bs_month, bs_day = gregorian_to_bs(ad_date)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {
        "ad_date": ad_date.isoformat(),
        "bs_year": bs_year,
        "bs_month": bs_month,
        "bs_day": bs_day,
        "bs_date": format_bs_date(bs_year, bs_month, bs_day),
        "bs_month_name": bs_month_name(bs_month),
        "bs_month_name_ne": bs_month_name(bs_month, nepali=True),
        "weekday": ad_date.strftime("%A"),
    }


@app.get("/convert/bs-to-ad/{bs_date}")
def convert_bs_to_ad(bs_date: str):
    """Convert a BS (Bikram Sambat) date to AD (Gregorian) with full metadata."""
    try:
        bs_year, bs_month, bs_day = parse_bs_date(bs_date)
        greg = bs_to_gregorian(bs_year, bs_month, bs_day)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {
        "bs_date": format_bs_date(bs_year, bs_month, bs_day),
        "bs_year": bs_year,
        "bs_month": bs_month,
        "bs_day": bs_day,
        "bs_month_name": bs_month_name(bs_month),
        "bs_month_name_ne": bs_month_name(bs_month, nepali=True),
        "ad_date": greg.isoformat(),
        "weekday": greg.strftime("%A"),
    }


@app.get("/nepal/holidays")
def nepal_holidays(
    year: int = Query(..., description="Year to query"),
    era: Literal["bs", "ad"] = Query("bs", description="Calendar era for the year param (bs or ad)"),
    month: int | None = Query(None, ge=1, le=12, description="Month filter (1–12 in the given era)"),
    lat: float | None = Query(None),
    lon: float | None = Query(None),
    timezone: str | None = Query(None),
):
    """
    Nepal public holidays with both BS and AD dates for every entry.

    Pass era=ad to query by Gregorian year (e.g. year=2025&era=ad).
    Pass era=bs to query by Bikram Sambat year (e.g. year=2082&era=bs, the default).
    Each holiday entry includes start_date / end_date (AD) plus bs_start_date / bs_end_date.
    """
    location = _location(lat, lon, timezone)

    if era == "ad":
        holidays = _nepal_holidays_for_ad_year(year, location)
        if month is not None:
            target_month_start = date(year, month, 1)
            import calendar as _cal
            last = _cal.monthrange(year, month)[1]
            target_month_end = date(year, month, last)
            holidays = [
                h for h in holidays
                if date.fromisoformat(h["start_date"]) <= target_month_end
                and date.fromisoformat(h["end_date"]) >= target_month_start
            ]
        return {
            "ad_year": year,
            "era": "ad",
            "count": len(holidays),
            "holidays": holidays,
        }

    # era == "bs"
    _validate_bs_year(year)
    try:
        from services.holiday_generator import filter_holidays_by_bs_month
        payload = get_bs_holidays(year, location, cache_only=True)
    except HolidayCacheMissError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    holidays_list = payload["holidays"]
    if month is not None:
        from services.holiday_generator import filter_holidays_by_bs_month
        holidays_list = filter_holidays_by_bs_month(holidays_list, year, month)

    return {
        "bs_year": year,
        "era": "bs",
        "gregorian_range": payload["gregorian_range"],
        "count": len(holidays_list),
        "holidays": _enrich_holiday_bs_dates(holidays_list),
    }


@app.get("/nepal/festivals")
def nepal_festivals(
    year: int = Query(..., description="Year to query"),
    era: Literal["bs", "ad"] = Query("bs", description="Calendar era for the year param"),
    month: int | None = Query(None, ge=1, le=12, description="Month filter"),
    lat: float | None = Query(None),
    lon: float | None = Query(None),
    timezone: str | None = Query(None),
):
    """
    All Nepal festivals (including regional) with both BS and AD dates.

    Supports era=ad or era=bs for the year parameter.
    """
    location = _location(lat, lon, timezone)

    if era == "ad":
        # Collect festivals from the two overlapping BS years
        from services.holiday_generator import get_bs_festivals
        seen: dict[str, Any] = {}
        for bs_year in (year + 56, year + 57):
            try:
                payload = get_bs_festivals(bs_year, location, cache_only=True)
                for f in payload["festivals"]:
                    start = date.fromisoformat(f["start_date"])
                    end = date.fromisoformat(f["end_date"])
                    if start.year <= year <= end.year or start.year == year or end.year == year:
                        seen[f["id"]] = f
            except FestivalCacheMissError:
                pass

        festivals = sorted(seen.values(), key=lambda f: f["start_date"])
        if month is not None:
            import calendar as _cal
            last = _cal.monthrange(year, month)[1]
            m_start = date(year, month, 1)
            m_end = date(year, month, last)
            festivals = [
                f for f in festivals
                if date.fromisoformat(f["start_date"]) <= m_end
                and date.fromisoformat(f["end_date"]) >= m_start
            ]
        enriched = _enrich_holiday_bs_dates(festivals)
        return {"ad_year": year, "era": "ad", "count": len(enriched), "festivals": enriched}

    # era == "bs"
    _validate_bs_year(year)
    from services.holiday_generator import get_bs_festivals
    try:
        payload = get_bs_festivals(year, location, cache_only=True, bs_month=month)
    except FestivalCacheMissError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    enriched = _enrich_holiday_bs_dates(payload["festivals"])
    result = {**payload, "era": "bs", "count": len(enriched), "festivals": enriched}
    return result


@app.get("/nepal/panchanga/{date_key}")
def nepal_panchanga_day(
    date_key: str,
    lat: float | None = Query(None),
    lon: float | None = Query(None),
    timezone: str | None = Query(None),
    era: Literal["bs", "ad"] = Query("bs", description="Date era: bs (2083-10-12) or ad (2027-01-25)"),
):
    """
    Combined daily panchanga + festivals + public holiday status.

    Returns tithi, nakshatra, yoga, karana, sunrise/sunset, and all
    festivals/observances active on the day — in a single call.
    Accepts both BS (era=bs, default) and AD (era=ad) date formats.
    """
    location = _location(lat, lon, timezone)
    try:
        greg = resolve_panchanga_date(date_key, era=era)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    state = build_daily_state(greg, location, include_festivals=True, include_detail=False)

    # Add public holiday flag for each festival
    from services.holiday_generator import is_public_holiday
    festivals = state.get("festivals", [])
    for f in festivals:
        f["is_public_holiday"] = is_public_holiday(f["id"])

    state["is_public_holiday"] = any(f.get("is_public_holiday") for f in festivals)
    state.pop("detail", None)
    return state


@app.get("/nepal/patro/{bs_year}/{bs_month}")
def nepal_patro_bs(
    bs_year: int,
    bs_month: int,
    lat: float | None = Query(None),
    lon: float | None = Query(None),
    timezone: str | None = Query(None),
):
    """
    Festival panchanga (patro) for a BS month — every day's tithi, nakshatra,
    weekday, sunrise/sunset, and festivals in one response.
    """
    _validate_bs_year(bs_year)
    _validate_bs_month(bs_month)
    location = _location(lat, lon, timezone)
    try:
        return generate_bs_month_patro(bs_year, bs_month, location, include_panchanga=True)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/nepal/patro/ad/{ad_year}/{ad_month}")
def nepal_patro_ad(
    ad_year: int,
    ad_month: int,
    lat: float | None = Query(None),
    lon: float | None = Query(None),
    timezone: str | None = Query(None),
):
    """
    Festival panchanga (patro) for an AD (Gregorian) month.
    Internally maps to the overlapping BS month(s) and returns the same rich
    patro grid — tithi, nakshatra, festivals — for the Gregorian month range.
    """
    if not 1 <= ad_month <= 12:
        raise HTTPException(status_code=400, detail="ad_month must be 1..12")
    location = _location(lat, lon, timezone)
    import calendar as _cal
    from panchanga.bikram_sambat import iter_bs_month_days
    from panchanga.daily import build_daily_panchanga
    from services.patro_generator import _collect_bs_year_festivals, _festivals_for_day

    last_day = _cal.monthrange(ad_year, ad_month)[1]
    month_start_ad = date(ad_year, ad_month, 1)
    month_end_ad = date(ad_year, ad_month, last_day)

    # Determine which BS year(s) overlap this AD month
    bs_years = sorted({gregorian_to_bs(month_start_ad)[0], gregorian_to_bs(month_end_ad)[0]})

    all_festivals: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    for bs_year in bs_years:
        for f in _collect_bs_year_festivals(bs_year, location):
            if f["id"] not in seen_ids:
                seen_ids.add(f["id"])
                all_festivals.append(f)

    from datetime import timedelta
    from services.holiday_generator import is_public_holiday

    days: list[dict[str, Any]] = []
    current = month_start_ad
    while current <= month_end_ad:
        bs_year_d, bs_month_d, bs_day_d = gregorian_to_bs(current)
        panchanga = build_daily_panchanga(current, location)
        day_festivals = _festivals_for_day(all_festivals, current)
        days.append({
            "date_ad": current.isoformat(),
            "bs_date": format_bs_date(bs_year_d, bs_month_d, bs_day_d),
            "bs_month_name": bs_month_name(bs_month_d),
            "weekday": panchanga["vaara"]["name_english"],
            "weekday_ne": panchanga["vaara"]["name_ne"],
            "tithi": panchanga["tithi"]["name"],
            "tithi_ne": panchanga["tithi"]["name_ne"],
            "nakshatra": panchanga["nakshatra"]["name"],
            "paksha": panchanga["paksha"]["label_en"],
            "sunrise": panchanga["sunrise"]["local_time_short"],
            "sunset": panchanga["sunset"]["local_time_short"],
            "festivals": [
                {
                    "id": f["id"],
                    "name": f.get("name_en") or f.get("name"),
                    "name_ne": f.get("name_ne"),
                    "is_public_holiday": is_public_holiday(f["id"]),
                }
                for f in day_festivals
            ],
        })
        current += timedelta(days=1)

    return {
        "ad_year": ad_year,
        "ad_month": ad_month,
        "ad_month_name": month_start_ad.strftime("%B"),
        "ad_range": {"start": month_start_ad.isoformat(), "end": month_end_ad.isoformat()},
        "location": location.as_dict(),
        "days": days,
    }


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
