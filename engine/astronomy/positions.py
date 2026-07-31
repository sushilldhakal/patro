"""Deprecated facade — everything here now lives on a JD-keyed service.

Nothing is computed in this module. Each name below is a ``datetime``-shaped
wrapper that converts to a Julian Day and forwards to the service that owns the
quantity:

===========================  ==============================================
was                          now
===========================  ==============================================
anga helpers, name tables    :mod:`engine.astronomy.panchanga`
rashi / ritu / ayana         :mod:`engine.astronomy.rashi`
lagna                        :mod:`engine.astronomy.lagna`
sun / moon longitudes        :mod:`engine.astronomy.sun`, ``.moon``
===========================  ==============================================

The wrappers exist only so the remaining call sites keep working mid-migration.
Import from the service module instead; this file is deleted once the last
importer moves (phase 2). See docs/computation-architecture-audit.md (A2).
"""

from datetime import datetime

from engine.astronomy.engine import SIDM_LAHIRI as AYANAMSA_LAHIRI, default_engine
from engine.astronomy.lagna import lagna_service
from engine.astronomy.panchanga import (
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
from engine.astronomy.rashi import (
    RASHI_NAMES,
    RASHI_NAMES_NE,
    RITU_DATA,
    ayana_kranti_mark,
    rashi_service,
)
from engine.astronomy.ut_instant import as_julian_day

__all__ = [
    "AYANAMSA_LAHIRI",
    "KARANA_NAMES", "KARANA_SPAN", "NAKSHATRA_NAMES", "NAKSHATRA_SPAN",
    "RASHI_NAMES", "RASHI_NAMES_NE", "RITU_DATA", "TITHI_SPAN",
    "VAARA_ENGLISH", "VAARA_NAMES", "YOGA_NAMES", "YOGA_SPAN",
    "ayana_kranti_mark",
    "find_lagna_end", "get_aayan", "get_chandra_rashi", "get_display_tithi",
    "get_julian_day", "get_karana", "get_lagna", "get_moon_longitude",
    "get_nakshatra", "get_paksha", "get_ritu", "get_sidereal_asc_longitude",
    "get_sun_longitude", "get_sun_moon_positions", "get_surya_rashi",
    "get_tithi_angle", "get_tithi_number", "get_tithi_progress", "get_vaara",
    "get_yoga",
]


# ── time / longitudes ────────────────────────────────────────────────────────

def get_julian_day(dt: datetime) -> float:
    return as_julian_day(dt)


def get_sun_longitude(dt: datetime, sidereal: bool = True, ayanamsa: int | None = None) -> float:
    from engine.astronomy.sun import sun_service

    return sun_service.longitude(as_julian_day(dt), sidereal=sidereal, ayanamsa=ayanamsa)


def get_moon_longitude(dt: datetime, sidereal: bool = True, ayanamsa: int | None = None) -> float:
    from engine.astronomy.moon import moon_service

    return moon_service.longitude(as_julian_day(dt), sidereal=sidereal, ayanamsa=ayanamsa)


def get_sun_moon_positions(
    dt: datetime, sidereal: bool = True, ayanamsa: int | None = None
) -> tuple[float, float]:
    return default_engine.sun_moon_longitudes(
        as_julian_day(dt), sidereal=sidereal, ayanamsa=ayanamsa
    )


# ── angas ────────────────────────────────────────────────────────────────────

def get_tithi_angle(dt: datetime) -> float:
    return panchanga_service.elongation(as_julian_day(dt))


def get_tithi_number(elongation: float) -> int:
    return int(elongation / TITHI_SPAN) + 1


def get_paksha(tithi: int) -> str:
    return "shukla" if tithi <= 15 else "krishna"


def get_display_tithi(tithi: int) -> int:
    return tithi if tithi <= 15 else tithi - 15


def get_tithi_progress(elongation: float) -> float:
    return (elongation % TITHI_SPAN) / TITHI_SPAN


def get_nakshatra(dt: datetime, ayanamsa: int | None = None) -> tuple[int, str, float]:
    nak = panchanga_service.nakshatra(as_julian_day(dt), ayanamsa=ayanamsa)
    return nak["number"], nak["name"], nak["progress"]


def get_yoga(dt: datetime, ayanamsa: int | None = None) -> tuple[int, str, float]:
    yoga = panchanga_service.yoga(as_julian_day(dt), ayanamsa=ayanamsa)
    return yoga["number"], yoga["name"], yoga["progress"]


def get_karana(dt: datetime) -> tuple[int, str]:
    karana = panchanga_service.karana(as_julian_day(dt))
    return karana["number"], karana["name"]


def get_vaara(dt: datetime, timezone_name: str = "Asia/Kathmandu") -> tuple[int, str, str]:
    vara = panchanga_service.vara(as_julian_day(dt), timezone_name)
    return vara["number"], vara["name"], vara["english"]


# ── rashi / ritu / ayana ─────────────────────────────────────────────────────

def get_chandra_rashi(dt: datetime) -> dict:
    return rashi_service.chandra(as_julian_day(dt))


def get_surya_rashi(dt: datetime) -> dict:
    return rashi_service.surya(as_julian_day(dt))


def get_ritu(
    dt: datetime,
    *,
    sidereal: bool = False,
    lat: float | None = None,
    timezone_name: str = "Asia/Kathmandu",
) -> dict:
    return rashi_service.ritu(
        as_julian_day(dt), sidereal=sidereal, lat=lat, timezone_name=timezone_name
    )


def get_aayan(dt: datetime, *, sidereal: bool = True) -> dict:
    return rashi_service.aayan(as_julian_day(dt), sidereal=sidereal)


# ── lagna ────────────────────────────────────────────────────────────────────

def get_sidereal_asc_longitude(
    dt: datetime, *, lat: float, lon: float, ayanamsa: int = AYANAMSA_LAHIRI
) -> float:
    return lagna_service.longitude(as_julian_day(dt), lat=lat, lon=lon, ayanamsa=ayanamsa)


def get_lagna(
    dt: datetime, *, lat: float, lon: float, ayanamsa: int = AYANAMSA_LAHIRI
) -> dict:
    return lagna_service.lagna(as_julian_day(dt), lat=lat, lon=lon, ayanamsa=ayanamsa)


def find_lagna_end(
    dt: datetime, *, lat: float, lon: float, ayanamsa: int = AYANAMSA_LAHIRI
):
    from datetime import timedelta

    jd = as_julian_day(dt)
    end_jd = lagna_service.next_boundary(jd, lat=lat, lon=lon, ayanamsa=ayanamsa)
    # Returned as an offset from the caller's own instant rather than rebuilt
    # from the JD: ``datetime_from_jd`` truncates to whole seconds, which would
    # quietly coarsen every lagna span boundary in the payload.
    return dt + timedelta(days=end_jd - jd)
