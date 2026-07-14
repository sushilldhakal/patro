"""Compatibility shim — thin wrappers that delegate to AstronomyEngine.

All swisseph calls now live in engine.astronomy.engine. This module keeps the
existing datetime-based function signatures so vedic modules need not change.
Migrate callers to AstronomyEngine directly when convenient.
"""

from __future__ import annotations

from datetime import date, datetime, time, timezone
from typing import Any

from engine.astronomy.engine import (
    EphemerisError,
    SIDM_LAHIRI,
    default_engine,
)
from engine.astronomy.nepal_patro_sun import (
    nepal_patro_solar_event,
    should_use_nepal_patro_sun,
)
from engine.astronomy.timescale import resolve_observer_timezone

__all__ = [
    "EphemerisError",
    "AYANAMSA_LAHIRI",
    "PLANET_IDS",
    "init_ephemeris",
    "get_julian_day",
    "julian_day_to_datetime",
    "get_sun_longitude",
    "get_moon_longitude",
    "get_sun_moon_positions",
    "get_ayanamsa",
    "get_planet_position",
    "get_all_planetary_positions",
    "calculate_sunrise",
    "calculate_sunset",
    "calculate_moonrise",
    "calculate_moonset",
    "calculate_moonrise_after",
    "calculate_moonset_after",
    "next_solar_eclipse_max",
    "next_lunar_eclipse_max",
    "graha_spashta_datetime",
]

AYANAMSA_LAHIRI = SIDM_LAHIRI

# Planet name → string key used by AstronomyEngine.
# Value is now a string so callers can pass PLANET_IDS["jupiter"] to get_planet_position.
PLANET_IDS: dict[str, str] = {
    "sun": "sun",
    "moon": "moon",
    "mercury": "mercury",
    "venus": "venus",
    "mars": "mars",
    "jupiter": "jupiter",
    "saturn": "saturn",
    "rahu": "rahu",
}

LAT_KATHMANDU = 27.7172
LON_KATHMANDU = 85.3240
ALT_KATHMANDU = 1400.0


def _default_altitude(latitude: float, longitude: float) -> float:
    """Observer altitude when the caller didn't supply one.

    Sea level everywhere. Feeding Kathmandu's ~1400 m elevation produced a
    ~1.1° geometric horizon dip that advanced sunrise / delayed sunset by
    ~7 min each (a flat 14h00m day). The valley's real horizon is the
    surrounding hills (above the astronomical horizon), so the sea-cliff dip
    is unphysical here; sea level matches standard published panchang times.
    """
    return 0.0


def init_ephemeris(ayanamsa: int = SIDM_LAHIRI) -> None:
    """No-op — AstronomyEngine initialises on import."""


def _ensure_initialized() -> None:
    """No-op — AstronomyEngine initialises on import."""


# ── time ─────────────────────────────────────────────────────────────────────

def get_julian_day(dt: datetime) -> float:
    return default_engine.julian_day(dt)


def julian_day_to_datetime(jd: float) -> datetime:
    return default_engine.datetime_from_jd(jd)


# ── longitudes ───────────────────────────────────────────────────────────────

def get_sun_longitude(
    dt: datetime,
    sidereal: bool = True,
    *,
    ayanamsa: int = SIDM_LAHIRI,
) -> float:
    jd = default_engine.julian_day(dt)
    return default_engine.sun_longitude(jd, sidereal=sidereal, ayanamsa=ayanamsa)


def get_moon_longitude(
    dt: datetime, sidereal: bool = True, *, ayanamsa: int = SIDM_LAHIRI
) -> float:
    jd = default_engine.julian_day(dt)
    return default_engine.moon_longitude(jd, sidereal=sidereal, ayanamsa=ayanamsa)


def get_sun_moon_positions(
    dt: datetime, sidereal: bool = True, *, ayanamsa: int = SIDM_LAHIRI
) -> tuple[float, float]:
    jd = default_engine.julian_day(dt)
    return default_engine.sun_moon_longitudes(jd, sidereal=sidereal, ayanamsa=ayanamsa)


