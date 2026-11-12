"""The seasons page: the current ऋतु and the next five season starts.

Longitudes, arcs and crossings all come from :mod:`engine.astronomy.tropical_year`,
the one source of truth for ritu and ayana — this module only lays them out.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from engine.astronomy import tropical_year as ty
from engine.calendar.bikram_sambat import format_bs_date, gregorian_to_bs

#: Kept for importers; the value lives in tropical_year.
VASANTA_START_DEG = ty.VASANTA_START_DEG


def solar_apparent_longitude(date: datetime) -> float:
    """Apparent tropical Sun longitude [0, 360) at *date* — the real sky."""
    return ty.sun_longitude(ty.julian_day(date))


def tropical_season_cycle(now: datetime | None = None, tz: Any = None) -> list[dict[str, Any]]:
    """Six boundaries: current ऋतु first, then next five season starts."""
    now = now or datetime.now(timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    now_jd = ty.julian_day(now)
    lambda_now = ty.sun_longitude(now_jd)
    current_slot = ty.ritu_slot(lambda_now)
    out: list[dict[str, Any]] = []

    for i in range(6):
        slot = (current_slot + i) % 6
        angle = ty.slot_start_deg(slot)
        if i == 0:
            offset_deg = ty.signed_diff(angle - lambda_now)
        else:
            offset_deg = (angle - lambda_now) % 360
        start = ty.jd_to_utc(ty.crossing_jd(angle, now_jd + offset_deg / ty.SUN_DEG_PER_DAY))
        local_day = start.astimezone(tz).date() if tz is not None else start.date()
        bs = gregorian_to_bs(local_day)
        out.append(
            {
                "slot": slot,
                "angle": angle,
                "start_instant_utc": start.isoformat(),
                "start_ad": local_day.isoformat(),
                "start_bs": format_bs_date(bs[0], bs[1], bs[2]),
                "is_current": i == 0,
            }
        )
    return out


def build_tropical_seasons_response(
    *,
    lat: float | None = None,
    timezone_name: str = "Asia/Kathmandu",
) -> dict[str, Any]:
    from engine.astronomy.timescale import resolve_observer_timezone

    tz = resolve_observer_timezone(timezone_name)
    now = datetime.now(tz)
    cycle = tropical_season_cycle(now, tz)
    south = ty.is_southern(lat)
    return {
        "timezone": timezone_name,
        "latitude": lat,
        "southern_hemisphere": south,
        "boundaries": cycle,
    }
