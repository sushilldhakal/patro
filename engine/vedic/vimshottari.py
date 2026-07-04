"""Vimshottari Mahadasha from Moon's sidereal longitude at birth."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

NAKSHATRA_LORDS_NE = [
    "केतु", "शुक्र", "सूर्य", "चन्द्र", "मङ्गल", "राहु", "गुरु", "शनि", "बुध",
] * 3

DASHA_SEQUENCE = [
    "ketu", "venus", "sun", "moon", "mars", "rahu", "jupiter", "saturn", "mercury",
]

DASHA_YEARS = {
    "ketu": 7,
    "venus": 20,
    "sun": 6,
    "moon": 10,
    "mars": 7,
    "rahu": 18,
    "jupiter": 16,
    "saturn": 19,
    "mercury": 17,
}

DASHA_LORD_NE = {
    "ketu": "केतु",
    "venus": "शुक्र",
    "sun": "सूर्य",
    "moon": "चन्द्र",
    "mars": "मङ्गल",
    "rahu": "राहु",
    "jupiter": "गुरु",
    "saturn": "शनि",
    "mercury": "बुध",
}

NE_TO_LORD = {
    "केतु": "ketu",
    "शुक्र": "venus",
    "सूर्य": "sun",
    "चन्द्र": "moon",
    "मङ्गल": "mars",
    "मंगल": "mars",
    "राहु": "rahu",
    "गुरु": "jupiter",
    "बृहस्पति": "jupiter",
    "शनि": "saturn",
    "बुध": "mercury",
}

NAKSHATRA_SPAN_DEG = 360 / 27
YEAR_DAYS = 365.2425


def _add_years(date: datetime, years: float) -> datetime:
    return date + timedelta(days=years * YEAR_DAYS)


def _format_years_label(years: float) -> str:
    total_days = round(years * YEAR_DAYS)
    y = total_days // int(YEAR_DAYS)
    rem = total_days - round(y * YEAR_DAYS)
    m = int(rem // 30.4369)
    d = round(rem - m * 30.4369)
    parts: list[str] = []
    if y > 0:
        parts.append(f"{y} वर्ष")
    if m > 0:
        parts.append(f"{m} महिना")
    if d > 0 or not parts:
        parts.append(f"{d} दिन")
    return " ".join(parts)


def vimshottari_dasha(
    moon_sidereal_lon_deg: float,
    birth_instant: datetime,
    *,
    cycles: int = 1,
) -> dict[str, Any]:
    lon = moon_sidereal_lon_deg % 360
    nakshatra_index = int(lon // NAKSHATRA_SPAN_DEG)
    lord_ne = NAKSHATRA_LORDS_NE[nakshatra_index]
    mahadasha_lord = NE_TO_LORD.get(lord_ne, "ketu")

    fraction_elapsed = (lon % NAKSHATRA_SPAN_DEG) / NAKSHATRA_SPAN_DEG
    full_years = DASHA_YEARS[mahadasha_lord]
    balance_years = (1 - fraction_elapsed) * full_years

    if birth_instant.tzinfo is None:
        birth_instant = birth_instant.replace(tzinfo=timezone.utc)

    sequence: list[dict[str, Any]] = []
    cursor = birth_instant
    start_idx = DASHA_SEQUENCE.index(mahadasha_lord)

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

    total_steps = len(DASHA_SEQUENCE) * cycles
    for step in range(1, total_steps):
        lord = DASHA_SEQUENCE[(start_idx + step) % len(DASHA_SEQUENCE)]
        years = DASHA_YEARS[lord]
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
        "nakshatra_index": nakshatra_index,
        "mahadasha_lord": mahadasha_lord,
        "mahadasha_lord_ne": DASHA_LORD_NE[mahadasha_lord],
        "balance_years": balance_years,
        "balance_label": _format_years_label(balance_years),
        "sequence": sequence,
    }


def subdivide_span(lord: str, start: datetime, end: datetime) -> list[dict[str, Any]]:
    """Nine sub-periods of a Vimshottari span, proportional to the dasha years,
    starting from the span's own lord. Works at every level (maha→antar→…)."""
    if lord not in DASHA_YEARS:
        raise ValueError(f"unknown dasha lord: {lord}")
    total = (end - start).total_seconds()
    start_idx = DASHA_SEQUENCE.index(lord)
    children: list[dict[str, Any]] = []
    cursor = start
    for i in range(len(DASHA_SEQUENCE)):
        child_lord = DASHA_SEQUENCE[(start_idx + i) % len(DASHA_SEQUENCE)]
        span = timedelta(seconds=total * DASHA_YEARS[child_lord] / 120.0)
        child_end = cursor + span
        children.append(
            {
                "lord": child_lord,
                "lord_ne": DASHA_LORD_NE[child_lord],
                "start": cursor.isoformat(),
                "end": child_end.isoformat(),
            }
        )
        cursor = child_end
    return children


def vimshottari_tree(
    moon_sidereal_lon_deg: float,
    birth_instant: datetime,
    *,
    cycles: int = 1,
    depth: int = 2,
) -> dict[str, Any]:
    """Vimshottari result plus a nested span tree.

    Mahadasha spans carry their true start (the birth mahadasha begins before
    birth) so sub-periods subdivide from the real beginning; `depth` levels of
    children are embedded (1 = antar, 2 = pratyantar). Deeper levels are served
    on demand via subdivide_span.
    """
    base = vimshottari_dasha(moon_sidereal_lon_deg, birth_instant, cycles=cycles)

    def expand(node: dict[str, Any], level: int) -> dict[str, Any]:
        if level >= depth:
            return node
        children = subdivide_span(
            node["lord"],
            datetime.fromisoformat(node["start"]),
            datetime.fromisoformat(node["end"]),
        )
        node["children"] = [expand(child, level + 1) for child in children]
        return node

    tree: list[dict[str, Any]] = []
    for i, period in enumerate(base["sequence"]):
        end = datetime.fromisoformat(period["end"])
        if i == 0:
            # Restore the full birth-mahadasha span for subdivision.
            start = end - timedelta(days=DASHA_YEARS[period["lord"]] * YEAR_DAYS)
        else:
            start = datetime.fromisoformat(period["start"])
        node = {
            "lord": period["lord"],
            "lord_ne": period["lord_ne"],
            "start": start.isoformat(),
            "end": end.isoformat(),
        }
        tree.append(expand(node, 0))

    return {**base, "tree": tree, "tree_depth": depth}
