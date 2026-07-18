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
  * **bratabandha** — Guru Śuddhi: Jupiter's house from the native's janma rāśi
    must be favourable (2/5/7/9/11 auspicious; 1/3/6/10 needs a śānti and is
    capped at *neutral*; 4/8/12 avoided — Muhūrta Chintāmaṇi).
  * **griha-aarambha** — Graha Śuddhi over Sūrya, Candra, Guru and Śukra: none
    may sit in the 4/8/12 from the owner's rāśi (a weak planet harms the owner
    or the house — Dharma Sindhu); the owner's own birth star is also avoided
    for the groundbreaking.
  * **griha-pravesh** — Kumbha Chakra: counting from the Sun's nakṣatra to the
    entry day's nakṣatra places the day on a limb of the Kumbha; the fire
    (mukha) and owner-harming (garbha) limbs are vetoed, discomfort/quarrel
    limbs cautioned, and the wealth / long-life limbs are auspicious.
  * **byaparik-pratisthan** — Chandra Bala: the transit Moon must avoid the
    4/8/12 house from the owner's rāśi (3/6/7/10/11 is best for trade); modelled
    as a single-planet Graha Śuddhi over the Moon.

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
from engine.astronomy.swiss_eph import calculate_sunrise, get_planet_position
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

# ── Graha Śuddhi ────────────────────────────────────────────────────────────
# Some saṃskāras additionally require the relevant grahas to transit a strong
# house from the native's janma rāśi (Muhūrta Chintāmaṇi / Dharma Sindhu). For
# every such planet: the 4/8/12 house is avoided; its "good" houses are
# auspicious; anything else needs a śānti (capped at neutral).
#
#   bratabandha    — Guru Śuddhi (Jupiter).
#   griha-aarambha — Sūrya, Candra, Guru, Śukra must all be strong; a planet in
#                    the 4/8/12 from the owner's rāśi harms the owner / house.
_SHUDDHI_AVOID_HOUSES = frozenset({4, 8, 12})

_SHUDDHI_PLANET_META: dict[str, dict[str, Any]] = {
    "sun": {"swe": "sun", "ne": "सूर्य", "en": "Sun", "good": frozenset({3, 6, 10, 11})},
    "moon": {"swe": "moon", "ne": "चन्द्र", "en": "Moon", "good": frozenset({3, 6, 7, 10, 11})},
    "guru": {"swe": "jupiter", "ne": "गुरु", "en": "Jupiter", "good": frozenset({2, 5, 7, 9, 11})},
    "shukra": {"swe": "venus", "ne": "शुक्र", "en": "Venus", "good": frozenset({2, 5, 7, 9, 11})},
}

# Which planets each ceremony's Graha Śuddhi checks (order = display order).
_SHUDDHI_PLANETS: dict[str, tuple[str, ...]] = {
    "bratabandha": ("guru",),
    "griha-aarambha": ("sun", "moon", "guru", "shukra"),
    # Business opening — Chandra Bala: the Moon must avoid the 4/8/12 from the
    # owner's rāśi; 3/6/7/10/11 is auspicious (Muhūrta Chintāmaṇi ch. 2).
    "byaparik-pratisthan": ("moon",),
}


def _planet_tone(house: int, good_houses: frozenset[int]) -> str:
    if house in _SHUDDHI_AVOID_HOUSES:
        return "avoid"
    if house in good_houses:
        return "good"
    return "shanti"


def _overall_shuddhi_tone(tones: list[str]) -> str:
    if any(t == "avoid" for t in tones):
        return "avoid"
    if tones and all(t == "good" for t in tones):
        return "good"
    return "shanti"


# ── Kumbha Chakra (gṛha-praveśa) ────────────────────────────────────────────
# Housewarming owner-safety check: count from the nakṣatra the Sun occupies to
# the entry day's (Moon's) nakṣatra; the resulting "limb" of the Kumbha decides
# the fortune of the entry (Muhūrta Chintāmaṇi). Fire / harm-to-owner limbs are
# vetoed; discomfort / quarrel limbs need caution; the rest are auspicious.
_NAK_SPAN = 360.0 / 27.0


