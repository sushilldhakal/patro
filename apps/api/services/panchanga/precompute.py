"""Fill the panchanga SQLite cache ahead of traffic — one BS year at one observer."""

from __future__ import annotations

from typing import Any

from engine.astronomy.location import ObserverLocation
from engine.calendar.bikram_sambat import iter_bs_year_days
from services.panchanga.panchanga_cache import cache_stats, precompute_range, resolve_cache_keys


def year_days(bs_year: int) -> list:
    """The civil day of every day in the BS year."""
    return [day.civil for day in iter_bs_year_days(bs_year)]


def precompute_year(bs_year: int, location: ObserverLocation, *, force: bool = False) -> dict[str, Any]:
    dates = year_days(bs_year)
    location_key, city_id = resolve_cache_keys(location)
    written = precompute_range(location, dates, skip_existing=not force)
    return {
        "status": "generated", "bs_year": bs_year,
        "location_key": location_key, "city_id": city_id,
        "days_written": written, "days_total": len(dates),
        "cache": cache_stats(),
    }
