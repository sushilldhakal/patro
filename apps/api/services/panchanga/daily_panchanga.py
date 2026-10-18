"""Daily panchanga use cases: cache-aside over the engine builders, plus festivals.

The engine (``engine.panchanga.daily`` / ``daily_civil``) computes a day; whether that
day comes from the SQLite cache, and which festivals land on it, is decided here.
"""

from __future__ import annotations

from datetime import date
from typing import Any

from engine.astronomy.jd_calendar import CivilDay
from engine.astronomy.location import DEFAULT_LOCATION, ObserverLocation
from engine.panchanga.daily import build_daily_panchanga
from engine.panchanga.daily_civil import build_daily_panchanga_civil


def build_daily_panchanga_with_festivals(
    target: date,
    location: ObserverLocation = DEFAULT_LOCATION,
) -> dict[str, Any]:
    """Uncached udaya panchanga for one Gregorian day, with its festival list."""
    from services.festivals.holiday_generator import festivals_on_date

    payload = build_daily_panchanga(target, location)
    payload["festivals"] = festivals_on_date(target, location)["festivals"]
    return payload


def get_daily_panchanga(
    target: date,
    location: ObserverLocation = DEFAULT_LOCATION,
    *,
    include_festivals: bool = False,
) -> dict[str, Any]:
    """
    Daily panchanga with SQLite cache-aside.

    Cache hit → instant return (no JPL ephemeris work).
    Cache miss → compute, store, return.
    """
    from services.panchanga.panchanga_cache import get_cached_panchanga, store_panchanga_cache

    cached = get_cached_panchanga(target, location)
    if cached is not None:
        payload = dict(cached)
        payload.pop("_from_cache", None)
        payload["_from_cache"] = True
    else:
        payload = build_daily_panchanga(target, location)
        store_panchanga_cache(target, location, payload)
        payload["_from_cache"] = False

    if include_festivals:
        from services.festivals.holiday_generator import festivals_on_date

        day_festivals = festivals_on_date(target, location)
        payload = {**payload, "festivals": day_festivals["festivals"]}

    return payload


def get_daily_panchanga_civil(
    civil: CivilDay,
    location: ObserverLocation = DEFAULT_LOCATION,
    *,
    patro_bs_year: int,
    patro_bs_month: int,
    patro_bs_day: int,
    include_festivals: bool = False,
) -> dict[str, Any]:
    """Cache-aside over :func:`build_daily_panchanga_civil`.

    ``include_festivals`` is accepted for callers that pass it through, and has no
    effect: festivals are only resolved for days ``datetime.date`` can hold, and
    the signed-axis labelling never attached them.
    """
    from services.panchanga.panchanga_cache import get_cached_panchanga_jd, store_panchanga_cache_jd

    jd_ut = civil.to_jd_ut()
    cached = get_cached_panchanga_jd(jd_ut, location)
    if cached is not None:
        payload = dict(cached)
        payload.pop("_from_cache", None)
        payload["_from_cache"] = True
        return payload

    payload = build_daily_panchanga_civil(
        civil,
        location,
        patro_bs_year=patro_bs_year,
        patro_bs_month=patro_bs_month,
        patro_bs_day=patro_bs_day,
    )
    store_panchanga_cache_jd(jd_ut, location, payload)
    payload["_from_cache"] = False
    return payload
