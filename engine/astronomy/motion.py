"""Retrograde (वक्री) motion — the single definition.

Whether a graha is वक्री is not quite ``speed < 0``. The lunar nodes are held
retrograde by Vedic convention regardless of their instantaneous speed: Ketu's
speed is the negation of Rahu's, so a bare sign test labels one of the pair
मार्गी and the other वक्री, which is never how a patro prints them. Under the
mean node the sign happens to be constant, so the convention and the sign test
agree by luck; under ``TRUE_NODE`` the true node's speed oscillates and the two
answers separate immediately.

This module exists because that test used to be inlined in five places
(``swiss_eph._enrich_planet_position``, ``graha_detail._build_graha_sthiti_at_sunrise``,
``gochar.get_gochar_table``, ``gochar._is_retrograde``, ``udayast._elongation``),
only two of which knew about the node convention.

See docs/computation-architecture-audit.md (section A3, phase 1).
"""

from __future__ import annotations

# Shadow grahas: always printed वक्री, whatever the ephemeris speed says.
RETROGRADE_BY_CONVENTION = frozenset({"rahu", "ketu"})

# Bodies that never retrograde as seen from Earth.
NEVER_RETROGRADE = frozenset({"sun", "moon", "lagna"})


def is_retrograde(body: str, speed: float) -> bool:
    """``True`` when *body* is वक्री at the instant *speed* was sampled.

    *speed* is the ecliptic longitude rate in degrees/day, as returned by
    :meth:`AstronomyEngine.planet_position`. It is ignored for bodies whose
    motion is fixed by convention.
    """
    if body in RETROGRADE_BY_CONVENTION:
        return True
    if body in NEVER_RETROGRADE:
        return False
    return float(speed) < 0.0


def motion_label(body: str, speed: float) -> str:
    """``"Vakri"`` / ``"Margi"`` — the romanised label used in gochar payloads."""
    return "Vakri" if is_retrograde(body, speed) else "Margi"


def motion_label_ne(body: str, speed: float) -> str:
    """``"वक्री"`` / ``"मार्गी"`` — the Nepali label used in patro notation."""
    return "वक्री" if is_retrograde(body, speed) else "मार्गी"
