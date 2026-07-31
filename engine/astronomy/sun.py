"""SunService — every Sun quantity, keyed by Julian Day.

Sunrise and sunset also need an observer, so they take a location alongside the
JD. Everything else is location-independent.

The four historical sunrise entry points (``calculate_sunrise``,
``calculate_sunrise_civil``, ``calculate_sunrise_civil_next``,
``nepal_patro_solar_event``) exist because CE and pre-1 CE days travelled as
different types, and because a Nepal observer needs the published-table
correction. Here there is one entry point: a JD in, an instant out. Callers stop
having to pick — and stop being able to pick wrong.

Rise/set still delegate to the ``swiss_eph`` helpers rather than reimplementing
their CE/BCE branch. Phase 3 collapses that branch; this is where it lands.

See docs/computation-architecture-audit.md (section A4, phase 2).
"""

from __future__ import annotations

from typing import Any

from engine.astronomy.engine import default_engine
from engine.astronomy.jd_calendar import CivilDay, date_if_supported


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

    def equation_of_time(self, jd: float) -> float:
        """Apparent minus mean solar time, in **days** (engine's native unit)."""
        return self._engine.equation_of_time(jd)

    def equation_of_time_minutes(self, jd: float) -> float:
        """Equation of time in minutes — the form almanacs print."""
        return self._engine.equation_of_time(jd) * 1440.0

    # ── rise / set ──────────────────────────────────────────────────────────

    def sunrise(self, jd: float, location: Any):
        """Sunrise on the civil day containing *jd*, as a UTC instant.

        Not a bare ``engine.rise``: a Nepal observer is routed through
        ``nepal_patro_solar_event``, the correction that makes Nepali sunrise
        match the published patro tables. Reaching for ``engine.rise`` directly
        silently loses that, which is why this decision belongs in one place.

        Delegates to the ``swiss_eph`` helpers for now rather than duplicating
        their CE/BCE branch — phase 3 collapses that branch, and this is where
        the merged version lands.
        """
        from engine.astronomy.swiss_eph import (
            calculate_sunrise,
            calculate_sunrise_civil,
        )

        civil = CivilDay.from_jd_ut(jd)
        real_date = date_if_supported(civil.year, civil.month, civil.day)
        if real_date is None:
            return calculate_sunrise_civil(
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
        from engine.astronomy.swiss_eph import calculate_sunset, calculate_sunset_civil

        civil = CivilDay.from_jd_ut(jd)
        real_date = date_if_supported(civil.year, civil.month, civil.day)
        if real_date is None:
            return calculate_sunset_civil(
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
