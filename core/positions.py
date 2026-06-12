"""Sun/moon positions and Panchanga element calculations."""

from datetime import datetime, timezone

import swisseph as swe

from core.swiss_eph import (
    AYANAMSA_LAHIRI,
    _ensure_initialized,
    get_julian_day,
    get_moon_longitude,
    get_sun_longitude,
    get_sun_moon_positions,
)
from core.time_utils import resolve_observer_timezone

TITHI_SPAN = 12.0
NAKSHATRA_SPAN = 360.0 / 27.0
YOGA_SPAN = 360.0 / 27.0
KARANA_SPAN = 6.0

NAKSHATRA_NAMES = [
    "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
    "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni",
    "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha", "Mula",
    "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha",
    "Purva Bhadrapada", "Uttara Bhadrapada", "Revati",
]

YOGA_NAMES = [
    "Vishkumbha", "Priti", "Ayushman", "Saubhagya", "Shobhana", "Atiganda",
    "Sukarma", "Dhriti", "Shula", "Ganda", "Vriddhi", "Dhruva", "Vyaghata",
    "Harshana", "Vajra", "Siddhi", "Vyatipata", "Variyan", "Parigha", "Shiva",
    "Siddha", "Sadhya", "Shubha", "Shukla", "Brahma", "Indra", "Vaidhriti",
]

KARANA_NAMES = [
    "Bava", "Balava", "Kaulava", "Taitila", "Garija", "Vanija", "Vishti",
    "Shakuni", "Chatushpada", "Naga", "Kimstughna",
]

VAARA_NAMES = [
    "Ravivara", "Somavara", "Mangalavara", "Budhavara",
    "Guruvara", "Shukravara", "Shanivara",
]
VAARA_ENGLISH = [
    "Sunday", "Monday", "Tuesday", "Wednesday",
    "Thursday", "Friday", "Saturday",
]

RASHI_NAMES = [
    "Mesha", "Vrishabha", "Mithuna", "Karka", "Simha", "Kanya",
    "Tula", "Vrishchika", "Dhanu", "Makara", "Kumbha", "Meena",
]

RASHI_NAMES_NE = [
    "मेष", "वृष", "मिथुन", "कर्कट", "सिंह", "कन्या",
    "तुला", "वृश्चिक", "धनु", "मकर", "कुम्भ", "मीन",
]

RITU_DATA = [
    {"number": 1, "name": "Vasanta", "name_sanskrit": "Vasanta", "name_ne": "वसन्त", "season": "Spring"},
    {"number": 2, "name": "Grishma", "name_sanskrit": "Grishma", "name_ne": "ग्रीष्म", "season": "Summer"},
    {"number": 3, "name": "Varsha", "name_sanskrit": "Varsha", "name_ne": "वर्षा", "season": "Monsoon"},
    {"number": 4, "name": "Sharad", "name_sanskrit": "Sharad", "name_ne": "शरद", "season": "Autumn"},
    {"number": 5, "name": "Hemanta", "name_sanskrit": "Hemanta", "name_ne": "हेमन्त", "season": "Pre-winter"},
    {"number": 6, "name": "Shishira", "name_sanskrit": "Shishira", "name_ne": "शिशिर", "season": "Winter"},
]


def get_tithi_angle(dt: datetime) -> float:
    sun_long, moon_long = get_sun_moon_positions(dt)
    return (moon_long - sun_long) % 360


def get_tithi_number(elongation: float) -> int:
    return int(elongation / TITHI_SPAN) + 1


def get_paksha(tithi: int) -> str:
    return "shukla" if tithi <= 15 else "krishna"


def get_display_tithi(tithi: int) -> int:
    return tithi if tithi <= 15 else tithi - 15


def get_tithi_progress(elongation: float) -> float:
    return (elongation % TITHI_SPAN) / TITHI_SPAN


