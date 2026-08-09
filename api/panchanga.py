import calendar as _cal
from datetime import date, timedelta
from typing import Any, Literal

import gzip

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse, Response

from app.era_middleware import era_params
from api.deps import (
    EraQuery,
    LocationDep,
    _enrich_holiday_bs_dates,
    _nepal_holidays_for_ad_year,
    _signed_bs_year_from_browse,
    _validate_bs_month,
    _validate_bs_year,
)
from engine.vedic.constants import AD_YEAR_MAX, AD_YEAR_MIN, BC_YEAR_MAX, BC_YEAR_MIN
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
)
from services.panchanga_api import (
    build_calendar_header,
    build_daily_state,
    build_daily_state_civil,
    build_festivals_for_date,
    build_month_calendar,
    build_month_calendar_at_clock,
    build_patro_month,
    build_year_calendar,
)
from app.day_resolver import greg_date_for_date_key
from services.presentation import render_panchanga, render_panchanga_month

router = APIRouter()


def _cached_year_response(
    bs_year: int,
    location,
    request: Request,
    *,
    variant: str,
    build,
) -> Response:
    """Serve a year payload from the gzipped disk cache, computing it once.

    First request per (year, location, variant) computes and persists; every
    later one streams the pre-compressed bytes back in milliseconds. Past years
    are served with an immutable long CDN TTL; the live year gets a short one.
    """
    from services.response_cache import bs_year_cache_control
    from services.year_cache import read_year_cache, write_year_cache

    compressed = read_year_cache(bs_year, location, variant=variant)
    if compressed is None:
        try:
            payload = build()
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        compressed = write_year_cache(bs_year, location, payload, variant=variant)

    cache_control = bs_year_cache_control(bs_year)
    headers = {
        "Cache-Control": cache_control,
        "CDN-Cache-Control": cache_control,
        "Vary": "Accept-Encoding",
    }
    if "gzip" in request.headers.get("accept-encoding", "").lower():
        # Pre-compressed bytes straight from disk; GZipMiddleware skips
        # responses that already carry Content-Encoding.
        headers["Content-Encoding"] = "gzip"
        return Response(content=compressed, media_type="application/json", headers=headers)
    return Response(
        content=gzip.decompress(compressed),
        media_type="application/json",
        headers=headers,
    )


@router.get("/panchanga/year/{bs_year}/sun")
def panchanga_year_sun_times(bs_year: int, location: LocationDep, request: Request):
    """Sunrise/sunset/ayana for every day of a BS year — सूर्यक्रान्ति grid.

    Purpose-built slim payload: a cold year computes in ~1 s (vs ~30 s for the
    full year build); cached responses return in milliseconds.
    """
    from services.panchanga_api import build_year_sun_times

    _validate_bs_year(bs_year)
    return _cached_year_response(
        bs_year,
        location,
        request,
        variant="sun",
        build=lambda: build_year_sun_times(bs_year, location),
    )


@router.get("/panchanga/year/{bs_year}")
def panchanga_year(
    bs_year: int,
    location: LocationDep,
    request: Request,
    era: EraQuery = "bs",
    full: bool = Query(False, description="Include full daily state per day"),
    wheel: bool = Query(
        False,
        description="Slim payload for the year wheel: days once in `calendar` "
        "with wheel-only state, `months` metadata only",
    ),
):
    """Full BS year calendar — all months in one response."""
    signed = _signed_bs_year_from_browse(era, bs_year)
    _validate_bs_year(signed)
    if wheel:
        variant = "wheel3"
        build = lambda: build_year_calendar(signed, location, full=True, shape="wheel")
    else:
        variant = "full" if full else "lite"
        build = lambda: build_year_calendar(signed, location, full=full)
    return _cached_year_response(
        signed,
        location,
        request,
        variant=variant,
        build=build,
    )


