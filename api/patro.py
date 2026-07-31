from datetime import date
from typing import Literal

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import Response

from api.deps import LocationDep, _signed_bs_year_from_browse, _validate_bs_month, _validate_bs_year
from services.holiday_generator import precompute_bs_year
from app.day_resolver import greg_date_for_date_key
from services.panchanga_api import build_calendar_header, build_month_calendar, build_patro_month
from services.presentation import render_panchanga_month

router = APIRouter()


def _year_span_jd(request: Request, era: str, year: int) -> tuple[float, float]:
    """Inclusive ``(first_day_jd, last_day_jd)`` for an era + year.

    Prefers the span ``EraMiddleware`` already resolved for this request; falls
    back to resolving it here when the middleware did not (direct calls, tests).
    """
    from app.era_middleware import era_context
    from engine.calendar.era import year_span_jd

    ctx = era_context(request)
    if ctx.julian is not None and ctx.julian_end is not None:
        return float(ctx.julian), float(ctx.julian_end)
    try:
        return year_span_jd(era, year)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


def _stamp_year_era(payload: dict, era: str, year: int) -> dict:
    """Re-apply the legacy year/era labels the per-era builders used to add.

    The span builders are era-free by design, but these two fields are part of
    the published payload, so the labelling stays — it just happens here, once,
    instead of inside two forked builders. ``bs_year`` carries the *signed*
    patro axis (negative for bbs), which is what the BS builders emitted.
    """
    if era in ("ad", "bc"):
        payload["ad_year"] = year
        payload["era"] = "ad"
    else:
        payload["bs_year"] = _signed_bs_year_from_browse(era, year)
        payload["era"] = "bs"
    return payload


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
    from_date: str = Query(..., alias="from"),
    to_date: str = Query(..., alias="to"),
    era: Literal["bs", "ad"] = Query("ad"),
    level: Literal["pada", "nakshatra", "rashi", "patro", "udayast"] = Query("pada"),
    grahas: str | None = Query(None),
):
    """Planetary ingress timeline between two dates."""
    from app.day_resolver import civil_day_for_date_key
    from engine.astronomy.jd_calendar import date_if_supported, format_civil_iso
    from engine.vedic.gochar import (
        GRAHA_ORDER,
        build_gochar_ingress_range,
        build_gochar_ingress_range_civil,
    )
    from services.response_cache import location_cache_key, serve_cached_json

    graha_list = None
    if grahas:
        graha_list = [g.strip() for g in grahas.split(",") if g.strip()]
        unknown = [g for g in graha_list if g not in GRAHA_ORDER]
        if unknown:
            raise HTTPException(
                status_code=400, detail=f"Unknown graha(s): {', '.join(unknown)}"
            )

    # Deterministic per (range, location, level, grahas) — ingress moments are
    # fixed astronomy, so cache + persist rather than re-scanning the range.
    graha_key = ",".join(graha_list) if graha_list else "all"

    # ``from``/``to`` arrive as ``str``, not ``date``: an early-BS or BCE endpoint
    # (BS 20-04-14, -0037-07-02) is a valid range bound the JD path can compute,
    # but pydantic rejects it before the handler ever runs. An endpoint this can't
    # resolve stays ``None`` and falls through to ``resolve_panchanga_date``, which
    # owns both the BS→Gregorian overrides and the 400 for genuine garbage.
    from_civil = civil_day_for_date_key(from_date, era)
    to_civil = civil_day_for_date_key(to_date, era)
    if from_civil is not None and to_civil is not None and (
        date_if_supported(from_civil.year, from_civil.month, from_civil.day) is None
        or date_if_supported(to_civil.year, to_civil.month, to_civil.day) is None
    ):
        from_iso = format_civil_iso(from_civil.year, from_civil.month, from_civil.day)
        to_iso = format_civil_iso(to_civil.year, to_civil.month, to_civil.day)
        key = (
            f"gocharingress_civil_v2_{from_iso}_{to_iso}"
            f"_{level}_{graha_key}_{location_cache_key(location)}"
        )
        return serve_cached_json(
            request, key,
            lambda: build_gochar_ingress_range_civil(
                from_civil, to_civil, location, level=level, grahas=graha_list
            ),
        )

    try:
        from_greg = greg_date_for_date_key(from_date, era)
        to_greg = greg_date_for_date_key(to_date, era)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    key = (
        f"gocharingress_v2_{from_greg.isoformat()}_{to_greg.isoformat()}"
        f"_{level}_{graha_key}_{location_cache_key(location)}"
    )
    return serve_cached_json(
        request, key,
        lambda: build_gochar_ingress_range(
            from_greg, to_greg, location, level=level, grahas=graha_list
        ),
    )


