"""Hora schedule — 12 day + 12 night planetary hours from sunrise/sunset."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from engine.astronomy.timescale import resolve_observer_timezone

# Chaldean hora cycle (descending orbital speed).
HORA_CYCLE = ["ravi", "shukra", "budha", "soma", "shani", "guru", "mangala"]

# Weekday lord starting the first day hora (Sunday=0 … Saturday=6).
_WEEKDAY_LORDS = ["ravi", "soma", "mangala", "budha", "guru", "shukra", "shani"]

HORA_DEVA_NE = {
    "ravi": "सूर्य",
    "soma": "चन्द्र",
    "mangala": "मंगल",
    "budha": "बुध",
    "guru": "गुरु",
    "shukra": "शुक्र",
    "shani": "शनि",
}

HORA_EN = {
    "ravi": "Sun",
    "soma": "Moon",
    "mangala": "Mars",
    "budha": "Mercury",
    "guru": "Jupiter",
    "shukra": "Venus",
    "shani": "Saturn",
}

_HORA_AUSPICIOUS = {"ravi", "soma", "budha", "guru", "shukra"}


def hora_quality(planet: str) -> str:
    return "शुभ" if planet in _HORA_AUSPICIOUS else "अशुभ"


def hora_tone(planet: str) -> str:
    return "good" if planet in _HORA_AUSPICIOUS else "bad"


def _cycle_lord(start: str, offset: int) -> str:
    base = HORA_CYCLE.index(start)
    return HORA_CYCLE[(base + offset) % len(HORA_CYCLE)]


def build_hora_schedule(
    sunrise_utc: datetime,
    sunset_utc: datetime,
    next_sunrise_utc: datetime,
    vaara_num: int,
    timezone_name: str,
) -> list[dict[str, Any]]:
    """24 hora slots for the vedic day, with local clock times and ghati positions."""
    tz = resolve_observer_timezone(timezone_name)
    sunrise_local = sunrise_utc.astimezone(tz)
    day_len = (sunset_utc - sunrise_utc) / 12
    night_len = (next_sunrise_utc - sunset_utc) / 12
    start_lord = _WEEKDAY_LORDS[int(vaara_num) % 7]

    def ghati(dt: datetime) -> float:
        return (dt - sunrise_utc).total_seconds() / (24 * 60)

    slots: list[dict[str, Any]] = []
    for i in range(24):
        is_day = i < 12
        if is_day:
            start = sunrise_utc + day_len * i
            end = sunrise_utc + day_len * (i + 1)
        else:
            start = sunset_utc + night_len * (i - 12)
            end = sunset_utc + night_len * (i - 11)
        planet = _cycle_lord(start_lord, i)
        slots.append(
            {
                "index": (i % 12) + 1,
                "phase": "day" if is_day else "night",
                "phase_ne": "दिन" if is_day else "रात",
                "planet": planet,
                "planet_ne": HORA_DEVA_NE[planet],
                "planet_en": HORA_EN[planet],
                "quality_ne": hora_quality(planet),
                "tone": hora_tone(planet),
                "bad": hora_tone(planet) == "bad",
                "start_time": start.isoformat(),
                "end_time": end.isoformat(),
                "start_local_time_short": start.astimezone(tz).strftime("%H:%M"),
                "end_local_time_short": end.astimezone(tz).strftime("%H:%M"),
                "start_g": round(ghati(start), 4),
                "end_g": round(min(ghati(end), 60.0), 4),
            }
        )
    return slots
