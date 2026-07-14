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

from fastapi import APIRouter, HTTPException, Query

from api.deps import LocationDep
from engine.vedic.bikram_sambat import get_bs_month_length, get_bs_month_start
from services.element_api import (
    element_day,
    element_month,
    element_spans,
    list_elements,
)
from services.panchanga_api import resolve_panchanga_date

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
        greg = resolve_panchanga_date(date_key, era=era)
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
    start: date | None = Query(None, description="Range start (AD, YYYY-MM-DD)"),
    end: date | None = Query(None, description="Range end (AD, inclusive)"),
    bs_year: int | None = Query(None, description="BS year — with bs_month, spans that whole BS month"),
    bs_month: int | None = Query(None, ge=1, le=12, description="BS month (1–12)"),
):
    """Continuous begin→end spans of one element over a date range or a BS month."""
    if bs_year is not None and bs_month is not None:
        try:
            start = get_bs_month_start(bs_year, bs_month)
            end = start + timedelta(days=get_bs_month_length(bs_year, bs_month) - 1)
        except (ValueError, KeyError) as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
    if start is None or end is None:
        raise HTTPException(
            status_code=400,
            detail="Provide start & end (AD), or bs_year & bs_month.",
        )
    if end < start:
        raise HTTPException(status_code=400, detail="end must not precede start.")
    if (end - start).days > 400:
        raise HTTPException(status_code=400, detail="Range too large (max ~400 days).")
    try:
        return element_spans(name, start, end, location)
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