# NOTE: must stay ABOVE "/panchanga/{bs_year}/{bs_month}" — FastAPI matches in
# declaration order, and the two-segment BS month route otherwise swallows
# "/panchanga/jd/<float>" and tries to parse "jd" as an int bs_year. That made
# the JD endpoint permanently unreachable (422), even though it is the escape
# hatch every "before 1 CE; use civil/JD APIs" error message points callers to.
@router.get("/panchanga/jd/{jd_ut}")
def panchanga_day_jd(
    jd_ut: float,
    location: LocationDep,
    festivals: bool = Query(False, description="Include festivals on this day"),
    detail: bool = Query(True, description="Include full computation detail block"),
    reference: Literal["sunrise", "midnight"] = Query(
        "sunrise",
        description="Anga reference moment: sunrise (udaya, default) or midnight (civil-day 00:00)",
    ),
):
    """Daily panchanga keyed by civil-day Julian Day (0h UT) — the canonical form.

    Identical to ``/panchanga?jd=…``; both address a day without naming a
    calendar, and both reach pre-1 CE civil days.
    """
    return _day_payload_for_jd(
        jd_ut, location, festivals=festivals, detail=detail, reference=reference
    )


@router.get("/panchanga/{bs_year}/{bs_month}")
def panchanga_month(
    bs_year: int,
    bs_month: int,
    location: LocationDep,
    request: Request,
    # Deliberately *not* widened to ad/bc: the path segments are BS year+month,
    # and this feeds _signed_bs_year_from_browse. An AD year here would be read
    # as a BS year and silently answer the wrong month. Callers wanting a
    # Gregorian month have /nepal/patro/ad/{ad_year}/{ad_month}.
    era: Literal["bs", "bbs"] = Query(
        "bs",
        description="Browse era for the path year (bbs maps url year N → signed −N)",
    ),
    full: bool = Query(False, description="Include full daily state per day"),
    clock: str | None = Query(None, description="HH:MM civil clock — ephemeris mode for each day in the month"),
    exclude_international: bool = Query(
        False,
        description="Drop international 'World day' observances (panchanga month grid)",
    ),
):
    """BS month calendar — Patro grid as structured JSON.

    Deterministic per (year, month, location, full, clock, exclude_international)
    → served from the gzip response cache; the first request computes (~0.8 s
    cold), later ones stream back in milliseconds.
    """
    from services.response_cache import bs_year_cache_control, location_cache_key, serve_cached_json

    bs_signed = _signed_bs_year_from_browse(era, bs_year)
    _validate_bs_month(bs_month)
    variant = f"{'full' if full else 'lite'}_{clock or 'udaya'}{'_nointl' if exclude_international else ''}"
    key = f"month_{bs_signed}_{bs_month}_{variant}_{location_cache_key(location)}"

    def build():
        if clock:
            return build_month_calendar_at_clock(
                bs_signed, bs_month, location, clock, full=full,
                exclude_international=exclude_international,
            )
        return build_month_calendar(
            bs_signed, bs_month, location, full=full,
            exclude_international=exclude_international,
        )

    return serve_cached_json(request, key, build, cache_control=bs_year_cache_control(bs_signed))


@router.get("/panchanga/ad/{ad_year}/{ad_month}")
def panchanga_ad_month(
    ad_year: int,
    ad_month: int,
    location: LocationDep,
    request: Request,
    full: bool = Query(False, description="Include full daily state per day"),
    clock: str | None = Query(None, description="HH:MM civil clock — ephemeris mode for each day in the month"),
    exclude_international: bool = Query(
        False,
        description="Drop international 'World day' observances (panchanga month grid)",
    ),
):
    """Gregorian (AD) month calendar — Jan–Dec boundaries for English UI."""
    from services.panchanga_api import build_ad_month_calendar, build_month_calendar_at_clock
    from services.response_cache import bs_year_cache_control, location_cache_key, serve_cached_json

    if not AD_YEAR_MIN <= ad_year <= AD_YEAR_MAX:
        raise HTTPException(
            status_code=400,
            detail=f"ad year out of supported range ({AD_YEAR_MIN}..{AD_YEAR_MAX})",
        )
    if not 1 <= ad_month <= 12:
        raise HTTPException(status_code=400, detail="ad_month must be 1..12")

    variant = f"{'full' if full else 'lite'}_{clock or 'udaya'}{'_nointl' if exclude_international else ''}"
    key = f"admonth_{ad_year}_{ad_month}_{variant}_{location_cache_key(location)}"

    def build():
        if clock:
            raise HTTPException(status_code=400, detail="clock mode not supported for AD month yet")
        return build_ad_month_calendar(
            ad_year, ad_month, location, full=full,
            exclude_international=exclude_international,
        )

    return serve_cached_json(request, key, build, cache_control=bs_year_cache_control(ad_year + 56))


