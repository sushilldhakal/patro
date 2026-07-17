from datetime import date
from typing import Literal

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import Response

from api.deps import LocationDep, _validate_bs_month, _validate_bs_year
from services.holiday_generator import precompute_bs_year
from services.panchanga_api import build_calendar_header, build_month_calendar, build_patro_month, resolve_panchanga_date
from services.patro_generator import generate_bs_month_patro, generate_patro
from services.presentation import render_panchanga_month

router = APIRouter()


@router.get("/nepal/gochar/year/{bs_year}")
def nepal_gochar_year(bs_year: int, location: LocationDep, request: Request):
    """Yearly Gochar summary — slow-graha transit timeline + monthly rashi snapshots."""
    from services.response_cache import bs_year_cache_control, location_cache_key, serve_cached_json

    _validate_bs_year(bs_year)
    from engine.vedic.gochar import build_gochar_year_summary

    key = f"gocharyear_{bs_year}_{location_cache_key(location)}"
    return serve_cached_json(
        request, key, lambda: build_gochar_year_summary(bs_year, location),
        cache_control=bs_year_cache_control(bs_year),
    )


@router.get("/nepal/patro/{bs_year}/{bs_month}")
def nepal_patro_grid(
    bs_year: int,
    bs_month: int,
    location: LocationDep,
    request: Request,
    format: Literal["patro", "dayblock", "surya", "toyanath", "canonical"] = Query("patro"),
    locale: Literal["en", "ne"] = Query("en"),
    output: Literal["json", "text"] = Query("json"),
):
    """Printable Surya-style monthly Patro grid or linear dayblock stream."""
    from services.response_cache import bs_year_cache_control, location_cache_key, serve_cached_json

    _validate_bs_year(bs_year)
    _validate_bs_month(bs_month)

    def build_payload():
        if format == "patro":
            return build_patro_month(bs_year, bs_month, location)
        month_payload = build_month_calendar(bs_year, bs_month, location, full=format == "dayblock")
        header = build_calendar_header(bs_year, bs_month, location)
        return render_panchanga_month(month_payload, style=format, header=header, locale=locale)

    # Text output streams raw text; JSON variants are deterministic → cached.
    if format == "dayblock" and output == "text":
        try:
            return Response(
                content=build_payload().get("text", ""),
                media_type="text/plain; charset=utf-8",
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    key = f"npatro_{bs_year}_{bs_month}_{format}_{locale}_{location_cache_key(location)}"
    return serve_cached_json(request, key, build_payload, cache_control=bs_year_cache_control(bs_year))


@router.get("/nepal/patro/{bs_year}/{bs_month}/legacy")
def nepal_patro_bs(bs_year: int, bs_month: int, location: LocationDep):
    """Festival panchanga (patro) for a BS month."""
    _validate_bs_year(bs_year)
    _validate_bs_month(bs_month)
    try:
        return generate_bs_month_patro(bs_year, bs_month, location, include_panchanga=True)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/nepal/patro/ad/{ad_year}/{ad_month}")
def nepal_patro_ad(ad_year: int, ad_month: int, location: LocationDep):
    """Festival panchanga (patro) for an AD (Gregorian) month."""
    if not 1 <= ad_month <= 12:
        raise HTTPException(status_code=400, detail="ad_month must be 1..12")
    import calendar as _cal
    from engine.vedic.bikram_sambat import gregorian_to_bs, iter_bs_month_days
    from engine.vedic.daily import get_daily_panchanga
    from services.patro_generator import _collect_bs_year_festivals, _festivals_for_day

    last_day = _cal.monthrange(ad_year, ad_month)[1]
    month_start_ad = date(ad_year, ad_month, 1)
    month_end_ad = date(ad_year, ad_month, last_day)
    bs_years = sorted({gregorian_to_bs(month_start_ad)[0], gregorian_to_bs(month_end_ad)[0]})

    all_festivals: list[dict] = []
    seen_ids: set[str] = set()
    for bs_year in bs_years:
        for f in _collect_bs_year_festivals(bs_year, location):
            if f["id"] not in seen_ids:
                seen_ids.add(f["id"])
                all_festivals.append(f)

    days = []
    current = month_start_ad
    from datetime import timedelta
    while current <= month_end_ad:
        p = get_daily_panchanga(current, location)
        days.append({
            "date_ad": current.isoformat(),
            **p,
            "festivals": _festivals_for_day(current, all_festivals),
        })
        current += timedelta(days=1)

    return {
        "ad_year": ad_year,
        "ad_month": ad_month,
        "count": len(days),
        "days": days,
    }


@router.post("/generate/panchanga/popular/{bs_year}")
def generate_panchanga_popular_cities(bs_year: int, force: bool = Query(False)):
    """Precompute panchanga cache for all popular cities."""
    _validate_bs_year(bs_year)
    from engine.astronomy.location import resolve_location_from_query
    from engine.vedic.bikram_sambat import iter_bs_month_days
    from services.cities_db import POPULAR_CITY_IDS
    from services.panchanga_cache import cache_stats, precompute_range, resolve_cache_keys

    dates = [greg for month in range(1, 13) for _, greg in iter_bs_month_days(bs_year, month)]
    results = []
    total_written = 0
    for city_id in POPULAR_CITY_IDS:
        loc = resolve_location_from_query(city_id=city_id)
        key, _ = resolve_cache_keys(loc)
        written = precompute_range(loc, dates, skip_existing=not force)
        total_written += written
        results.append({"city_id": city_id, "location_key": key, "days_written": written})

    return {
        "status": "generated", "bs_year": bs_year,
        "cities": len(POPULAR_CITY_IDS), "days_total_per_city": len(dates),
        "total_rows_written": total_written, "results": results,
        "cache": cache_stats(),
    }


@router.post("/generate/panchanga/{bs_year}")
def generate_panchanga_year(bs_year: int, location: LocationDep, force: bool = Query(False)):
    """Precompute panchanga SQLite cache for every day in a BS year at this location."""
    _validate_bs_year(bs_year)
    from engine.vedic.bikram_sambat import iter_bs_month_days
    from services.panchanga_cache import cache_stats, precompute_range, resolve_cache_keys

    dates = [greg for month in range(1, 13) for _, greg in iter_bs_month_days(bs_year, month)]
    location_key, city_id = resolve_cache_keys(location)
    written = precompute_range(location, dates, skip_existing=not force)
    return {
        "status": "generated", "bs_year": bs_year,
        "location_key": location_key, "city_id": city_id,
        "days_written": written, "days_total": len(dates),
        "cache": cache_stats(),
    }


@router.post("/generate/{year}")
def generate_year(year: int, location: LocationDep):
    """Precompute holiday cache for a BS year."""
    _validate_bs_year(year)
    payload = precompute_bs_year(year, location)
    return {
        "status": "generated",
        "bs_year": payload["bs_year"],
        "gregorian_range": payload["gregorian_range"],
        "count": payload["count"],
        "cache_key": location.cache_key(),
        "generated_at": payload["generated_at"],
    }


@router.get("/nepal/gochar/ingress")
def nepal_gochar_ingress(
    location: LocationDep,
    request: Request,
    from_date: date = Query(..., alias="from"),
    to_date: date = Query(..., alias="to"),
    era: Literal["bs", "ad"] = Query("ad"),
    level: Literal["pada", "nakshatra", "rashi", "patro", "udayast"] = Query("pada"),
    grahas: str | None = Query(None),
):
    """Planetary ingress timeline between two dates."""
    from engine.vedic.gochar import GRAHA_ORDER, build_gochar_ingress_range
    from services.response_cache import location_cache_key, serve_cached_json

    try:
        if era == "bs":
            from_greg = resolve_panchanga_date(from_date.isoformat(), era="bs")
            to_greg = resolve_panchanga_date(to_date.isoformat(), era="bs")
        else:
            from_greg, to_greg = from_date, to_date
        graha_list = None
        if grahas:
            graha_list = [g.strip() for g in grahas.split(",") if g.strip()]
            unknown = [g for g in graha_list if g not in GRAHA_ORDER]
            if unknown:
                raise ValueError(f"Unknown graha(s): {', '.join(unknown)}")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    # Deterministic per (range, location, level, grahas) — ingress moments are
    # fixed astronomy, so cache + persist rather than re-scanning the range.
    graha_key = ",".join(graha_list) if graha_list else "all"
    key = (
        f"gocharingress_{from_greg.isoformat()}_{to_greg.isoformat()}"
        f"_{level}_{graha_key}_{location_cache_key(location)}"
    )
    return serve_cached_json(
        request, key,
        lambda: build_gochar_ingress_range(
            from_greg, to_greg, location, level=level, grahas=graha_list
        ),
    )


@router.get("/nepal/gochar/{date_key}")
def nepal_gochar(
    date_key: str,
    location: LocationDep,
    request: Request,
    era: Literal["bs", "ad"] = Query("bs"),
    upcoming: bool = Query(False),
):
    """Gochar (planetary transit) table for a date."""
    from services.response_cache import location_cache_key, serve_cached_json

    try:
        greg = resolve_panchanga_date(date_key, era=era)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    from engine.vedic.gochar import build_gochar_response

    # Deterministic per (date, location, upcoming) — planetary positions for a
    # given day never change, so cache + persist it (DB-backed) rather than
    # recomputing the ephemeris on every DainikKranti view.
    key = f"gochar_{greg.isoformat()}_{int(upcoming)}_{location_cache_key(location)}"
    return serve_cached_json(
        request, key,
        lambda: build_gochar_response(
            greg, location, include_next_entry=True, include_upcoming=upcoming
        ),
    )


@router.get("/patro/{bs_year}/{bs_month}")
def patro_month_legacy(
    bs_year: int, bs_month: int, location: LocationDep, request: Request, panchanga: bool = Query(True)
):
    from services.response_cache import bs_year_cache_control, location_cache_key, serve_cached_json

    _validate_bs_year(bs_year)
    _validate_bs_month(bs_month)
    key = f"patromon_{bs_year}_{bs_month}_{int(panchanga)}_{location_cache_key(location)}"
    return serve_cached_json(
        request,
        key,
        lambda: generate_bs_month_patro(bs_year, bs_month, location, include_panchanga=panchanga),
        cache_control=bs_year_cache_control(bs_year),
    )


@router.get("/patro/{bs_year}")
def patro_year_legacy(bs_year: int, location: LocationDep, request: Request, panchanga: bool = Query(True)):
    from services.response_cache import bs_year_cache_control, location_cache_key, serve_cached_json

    _validate_bs_year(bs_year)
    key = f"patroyear_{bs_year}_{int(panchanga)}_{location_cache_key(location)}"
    return serve_cached_json(
        request, key, lambda: generate_patro(bs_year, location, include_panchanga=panchanga),
        cache_control=bs_year_cache_control(bs_year),
    )
