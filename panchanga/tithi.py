"""Tithi calculation and udaya (sunrise) tithi."""

from datetime import date, datetime, timezone
from typing import Any

from core.positions import (
    TITHI_SPAN,
    get_display_tithi,
    get_paksha,
    get_tithi_angle,
    get_tithi_number,
    get_tithi_progress,
)
from core.location import DEFAULT_LOCATION, ObserverLocation
from core.swiss_eph import calculate_sunrise
from core.time_utils import resolve_observer_timezone

TITHI_NAMES = [
    "Pratipada",
    "Dwitiya",
    "Tritiya",
    "Chaturthi",
    "Panchami",
    "Shashthi",
    "Saptami",
    "Ashtami",
    "Navami",
    "Dashami",
    "Ekadashi",
    "Dwadashi",
    "Trayodashi",
    "Chaturdashi",
    "Purnima",
]


def calculate_tithi(dt: date | datetime) -> dict[str, Any]:
    if isinstance(dt, date) and not isinstance(dt, datetime):
        dt = datetime.combine(dt, datetime.min.time()).replace(tzinfo=timezone.utc)
    elif isinstance(dt, datetime) and dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)

    elongation = get_tithi_angle(dt)
    tithi_num = get_tithi_number(elongation)
    paksha = get_paksha(tithi_num)
    display_num = get_display_tithi(tithi_num)
    progress = get_tithi_progress(elongation)

    if display_num == 15:
        name = "Purnima" if paksha == "shukla" else "Amavasya"
    else:
        name = TITHI_NAMES[display_num - 1]

    return {
        "number": tithi_num,
        "display_number": display_num,
        "paksha": paksha,
        "name": name,
        "progress": round(progress, 4),
        "elongation": round(elongation, 4),
    }


def calculate_tithi_at_sunrise(
    date_val: date,
    location: ObserverLocation = DEFAULT_LOCATION,
) -> dict[str, Any]:
    sunrise_utc = calculate_sunrise(
        date_val,
        latitude=location.lat,
        longitude=location.lon,
        timezone_name=location.timezone,
    )
    local_tz = resolve_observer_timezone(location.timezone)
    return {
        **calculate_tithi(sunrise_utc),
        "sunrise": sunrise_utc,
        "sunrise_local": sunrise_utc.astimezone(local_tz),
    }


def get_udaya_tithi(
    date_val: date,
    location: ObserverLocation = DEFAULT_LOCATION,
) -> dict[str, Any]:
    info = calculate_tithi_at_sunrise(date_val, location)
    return {
        "tithi": info["display_number"],
        "tithi_absolute": info["number"],
        "paksha": info["paksha"],
        "name": info["name"],
        "progress": info["progress"],
        "sunrise": info["sunrise"],
        "sunrise_local": info["sunrise_local"],
    }
