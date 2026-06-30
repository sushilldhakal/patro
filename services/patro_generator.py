"""Panchanga Patro — month and year aggregation."""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any

from engine.astronomy.location import DEFAULT_LOCATION, ObserverLocation
from engine.vedic.bikram_sambat import (
    bs_month_name,
    bs_year_date_range,
    get_bs_month_length,
    get_bs_month_start,
    iter_bs_month_days,
)
from engine.vedic.daily import get_daily_panchanga
from services.cache_meta import stamp_payload
from services.holiday_generator import get_bs_festivals, get_festivals


def _festivals_for_day(all_holidays: list[dict], target: date) -> list[dict]:
    active = []
    for holiday in all_holidays:
        start = date.fromisoformat(holiday["start_date"])
        end = date.fromisoformat(holiday["end_date"])
        if start <= target <= end:
            active.append(holiday)
    return active


def _collect_bs_year_festivals(bs_year: int, location: ObserverLocation) -> list[dict]:
    try:
        payload = get_bs_festivals(bs_year, location, cache_only=True)
        return payload["festivals"]
    except LookupError:
        pass

    year_start, year_end = bs_year_date_range(bs_year)
    gregorian_years = {year_start.year, year_end.year}
    merged: dict[str, dict] = {}

    for greg_year in sorted(gregorian_years):
        payload = get_festivals(greg_year, location)
        for festival in payload["festivals"]:
            start = date.fromisoformat(festival["start_date"])
            end = date.fromisoformat(festival["end_date"])
            if start <= year_end and end >= year_start:
                merged[festival["id"]] = festival

    return sorted(merged.values(), key=lambda h: h["start_date"])


def generate_bs_month_patro(
    bs_year: int,
    bs_month: int,
    location: ObserverLocation = DEFAULT_LOCATION,
    *,
    include_panchanga: bool = True,
) -> dict[str, Any]:
    """Full Patro view for one Bikram Sambat month."""
    if not 1 <= bs_month <= 12:
        raise ValueError("bs_month must be 1..12")

    month_start = get_bs_month_start(bs_year, bs_month)
    month_length = get_bs_month_length(bs_year, bs_month)
    month_mid = month_start + timedelta(days=min(14, month_length - 1))
    festivals = _collect_bs_year_festivals(bs_year, location)
    mid_panchanga = get_daily_panchanga(month_mid, location)
    lunar = mid_panchanga["lunar_month"]

    days: list[dict[str, Any]] = []
    for bs_day, greg in iter_bs_month_days(bs_year, bs_month):
        entry: dict[str, Any] = {
            "bs_day": bs_day,
            "date": greg.isoformat(),
            "festivals": _festivals_for_day(festivals, greg),
        }
        if include_panchanga:
            panchanga = get_daily_panchanga(greg, location)
            entry["panchanga"] = {
                "display": panchanga["display"],
                "vaara": panchanga["vaara"],
                "tithi": panchanga["tithi"],
                "nakshatra": panchanga["nakshatra"],
                "yoga": panchanga["yoga"],
                "karana": panchanga["karana"],
                "paksha": panchanga["paksha"],
                "chandra_rashi": panchanga["chandra_rashi"],
                "surya_rashi": panchanga["surya_rashi"],
                "ritu": panchanga["ritu"],
                "aayan": panchanga["aayan"],
                "dinamaan": panchanga["dinamaan"],
                "lunar_month": panchanga["lunar_month"],
                "ns_date": panchanga["ns_date"],
                "markers": panchanga["markers"],
                "sunrise": panchanga["sunrise"],
                "sunset": panchanga["sunset"],
                "moonrise": panchanga["moonrise"],
                "moonset": panchanga["moonset"],
            }
        days.append(entry)

    payload = {
        "bs_year": bs_year,
        "bs_month": bs_month,
        "bs_month_name": bs_month_name(bs_month),
        "bs_month_name_ne": bs_month_name(bs_month, nepali=True),
        "month_start": month_start.isoformat(),
        "month_length": month_length,
        "lunar_month": lunar.get("name"),
        "lunar_month_full": lunar.get("full_name"),
        "lunar_month_is_adhik": lunar.get("is_adhik", False),
        "lunar_month_type": lunar.get("type"),
        "location": location.as_dict(),
        "days": days,
    }
    return stamp_payload(payload, location.cache_key())


def generate_patro(
    bs_year: int,
    location: ObserverLocation = DEFAULT_LOCATION,
    *,
    include_panchanga: bool = True,
) -> dict[str, Any]:
    """Full Panchanga Patro for a Bikram Sambat year."""
    months = [
        generate_bs_month_patro(bs_year, m, location, include_panchanga=include_panchanga)
        for m in range(1, 13)
    ]
    year_start, year_end = bs_year_date_range(bs_year)
    festivals = _collect_bs_year_festivals(bs_year, location)

    payload = {
        "bs_year": bs_year,
        "gregorian_range": {
            "start": year_start.isoformat(),
            "end": year_end.isoformat(),
        },
        "location": location.as_dict(),
        "months": months,
        "festivals": festivals,
        "festival_count": len(festivals),
    }
    return stamp_payload(payload, location.cache_key())
