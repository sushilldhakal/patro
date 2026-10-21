"""Precompute jobs that span contexts — composed here, where both may be imported.

Geography knows the popular cities; the Panchanga fills its cache for one
observer. Neither context may import the other, so the loop over cities lives
in the composition root.
"""

from __future__ import annotations

from typing import Any

from services.geography.cities_db import POPULAR_CITY_IDS
from services.geography.observer_location import resolve_location_from_query
from services.panchanga.panchanga_cache import cache_stats, precompute_range, resolve_cache_keys
from services.panchanga.precompute import year_days


def precompute_year_for_popular_cities(bs_year: int, *, force: bool = False) -> dict[str, Any]:
    dates = year_days(bs_year)
    results = []
    total_written = 0
    for city_id in POPULAR_CITY_IDS:
        location = resolve_location_from_query(city_id=city_id)
        key, _ = resolve_cache_keys(location)
        written = precompute_range(location, dates, skip_existing=not force)
        total_written += written
        results.append({"city_id": city_id, "location_key": key, "days_written": written})
    return {
        "status": "generated", "bs_year": bs_year,
        "cities": len(POPULAR_CITY_IDS), "days_total_per_city": len(dates),
        "total_rows_written": total_written, "results": results,
        "cache": cache_stats(),
    }
