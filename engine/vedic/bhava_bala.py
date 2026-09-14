"""Bhava Bala — house strength, BPHS style, over whole-sign houses.

Each bhava's strength sums three components, all in Virupas:
  * Bhavadhipati Bala — the full Shadbala of the bhava's lord.
  * Bhava Digbala   — directional strength from the sign-type at the bhava's
    madhya, which inherits the Lagna's own exact degree carried forward by 30°
    per house (not the sign's flat centre), so Sagittarius/Capricorn's
    half-sign split has a real degree to test against.
  * Bhava Drishti Bala — net benefic-minus-malefic aspect on the bhava's
    madhya, PLUS a Special Addition: the bhava's own Lord, Jupiter, Venus, and
    Mercury each contribute a flat 60 if occupying the bhava, or their
    graduated Drishti Virupas if aspecting it — summed, uncapped.
500 Virupas is treated as the 100% benchmark for a house's own total.

Bhava % (a separate, per-planet figure — not a house's bala) measures how
close each graha sits to its own bhava's madhya versus the sandhi (junction)
with the next house: 100% at the madhya, 0% at the sandhi, linear between.
"""

from __future__ import annotations

from typing import Any

from engine.vedic.shadbala import BENEFICS, SIGN_LORD, _drishti, _norm

# The bhava benchmark, NOT a planetary one. An earlier version used 420 — that
# is Mercury's/Jupiter's *required Shadbala* from shadbala.REQUIRED, a per-planet
# figure. A bhava's total is its lord's whole Shadbala Pinda (~330-670) plus up
# to 60 Digbala plus a small Drishti term, so it averages ~500; against 420 all
# but the weakest houses printed over 100%.
REFERENCE_VIRUPAS = 500.0
GRAHAS = ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn"]

GRAHA_NAME_EN = {
    "sun": "Sun", "moon": "Moon", "mars": "Mars", "mercury": "Mercury",
    "jupiter": "Jupiter", "venus": "Venus", "saturn": "Saturn",
}

# Directional classification by exact ecliptic degree (0-360), and the house
# (1/4/7/10) where that type holds full directional strength.
#   human (Nara/Dwipada) -> Lagna (1st, east)   quadruped (Chatushpada) -> 10th (south)
#   watery (Jalachara)   -> 4th (north)         insect (Keeta)          -> 7th (west)
# Sagittarius and Capricorn are dual (Ubhayodaya) signs split at their 15th
# degree; every other sign is uniform across its 30 degrees. Scorpio is Keeta
# only (not Jalachara), per Phaladeepika/Brihat Jataka.
_BASE_SIGN_TYPE = [
    "quadruped",  # Aries
    "quadruped",  # Taurus
    "human",      # Gemini
    "watery",     # Cancer
    "quadruped",  # Leo
    "human",      # Virgo
    "human",      # Libra
    "insect",     # Scorpio
    None,         # Sagittarius — split, see _sign_type_at
    None,         # Capricorn — split, see _sign_type_at
    "human",      # Aquarius
    "watery",     # Pisces
]
_STRONG_HOUSE = {"human": 1, "quadruped": 10, "watery": 4, "insect": 7}


