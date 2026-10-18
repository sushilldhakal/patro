"""स्पष्ट ग्रह — the spashta graha table: every graha with rashi, DMS, वक्री and अस्त flags."""

from __future__ import annotations

from typing import Any

from engine.astronomy.engine import SIDM_LAHIRI
from engine.astronomy.planets import graha_positions
from engine.panchanga.asta import MOON_ASTA_ORB, UDAYAST_GRAHAS, combustion_threshold


def _annotate_combustion(positions: dict[str, Any]) -> None:
    """Flag each body ``is_combust`` (अस्त) using the SAME heliacal definition as
    the standalone /graha-asta page, so the sunrise spashtagraha, D-charts and
    gochar tables agree with it date-for-date.

    Planets (mars, mercury, jupiter, venus, saturn) reuse the Surya-Siddhanta
    arcus-visionis orbs from ``engine.panchanga.asta`` (direction- and
    retrograde-aware); the Moon uses the चन्द्र तारा अस्त elongation orb from
    the same module. The Sun and the shadow nodes (Rahu/Ketu)
    never combust.

    The orbs are a siddhantic convention, not ephemeris geometry, which is why
    this flag is added here rather than in ``engine.astronomy.planets``."""
    sun_lon = positions.get("sun", {}).get("longitude")
    for key, pos in positions.items():
        pos["is_combust"] = False
        if sun_lon is None:
            continue
        lon = pos.get("longitude")
        if lon is None:
            continue
        # Geocentric sidereal elongation from the Sun (ayanamsha-independent).
        diff = (lon - sun_lon) % 360.0
        separation = min(diff, 360.0 - diff)
        if key in UDAYAST_GRAHAS:
            east_of_sun = diff < 180.0
            retro = bool(pos.get("is_retrograde", False))
            pos["is_combust"] = separation < combustion_threshold(key, retro, east_of_sun)
        elif key == "moon":
            pos["is_combust"] = separation < MOON_ASTA_ORB


def spashta_table(
    jd: float,
    *,
    sidereal: bool = True,
    ayanamsa: int = SIDM_LAHIRI,
) -> dict[str, Any]:
    """स्पष्ट ग्रह — every graha at *jd* with rashi, DMS, वक्री and अस्त flags."""
    positions = graha_positions(jd, sidereal=sidereal, ayanamsa=ayanamsa)
    _annotate_combustion(positions)
    return positions
