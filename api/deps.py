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


def _validate_bs_year(year: int) -> None:
    from engine.vedic.constants import BS_ESTIMATED_MIN_YEAR, BS_SUPPORTED_MAX_YEAR
    if not BS_ESTIMATED_MIN_YEAR <= year <= BS_SUPPORTED_MAX_YEAR:
        raise HTTPException(
            status_code=400,
            detail=f"year must be a BS year between {BS_ESTIMATED_MIN_YEAR} and {BS_SUPPORTED_MAX_YEAR}",
        )


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
    cache_only: bool = True,
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
