"""Tropical (sāyana) six-season cycle — equinox/solstice anchored ऋतु boundaries."""

from __future__ import annotations

import math
from datetime import datetime, timezone
from typing import Any

from engine.vedic.bikram_sambat import format_bs_date, gregorian_to_bs

DAY_MS = 86_400_000
RAD = math.pi / 180
SUN_DEG_PER_DAY = 360 / 365.2422


def _signed_angular_diff(deg: float) -> float:
    return ((deg % 360) + 540) % 360 - 180


def _julian_day(date: datetime) -> float:
    return date.timestamp() * 1000 / DAY_MS + 2440587.5


def solar_apparent_longitude(date: datetime) -> float:
    """Apparent geocentric tropical Sun longitude [0, 360). Meeus ch. 25."""
    t = (_julian_day(date) - 2451545.0) / 36525
    l0 = 280.46646 + 36000.76983 * t + 0.0003032 * t * t
    m = (357.52911 + 35999.05029 * t - 0.0001537 * t * t) * RAD
    c = (
        (1.914602 - 0.004817 * t - 0.000014 * t * t) * math.sin(m)
        + (0.019993 - 0.000101 * t) * math.sin(2 * m)
        + 0.000289 * math.sin(3 * m)
    )
    true_long = l0 + c
    omega = (125.04 - 1934.136 * t) * RAD
    apparent = true_long - 0.00569 - 0.00478 * math.sin(omega)
    return (apparent % 360 + 360) % 360


def _refine_crossing(target_deg: float, guess: datetime) -> datetime:
    t_ms = guess.timestamp() * 1000
    for _ in range(12):
        err = _signed_angular_diff(
            solar_apparent_longitude(datetime.fromtimestamp(t_ms / 1000, tz=timezone.utc))
            - target_deg
        )
        t_ms -= (err / SUN_DEG_PER_DAY) * DAY_MS
    return datetime.fromtimestamp(t_ms / 1000, tz=timezone.utc)


def tropical_season_cycle(now: datetime | None = None) -> list[dict[str, Any]]:
    """Six boundaries: current ऋतु first, then next five season starts."""
    now = now or datetime.now(timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    lambda_now = solar_apparent_longitude(now)
    current_slot = int(lambda_now // 60) % 6
    out: list[dict[str, Any]] = []
    now_ms = now.timestamp() * 1000

    for i in range(6):
        slot = (current_slot + i) % 6
        angle = slot * 60
        if i == 0:
            offset_deg = _signed_angular_diff(angle - lambda_now)
        else:
            offset_deg = ((angle - lambda_now) % 360 + 360) % 360
        guess = datetime.fromtimestamp(
            (now_ms + (offset_deg / SUN_DEG_PER_DAY) * DAY_MS) / 1000,
            tz=timezone.utc,
        )
        start = _refine_crossing(angle, guess)
        start_ad = start.date().isoformat()
        bs = gregorian_to_bs(start.date())
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
    cycle = tropical_season_cycle(now)
    south = lat is not None and lat < 0
    return {
        "timezone": timezone_name,
        "latitude": lat,
        "southern_hemisphere": south,
        "boundaries": cycle,
    }
