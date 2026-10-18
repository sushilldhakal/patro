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
# Dasha year length — the mean Gregorian calendar year (matches how every
# mainstream reference implementation, e.g. drikpanchang.com, converts a
# dasha-year fraction into an actual date). Previously 360.0 (a 360-day
# "savana year"), which drifted real dasha boundary dates earlier by ~5.25
# days per elapsed year — by ~26 years post-birth (a Mercury mahadasha
# starting, say) that's a ~4-5 month error, enough to show the wrong
# antardasha/pratyantardasha as "currently running". Verified against
# drikpanchang.com, modernastro.com and nepaljyotish.org for a real chart:
# all three agreed with 365.2425 and diverged from 360 by that margin.
# Shared by Vimshottari, Yogini and Tribhagi dashas.
YEAR_DAYS = 365.2425


def _add_years(date: datetime, years: float) -> datetime:
    return date + timedelta(days=years * YEAR_DAYS)


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