def _kumbha_zone(count: int) -> dict[str, str]:
    if count == 1:
        z = ("mukha", "मुख", "Mouth", "आगोको भय", "risk of fire", "avoid")
    elif count <= 5:
        z = ("purva", "पूर्व", "East", "सुखपूर्वक बस्न कठिन", "hard to live comfortably", "shanti")
    elif count <= 9:
        z = ("dakshina", "दक्षिण", "South", "धनलाभ", "brings wealth", "good")
    elif count <= 13:
        z = ("paschima", "पश्चिम", "West", "लक्ष्मीलाभ", "gain of Lakṣmī", "good")
    elif count <= 17:
        z = ("uttara", "उत्तर", "North", "कलह", "quarrels", "shanti")
    elif count <= 21:
        z = ("garbha", "गर्भ", "Womb", "गृहस्वामीको नाश", "harms the owner", "avoid")
    elif count <= 24:
        z = ("tala", "तल", "Bottom", "दीर्घायु", "long life", "good")
    else:
        z = ("kantha", "कण्ठ", "Throat", "स्थिर वास", "lasting residence", "good")
    key, ne, en, eff_ne, eff_en, tone = z
    return {
        "zone": key,
        "zone_ne": ne,
        "zone_en": en,
        "effect_ne": eff_ne,
        "effect_en": eff_en,
        "tone": tone,
    }


def _kumbha_chakra(sunrise_utc, moon_nak: int) -> dict[str, Any]:
    sun_lon = get_planet_position(sunrise_utc, "sun")["longitude"]
    sun_nak = int(sun_lon / _NAK_SPAN) % 27 + 1
    count = ((moon_nak - sun_nak) % 27) + 1
    return {"count": count, "sun_nakshatra": sun_nak, **_kumbha_zone(count)}


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
    tara_tone: str,
    chandra_tone: str,
    category_bad: bool,
    shuddhi_tone: str | None = None,
) -> str:
    if (
        category_bad
        or tara_tone in _BAD_TONES
        or chandra_tone in _BAD_TONES
        or shuddhi_tone == "avoid"
    ):
        return "avoid"
    # A graha needing a pacification rite (śānti) is never fully favourable,
    # even when the Moon strength is good.
    if shuddhi_tone == "shanti":
        return "neutral"
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
    elif category == "griha-aarambha":
        # The owner's own birth star is avoided for the groundbreaking.
        category_bad = t_nak == janma_nak

    # Graha Śuddhi — each relevant planet's house from the janma rāśi.
    shuddhi = _graha_shuddhi(sunrise_utc, janma_rashi, t_rashi, category)
    # Kumbha Chakra — gṛha-praveśa owner-safety limb (Sun→day nakṣatra count).
    kumbha = _kumbha_chakra(sunrise_utc, t_nak) if category == "griha-pravesh" else None
    native_tone = (
        shuddhi["tone"] if shuddhi else kumbha["tone"] if kumbha else None
    )

    return {
        "suitability": _verdict(
            tara["tone"], chandra["tone"], category_bad, native_tone
        ),
        "tara_num": tara_num,
        "tara_tone": tara["tone"],
        "tara_ne": tara["tara"],
        "chandra_num": chandra_num,
        "chandra_tone": chandra["tone"],
        "moon_house": moon_house,
        "shuddhi": shuddhi,
        "kumbha": kumbha,
        "transit_nakshatra": t_nak,
        "transit_nakshatra_ne": NAKSHATRA_NAMES_NE[t_nak - 1],
        "transit_nakshatra_en": NAKSHATRA_NAMES[t_nak - 1],
        "transit_rashi_ne": RASHI_NAMES_NE[t_rashi - 1],
        "transit_rashi_en": RASHI_NAMES[t_rashi - 1],
    }


def _graha_shuddhi(
    sunrise_utc, janma_rashi: int, moon_rashi: int, category: str
) -> dict[str, Any] | None:
    """Per-planet house (from the janma rāśi) for the ceremony's Graha Śuddhi.

    Returns ``{"tone", "planets": [{"planet", "house", "tone", "rashi_ne",
    "rashi_en"}]}`` for the ceremonies that require it (bratabandha,
    griha-aarambha), else ``None``.
    """
    planets = _SHUDDHI_PLANETS.get(category)
    if not planets:
        return None
    factors: list[dict[str, Any]] = []
    for key in planets:
        meta = _SHUDDHI_PLANET_META[key]
        if key == "moon":
            p_rashi = moon_rashi  # already read at this sunrise
        else:
            lon = get_planet_position(sunrise_utc, meta["swe"])["longitude"]
            p_rashi = int(lon / 30) % 12 + 1
        house = ((p_rashi - janma_rashi) % 12) + 1
        factors.append(
            {
                "planet": key,
                "house": house,
                "tone": _planet_tone(house, meta["good"]),
                "rashi_ne": RASHI_NAMES_NE[p_rashi - 1],
                "rashi_en": RASHI_NAMES[p_rashi - 1],
            }
        )
    return {
        "tone": _overall_shuddhi_tone([f["tone"] for f in factors]),
        "planets": factors,
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
