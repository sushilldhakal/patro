"""BCE-safe daily panchanga — civil ``CivilDay`` + signed patro BS/BBS context."""

from __future__ import annotations

from typing import Any

from engine.astronomy.jd_calendar import CivilDay
from engine.astronomy.location import DEFAULT_LOCATION, ObserverLocation
from engine.panchanga.daily import build_daily_panchanga_at_jd


def build_daily_panchanga_civil(
    civil: CivilDay,
    location: ObserverLocation = DEFAULT_LOCATION,
    *,
    patro_bs_year: int,
    patro_bs_month: int,
    patro_bs_day: int,
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
    )

