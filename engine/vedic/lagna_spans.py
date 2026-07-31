"""Lagna (ascendant) spans from sunrise to next sunrise — 12 rashis per day."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from engine.astronomy.lagna import lagna_service
from engine.astronomy.ut_instant import as_julian_day
from engine.vedic.ghati_time import time_from_sunrise


def build_lagna_spans(
    sunrise_dt: datetime,
    next_sunrise_dt: datetime,
    *,
    lat: float,
    lon: float,
    timezone_name: str = "Asia/Kathmandu",
    ayanamsa: int | None = None,
) -> list[dict[str, Any]]:
    """Twelve lagna periods across one vedic day (sunrise → sunrise)."""
    from engine.astronomy.engine import SIDM_LAHIRI
    from engine.astronomy.timescale import resolve_observer_timezone

    mode = SIDM_LAHIRI if ayanamsa is None else ayanamsa
    tz = resolve_observer_timezone(timezone_name)
    spans: list[dict[str, Any]] = []
    cursor = sunrise_dt

    for index in range(12):
        cursor_jd = as_julian_day(cursor)
        lagna = lagna_service.lagna(cursor_jd, lat=lat, lon=lon, ayanamsa=mode)
        if index == 11:
            end_dt = next_sunrise_dt
        else:
            end_jd = lagna_service.next_boundary(
                cursor_jd, lat=lat, lon=lon, ayanamsa=mode
            )
            # Offset from the caller's own instant rather than rebuilt from the
            # JD: datetime_from_jd truncates to whole seconds, which would
            # coarsen every span boundary this payload prints.
            end_dt = cursor + timedelta(days=end_jd - cursor_jd)
        if end_dt <= cursor:
            end_dt = cursor + timedelta(seconds=60)

        start_info = time_from_sunrise(cursor, sunrise_dt)
        end_info = time_from_sunrise(end_dt, sunrise_dt)
        from engine.astronomy.ut_instant import UtInstant, format_ut_instant_local

        if isinstance(cursor, UtInstant):
            start_local_time = format_ut_instant_local(cursor, timezone_name)["local_time"]
            end_local_time = format_ut_instant_local(end_dt, timezone_name)["local_time"]
        else:
            start_local = cursor.astimezone(tz)
            end_local = end_dt.astimezone(tz)
            start_local_time = start_local.strftime("%H:%M:%S")
            end_local_time = end_local.strftime("%H:%M:%S")

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
                "start_local_time": start_local_time,
                "end_time": end_dt.isoformat(),
                "end_ghati_clock": end_info["ghati_clock"],
                "end_hours_clock": end_info["hours_clock"],
                "end_local_time": end_local_time,
            }
        )
        cursor = end_dt

    return spans