@router.get("/panchanga/bc/{bc_year}/{bc_month}")
def panchanga_bc_month(
    bc_year: int,
    bc_month: int,
    location: LocationDep,
    request: Request,
    full: bool = Query(False, description="Include full daily state per day"),
    exclude_international: bool = Query(
        False,
        description="Drop international 'World day' observances (panchanga month grid)",
    ),
):
    """Gregorian BCE month calendar — positive ``bc_year`` is ``N`` BC (``era=bc``)."""
    from api.deps import validated_year_span_jd
    from services.panchanga_api import build_gregorian_browse_month_calendar
    from services.response_cache import bs_year_cache_control, location_cache_key, serve_cached_json

    if not BC_YEAR_MIN <= bc_year <= BC_YEAR_MAX:
        raise HTTPException(
            status_code=400,
            detail=f"bc year out of supported range ({BC_YEAR_MIN}..{BC_YEAR_MAX})",
        )
    if not 1 <= bc_month <= 12:
        raise HTTPException(status_code=400, detail="bc_month must be 1..12")
    validated_year_span_jd(request, "bc", bc_year)

    variant = f"{'full' if full else 'lite'}_{'_nointl' if exclude_international else ''}"
    key = f"bcmont_{bc_year}_{bc_month}_{variant}_{location_cache_key(location)}"

    def build():
        return build_gregorian_browse_month_calendar(
            "bc",
            bc_year,
            bc_month,
            location,
            full=full,
            exclude_international=exclude_international,
        )

    return serve_cached_json(request, key, build, cache_control=bs_year_cache_control(-bc_year))


def _bce_day_payload(
    civil, location, *, festivals: bool, detail: bool, bs_triple=None
) -> dict:
    """Daily payload for a pre-1 CE civil day (same shape as the CE branch).

    ``bs_triple`` short-circuits the reverse JD→BS scan when the caller already
    knows the patro date (an ``era=bs`` request always does).
    """
    from engine.astronomy.jd_calendar import format_civil_iso
    from engine.vedic.bikram_sambat import locate_patro_day_for_civil
    from services.panchanga_api import build_daily_state_civil

    patro_year, patro_month, patro_day = bs_triple or locate_patro_day_for_civil(civil)
    payload = build_daily_state_civil(
        civil,
        location,
        patro_bs_year=patro_year,
        patro_bs_month=patro_month,
        patro_bs_day=patro_day,
        include_festivals=festivals,
        include_detail=detail,
    )
    payload["jd_ut"] = civil.to_jd_ut()
    payload["date_ad"] = format_civil_iso(civil.year, civil.month, civil.day)
    return payload


def _day_payload_for_jd(
    jd_ut: float,
    location,
    *,
    festivals: bool,
    detail: bool,
    civil: bool = False,
    reference: str = "sunrise",
    bs_triple: tuple[int, int, int] | None = None,
) -> JSONResponse:
    """The one body behind every day route. Julian Day in, rendered day out.

    Nothing here knows which calendar the caller used to name the day, or which
    one the response will be labelled in — the era middleware owns both ends.
    """
    from engine.astronomy.jd_calendar import format_civil_iso
    from services.panchanga_api import resolve_panchanga_jd_ut
    from services.response_cache import DAILY_PANCHANGA_CACHE_CONTROL

    canonical, civil_day, greg = resolve_panchanga_jd_ut(jd_ut)

    headers = {
        "Cache-Control": DAILY_PANCHANGA_CACHE_CONTROL,
        "CDN-Cache-Control": DAILY_PANCHANGA_CACHE_CONTROL,
    }

    if greg is None:
        if reference == "midnight":
            raise HTTPException(
                status_code=501,
                detail="midnight reference for BCE civil days is not supported yet",
            )
        payload = _bce_day_payload(
            civil_day,
            location,
            festivals=festivals,
            detail=detail,
            bs_triple=bs_triple,
        )
        payload["jd_ut"] = canonical
        return JSONResponse(content=payload, headers=headers)

    if reference == "midnight":
        from engine.vedic.at_time import build_panchanga_civil_day

        payload = build_panchanga_civil_day(greg, location)
        if not detail:
            payload.pop("detail", None)
        if not festivals:
            payload.pop("festivals", None)
    else:
        payload = build_daily_state(
            greg, location, include_festivals=festivals, include_detail=detail
        )

    if civil:
        from services.civil_timeline import build_civil_timeline

        payload["civil_timeline"] = build_civil_timeline(greg, location)

    payload["jd_ut"] = canonical
    payload["date_ad"] = format_civil_iso(civil_day.year, civil_day.month, civil_day.day)
    return JSONResponse(content=payload, headers=headers)


