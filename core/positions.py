"""Sun/moon positions and Panchanga element calculations."""

from datetime import datetime, timezone

from core.swiss_eph import get_moon_longitude, get_sun_longitude, get_sun_moon_positions
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
