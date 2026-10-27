"""Tropical (sāyana) six-season cycle — ऋतु as six 60° arcs of the Sun's path.

Slot 0 (Vasanta) opens at 330°, so the solstices are boundaries — Varsha starts
at 90° (summer solstice), Shishira at 270° (winter solstice) — and the equinoxes
sit exactly mid-Vasanta (0°) and mid-Sharad (180°). Same arcs as ``RashiService.ritu``.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from engine.astronomy.engine import default_engine
from engine.calendar.bikram_sambat import format_bs_date, gregorian_to_bs

DAY_MS = 86_400_000
SUN_DEG_PER_DAY = 360 / 365.2422
# Tropical longitude where Vasanta (slot 0) begins.
VASANTA_START_DEG = 330


def _signed_angular_diff(deg: float) -> float:
    return ((deg % 360) + 540) % 360 - 180


def _julian_day(date: datetime) -> float:
    return date.timestamp() * 1000 / DAY_MS + 2440587.5


def solar_apparent_longitude(date: datetime) -> float:
    """Apparent geocentric tropical Sun longitude [0, 360).

    Delegates to the ephemeris. This used to be a hand-rolled Meeus chapter 25
    low-precision series — the engine's only second implementation of a quantity
    the astronomy layer already owned. Removed because it:

    * disagreed with the ephemeris by up to 0.0057 deg, which is **8.4 minutes**
      of season-boundary timing (the Sun moves 0.0411 deg/hour) — visible, since
      boundaries are published to the minute;
    * was CE-only by construction (``datetime.timestamp()`` cannot represent
      BCE), making tropical seasons the one astronomy path in this engine that
      was not BCE-safe;
    * was invisible to ``EnvironmentProvenance``, so a cached season boundary
      could not say what produced it.

    Swiss Ephemeris is this engine's astronomical authority, so there is no
    reason to carry a lower-precision approximation of it.
    """
    return default_engine.sun_longitude(_julian_day(date), sidereal=False)


def _refine_crossing(target_deg: float, guess: datetime) -> datetime:
    t_ms = guess.timestamp() * 1000
    for _ in range(12):
        err = _signed_angular_diff(
            solar_apparent_longitude(datetime.fromtimestamp(t_ms / 1000, tz=timezone.utc))
            - target_deg
        )
        t_ms -= (err / SUN_DEG_PER_DAY) * DAY_MS
    return datetime.fromtimestamp(t_ms / 1000, tz=timezone.utc)


def tropical_season_cycle(now: datetime | None = None, tz: Any = None) -> list[dict[str, Any]]:
    """Six boundaries: current ऋतु first, then next five season starts."""
    now = now or datetime.now(timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    lambda_now = solar_apparent_longitude(now)
    current_slot = int(((lambda_now - VASANTA_START_DEG) % 360) // 60)
    out: list[dict[str, Any]] = []
    now_ms = now.timestamp() * 1000

    for i in range(6):
        slot = (current_slot + i) % 6
        angle = (VASANTA_START_DEG + slot * 60) % 360
        if i == 0:
            offset_deg = _signed_angular_diff(angle - lambda_now)
        else:
            offset_deg = ((angle - lambda_now) % 360 + 360) % 360
        guess = datetime.fromtimestamp(
            (now_ms + (offset_deg / SUN_DEG_PER_DAY) * DAY_MS) / 1000,
            tz=timezone.utc,
        )
        start = _refine_crossing(angle, guess)
        local_day = start.astimezone(tz).date() if tz is not None else start.date()
        start_ad = local_day.isoformat()
        bs = gregorian_to_bs(local_day)
        out.append(
            {
                "slot": slot,
                "angle": angle,
                "start_instant_utc": start.isoformat(),
                "start_ad": start_ad,
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
    south = lat is not None and lat < 0
    return {
        "timezone": timezone_name,
        "latitude": lat,
        "southern_hemisphere": south,
        "boundaries": cycle,
    }
