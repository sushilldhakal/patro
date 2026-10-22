"""स्पष्ट ग्रह — the spashta graha table: every graha with rashi, DMS, वक्री and अस्त flags."""

from __future__ import annotations

from typing import Any

from engine.astronomy.engine import SIDM_LAHIRI
from engine.astronomy.planets import graha_positions
from engine.astronomy.position import BodyPosition
from engine.panchanga.asta import MOON_ASTA_ORB, UDAYAST_GRAHAS, combustion_threshold


def is_combust(position: BodyPosition, sun: BodyPosition) -> bool:
    """अस्त — the SAME heliacal definition as the standalone /graha-asta page,
    so the sunrise spashtagraha, D-charts and gochar tables agree with it
    date-for-date.

    Planets (mars, mercury, jupiter, venus, saturn) reuse the Surya-Siddhanta
    arcus-visionis orbs from ``engine.panchanga.asta`` (direction- and
    retrograde-aware); the Moon uses the चन्द्र तारा अस्त elongation orb from
    the same module. The Sun and the shadow nodes (Rahu/Ketu)
    never combust.

    The orbs are a siddhantic convention, not ephemeris geometry, which is why
    this flag is added here rather than in ``engine.astronomy.planets``."""
    # Geocentric sidereal elongation from the Sun (ayanamsha-independent).
    diff = (position.longitude - sun.longitude) % 360.0
    separation = min(diff, 360.0 - diff)
    if position.body in UDAYAST_GRAHAS:
        east_of_sun = diff < 180.0
        return separation < combustion_threshold(
            position.body, position.is_retrograde, east_of_sun
        )
    if position.body == "moon":
        return separation < MOON_ASTA_ORB
    return False


def spashta_table(
    jd: float,
    *,
    sidereal: bool = True,
    ayanamsa: int = SIDM_LAHIRI,
) -> dict[str, Any]:
    """स्पष्ट ग्रह — every graha at *jd* with rashi, DMS, वक्री and अस्त flags.

    The payload of :func:`graha_positions`; each row is a
    :meth:`BodyPosition.to_payload` plus ``is_combust``.
    """
    positions = graha_positions(jd, sidereal=sidereal, ayanamsa=ayanamsa)
    sun = positions["sun"]
    return {
        key: {**pos.to_payload(), "is_combust": is_combust(pos, sun)}
        for key, pos in positions.items()
    }
