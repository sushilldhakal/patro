"""BCE-safe daily panchanga — civil ``CivilDay`` + signed patro BS/BBS context."""

from __future__ import annotations

from datetime import date
from typing import Any

from engine.astronomy.jd_calendar import CivilDay
from engine.astronomy.location import DEFAULT_LOCATION, ObserverLocation
from engine.vedic.daily import build_daily_panchanga_at_jd


def build_daily_panchanga_civil(
    civil: CivilDay,
    location: ObserverLocation = DEFAULT_LOCATION,
    *,
    patro_bs_year: int,
    patro_bs_month: int,
    patro_bs_day: int,
    include_festivals: bool = False,
) -> dict[str, Any]:
    """Full udaya panchanga for a civil day on the signed patro axis.

    Thin wrapper over :func:`build_daily_panchanga_at_jd`. The astronomy is the
    same code the Gregorian entry point runs; passing ``patro_bs`` is what
    selects the signed-axis labelling (stubbed lunar month and Nepal Sambat,
    possibly negative year).
    """
    return build_daily_panchanga_at_jd(
        civil.to_jd_ut(),
        location,
        patro_bs=(patro_bs_year, patro_bs_month, patro_bs_day),
        include_festivals=include_festivals,
    )


def get_daily_panchanga_civil(
    civil: CivilDay,
    location: ObserverLocation = DEFAULT_LOCATION,
    *,
    patro_bs_year: int,
    patro_bs_month: int,
    patro_bs_day: int,
    include_festivals: bool = False,
) -> dict[str, Any]:
    from services.panchanga_cache import get_cached_panchanga_jd, store_panchanga_cache_jd

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
        include_festivals=include_festivals,
    )
    store_panchanga_cache_jd(jd_ut, location, payload)
    payload["_from_cache"] = False
    return payload
