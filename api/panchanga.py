import calendar as _cal
from datetime import date
from typing import Any, Literal

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response

from api.deps import (
    LocationDep,
    _enrich_holiday_bs_dates,
    _nepal_holidays_for_ad_year,
    _validate_bs_month,
    _validate_bs_year,
)
from engine.vedic.bikram_sambat import (
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
)
from services.panchanga_api import (
    build_calendar_header,
    build_daily_state,
    build_festivals_for_date,
    build_month_calendar,
    build_month_calendar_at_clock,
    build_patro_month,
    build_year_calendar,
    resolve_panchanga_date,
)
from services.presentation import render_panchanga, render_panchanga_month

router = APIRouter()


@router.get("/panchanga/year/{bs_year}")
def panchanga_year(
    bs_year: int,
    location: LocationDep,
    full: bool = Query(False, description="Include full daily state per day"),
):
    """Full BS year calendar — all months in one response."""
    _validate_bs_year(bs_year)
    try:
        return build_year_calendar(bs_year, location, full=full)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/panchanga/{bs_year}/{bs_month}")
def panchanga_month(
    bs_year: int,
    bs_month: int,
    location: LocationDep,
    full: bool = Query(False, description="Include full daily state per day"),
    clock: str | None = Query(None, description="HH:MM civil clock — ephemeris mode for each day in the month"),
):
    """BS month calendar — Patro grid as structured JSON."""
    _validate_bs_year(bs_year)
    _validate_bs_month(bs_month)
    try:
        if clock:
            return build_month_calendar_at_clock(bs_year, bs_month, location, clock, full=full)
        return build_month_calendar(bs_year, bs_month, location, full=full)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/panchanga/{date_key}")
def panchanga_day(
    date_key: str,
    location: LocationDep,
    era: Literal["bs", "ad"] = Query("bs", description="Date era: bs (2083-10-12) or ad (2027-01-25)"),
    festivals: bool = Query(False, description="Include festivals on this day"),
    detail: bool = Query(True, description="Include full computation detail block"),
):
    """Daily panchanga — single-day astronomical time-state."""
    try:
        greg = resolve_panchanga_date(date_key, era=era)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return build_daily_state(greg, location, include_festivals=festivals, include_detail=detail)


@router.get("/festivals/bs/{bs_year}")
def festivals_bs_year(
    bs_year: int,
    location: LocationDep,
    month: int | None = Query(None, ge=1, le=12, description="Bikram Sambat month (1–12)"),
):
    """All festivals/observances for a BS year (includes regional events)."""
    _validate_bs_year(bs_year)
    try:
        from services.holiday_generator import get_bs_festivals
        return get_bs_festivals(bs_year, location, cache_only=True, bs_month=month)
    except FestivalCacheMissError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/festivals/{date_key}")
def festivals_day(
    date_key: str,
    location: LocationDep,
    era: Literal["bs", "ad"] = Query("bs"),
):
    """Festivals active on a BS or AD date."""
    try:
        return build_festivals_for_date(date_key, location, era=era)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/holidays/{year}")
def holidays(
    year: int,
    location: LocationDep,
    month: int | None = Query(None, ge=1, le=12, description="Bikram Sambat month (1–12)"),
):
    """BS-year public holiday list (cache-backed; festivals are on /festivals)."""
    _validate_bs_year(year)
    try:
        return get_bs_holidays(year, location, cache_only=True, bs_month=month)
    except HolidayCacheMissError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/convert/ad-to-bs/{ad_date}")
def convert_ad_to_bs(ad_date: date):
    """Convert an AD (Gregorian) date to Bikram Sambat with full metadata."""
    try:
        bs_year, bs_month, bs_day = gregorian_to_bs(ad_date)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {
        "ad_date": ad_date.isoformat(),
        "bs_year": bs_year, "bs_month": bs_month, "bs_day": bs_day,
        "bs_date": format_bs_date(bs_year, bs_month, bs_day),
        "bs_month_name": bs_month_name(bs_month),
        "bs_month_name_ne": bs_month_name(bs_month, nepali=True),
        "weekday": ad_date.strftime("%A"),
    }


@router.get("/convert/bs-to-ad/{bs_date}")
def convert_bs_to_ad(bs_date: str):
    """Convert a BS (Bikram Sambat) date to AD (Gregorian) with full metadata."""
    try:
        bs_year, bs_month, bs_day = parse_bs_date(bs_date)
        greg = bs_to_gregorian(bs_year, bs_month, bs_day)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {
        "bs_date": format_bs_date(bs_year, bs_month, bs_day),
        "bs_year": bs_year, "bs_month": bs_month, "bs_day": bs_day,
        "bs_month_name": bs_month_name(bs_month),
        "bs_month_name_ne": bs_month_name(bs_month, nepali=True),
        "ad_date": greg.isoformat(),
        "weekday": greg.strftime("%A"),
    }


