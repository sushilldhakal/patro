"""अस्त (combustion) orbs — how close to the Sun a graha may come before it is
treated as invisible.

These are siddhantic conventions, not ephemeris geometry, so they sit above the
astronomy layer: ``engine.panchanga.spashta`` applies them to the spashta table,
and ``engine.jyotish.udayast`` / ``graha_detail`` find udaya/asta windows with
them.
"""

from __future__ import annotations

# Slow grahas + inner planets (exclude Sun/Moon/Rahu/Ketu for patro udayast rows).
UDAYAST_GRAHAS: list[str] = ["mars", "mercury", "jupiter", "venus", "saturn"]


def combustion_threshold(graha: str, retrograde: bool, east_of_sun: bool) -> float:
    """
    Surya Siddhanta udaya/asta arcus visionis (degrees), simplified.

    Mercury & Venus use smaller orbs when retrograde; Venus also differs by hemisphere.
    """
    if graha == "mars":
        return 17.0
    if graha == "jupiter":
        return 11.0
    if graha == "saturn":
        return 15.0
    if graha == "venus":
        if retrograde:
            return 8.0
        return 10.0
    if graha == "mercury":
        if retrograde:
            return 12.0
        return 14.0
    return 14.0


# Moon Tara Asta combustion orb (Sun–Moon longitudinal elongation, degrees). The
# Moon counts as combust on any civil day it dips below this; the reported window
# runs from moonrise of the first such day to moonset of the last. Calibrated to
# the standard Nepali patro चन्द्र तारा अस्त tables (13°).
MOON_ASTA_ORB = 13.0