def _panchanga_day_impl(
    date_key: str | None,
    location: LocationDep,
    request: Request,
    *,
    festivals: bool,
    detail: bool,
    civil: bool,
    reference: str,
):
    """Shared handler for ``/panchanga/today``, ``/panchanga/{date_key}`` and ``?jd=``."""
    from app.day_resolver import DayResolutionError, day_jd_for_request

    try:
        jd_ut = day_jd_for_request(request, date_key)
    except DayResolutionError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    bs_triple: tuple[int, int, int] | None = None
    ctx = getattr(request.state, "era_ctx", None)
    if (
        ctx is not None
        and ctx.input_era in ("bs", "bbs")
        and ctx.year is not None
        and ctx.month is not None
        and ctx.day is not None
    ):
        signed = ctx.year if ctx.input_era == "bs" else -ctx.year
        bs_triple = (signed, ctx.month, ctx.day)

    return _day_payload_for_jd(
        jd_ut,
        location,
        festivals=festivals,
        detail=detail,
        civil=civil,
        reference=reference,
        bs_triple=bs_triple,
    )


@router.get("/panchanga")
def panchanga_day_query(
    location: LocationDep,
    request: Request,
    _era: None = Depends(era_params),
    festivals: bool = Query(False, description="Include festivals on this day"),
    detail: bool = Query(True, description="Include full computation detail block"),
    civil: bool = Query(
        False,
        description="Attach a civil-day (midnight→midnight) timeline stitched from the previous + current day",
    ),
    reference: Literal["sunrise", "midnight"] = Query(
        "sunrise",
        description="Anga reference moment: sunrise (udaya, default) or midnight (civil-day 00:00)",
    ),
):
    """Daily panchanga addressed by ``?jd=`` or by ``?era=&year=&month=&day=``.

    The preferred day route: nothing about the calendar reaches this handler, and
    with no parameters at all it resolves the observer's current day.
    """
    return _panchanga_day_impl(
        None,
        location,
        request,
        festivals=festivals,
        detail=detail,
        civil=civil,
        reference=reference,
    )


@router.get("/panchanga/today")
def panchanga_day_today(
    location: LocationDep,
    request: Request,
    _era: None = Depends(era_params),
    festivals: bool = Query(False, description="Include festivals on this day"),
    detail: bool = Query(True, description="Include full computation detail block"),
    civil: bool = Query(
        False,
        description="Attach a civil-day (midnight→midnight) timeline stitched from the previous + current day",
    ),
    reference: Literal["sunrise", "midnight"] = Query(
        "sunrise",
        description="Anga reference moment: sunrise (udaya, default) or midnight (civil-day 00:00)",
    ),
):
    """Observer-local today → JD → panchanga.

    ``today`` names an instant, not a date, so ``?era=`` here can only mean how
    to label the answer — it never causes "today" to be read as a BS or AD date.
    """
    return _panchanga_day_impl(
        "today",
        location,
        request,
        festivals=festivals,
        detail=detail,
        civil=civil,
        reference=reference,
    )


