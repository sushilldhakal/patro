"""Planetary hora (होरा) — twenty-four segments from sunrise to next sunrise."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from engine.astronomy.timescale import resolve_observer_timezone
from engine.vedic.choghadiya import day_ghati_from_sun_times

# Chaldean order starting from the weekday lord at sunrise.
_HORA_SEQUENCE = ("sun", "venus", "mercury", "moon", "saturn", "jupiter", "mars")

# vaara_num 0=Sunday … 6=Saturday (matches get_vaara).
_DAY_LORD = ("sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn")

_PLANETS: dict[str, dict[str, Any]] = {
    "sun": {"planet_ne": "आदित्य", "planet_en": "Sun", "bad": True},
    "moon": {"planet_ne": "चन्द्र", "planet_en": "Moon", "bad": False},
    "mars": {"planet_ne": "मङ्गल", "planet_en": "Mars", "bad": True},
    "mercury": {"planet_ne": "बुध", "planet_en": "Mercury", "bad": False},
    "jupiter": {"planet_ne": "बृहस्पति", "planet_en": "Jupiter", "bad": False},
    "venus": {"planet_ne": "शुक्र", "planet_en": "Venus", "bad": False},
    "saturn": {"planet_ne": "शनि", "planet_en": "Saturn", "bad": True},
}


def _lord_at(vaara_num: int, hora_index: int) -> str:
    start = _HORA_SEQUENCE.index(_DAY_LORD[int(vaara_num) % 7])
    return _HORA_SEQUENCE[(start + hora_index) % 7]


def _slot(
    *,
    index: int,
    phase: str,
    phase_ne: str,
    planet: str,
    start_dt: datetime,
    end_dt: datetime,
    start_g: float,
    end_g: float,
    tz_name: str,
) -> dict[str, Any]:
    tz = resolve_observer_timezone(tz_name)
    info = _PLANETS[planet]
    bad = bool(info["bad"])
    return {
        "index": index,
        "phase": phase,
        "phase_ne": phase_ne,
        "planet": planet,
        "planet_ne": info["planet_ne"],
        "planet_en": info["planet_en"],
        "quality_ne": "अशुभ" if bad else "शुभ",
        "tone": "bad" if bad else "good",
        "bad": bad,
        "start_local_time_short": start_dt.astimezone(tz).strftime("%H:%M"),
        "end_local_time_short": end_dt.astimezone(tz).strftime("%H:%M"),
        "start_g": round(start_g, 4),
        "end_g": round(end_g, 4),
    }


def build_hora(
    sunrise_utc: datetime,
    sunset_utc: datetime,
    next_sunrise_utc: datetime,
    vaara_num: int,
    tz_name: str,
    *,
    sunrise_short: str | None = None,
    sunset_short: str | None = None,
) -> list[dict[str, Any]]:
    """Twelve day + twelve night hora slots with local clock times and ghati coords."""
    day_ghati = day_ghati_from_sun_times(sunrise_short, sunset_short)
    if day_ghati is None:
        day_s = (sunset_utc - sunrise_utc).total_seconds()
        night_s = (next_sunrise_utc - sunset_utc).total_seconds()
        day_ghati = min(day_s / (day_s + night_s) * 60.0, 60.0)
    else:
        day_s = (sunset_utc - sunrise_utc).total_seconds()
        night_s = (next_sunrise_utc - sunset_utc).total_seconds()

    day_hora_s = day_s / 12.0
    night_hora_s = night_s / 12.0
    day_g_seg = day_ghati / 12.0
    night_g_seg = (60.0 - day_ghati) / 12.0

    slots: list[dict[str, Any]] = []
    for i in range(12):
        start_dt = sunrise_utc + timedelta(seconds=i * day_hora_s)
        end_dt = sunrise_utc + timedelta(seconds=(i + 1) * day_hora_s)
        planet = _lord_at(vaara_num, i)
        slots.append(
            _slot(
                index=i + 1,
                phase="day",
                phase_ne="दिन",
                planet=planet,
                start_dt=start_dt,
                end_dt=end_dt,
                start_g=i * day_g_seg,
                end_g=(i + 1) * day_g_seg,
                tz_name=tz_name,
            )
        )

    for i in range(12):
        start_dt = sunset_utc + timedelta(seconds=i * night_hora_s)
        end_dt = sunset_utc + timedelta(seconds=(i + 1) * night_hora_s)
        planet = _lord_at(vaara_num, 12 + i)
        slots.append(
            _slot(
                index=i + 1,
                phase="night",
                phase_ne="रात",
                planet=planet,
                start_dt=start_dt,
                end_dt=end_dt,
                start_g=day_ghati + i * night_g_seg,
                end_g=day_ghati + (i + 1) * night_g_seg,
                tz_name=tz_name,
            )
        )

    return slots
