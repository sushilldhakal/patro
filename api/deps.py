"""Shared FastAPI dependencies and helper utilities for all routers."""

from __future__ import annotations

from datetime import date
from typing import Annotated, Any, Literal

from fastapi import Depends, HTTPException, Query

from engine.astronomy.location import ObserverLocation, resolve_location_from_query
from engine.vedic.bikram_sambat import format_bs_date, gregorian_to_bs


def location_params(
    lat: float | None = Query(None, description="Observer latitude (−90 to 90)"),
    lon: float | None = Query(None, description="Observer longitude (−180 to 180)"),
    timezone: str | None = Query(None, description="IANA timezone (e.g. Asia/Kathmandu)"),
    city: str | None = Query(None, description="City name — resolves lat/lon/timezone from GeoNames SQLite DB"),
    city_id: int | None = Query(None, description="GeoNames city id (overrides city name)"),
) -> ObserverLocation:
    try:
        return resolve_location_from_query(lat=lat, lon=lon, timezone=timezone, city=city, city_id=city_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


LocationDep = Annotated[ObserverLocation, Depends(location_params)]

# Every era the engine can compute. Routes used to declare their own narrow
# subsets — bs|ad here, bs|bbs|ad there — which was a fair description of the
# builders back when each era had its own forked builder. Phase 3 merged those,
# so the subsets became arbitrary: a request for era=bbs was rejected by a
# Literal before reaching a builder that would have answered it fine.
ERA_CODES = ("ad", "bc", "bs", "bbs")
EraCode = Literal["ad", "bc", "bs", "bbs"]
EraQuery = Annotated[
    EraCode,
    Query(description="Calendar era for the date: ad, bc, bs or bbs"),
]


def validated_year_span_jd(request, era: str, year: int) -> tuple[float, float]:
    """Inclusive ``(first_day_jd, last_day_jd)`` for era + year, range-checked.

    Prefers the span ``EraMiddleware`` already resolved for this request. The
    range check is on the *Julian Days*, not on a per-era year number: that is
    the one question every era can be asked, and it is the question that
    actually matters — whether the installed ``.se1`` files cover the span.
    """
    from app.era_middleware import era_context
    from engine.calendar.era import year_span_jd
    from engine.vedic.patro_year_axis import (
        EPHEMERIS_JD_MAX,
        EPHEMERIS_JD_MIN,
        jd_span_within_ephemeris,
    )

    ctx = getattr(request.state, "era_ctx", None)
    if ctx is not None and ctx.julian is not None and ctx.julian_end is not None:
        jd_start, jd_end = float(ctx.julian), float(ctx.julian_end)
    else:
        try:
            jd_start, jd_end = year_span_jd(era, year)
        except (ValueError, OverflowError) as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    if not jd_span_within_ephemeris(jd_start, jd_end):
        raise HTTPException(
            status_code=400,
            detail=(
                f"{era} year {year} falls outside the ephemeris files installed on "
                f"this host (JD {EPHEMERIS_JD_MIN} .. {EPHEMERIS_JD_MAX})"
            ),
        )
    return jd_start, jd_end


def gregorian_range_from_jd_span(jd_start: float, jd_end: float) -> dict[str, str]:
    """Inclusive civil ISO endpoints for a Julian Day span (BCE-safe)."""
    from engine.astronomy.jd_calendar import civil_parts_from_jd_ut, format_civil_iso

    sy, sm, sd = civil_parts_from_jd_ut(float(jd_start))
    ey, em, ed = civil_parts_from_jd_ut(float(jd_end))
    return {
        "start": format_civil_iso(sy, sm, sd),
        "end": format_civil_iso(ey, em, ed),
    }


def stamp_year_era(
    payload: dict,
    era: str,
    year: int,
    *,
    jd_start: float | None = None,
    jd_end: float | None = None,
) -> dict:
    """Re-apply the year/era labels the per-era builders used to add.

    The span builders are era-free by design, but these fields are part of the
    published payload. ``bs``/``bbs`` keep their existing spelling — ``era: "bs"``
    with a *signed* ``bs_year`` (negative for bbs) — because clients already read
    it that way. ``ad``/``bc`` echo the requested era with a positive year, which
    is the rule the rest of the era surface follows: the era carries the sign.
    """
    if era in ("ad", "bc"):
        payload["ad_year"] = year
        payload["era"] = era
    else:
        payload["bs_year"] = _signed_bs_year_from_browse(era, year)
        payload["era"] = "bs"
    if jd_start is not None and jd_end is not None:
        payload["gregorian_range"] = gregorian_range_from_jd_span(jd_start, jd_end)
    return payload


def _validate_bbs_url_year(url_year: int) -> None:
    from engine.vedic.patro_year_axis import PATRO_EPHEMERIS_SIGNED_MIN

    bbs_max = -PATRO_EPHEMERIS_SIGNED_MIN
    if url_year < 1 or url_year > bbs_max:
        raise HTTPException(
            status_code=400,
            detail=f"bbs url year must be 1..{bbs_max} (पू. वि.सं.)",
        )


def _signed_bs_year_from_browse(era: Literal["bs", "bbs"], url_year: int) -> int:
    """Map share URL era+year to signed patro axis (−200 for era=bbs&year=200)."""
    if era == "bbs":
        _validate_bbs_url_year(url_year)
        signed = -url_year
        _validate_bs_year(signed)
        return signed
    _validate_bs_year(url_year)
    return url_year


def _validate_bs_year(year: int) -> None:
    from engine.vedic.patro_year_axis import (
        PATRO_SIGNED_YEAR_MAX,
        PATRO_SIGNED_YEAR_MIN,
        validate_patro_signed_year,
    )

    try:
        validate_patro_signed_year(year)
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=(
                f"year must be a signed patro year "
                f"({PATRO_SIGNED_YEAR_MIN}..-1 = BBS, 1..{PATRO_SIGNED_YEAR_MAX} = BS; 0 invalid)"
            ),
        ) from exc


def _validate_bs_month(month: int) -> None:
    if not 1 <= month <= 12:
        raise HTTPException(status_code=400, detail="month must be 1..12")


def _enrich_holiday_bs_dates(holidays: list[dict[str, Any]]) -> list[dict[str, Any]]:
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
    location: ObserverLocation,
    *,
    cache_only: bool = False,
) -> list[dict[str, Any]]:
    from services.holiday_generator import HolidayCacheMissError, get_bs_holidays
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
    return sorted(seen.values(), key=lambda h: h["start_date"])