def _sign_type_at(degree: float) -> str:
    """Directional type at an exact ecliptic degree, honouring the Sagittarius/
    Capricorn half-sign split (1st half 0-15°, 2nd half 15-30° of the sign)."""
    degree = degree % 360.0
    sign = int(degree // 30)
    within = degree % 30.0
    if sign == 8:  # Sagittarius: 1st half human, 2nd half quadruped
        return "human" if within < 15.0 else "quadruped"
    if sign == 9:  # Capricorn: 1st half quadruped, 2nd half watery
        return "quadruped" if within < 15.0 else "watery"
    return _BASE_SIGN_TYPE[sign]


def _dig_bala(house: int, madhya_degree: float) -> float:
    """Directional strength of a bhava: 60 at the ideal house, 0 opposite it."""
    strong = _STRONG_HOUSE[_sign_type_at(madhya_degree)]
    weak = ((strong - 1 + 6) % 12) + 1
    dist = abs(house - weak)
    dist = min(dist, 12 - dist)  # house-steps from the powerless point, 0..6
    return 10.0 * dist


def _drishti_bala(madhya: float, planet_longitudes: dict[str, float]) -> float:
    """Net aspect on the bhava midpoint: benefic adds, malefic subtracts.

    Taken at full value, NOT quartered. The quarter belongs to a *planet's* Drik
    Bala (shadbala._drik), where it keeps one of six components from swamping the
    other five; a bhava's Drishti Bala is one of only three and is meant to carry
    real weight. Quartering it here pinned the column to about +/-20 virupas
    against a ~500 total, so it never separated two bhavas sharing a lord.
    """
    total = 0.0
    for g in GRAHAS:
        lon = planet_longitudes.get(g)
        if lon is None:
            continue
        angle = _norm(madhya - float(lon))  # aspected - aspecting
        d = _drishti(g, angle)
        total += d if g in BENEFICS else -d
    return total


def _special_addition(sign: int, madhya: float, lord: str, planet_longitudes: dict[str, float]) -> float:
    """Bonus for the bhava's own Lord, Jupiter, Venus, or Mercury occupying or
    aspecting it: a flat 60 if occupying (full capacity), else that planet's
    graduated Drishti Virupas (0-60) if aspecting. Multiple qualifiers sum.
    """
    total = 0.0
    for g in {lord, "jupiter", "venus", "mercury"}:
        lon = planet_longitudes.get(g)
        if lon is None:
            continue
        if int(_norm(lon) // 30) == sign:
            total += 60.0
        else:
            total += _drishti(g, _norm(madhya - float(lon)))
    return total


def _house_of(lon: float, lagna_longitude: float) -> tuple[int, float]:
    """Which bhava (1-12) a longitude falls in, under the same equal 30°
    houses centred on each Lagna-degree madhya used above, plus its signed
    offset from that bhava's madhya in degrees (-15..+15)."""
    offset_from_sandhi = _norm(lon - lagna_longitude + 15.0)
    house = int(offset_from_sandhi // 30) + 1
    signed = (offset_from_sandhi % 30.0) - 15.0
    return house, signed


def _bhava_percent(signed_offset: float) -> float:
    """Bhava %: 100 at the Bhava Madhya, 0 at either Bhava Sandhi (±15°),
    linear (Trairashika) in between."""
    return round(max(0.0, (1.0 - abs(signed_offset) / 15.0) * 100.0), 2)


def compute_bhava_bala(
    lagna_longitude: float,
    planet_longitudes: dict[str, float],
    shadbala: dict[str, Any],
) -> dict[str, Any]:
    """Bhava Bala payload for /kundali/detail.

    Whole-sign houses, but each bhava's madhya inherits the Lagna's own exact
    degree carried forward by 30° per house — not the sign's flat centre —
    so the Sagittarius/Capricorn half-sign Digbala split has a real degree to
    test against. ``shadbala`` is the compute_shadbala result.
    """
    lord_virupas = {
        row["key"]: float(row["total_virupas"]) for row in shadbala["planets"]
    }

    houses: list[dict[str, Any]] = []
    for house in range(1, 13):
        madhya = _norm(lagna_longitude + (house - 1) * 30.0)
        sign = int(madhya // 30) % 12
        lord = SIGN_LORD[sign]

        bhavadhipati = lord_virupas.get(lord, 0.0)
        disha = _dig_bala(house, madhya)
        drishti_base = _drishti_bala(madhya, planet_longitudes)
        special_addition = _special_addition(sign, madhya, lord, planet_longitudes)
        drishti = drishti_base + special_addition
        total = bhavadhipati + disha + drishti

        houses.append({
            "house": house,
            "madhyaLongitude": round(madhya, 4),
            "lordKey": lord,
            "lordName": GRAHA_NAME_EN[lord],
            "bhavadhipati": round(bhavadhipati, 2),
            "disha": round(disha, 2),
            "drishti": round(drishti, 2),
            "drishtiBase": round(drishti_base, 2),
            "specialAddition": round(special_addition, 2),
            "totalVirupas": round(total, 2),
            "totalPinda": round(total, 2),
            "rupas": round(total / 60.0, 2),
            "percent": round(total / REFERENCE_VIRUPAS * 100.0, 2),
        })

    strongest = max(houses, key=lambda h: h["totalPinda"])
    weakest = min(houses, key=lambda h: h["totalPinda"])

    rulership: dict[str, float] = {}
    for g in GRAHAS:
        ruled = [h["percent"] for h in houses if h["lordKey"] == g]
        if ruled:
            rulership[g] = round(sum(ruled) / len(ruled), 2)

    # Bhava %: how close each graha sits to its own bhava's madhya, not the
    # house's own bala — 100% at the madhya, 0% at the sandhi with the next house.
    planet_bhava_percent: dict[str, dict[str, Any]] = {}
    for g in GRAHAS:
        lon = planet_longitudes.get(g)
        if lon is None:
            continue
        house, offset = _house_of(lon, lagna_longitude)
        planet_bhava_percent[g] = {
            "house": house,
            "offsetFromMadhya": round(offset, 4),
            "percent": _bhava_percent(offset),
        }

    return {
        "houses": houses,
        "strongest": strongest,
        "weakest": weakest,
        "rulershipPercent": rulership,
        "referenceVirupas": REFERENCE_VIRUPAS,
        "planetBhavaPercent": planet_bhava_percent,
    }
