"""Swiss Ephemeris wrapper (Lahiri sidereal, built-in Moshier ephemeris)."""

from datetime import date, datetime, time, timedelta, timezone
from typing import Any

import swisseph as swe

from core.time_utils import resolve_observer_timezone

LAT_KATHMANDU = 27.7172
LON_KATHMANDU = 85.3240
ALT_KATHMANDU = 1400.0

SUN = swe.SUN
MOON = swe.MOON
MERCURY = swe.MERCURY
VENUS = swe.VENUS
MARS = swe.MARS
JUPITER = swe.JUPITER
SATURN = swe.SATURN
MEAN_NODE = swe.MEAN_NODE
SIDEREAL_FLAGS = swe.FLG_SIDEREAL | swe.FLG_SPEED
TROPICAL_FLAGS = swe.FLG_SPEED
AYANAMSA_LAHIRI = swe.SIDM_LAHIRI

PLANET_IDS = {
    "sun": SUN,
    "moon": MOON,
    "mercury": MERCURY,
    "venus": VENUS,
    "mars": MARS,
    "jupiter": JUPITER,
    "saturn": SATURN,
    "rahu": MEAN_NODE,
}

_initialized = False


class EphemerisError(Exception):
    pass


def init_ephemeris(ayanamsa: int = AYANAMSA_LAHIRI) -> None:
    global _initialized
    swe.set_sid_mode(ayanamsa)
    _initialized = True


def _ensure_initialized() -> None:
    if not _initialized:
        init_ephemeris()


def _ensure_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        raise EphemerisError(f"Datetime must have timezone info: {dt}")
    return dt.astimezone(timezone.utc)


def get_julian_day(dt: datetime) -> float:
    utc_dt = _ensure_utc(dt)
    hour = utc_dt.hour + utc_dt.minute / 60.0 + utc_dt.second / 3600.0
    return swe.julday(utc_dt.year, utc_dt.month, utc_dt.day, hour)


def julian_day_to_datetime(jd: float) -> datetime:
    year, month, day, hour = swe.revjul(jd)
    hours = int(hour)
    minutes = int((hour - hours) * 60)
    seconds = int(((hour - hours) * 60 - minutes) * 60)
    return datetime(year, month, day, hours, minutes, seconds, tzinfo=timezone.utc)


def get_sun_longitude(dt: datetime, sidereal: bool = True) -> float:
    _ensure_initialized()
    jd = get_julian_day(dt)
    if sidereal:
        swe.set_sid_mode(AYANAMSA_LAHIRI)
    flags = SIDEREAL_FLAGS if sidereal else TROPICAL_FLAGS
    try:
        return swe.calc_ut(jd, SUN, flags)[0][0] % 360
    except (swe.Error, IndexError, TypeError, ValueError) as exc:
        raise EphemerisError(f"Failed to calculate Sun position: {exc}") from exc


def get_moon_longitude(dt: datetime, sidereal: bool = True) -> float:
    _ensure_initialized()
    jd = get_julian_day(dt)
    if sidereal:
        swe.set_sid_mode(AYANAMSA_LAHIRI)
    flags = SIDEREAL_FLAGS if sidereal else TROPICAL_FLAGS
    try:
        return swe.calc_ut(jd, MOON, flags)[0][0] % 360
    except (swe.Error, IndexError, TypeError, ValueError) as exc:
        raise EphemerisError(f"Failed to calculate Moon position: {exc}") from exc


def get_sun_moon_positions(dt: datetime, sidereal: bool = True) -> tuple[float, float]:
    _ensure_initialized()
    jd = get_julian_day(dt)
    if sidereal:
        swe.set_sid_mode(AYANAMSA_LAHIRI)
    flags = SIDEREAL_FLAGS if sidereal else TROPICAL_FLAGS
    try:
        sun_long = swe.calc_ut(jd, SUN, flags)[0][0] % 360
        moon_long = swe.calc_ut(jd, MOON, flags)[0][0] % 360
        return sun_long, moon_long
    except (swe.Error, IndexError, TypeError, ValueError) as exc:
        raise EphemerisError(f"Failed to calculate positions: {exc}") from exc


