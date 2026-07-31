"""BCE-safe daily panchanga — civil ``CivilDay`` + signed patro BS/BBS context."""

from __future__ import annotations

from datetime import date
from typing import Any

from engine.astronomy.jd_calendar import CivilDay, format_civil_iso
from engine.vedic.solar_corrections import build_solar_corrections
from engine.astronomy.location import DEFAULT_LOCATION, ObserverLocation
from engine.astronomy.moon import calculate_moonrise_after, calculate_moonset_after
from engine.astronomy.panchanga import panchanga_service
from engine.astronomy.sun import (
    calculate_sunrise_civil,
    calculate_sunrise_civil_next,
    calculate_sunset_civil,
)
from engine.astronomy.ut_instant import as_julian_day
from engine.vedic.names_ne import VAARA_NAMES_NE
from engine.vedic.daily import (
    _assemble_udaya_panchanga,
    _display_headers_civil,
    _tithi_name_ne,
)
from engine.vedic.sankranti import BS_MONTH_NAMES
from engine.vedic.tithi import calculate_tithi


def _lunar_stub_for_solar_month(bs_month: int, paksha: str) -> dict[str, Any]:
    """Pūrṇimānta lunar labels from solar BS month when the lunar engine is off."""
    name = BS_MONTH_NAMES[bs_month - 1]
    month_ne = name
    try:
        from engine.vedic.bikram_sambat import BS_MONTH_NAMES_NEPALI

        month_ne = BS_MONTH_NAMES_NEPALI[bs_month - 1]
    except (ImportError, IndexError, ValueError):
        pass
    return {
        "name": name,
        "purnimanta_name": name,
        "purnimanta_name_ne": month_ne,
        "name_ne": month_ne,
        "is_adhik": False,
        "purnimanta_is_adhik": False,
        "source": "solar_month_stub",
        "paksha": paksha,
    }


def _lunar_calendar_stub(lunar: dict, paksha: str) -> dict[str, Any]:
    return {
        "purnimant": {
            "name": lunar.get("purnimanta_name"),
            "name_ne": lunar.get("purnimanta_name_ne"),
            "paksha": paksha,
            "is_adhik": lunar.get("purnimanta_is_adhik", False),
        },
        "amant": {
            "name": lunar.get("name"),
            "name_ne": lunar.get("name_ne"),
            "paksha": paksha,
            "is_adhik": lunar.get("is_adhik", False),
        },
        "source": "solar_month_stub",
    }


def _ns_date_stub() -> dict[str, Any]:
    return {
        "year": 0,
        "label_ne": "—",
        "label_en": "—",
        "available": False,
    }


def build_daily_panchanga_civil(
    civil: CivilDay,
    location: ObserverLocation = DEFAULT_LOCATION,
    *,
    patro_bs_year: int,
    patro_bs_month: int,
    patro_bs_day: int,
    include_festivals: bool = False,
) -> dict[str, Any]:
    """Full udaya panchanga for a BCE/CE civil day on the signed patro axis."""
    sunrise_utc = calculate_sunrise_civil(
        civil,
        latitude=location.lat,
        longitude=location.lon,
        timezone_name=location.timezone,
    )
    sunset_utc = calculate_sunset_civil(
        civil,
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
    vara = panchanga_service.vara(as_julian_day(sunrise_utc), location.timezone)
    vaara_num, vaara_sanskrit, vaara_english = (
        vara["number"], vara["name"], vara["english"]
    )
    paksha = tithi_info["paksha"]
    lunar = _lunar_stub_for_solar_month(patro_bs_month, paksha)
    ns_date = _ns_date_stub()
    date_ad = format_civil_iso(civil.year, civil.month, civil.day)
    next_sunrise_utc = calculate_sunrise_civil_next(
        civil,
        latitude=location.lat,
        longitude=location.lon,
        timezone_name=location.timezone,
    )
    vaara_ne = VAARA_NAMES_NE[vaara_num]

    try:
        solar_anchor_date = civil.to_date()
    except ValueError:
        # ``datetime.date`` cannot represent BCE civil labels; belaantar only
        # needs the ephemeris instant (sunrise), so a fixed probe day is fine
        # for zone meridian / timezone-era metadata.
        solar_anchor_date = date(2020, 6, 15)

    solar_corrections = build_solar_corrections(
        solar_anchor_date,
        local_longitude=location.lon,
        timezone_name=location.timezone,
        at=sunrise_utc,
        lat=location.lat,
    )

    return _assemble_udaya_panchanga(
        sunrise_utc=sunrise_utc,
        sunset_utc=sunset_utc,
        moonrise_utc=moonrise_utc,
        moonset_utc=moonset_utc,
        next_sunrise_utc=next_sunrise_utc,
        location=location,
        tithi_info=tithi_info,
        vaara_num=vaara_num,
        vaara_sanskrit=vaara_sanskrit,
        vaara_english=vaara_english,
        bs_year=patro_bs_year,
        bs_month=patro_bs_month,
        bs_day=patro_bs_day,
        date_label=date_ad,
        date_ad=date_ad,
        jd_ut=civil.to_jd_ut(),
        display=_display_headers_civil(
            date_ad,
            patro_bs_year,
            patro_bs_month,
            patro_bs_day,
            vaara_ne,
            vaara_english,
            ns_date,
        ),
        ns_date=ns_date,
        lunar=lunar,
        lunar_calendar=_lunar_calendar_stub(lunar, paksha),
        solar_corrections=solar_corrections,
        include_festivals=include_festivals,
        festival_date=None,
    )


def get_daily_panchanga_civil(
    civil: CivilDay,
    location: ObserverLocation = DEFAULT_LOCATION,
    *,
    patro_bs_year: int,
    patro_bs_month: int,
    patro_bs_day: int,
    include_festivals: bool = False,
) -> dict[str, Any]:
    from services.panchanga_cache import get_cached_panchanga_jd, store_panchanga_cache_jd

    jd_ut = civil.to_jd_ut()
    cached = get_cached_panchanga_jd(jd_ut, location)
    if cached is not None:
        payload = dict(cached)
        payload.pop("_from_cache", None)
        payload["_from_cache"] = True
        return payload

    payload = build_daily_panchanga_civil(
        civil,
        location,
        patro_bs_year=patro_bs_year,
        patro_bs_month=patro_bs_month,
        patro_bs_day=patro_bs_day,
        include_festivals=include_festivals,
    )
    store_panchanga_cache_jd(jd_ut, location, payload)
    payload["_from_cache"] = False
    return payload