@router.get("/panchanga/rashifal")
def panchanga_rashifal(
    location: LocationDep,
    request: Request,
    _era: None = Depends(era_params),
    period: Literal["daily", "weekly", "monthly", "yearly"] = Query(
        "daily",
        description=(
            "Daily; weekly (the Aitabar→Sanibar week containing the anchor day); "
            "monthly (BS month containing it); yearly (BS year containing it)"
        ),
    ),
    date_key: str | None = Query(None, alias="date"),
):
    """Server-computed rashifal from sunrise panchanga (Drik Ganita, Lahiri).

    Deterministic per (day, period, location) — every layer is read at the
    observer's own sunrise — so the whole payload goes through the gzip response
    cache. That matters most for ``yearly``, which sweeps ~123 sunrises.
    """
    from app.day_resolver import DayResolutionError, day_jd_for_request
    from engine.astronomy.jd_calendar import CivilDay, date_if_supported
    from services.response_cache import (
        DAILY_PANCHANGA_CACHE_CONTROL,
        location_cache_key,
        serve_cached_json,
    )

    try:
        jd_ut = day_jd_for_request(request, date_key)
    except DayResolutionError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    civil = CivilDay.from_jd_ut(float(jd_ut))
    greg = date_if_supported(civil.year, civil.month, civil.day)
    if greg is None:
        raise HTTPException(
            status_code=400,
            detail="Rashifal is available for CE-representable dates only.",
        )

    def build():
        from services.rashifal_api import rashifal_for_gregorian

        return rashifal_for_gregorian(greg, location, period=period)

    from services.rashifal_api import rashifal_window_key

    window = rashifal_window_key(greg, period)
    key = f"rashifal_{period}_{window}_{location_cache_key(location)}"
    return serve_cached_json(
        request, key, build, cache_control=DAILY_PANCHANGA_CACHE_CONTROL
    )


@router.get("/panchanga/{date_key}")
def panchanga_day(
    date_key: str,
    location: LocationDep,
    request: Request,
    _era: None = Depends(era_params),
    festivals: bool = Query(False, description="Include festivals on this day"),
    detail: bool = Query(True, description="Include full computation detail block"),
    civil: bool = Query(
        False,
        description="Attach a civil-day (midnight→midnight) timeline stitched from the previous + current day",
    ),
    reference: Literal["sunrise", "midnight"] = Query(
        "sunrise",
        description="Anga reference moment: sunrise (udaya, default) or midnight (civil-day 00:00)",
    ),
):
    """Daily panchanga for a ``Y-M-D`` path segment.

    The string is read in ``inputEra`` (falling back to ``era``, then BS) and
    becomes a Julian Day before the handler sees it. ``/panchanga?jd=`` and
    ``/panchanga?era=&year=&month=&day=`` address the same day without a path.
    """
    return _panchanga_day_impl(
        date_key,
        location,
        request,
        festivals=festivals,
        detail=detail,
        civil=civil,
        reference=reference,
    )


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
        return get_bs_festivals(bs_year, location, bs_month=month)
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
        return get_bs_holidays(year, location, bs_month=month)
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
    era: EraQuery = "bs",
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
        enriched = _enrich_holiday_bs_dates(holidays_list)
        return {"ad_year": year, "era": "ad", "count": len(enriched), "holidays": enriched}

    if era in ("bc",):
        raise HTTPException(
            status_code=400,
            detail="Nepal holiday listings are not defined for era=bc; use era=bs, bbs, or ad.",
        )

    signed = _signed_bs_year_from_browse(era, year)
    try:
        from services.holiday_generator import filter_holidays_by_bs_month
        payload = get_bs_holidays(signed, location)
    except HolidayCacheMissError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    holidays_list = payload["holidays"]
    if month is not None:
        from services.holiday_generator import filter_holidays_by_bs_month
        holidays_list = filter_holidays_by_bs_month(holidays_list, signed, month)

    result: dict[str, Any] = {
        "bs_year": signed,
        "era": era,
        "gregorian_range": payload["gregorian_range"],
        "count": len(holidays_list),
        "holidays": _enrich_holiday_bs_dates(holidays_list),
    }
    if era == "bbs":
        result["bbs"] = year
    return result


@router.get("/nepal/sait/categories", tags=["sait"])
def nepal_sait_categories():
    """Ceremony types available for sait listings (विवाह, ब्रतबन्ध, …)."""
    from services.sait_api import list_sait_categories
    return {"categories": list_sait_categories()}


@router.get("/nepal/sait/years", tags=["sait"])
def nepal_sait_years():
    """BS years available for sait (1700–2200, computed from JPL)."""
    from services.sait_api import list_sait_years
    return {"years": list_sait_years()}


@router.get("/nepal/sait/about", tags=["sait"])
def nepal_sait_about_all():
    """Explanation metadata for every ceremony type — powers the standalone pages."""
    from services.sait_api import get_sait_about_all
    return get_sait_about_all()


@router.get("/nepal/sait/{category}/about", tags=["sait"])
def nepal_sait_about(category: str):
    """Explanation / how-it's-sourced metadata for one ceremony type."""
    from services.sait_api import get_sait_about
    try:
        return get_sait_about(category)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/nepal/sait/{bs_year}/month/{bs_month}", tags=["sait"])
