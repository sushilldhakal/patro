"""Tribhagi (Tri-bhagi) dasha — Vimshottari periods divided by three."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from engine.jyotish.dasha import DashaTimeline, mahadashas_from_birth
from engine.jyotish.vimshottari import (
    DASHA_LORD_NE,
    DASHA_SEQUENCE,
    DASHA_YEARS,
    NAKSHATRA_LORDS_NE,
    NAKSHATRA_SPAN_DEG,
    NE_TO_LORD,
    _format_years_label,
)

TRIBHAGA_PARTS = 3


def _nakshatra_lord_index(lon: float) -> tuple[int, str]:
    nakshatra_index = int((lon % 360) // NAKSHATRA_SPAN_DEG)
    lord_ne = NAKSHATRA_LORDS_NE[nakshatra_index]
    mahadasha_lord = NE_TO_LORD.get(lord_ne, "ketu")
    return DASHA_SEQUENCE.index(mahadasha_lord), mahadasha_lord


def tribhagi_timeline(
    moon_sidereal_lon_deg: float,
    birth_instant: datetime,
    *,
    cycles: int = 1,
) -> DashaTimeline:
    """Tribhagi mahadashas from birth.

    Classical Tribhagi (त्रिभागी = divided by three) is Vimshottari with every
    mahadasha compressed to 1/3, so the 120-year cycle becomes three 40-year
    cycles. The starting lord is the janma-nakshatra lord, same as Vimshottari;
    the birth balance is the Vimshottari balance divided by three.
    """
    lon = moon_sidereal_lon_deg % 360
    nakshatra_index = int(lon // NAKSHATRA_SPAN_DEG)
    start_idx, mahadasha_lord = _nakshatra_lord_index(lon)

    pos_in_nak = lon % NAKSHATRA_SPAN_DEG
    tribhaga_size = NAKSHATRA_SPAN_DEG / TRIBHAGA_PARTS
    tribhaga = min(TRIBHAGA_PARTS - 1, int(pos_in_nak / tribhaga_size))
    fraction_elapsed = pos_in_nak / NAKSHATRA_SPAN_DEG
    balance_years = (1 - fraction_elapsed) * (DASHA_YEARS[mahadasha_lord] / TRIBHAGA_PARTS)
    periods = mahadashas_from_birth(
        sequence=DASHA_SEQUENCE,
        start_index=start_idx,
        balance_years=balance_years,
        full_years=lambda lord: DASHA_YEARS[lord] / TRIBHAGA_PARTS,
        lord_ne=DASHA_LORD_NE,
        birth=birth_instant,
        cycles=cycles,
    )
    return DashaTimeline(
        header=(
            ("system", "tribhagi"),
            ("nakshatra_index", nakshatra_index),
            ("tribhaga", tribhaga + 1),
            ("mahadasha_lord", mahadasha_lord),
            ("mahadasha_lord_ne", DASHA_LORD_NE[mahadasha_lord]),
            ("balance_years", balance_years),
            ("balance_label", _format_years_label(balance_years)),
        ),
        periods=periods,
    )


def tribhagi_dasha(
    moon_sidereal_lon_deg: float,
    birth_instant: datetime,
    *,
    cycles: int = 1,
) -> dict[str, Any]:
    """Tribhagi dasha payload from Moon longitude at birth (see :func:`tribhagi_timeline`)."""
    return tribhagi_timeline(moon_sidereal_lon_deg, birth_instant, cycles=cycles).to_payload()
