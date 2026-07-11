"""Warm holiday caches on process startup (for ephemeral hosts like Render)."""

from __future__ import annotations

import logging
import os
from datetime import date

from engine.astronomy.location import DEFAULT_LOCATION
from engine.vedic.bikram_sambat import gregorian_to_bs
from services.holiday_generator import precompute_bs_range

logger = logging.getLogger(__name__)


def _precompute_enabled() -> bool:
    return os.environ.get("PRECOMPUTE_ON_STARTUP", "true").lower() not in {
        "0",
        "false",
        "no",
    }


def resolve_precompute_years() -> tuple[int, int]:
    """Return inclusive BS year range to warm on startup."""
    explicit = os.environ.get("PRECOMPUTE_BS_YEARS", "").strip()
    if explicit:
        years = sorted(int(part.strip()) for part in explicit.split(",") if part.strip())
        return years[0], years[-1]

    current_bs_year, _, _ = gregorian_to_bs(date.today())
    # ±3 → 7 popular years (last few + next few): previous-year lookups, wedding
    # planning, festival research, next-year calendar — without a heavy cold start.
    span = max(int(os.environ.get("PRECOMPUTE_BS_SPAN", "3")), 0)
    return current_bs_year - span, current_bs_year + span


def warm_holiday_cache() -> list[int]:
    """Generate missing BS-year caches for the configured range."""
    if not _precompute_enabled():
        logger.info("Startup precompute disabled (PRECOMPUTE_ON_STARTUP=false)")
        return []

    start_year, end_year = resolve_precompute_years()
    generated = precompute_bs_range(start_year, end_year, DEFAULT_LOCATION)
    if generated:
        logger.info(
            "Precomputed BS holiday cache for years %s @ %s",
            generated,
            DEFAULT_LOCATION.cache_key(),
        )
    else:
        logger.info(
            "BS holiday cache already present for %s–%s",
            start_year,
            end_year,
        )
    _warm_year_response_cache()
    _warm_popular_city_caches()
    return generated


def _warm_popular_cities_enabled() -> bool:
    return os.environ.get("WARM_POPULAR_CITIES", "true").lower() not in {"0", "false", "no"}


def _popular_warm_city_ids() -> list[int]:
    """City ids to pre-warm. Defaults to the most populous Nepali cities (the
    towns snapping collapses traffic to); override with a comma-separated
    WARM_CITY_IDS list. Empty WARM_CITY_IDS disables the city warm."""
    if "WARM_CITY_IDS" in os.environ:
        explicit = os.environ["WARM_CITY_IDS"].strip()
        return [int(part) for part in explicit.split(",") if part.strip()]

    from services.cities_db import top_cities_by_population

    limit = max(int(os.environ.get("WARM_CITY_COUNT", "20")), 0)
    return [row["id"] for row in top_cities_by_population(limit, country="NP")]


def _warm_popular_city_caches() -> None:
    """Pre-build the current-year sun-times + lite calendar for popular cities.

    After nearest-city snapping, virtually all real traffic lands on one of a
    small set of city ids. Warming their location-varying year payloads (sun
    rise/set + lite grid) for the current BS year means a visitor switching to
    Pokhara or Biratnagar gets a millisecond cache hit instead of the ~30 s cold
    build. Kept to the current year only to bound the startup cost; gate off with
    WARM_POPULAR_CITIES=false on light/ephemeral hosts.
    """
    if not _warm_popular_cities_enabled():
        return

    from engine.astronomy.location import resolve_location_from_query
    from services.cities_db import get_city_by_id
    from services.panchanga_api import build_year_calendar, build_year_sun_times
    from services.year_cache import read_year_cache, write_year_cache

    current_bs_year, _, _ = gregorian_to_bs(date.today())
    seen_keys: set[int | None] = set()
    for seed_id in _popular_warm_city_ids():
        row = get_city_by_id(seed_id)
        if row is None:
            continue
        # Resolve the city's own centre through the same path real requests take,
        # so the warmed key is exactly the city:<id> that snapped traffic hits
        # (GeoNames has duplicate rows for some towns — snapping canonicalizes).
        location = resolve_location_from_query(lat=row["lat"], lon=row["lon"])
        if location.city_id in seen_keys:
            continue
        seen_keys.add(location.city_id)
        builders = {
            "sun": lambda loc=location: build_year_sun_times(current_bs_year, loc),
            "lite": lambda loc=location: build_year_calendar(current_bs_year, loc, full=False),
        }
        for variant, build in builders.items():
            if read_year_cache(current_bs_year, location, variant=variant) is not None:
                continue
            try:
                write_year_cache(current_bs_year, location, build(), variant=variant)
                logger.info("Warmed %s cache for %s (BS %s)", variant, location.name, current_bs_year)
            except Exception:  # noqa: BLE001 — a warm failure must not block startup
                logger.exception("City warm failed for %s (%s)", location.name, variant)


def _warm_year_response_cache() -> None:
    """Pre-build the year-page payloads for the popular BS years (Kathmandu).

    /panchanga/year serves cached gzipped bytes in milliseconds once the file
    exists; without this warm, the first visitor after a deploy (or an engine
    version bump) would pay the ~30 s year build. We only pre-warm the popular
    window (current year ± PRECOMPUTE_BS_SPAN) — every other year is computed
    on-demand and cached on first request. Skip-existing keeps this cheap on
    persistent hosts (warmed once) while ephemeral hosts should keep the span
    small to avoid a heavy cold start.
    """
    from services.panchanga_api import build_year_calendar, build_year_sun_times
    from services.year_cache import read_year_cache, write_year_cache

    start_year, end_year = resolve_precompute_years()
    for bs_year in range(start_year, end_year + 1):
        builders = {
            "full": lambda y=bs_year: build_year_calendar(y, DEFAULT_LOCATION, full=True),
            "lite": lambda y=bs_year: build_year_calendar(y, DEFAULT_LOCATION, full=False),
            "sun": lambda y=bs_year: build_year_sun_times(y, DEFAULT_LOCATION),
        }
        for variant, build in builders.items():
            if read_year_cache(bs_year, DEFAULT_LOCATION, variant=variant) is not None:
                continue
            try:
                payload = build()
                write_year_cache(bs_year, DEFAULT_LOCATION, payload, variant=variant)
                logger.info("Warmed year response cache for BS %s (%s)", bs_year, variant)
            except Exception:  # noqa: BLE001 — warm failure must not block startup
                logger.exception("Year response cache warm failed for BS %s", bs_year)