def get_ayanamsa(dt: datetime, ayanamsa: int = SIDM_LAHIRI) -> float:
    jd = default_engine.julian_day(dt)
    return default_engine.ayanamsa(jd, mode=ayanamsa)


# ── planets ──────────────────────────────────────────────────────────────────

def get_planet_position(
    dt: datetime,
    planet: str,
    *,
    sidereal: bool = True,
    ayanamsa: int = SIDM_LAHIRI,
) -> dict[str, Any]:
    """planet is a string name ('sun', 'moon', …) matching PLANET_IDS keys."""
    jd = default_engine.julian_day(dt)
    return default_engine.planet_position(jd, planet, sidereal=sidereal, ayanamsa=ayanamsa)


def _dms_absolute(longitude: float) -> str:
    d = int(longitude)
    m_frac = (longitude - d) * 60.0
    m = int(m_frac)
    s = round((m_frac - m) * 60.0)
    if s >= 60:
        s -= 60; m += 1
    if m >= 60:
        m -= 60; d += 1
    return f'{d:03d}°{m:02d}\'{s:02d}"'


def _dms_in_sign(longitude: float) -> str:
    deg_in_sign = longitude % 30.0
    d = int(deg_in_sign)
    m_frac = (deg_in_sign - d) * 60.0
    m = int(m_frac)
    s = round((m_frac - m) * 60.0)
    if s >= 60:
        s -= 60; m += 1
    if m >= 60:
        m -= 60; d += 1
    return f'{d:02d}°{m:02d}\'{s:02d}"'


def _enrich_planet_position(
    pos: dict[str, Any], *, rashi_names: list[str], rashi_names_ne: list[str]
) -> dict[str, Any]:
    longitude = float(pos["longitude"])
    rashi_idx = int(longitude / 30) % 12
    speed = float(pos.get("speed", 0.0))
    return {
        **pos,
        "rashi": rashi_idx + 1,
        "rashi_name": rashi_names[rashi_idx],
        "rashi_ne": rashi_names_ne[rashi_idx],
        "dms": _dms_absolute(longitude),
        "deg_in_rashi": round(longitude % 30.0, 6),
        "dms_in_rashi": _dms_in_sign(longitude),
        "is_retrograde": speed < 0,
    }


def get_all_planetary_positions(
    dt: datetime,
    *,
    sidereal: bool = True,
    ayanamsa: int = SIDM_LAHIRI,
) -> dict[str, Any]:
    from engine.astronomy.positions import RASHI_NAMES, RASHI_NAMES_NE

    jd = default_engine.julian_day(dt)
    raw = default_engine.all_planet_positions(jd, sidereal=sidereal, ayanamsa=ayanamsa)

    positions: dict[str, Any] = {}
    for name in PLANET_IDS:
        positions[name] = _enrich_planet_position(
            raw[name], rashi_names=RASHI_NAMES, rashi_names_ne=RASHI_NAMES_NE
        )

    # Nodes are displayed वक्री by convention; the true node's instantaneous
    # speed oscillates and would otherwise flicker between direct/retrograde.
    positions["rahu"]["is_retrograde"] = True

    rahu_long = positions["rahu"]["longitude"]
    ketu_long = (rahu_long + 180.0) % 360
    ketu_pos = _enrich_planet_position(
        {
            "longitude": round(ketu_long, 6),
            "speed": round(-positions["rahu"]["speed"], 6),
            "rashi": int(ketu_long / 30) % 12 + 1,
        },
        rashi_names=RASHI_NAMES,
        rashi_names_ne=RASHI_NAMES_NE,
    )
    ketu_pos["is_retrograde"] = True
    positions["ketu"] = ketu_pos
    return positions


# ── rise / set ───────────────────────────────────────────────────────────────

