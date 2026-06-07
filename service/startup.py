"""Warm holiday caches on process startup (for ephemeral hosts like Render)."""

from __future__ import annotations

import logging
import os
from datetime import date

from core.location import DEFAULT_LOCATION
from panchanga.bikram_sambat import gregorian_to_bs
from service.holiday_generator import precompute_bs_range

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
    span = max(int(os.environ.get("PRECOMPUTE_BS_SPAN", "1")), 0)
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
    return generated
