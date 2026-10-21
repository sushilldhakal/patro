"""Panchanga Patro — month and year aggregation."""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any

from engine.astronomy.location import DEFAULT_LOCATION, ObserverLocation
from engine.calendar.bikram_sambat import (
    bs_month_name,
    gregorian_to_bs,
    bs_year_date_range,
    get_bs_month_length,
    get_bs_month_start,
    iter_bs_month_days,
)
from services.panchanga.daily_panchanga import get_daily_panchanga
from engine.festivals.occurrence import occurrence_key, row_covers
from services.platform.cache_meta import stamp_payload
from services.festivals.holiday_generator import filter_redundant_day_festivals, get_bs_festivals


def festivals_for_day(all_holidays: list[dict], target: date) -> list[dict]:
    return filter_redundant_day_festivals([row for row in all_holidays if row_covers(row, target)])


def collect_bs_year_festivals(bs_year: int, location: ObserverLocation) -> list[dict]:
    payload = get_bs_festivals(bs_year, location)
    return payload["festivals"]


def generate_ad_month_patro(
    ad_year: int,
    ad_month: int,
    location: ObserverLocation = DEFAULT_LOCATION,
) -> dict[str, Any]:
    """Festival patro for one AD (Gregorian) month: every day's panchanga and
    the festivals active on it. A month can straddle two BS years (Baishakh 1
    falls in April), so both years' festivals are read and each occurrence kept once."""
    import calendar as _calendar

    if not 1 <= ad_month <= 12:
        raise ValueError("ad_month must be 1..12")
    month_start = date(ad_year, ad_month, 1)
    month_end = date(ad_year, ad_month, _calendar.monthrange(ad_year, ad_month)[1])
    bs_years = sorted({gregorian_to_bs(month_start)[0], gregorian_to_bs(month_end)[0]})

    # The same festival recurs in each BS year (its new year, its Dashain), so
    # an occurrence is its id *and* its date — by id alone, April kept BS
    # 2082's entries and lost 2083's Baishakh 1.
    festivals: list[dict] = []
    seen: set[tuple[str, str]] = set()
    for bs_year in bs_years:
        for festival in collect_bs_year_festivals(bs_year, location):
            occurrence = occurrence_key(festival)
            if occurrence not in seen:
                seen.add(occurrence)
                festivals.append(festival)

    days = []
    current = month_start
    while current <= month_end:
        days.append({
            "date_ad": current.isoformat(),
            **get_daily_panchanga(current, location),
            "festivals": festivals_for_day(festivals, current),
        })
        current += timedelta(days=1)

    return {"ad_year": ad_year, "ad_month": ad_month, "count": len(days), "days": days}


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
    festivals = collect_bs_year_festivals(bs_year, location)
    mid_panchanga = get_daily_panchanga(month_mid, location)
    lunar = mid_panchanga["lunar_month"]

    days: list[dict[str, Any]] = []
    for bs_day, greg in iter_bs_month_days(bs_year, bs_month):
        entry: dict[str, Any] = {
            "bs_day": bs_day,
            "date": greg.isoformat(),
            "festivals": festivals_for_day(festivals, greg),
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
    festivals = collect_bs_year_festivals(bs_year, location)

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