def get_nakshatra(dt: datetime) -> tuple[int, str, float]:
    moon_long = get_moon_longitude(dt)
    nakshatra_float = moon_long / NAKSHATRA_SPAN
    nakshatra_num = int(nakshatra_float) + 1
    if nakshatra_num > 27:
        nakshatra_num = 1
    return nakshatra_num, NAKSHATRA_NAMES[nakshatra_num - 1], nakshatra_float % 1


def get_yoga(dt: datetime) -> tuple[int, str, float]:
    sun_long, moon_long = get_sun_moon_positions(dt)
    total_long = (sun_long + moon_long) % 360
    yoga_float = total_long / YOGA_SPAN
    yoga_num = int(yoga_float) + 1
    if yoga_num > 27:
        yoga_num = 1
    return yoga_num, YOGA_NAMES[yoga_num - 1], yoga_float % 1


def get_karana(dt: datetime) -> tuple[int, str]:
    elongation = get_tithi_angle(dt)
    karana_index = int(elongation / KARANA_SPAN)
    if karana_index == 0:
        name = "Kimstughna"
    elif karana_index >= 57:
        name = ["Shakuni", "Chatushpada", "Naga"][karana_index - 57]
    else:
        name = KARANA_NAMES[(karana_index - 1) % 7]
    return karana_index + 1, name


def get_vaara(dt: datetime, timezone_name: str = "Asia/Kathmandu") -> tuple[int, str, str]:
    local_tz = resolve_observer_timezone(timezone_name)
    if dt.tzinfo is not None:
        local_dt = dt.astimezone(local_tz)
    else:
        local_dt = dt.replace(tzinfo=timezone.utc).astimezone(local_tz)
    weekday = local_dt.weekday()
    vaara_index = (weekday + 1) % 7
    return vaara_index, VAARA_NAMES[vaara_index], VAARA_ENGLISH[vaara_index]


def get_chandra_rashi(dt: datetime) -> dict:
    moon_long = get_moon_longitude(dt)
    rashi_index = int(moon_long / 30) % 12
    progress = (moon_long % 30) / 30
    return {
        "number": rashi_index + 1,
        "name": RASHI_NAMES[rashi_index],
        "name_ne": RASHI_NAMES_NE[rashi_index],
        "longitude": round(moon_long, 6),
        "progress": round(progress, 4),
    }


def get_sidereal_asc_longitude(dt: datetime, *, lat: float, lon: float) -> float:
    """Sidereal ascendant longitude (0–360°) at dt for the observer."""
    _ensure_initialized()
    swe.set_sid_mode(AYANAMSA_LAHIRI)
    jd = get_julian_day(dt)
    _, ascmc = swe.houses(jd, lat, lon, b"P")
    tropical_asc = ascmc[0]
    return (tropical_asc - swe.get_ayanamsa_ut(jd)) % 360


def _lagna_rashi_index(dt: datetime, *, lat: float, lon: float) -> int:
    return int(get_sidereal_asc_longitude(dt, lat=lat, lon=lon) / 30) % 12


def find_lagna_end(dt: datetime, *, lat: float, lon: float) -> datetime:
    """When the ascendant next enters the following rashi after dt."""
    from datetime import timedelta

    current = _lagna_rashi_index(dt, lat=lat, lon=lon)
    start_dt = dt
    end_dt = dt + timedelta(hours=4)
    tolerance = timedelta(seconds=30)

    for _ in range(50):
        if end_dt - start_dt < tolerance:
            return end_dt
        mid_dt = start_dt + (end_dt - start_dt) / 2
        if _lagna_rashi_index(mid_dt, lat=lat, lon=lon) == current:
            start_dt = mid_dt
        else:
            end_dt = mid_dt
    return end_dt


def get_lagna(dt: datetime, *, lat: float, lon: float) -> dict:
    """Sidereal ascendant (lagna) at the given instant and observer."""
    sidereal_asc = get_sidereal_asc_longitude(dt, lat=lat, lon=lon)
    rashi_index = int(sidereal_asc / 30) % 12
    return {
        "number": rashi_index + 1,
        "name": RASHI_NAMES[rashi_index],
        "name_ne": RASHI_NAMES_NE[rashi_index],
        "longitude": round(sidereal_asc, 6),
        "degree_in_rashi": round(sidereal_asc % 30, 4),
        "anchor": "sunrise",
    }


