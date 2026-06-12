"""Lagna (ascendant) spans from sunrise to next sunrise — 12 rashis per day."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from core.positions import find_lagna_end, get_lagna
from panchanga.ghati_time import time_from_sunrise


def build_lagna_spans(
    sunrise_dt: datetime,
    next_sunrise_dt: datetime,
    *,
    lat: float,
    lon: float,
    timezone_name: str = "Asia/Kathmandu",
) -> list[dict[str, Any]]:
    """Twelve lagna periods across one vedic day (sunrise → sunrise)."""
    from core.time_utils import resolve_observer_timezone

    tz = resolve_observer_timezone(timezone_name)
    spans: list[dict[str, Any]] = []
    cursor = sunrise_dt

    for index in range(12):
        lagna = get_lagna(cursor, lat=lat, lon=lon)
        end_dt = next_sunrise_dt if index == 11 else find_lagna_end(cursor, lat=lat, lon=lon)
        if end_dt <= cursor:
            end_dt = cursor + timedelta(seconds=60)

        start_info = time_from_sunrise(cursor, sunrise_dt)
        end_info = time_from_sunrise(end_dt, sunrise_dt)
        start_local = cursor.astimezone(tz)
        end_local = end_dt.astimezone(tz)

        spans.append(
            {
                "number": lagna["number"],
                "name": lagna["name"],
                "name_ne": lagna["name_ne"],
                "degree_in_rashi": lagna["degree_in_rashi"],
                "longitude": lagna["longitude"],
                "start_time": cursor.isoformat(),
                "start_ghati_clock": start_info["ghati_clock"],
                "start_hours_clock": start_info["hours_clock"],
                "start_local_time": start_local.strftime("%H:%M:%S"),
                "end_time": end_dt.isoformat(),
                "end_ghati_clock": end_info["ghati_clock"],
                "end_hours_clock": end_info["hours_clock"],
                "end_local_time": end_local.strftime("%H:%M:%S"),
            }
        )
        cursor = end_dt

    return spans
