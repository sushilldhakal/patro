"""Sun/moon positions and Panchanga element calculations."""

from datetime import datetime, timezone

from engine.astronomy.engine import SIDM_LAHIRI as AYANAMSA_LAHIRI, default_engine
from engine.astronomy.timescale import resolve_observer_timezone

def get_julian_day(dt: datetime) -> float:
    return default_engine.julian_day(dt)

def get_sun_longitude(dt: datetime, sidereal: bool = True, ayanamsa: int | None = None) -> float:
    return default_engine.sun_longitude(default_engine.julian_day(dt), sidereal=sidereal, ayanamsa=ayanamsa)

def get_moon_longitude(dt: datetime, sidereal: bool = True, ayanamsa: int | None = None) -> float:
    return default_engine.moon_longitude(default_engine.julian_day(dt), sidereal=sidereal, ayanamsa=ayanamsa)

def get_sun_moon_positions(dt: datetime, sidereal: bool = True, ayanamsa: int | None = None) -> tuple[float, float]:
    return default_engine.sun_moon_longitudes(default_engine.julian_day(dt), sidereal=sidereal, ayanamsa=ayanamsa)

# The anga arithmetic and its name tables now live in one place —
# engine.astronomy.panchanga.PanchangaService, which is JD-keyed. Everything
# below is re-exported so the ~26 modules importing these names from here keep
# working while they migrate.
from engine.astronomy.panchanga import (  # noqa: E402
    KARANA_NAMES,
    KARANA_SPAN,
    NAKSHATRA_NAMES,
    NAKSHATRA_SPAN,
    TITHI_SPAN,
    VAARA_ENGLISH,
    VAARA_NAMES,
    YOGA_NAMES,
    YOGA_SPAN,
    panchanga_service,
)

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
    return panchanga_service.elongation(default_engine.julian_day(dt))


def get_tithi_number(elongation: float) -> int:
    return int(elongation / TITHI_SPAN) + 1


def get_paksha(tithi: int) -> str:
    return "shukla" if tithi <= 15 else "krishna"


def get_display_tithi(tithi: int) -> int:
    return tithi if tithi <= 15 else tithi - 15


def get_tithi_progress(elongation: float) -> float:
    return (elongation % TITHI_SPAN) / TITHI_SPAN


def get_nakshatra(dt: datetime, ayanamsa: int | None = None) -> tuple[int, str, float]:
    nak = panchanga_service.nakshatra(
        default_engine.julian_day(dt), ayanamsa=ayanamsa
    )
    return nak["number"], nak["name"], nak["progress"]


def get_yoga(dt: datetime, ayanamsa: int | None = None) -> tuple[int, str, float]:
    yoga = panchanga_service.yoga(default_engine.julian_day(dt), ayanamsa=ayanamsa)
    return yoga["number"], yoga["name"], yoga["progress"]


def get_karana(dt: datetime) -> tuple[int, str]:
    karana = panchanga_service.karana(default_engine.julian_day(dt))
    return karana["number"], karana["name"]


def get_vaara(dt: datetime, timezone_name: str = "Asia/Kathmandu") -> tuple[int, str, str]:
    vara = panchanga_service.vara(default_engine.julian_day(dt), timezone_name)
    return vara["number"], vara["name"], vara["english"]


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


def get_sidereal_asc_longitude(
    dt: datetime,
    *,
    lat: float,
    lon: float,
    ayanamsa: int = AYANAMSA_LAHIRI,
) -> float:
    """Sidereal ascendant longitude (0–360°) at dt for the observer."""
    jd = default_engine.julian_day(dt)
    return default_engine.ascendant(jd, lat, lon, ayanamsa=ayanamsa)


def _lagna_rashi_index(
    dt: datetime,
    *,
    lat: float,
    lon: float,
    ayanamsa: int = AYANAMSA_LAHIRI,
) -> int:
    return int(
        get_sidereal_asc_longitude(dt, lat=lat, lon=lon, ayanamsa=ayanamsa) / 30
    ) % 12


def find_lagna_end(
    dt: datetime,
    *,
    lat: float,
    lon: float,
    ayanamsa: int = AYANAMSA_LAHIRI,
) -> datetime:
    """When the ascendant next enters the following rashi after dt."""
    from datetime import timedelta

    current = _lagna_rashi_index(dt, lat=lat, lon=lon, ayanamsa=ayanamsa)
    start_dt = dt
    end_dt = dt + timedelta(hours=4)
    tolerance = timedelta(seconds=30)

    for _ in range(50):
        if end_dt - start_dt < tolerance:
            return end_dt
        mid_dt = start_dt + (end_dt - start_dt) / 2
        if _lagna_rashi_index(mid_dt, lat=lat, lon=lon, ayanamsa=ayanamsa) == current:
            start_dt = mid_dt
        else:
            end_dt = mid_dt
    return end_dt


def get_lagna(
    dt: datetime,
    *,
    lat: float,
    lon: float,
    ayanamsa: int = AYANAMSA_LAHIRI,
) -> dict:
    """Sidereal ascendant (lagna) at the given instant and observer."""
    sidereal_asc = get_sidereal_asc_longitude(
        dt, lat=lat, lon=lon, ayanamsa=ayanamsa
    )
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


def ayana_kranti_mark(aayan: dict) -> str:
    """उ / द mark for Suryakranti — works with fresh and cached aayan dicts."""
    mark = aayan.get("kranti_mark")
    if mark in ("उ", "द"):
        return mark
    if aayan.get("name") == "Uttarayana":
        return "उ"
    name_ne = aayan.get("name_ne") or ""
    if "उत्तर" in name_ne:
        return "उ"
    return "द"


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
            "kranti_mark": "उ",
        }
    return {
        "name": "Dakshinayana",
        "name_ne": "दक्षिणायण",
        "name_sanskrit": "Dakshinayana",
        "sun_rashi": rashi_index + 1,
        "basis": "sidereal" if sidereal else "tropical",
        "kranti_mark": "द",
    }
