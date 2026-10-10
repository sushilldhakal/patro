"""Yogini dasha — eight-planet cycle totalling 36 years."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from engine.vedic.vimshottari import NAKSHATRA_SPAN_DEG, _add_years, _format_years_label

YOGINI_SEQUENCE = [
    "mangala",
    "pingala",
    "dhanya",
    "bhramari",
    "bhadrika",
    "ulka",
    "siddha",
    "sankata",
]

YOGINI_YEARS = {
    "mangala": 1,
    "pingala": 2,
    "dhanya": 3,
    "bhramari": 4,
    "bhadrika": 5,
    "ulka": 6,
    "siddha": 7,
    "sankata": 8,
}

YOGINI_LORD_NE = {
    "mangala": "मङ्गला",
    "pingala": "पिङ्गला",
    "dhanya": "धन्या",
    "bhramari": "भ्रमरी",
    "bhadrika": "भाद्रिका",
    "ulka": "उल्का",
    "siddha": "सिद्धा",
    "sankata": "संकटा",
}

YOGINI_LORD_EN = {
    "mangala": "Mangala",
    "pingala": "Pingala",
    "dhanya": "Dhanya",
    "bhramari": "Bhramari",
    "bhadrika": "Bhadrika",
    "ulka": "Ulka",
    "siddha": "Siddha",
    "sankata": "Sankata",
}

YOGINI_CYCLE_YEARS = sum(YOGINI_YEARS.values())


def _yogini_index_for_nakshatra(nakshatra_index: int) -> int:
    """Map nakshatra (0-based, 0-26) to the starting Yogini.

    Classical rule: add 3 to the 1-based birth nakshatra number and divide
    by 8; the remainder (1-8, counting Mangala as 1) gives the starting
    Yogini. In 0-based terms that's `(nakshatra_index + 3) % 8`.

    The previous `(nakshatra_index // 3) % 8` grouped every 3 consecutive
    nakshatras onto the same starting Yogini, which doesn't match this
    rule at all and was verified wrong against an independent reference
    for a real chart (Purva Bhadrapada, index 24): that formula gave
    Mangala; the correct starting Yogini is Bhramari, which is what this
    formula returns.
    """
    return (nakshatra_index + 3) % len(YOGINI_SEQUENCE)


def yogini_dasha(
    moon_sidereal_lon_deg: float,
    birth_instant: datetime,
    *,
    cycles: int = 1,
) -> dict[str, Any]:
    lon = moon_sidereal_lon_deg % 360
    nakshatra_index = int(lon // NAKSHATRA_SPAN_DEG)
    start_idx = _yogini_index_for_nakshatra(nakshatra_index)
    mahadasha_lord = YOGINI_SEQUENCE[start_idx]

    fraction_elapsed = (lon % NAKSHATRA_SPAN_DEG) / NAKSHATRA_SPAN_DEG
    full_years = YOGINI_YEARS[mahadasha_lord]
    balance_years = (1 - fraction_elapsed) * full_years

    if birth_instant.tzinfo is None:
        birth_instant = birth_instant.replace(tzinfo=timezone.utc)

    sequence: list[dict[str, Any]] = []
    cursor = birth_instant
    total_steps = len(YOGINI_SEQUENCE) * cycles

    first_end = _add_years(cursor, balance_years)
    sequence.append(
        {
            "lord": mahadasha_lord,
            "lord_ne": YOGINI_LORD_NE[mahadasha_lord],
            "start": cursor.isoformat(),
            "end": first_end.isoformat(),
            "years": balance_years,
        }
    )
    cursor = first_end

    for step in range(1, total_steps):
        lord = YOGINI_SEQUENCE[(start_idx + step) % len(YOGINI_SEQUENCE)]
        years = YOGINI_YEARS[lord]
        end = _add_years(cursor, years)
        sequence.append(
            {
                "lord": lord,
                "lord_ne": YOGINI_LORD_NE[lord],
                "start": cursor.isoformat(),
                "end": end.isoformat(),
                "years": years,
            }
        )
        cursor = end

    return {
        "system": "yogini",
        "nakshatra_index": nakshatra_index,
        "mahadasha_lord": mahadasha_lord,
        "mahadasha_lord_ne": YOGINI_LORD_NE[mahadasha_lord],
        "balance_years": balance_years,
        "balance_label": _format_years_label(balance_years),
        "cycle_years": YOGINI_CYCLE_YEARS,
        "sequence": sequence,
    }
