"""Sankranti calendar — exact solar ingress timestamps for festivals and BS months."""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Any

from core.location import DEFAULT_LOCATION, ObserverLocation
from core.time_utils import resolve_observer_timezone
from panchanga.bikram_sambat import _sankranti_start_date, gregorian_to_bs
from panchanga.names_ne import to_nepali_digits
from panchanga.sankranti import (
    BS_MONTH_NAMES,
    RASHI_NAMES,
    find_sankranti,
    get_sun_rashi_at_time,
)

RASHI_NAMES_NE = [
    "मेष", "वृष", "मिथुन", "कर्कट", "सिंह", "कन्या",
    "तुला", "वृश्चिक", "धनु", "मकर", "कुम्भ", "मीन",
]

SANKRANTI_FESTIVALS: dict[int, dict[str, str]] = {
    0: {"id": "mesh-sankranti", "name_en": "Mesh Sankranti (Nepali New Year)", "name_ne": "मेष संक्रान्ति"},
    9: {"id": "maghe-sankranti", "name_en": "Maghe Sankranti", "name_ne": "माघे संक्रान्ति"},
}


def _format_timestamp(dt: datetime, timezone_name: str) -> dict[str, str]:
    tz = resolve_observer_timezone(timezone_name)
    local = dt.astimezone(tz)
    return {
        "utc": dt.isoformat(),
        "local": local.isoformat(),
        "local_time": local.strftime("%H:%M:%S"),
        "local_date": local.date().isoformat(),
        "local_display": local.strftime("%Y-%m-%d %H:%M"),
    }


def format_sankranti_entry(
    dt: datetime,
    to_rashi: int,
    *,
    timezone_name: str = DEFAULT_LOCATION.timezone,
) -> dict[str, Any]:
    """Structured sankranti record with BS month boundary convention."""
    bs_month_start = _sankranti_start_date(dt)
    bs_year, bs_month, _ = gregorian_to_bs(bs_month_start)
    festival = SANKRANTI_FESTIVALS.get(to_rashi)

    return {
        "to_rashi_index": to_rashi,
        "to_rashi": RASHI_NAMES[to_rashi],
        "to_rashi_ne": RASHI_NAMES_NE[to_rashi],
        "from_rashi": RASHI_NAMES[(to_rashi - 1) % 12],
        "from_rashi_ne": RASHI_NAMES_NE[(to_rashi - 1) % 12],
        "bs_month_name": BS_MONTH_NAMES[to_rashi],
        "bs_month_index": to_rashi + 1,
        "bs_month_start_date": bs_month_start.isoformat(),
        "bs_year_at_start": bs_year,
        "bs_month_at_start": bs_month,
        "timestamp": _format_timestamp(dt, timezone_name),
        "festival": festival,
    }


def list_sankrantis_for_year(
    ad_year: int,
    *,
    timezone_name: str = DEFAULT_LOCATION.timezone,
) -> list[dict[str, Any]]:
    """All solar ingresses (Sankrantis) in a Gregorian year with exact timestamps."""
    search = datetime(ad_year, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
    end = datetime(ad_year, 12, 31, 23, 59, 59, tzinfo=timezone.utc)
    results: list[dict[str, Any]] = []
    cursor = search

    while cursor <= end:
        current_rashi = get_sun_rashi_at_time(cursor)
        next_rashi = (current_rashi + 1) % 12
        dt = find_sankranti(next_rashi, cursor, max_days=45)
        if dt is None or dt > end:
            break
        if dt.year == ad_year:
            results.append(format_sankranti_entry(dt, next_rashi, timezone_name=timezone_name))
        cursor = dt + timedelta(minutes=2)

    return results


def sankrantis_on_date(
    target: date,
    *,
    timezone_name: str = DEFAULT_LOCATION.timezone,
    window_hours: int = 24,
) -> list[dict[str, Any]]:
    """Sankrantis occurring on or within window_hours of a civil date."""
    day_start = datetime(target.year, target.month, target.day, tzinfo=timezone.utc)
    window_start = day_start - timedelta(hours=window_hours)
    window_end = day_start + timedelta(days=1, hours=window_hours)

    year_events = list_sankrantis_for_year(target.year, timezone_name=timezone_name)
    if target.month == 1:
        year_events = list_sankrantis_for_year(target.year - 1, timezone_name=timezone_name) + year_events
    if target.month == 12:
        year_events = year_events + list_sankrantis_for_year(target.year + 1, timezone_name=timezone_name)

    matched: list[dict[str, Any]] = []
    seen: set[str] = set()
    for event in year_events:
        utc = datetime.fromisoformat(event["timestamp"]["utc"])
        if window_start <= utc <= window_end:
            key = event["timestamp"]["utc"]
            if key not in seen:
                seen.add(key)
                matched.append(event)
    return matched


def build_sankranti_year_response(
    ad_year: int,
    location: ObserverLocation = DEFAULT_LOCATION,
) -> dict[str, Any]:
    sankrantis = list_sankrantis_for_year(ad_year, timezone_name=location.timezone)
    return {
        "ad_year": ad_year,
        "count": len(sankrantis),
        "location": location.as_dict(),
        "sankrantis": sankrantis,
        "notes": (
            "Exact sidereal solar ingress (Lahiri ayanamsa). "
            "bs_month_start_date follows Nepal convention: sankranti day if before local sunrise, else next day."
        ),
    }


def build_sankranti_day_response(
    target: date,
    location: ObserverLocation = DEFAULT_LOCATION,
) -> dict[str, Any]:
    bs_year, bs_month, bs_day = gregorian_to_bs(target)
    events = sankrantis_on_date(target, timezone_name=location.timezone)
    return {
        "date_ad": target.isoformat(),
        "date_bs": f"{bs_year}-{bs_month:02d}-{bs_day:02d}",
        "date_bs_ne": (
            f"वि.सं. {to_nepali_digits(bs_year)} "
            f"{BS_MONTH_NAMES[bs_month - 1]} {to_nepali_digits(bs_day)}"
        ),
        "location": location.as_dict(),
        "sankrantis": events,
        "is_sankranti_day": len(events) > 0,
    }
