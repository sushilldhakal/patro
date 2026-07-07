"""Tribhagi (Tri-bhagi) dasha — Vimshottari periods divided by three."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from engine.vedic.vimshottari import (
    DASHA_LORD_NE,
    DASHA_SEQUENCE,
    DASHA_YEARS,
    NAKSHATRA_LORDS_NE,
    NAKSHATRA_SPAN_DEG,
    NE_TO_LORD,
    YEAR_DAYS,
    _add_years,
    _format_years_label,
)

TRIBHAGA_PARTS = 3


def _nakshatra_lord_index(lon: float) -> tuple[int, str]:
    nakshatra_index = int((lon % 360) // NAKSHATRA_SPAN_DEG)
    lord_ne = NAKSHATRA_LORDS_NE[nakshatra_index]
    mahadasha_lord = NE_TO_LORD.get(lord_ne, "ketu")
    return DASHA_SEQUENCE.index(mahadasha_lord), mahadasha_lord


def tribhagi_dasha(
    moon_sidereal_lon_deg: float,
    birth_instant: datetime,
    *,
    cycles: int = 1,
) -> dict[str, Any]:
    """Tribhagi dasha from Moon longitude at birth.

    Each nakshatra is split into three equal tribhagas. The active tribhaga
    shifts the starting mahadasha lord forward in the Vimshottari sequence, and
    every period lasts one third of the corresponding Vimshottari years.
    """
    lon = moon_sidereal_lon_deg % 360
    nakshatra_index = int(lon // NAKSHATRA_SPAN_DEG)
    nak_lord_idx, _ = _nakshatra_lord_index(lon)

    pos_in_nak = lon % NAKSHATRA_SPAN_DEG
    tribhaga_size = NAKSHATRA_SPAN_DEG / TRIBHAGA_PARTS
    tribhaga = min(TRIBHAGA_PARTS - 1, int(pos_in_nak / tribhaga_size))
    pos_in_tribhaga = pos_in_nak - tribhaga * tribhaga_size
    frac_in_tribhaga = pos_in_tribhaga / tribhaga_size

    start_idx = (nak_lord_idx + tribhaga) % len(DASHA_SEQUENCE)
    mahadasha_lord = DASHA_SEQUENCE[start_idx]
    full_years = DASHA_YEARS[mahadasha_lord] / TRIBHAGA_PARTS
    balance_years = (1 - frac_in_tribhaga) * full_years

    if birth_instant.tzinfo is None:
        birth_instant = birth_instant.replace(tzinfo=timezone.utc)

    sequence: list[dict[str, Any]] = []
    cursor = birth_instant
    total_steps = len(DASHA_SEQUENCE) * cycles

    first_end = _add_years(cursor, balance_years)
    sequence.append(
        {
            "lord": mahadasha_lord,
            "lord_ne": DASHA_LORD_NE[mahadasha_lord],
            "start": cursor.isoformat(),
            "end": first_end.isoformat(),
            "years": balance_years,
        }
    )
    cursor = first_end

    for step in range(1, total_steps):
        lord = DASHA_SEQUENCE[(start_idx + step) % len(DASHA_SEQUENCE)]
        years = DASHA_YEARS[lord] / TRIBHAGA_PARTS
        end = _add_years(cursor, years)
        sequence.append(
            {
                "lord": lord,
                "lord_ne": DASHA_LORD_NE[lord],
                "start": cursor.isoformat(),
                "end": end.isoformat(),
                "years": years,
            }
        )
        cursor = end

    return {
        "system": "tribhagi",
        "nakshatra_index": nakshatra_index,
        "tribhaga": tribhaga + 1,
        "mahadasha_lord": mahadasha_lord,
        "mahadasha_lord_ne": DASHA_LORD_NE[mahadasha_lord],
        "balance_years": balance_years,
        "balance_label": _format_years_label(balance_years),
        "sequence": sequence,
    }
