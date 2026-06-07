"""Generate holiday lists for Gregorian and Bikram Sambat years."""

from __future__ import annotations

import json
from calendar import monthrange
from datetime import date, timedelta
from functools import lru_cache
from pathlib import Path
from typing import Any

from core.location import DEFAULT_LOCATION, ObserverLocation
from panchanga.bikram_sambat import (
    bs_year_date_range,
    get_bs_month_length,
    get_bs_month_start,
)
from panchanga.tithi import get_udaya_tithi
from rules.engine import bs_year_for_gregorian, compute_festival_dates
from service.cache_meta import cache_is_valid, stamp_payload


class HolidayCacheMissError(LookupError):
    """Raised when a BS-year holiday cache file has not been precomputed."""

RULES_PATH = Path(__file__).resolve().parent.parent / "rules" / "festival_rules_v3.json"
CACHE_DIR = Path(__file__).resolve().parent.parent / "cache"


@lru_cache(maxsize=8)
def load_rules() -> dict[str, dict[str, Any]]:
    with open(RULES_PATH, encoding="utf-8") as f:
        data = json.load(f)
    return data["festivals"]


def _build_holiday_entry(
    festival_id: str,
    rule: dict[str, Any],
    start_date: date,
    end_date: date,
) -> dict[str, Any]:
    duration = (end_date - start_date).days + 1
    return {
        "id": festival_id,
        "name_en": rule.get("name_en", festival_id),
        "name_ne": rule.get("name_ne"),
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "duration_days": duration,
        "type": rule.get("type", "lunar"),
        "category": rule.get("category"),
        "importance": rule.get("importance"),
        "notes": rule.get("notes"),
    }


def generate_holidays(
    gregorian_year: int,
    location: ObserverLocation = DEFAULT_LOCATION,
) -> dict[str, Any]:
    rules = load_rules()
    holidays: list[dict[str, Any]] = []

    for festival_id, rule in rules.items():
        dates = compute_festival_dates(festival_id, rule, gregorian_year, location)
        if dates is None:
            continue

        start_date, end_date = dates
        if start_date.year != gregorian_year and end_date.year != gregorian_year:
            continue

        holidays.append(_build_holiday_entry(festival_id, rule, start_date, end_date))

    holidays.sort(key=lambda h: h["start_date"])

    payload = {
        "year": gregorian_year,
        "bs_year": bs_year_for_gregorian(gregorian_year),
        "location": location.as_dict(),
        "count": len(holidays),
        "holidays": holidays,
    }
    return stamp_payload(payload, location.cache_key())


def cache_path(gregorian_year: int, location_key: str) -> Path:
    safe_key = location_key.replace("/", "_")
    return CACHE_DIR / f"holidays_{gregorian_year}_{safe_key}.json"


def bs_cache_path(bs_year: int, location_key: str) -> Path:
    safe_key = location_key.replace("/", "_")
    return CACHE_DIR / f"holidays_bs_{bs_year}_{safe_key}.json"


def load_cached(gregorian_year: int, location: ObserverLocation) -> dict[str, Any] | None:
    path = cache_path(gregorian_year, location.cache_key())
    if not path.exists():
        return None
    with open(path, encoding="utf-8") as f:
        cached = json.load(f)
    if not cache_is_valid(cached, location.cache_key()):
        return None
    return cached


def save_cache(payload: dict[str, Any], location: ObserverLocation) -> None:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    path = cache_path(payload["year"], location.cache_key())
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)


def load_bs_cached(bs_year: int, location: ObserverLocation) -> dict[str, Any] | None:
    path = bs_cache_path(bs_year, location.cache_key())
    if not path.exists():
        return None
    with open(path, encoding="utf-8") as f:
        cached = json.load(f)
    if not cache_is_valid(cached, location.cache_key()):
        return None
    return cached


def save_bs_cache(payload: dict[str, Any], location: ObserverLocation) -> None:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    path = bs_cache_path(payload["bs_year"], location.cache_key())
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)


