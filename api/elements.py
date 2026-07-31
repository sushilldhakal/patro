"""Per-element panchanga routes — addressable slices for standalone pages.

* ``GET /panchanga/elements``                         → available elements
* ``GET /panchanga/element/{name}/day/{date_key}``    → one element, one day
* ``GET /panchanga/element/{name}/spans``             → begin→end list over a range

Registered before the generic ``/panchanga/{date_key}`` route so the static
``element(s)`` paths win.
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import Literal

from fastapi import APIRouter, HTTPException, Query, Request

from api.deps import LocationDep
from services.element_api import (
    element_day,
    element_month,
    element_spans,
    list_elements,
)
from app.day_resolver import greg_date_for_date_key

router = APIRouter(tags=["elements"])


@router.get("/panchanga/elements")
def panchanga_elements():
    """Elements addressable via the element/spans routes."""
    return {"elements": list_elements()}


@router.get("/panchanga/element/{name}/day/{date_key}")
def panchanga_element_day(
    name: str,
    date_key: str,
    location: LocationDep,
    era: Literal["bs", "ad"] = Query("ad", description="Date era of date_key"),
):
    """A single element's block for one day (thin slice of the daily payload)."""
    try:
        greg = greg_date_for_date_key(date_key, era)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    try:
        return element_day(name, greg, location)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/panchanga/element/{name}/spans")
def panchanga_element_spans(
    name: str,
    location: LocationDep,
    request: Request,
    start_jd: float | None = Query(None, description="Range start as Julian Day (0h UT)"),
    end_jd: float | None = Query(None, description="Range end as Julian Day (0h UT, inclusive)"),
):
    """Continuous begin→end spans of one element over a Julian Day range.

    The range arrives as Julian Days, never as calendar strings. ``start``/``end``
    used to be ``datetime.date`` query params, which rejected every pre-1 CE range
    outright ("invalid character in year" on ``-0037-06-19``) — a whole era of the
    axis was unreachable because of a parameter type. ``era`` + ``year`` + ``month``
    on the query string is resolved to a JD span by ``EraMiddleware``.
    """
    from engine.astronomy.jd_calendar import CivilDay, civil_day_add

    ctx = getattr(request.state, "era_ctx", None)

    # Preferred: the era middleware already resolved era+year+month to a span.
    if start_jd is None and end_jd is None and ctx is not None and ctx.julian is not None:
        start_jd = ctx.julian
        if ctx.julian_end is not None:
            end_jd = ctx.julian_end
        elif ctx.month is not None:
            from engine.calendar.era import to_jd

            # The month came in written in the *input* calendar, so the month
            # after it must be found in that same one. Using the display era here
            # would silently walk a different calendar's month boundary.
            span_era = ctx.input_era or ctx.era
            try:
                next_month = (
                    to_jd(span_era, ctx.year, ctx.month + 1, 1)
                    if ctx.month < 12
                    else to_jd(span_era, (ctx.year or 0) + 1, 1, 1)
                )
                end_jd = civil_day_add(next_month, -1)
            except ValueError as exc:
                raise HTTPException(status_code=400, detail=str(exc)) from exc

    if start_jd is None or end_jd is None:
        raise HTTPException(
            status_code=400,
            detail="Provide start_jd & end_jd, or era + year + month.",
        )
    if end_jd < start_jd:
        raise HTTPException(status_code=400, detail="end must not precede start.")
    if (end_jd - start_jd) > 400:
        raise HTTPException(status_code=400, detail="Range too large (max ~400 days).")
    # Hand back a real ``date`` whenever the JD is CE, so the existing CE path
    # runs on ``datetime`` exactly as before; only pre-1 CE days travel as
    # ``CivilDay`` and pick up the JD-backed instant handling.
    from engine.astronomy.jd_calendar import date_if_supported

    def _bound(jd: float):
        civil = CivilDay.from_jd_ut(jd)
        return date_if_supported(civil.year, civil.month, civil.day) or civil

    try:
        return element_spans(name, _bound(start_jd), _bound(end_jd), location)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except TypeError as exc:  # table element asked for spans
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/panchanga/element/{name}/month/{bs_year}/{bs_month}")
def panchanga_element_month(
    name: str,
    bs_year: int,
    bs_month: int,
    location: LocationDep,
):
    """One element's per-day table across a whole BS month (e.g. lagna/chandrabala month view)."""
    if not 1 <= bs_month <= 12:
        raise HTTPException(status_code=400, detail="bs_month must be 1–12.")
    try:
        return element_month(name, bs_year, bs_month, location)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
