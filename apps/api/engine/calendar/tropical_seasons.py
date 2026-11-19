"""The seasons page: the current ऋतु and the next five season starts.

Longitudes, arcs and crossings all come from :mod:`engine.astronomy.tropical_year`,
the one source of truth for ritu and ayana — this module only lays them out.

Every start is the real-sky (tropical) one. Each carries a ``vedic`` companion:
the instant the sidereal Sun of the request's siddhanta crosses the same degree,
nearest the real crossing — so a card can show how far the season the texts name
sits from the season in the sky.
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


def _start_fields(jd: float, tz: Any) -> dict[str, str]:
    """A crossing as the UTC instant plus the place's civil AD and BS day."""
    start = ty.jd_to_utc(jd)
    local_day = start.astimezone(tz).date() if tz is not None else start.date()
    bs = gregorian_to_bs(local_day)
    return {
        "start_instant_utc": start.isoformat(),
        "start_ad": local_day.isoformat(),
        "start_bs": format_bs_date(bs[0], bs[1], bs[2]),
    }


def _with_vedic(angle: int, real_jd: float, tz: Any) -> dict[str, Any]:
    """The real crossing of *angle*, with the sidereal crossing nearest it."""
    return {**_start_fields(real_jd, tz), "vedic": _start_fields(ty.sidereal_crossing_jd(angle, real_jd), tz)}


def _as_utc(now: datetime | None) -> datetime:
    now = now or datetime.now(timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    return now


def tropical_season_cycle(now: datetime | None = None, tz: Any = None) -> list[dict[str, Any]]:
    """Six boundaries: current ऋतु first, then next five season starts."""
    now_jd = ty.julian_day(_as_utc(now))
    lambda_now = ty.sun_longitude(now_jd)
    current_slot = ty.ritu_slot(lambda_now)
    out: list[dict[str, Any]] = []
    for i in range(6):
        slot = (current_slot + i) % 6
        angle = ty.slot_start_deg(slot)
        offset_deg = ty.signed_diff(angle - lambda_now) if i == 0 else (angle - lambda_now) % 360
        real_jd = ty.crossing_jd(angle, now_jd + offset_deg / ty.SUN_DEG_PER_DAY)
        out.append({"slot": slot, "angle": angle, **_with_vedic(angle, real_jd, tz), "is_current": i == 0})
    return out


def ayana_cycle(now: datetime | None = None, tz: Any = None) -> list[dict[str, Any]]:
    """The real-sky half-year in force and the next one: when each turns, and its
    Vedic turn (Makara / Karka Sankranti, the sidereal Sun at the same degree)."""
    now_jd = ty.julian_day(_as_utc(now))
    lambda_now = ty.sun_longitude(now_jd)
    uttara_now = ty.is_uttarayana(lambda_now)
    out: list[dict[str, Any]] = []
    for i, uttara in enumerate((uttara_now, not uttara_now)):
        angle = ty.UTTARAYANA_START_DEG if uttara else ty.DAKSHINAYANA_START_DEG
        offset = ty.signed_diff(angle - lambda_now) if i == 0 else (angle - lambda_now) % 360
        real_jd = ty.crossing_jd(angle, now_jd + offset / ty.SUN_DEG_PER_DAY)
        out.append({
            "name": "Uttarayana" if uttara else "Dakshinayana",
            "name_ne": "उत्तरायण" if uttara else "दक्षिणायण",
            "angle": angle,
            **_with_vedic(angle, real_jd, tz),
            "is_current": i == 0,
        })
    return out


def build_tropical_seasons_response(
    *,
    lat: float | None = None,
    timezone_name: str = "Asia/Kathmandu",
) -> dict[str, Any]:
    from engine.astronomy.siddhanta import current_siddhanta
    from engine.astronomy.timescale import resolve_observer_timezone

    tz = resolve_observer_timezone(timezone_name)
    now = datetime.now(tz)
    return {
        "timezone": timezone_name,
        "latitude": lat,
        "southern_hemisphere": ty.is_southern(lat),
        "boundaries": tropical_season_cycle(now, tz),
        "ayanas": ayana_cycle(now, tz),
        # Which nirayana Sun the ``vedic`` companions were read from.
        "vedic_siddhanta": current_siddhanta().id,
    }
