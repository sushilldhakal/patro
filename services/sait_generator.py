"""Generate and cache auspicious-date (साइत) listings from Swiss Ephemeris rules."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from engine.astronomy.location import DEFAULT_LOCATION, ObserverLocation
from engine.vedic.bikram_sambat import get_bs_month_length, iter_bs_month_days
from engine.vedic.constants import BS_ESTIMATED_MIN_YEAR, BS_SUPPORTED_MAX_YEAR
from engine.vedic.sait_rules import CATEGORY_CHECKS, build_day_panchanga

ROOT = Path(__file__).resolve().parents[1]
CACHE_DIR = ROOT / "cache"
SAIT_ENGINE_VERSION = "2.0.0"


def sait_cache_path(bs_year: int, category: str, location_key: str) -> Path:
    safe_key = location_key.replace("/", "_")
    return CACHE_DIR / f"sait_{bs_year}_{category}_{safe_key}.json"


def _cache_is_valid(cached: dict[str, Any], location_key: str) -> bool:
    return (
        cached.get("engine_version") == SAIT_ENGINE_VERSION
        and cached.get("location_key") == location_key
    )


def load_sait_cached(
    bs_year: int,
    category: str,
    location: ObserverLocation,
) -> dict[str, Any] | None:
    path = sait_cache_path(bs_year, category, location.cache_key())
    if not path.exists():
        return None
    with path.open(encoding="utf-8") as fh:
        cached = json.load(fh)
    if not _cache_is_valid(cached, location.cache_key()):
        return None
    return cached


def save_sait_cache(payload: dict[str, Any], location: ObserverLocation) -> None:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    path = sait_cache_path(payload["bs_year"], payload["category"], location.cache_key())
    with path.open("w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=2)


def generate_sait_year_category(
    bs_year: int,
    category: str,
    location: ObserverLocation = DEFAULT_LOCATION,
) -> dict[str, list[int]]:
    checker = CATEGORY_CHECKS.get(category)
    if checker is None:
        raise ValueError(f"Unknown sait category: {category}")

    by_month: dict[str, list[int]] = {}
    for bs_month in range(1, 13):
        month_len = get_bs_month_length(bs_year, bs_month)
        if month_len <= 0:
            continue
        matching_days: list[int] = []
        for bs_day, greg_date in iter_bs_month_days(bs_year, bs_month):
            day_ctx = build_day_panchanga(greg_date, location)
            if checker(day_ctx):
                matching_days.append(bs_day)
        if matching_days:
            by_month[str(bs_month)] = matching_days

    return by_month


def get_generated_sait(
    bs_year: int,
    category: str,
    location: ObserverLocation = DEFAULT_LOCATION,
    *,
    use_cache: bool = True,
) -> dict[str, Any]:
    if not BS_ESTIMATED_MIN_YEAR <= bs_year <= BS_SUPPORTED_MAX_YEAR:
        raise ValueError(
            f"bs_year must be between {BS_ESTIMATED_MIN_YEAR} and {BS_SUPPORTED_MAX_YEAR}"
        )

    if use_cache:
        cached = load_sait_cached(bs_year, category, location)
        if cached is not None:
            return cached

    by_month = generate_sait_year_category(bs_year, category, location)
    payload = {
        "bs_year": bs_year,
        "category": category,
        "months": by_month,
        "engine_version": SAIT_ENGINE_VERSION,
        "location_key": location.cache_key(),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": "computed",
    }
    save_sait_cache(payload, location)
    return payload


def precompute_sait_range(
    start_bs_year: int,
    end_bs_year: int,
    location: ObserverLocation = DEFAULT_LOCATION,
    *,
    categories: list[str] | None = None,
    skip_existing: bool = True,
) -> list[tuple[int, str]]:
    cats = categories or list(CATEGORY_CHECKS.keys())
    generated: list[tuple[int, str]] = []
    for bs_year in range(start_bs_year, end_bs_year + 1):
        for category in cats:
            if skip_existing and load_sait_cached(bs_year, category, location):
                continue
            get_generated_sait(bs_year, category, location, use_cache=False)
            generated.append((bs_year, category))
    return generated
