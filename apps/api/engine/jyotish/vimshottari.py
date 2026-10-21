"""Vimshottari Mahadasha from Moon's sidereal longitude at birth."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from engine.jyotish.dasha import YEAR_DAYS, DashaSystem, DashaTimeline, mahadashas_from_birth

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

DASHA_LORD_EN = {
    "ketu": "Ketu",
    "venus": "Venus",
    "sun": "Sun",
    "moon": "Moon",
    "mars": "Mars",
    "rahu": "Rahu",
    "jupiter": "Jupiter",
    "saturn": "Saturn",
    "mercury": "Mercury",
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

# YEAR_DAYS (the dasha year) lives in engine.jyotish.dasha and is re-exported
# here for the modules that import it from this one. Shared by Vimshottari,
# Yogini and Tribhagi dashas.
VIMSHOTTARI = DashaSystem(
    name="vimshottari",
    sequence=tuple(DASHA_SEQUENCE),
    years=DASHA_YEARS,
    cycle_years=120.0,
    lord_ne=DASHA_LORD_NE,
)


def _format_years_label(years: float) -> str:
    total_days = round(years * YEAR_DAYS)
    month_days = YEAR_DAYS / 12.0
    y = int(total_days // YEAR_DAYS)
    rem = total_days - round(y * YEAR_DAYS)
    m = int(rem // month_days)
    d = round(rem - m * month_days)
    parts: list[str] = []
    if y > 0:
        parts.append(f"{y} वर्ष")
    if m > 0:
        parts.append(f"{m} महिना")
    if d > 0 or not parts:
        parts.append(f"{d} दिन")
    return " ".join(parts)


def vimshottari_timeline(
    moon_sidereal_lon_deg: float,
    birth_instant: datetime,
    *,
    cycles: int = 1,
) -> DashaTimeline:
    """Vimshottari mahadashas from birth: the Moon's nakshatra lord first, for its balance."""
    lon = moon_sidereal_lon_deg % 360
    nakshatra_index = int(lon // NAKSHATRA_SPAN_DEG)
    mahadasha_lord = NE_TO_LORD.get(NAKSHATRA_LORDS_NE[nakshatra_index], "ketu")
    fraction_elapsed = (lon % NAKSHATRA_SPAN_DEG) / NAKSHATRA_SPAN_DEG
    balance_years = (1 - fraction_elapsed) * DASHA_YEARS[mahadasha_lord]
    periods = mahadashas_from_birth(
        sequence=DASHA_SEQUENCE,
        start_index=DASHA_SEQUENCE.index(mahadasha_lord),
        balance_years=balance_years,
        full_years=lambda lord: DASHA_YEARS[lord],
        lord_ne=DASHA_LORD_NE,
        birth=birth_instant,
        cycles=cycles,
    )
    return DashaTimeline(
        header=(
            ("nakshatra_index", nakshatra_index),
            ("mahadasha_lord", mahadasha_lord),
            ("mahadasha_lord_ne", DASHA_LORD_NE[mahadasha_lord]),
            ("balance_years", balance_years),
            ("balance_label", _format_years_label(balance_years)),
        ),
        periods=periods,
    )


def vimshottari_dasha(
    moon_sidereal_lon_deg: float,
    birth_instant: datetime,
    *,
    cycles: int = 1,
) -> dict[str, Any]:
    return vimshottari_timeline(moon_sidereal_lon_deg, birth_instant, cycles=cycles).to_payload()
