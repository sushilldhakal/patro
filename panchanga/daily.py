"""Daily Panchanga builder — core of a Patro."""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any

from core.location import DEFAULT_LOCATION, ObserverLocation
from core.swiss_eph import (
    calculate_moonrise_after,
    calculate_moonset_after,
    calculate_sunrise,
    calculate_sunset,
    get_all_planetary_positions,
    get_ayanamsa,
)
from core.time_utils import resolve_observer_timezone
from panchanga.bikram_sambat import BS_MONTH_NAMES_NEPALI, bs_month_name, gregorian_to_bs
from panchanga.element_boundaries import (
    build_karana_block,
    build_nakshatra_block,
    build_tithi_block,
    build_yoga_block,
)
from panchanga.ghati_time import compute_dinamaan
from panchanga.solar_corrections import build_solar_corrections
from panchanga.lagna_spans import build_lagna_spans
from panchanga.lunar_month import get_lunar_calendar_layers, get_lunar_month_for_date
from panchanga.muhurta import build_muhurta_block
from panchanga.names_ne import (
    PAKSHA_NAMES_NE,
    TITHI_NAMES_NE,
    VAARA_NAMES_NE,
    to_nepali_digits,
)
from panchanga.nepal_sambat import gregorian_to_ns
from panchanga.tithi import calculate_tithi
from core.positions import (
    get_aayan,
    get_chandra_rashi,
    get_lagna,
    get_ritu,
    get_surya_rashi,
    get_vaara,
)


def _time_block(dt, timezone_name: str) -> dict[str, str] | None:
    if dt is None:
        return None
    local_tz = resolve_observer_timezone(timezone_name)
    local = dt.astimezone(local_tz)
    return {
        "utc": dt.isoformat(),
        "local": local.isoformat(),
        "local_time": local.strftime("%H:%M:%S"),
        "local_time_short": local.strftime("%H:%M"),
    }


def _tithi_name_ne(display: int, paksha: str) -> str:
    if display == 15:
        return "पूर्णिमा" if paksha == "shukla" else "औंसी"
    return TITHI_NAMES_NE[display - 1]


def _paksha_block(lunar: dict, paksha: str) -> dict:
    from panchanga.sankranti import BS_MONTH_NAMES

    month_name = lunar.get("name") or "Unknown"
    is_adhik = lunar.get("is_adhik", False)
    prefix = "अधिक " if is_adhik else ""
    try:
        month_ne = BS_MONTH_NAMES_NEPALI[BS_MONTH_NAMES.index(month_name)]
    except ValueError:
        month_ne = month_name

    paksha_ne = PAKSHA_NAMES_NE[paksha]
    label_ne = f"{prefix}{month_ne} {paksha_ne}"
    return {
        "name": paksha,
        "name_ne": paksha_ne,
        "lunar_month": month_name,
        "lunar_month_ne": month_ne,
        "is_adhik": is_adhik,
        "label_ne": label_ne,
        "label_en": f"{'Adhik ' if is_adhik else ''}{month_name} {paksha} paksha",
    }