def get_surya_rashi(dt: datetime) -> dict:
    sun_long = get_sun_longitude(dt)
    rashi_index = int(sun_long / 30) % 12
    progress = (sun_long % 30) / 30
    return {
        "number": rashi_index + 1,
        "name": RASHI_NAMES[rashi_index],
        "name_ne": RASHI_NAMES_NE[rashi_index],
        "longitude": round(sun_long, 6),
        "progress": round(progress, 4),
    }


def _sun_rashi_index(dt: datetime, *, sidereal: bool = True) -> int:
    sun_long = get_sun_longitude(dt, sidereal=sidereal)
    return int(sun_long / 30) % 12


# Southern-hemisphere civil month → ritu (inverted meteorological seasons).
_SOUTHERN_MONTH_RITU: dict[int, int] = {
    1: 2,
    2: 2,
    12: 2,  # Dec–Feb summer
    3: 4,
    4: 4,
    5: 4,  # Mar–May autumn
    6: 6,
    7: 6,
    8: 6,  # Jun–Aug winter
    9: 1,
    10: 1,
    11: 1,  # Sep–Nov spring
}


def _ritu_from_sun(dt: datetime, *, sidereal: bool) -> dict:
    rashi_index = _sun_rashi_index(dt, sidereal=sidereal)
    ritu = RITU_DATA[rashi_index // 2]
    return {
        "number": ritu["number"],
        "name": ritu["name"],
        "name_sanskrit": ritu["name_sanskrit"],
        "name_ne": ritu["name_ne"],
        "season": ritu["season"],
        "sun_rashi": rashi_index + 1,
        "basis": "tropical" if not sidereal else "sidereal",
    }


def _ritu_from_southern_month(dt: datetime, timezone_name: str) -> dict:
    local_tz = resolve_observer_timezone(timezone_name)
    if dt.tzinfo is not None:
        local_dt = dt.astimezone(local_tz)
    else:
        local_dt = dt.replace(tzinfo=timezone.utc).astimezone(local_tz)
    ritu_num = _SOUTHERN_MONTH_RITU[local_dt.month]
    ritu = RITU_DATA[ritu_num - 1]
    return {
        "number": ritu["number"],
        "name": ritu["name"],
        "name_sanskrit": ritu["name_sanskrit"],
        "name_ne": ritu["name_ne"],
        "season": ritu["season"],
        "sun_rashi": _sun_rashi_index(dt, sidereal=False) + 1,
        "basis": "southern_local",
    }


def get_ritu(
    dt: datetime,
    *,
    sidereal: bool = False,
    lat: float | None = None,
    timezone_name: str = "Asia/Kathmandu",
) -> dict:
    """Season — sun-sign ritu in the north; local civil-season ritu south of the equator."""
    if lat is not None and lat < 0:
        return _ritu_from_southern_month(dt, timezone_name)
    return _ritu_from_sun(dt, sidereal=sidereal)


def get_aayan(dt: datetime, *, sidereal: bool = True) -> dict:
    """Uttarayana / Dakshinayana from sun's rashi (Makara→Mithuna = Uttarayana)."""
    rashi_index = _sun_rashi_index(dt, sidereal=sidereal)
    if rashi_index in (9, 10, 11, 0, 1, 2):
        return {
            "name": "Uttarayana",
            "name_ne": "उत्तरायण",
            "name_sanskrit": "Uttarayana",
            "sun_rashi": rashi_index + 1,
            "basis": "sidereal" if sidereal else "tropical",
        }
    return {
        "name": "Dakshinayana",
        "name_ne": "दक्षिणायण",
        "name_sanskrit": "Dakshinayana",
        "sun_rashi": rashi_index + 1,
        "basis": "sidereal" if sidereal else "tropical",
    }
