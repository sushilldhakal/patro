"""Swiss Ephemeris wrapper (Lahiri sidereal, built-in Moshier ephemeris)."""

from datetime import date, datetime, time, timedelta, timezone

import swisseph as swe

from core.time_utils import resolve_observer_timezone

LAT_KATHMANDU = 27.7172
LON_KATHMANDU = 85.3240
ALT_KATHMANDU = 1400.0

SUN = swe.SUN
MOON = swe.MOON
SIDEREAL_FLAGS = swe.FLG_SIDEREAL | swe.FLG_SPEED
TROPICAL_FLAGS = swe.FLG_SPEED
AYANAMSA_LAHIRI = swe.SIDM_LAHIRI

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
