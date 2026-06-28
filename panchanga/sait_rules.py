"""Rule-based auspicious-date (साइत) filters from sunrise panchanga."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date

from core.location import DEFAULT_LOCATION, ObserverLocation
from core.positions import (
    get_aayan,
    get_nakshatra,
    get_sidereal_asc_longitude,
    get_surya_rashi,
    get_vaara,
)
from core.swiss_eph import calculate_sunrise, get_planet_position, PLANET_IDS
from panchanga.lunar_month import get_lunar_calendar_layers
from panchanga.tithi import calculate_tithi_at_sunrise


def _angular_separation(lon_a: float, lon_b: float) -> float:
    diff = (lon_a - lon_b) % 360.0
    return min(diff, 360.0 - diff)


def _is_combust(planet_lon: float, sun_lon: float, orb: float) -> bool:
    return _angular_separation(planet_lon, sun_lon) < orb


def _planet_in_quadrant(planet_rashi: int, lagna_rashi: int) -> bool:
    """Whole-sign house; quadrants are kendras 1, 4, 7, 10."""
    house = ((planet_rashi - lagna_rashi) % 12) + 1
    return house in (1, 4, 7, 10)


def is_kharmas(sun_longitude: float) -> bool:
    """Sun in Dhanu (240–270°) or late Meena (330–360°)."""
    return (240.0 <= sun_longitude < 270.0) or (330.0 <= sun_longitude < 360.0)


def is_chaturmas_solar(sun_rashi: int) -> bool:
    """Approximation: Sun in Karka through Tula (monsoon quarter)."""
    return sun_rashi in (4, 5, 6, 7)


def is_rikta_tithi(display_tithi: int) -> bool:
    return display_tithi in (4, 9, 14)


def agni_on_earth(tithi_absolute: int, vaara_number: int) -> bool:
    """Agni Vas — remainder 0 or 3 means Agni on Earth."""
    value = (tithi_absolute + vaara_number) + 1
    return value % 4 in (0, 3)


def rudra_on_earth(tithi_absolute: int, vaara_number: int) -> bool:
    """Rudra Vas — remainder 1 or 6 means Shiva accessible on Earth."""
    value = (tithi_absolute * 3) + vaara_number
    return value % 7 in (1, 6)


# Nakshatra indices are 1-based (Ashwini = 1).
MARRIAGE_NAKSHATRAS = frozenset({4, 5, 12, 13, 14, 15, 18, 22, 23, 24, 27})
GRIHA_AARAMBHA_NAKSHATRAS = frozenset({4, 5, 12, 14, 18, 22, 27})
BUSINESS_NAKSHATRAS = frozenset({1, 8, 14, 18, 23, 27})  # Ashwini, Pushya, Chitra, Anuradha, Shravana, Revati
ANNAPRASAN_NAKSHATRAS = frozenset({1, 5, 7, 8, 13, 14, 15, 18, 23, 24, 27})

IDEAL_BRATABANDHA_VAARA = frozenset({4, 5, 6})  # Wed, Thu, Fri
BUSINESS_VAARA = frozenset({1, 4, 5, 6})  # Sun, Wed, Thu, Fri

GRIHA_PRAVESH_SHUKLA_TITHIS = frozenset({1, 2, 3, 5, 7, 10, 11, 12, 13})


@dataclass(frozen=True)
class DayPanchanga:
    gregorian: date
    tithi_absolute: int
    tithi_display: int
    paksha: str
    nakshatra: int
    vaara: int
    sun_rashi: int
    sun_longitude: float
    jupiter_combust: bool
    venus_combust: bool
    mercury_combust: bool
    lunar_month: str | None
    aayan: str
    mercury_quadrant: bool
    jupiter_quadrant: bool


def build_day_panchanga(
    target: date,
    location: ObserverLocation = DEFAULT_LOCATION,
) -> DayPanchanga:
    sunrise_utc = calculate_sunrise(
        target,
        latitude=location.lat,
        longitude=location.lon,
        timezone_name=location.timezone,
    )
    tithi_info = calculate_tithi_at_sunrise(target, location)
    nak_num, _, _ = get_nakshatra(sunrise_utc)
    vaara_num, _, _ = get_vaara(sunrise_utc, location.timezone)
    surya = get_surya_rashi(sunrise_utc)
    aayan = get_aayan(sunrise_utc)

    sun_lon = surya["longitude"]
    jupiter = get_planet_position(sunrise_utc, PLANET_IDS["jupiter"])["longitude"]
    venus = get_planet_position(sunrise_utc, PLANET_IDS["venus"])["longitude"]
    mercury = get_planet_position(sunrise_utc, PLANET_IDS["mercury"])["longitude"]

    asc_lon = get_sidereal_asc_longitude(
        sunrise_utc, lat=location.lat, lon=location.lon,
    )
    lagna_rashi = int(asc_lon / 30) % 12 + 1
    jupiter_rashi = int(jupiter / 30) % 12 + 1
    mercury_rashi = int(mercury / 30) % 12 + 1

    lunar_layers = get_lunar_calendar_layers(target)
    lunar_month = lunar_layers.get("festival_masa")

    return DayPanchanga(
        gregorian=target,
        tithi_absolute=tithi_info["number"],
        tithi_display=tithi_info["display_number"],
        paksha=tithi_info["paksha"],
        nakshatra=nak_num,
        vaara=vaara_num + 1,  # Sunday = 1 … Saturday = 7
        sun_rashi=surya["number"],
        sun_longitude=sun_lon,
        jupiter_combust=_is_combust(jupiter, sun_lon, 11.0),
        venus_combust=_is_combust(venus, sun_lon, 10.0),
        mercury_combust=_is_combust(mercury, sun_lon, 14.0),
        lunar_month=lunar_month,
        aayan=aayan["name"],
        mercury_quadrant=_planet_in_quadrant(mercury_rashi, lagna_rashi),
        jupiter_quadrant=_planet_in_quadrant(jupiter_rashi, lagna_rashi),
    )


def _not_kharmas(day: DayPanchanga) -> bool:
    return not is_kharmas(day.sun_longitude)


def check_vivah(day: DayPanchanga) -> bool:
    if day.jupiter_combust or day.venus_combust:
        return False
    if not _not_kharmas(day):
        return False
    if day.nakshatra not in MARRIAGE_NAKSHATRAS:
        return False
    if is_rikta_tithi(day.tithi_display):
        return False
    if day.tithi_absolute == 30:  # Amavasya
        return False
    return True


def check_bratabandha(day: DayPanchanga) -> bool:
    if day.aayan != "Uttarayana":
        return False
    if day.vaara in (1, 7):  # Sunday, Saturday
        return False
    if day.vaara not in IDEAL_BRATABANDHA_VAARA:
        return False
    return True


def check_griha_aarambha(day: DayPanchanga) -> bool:
    if day.nakshatra not in GRIHA_AARAMBHA_NAKSHATRAS:
        return False
    if not _not_kharmas(day):
        return False
    return True


def check_griha_pravesh(day: DayPanchanga, *, apurva: bool = True) -> bool:
    if not _not_kharmas(day):
        return False
    if is_chaturmas_solar(day.sun_rashi):
        return False
    if day.paksha != "shukla":
        return False
    if day.tithi_display not in GRIHA_PRAVESH_SHUKLA_TITHIS:
        return False
    if is_rikta_tithi(day.tithi_display):
        return False
    if apurva and day.tithi_display == 4:
        return False
    return True


def check_byaparik_pratisthan(day: DayPanchanga) -> bool:
    if day.jupiter_combust or day.mercury_combust:
        return False
    if not day.mercury_quadrant or not day.jupiter_quadrant:
        return False
    if day.nakshatra not in BUSINESS_NAKSHATRAS:
        return False
    if day.vaara not in BUSINESS_VAARA:
        return False
    return True


def check_agni_jurne(day: DayPanchanga) -> bool:
    return agni_on_earth(day.tithi_absolute, day.vaara)


def check_rudri_jurne(day: DayPanchanga) -> bool:
    return rudra_on_earth(day.tithi_absolute, day.vaara)


def check_annaprasan(day: DayPanchanga) -> bool:
    """Nakshatra-only day filter; age window requires birth date (see API)."""
    return day.nakshatra in ANNAPRASAN_NAKSHATRAS


CATEGORY_CHECKS = {
    "vivah": check_vivah,
    "bratabandha": check_bratabandha,
    "griha-aarambha": check_griha_aarambha,
    "griha-pravesh": lambda d: check_griha_pravesh(d, apurva=True),
    "byaparik-pratisthan": check_byaparik_pratisthan,
    "agni-jurne": check_agni_jurne,
    "rudri-jurne": check_rudri_jurne,
    "annaprasan": check_annaprasan,
}
