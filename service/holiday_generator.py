"""Generate festival and public-holiday lists for Gregorian and Bikram Sambat years."""

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


class FestivalCacheMissError(LookupError):
    """Raised when a BS-year festival cache file has not been precomputed."""


RULES_PATH = Path(__file__).resolve().parent.parent / "rules" / "festival_rules_v3.json"
PUBLIC_HOLIDAYS_PATH = Path(__file__).resolve().parent.parent / "rules" / "public_holidays_v1.json"
OVERRIDES_PATH = Path(__file__).resolve().parent.parent / "rules" / "holiday_overrides_v1.json"
CACHE_DIR = Path(__file__).resolve().parent.parent / "cache"


@lru_cache(maxsize=8)
def load_rules() -> dict[str, dict[str, Any]]:
    with open(RULES_PATH, encoding="utf-8") as f:
        data = json.load(f)
    return data["festivals"]


@lru_cache(maxsize=1)
def load_public_holiday_ids() -> frozenset[str]:
    if not PUBLIC_HOLIDAYS_PATH.exists():
        return frozenset()
    with open(PUBLIC_HOLIDAYS_PATH, encoding="utf-8") as f:
        data = json.load(f)
    return frozenset(data.get("holiday_ids", []))


def is_public_holiday(festival_id: str) -> bool:
    return festival_id in load_public_holiday_ids()


@lru_cache(maxsize=4)
def load_holiday_overrides() -> dict[str, dict[str, dict[str, Any]]]:
    if not OVERRIDES_PATH.exists():
        return {}
    with open(OVERRIDES_PATH, encoding="utf-8") as f:
        data = json.load(f)
    return data.get("bs_years", {})


def _build_festival_entry(
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
        "is_public_holiday": is_public_holiday(festival_id),
        "notes": rule.get("notes"),
    }


def _filter_public_holidays(entries: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [entry for entry in entries if is_public_holiday(entry["id"])]


def generate_festivals(
    gregorian_year: int,
    location: ObserverLocation = DEFAULT_LOCATION,
) -> dict[str, Any]:
    """All computed festivals/observances for a Gregorian year."""
    rules = load_rules()
    festivals: list[dict[str, Any]] = []

    for festival_id, rule in rules.items():
        dates = compute_festival_dates(festival_id, rule, gregorian_year, location)
        if dates is None:
            continue

        start_date, end_date = dates
        if start_date.year != gregorian_year and end_date.year != gregorian_year:
            continue

        festivals.append(_build_festival_entry(festival_id, rule, start_date, end_date))

    festivals.sort(key=lambda item: item["start_date"])

    payload = {
        "year": gregorian_year,
        "bs_year": bs_year_for_gregorian(gregorian_year),
        "location": location.as_dict(),
        "count": len(festivals),
        "festivals": festivals,
    }
    return stamp_payload(payload, location.cache_key())


def generate_holidays(
    gregorian_year: int,
    location: ObserverLocation = DEFAULT_LOCATION,
) -> dict[str, Any]:
    """Public holidays only — strict subset of festivals."""
    festival_payload = generate_festivals(gregorian_year, location)
    holidays = _filter_public_holidays(festival_payload["festivals"])
    payload = {
        **festival_payload,
        "count": len(holidays),
        "holidays": holidays,
    }
    payload.pop("festivals", None)
    return payload


def festivals_cache_path(gregorian_year: int, location_key: str) -> Path:
    safe_key = location_key.replace("/", "_")
    return CACHE_DIR / f"festivals_{gregorian_year}_{safe_key}.json"


def cache_path(gregorian_year: int, location_key: str) -> Path:
    safe_key = location_key.replace("/", "_")
    return CACHE_DIR / f"holidays_{gregorian_year}_{safe_key}.json"


def bs_festivals_cache_path(bs_year: int, location_key: str) -> Path:
    safe_key = location_key.replace("/", "_")
    return CACHE_DIR / f"festivals_bs_{bs_year}_{safe_key}.json"


def bs_cache_path(bs_year: int, location_key: str) -> Path:
    safe_key = location_key.replace("/", "_")
    return CACHE_DIR / f"holidays_bs_{bs_year}_{safe_key}.json"


def load_festivals_cached(gregorian_year: int, location: ObserverLocation) -> dict[str, Any] | None:
    path = festivals_cache_path(gregorian_year, location.cache_key())
    if not path.exists():
        return None
    with open(path, encoding="utf-8") as f:
        cached = json.load(f)
    if not cache_is_valid(cached, location.cache_key()):
        return None
    return cached


def save_festivals_cache(payload: dict[str, Any], location: ObserverLocation) -> None:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    path = festivals_cache_path(payload["year"], location.cache_key())
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)


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


