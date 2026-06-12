"""Moon rashi spans, nakshatra pada spans, and surya nakshatra for the Rashi card."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from core.positions import (
    NAKSHATRA_NAMES,
    NAKSHATRA_SPAN,
    get_chandra_rashi,
    get_moon_longitude,
    get_sun_longitude,
)
from panchanga.element_boundaries import find_moon_pada_end, find_moon_rashi_end
from panchanga.ghati_time import time_from_sunrise
from panchanga.names_ne import NAKSHATRA_NAMES_NE, to_nepali_digits

PADA_SPAN = NAKSHATRA_SPAN / 4


def get_surya_nakshatra(dt: datetime) -> dict[str, Any]:
    """Sun nakshatra at the given instant (udayakal)."""
    sun_long = get_sun_longitude(dt)
    nak_num = int(sun_long / NAKSHATRA_SPAN) + 1
    if nak_num > 27:
        nak_num = 1
    return {
        "number": nak_num,
        "name": NAKSHATRA_NAMES[nak_num - 1],
        "name_ne": NAKSHATRA_NAMES_NE[nak_num - 1],
    }


def _moon_pada_at(dt: datetime) -> tuple[int, int]:
    moon_long = get_moon_longitude(dt)
    nak_num = int(moon_long / NAKSHATRA_SPAN) + 1
    if nak_num > 27:
        nak_num = 1
    pos_in_nak = moon_long % NAKSHATRA_SPAN
    pada = min(int(pos_in_nak / PADA_SPAN) + 1, 4)
    return nak_num, pada


def _attach_end(span: dict[str, Any], end_dt: datetime, sunrise_dt: datetime, day_end: datetime) -> None:
    if end_dt >= day_end:
        return
    end_info = time_from_sunrise(end_dt, sunrise_dt)
    span.update(
        {
            "end_time": end_dt.isoformat(),
            "end_local_time": end_info["local_time"],
            "end_local_time_short": end_dt.strftime("%H:%M"),
            "end_hours_clock": end_info["hours_clock"],
            "end_ghati_clock": end_info["ghati_clock"],
        }
    )


def build_chandra_rashi_spans(
    sunrise_dt: datetime,
    next_sunrise_dt: datetime,
) -> list[dict[str, Any]]:
    """Moon rashis from sunrise until next sunrise."""
    spans: list[dict[str, Any]] = []
    cursor = sunrise_dt

    while cursor < next_sunrise_dt and len(spans) < 4:
        rashi = get_chandra_rashi(cursor)
        end_dt = min(find_moon_rashi_end(cursor), next_sunrise_dt)
        span: dict[str, Any] = {
            "number": rashi["number"],
            "name": rashi["name"],
            "name_ne": rashi["name_ne"],
        }
        _attach_end(span, end_dt, sunrise_dt, next_sunrise_dt)
        spans.append(span)
        if end_dt >= next_sunrise_dt:
            break
        cursor = end_dt + timedelta(seconds=90)

    return spans


def build_nakshatra_pada_spans(
    sunrise_dt: datetime,
    next_sunrise_dt: datetime,
) -> list[dict[str, Any]]:
    """Nakshatra pada transitions from sunrise until next sunrise."""
    spans: list[dict[str, Any]] = []
    cursor = sunrise_dt

    while cursor < next_sunrise_dt and len(spans) < 8:
        nak_num, pada = _moon_pada_at(cursor)
        end_dt = min(find_moon_pada_end(cursor), next_sunrise_dt)
        span: dict[str, Any] = {
            "nakshatra_number": nak_num,
            "nakshatra_name": NAKSHATRA_NAMES[nak_num - 1],
            "nakshatra_name_ne": NAKSHATRA_NAMES_NE[nak_num - 1],
            "pada": pada,
            "pada_ne": to_nepali_digits(pada),
        }
        _attach_end(span, end_dt, sunrise_dt, next_sunrise_dt)
        spans.append(span)
        if end_dt >= next_sunrise_dt:
            break
        cursor = end_dt + timedelta(seconds=90)

    return spans