def calculate_sunrise(
    date_val: date,
    latitude: float = LAT_KATHMANDU,
    longitude: float = LON_KATHMANDU,
    altitude: float = ALT_KATHMANDU,
    timezone_name: str | None = None,
) -> datetime:
    _ensure_initialized()
    observer_tz = resolve_observer_timezone(timezone_name)
    local_midnight = datetime.combine(date_val, time(0, 0), tzinfo=observer_tz)
    jd_start = get_julian_day(local_midnight.astimezone(timezone.utc))
    try:
        result = swe.rise_trans(
            jd_start,
            SUN,
            swe.CALC_RISE,
            (longitude, latitude, altitude),
            0.0,
            0.0,
        )
        if result[0] < 0:
            raise EphemerisError(f"Sunrise calculation failed for {date_val}: code {result[0]}")
        return julian_day_to_datetime(result[1][0])
    except (swe.Error, IndexError, TypeError, ValueError) as exc:
        raise EphemerisError(f"Sunrise calculation failed for {date_val}: {exc}") from exc


def calculate_sunset(
    date_val: date,
    latitude: float = LAT_KATHMANDU,
    longitude: float = LON_KATHMANDU,
    altitude: float = ALT_KATHMANDU,
    timezone_name: str | None = None,
) -> datetime:
    _ensure_initialized()
    observer_tz = resolve_observer_timezone(timezone_name)
    local_midnight = datetime.combine(date_val, time(0, 0), tzinfo=observer_tz)
    jd_start = get_julian_day(local_midnight.astimezone(timezone.utc))
    try:
        result = swe.rise_trans(
            jd_start,
            SUN,
            swe.CALC_SET,
            (longitude, latitude, altitude),
            0.0,
            0.0,
        )
        if result[0] < 0:
            raise EphemerisError(f"Sunset calculation failed for {date_val}: code {result[0]}")
        return julian_day_to_datetime(result[1][0])
    except (swe.Error, IndexError, TypeError, ValueError) as exc:
        raise EphemerisError(f"Sunset calculation failed for {date_val}: {exc}") from exc


def _calculate_rise_set(
    date_val: date,
    body: int,
    calc_flag: int,
    *,
    latitude: float = LAT_KATHMANDU,
    longitude: float = LON_KATHMANDU,
    altitude: float = ALT_KATHMANDU,
    timezone_name: str | None = None,
) -> datetime | None:
    _ensure_initialized()
    observer_tz = resolve_observer_timezone(timezone_name)
    local_midnight = datetime.combine(date_val, time(0, 0), tzinfo=observer_tz)
    jd_start = get_julian_day(local_midnight.astimezone(timezone.utc))
    try:
        result = swe.rise_trans(
            jd_start,
            body,
            calc_flag,
            (longitude, latitude, altitude),
            0.0,
            0.0,
        )
        if result[0] < 0:
            return None
        return julian_day_to_datetime(result[1][0])
    except (swe.Error, IndexError, TypeError, ValueError) as exc:
        raise EphemerisError(f"Rise/set calculation failed for {date_val}: {exc}") from exc


def _calculate_rise_set_after(
    after_dt: datetime,
    body: int,
    calc_flag: int,
    *,
    latitude: float = LAT_KATHMANDU,
    longitude: float = LON_KATHMANDU,
    altitude: float = ALT_KATHMANDU,
) -> datetime | None:
    """Next rise/set for body at or after the given instant (panchanga day = sunrise to sunrise)."""
    _ensure_initialized()
    jd_start = get_julian_day(after_dt.astimezone(timezone.utc))
    try:
        result = swe.rise_trans(
            jd_start,
            body,
            calc_flag,
            (longitude, latitude, altitude),
            0.0,
            0.0,
        )
        if result[0] < 0:
            return None
        return julian_day_to_datetime(result[1][0])
    except (swe.Error, IndexError, TypeError, ValueError) as exc:
        raise EphemerisError(f"Rise/set calculation failed after {after_dt}: {exc}") from exc


def calculate_moonrise(
    date_val: date,
    latitude: float = LAT_KATHMANDU,
    longitude: float = LON_KATHMANDU,
    altitude: float = ALT_KATHMANDU,
    timezone_name: str | None = None,
) -> datetime | None:
    return _calculate_rise_set(
        date_val,
        MOON,
        swe.CALC_RISE,
        latitude=latitude,
        longitude=longitude,
        altitude=altitude,
        timezone_name=timezone_name,
    )


def calculate_moonset(
    date_val: date,
    latitude: float = LAT_KATHMANDU,
    longitude: float = LON_KATHMANDU,
    altitude: float = ALT_KATHMANDU,
    timezone_name: str | None = None,
) -> datetime | None:
    return _calculate_rise_set(
        date_val,
        MOON,
        swe.CALC_SET,
        latitude=latitude,
        longitude=longitude,
        altitude=altitude,
        timezone_name=timezone_name,
    )