def load_bs_festivals_cached(bs_year: int, location: ObserverLocation) -> dict[str, Any] | None:
    path = bs_festivals_cache_path(bs_year, location.cache_key())
    if not path.exists():
        return None
    with open(path, encoding="utf-8") as f:
        cached = json.load(f)
    if not cache_is_valid(cached, location.cache_key()):
        return None
    return cached


def save_bs_festivals_cache(payload: dict[str, Any], location: ObserverLocation) -> None:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    path = bs_festivals_cache_path(payload["bs_year"], location.cache_key())
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


def _merge_bs_year_festivals(
    bs_year: int,
    gregorian_payloads: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    year_start, year_end = bs_year_date_range(bs_year)
    merged: dict[str, dict[str, Any]] = {}

    for payload in gregorian_payloads:
        for festival in payload["festivals"]:
            start = date.fromisoformat(festival["start_date"])
            end = date.fromisoformat(festival["end_date"])
            if start <= year_end and end >= year_start:
                merged[festival["id"]] = festival

    return sorted(merged.values(), key=lambda item: item["start_date"])


def _apply_bs_year_overrides(
    bs_year: int,
    festivals: list[dict[str, Any]],
    *,
    public_only: bool = False,
) -> list[dict[str, Any]]:
    overrides = load_holiday_overrides().get(str(bs_year), {})
    merged = {festival["id"]: festival for festival in festivals}

    if overrides:
        rules = load_rules()
        for festival_id, override in overrides.items():
            if public_only and not is_public_holiday(festival_id):
                continue
            start_date = date.fromisoformat(override["start_date"])
            end_date = date.fromisoformat(override["end_date"])
            rule = {**rules.get(festival_id, {}), **override}
            merged[festival_id] = _build_festival_entry(
                festival_id,
                rule,
                start_date,
                end_date,
            )

    result = list(merged.values())
    if public_only:
        result = _filter_public_holidays(result)
    return sorted(result, key=lambda item: item["start_date"])


def generate_bs_festivals(
    bs_year: int,
    location: ObserverLocation = DEFAULT_LOCATION,
) -> dict[str, Any]:
    """Compute all festivals for a BS year."""
    year_start, year_end = bs_year_date_range(bs_year)
    gregorian_years = sorted({year_start.year, year_end.year})
    gregorian_payloads = [generate_festivals(year, location) for year in gregorian_years]

    for payload in gregorian_payloads:
        save_festivals_cache(payload, location)

    festivals = _apply_bs_year_overrides(
        bs_year,
        _merge_bs_year_festivals(bs_year, gregorian_payloads),
        public_only=False,
    )
    payload = {
        "bs_year": bs_year,
        "gregorian_range": {
            "start": year_start.isoformat(),
            "end": year_end.isoformat(),
        },
        "location": location.as_dict(),
        "count": len(festivals),
        "festivals": festivals,
    }
    return stamp_payload(payload, location.cache_key())


def generate_bs_holidays(
    bs_year: int,
    location: ObserverLocation = DEFAULT_LOCATION,
    *,
    festival_payload: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Compute public holidays for a BS year (subset of festivals)."""
    if festival_payload is None:
        festival_payload = generate_bs_festivals(bs_year, location)
        save_bs_festivals_cache(festival_payload, location)

    holidays = _apply_bs_year_overrides(
        bs_year,
        _filter_public_holidays(festival_payload["festivals"]),
        public_only=True,
    )

    payload = {
        "bs_year": bs_year,
        "gregorian_range": festival_payload["gregorian_range"],
        "location": location.as_dict(),
        "count": len(holidays),
        "holidays": holidays,
    }
    return stamp_payload(payload, location.cache_key())


def precompute_bs_year(
    bs_year: int,
    location: ObserverLocation = DEFAULT_LOCATION,
) -> dict[str, Any]:
    """Generate and persist BS-year festival + holiday caches."""
    festival_payload = generate_bs_festivals(bs_year, location)
    save_bs_festivals_cache(festival_payload, location)

    for gregorian_year in sorted(
        {date.fromisoformat(item["start_date"]).year for item in festival_payload["festivals"]}
    ):
        save_festivals_cache(generate_festivals(gregorian_year, location), location)
        save_cache(generate_holidays(gregorian_year, location), location)

    holiday_payload = generate_bs_holidays(bs_year, location, festival_payload=festival_payload)
    save_bs_cache(holiday_payload, location)
    return holiday_payload


def precompute_bs_range(
    start_bs_year: int,
    end_bs_year: int,
    location: ObserverLocation = DEFAULT_LOCATION,
    *,
    skip_existing: bool = True,
) -> list[int]:
    generated: list[int] = []
    for bs_year in range(start_bs_year, end_bs_year + 1):
        if skip_existing and load_bs_cached(bs_year, location) and load_bs_festivals_cached(bs_year, location):
            continue
        precompute_bs_year(bs_year, location)
        generated.append(bs_year)
    return generated


def get_bs_festivals(
    bs_year: int,
    location: ObserverLocation = DEFAULT_LOCATION,
    *,
    cache_only: bool = False,
    bs_month: int | None = None,
) -> dict[str, Any]:
    payload = load_bs_festivals_cached(bs_year, location)

    if payload is None:
        if cache_only:
            raise FestivalCacheMissError(
                f"Festival cache missing for BS {bs_year}. "
                f"POST /generate/{bs_year} first."
            )
        payload = generate_bs_festivals(bs_year, location)
        save_bs_festivals_cache(payload, location)

    if bs_month is not None:
        filtered = filter_festivals_by_bs_month(payload["festivals"], bs_year, bs_month)
        return {
            **payload,
            "bs_month": bs_month,
            "count": len(filtered),
            "festivals": filtered,
        }

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


def filter_festivals_by_bs_month(
    festivals: list[dict[str, Any]],
    bs_year: int,
    bs_month: int,
) -> list[dict[str, Any]]:
    month_start = get_bs_month_start(bs_year, bs_month)
    month_end = month_start + timedelta(days=get_bs_month_length(bs_year, bs_month) - 1)

    result = []
    for festival in festivals:
        start = date.fromisoformat(festival["start_date"])
        end = date.fromisoformat(festival["end_date"])
        if start <= month_end and end >= month_start:
            result.append(festival)
    return result


def filter_holidays_by_bs_month(
    holidays: list[dict[str, Any]],
    bs_year: int,
    bs_month: int,
) -> list[dict[str, Any]]:
    return filter_festivals_by_bs_month(holidays, bs_year, bs_month)


def get_festivals(
    gregorian_year: int,
    location: ObserverLocation = DEFAULT_LOCATION,
    *,
    use_cache: bool = True,
    month: int | None = None,
) -> dict[str, Any]:
    payload: dict[str, Any] | None = None

    if use_cache:
        payload = load_festivals_cached(gregorian_year, location)

    if payload is None:
        payload = generate_festivals(gregorian_year, location)
        save_festivals_cache(payload, location)

    if month is not None:
        filtered = filter_festivals_by_month(payload["festivals"], gregorian_year, month)
        return {
            **payload,
            "month": month,
            "count": len(filtered),
            "festivals": filtered,
        }

    return payload


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


def filter_festivals_by_month(
    festivals: list[dict[str, Any]],
    year: int,
    month: int,
) -> list[dict[str, Any]]:
    _, last_day = monthrange(year, month)
    month_start = date(year, month, 1)
    month_end = date(year, month, last_day)

    result = []
    for festival in festivals:
        start = date.fromisoformat(festival["start_date"])
        end = date.fromisoformat(festival["end_date"])
        if start <= month_end and end >= month_start:
            result.append(festival)
    return result


def filter_holidays_by_month(
    holidays: list[dict[str, Any]],
    year: int,
    month: int,
) -> list[dict[str, Any]]:
    return filter_festivals_by_month(holidays, year, month)


def festivals_on_date(
    target: date,
    location: ObserverLocation = DEFAULT_LOCATION,
) -> dict[str, Any]:
    """All festivals/observances active on a specific day."""
    year_payload = get_festivals(target.year, location)
    active = [
        item
        for item in year_payload["festivals"]
        if date.fromisoformat(item["start_date"]) <= target <= date.fromisoformat(item["end_date"])
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
            "festivals": active,
        },
        location.cache_key(),
    )


def holidays_on_date(
    target: date,
    location: ObserverLocation = DEFAULT_LOCATION,
) -> dict[str, Any]:
    """Public holidays active on a specific day."""
    year_payload = get_holidays(target.year, location)
    active = [
        item
        for item in year_payload["holidays"]
        if date.fromisoformat(item["start_date"]) <= target <= date.fromisoformat(item["end_date"])
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
    written: list[Path] = []
    for year in range(start_year, end_year + 1):
        festival_payload = generate_festivals(year, location)
        save_festivals_cache(festival_payload, location)
        save_cache(generate_holidays(year, location), location)
        written.append(cache_path(year, location.cache_key()))
    return written
