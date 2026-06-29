"""Rule-based auspicious-date (साइत) filters from sunrise panchanga.

These encode traditional Nepali muhurta rules well enough to serve as a
*computed fallback* when a year/category is not present in the curated
official listings (``rules/sait_dates_v1.json``). The curated data always
takes precedence — see :mod:`services.sait_api`. The goal here is to be
conservative and traditionally defensible (exclude what the shastra clearly
forbids) rather than to reproduce the Panchang Nirnayak Samiti list exactly,
which is partly hand-curated and cannot be derived algorithmically.

Key exclusions applied across the saṃskāra categories:
  * Adhik Maas (मलमास)        — no auspicious saṃskāra in an intercalary month.
  * Kharmas / Dhanurmas       — Sun in Dhanu or late Meena (मलमास-तुल्य).
  * Chaturmas (चातुर्मास)     — Vishnu's sleep; marriages/saṃskāra paused.
  * Tara-ast (गुरु/शुक्र अस्त) — Jupiter/Venus combust (vivah, vrata, vyapar).
  * Rikta tithi & Amavasya    — inauspicious lunar days.
"""

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


# Lunar (festival masa) month names — see panchanga.constants.BS_MONTH_NAMES.
# Chaturmas: the four lunar months between Devshayani (Ashadh Shukla 11) and
# Haribodhini (Kartik Shukla 11) Ekadashi, during which Vishnu sleeps and
# marriages / saṃskāra are paused.
CHATURMAS_LUNAR_MONTHS = frozenset({"Shrawan", "Bhadra", "Ashwin", "Kartik"})

# Lunar months in which each saṃskāra is traditionally performed in Nepal.
VIVAH_LUNAR_MONTHS = frozenset(
    {"Mangsir", "Magh", "Falgun", "Baishakh", "Jestha", "Ashadh"}
)
BRATABANDHA_LUNAR_MONTHS = frozenset(
    {"Mangsir", "Magh", "Falgun", "Baishakh", "Jestha"}
)
GRIHA_LUNAR_MONTHS = frozenset(
    {"Mangsir", "Magh", "Falgun", "Baishakh", "Jestha", "Ashadh"}
)

# Nakshatra indices are 1-based (Ashwini = 1).
MARRIAGE_NAKSHATRAS = frozenset({4, 5, 12, 13, 14, 15, 18, 22, 23, 24, 27})
BRATABANDHA_NAKSHATRAS = frozenset({1, 5, 7, 8, 12, 13, 14, 15, 19, 22, 23, 24, 27})
GRIHA_AARAMBHA_NAKSHATRAS = frozenset({4, 5, 12, 13, 14, 17, 18, 22, 27})
GRIHA_PRAVESH_NAKSHATRAS = frozenset({3, 4, 5, 13, 14, 15, 17, 22, 23, 24, 27})
BUSINESS_NAKSHATRAS = frozenset({1, 8, 14, 18, 23, 27})  # Ashwini, Pushya, Chitra, Anuradha, Shravana, Revati
ANNAPRASAN_NAKSHATRAS = frozenset({1, 5, 7, 8, 13, 14, 15, 18, 23, 24, 27})

# Weekdays (Sunday = 1 … Saturday = 7).
VIVAH_VAARA = frozenset({1, 2, 4, 5, 6})  # avoid Tue, Sat
BRATABANDHA_VAARA = frozenset({2, 4, 5, 6})  # Mon, Wed, Thu, Fri
GRIHA_VAARA = frozenset({2, 4, 5, 6})  # Mon, Wed, Thu, Fri
BUSINESS_VAARA = frozenset({1, 4, 5, 6})  # Sun, Wed, Thu, Fri
ANNAPRASAN_VAARA = frozenset({2, 4, 5, 6})  # Mon, Wed, Thu, Fri

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
    is_adhik_maas: bool
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
    festival_masa = lunar_layers.get("festival_masa") or {}
    lunar_month = festival_masa.get("name")
    is_adhik_maas = bool(festival_masa.get("is_adhik"))

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
        is_adhik_maas=is_adhik_maas,
        aayan=aayan["name"],
        mercury_quadrant=_planet_in_quadrant(mercury_rashi, lagna_rashi),
        jupiter_quadrant=_planet_in_quadrant(jupiter_rashi, lagna_rashi),
    )


# ── Shared predicates ────────────────────────────────────────────────────────

def _not_kharmas(day: DayPanchanga) -> bool:
    return not is_kharmas(day.sun_longitude)


def _is_amavasya(day: DayPanchanga) -> bool:
    return day.tithi_absolute == 30


def _auspicious_tithi(day: DayPanchanga) -> bool:
    """Exclude the universally inauspicious lunar days: rikta and Amavasya."""
    return not is_rikta_tithi(day.tithi_display) and not _is_amavasya(day)