@router.get("/nepal/holidays")
def nepal_holidays(
    location: LocationDep,
    year: int = Query(..., description="Year to query"),
    era: Literal["bs", "ad"] = Query("bs", description="Calendar era for the year param (bs or ad)"),
    month: int | None = Query(None, ge=1, le=12, description="Month filter (1–12 in the given era)"),
):
    """Nepal public holidays with both BS and AD dates for every entry."""
    if era == "ad":
        holidays_list = _nepal_holidays_for_ad_year(year, location)
        if month is not None:
            target_month_start = date(year, month, 1)
            last = _cal.monthrange(year, month)[1]
            target_month_end = date(year, month, last)
            holidays_list = [
                h for h in holidays_list
                if date.fromisoformat(h["start_date"]) <= target_month_end
                and date.fromisoformat(h["end_date"]) >= target_month_start
            ]
        return {"ad_year": year, "era": "ad", "count": len(holidays_list), "holidays": holidays_list}

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
        "bs_year": year, "era": "bs",
        "gregorian_range": payload["gregorian_range"],
        "count": len(holidays_list),
        "holidays": _enrich_holiday_bs_dates(holidays_list),
    }


@router.get("/nepal/sait/categories", tags=["sait"])
def nepal_sait_categories():
    """Ceremony types available for sait listings (विवाह, ब्रतबन्ध, …)."""
    from services.sait_api import list_sait_categories
    return {"categories": list_sait_categories()}


@router.get("/nepal/sait/years", tags=["sait"])
def nepal_sait_years():
    """BS years available for sait (1700–2200, computed from Swiss Ephemeris)."""
    from services.sait_api import list_sait_years
    return {"years": list_sait_years()}


@router.get("/nepal/sait/{bs_year}/{category}", tags=["sait"])
def nepal_sait_for_category(bs_year: int, category: str, location: LocationDep):
    """Auspicious BS month/day listings for one ceremony type and year."""
    _validate_bs_year(bs_year)
    from services.sait_api import get_sait_month_entries
    try:
        return get_sait_month_entries(bs_year, category, location)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/nepal/festivals")
def nepal_festivals(
    location: LocationDep,
    year: int = Query(..., description="Year to query"),
    era: Literal["bs", "ad"] = Query("bs", description="Calendar era for the year param"),
    month: int | None = Query(None, ge=1, le=12, description="Month filter"),
):
    """All Nepal festivals (including regional) with both BS and AD dates."""
    if era == "ad":
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
            last = _cal.monthrange(year, month)[1]
            m_start, m_end = date(year, month, 1), date(year, month, last)
            festivals = [f for f in festivals
                         if date.fromisoformat(f["start_date"]) <= m_end
                         and date.fromisoformat(f["end_date"]) >= m_start]
        enriched = _enrich_holiday_bs_dates(festivals)
        return {"ad_year": year, "era": "ad", "count": len(enriched), "festivals": enriched}

    _validate_bs_year(year)
    from services.holiday_generator import get_bs_festivals
    try:
        payload = get_bs_festivals(year, location, cache_only=True, bs_month=month)
    except FestivalCacheMissError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    enriched = _enrich_holiday_bs_dates(payload["festivals"])
    return {**payload, "era": "bs", "count": len(enriched), "festivals": enriched}


@router.get("/nepal/panchanga/{date_key}")
def nepal_panchanga_day(
    date_key: str,
    location: LocationDep,
    era: Literal["bs", "ad"] = Query("bs", description="Date era: bs (2083-10-12) or ad (2027-01-25)"),
    format: Literal["raw", "surya", "toyanath", "canonical", "patro", "dayblock"] = Query(
        "surya", description="Presentation style"),
    variant: Literal["default", "nepal_official", "toyanath", "surya"] = Query("default"),
    locale: Literal["en", "ne"] = Query("en", description="dayblock locale: en or ne"),
    output: Literal["json", "text"] = Query("json"),
):
    """Combined daily panchanga + festivals + public holiday status."""
    try:
        greg = resolve_panchanga_date(date_key, era=era)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    state = build_daily_state(greg, location, include_festivals=True, include_detail=False)
    from services.holiday_generator import is_public_holiday
    festivals = state.get("festivals", [])
    for f in festivals:
        f["is_public_holiday"] = is_public_holiday(f["id"])
    state["is_public_holiday"] = any(f.get("is_public_holiday") for f in festivals)
    state.pop("detail", None)

    if format == "raw":
        return state
    payload = render_panchanga(state, style=format, variant=variant, locale=locale)
    if format == "dayblock" and output == "text":
        return Response(content=payload.get("text", ""), media_type="text/plain; charset=utf-8")
    return payload