def calculate_moonrise_after(
    after_dt: datetime,
    latitude: float = LAT_KATHMANDU,
    longitude: float = LON_KATHMANDU,
    altitude: float = ALT_KATHMANDU,
    timezone_name: str | None = None,
) -> datetime | None:
    return _calculate_rise_set_after(
        after_dt,
        MOON,
        swe.CALC_RISE,
        latitude=latitude,
        longitude=longitude,
        altitude=altitude,
    )


def calculate_moonset_after(
    after_dt: datetime,
    latitude: float = LAT_KATHMANDU,
    longitude: float = LON_KATHMANDU,
    altitude: float = ALT_KATHMANDU,
    timezone_name: str | None = None,
) -> datetime | None:
    return _calculate_rise_set_after(
        after_dt,
        MOON,
        swe.CALC_SET,
        latitude=latitude,
        longitude=longitude,
        altitude=altitude,
    )


def get_ayanamsa(dt: datetime, ayanamsa: int = AYANAMSA_LAHIRI) -> float:
    """Lahiri ayanamsa in degrees at the given instant."""
    _ensure_initialized()
    swe.set_sid_mode(ayanamsa)
    jd = get_julian_day(dt)
    return swe.get_ayanamsa_ut(jd)


def _dms_in_sign(longitude: float) -> str:
    """Degree-minute-second within the current rashi (0–30°), patro style."""
    deg_in_sign = longitude % 30.0
    d = int(deg_in_sign)
    m_frac = (deg_in_sign - d) * 60.0
    m = int(m_frac)
    s = round((m_frac - m) * 60.0)
    if s >= 60:
        s -= 60
        m += 1
    if m >= 60:
        m -= 60
        d += 1
    return f'{d:02d}°{m:02d}\'{s:02d}"'


def _enrich_planet_position(pos: dict[str, Any], *, rashi_names: list[str], rashi_names_ne: list[str]) -> dict[str, Any]:
    longitude = float(pos["longitude"])
    rashi_idx = int(longitude / 30) % 12
    speed = float(pos.get("speed", 0.0))
    enriched = {
        **pos,
        "rashi": rashi_idx + 1,
        "rashi_name": rashi_names[rashi_idx],
        "rashi_ne": rashi_names_ne[rashi_idx],
        "deg_in_rashi": round(longitude % 30.0, 6),
        "dms_in_rashi": _dms_in_sign(longitude),
        "is_retrograde": speed < 0,
    }
    return enriched


def graha_spashta_datetime(target: date, timezone_name: str) -> datetime:
    """Local 06:00 — standard Nepali patro time for ग्रह स्पष्ट."""
    observer_tz = resolve_observer_timezone(timezone_name)
    return datetime.combine(target, time(6, 0), tzinfo=observer_tz)


def get_planet_position(dt: datetime, planet_id: int, *, sidereal: bool = True) -> dict:
    """Sidereal longitude (degrees), speed, and rashi for one body."""
    _ensure_initialized()
    jd = get_julian_day(dt)
    if sidereal:
        swe.set_sid_mode(AYANAMSA_LAHIRI)
    flags = SIDEREAL_FLAGS if sidereal else TROPICAL_FLAGS
    try:
        values = swe.calc_ut(jd, planet_id, flags)[0]
        longitude = values[0] % 360
        speed = values[3]
        rashi = int(longitude / 30) % 12
        return {
            "longitude": round(longitude, 6),
            "speed": round(speed, 6),
            "rashi": rashi + 1,
        }
    except (swe.Error, IndexError, TypeError, ValueError) as exc:
        raise EphemerisError(f"Failed to calculate planet {planet_id}: {exc}") from exc


def get_all_planetary_positions(dt: datetime, *, sidereal: bool = True) -> dict:
    """Sun, Moon, grahas, and Rahu/Ketu at the given instant."""
    from core.positions import RASHI_NAMES, RASHI_NAMES_NE

    positions: dict[str, dict[str, Any]] = {}
    for name, planet_id in PLANET_IDS.items():
        pos = get_planet_position(dt, planet_id, sidereal=sidereal)
        positions[name] = _enrich_planet_position(
            pos,
            rashi_names=RASHI_NAMES,
            rashi_names_ne=RASHI_NAMES_NE,
        )

    rahu_long = positions["rahu"]["longitude"]
    ketu_long = (rahu_long + 180.0) % 360
    ketu_rashi = int(ketu_long / 30) % 12
    positions["ketu"] = _enrich_planet_position(
        {
            "longitude": round(ketu_long, 6),
            "speed": round(-positions["rahu"]["speed"], 6),
            "rashi": ketu_rashi + 1,
        },
        rashi_names=RASHI_NAMES,
        rashi_names_ne=RASHI_NAMES_NE,
    )
    return positions
