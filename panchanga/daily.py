"""Daily Panchanga builder — core of a Patro."""

from __future__ import annotations

from datetime import date
from typing import Any

from core.location import DEFAULT_LOCATION, ObserverLocation
from core.swiss_eph import calculate_sunrise, calculate_sunset
from core.time_utils import resolve_observer_timezone
from panchanga.bikram_sambat import gregorian_to_bs
from panchanga.lunar_month import get_lunar_month_for_date
from panchanga.tithi import calculate_tithi
from panchanga.tithi_boundaries import find_tithi_end
from core.positions import get_karana, get_nakshatra, get_vaara, get_yoga


def _time_block(dt, timezone_name: str) -> dict[str, str]:
    local_tz = resolve_observer_timezone(timezone_name)
    local = dt.astimezone(local_tz)
    return {
        "utc": dt.isoformat(),
        "local": local.isoformat(),
        "local_time": local.strftime("%H:%M:%S"),
    }


def build_daily_panchanga(
    target: date,
    location: ObserverLocation = DEFAULT_LOCATION,
    *,
    include_festivals: bool = False,
) -> dict[str, Any]:
    """Full udaya panchanga for one civil day at the observer location."""
    sunrise_utc = calculate_sunrise(
        target,
        latitude=location.lat,
        longitude=location.lon,
        timezone_name=location.timezone,
    )
    sunset_utc = calculate_sunset(
        target,
        latitude=location.lat,
        longitude=location.lon,
        timezone_name=location.timezone,
    )

    tithi_info = calculate_tithi(sunrise_utc)
    tithi_end = find_tithi_end(sunrise_utc)
    nak_num, nak_name, nak_progress = get_nakshatra(sunrise_utc)
    yoga_num, yoga_name, yoga_progress = get_yoga(sunrise_utc)
    karana_num, karana_name = get_karana(sunrise_utc)
    vaara_num, vaara_sanskrit, vaara_english = get_vaara(sunrise_utc, location.timezone)

    bs_year, bs_month, bs_day = gregorian_to_bs(target)
    lunar = get_lunar_month_for_date(target)

    display_tithi = tithi_info["display_number"]
    paksha = tithi_info["paksha"]

    payload: dict[str, Any] = {
        "date": target.isoformat(),
        "bs_date": {"year": bs_year, "month": bs_month, "day": bs_day},
        "location": location.as_dict(),
        "sunrise": _time_block(sunrise_utc, location.timezone),
        "sunset": _time_block(sunset_utc, location.timezone),
        "vaara": {
            "number": vaara_num,
            "name_sanskrit": vaara_sanskrit,
            "name_english": vaara_english,
        },
        "tithi": {
            "number": tithi_info["number"],
            "display_number": display_tithi,
            "name": tithi_info["name"],
            "paksha": paksha,
            "progress": tithi_info["progress"],
            "end_time": tithi_end.isoformat(),
        },
        "nakshatra": {
            "number": nak_num,
            "name": nak_name,
            "progress": round(nak_progress, 4),
        },
        "yoga": {
            "number": yoga_num,
            "name": yoga_name,
            "progress": round(yoga_progress, 4),
        },
        "karana": {
            "number": karana_num,
            "name": karana_name,
        },
        "lunar_month": lunar,
        "markers": {
            "is_purnima": paksha == "shukla" and display_tithi == 15,
            "is_amavasya": paksha == "krishna" and display_tithi == 15,
            "is_ekadashi": display_tithi == 11,
        },
    }

    if include_festivals:
        from service.holiday_generator import holidays_on_date

        day_holidays = holidays_on_date(target, location)
        payload["festivals"] = day_holidays["holidays"]

    return payload
