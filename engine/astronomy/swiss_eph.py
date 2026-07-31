"""Deprecated facade — everything here now lives on a JD-keyed service.

This module used to be the ``swisseph`` wrapper; it has been a shim over
:class:`AstronomyEngine` for a while, and now it does not even wrap that. Every
name is re-exported from the module that owns the quantity:

==============================  ==========================================
was                             now
==============================  ==========================================
``calculate_sun*``              :mod:`engine.astronomy.sun`
``calculate_moon*``             :mod:`engine.astronomy.moon`
``get_planet_position``, DMS    :mod:`engine.astronomy.planets`
``get_all_planetary_positions`` ``planets.spashta_table(jd)``
``get_*_longitude``, ayanamsa   ``sun_service`` / ``moon_service``
``next_*_eclipse_max``          ``default_engine``
``init_ephemeris``              gone — the engine initialises on import
==============================  ==========================================

Import from the owning module instead; this file is deleted once the last
importer moves (phase 2). See docs/computation-architecture-audit.md (A2).
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from engine.astronomy.engine import (
    EphemerisError,
    SIDM_LAHIRI,
    default_engine,
)
from engine.astronomy.moon import (
    calculate_moonrise,
    calculate_moonrise_after,
    calculate_moonset,
    calculate_moonset_after,
    moon_service,
)
from engine.astronomy.nepal_patro_sun import (
    nepal_patro_solar_event,
    should_use_nepal_patro_sun,
)
from engine.astronomy.planets import PLANET_IDS, planet_service, spashta_table
from engine.astronomy.sun import (
    ALT_KATHMANDU,
    LAT_KATHMANDU,
    LON_KATHMANDU,
    calculate_sunrise,
    calculate_sunrise_civil,
    calculate_sunrise_civil_next,
    calculate_sunset,
    calculate_sunset_civil,
    sun_service,
)
from engine.astronomy.ut_instant import as_julian_day

AYANAMSA_LAHIRI = SIDM_LAHIRI

__all__ = [
    "EphemerisError",
    "AYANAMSA_LAHIRI",
    "PLANET_IDS",
    "ALT_KATHMANDU", "LAT_KATHMANDU", "LON_KATHMANDU",
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
    "calculate_sunrise_civil",
    "calculate_sunset_civil",
    "calculate_sunrise_civil_next",
    "calculate_moonrise",
    "calculate_moonset",
    "calculate_moonrise_after",
    "calculate_moonset_after",
    "nepal_patro_solar_event",
    "should_use_nepal_patro_sun",
    "next_solar_eclipse_max",
    "next_lunar_eclipse_max",
]


def init_ephemeris(ayanamsa: int = SIDM_LAHIRI) -> None:
    """No-op — AstronomyEngine initialises on import. Drop the call."""


def _ensure_initialized() -> None:
    """No-op — AstronomyEngine initialises on import. Drop the call."""


def get_julian_day(dt: datetime) -> float:
    return as_julian_day(dt)


def julian_day_to_datetime(jd: float) -> datetime:
    return default_engine.datetime_from_jd(jd)


def get_sun_longitude(
    dt: datetime, sidereal: bool = True, *, ayanamsa: int = SIDM_LAHIRI
) -> float:
    return sun_service.longitude(as_julian_day(dt), sidereal=sidereal, ayanamsa=ayanamsa)


def get_moon_longitude(
    dt: datetime, sidereal: bool = True, *, ayanamsa: int = SIDM_LAHIRI
) -> float:
    return moon_service.longitude(as_julian_day(dt), sidereal=sidereal, ayanamsa=ayanamsa)


def get_sun_moon_positions(
    dt: datetime, sidereal: bool = True, *, ayanamsa: int = SIDM_LAHIRI
) -> tuple[float, float]:
    return sun_service.sun_moon_longitudes(
        as_julian_day(dt), sidereal=sidereal, ayanamsa=ayanamsa
    )


def get_ayanamsa(dt: datetime, ayanamsa: int = SIDM_LAHIRI) -> float:
    return sun_service.ayanamsa(as_julian_day(dt), mode=ayanamsa)


def get_planet_position(
    dt: datetime, planet: str, *, sidereal: bool = True, ayanamsa: int = SIDM_LAHIRI
) -> dict[str, Any]:
    return default_engine.planet_position(
        as_julian_day(dt), planet, sidereal=sidereal, ayanamsa=ayanamsa
    )


def get_all_planetary_positions(
    dt: datetime | Any, *, sidereal: bool = True, ayanamsa: int = SIDM_LAHIRI
) -> dict[str, Any]:
    return spashta_table(as_julian_day(dt), sidereal=sidereal, ayanamsa=ayanamsa)


def next_solar_eclipse_max(jd: float, *, backward: bool = False) -> float | None:
    return default_engine.next_solar_eclipse_max(jd, backward=backward)


def next_lunar_eclipse_max(jd: float, *, backward: bool = False) -> float | None:
    return default_engine.next_lunar_eclipse_max(jd, backward=backward)
