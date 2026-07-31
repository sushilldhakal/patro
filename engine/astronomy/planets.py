"""PlanetService — planetary positions, speed and motion, keyed by Julian Day.

Retrograde is *not* re-derived here: it delegates to
:mod:`engine.astronomy.motion`, which is the single definition (phase 1). This
service exposes it so routes and builders never have to reach for the raw speed
and decide for themselves — which is how five inline copies happened.

See docs/computation-architecture-audit.md (sections A3, C, phase 2).
"""

from __future__ import annotations

from typing import Any

from engine.astronomy.engine import PLANET_KEYS, default_engine
from engine.astronomy.motion import is_retrograde, motion_label, motion_label_ne

# Sun through Saturn, plus both nodes. Ketu is derived (Rahu + 180°), so it is
# not in the engine's PLANET_KEYS but is a graha everywhere above this layer.
GRAHA_KEYS: tuple[str, ...] = (*PLANET_KEYS, "ketu")


class PlanetService:
    """Graha quantities at a Julian Day. Stateless — see ``planet_service``."""

    def __init__(self, engine: Any = None) -> None:
        self._engine = engine if engine is not None else default_engine

    def longitude(
        self,
        jd: float,
        graha: str,
        *,
        sidereal: bool = True,
        ayanamsa: int | None = None,
    ) -> float:
        """Ecliptic longitude in degrees [0, 360)."""
        if graha == "ketu":
            return (
                self.longitude(jd, "rahu", sidereal=sidereal, ayanamsa=ayanamsa) + 180.0
            ) % 360.0
        return self._engine.planet_longitude(
            jd, graha, sidereal=sidereal, ayanamsa=ayanamsa
        )

    def speed(
        self,
        jd: float,
        graha: str,
        *,
        sidereal: bool = True,
        ayanamsa: int | None = None,
    ) -> float:
        """Longitude rate in degrees/day. Negative means retrograde motion —
        but ask :meth:`is_retrograde`, not the sign, for the display answer."""
        if graha == "ketu":
            return -self.speed(jd, "rahu", sidereal=sidereal, ayanamsa=ayanamsa)
        return float(
            self._engine.planet_position(
                jd, graha, sidereal=sidereal, ayanamsa=ayanamsa
            )["speed"]
        )

    def is_retrograde(
        self,
        jd: float,
        graha: str,
        *,
        sidereal: bool = True,
        ayanamsa: int | None = None,
    ) -> bool:
        """वक्री at this instant — the single definition, from ``motion``."""
        return is_retrograde(
            graha, self.speed(jd, graha, sidereal=sidereal, ayanamsa=ayanamsa)
        )

    def motion(
        self,
        jd: float,
        graha: str,
        *,
        locale: str = "en",
        sidereal: bool = True,
        ayanamsa: int | None = None,
    ) -> str:
        """``"Vakri"``/``"Margi"``, or ``"वक्री"``/``"मार्गी"`` when ``locale="ne"``."""
        speed = self.speed(jd, graha, sidereal=sidereal, ayanamsa=ayanamsa)
        label = motion_label_ne if locale == "ne" else motion_label
        return label(graha, speed)

    def position(
        self,
        jd: float,
        graha: str,
        *,
        sidereal: bool = True,
        ayanamsa: int | None = None,
    ) -> dict[str, Any]:
        """longitude, speed, rashi, latitude, RA, declination and motion."""
        longitude = self.longitude(jd, graha, sidereal=sidereal, ayanamsa=ayanamsa)
        speed = self.speed(jd, graha, sidereal=sidereal, ayanamsa=ayanamsa)
        extras = self._engine.planet_astro_extras(jd, graha)
        return {
            "graha": graha,
            "longitude": round(longitude, 6),
            "speed": round(speed, 6),
            "rashi": int(longitude / 30) % 12 + 1,
            "latitude": extras["latitude"],
            "right_ascension": extras["right_ascension"],
            "declination": extras["declination"],
            "is_retrograde": is_retrograde(graha, speed),
            "motion": motion_label(graha, speed),
        }

    def all_positions(
        self, jd: float, *, sidereal: bool = True, ayanamsa: int | None = None
    ) -> dict[str, dict[str, Any]]:
        """Every graha at this instant, keyed by name."""
        return {
            graha: self.position(jd, graha, sidereal=sidereal, ayanamsa=ayanamsa)
            for graha in GRAHA_KEYS
        }


planet_service = PlanetService()