@router.get("/nepal/gochar/jd/{jd_ut}")
def nepal_gochar_jd(
    jd_ut: float,
    location: LocationDep,
    request: Request,
    upcoming: bool = Query(False),
):
    """Gochar at local sunrise for a civil day keyed by Julian Day (0h UT)."""
    from engine.astronomy.jd_calendar import date_if_supported, format_civil_iso
    from engine.vedic.bikram_sambat import format_bs_date, locate_patro_day_for_civil
    from engine.vedic.gochar import build_gochar_response, build_gochar_response_civil
    from services.panchanga_api import resolve_panchanga_jd_ut
    from services.response_cache import location_cache_key, serve_cached_json

    canonical, civil, greg = resolve_panchanga_jd_ut(jd_ut)
    if greg is None:
        py, pm, pd = locate_patro_day_for_civil(civil)
        date_bs = format_bs_date(py, pm, pd)
        ad_iso = format_civil_iso(civil.year, civil.month, civil.day)
        key = f"gochar_jd_{canonical}_{int(upcoming)}_{location_cache_key(location)}"
        return serve_cached_json(
            request,
            key,
            lambda: build_gochar_response_civil(
                civil,
                location,
                date_bs=date_bs,
                include_next_entry=True,
                include_upcoming=upcoming,
            ),
        )

    if date_if_supported(civil.year, civil.month, civil.day) is None:
        py, pm, pd = locate_patro_day_for_civil(civil)
        date_bs = format_bs_date(py, pm, pd)
        ad_iso = format_civil_iso(civil.year, civil.month, civil.day)
        key = f"gochar_jd_{canonical}_{int(upcoming)}_{location_cache_key(location)}"
        return serve_cached_json(
            request,
            key,
            lambda: build_gochar_response_civil(
                civil,
                location,
                date_bs=date_bs,
                include_next_entry=True,
                include_upcoming=upcoming,
            ),
        )

    key = f"gochar_jd_{greg.isoformat()}_{int(upcoming)}_{location_cache_key(location)}"
    return serve_cached_json(
        request,
        key,
        lambda: build_gochar_response(
            greg, location, include_next_entry=True, include_upcoming=upcoming
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
    from engine.astronomy.jd_calendar import CivilDay, civil_day_add, date_if_supported, format_civil_iso, parse_civil_iso
    from engine.vedic.bikram_sambat import format_bs_date, get_bs_month_start_civil, locate_patro_day_for_civil, parse_bs_date
    from services.response_cache import location_cache_key, serve_cached_json

    def _civil_day_for_key(key: str, date_era: str):
        """``(CivilDay, bs_triple)`` — the triple is what an ``era=bs`` caller sent."""
        try:
            if date_era == "ad":
                return parse_civil_iso(key), None
            bs_year, bs_month, bs_day = parse_bs_date(key)
            start = get_bs_month_start_civil(bs_year, bs_month)
            civil_day = CivilDay.from_jd_ut(civil_day_add(start.to_jd_ut(), bs_day - 1))
            return civil_day, (bs_year, bs_month, bs_day)
        except Exception:
            return None, None

    civil, bs_triple = _civil_day_for_key(date_key, era)
    if civil is not None and date_if_supported(civil.year, civil.month, civil.day) is None:
        from engine.vedic.gochar import build_gochar_response_civil

        # An ``era=bs`` request already carries the patro date; only an AD key
        # needs the reverse JD→BS scan.
        py, pm, pd = bs_triple or locate_patro_day_for_civil(civil)
        date_bs = format_bs_date(py, pm, pd)
        ad_iso = format_civil_iso(civil.year, civil.month, civil.day)
        key = f"gochar_civil_{ad_iso}_{int(upcoming)}_{location_cache_key(location)}"
        return serve_cached_json(
            request,
            key,
            lambda: build_gochar_response_civil(
                civil,
                location,
                date_bs=date_bs,
                include_next_entry=True,
                include_upcoming=upcoming,
            ),
        )

    try:
        greg = greg_date_for_date_key(date_key, era)
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


@router.get("/nepal/graha-sthiti/{date_key}")
def nepal_graha_sthiti(
    date_key: str,
    location: LocationDep,
    request: Request,
    era: Literal["bs", "bbs", "ad", "bc"] = Query("ad"),
):
    """Full daily sphuta table — all 9 grahas + लग्न, computed at sunrise."""
    from app.day_resolver import DayResolutionError, civil_day_for_date_key
    from engine.astronomy.jd_calendar import date_if_supported, format_civil_iso
    from engine.vedic.bikram_sambat import format_bs_date, locate_patro_day_for_civil
    from services.response_cache import location_cache_key, serve_cached_json

    civil = civil_day_for_date_key(date_key, era)
    if civil is None:
        raise HTTPException(
            status_code=400,
            detail=f"{date_key!r} is not a date this era can read",
        )

    bs_triple_from_key: tuple[int, int, int] | None = None
    if era in ("bs", "bbs"):
        parts = date_key.strip().split("-")
        if len(parts) == 3:
            try:
                bs_triple_from_key = (int(parts[0]), int(parts[1]), int(parts[2]))
            except ValueError:
                bs_triple_from_key = None

    if date_if_supported(civil.year, civil.month, civil.day) is None:
        from engine.vedic.graha_detail import build_graha_sthiti_civil

        py, pm, pd = bs_triple_from_key or locate_patro_day_for_civil(civil)
        date_bs = format_bs_date(py, pm, pd)
        ad_iso = format_civil_iso(civil.year, civil.month, civil.day)
        key = f"grahasthiti_civil_{ad_iso}_{location_cache_key(location)}"
        return serve_cached_json(
            request,
            key,
            lambda: build_graha_sthiti_civil(civil, location, date_bs=date_bs),
        )

    try:
        greg = greg_date_for_date_key(date_key, era)
    except DayResolutionError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    from engine.vedic.graha_detail import build_graha_sthiti

    key = f"grahasthiti_{greg.isoformat()}_{location_cache_key(location)}"
    return serve_cached_json(
        request, key,
        lambda: build_graha_sthiti(greg, location),
    )


@router.get("/nepal/graha-asta/year/{year}")
def nepal_graha_asta_year(
    year: int,
    location: LocationDep,
    request: Request,
    era: Literal["bs", "bbs", "ad"] = Query("bs", description="Calendar era for year (bs, bbs, or ad)"),
):
    """Yearly heliacal udaya/asta (rising/setting) timeline for a BS or AD year."""
    from engine.vedic.graha_detail import build_graha_asta_span
    from services.response_cache import bs_year_cache_control, location_cache_key, serve_cached_json

    if era == "ad" and not 1943 <= year <= 2090:
        raise HTTPException(status_code=400, detail="ad year out of supported range")
    if era != "ad":
        _signed_bs_year_from_browse(era, year)  # validates the BS/BBS range

    jd_start, jd_end = _year_span_jd(request, era, year)
    key = f"grahaasta_jd_{jd_start:.1f}_{jd_end:.1f}_{location_cache_key(location)}"
    return serve_cached_json(
        request,
        key,
        lambda: _stamp_year_era(
            build_graha_asta_span(jd_start, jd_end, location), era, year
        ),
        cache_control=bs_year_cache_control(
            year + 56 if era == "ad" else _signed_bs_year_from_browse(era, year)
        ),
    )


@router.get("/nepal/graha-vakri/year/{year}")
def nepal_graha_vakri_year(
    year: int,
    location: LocationDep,
    request: Request,
    era: Literal["ad", "bc", "bs", "bbs"] = Query(
        "bs", description="Calendar era for year — all four take a positive year"
    ),
):
    """Yearly वक्री/मार्गी (retrograde/direct) station timeline.

    Reference implementation of the era architecture: the handler does no calendar
    conversion at all. ``EraMiddleware`` has already turned ``era`` + ``year`` into
    a Julian Day span, and renders the Julian Days in the response back into the
    requested era on the way out. Adding an era here is a codec change, not a
    handler change.
    """
    from app.era_middleware import era_context
    from engine.calendar.era import year_span_jd
    from engine.vedic.graha_detail import build_graha_vakri_span
    from services.response_cache import location_cache_key, serve_cached_json

    ctx = era_context(request)
    try:
        jd_start, jd_end = (
            (ctx.julian, ctx.julian_end)
            if ctx.julian is not None and ctx.julian_end is not None
            else year_span_jd(era, year)
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    key = f"grahavakri_jd_v2_{jd_start:.1f}_{jd_end:.1f}_{location_cache_key(location)}"
    return serve_cached_json(
        request,
        key,
        lambda: build_graha_vakri_span(jd_start, jd_end, location),
    )


@router.get("/nepal/eclipse/{kind}/year/{year}")
def nepal_eclipse_year(
    kind: Literal["solar", "lunar"],
    year: int,
    location: LocationDep,
    request: Request,
    era: Literal["bs", "bbs", "ad"] = Query("bs", description="Calendar era for year (bs, bbs, or ad)"),
):
    """Solar or lunar eclipses whose maximum falls within a BS or AD year."""
    from engine.vedic.graha_detail import build_eclipse_span
    from services.response_cache import bs_year_cache_control, location_cache_key, serve_cached_json

    if era == "ad" and not 1943 <= year <= 2090:
        raise HTTPException(status_code=400, detail="ad year out of supported range")
    if era != "ad":
        _signed_bs_year_from_browse(era, year)  # validates the BS/BBS range

    jd_start, jd_end = _year_span_jd(request, era, year)
    key = f"eclipse_{kind}_jd_{jd_start:.1f}_{jd_end:.1f}_{location_cache_key(location)}"
    return serve_cached_json(
        request,
        key,
        lambda: _stamp_year_era(
            build_eclipse_span(jd_start, jd_end, kind, location), era, year
        ),
        cache_control=bs_year_cache_control(
            year + 56 if era == "ad" else _signed_bs_year_from_browse(era, year)
        ),
    )


@router.get("/nepal/panchak/year/{year}")
def nepal_panchak_year(
    year: int,
    location: LocationDep,
    request: Request,
    era: Literal["bs", "ad"] = Query("bs", description="Calendar era for year (bs or ad)"),
):
    """Annual Panchak windows — Moon in Dhanishta pada 3 through Revati."""
    from engine.vedic.panchak_calendar import build_panchak_span
    from services.response_cache import bs_year_cache_control, location_cache_key, serve_cached_json

    if era == "ad" and not 1943 <= year <= 2090:
        raise HTTPException(status_code=400, detail="ad year out of supported range")
    if era != "ad":
        _validate_bs_year(year)

    jd_start, jd_end = _year_span_jd(request, era, year)
    key = f"panchak_jd_{jd_start:.1f}_{jd_end:.1f}_{location_cache_key(location)}"
    return serve_cached_json(
        request,
        key,
        lambda: _stamp_year_era(
            build_panchak_span(jd_start, jd_end, location), era, year
        ),
        cache_control=bs_year_cache_control(year + 56 if era == "ad" else year),
    )
