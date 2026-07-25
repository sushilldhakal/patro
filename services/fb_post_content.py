"""Shared content helpers for the Facebook panchanga posters (daily + changes).

Single source of truth for the Kathmandu location, the image/link URLs, and
Devanagari-digit formatting so both posters stay consistent.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any
from urllib.parse import urlencode
from zoneinfo import ZoneInfo

import config
from engine.astronomy.location import ObserverLocation, resolve_location

KATHMANDU_TZ = ZoneInfo("Asia/Kathmandu")
KATHMANDU_CITY_ID = 1283240  # GeoNames id — used to build the shareable link

_DEVANAGARI_DIGITS = "०१२३४५६७८९"
_ANGA_LABELS = [("tithi", "तिथि"), ("nakshatra", "नक्षत्र"), ("yoga", "योग"), ("karana", "करण")]


def ne_digits(value: str) -> str:
    """Latin → Devanagari digits (non-digits untouched)."""
    return "".join(_DEVANAGARI_DIGITS[int(c)] if c.isdigit() else c for c in value)


def kathmandu_location() -> ObserverLocation:
    return resolve_location(lat=27.7172, lon=85.324, timezone="Asia/Kathmandu", name="Kathmandu")


def image_url(day: date) -> str:
    """Public image URL for Kathmandu on `day` — the full-height chart (full=1),
    the same image the daily poster uses, fetched by Facebook to attach. Served
    via /api/og-image (nginx already proxies /api → FastAPI)."""
    query = urlencode({"city": KATHMANDU_CITY_ID, "date": day.isoformat(), "full": "1"})
    return f"{config.frontend_url()}/api/og-image?{query}"


def page_url(day: date) -> str:
    """Shareable /panchanga link for Kathmandu on `day`."""
    query = urlencode({"city": KATHMANDU_CITY_ID, "date": day.isoformat()})
    return f"{config.frontend_url()}/panchanga?{query}"


def sunrise_datetime(payload: dict[str, Any], day: date) -> datetime | None:
    """Kathmandu sunrise (HH:MM in the payload) as an aware datetime on `day`."""
    sunrise = (payload.get("sun") or {}).get("sunrise")
    if not sunrise:
        return None
    try:
        hour, minute = (int(x) for x in sunrise.split(":"))
    except ValueError:
        return None
    return datetime(day.year, day.month, day.day, hour, minute, tzinfo=KATHMANDU_TZ)


def _parse_local(text: str) -> datetime | None:
    try:
        return datetime.strptime(text, "%Y-%m-%d %H:%M").replace(tzinfo=KATHMANDU_TZ)
    except (ValueError, TypeError):
        return None


def anga_transition_lines(
    payload: dict[str, Any], day: date, location: ObserverLocation
) -> list[str]:
    """One Nepali line per anga describing its change(s) within the sunrise→sunrise
    day, e.g. ``करण: विष्टि → बव (११:५०) → बालव (०१:०२)`` or ``नक्षत्र: ज्येष्ठा (दिनभर)``.

    Each block carries its current name + first boundary (`end`→`next_ne`) and a
    second boundary time (`next_end`); the anga running after that second boundary
    is named with one at-time lookup (needed for karana, which changes twice).
    """
    sunrise = sunrise_datetime(payload, day)
    window_end = (sunrise or datetime(day.year, day.month, day.day, tzinfo=KATHMANDU_TZ)) + timedelta(days=1)

    lines: list[str] = []
    for key, label in _ANGA_LABELS:
        block = payload.get(key) or {}
        current = block.get("name_ne") or block.get("name") or "—"

        segments: list[tuple[datetime, str]] = []
        end = _parse_local(block.get("end", ""))
        if end is not None and end < window_end:
            segments.append((end, block.get("next_ne") or block.get("next") or "—"))
            next_end = _parse_local(block.get("next_end", ""))
            if next_end is not None and next_end < window_end:
                after = _anga_name_at(key, next_end + timedelta(minutes=1), location)
                if after:
                    segments.append((next_end, after))

        if not segments:
            lines.append(f"{label}: {current} (दिनभर)")
            continue
        chain = current
        for when, name in segments:
            chain += f" → {name} ({ne_digits(when.strftime('%H:%M'))})"
        lines.append(f"{label}: {chain}")
    return lines


def _anga_name_at(key: str, instant: datetime, location: ObserverLocation) -> str | None:
    from engine.vedic.at_time import build_panchanga_at_time

    block = build_panchanga_at_time(instant, location).get(key) or {}
    return block.get("name_ne") or block.get("name")