@router.get("/nepal/panchanga/month/{bs_year}/{bs_month}")
def nepal_panchanga_month_formatted(
    bs_year: int,
    bs_month: int,
    location: LocationDep,
    format: Literal["raw", "surya", "toyanath", "canonical", "patro", "dayblock"] = Query("patro"),
    variant: Literal["default", "nepal_official", "toyanath", "surya"] = Query("default"),
    full: bool = Query(False),
    locale: Literal["en", "ne"] = Query("en"),
    output: Literal["json", "text"] = Query("json"),
):
    """BS month printable Patro grid or linear dayblock stream."""
    _validate_bs_year(bs_year)
    _validate_bs_month(bs_month)
    try:
        if format == "patro":
            return build_patro_month(bs_year, bs_month, location)
        include_full = full or format == "dayblock"
        month_payload = build_month_calendar(bs_year, bs_month, location, full=include_full)
        header = build_calendar_header(bs_year, bs_month, location)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if format == "raw":
        return month_payload
    payload = render_panchanga_month(month_payload, style=format, variant=variant, header=header, locale=locale)
    if format == "dayblock" and output == "text":
        return Response(content=payload.get("text", ""), media_type="text/plain; charset=utf-8")
    return payload


@router.get("/nepal/sankranti/year/{ad_year}", tags=["sankranti"])
def nepal_sankranti_year(ad_year: int, location: LocationDep):
    """All Sankrantis (solar ingresses) in a Gregorian year with exact timestamps."""
    from engine.vedic.sankranti_calendar import build_sankranti_year_response
    return build_sankranti_year_response(ad_year, location)


@router.get("/nepal/sankranti/{date_key}", tags=["sankranti"])
def nepal_sankranti_day(
    date_key: str,
    location: LocationDep,
    era: Literal["bs", "ad"] = Query("bs"),
):
    """Sankrantis occurring on or near a given date."""
    from engine.vedic.sankranti_calendar import build_sankranti_day_response
    try:
        greg = resolve_panchanga_date(date_key, era=era)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return build_sankranti_day_response(greg, location)


@router.get("/nepal/panchanga/year/{bs_year}")
def nepal_panchanga_year(bs_year: int, location: LocationDep):
    """Full-year Panchanga summary for a BS year."""
    _validate_bs_year(bs_year)
    from engine.vedic.bikram_sambat import (
        format_bs_date, get_bs_month_length, get_bs_month_start,
        gregorian_to_bs, iter_bs_month_days, bs_to_gregorian,
    )
    from engine.vedic.daily import get_daily_panchanga

    all_greg_days: list[date] = []
    for month in range(1, 13):
        all_greg_days.extend(greg for _, greg in iter_bs_month_days(bs_year, month))

    days = []
    for greg in all_greg_days:
        p = get_daily_panchanga(greg, location)
        bs = p["bs_date"]
        m = p.get("muhurta", {})
        days.append({
            "date_bs": format_bs_date(bs["year"], bs["month"], bs["day"]),
            "date_ad": greg.isoformat(),
            "weekday": p["vaara"]["name_ne"],
            "weekday_en": p["vaara"]["name_english"],
            "tithi": p["tithi"]["name"],
            "tithi_ne": p["tithi"]["name_ne"],
            "nakshatra": p["nakshatra"]["name"],
            "paksha": p["paksha"]["label_en"],
            "sunrise": p["sunrise"]["local_time_short"],
            "sunset": p["sunset"]["local_time_short"],
            "rahu_kalam": {"start": (m.get("rahu_kalam") or {}).get("start_time"),
                           "end": (m.get("rahu_kalam") or {}).get("end_time")},
            "abhijit": {"start": (m.get("abhijit") or {}).get("start_time"),
                        "end": (m.get("abhijit") or {}).get("end_time")},
            "is_public_holiday": False,
        })

    yr_start = get_bs_month_start(bs_year, 1)
    yr_end = bs_to_gregorian(bs_year, 12, get_bs_month_length(bs_year, 12))
    return {
        "bs_year": bs_year,
        "gregorian_range": {"start": yr_start.isoformat(), "end": yr_end.isoformat()},
        "location": location.as_dict(),
        "count": len(days),
        "days": days,
    }


@router.get("/nepal/special-months/{bs_year}")
def nepal_special_months(bs_year: int, location: LocationDep):
    """Adhik Maas and Kshaya Maas info for a BS year."""
    _validate_bs_year(bs_year)
    from services.holiday_generator import get_special_months_for_bs_year
    try:
        return get_special_months_for_bs_year(bs_year, location)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/calendar/header/{bs_year}/{bs_month}")
def calendar_header(bs_year: int, bs_month: int, location: LocationDep):
    """Multi-era calendar header (BS, AD, lunar, Shaka, Nepal Sambat)."""
    _validate_bs_year(bs_year)
    _validate_bs_month(bs_month)
    try:
        return build_calendar_header(bs_year, bs_month, location)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/day/{target_date}")
def day_view_legacy(target_date: date, location: LocationDep):
    return holidays_on_date(target_date, location)