def _display_headers(
    target: date,
    bs_year: int,
    bs_month: int,
    bs_day: int,
    vaara_english: str,
    ns_date: dict,
) -> dict:
    bs_month_ne = BS_MONTH_NAMES_NEPALI[bs_month - 1]
    vaara_ne = VAARA_NAMES_NE[(target.weekday() + 1) % 7]
    return {
        "bs_ne": (
            f"वि.सं. {to_nepali_digits(bs_year)} {bs_month_ne} "
            f"{to_nepali_digits(bs_day)} {vaara_ne}"
        ),
        "gregorian_en": target.strftime("%Y %b %-d, ") + vaara_english,
        "ns_ne": f"ने.सं. {to_nepali_digits(ns_date['year'])} {ns_date['label_ne']}",
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
    moonrise_utc = calculate_moonrise_after(
        sunrise_utc,
        latitude=location.lat,
        longitude=location.lon,
        timezone_name=location.timezone,
    )
    moonset_utc = calculate_moonset_after(
        sunrise_utc,
        latitude=location.lat,
        longitude=location.lon,
        timezone_name=location.timezone,
    )

    tithi_info = calculate_tithi(sunrise_utc)
    vaara_num, vaara_sanskrit, vaara_english = get_vaara(sunrise_utc, location.timezone)

    bs_year, bs_month, bs_day = gregorian_to_bs(target)
    lunar = get_lunar_month_for_date(target)

    display_tithi = tithi_info["display_number"]
    paksha = tithi_info["paksha"]
    tithi_name_ne = _tithi_name_ne(display_tithi, paksha)

    ns_date = gregorian_to_ns(
        target,
        bs_year,
        tithi_display=display_tithi,
        tithi_absolute=tithi_info["number"],
        tithi_name_ne=tithi_name_ne,
        paksha=paksha,
        lunar_month_name=lunar.get("name"),
        is_adhik=lunar.get("is_adhik", False),
        location=location,
    )

    lahiri_ayanamsa = get_ayanamsa(sunrise_utc)
    dinamaan = compute_dinamaan(sunrise_utc, sunset_utc)

    muhurta = build_muhurta_block(sunrise_utc, sunset_utc, vaara_num, location.timezone)
    next_sunrise_utc = calculate_sunrise(
        target + timedelta(days=1),
        latitude=location.lat,
        longitude=location.lon,
        timezone_name=location.timezone,
    )
    lagna_spans = build_lagna_spans(
        sunrise_utc,
        next_sunrise_utc,
        lat=location.lat,
        lon=location.lon,
    )
    sunrise_block = _time_block(sunrise_utc, location.timezone)
    solar_corrections = build_solar_corrections(
        target,
        local_longitude=location.lon,
        timezone_name=location.timezone,
        at=sunrise_utc,
    )

    payload: dict[str, Any] = {
        "date": target.isoformat(),
        "display": _display_headers(target, bs_year, bs_month, bs_day, vaara_english, ns_date),
        "bs_date": {
            "year": bs_year,
            "month": bs_month,
            "day": bs_day,
            "month_name": bs_month_name(bs_month),
            "month_name_ne": BS_MONTH_NAMES_NEPALI[bs_month - 1],
        },
        "ns_date": ns_date,
        "location": location.as_dict(),
        "sunrise": sunrise_block,
        "sunset": _time_block(sunset_utc, location.timezone),
        "solar_corrections": solar_corrections,
        "moonrise": _time_block(moonrise_utc, location.timezone),
        "moonset": _time_block(moonset_utc, location.timezone),
        "dinamaan": dinamaan,
        "lahiri_ayanamsa": {
            "name": "Lahiri",
            "degrees": round(lahiri_ayanamsa, 6),
        },
        "aayan": get_aayan(sunrise_utc),
        "vaara": {
            "number": vaara_num,
            "name_sanskrit": vaara_sanskrit,
            "name_english": vaara_english,
            "name_ne": VAARA_NAMES_NE[vaara_num],
        },
        "tithi": build_tithi_block(sunrise_utc, sunrise_utc, tithi_info),
        "nakshatra": build_nakshatra_block(sunrise_utc, sunrise_utc),
        "yoga": build_yoga_block(sunrise_utc, sunrise_utc),
        "karana": build_karana_block(sunrise_utc, sunrise_utc),
        "paksha": _paksha_block(lunar, paksha),
        "chandra_rashi": get_chandra_rashi(sunrise_utc),
        "surya_rashi": get_surya_rashi(sunrise_utc),
        "ritu": get_ritu(
            sunrise_utc,
            lat=location.lat,
            timezone_name=location.timezone,
        ),
        "lunar_month": lunar,
        "lunar_calendar": get_lunar_calendar_layers(target),
        "planets": get_all_planetary_positions(sunrise_utc),
        "planets_anchor": {
            "type": "udayakal",
            "local_time": sunrise_block.get("local_time_short"),
            "label_ne": "उदयकालिक स्पष्टग्रह (सूर्योदय)",
            "label_en": "Udayakalika Spashtagraha (sunrise)",
        },
        "lagna": get_lagna(sunrise_utc, lat=location.lat, lon=location.lon),
        "lagna_spans": lagna_spans,
        "muhurta": muhurta,
        "markers": {
            "is_purnima": paksha == "shukla" and display_tithi == 15,
            "is_amavasya": paksha == "krishna" and display_tithi == 15,
            "is_ekadashi": display_tithi == 11,
        },
    }

    # Backward-compatible alias (was ayanamsa = Lahiri degrees)
    payload["ayanamsa"] = payload["lahiri_ayanamsa"]

    if include_festivals:
        from services.holiday_generator import festivals_on_date

        day_festivals = festivals_on_date(target, location)
        payload["festivals"] = day_festivals["festivals"]

    return payload


def get_daily_panchanga(
    target: date,
    location: ObserverLocation = DEFAULT_LOCATION,
    *,
    include_festivals: bool = False,
) -> dict[str, Any]:
    """
    Daily panchanga with SQLite cache-aside.

    Cache hit → instant return (no Swiss Ephemeris).
    Cache miss → compute, store, return.
    """
    from services.panchanga_cache import get_cached_panchanga, store_panchanga_cache

    cached = get_cached_panchanga(target, location)
    if cached is not None:
        payload = dict(cached)
        payload.pop("_from_cache", None)
        payload["_from_cache"] = True
    else:
        payload = build_daily_panchanga(target, location)
        store_panchanga_cache(target, location, payload)
        payload["_from_cache"] = False

    if include_festivals:
        from services.holiday_generator import festivals_on_date

        day_festivals = festivals_on_date(target, location)
        payload = {**payload, "festivals": day_festivals["festivals"]}

    return payload
