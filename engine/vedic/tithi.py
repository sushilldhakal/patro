"""Tithi calculation and udaya (sunrise) tithi."""

from datetime import date, datetime, timedelta, timezone
from typing import Any

from engine.astronomy.positions import (
    TITHI_SPAN,
    get_display_tithi,
    get_paksha,
    get_tithi_angle,
    get_tithi_number,
    get_tithi_progress,
)
from engine.astronomy.location import DEFAULT_LOCATION, ObserverLocation
from engine.astronomy.swiss_eph import calculate_sunrise
from engine.astronomy.timescale import resolve_observer_timezone

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
        name = "Purnima" if paksha == "shukla" else "Aausi"
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


def _udaya_number_paksha(
    date_val: date, location: ObserverLocation
) -> tuple[int, str]:
    """(absolute tithi 1–30, paksha) at the sunrise of ``date_val``."""
    info = calculate_tithi_at_sunrise(date_val, location)
    return info["number"], info["paksha"]


def is_kshaya_tithi_day(
    date_val: date,
    location: ObserverLocation = DEFAULT_LOCATION,
) -> bool:
    """True when a tithi is *lost* (kṣaya) between this sunrise and the next.

    Consecutive sunrises normally advance the absolute tithi (1–30) by one. A
    jump of two means a tithi began and ended entirely between the two sunrises
    and so never became an udaya (sunrise) tithi — an avama / kṣaya day.

    NOTE: a *single* lost tithi is common and is NOT the Kṣaya-Pakṣa defect; for
    that whole-fortnight prohibition see :func:`is_kshaya_paksha`.
    """
    today, _ = _udaya_number_paksha(date_val, location)
    tomorrow, _ = _udaya_number_paksha(date_val + timedelta(days=1), location)
    return (tomorrow - today) % 30 == 2


def _paksha_run(
    date_val: date, location: ObserverLocation
) -> tuple[date, date]:
    """(start, end) civil dates of the contiguous same-pakṣa sunrise run that
    contains ``date_val`` (the pakṣa is one uninterrupted shukla/krishna run)."""
    _, paksha = _udaya_number_paksha(date_val, location)
    start = date_val
    while _udaya_number_paksha(start - timedelta(days=1), location)[1] == paksha:
        start -= timedelta(days=1)
    end = date_val
    while _udaya_number_paksha(end + timedelta(days=1), location)[1] == paksha:
        end += timedelta(days=1)
    return start, end


def is_kshaya_paksha(
    date_val: date,
    location: ObserverLocation = DEFAULT_LOCATION,
) -> bool:
    """True when the fortnight (pakṣa) containing ``date_val`` is a Kṣaya Pakṣa —
    a fortnight shortened to only 13 udaya tithis by the loss of **two** tithis.

    A full pakṣa carries 15 tithis and normally spans 14–15 sunrise (udaya)
    days; losing a single tithi (14 days) is ordinary and no defect. Losing two
    tithis leaves a 13-day fortnight, which the śāstra (Garga et al.) calls
    *atinindya* — marriage and all major saṃskāra are abandoned for it, with no
    overriding "safety window". Detected by the civil-day span of the pakṣa run;
    a vṛddhi (repeated) tithi only lengthens the span, so this never
    false-triggers on an ordinary single kṣaya.
    """
    start, end = _paksha_run(date_val, location)
    sunrise_days = (end - start).days + 1
    return sunrise_days <= 13
