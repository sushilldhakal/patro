"""Generate and cache auspicious-date (साइत) listings from Swiss Ephemeris rules."""

from __future__ import annotations

import json
from dataclasses import replace
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from engine.astronomy.location import DEFAULT_LOCATION, ObserverLocation
from engine.vedic.bikram_sambat import get_bs_month_length, iter_bs_month_days
from engine.vedic.constants import BS_ESTIMATED_MIN_YEAR, BS_SUPPORTED_MAX_YEAR
from engine.vedic.muhurta_engine import CEREMONY_RULES, MUHURTA_CATEGORIES, has_muhurta
from engine.vedic.sait_rules import CATEGORY_CHECKS, build_day_panchanga
from services.sait_db_cache import db_available, load_sait_db, save_sait_db

ROOT = Path(__file__).resolve().parents[1]
CACHE_DIR = ROOT / "cache"
SAIT_ENGINE_VERSION = "4.7.0"


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


def _scan_year(bs_year, category, location, *, use_muhurta, checker, rule) -> dict[str, list[int]]:
    """Days in each BS month that qualify, under an explicit muhūrta ``rule``
    (or the sunrise ``checker`` for the deterministic Vās categories)."""
    by_month: dict[str, list[int]] = {}
    for bs_month in range(1, 13):
        if get_bs_month_length(bs_year, bs_month) <= 0:
            continue
        matching_days: list[int] = []
        for bs_day, greg_date in iter_bs_month_days(bs_year, bs_month):
            if use_muhurta:
                match = has_muhurta(category, greg_date, location, rule=rule)
            else:
                match = checker(build_day_panchanga(greg_date, location))
            if match:
                matching_days.append(bs_day)
        if matching_days:
            by_month[str(bs_month)] = matching_days
    return by_month


def _day_total(by_month: dict[str, list[int]]) -> int:
    return sum(len(days) for days in by_month.values())


def generate_sait_months(
    bs_year: int,
    category: str,
    location: ObserverLocation = DEFAULT_LOCATION,
) -> tuple[dict[str, list[int]], bool]:
    """Return ``(by_month, nakshatra_fallback)`` for a year/category.

    Lagna-based saṃskāra (vivah / bratabandha / gṛha / vyāpāra / annaprasan) run
    through the time-resolved muhūrta engine; the deterministic Vās categories
    (rudri / agni) keep their day-level sunrise rules. If a rule declares an
    adaptive nakṣatra fallback and the strict pass yields fewer than
    ``fallback_min_days`` days, the year is recomputed with the widened set and
    the flag is returned so the detail endpoint can stay consistent.
    """
    use_muhurta = category in MUHURTA_CATEGORIES
    checker = None if use_muhurta else CATEGORY_CHECKS.get(category)
    if not use_muhurta and checker is None:
        raise ValueError(f"Unknown sait category: {category}")

    rule = CEREMONY_RULES.get(category) if use_muhurta else None
    by_month = _scan_year(
        bs_year, category, location, use_muhurta=use_muhurta, checker=checker, rule=rule
    )
    if (
        rule is not None
        and rule.fallback_nakshatras
        and _day_total(by_month) < rule.fallback_min_days
    ):
        widened = replace(rule, nakshatras=rule.fallback_nakshatras)
        by_month = _scan_year(
            bs_year, category, location, use_muhurta=True, checker=None, rule=widened
        )
        return by_month, True
    return by_month, False


def generate_sait_year_category(
    bs_year: int,
    category: str,
    location: ObserverLocation = DEFAULT_LOCATION,
) -> dict[str, list[int]]:
    return generate_sait_months(bs_year, category, location)[0]


def generate_sait_month_days(
    bs_year: int,
    bs_month: int,
    category: str,
    location: ObserverLocation = DEFAULT_LOCATION,
) -> list[int]:
    """Auspicious BS days for a SINGLE month — computes only that month (≈30 days)
    instead of the whole year, so the home-page month view is cheap to serve."""
    use_muhurta = category in MUHURTA_CATEGORIES
    checker = None if use_muhurta else CATEGORY_CHECKS.get(category)
    if not use_muhurta and checker is None:
        raise ValueError(f"Unknown sait category: {category}")
    if not 1 <= bs_month <= 12:
        raise ValueError(f"bs_month must be 1–12, got {bs_month}")

    days: list[int] = []
    for bs_day, greg_date in iter_bs_month_days(bs_year, bs_month):
        if use_muhurta:
            match = has_muhurta(category, greg_date, location)
        else:
            match = checker(build_day_panchanga(greg_date, location))
        if match:
            days.append(bs_day)
    return days


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

    # Shared Postgres is the primary store (persists across serverless
    # instances and users); the on-disk file cache is the local-dev fallback
    # when DATABASE_URL is unset.
    if use_cache:
        if db_available():
            cached = load_sait_db(bs_year, category, location, SAIT_ENGINE_VERSION)
        else:
            cached = load_sait_cached(bs_year, category, location)
        if cached is not None:
            return cached

    by_month, nakshatra_fallback = generate_sait_months(bs_year, category, location)
    payload = {
        "bs_year": bs_year,
        "category": category,
        "months": by_month,
        "engine_version": SAIT_ENGINE_VERSION,
        "location_key": location.cache_key(),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": "computed",
        # True when a scarce year was recomputed with the widened nakṣatra set;
        # the detail endpoint reads this so its per-day windows stay consistent.
        "nakshatra_fallback": nakshatra_fallback,
    }
    if db_available():
        save_sait_db(payload, location, SAIT_ENGINE_VERSION)
    else:
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
