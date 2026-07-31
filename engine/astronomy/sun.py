"""SunService — every Sun quantity, keyed by Julian Day.

Sunrise and sunset also need an observer, so they take a location alongside the
JD. Everything else is location-independent.

There used to be four sunrise entry points — ``calculate_sunrise``,
``calculate_sunrise_civil``, ``calculate_sunrise_civil_next`` and
``nepal_patro_solar_event`` — because CE and pre-1 CE days travelled as
different types and a Nepal observer needs the published-table correction.
Picking the wrong one for a given day type was a live footgun, and it was the
mechanism that forced the era-twin builders to exist.

Phase 3 removed the reason for the split, so the collapse is done here:

* :meth:`SunService.sunrise` / :meth:`SunService.sunset` take a JD and pick the
  CE or BCE helper themselves. This is what callers should use.
* ``calculate_sunrise`` / ``calculate_sunset`` remain for the CE-only call sites
  that hold a ``datetime.date`` and nothing else.
* The ``_civil`` helpers are private — nothing outside this module chooses them
  any more, so nothing outside can choose wrong.
* ``calculate_sunrise_civil_next`` is gone; its last caller went with phase 3.

See docs/computation-architecture-audit.md (sections A4, C, phase 2).
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Any

from engine.astronomy.engine import EphemerisError, SIDM_LAHIRI, default_engine
from engine.astronomy.jd_calendar import CivilDay, date_if_supported
from engine.astronomy.nepal_patro_sun import (
    nepal_patro_solar_event,
    should_use_nepal_patro_sun,
)

LAT_KATHMANDU = 27.7172
LON_KATHMANDU = 85.3240
ALT_KATHMANDU = 1400.0


def default_altitude(latitude: float, longitude: float) -> float:
    """Observer altitude when the caller didn't supply one.

    Sea level everywhere. Feeding Kathmandu's ~1400 m elevation produced a
    ~1.1° geometric horizon dip that advanced sunrise / delayed sunset by
    ~7 min each (a flat 14h00m day). The valley's real horizon is the
    surrounding hills (above the astronomical horizon), so the sea-cliff dip
    is unphysical here; sea level matches standard published panchang times.
    """
    return 0.0


# ── day-typed rise/set entry points ─────────────────────────────────────────


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
        altitude = default_altitude(latitude, longitude)
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
        altitude = default_altitude(latitude, longitude)
    result = default_engine.set(
        date_val, "sun", latitude, longitude, altitude, timezone_name=timezone_name
    )
    if result is None:
        raise EphemerisError(f"Sunset calculation failed for {date_val}")
    return result


def _calculate_sunrise_civil(
    civil: CivilDay,
    latitude: float = LAT_KATHMANDU,
    longitude: float = LON_KATHMANDU,
    altitude: float | None = None,
    timezone_name: str | None = None,
) -> datetime:
    greg = date_if_supported(civil.year, civil.month, civil.day)
    if greg is not None and should_use_nepal_patro_sun(
        latitude, longitude, altitude=altitude
    ):
        return nepal_patro_solar_event(
            greg, latitude, longitude, rise=True, timezone_name=timezone_name,
        )
    if altitude is None:
        altitude = default_altitude(latitude, longitude)
    result = default_engine.rise_civil(
        civil, "sun", latitude, longitude, altitude, timezone_name=timezone_name
    )
    if result is None:
        raise EphemerisError(f"Sunrise calculation failed for civil {civil}")
    return result


def _calculate_sunset_civil(
    civil: CivilDay,
    latitude: float = LAT_KATHMANDU,
    longitude: float = LON_KATHMANDU,
    altitude: float | None = None,
    timezone_name: str | None = None,
) -> datetime:
    greg = date_if_supported(civil.year, civil.month, civil.day)
    if greg is not None and should_use_nepal_patro_sun(
        latitude, longitude, altitude=altitude
    ):
        return nepal_patro_solar_event(
            greg, latitude, longitude, rise=False, timezone_name=timezone_name,
        )
    if altitude is None:
        altitude = default_altitude(latitude, longitude)
    result = default_engine.set_civil(
        civil, "sun", latitude, longitude, altitude, timezone_name=timezone_name
    )
    if result is None:
        raise EphemerisError(f"Sunset calculation failed for civil {civil}")
    return result


class SunService:
    """Sun quantities at a Julian Day. Stateless — see ``sun_service``."""

    def __init__(self, engine: Any = None) -> None:
        self._engine = engine if engine is not None else default_engine

    # ── position ────────────────────────────────────────────────────────────

    def longitude(
        self, jd: float, *, sidereal: bool = True, ayanamsa: int | None = None
    ) -> float:
        """Ecliptic longitude in degrees [0, 360). Sidereal (Lahiri) by default."""
        return self._engine.sun_longitude(jd, sidereal=sidereal, ayanamsa=ayanamsa)

    def speed(
        self, jd: float, *, sidereal: bool = True, ayanamsa: int | None = None
    ) -> float:
        """Longitude rate in degrees/day."""
        return float(
            self._engine.planet_position(
                jd, "sun", sidereal=sidereal, ayanamsa=ayanamsa
            )["speed"]
        )

    def declination(self, jd: float) -> float:
        """Declination (क्रान्ति) in degrees — drives the seasons and day length."""
        return float(self._engine.planet_astro_extras(jd, "sun")["declination"])

    def right_ascension(self, jd: float) -> float:
        """Right ascension (विषुवांश) in degrees."""
        return float(self._engine.planet_astro_extras(jd, "sun")["right_ascension"])

    def ayanamsa(self, jd: float, *, mode: int = SIDM_LAHIRI) -> float:
        """Ayanamsha — the tropical↔sidereal offset in degrees at *jd*."""
        return self._engine.ayanamsa(jd, mode=mode)

    def equation_of_time(self, jd: float) -> float:
        """Apparent minus mean solar time, in **days** (engine's native unit)."""
        return self._engine.equation_of_time(jd)

    def equation_of_time_minutes(self, jd: float) -> float:
        """Equation of time in minutes — the form almanacs print."""
        return self._engine.equation_of_time(jd) * 1440.0

    def sun_moon_longitudes(
        self, jd: float, *, sidereal: bool = True, ayanamsa: int | None = None
    ) -> tuple[float, float]:
        """``(sun, moon)`` longitudes from one ephemeris pass."""
        return self._engine.sun_moon_longitudes(
            jd, sidereal=sidereal, ayanamsa=ayanamsa
        )

    # ── rise / set ──────────────────────────────────────────────────────────

    def sunrise(self, jd: float, location: Any):
        """Sunrise on the civil day containing *jd*, as a UTC instant.

        Not a bare ``engine.rise``: a Nepal observer is routed through
        ``nepal_patro_solar_event``, the correction that makes Nepali sunrise
        match the published patro tables. Reaching for ``engine.rise`` directly
        silently loses that, which is why this decision belongs in one place.
        """
        civil = CivilDay.from_jd_ut(jd)
        real_date = date_if_supported(civil.year, civil.month, civil.day)
        if real_date is None:
            return _calculate_sunrise_civil(
                civil,
                latitude=location.lat,
                longitude=location.lon,
                timezone_name=location.timezone,
            )
        return calculate_sunrise(
            real_date,
            latitude=location.lat,
            longitude=location.lon,
            timezone_name=location.timezone,
        )

    def sunset(self, jd: float, location: Any):
        """Sunset on the civil day containing *jd*, as a UTC instant.

        Same Nepal-patro routing as :meth:`sunrise`.
        """
        civil = CivilDay.from_jd_ut(jd)
        real_date = date_if_supported(civil.year, civil.month, civil.day)
        if real_date is None:
            return _calculate_sunset_civil(
                civil,
                latitude=location.lat,
                longitude=location.lon,
                timezone_name=location.timezone,
            )
        return calculate_sunset(
            real_date,
            latitude=location.lat,
            longitude=location.lon,
            timezone_name=location.timezone,
        )

    def sunrise_after(self, instant, location: Any):
        """Next sunrise at or after *instant* — the panchanga day boundary."""
        return self._engine.rise_after(
            instant,
            "sun",
            location.lat,
            location.lon,
            getattr(location, "altitude", 0.0) or 0.0,
        )


sun_service = SunService()
