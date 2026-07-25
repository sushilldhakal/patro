"""Shared content helpers for the Facebook panchanga posters (daily + changes).

Single source of truth for the Kathmandu location, the image/link URLs, and
Devanagari-digit formatting so both posters stay consistent.
"""

from __future__ import annotations

from datetime import date
from urllib.parse import urlencode
from zoneinfo import ZoneInfo

import config
from engine.astronomy.location import ObserverLocation, resolve_location

KATHMANDU_TZ = ZoneInfo("Asia/Kathmandu")
KATHMANDU_CITY_ID = 1283240  # GeoNames id — used to build the shareable link

_DEVANAGARI_DIGITS = "०१२३४५६७८९"


def ne_digits(value: str) -> str:
    """Latin → Devanagari digits (non-digits untouched)."""
    return "".join(_DEVANAGARI_DIGITS[int(c)] if c.isdigit() else c for c in value)


def kathmandu_location() -> ObserverLocation:
    return resolve_location(lat=27.7172, lon=85.324, timezone="Asia/Kathmandu", name="Kathmandu")


def image_url(day: date) -> str:
    """Public /og-image for Kathmandu on `day` — the full-height chart (full=1),
    the same image the daily poster uses, fetched by Facebook to attach."""
    query = urlencode({"city": KATHMANDU_CITY_ID, "date": day.isoformat(), "full": "1"})
    return f"{config.frontend_url()}/og-image?{query}"


def page_url(day: date) -> str:
    """Shareable /panchanga link for Kathmandu on `day`."""
    query = urlencode({"city": KATHMANDU_CITY_ID, "date": day.isoformat()})
    return f"{config.frontend_url()}/panchanga?{query}"
