"""MoonService — every Moon quantity, keyed by Julian Day.

One implementation each of longitude, latitude, speed, phase and illuminated
fraction. Nothing here takes a calendar date: a JD is the only input, so a
caller cannot accidentally ask for "the Moon on BS 2083-04-15" and get a
different answer than a caller asking for the same instant in AD.

Phase and illuminated fraction are new — before this module the backend had no
Moon-phase computation at all (no ``pheno`` call anywhere), so any Moon-phase
display was either derived client-side from the tithi or not wired up.

See docs/computation-architecture-audit.md (sections C, phase 2).
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Any

from engine.astronomy.engine import default_engine
from engine.astronomy.sun import (
    LAT_KATHMANDU,
    LON_KATHMANDU,
    default_altitude,
)

# Synodic month (new moon → new moon), days. Used only to label the phase's age;
# the phase itself is geometric, from the Sun–Moon elongation.
SYNODIC_MONTH_DAYS = 29.530588853

# Eight-fold phase names, in order from new moon. ``phase_index`` returns the
# position in this list.
PHASE_NAMES = (
    "New Moon",
    "Waxing Crescent",
    "First Quarter",
    "Waxing Gibbous",
    "Full Moon",
    "Waning Gibbous",
    "Last Quarter",
    "Waning Crescent",
)

PHASE_NAMES_NE = (
    "औंसी",
    "बढ्दो चन्द्र",
    "अर्ध चन्द्र",
    "बढ्दो गिब्बस",
    "पूर्णिमा",
    "घट्दो गिब्बस",
    "अर्ध चन्द्र",
    "घट्दो चन्द्र",
)


# ── day-typed rise/set entry points (phase 5 collapses these) ────────────────
#
# The Moon rises ~50 minutes later each day, so a civil day can hold two
# moonrises or none at all. That is why the ``_after`` pair exists and is what
# the daily builders actually use: "the next moonrise after sunrise" is a
# well-defined question on every day, where "the moonrise on this date" is not.


def calculate_moonrise(
    date_val: date,
    latitude: float = LAT_KATHMANDU,
    longitude: float = LON_KATHMANDU,
    altitude: float | None = None,
    timezone_name: str | None = None,
) -> datetime | None:
    if altitude is None:
        altitude = default_altitude(latitude, longitude)
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
        altitude = default_altitude(latitude, longitude)
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
        altitude = default_altitude(latitude, longitude)
    return default_engine.rise_after(after_dt, "moon", latitude, longitude, altitude)


def calculate_moonset_after(
    after_dt: datetime,
    latitude: float = LAT_KATHMANDU,
    longitude: float = LON_KATHMANDU,
    altitude: float | None = None,
    timezone_name: str | None = None,
) -> datetime | None:
    if altitude is None:
        altitude = default_altitude(latitude, longitude)
    return default_engine.set_after(after_dt, "moon", latitude, longitude, altitude)


class MoonService:
    """Moon quantities at a Julian Day. Stateless — see ``moon_service``."""

    def __init__(self, engine: Any = None) -> None:
        self._engine = engine if engine is not None else default_engine

    # ── position ────────────────────────────────────────────────────────────

    def longitude(
        self, jd: float, *, sidereal: bool = True, ayanamsa: int | None = None
    ) -> float:
        """Ecliptic longitude in degrees [0, 360). Sidereal (Lahiri) by default."""
        return self._engine.moon_longitude(jd, sidereal=sidereal, ayanamsa=ayanamsa)

    def latitude(self, jd: float) -> float:
        """Ecliptic latitude (शर) in degrees, north positive.

        Ayanamsha-independent. Previously computed but discarded — ``_calc``
        keeps only longitude and speed.
        """
        return float(self._engine.planet_astro_extras(jd, "moon")["latitude"])

    def speed(
        self, jd: float, *, sidereal: bool = True, ayanamsa: int | None = None
    ) -> float:
        """Longitude rate in degrees/day. Always positive — the Moon never retrogrades."""
        return float(
            self._engine.planet_position(
                jd, "moon", sidereal=sidereal, ayanamsa=ayanamsa
            )["speed"]
        )

    def declination(self, jd: float) -> float:
        """Declination (क्रान्ति) in degrees."""
        return float(self._engine.planet_astro_extras(jd, "moon")["declination"])

    def position(
        self, jd: float, *, sidereal: bool = True, ayanamsa: int | None = None
    ) -> dict[str, Any]:
        """longitude, latitude, speed, declination and rashi in one call."""
        pos = self._engine.planet_position(
            jd, "moon", sidereal=sidereal, ayanamsa=ayanamsa
        )
        extras = self._engine.planet_astro_extras(jd, "moon")
        return {
            "longitude": pos["longitude"],
            "speed": pos["speed"],
            "rashi": pos["rashi"],
            "latitude": extras["latitude"],
            "right_ascension": extras["right_ascension"],
            "declination": extras["declination"],
        }

    # ── rise / set ──────────────────────────────────────────────────────────

    def moonrise_after(self, jd: float, location: Any):
        """First moonrise at or after *jd*, or ``None`` if the Moon stays down.

        "After an instant" rather than "on a day": at ~50 minutes of daily drift
        a civil day can contain two moonrises or none, so a day-keyed answer has
        to pick one arbitrarily.
        """
        from engine.astronomy.ut_instant import ut_instant_from_jd

        return calculate_moonrise_after(
            ut_instant_from_jd(jd),
            latitude=location.lat,
            longitude=location.lon,
            altitude=location.altitude,
            timezone_name=location.timezone,
        )

    def moonset_after(self, jd: float, location: Any):
        """First moonset at or after *jd*, or ``None`` if the Moon stays up."""
        from engine.astronomy.ut_instant import ut_instant_from_jd

        return calculate_moonset_after(
            ut_instant_from_jd(jd),
            latitude=location.lat,
            longitude=location.lon,
            altitude=location.altitude,
            timezone_name=location.timezone,
        )

    # ── phase ───────────────────────────────────────────────────────────────

    def elongation(self, jd: float) -> float:
        """Sun→Moon elongation in degrees [0, 360) — the angle the phase rides on.

        This is the same quantity the tithi is cut from (tithi = elongation / 12),
        computed from the same longitudes, so phase and tithi can never disagree.
        """
        sun_lon, moon_lon = self._engine.sun_moon_longitudes(jd, sidereal=True)
        return (moon_lon - sun_lon) % 360.0

    def illuminated_fraction(self, jd: float) -> float:
        """Fraction of the Moon's disc that is lit, 0.0–1.0."""
        return float(self._engine.phenomena(jd, "moon")["illuminated_fraction"])

    def phase_angle(self, jd: float) -> float:
        """Sun–Moon–Earth phase angle in degrees (0 = full, 180 = new)."""
        return float(self._engine.phenomena(jd, "moon")["phase_angle"])

    def is_waxing(self, jd: float) -> bool:
        """``True`` between new and full moon (शुक्ल पक्ष)."""
        return self.elongation(jd) < 180.0

    def phase_index(self, jd: float) -> int:
        """0–7 index into :data:`PHASE_NAMES`.

        Each name covers 45° of elongation centred on its exact moment, so
        "Full Moon" spans 157.5°–202.5° rather than only the instant of 180°.
        """
        return int(((self.elongation(jd) + 22.5) % 360.0) // 45.0)

    def phase(self, jd: float) -> dict[str, Any]:
        """The complete Moon-phase block for a Julian Day.

        ``age_days`` is time since the previous new moon, derived from the
        elongation rather than counted from an epoch, so it stays consistent
        with ``elongation`` and with the tithi.
        """
        elongation = self.elongation(jd)
        index = int(((elongation + 22.5) % 360.0) // 45.0)
        return {
            "elongation": round(elongation, 6),
            "phase_index": index,
            "name": PHASE_NAMES[index],
            "name_ne": PHASE_NAMES_NE[index],
            "illuminated_fraction": round(self.illuminated_fraction(jd), 6),
            "phase_angle": round(self.phase_angle(jd), 6),
            "is_waxing": elongation < 180.0,
            "age_days": round(elongation / 360.0 * SYNODIC_MONTH_DAYS, 4),
        }


# Module-level singleton — the one MoonService callers should use.
moon_service = MoonService()
