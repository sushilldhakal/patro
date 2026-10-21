"""One day's panchanga with its festivals and public-holiday status.

The Panchanga context builds the day and lists its festivals through its port;
whether a festival is a public holiday is the Festivals context's knowledge, so
the combination lives here, downstream of both.
"""

from __future__ import annotations

from typing import Any

from engine.astronomy.jd_calendar import CivilDay, date_if_supported
from engine.astronomy.location import ObserverLocation
from engine.calendar.bikram_sambat import locate_patro_day_for_civil
from services.festivals.holiday_generator import is_public_holiday
from services.panchanga.panchanga_api import build_daily_state, build_daily_state_civil


def day_state_with_holidays(civil: CivilDay, location: ObserverLocation) -> dict[str, Any]:
    """The day state with each festival flagged and the day's own holiday flag."""
    greg = date_if_supported(civil.year, civil.month, civil.day)
    if greg is None:
        # Pre-1 CE: the signed patro axis carries the day, and the CE-only
        # lunar/festival engines stub out — same split build_daily_panchanga_at_jd
        # makes one layer down.
        py, pm, pd = locate_patro_day_for_civil(civil)
        state = build_daily_state_civil(
            civil,
            location,
            patro_bs_year=py,
            patro_bs_month=pm,
            patro_bs_day=pd,
            include_festivals=True,
            include_detail=False,
        )
    else:
        state = build_daily_state(greg, location, include_festivals=True, include_detail=False)
    festivals = state.get("festivals", [])
    for festival in festivals:
        festival["is_public_holiday"] = is_public_holiday(festival["id"])
    state["is_public_holiday"] = any(f.get("is_public_holiday") for f in festivals)
    state.pop("detail", None)
    return state
