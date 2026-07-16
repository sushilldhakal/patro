"""Profile-based (native) annotation of साइत listings.

The general sait listings (``services.sait_api``) are computed for a year +
location and are the same for everyone. This module overlays a *native* verdict
on each already-auspicious day for one person — signed-in users pick a saved
profile and see which of the general days actually suit their birth chart.

Two universal Moon-strength factors drive the verdict, reusing the same
navatāra scheme as the rest of the app (:mod:`engine.vedic.navatara`):

  * **Tārā Bala** — the transit nakṣatra's navatāra (1–9) from the native's
    *janma* nakṣatra. Vipat (3), Pratyak (5) and Nidhana (7) are inauspicious.
  * **Chandra Bala** — the transit Moon rāśi's navatāra from the native's
    *janma* rāśi, same tone table over the 12 rāśis.

Plus a couple of category-specific native rules already discussed:

  * **rudri-jurne** — the Moon should not transit the 4th / 8th / 12th house
    from the janma rāśi.
  * **annaprasan** — the Janma tārā (navatāra 1) is additionally avoided.

The Moon's position at birth is geocentric, so janma nakṣatra / rāśi need only
the birth *instant* (no birth place). Each candidate day's transit Moon is read
at that day's sunrise for the viewing location — a day-level proxy consistent
with the deterministic Vās categories.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from engine.astronomy.location import DEFAULT_LOCATION, ObserverLocation
from engine.astronomy.positions import (
    NAKSHATRA_NAMES,
    RASHI_NAMES,
    RASHI_NAMES_NE,
    get_chandra_rashi,
    get_nakshatra,
)
from engine.astronomy.swiss_eph import calculate_sunrise
from engine.astronomy.timescale import resolve_observer_timezone
from engine.vedic.bikram_sambat import bs_to_gregorian
from engine.vedic.names_ne import NAKSHATRA_NAMES_NE
from engine.vedic.navatara import _compute_navatara_number, _navatara_meta
from services.sait_api import get_sait_month_entries

# navatāra tones that make a day inauspicious for the native.
_BAD_TONES = frozenset({"bad", "worst"})
_GOOD_TONES = frozenset({"best", "good"})

# Houses (from the janma rāśi) the Moon should avoid for a Rudri homa.
_RUDRI_BAD_HOUSES = frozenset({4, 8, 12})


def compute_janma_points(birth_datetime: str, birth_tz: str) -> dict[str, int]:
    """Janma (birth) Moon nakṣatra + rāśi from a naive local birth datetime.

    ``birth_datetime`` is an ISO string without offset (``YYYY-MM-DDTHH:MM``);
    it is interpreted in ``birth_tz`` and converted to UTC. The Moon's geocentric
    position is location-independent, so no birth place is needed.
    """
    tz = resolve_observer_timezone(birth_tz)
    local = datetime.fromisoformat(birth_datetime)
    if local.tzinfo is None:
        local = local.replace(tzinfo=tz)
    instant = local.astimezone(timezone.utc)
    nak_num, _, _ = get_nakshatra(instant)
    rashi_num = get_chandra_rashi(instant)["number"]
    return {"nakshatra": nak_num, "rashi": rashi_num}


def _verdict(
    tara_tone: str, chandra_tone: str, category_bad: bool
) -> str:
    if category_bad or tara_tone in _BAD_TONES or chandra_tone in _BAD_TONES:
        return "avoid"
    if tara_tone in _GOOD_TONES and chandra_tone in _GOOD_TONES:
        return "favourable"
    return "neutral"


def _annotate_one(
    greg,
    location: ObserverLocation,
    janma_nak: int,
    janma_rashi: int,
    category: str,
) -> dict[str, Any]:
    sunrise_utc = calculate_sunrise(
        greg,
        latitude=location.lat,
        longitude=location.lon,
        timezone_name=location.timezone,
    )
    t_nak, _, _ = get_nakshatra(sunrise_utc)
    t_rashi = get_chandra_rashi(sunrise_utc)["number"]

    tara_num = _compute_navatara_number(janma_nak - 1, t_nak - 1, 27)
    chandra_num = _compute_navatara_number(janma_rashi - 1, t_rashi - 1, 12)
    tara = _navatara_meta(tara_num)
    chandra = _navatara_meta(chandra_num)

    moon_house = ((t_rashi - janma_rashi) % 12) + 1
    category_bad = False
    if category == "rudri-jurne":
        category_bad = moon_house in _RUDRI_BAD_HOUSES
    elif category == "annaprasan":
        # Janma tārā (navatāra 1) is additionally avoided for the first feeding.
        category_bad = tara_num == 1

    return {
        "suitability": _verdict(tara["tone"], chandra["tone"], category_bad),
        "tara_num": tara_num,
        "tara_tone": tara["tone"],
        "tara_ne": tara["tara"],
        "chandra_num": chandra_num,
        "chandra_tone": chandra["tone"],
        "moon_house": moon_house,
        "transit_nakshatra": t_nak,
        "transit_nakshatra_ne": NAKSHATRA_NAMES_NE[t_nak - 1],
        "transit_nakshatra_en": NAKSHATRA_NAMES[t_nak - 1],
        "transit_rashi_ne": RASHI_NAMES_NE[t_rashi - 1],
        "transit_rashi_en": RASHI_NAMES[t_rashi - 1],
    }


def personalize_sait(
    bs_year: int,
    category: str,
    janma_nakshatra: int,
    janma_rashi: int,
    location: ObserverLocation = DEFAULT_LOCATION,
) -> dict[str, Any]:
    """Annotate every generally-auspicious day of the year with a native verdict.

    Returns ``{"days": [{"bs_month", "bs_day", "suitability", ...}], ...}``. The
    verdict is one of ``favourable`` / ``neutral`` / ``avoid`` per day; the
    caller overlays these onto whichever listing (muhūrta detail or the Vās
    month pills) it is already showing.
    """
    if not (1 <= janma_nakshatra <= 27):
        raise ValueError("janma_nakshatra must be 1–27")
    if not (1 <= janma_rashi <= 12):
        raise ValueError("janma_rashi must be 1–12")

    entries = get_sait_month_entries(bs_year, category, location)
    days_out: list[dict[str, Any]] = []
    for month in entries.get("months", []):
        bs_month = month["month"]
        for bs_day in month.get("days", []):
            greg = bs_to_gregorian(bs_year, bs_month, bs_day)
            annotation = _annotate_one(
                greg, location, janma_nakshatra, janma_rashi, category
            )
            days_out.append(
                {"bs_month": bs_month, "bs_day": bs_day, **annotation}
            )

    counts = {"favourable": 0, "neutral": 0, "avoid": 0}
    for d in days_out:
        counts[d["suitability"]] += 1

    return {
        "bs_year": bs_year,
        "category": category,
        "janma": {"nakshatra": janma_nakshatra, "rashi": janma_rashi},
        "counts": counts,
        "days": days_out,
    }