def _merge_bs_year_holidays(
    bs_year: int,
    gregorian_payloads: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    year_start, year_end = bs_year_date_range(bs_year)
    merged: dict[str, dict[str, Any]] = {}

    for payload in gregorian_payloads:
        for holiday in payload["holidays"]:
            start = date.fromisoformat(holiday["start_date"])
            end = date.fromisoformat(holiday["end_date"])
            if start <= year_end and end >= year_start:
                merged[holiday["id"]] = holiday

    return sorted(merged.values(), key=lambda h: h["start_date"])


def generate_bs_holidays(
    bs_year: int,
    location: ObserverLocation = DEFAULT_LOCATION,
) -> dict[str, Any]:
    """Compute BS-year holidays (runs Swiss Ephemeris for underlying Gregorian years)."""
    year_start, year_end = bs_year_date_range(bs_year)
    gregorian_years = sorted({year_start.year, year_end.year})
    gregorian_payloads = [generate_holidays(year, location) for year in gregorian_years]

    for payload in gregorian_payloads:
        save_cache(payload, location)

    holidays = _merge_bs_year_holidays(bs_year, gregorian_payloads)
    payload = {
        "bs_year": bs_year,
        "gregorian_range": {
            "start": year_start.isoformat(),
            "end": year_end.isoformat(),
        },
        "location": location.as_dict(),
        "count": len(holidays),
        "holidays": holidays,
    }
    return stamp_payload(payload, location.cache_key())


def precompute_bs_year(
    bs_year: int,
    location: ObserverLocation = DEFAULT_LOCATION,
) -> dict[str, Any]:
    """Generate and persist BS-year cache (and underlying Gregorian caches)."""
    payload = generate_bs_holidays(bs_year, location)
    save_bs_cache(payload, location)
    return payload


def get_bs_holidays(
    bs_year: int,
    location: ObserverLocation = DEFAULT_LOCATION,
    *,
    cache_only: bool = False,
    bs_month: int | None = None,
) -> dict[str, Any]:
    payload = load_bs_cached(bs_year, location)

    if payload is None:
        if cache_only:
            raise HolidayCacheMissError(
                f"Holiday cache missing for BS {bs_year}. "
                f"POST /generate/{bs_year} first."
            )
        payload = precompute_bs_year(bs_year, location)

    if bs_month is not None:
        filtered = filter_holidays_by_bs_month(payload["holidays"], bs_year, bs_month)
        return {
            **payload,
            "bs_month": bs_month,
            "count": len(filtered),
            "holidays": filtered,
        }

    return payload


def filter_holidays_by_bs_month(
    holidays: list[dict[str, Any]],
    bs_year: int,
    bs_month: int,
) -> list[dict[str, Any]]:
    """Return festivals whose date range overlaps the given BS month."""
    month_start = get_bs_month_start(bs_year, bs_month)
    month_end = month_start + timedelta(days=get_bs_month_length(bs_year, bs_month) - 1)

    result = []
    for holiday in holidays:
        start = date.fromisoformat(holiday["start_date"])
        end = date.fromisoformat(holiday["end_date"])
        if start <= month_end and end >= month_start:
            result.append(holiday)
    return result


def get_holidays(
    gregorian_year: int,
    location: ObserverLocation = DEFAULT_LOCATION,
    *,
    use_cache: bool = True,
    month: int | None = None,
) -> dict[str, Any]:
    payload: dict[str, Any] | None = None

    if use_cache:
        payload = load_cached(gregorian_year, location)

    if payload is None:
        payload = generate_holidays(gregorian_year, location)
        save_cache(payload, location)

    if month is not None:
        filtered = filter_holidays_by_month(payload["holidays"], gregorian_year, month)
        return {
            **payload,
            "month": month,
            "count": len(filtered),
            "holidays": filtered,
        }

    return payload


def filter_holidays_by_month(
    holidays: list[dict[str, Any]],
    year: int,
    month: int,
) -> list[dict[str, Any]]:
    """Return festivals whose date range overlaps the given Gregorian month."""
    _, last_day = monthrange(year, month)
    month_start = date(year, month, 1)
    month_end = date(year, month, last_day)

    result = []
    for holiday in holidays:
        start = date.fromisoformat(holiday["start_date"])
        end = date.fromisoformat(holiday["end_date"])
        if start <= month_end and end >= month_start:
            result.append(holiday)
    return result


def holidays_on_date(
    target: date,
    location: ObserverLocation = DEFAULT_LOCATION,
) -> dict[str, Any]:
    """Festivals active on a specific day (supports multi-day ranges)."""
    year_payload = get_holidays(target.year, location)
    active = [
        h
        for h in year_payload["holidays"]
        if date.fromisoformat(h["start_date"]) <= target <= date.fromisoformat(h["end_date"])
    ]

    udaya = get_udaya_tithi(target, location)
    panchanga = {
        "tithi": udaya["tithi"],
        "paksha": udaya["paksha"],
        "name": udaya["name"],
    }

    return stamp_payload(
        {
            "date": target.isoformat(),
            "location": location.as_dict(),
            "panchanga": panchanga,
            "count": len(active),
            "holidays": active,
        },
        location.cache_key(),
    )


def precompute_range(
    start_year: int,
    end_year: int,
    location: ObserverLocation = DEFAULT_LOCATION,
) -> list[Path]:
    """Pre-generate cache files for a year range (cron-friendly)."""
    written: list[Path] = []
    for year in range(start_year, end_year + 1):
        payload = generate_holidays(year, location)
        save_cache(payload, location)
        written.append(cache_path(year, location.cache_key()))
    return written