def calculate_sunrise(
    date_val: date,
    latitude: float = LAT_KATHMANDU,
    longitude: float = LON_KATHMANDU,
    altitude: float | None = None,
    timezone_name: str | None = None,
) -> datetime:
    if should_use_nepal_patro_sun(latitude, longitude, altitude=altitude):
        return nepal_patro_solar_event(
            date_val, latitude, longitude, rise=True, timezone_name=timezone_name,
        )
    if altitude is None:
        altitude = _default_altitude(latitude, longitude)
    result = default_engine.rise(
        date_val, "sun", latitude, longitude, altitude, timezone_name=timezone_name
    )
    if result is None:
        raise EphemerisError(f"Sunrise calculation failed for {date_val}")
    return result


def calculate_sunset(
    date_val: date,
    latitude: float = LAT_KATHMANDU,
    longitude: float = LON_KATHMANDU,
    altitude: float | None = None,
    timezone_name: str | None = None,
) -> datetime:
    if should_use_nepal_patro_sun(latitude, longitude, altitude=altitude):
        return nepal_patro_solar_event(
            date_val, latitude, longitude, rise=False, timezone_name=timezone_name,
        )
    if altitude is None:
        altitude = _default_altitude(latitude, longitude)
    result = default_engine.set(
        date_val, "sun", latitude, longitude, altitude, timezone_name=timezone_name
    )
    if result is None:
        raise EphemerisError(f"Sunset calculation failed for {date_val}")
    return result


def calculate_moonrise(
    date_val: date,
    latitude: float = LAT_KATHMANDU,
    longitude: float = LON_KATHMANDU,
    altitude: float | None = None,
    timezone_name: str | None = None,
) -> datetime | None:
    if altitude is None:
        altitude = _default_altitude(latitude, longitude)
    return default_engine.rise(
        date_val, "moon", latitude, longitude, altitude, timezone_name=timezone_name
    )


def calculate_moonset(
    date_val: date,
    latitude: float = LAT_KATHMANDU,
    longitude: float = LON_KATHMANDU,
    altitude: float | None = None,
    timezone_name: str | None = None,
) -> datetime | None:
    if altitude is None:
        altitude = _default_altitude(latitude, longitude)
    return default_engine.set(
        date_val, "moon", latitude, longitude, altitude, timezone_name=timezone_name
    )


def calculate_moonrise_after(
    after_dt: datetime,
    latitude: float = LAT_KATHMANDU,
    longitude: float = LON_KATHMANDU,
    altitude: float | None = None,
    timezone_name: str | None = None,
) -> datetime | None:
    if altitude is None:
        altitude = _default_altitude(latitude, longitude)
    return default_engine.rise_after(after_dt, "moon", latitude, longitude, altitude)


def calculate_moonset_after(
    after_dt: datetime,
    latitude: float = LAT_KATHMANDU,
    longitude: float = LON_KATHMANDU,
    altitude: float | None = None,
    timezone_name: str | None = None,
) -> datetime | None:
    if altitude is None:
        altitude = _default_altitude(latitude, longitude)
    return default_engine.set_after(after_dt, "moon", latitude, longitude, altitude)


def next_solar_eclipse_max(jd: float, *, backward: bool = False) -> float | None:
    """JD of the next (or previous) global solar-eclipse maximum."""
    return default_engine.next_solar_eclipse_max(jd, backward=backward)


def next_lunar_eclipse_max(jd: float, *, backward: bool = False) -> float | None:
    """JD of the next (or previous) lunar-eclipse maximum."""
    return default_engine.next_lunar_eclipse_max(jd, backward=backward)


def graha_spashta_datetime(target: date, timezone_name: str) -> datetime:
    """Local 06:00 anchor for graha spashta (some patros use 06:00; Surya uses sunrise)."""
    observer_tz = resolve_observer_timezone(timezone_name)
    return datetime.combine(target, time(6, 0), tzinfo=observer_tz)
