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
    return generated


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