def _in_chaturmas(day: DayPanchanga) -> bool:
    return day.lunar_month in CHATURMAS_LUNAR_MONTHS


def _samskara_base_ok(day: DayPanchanga) -> bool:
    """Common gate for life-cycle saṃskāra: no Malmas, no Kharmas, clean tithi."""
    if day.is_adhik_maas:
        return False
    if not _not_kharmas(day):
        return False
    return _auspicious_tithi(day)


# ── Category checks ──────────────────────────────────────────────────────────

def check_vivah(day: DayPanchanga) -> bool:
    if not _samskara_base_ok(day):
        return False
    # Guru / Shukra must not be combust (तारा अस्त).
    if day.jupiter_combust or day.venus_combust:
        return False
    # No marriages during Chaturmas, or outside the recognised vivah months.
    if _in_chaturmas(day) or day.lunar_month not in VIVAH_LUNAR_MONTHS:
        return False
    if day.nakshatra not in MARRIAGE_NAKSHATRAS:
        return False
    if day.vaara not in VIVAH_VAARA:
        return False
    return True


def check_bratabandha(day: DayPanchanga) -> bool:
    if not _samskara_base_ok(day):
        return False
    # Upanayana is an Uttarayana saṃskāra; Guru should not be combust.
    if day.aayan != "Uttarayana":
        return False
    if day.jupiter_combust:
        return False
    if _in_chaturmas(day) or day.lunar_month not in BRATABANDHA_LUNAR_MONTHS:
        return False
    if day.nakshatra not in BRATABANDHA_NAKSHATRAS:
        return False
    if day.vaara not in BRATABANDHA_VAARA:
        return False
    # Shukla paksha is strongly preferred for vrata-bandha.
    if day.paksha != "shukla":
        return False
    return True


def check_griha_aarambha(day: DayPanchanga) -> bool:
    if not _samskara_base_ok(day):
        return False
    if _in_chaturmas(day) or day.lunar_month not in GRIHA_LUNAR_MONTHS:
        return False
    if day.nakshatra not in GRIHA_AARAMBHA_NAKSHATRAS:
        return False
    if day.vaara not in GRIHA_VAARA:
        return False
    return True


def check_griha_pravesh(day: DayPanchanga, *, apurva: bool = True) -> bool:
    if not _samskara_base_ok(day):
        return False
    if _in_chaturmas(day) or is_chaturmas_solar(day.sun_rashi):
        return False
    if day.lunar_month not in GRIHA_LUNAR_MONTHS:
        return False
    if day.paksha != "shukla":
        return False
    if day.tithi_display not in GRIHA_PRAVESH_SHUKLA_TITHIS:
        return False
    if day.nakshatra not in GRIHA_PRAVESH_NAKSHATRAS:
        return False
    if day.vaara not in GRIHA_VAARA:
        return False
    if apurva and day.tithi_display == 4:
        return False
    return True


def check_byaparik_pratisthan(day: DayPanchanga) -> bool:
    if day.is_adhik_maas or not _not_kharmas(day):
        return False
    if not _auspicious_tithi(day):
        return False
    # Trade favours Budha/Guru strength: neither should be combust, and at
    # least one of them should occupy a kendra (quadrant) from the lagna.
    if day.jupiter_combust or day.mercury_combust:
        return False
    if not (day.mercury_quadrant or day.jupiter_quadrant):
        return False
    if day.nakshatra not in BUSINESS_NAKSHATRAS:
        return False
    if day.vaara not in BUSINESS_VAARA:
        return False
    return True


def check_agni_jurne(day: DayPanchanga) -> bool:
    # Agni Vas on Earth, further restricted to clean, non-Kharmas days.
    if not agni_on_earth(day.tithi_absolute, day.vaara):
        return False
    if day.is_adhik_maas or not _not_kharmas(day):
        return False
    return _auspicious_tithi(day)


def check_rudri_jurne(day: DayPanchanga) -> bool:
    # Rudra Vas on Earth, further restricted to clean, non-Kharmas days.
    if not rudra_on_earth(day.tithi_absolute, day.vaara):
        return False
    if day.is_adhik_maas or not _not_kharmas(day):
        return False
    return _auspicious_tithi(day)


def check_annaprasan(day: DayPanchanga) -> bool:
    """Nakshatra/tithi/vaara day filter; the 5–8 month age window needs the
    child's birth date (see services.sait_api)."""
    if day.is_adhik_maas or not _not_kharmas(day):
        return False
    if not _auspicious_tithi(day):
        return False
    if day.nakshatra not in ANNAPRASAN_NAKSHATRAS:
        return False
    if day.vaara not in ANNAPRASAN_VAARA:
        return False
    # Anna-prashana is a Shukla-paksha saṃskāra.
    if day.paksha != "shukla":
        return False
    return True


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