def nepal_sait_month_all(bs_year: int, bs_month: int, location: LocationDep):
    """Auspicious days for ALL ceremony types in ONE BS month (home-page list).
    Computes only the requested month rather than the whole year."""
    _validate_bs_year(bs_year)
    from services.sait_api import get_sait_month_all
    try:
        return get_sait_month_all(bs_year, bs_month, location)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/nepal/sait/{bs_year}/{category}/detail", tags=["sait"])
def nepal_sait_detail(
    bs_year: int,
    category: str,
    location: LocationDep,
    exclude: str | None = None,
    nakshatra_mode: str | None = None,
):
    """Per-day muhūrta reasons (tithi/nakṣatra/yoga/karaṇa/vāra/lagna window)
    explaining why each listed day qualifies. Muhūrta categories only.

    ``exclude`` is a comma-separated list of community rule ids to drop (see
    ``muhurta_engine.TOGGLEABLE_RULE_IDS``), letting a community pull dates that
    honour only its handpicked subset of the classical rules.

    ``nakshatra_mode`` (bratabandha only): ``classical`` (default) | ``nepali`` |
    ``liberal`` — switches the nakṣatra tradition without clearing other rules.
    """
    _validate_bs_year(bs_year)
    from services.response_cache import SAIT_CUSTOM_CACHE_CONTROL, bs_year_cache_control
    from services.sait_api import get_sait_detail

    exclude_rules = frozenset(
        part.strip() for part in (exclude or "").split(",") if part.strip()
    )
    try:
        payload = get_sait_detail(
            bs_year, category, location, exclude_rules, nakshatra_mode=nakshatra_mode,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    # Query-aware caching: the default (whole-rule) listing is cacheable long like
    # any year payload; a handpicked subset always revalidates in the browser so a
    # rule toggle is never masked by a stale cache, but the edge still absorbs it.
    custom = bool(exclude_rules) or (
        nakshatra_mode and nakshatra_mode.strip().lower() not in ("", "classical")
    )
    cache_control = (
        SAIT_CUSTOM_CACHE_CONTROL if custom else bs_year_cache_control(bs_year)
    )
    return JSONResponse(
        payload,
        headers={
            "Cache-Control": cache_control,
            "CDN-Cache-Control": cache_control,
            "Vary": "Accept-Encoding",
        },
    )


@router.get("/nepal/sait/{bs_year}/{category}/personalize", tags=["sait"])
def nepal_sait_personalize(
    bs_year: int,
    category: str,
    location: LocationDep,
    birth: str | None = None,
    birth_tz: str = "Asia/Kathmandu",
    janma_nakshatra: int | None = None,
    janma_rashi: int | None = None,
    gender: str | None = None,
):
    """Native (profile-based) verdict for each generally-auspicious day.

    Overlays a per-day ``favourable`` / ``neutral`` / ``avoid`` verdict on the
    year's listing using the person's janma Moon: Tārā Bala + Chandra Bala, plus
    the category-specific native rule (rudri Moon-house, annaprasan Janma-tārā).

    Supply either the janma Moon directly (``janma_nakshatra`` 1–27 and
    ``janma_rashi`` 1–12) or a naive birth datetime (``birth`` = ``YYYY-MM-DDTHH:MM``
    interpreted in ``birth_tz``), from which the janma Moon is computed.

    ``gender`` (with a ``birth`` date) enables the annaprāśana age-month rule.
    """
    from datetime import date as _date

    _validate_bs_year(bs_year)
    from services.response_cache import SAIT_CUSTOM_CACHE_CONTROL
    from services.sait_personalize import compute_janma_points, personalize_sait

    birth_date: _date | None = None
    if birth:
        try:
            birth_date = _date.fromisoformat(birth.split("T")[0])
        except ValueError:
            birth_date = None

    try:
        if janma_nakshatra is None or janma_rashi is None:
            if not birth:
                raise ValueError(
                    "Provide either janma_nakshatra + janma_rashi, or a birth datetime."
                )
            janma = compute_janma_points(birth, birth_tz)
            janma_nakshatra = janma["nakshatra"]
            janma_rashi = janma["rashi"]
        payload = personalize_sait(
            bs_year,
            category,
            janma_nakshatra,
            janma_rashi,
            location,
            birth_date=birth_date,
            gender=gender,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    # Native to one person — never shared/edge-cached; the browser may keep it
    # briefly (a profile's verdict for a year is stable).
    return JSONResponse(
        payload,
        headers={
            "Cache-Control": SAIT_CUSTOM_CACHE_CONTROL,
            "CDN-Cache-Control": SAIT_CUSTOM_CACHE_CONTROL,
            "Vary": "Accept-Encoding",
        },
    )


@router.get("/nepal/sait/{bs_year}/{category}", tags=["sait"])
def nepal_sait_for_category(bs_year: int, category: str, location: LocationDep):
    """Auspicious BS month/day listings for one ceremony type and year."""
    _validate_bs_year(bs_year)
    from services.sait_api import get_sait_month_entries
    try:
        return get_sait_month_entries(bs_year, category, location)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


def _apply_tradition(festivals: list, tradition_value: str | None) -> tuple[list, str]:
    """Filter a computed festival list to one observing tradition.

    Applied on READ rather than baked into the cache key: the cached payload is
    the superset (``all``), and filtering it is a list comprehension over ~550
    entries. Keying the cache per tradition would multiply every stored year by
    the number of traditions to remove one festival from each.
    """
    from engine.vedic import tradition as tradition_module
    from services.holiday_generator import load_rules

    try:
        resolved = tradition_module.normalize(tradition_value)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if resolved == tradition_module.DEFAULT:
        return festivals, resolved
    return tradition_module.filter_entries(festivals, resolved, load_rules()), resolved


@router.get("/nepal/festivals")
def nepal_festivals(
    location: LocationDep,
    year: int = Query(..., description="Year to query"),
    era: EraQuery = "bs",
    month: int | None = Query(None, ge=1, le=12, description="Month filter"),
    tradition: str | None = Query(
        None,
        description="Observing tradition: all (default), smarta or vaishnava. "
                    "Selects which Ekadashi vrata dates apply.",
    ),
):
    """All Nepal festivals (including regional) with both BS and AD dates."""
    # Validate before any lookup: a malformed parameter is a 400 regardless of
    # whether the requested year happens to be cached.
    from engine.vedic import tradition as _tradition_module

    try:
        _tradition_module.normalize(tradition)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if era == "ad":
        from services.holiday_generator import get_bs_festivals
        seen: dict[str, Any] = {}
        for bs_year in (year + 56, year + 57):
            try:
                payload = get_bs_festivals(bs_year, location)
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
        enriched, resolved_tradition = _apply_tradition(
            _enrich_holiday_bs_dates(festivals), tradition
        )
        payload = {"ad_year": year, "era": "ad", "count": len(enriched),
                   "festivals": enriched}
        if tradition is not None:
            payload["tradition"] = resolved_tradition
        return payload

    if era in ("bc",):
        raise HTTPException(
            status_code=400,
            detail="Festival rules are not defined for era=bc; use era=bs, bbs, or ad.",
        )

    signed = _signed_bs_year_from_browse(era, year)
    from services.holiday_generator import get_bs_festivals
    try:
        payload = get_bs_festivals(signed, location, bs_month=month)
    except FestivalCacheMissError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    enriched, resolved_tradition = _apply_tradition(
        _enrich_holiday_bs_dates(payload["festivals"]), tradition
    )
    result: dict[str, Any] = {**payload, "era": era, "count": len(enriched), "festivals": enriched}
    if era == "bbs":
        result["bbs"] = year
    if tradition is not None:
        result["tradition"] = resolved_tradition
    return result


@router.get("/nepal/festivals/upcoming")
def nepal_upcoming_festivals(
    location: LocationDep,
    from_date: str | None = Query(None, alias="from", description="ISO AD date; default today (observer TZ)"),
    days: int = Query(90, ge=1, le=366, description="Look-ahead window in days"),
    limit: int = Query(15, ge=1, le=60),
    holidays_only: bool = Query(False, description="Only public holidays"),
):
    """Next festivals on/after a date, spanning the BS-year boundary."""
    from zoneinfo import ZoneInfo

    from services.holiday_generator import get_bs_festivals

    if from_date is not None:
        try:
            start = date.fromisoformat(from_date)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
    else:
        from datetime import datetime as _dt
        start = _dt.now(ZoneInfo(location.timezone)).date()
    window_end = start + timedelta(days=days)

    seen: dict[str, Any] = {}
    for bs_year in (start.year + 56, start.year + 57, start.year + 58):
        try:
            payload = get_bs_festivals(bs_year, location)
        except FestivalCacheMissError:
            continue
        for f in payload["festivals"]:
            f_start = date.fromisoformat(f["start_date"])
            f_end = date.fromisoformat(f["end_date"])
            if f_end < start or f_start > window_end:
                continue
            if holidays_only and not f.get("is_public_holiday"):
                continue
            key = f["id"] + f["start_date"]
            seen[key] = {**f, "days_until": (f_start - start).days}

    festivals = sorted(seen.values(), key=lambda f: f["start_date"])[:limit]
    enriched = _enrich_holiday_bs_dates(festivals)
    return {
        "from": start.isoformat(),
        "days": days,
        "count": len(enriched),
        "festivals": enriched,
    }


@router.get("/nepal/panchanga/{date_key}")
def nepal_panchanga_day(
    date_key: str,
    location: LocationDep,
    era: EraQuery = "bs",
    format: Literal["raw", "surya", "toyanath", "canonical", "patro", "dayblock"] = Query(
        "surya", description="Presentation style"),
    variant: Literal["default", "nepal_official", "toyanath", "surya"] = Query("default"),
    locale: Literal["en", "ne"] = Query("en", description="dayblock locale: en or ne"),
    output: Literal["json", "text"] = Query("json"),
):
    """Combined daily panchanga + festivals + public holiday status."""
    from app.day_resolver import civil_day_for_date_key
    from engine.astronomy.jd_calendar import date_if_supported
    from engine.vedic.bikram_sambat import locate_patro_day_for_civil

    civil = civil_day_for_date_key(date_key, era)
    if civil is None:
        raise HTTPException(
            status_code=400,
            detail=f"{date_key!r} is not a date this era can read",
        )

    greg = date_if_supported(civil.year, civil.month, civil.day)
    if greg is None:
        # Pre-1 CE: the signed patro axis carries the day, and the CE-only
        # lunar/festival engines stub out — same split build_daily_panchanga_at_jd
        # makes one layer down.
        py, pm, pd = locate_patro_day_for_civil(civil)
        state = build_daily_state_civil(
            civil,
            location,
            patro_bs_year=py,
            patro_bs_month=pm,
            patro_bs_day=pd,
            include_festivals=True,
            include_detail=False,
        )
    else:
        state = build_daily_state(
            greg, location, include_festivals=True, include_detail=False
        )
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
    # Not widened to bc/bbs: build_sankranti_day_response takes a datetime.date
    # and labels it through gregorian_to_bs, so it is CE-only at the *builder*,
    # not at this signature. Declaring eras it would 400 on would be worse than
    # declaring the truth — see docs/computation-architecture-audit.md.
    era: Literal["bs", "ad"] = Query("bs"),
):
    """Sankrantis occurring on or near a given date."""
    from engine.vedic.sankranti_calendar import build_sankranti_day_response
    try:
        greg = greg_date_for_date_key(date_key, era)
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
def nepal_special_months(bs_year: int, location: LocationDep, request: Request):
    """Adhik Maas and Kshaya Maas info for a BS year."""
    _validate_bs_year(bs_year)
    from services.holiday_generator import get_special_months_for_bs_year
    from services.response_cache import (
        bs_year_cache_control,
        location_cache_key,
        serve_cached_json,
    )

    # Deterministic per (year, location) — the adhik/kshaya reckoning is fixed
    # astronomy, so cache + persist rather than recompute the lunar year each view.
    key = f"specialmonths_{bs_year}_{location_cache_key(location)}"
    return serve_cached_json(
        request, key,
        lambda: get_special_months_for_bs_year(bs_year, location),
        cache_control=bs_year_cache_control(bs_year),
    )


@router.get("/calendar/header/{bs_year}/{bs_month}")
def calendar_header(bs_year: int, bs_month: int, location: LocationDep):
    """Multi-era calendar header (BS, AD, lunar, Shaka, Nepal Sambat)."""
    _validate_bs_year(bs_year)
    _validate_bs_month(bs_month)
    try:
        return build_calendar_header(bs_year, bs_month, location)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
