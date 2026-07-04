"""Bhava Bala — house strength, BPHS style, over whole-sign houses.

Each bhava's strength sums three components, all in Virupas:
  * Bhavadhipati Bala — the full Shadbala of the bhava's lord.
  * Bhava Digbala   — directional strength from the sign-type on the bhava.
  * Bhava Drishti Bala — net benefic-minus-malefic aspect on the bhava's midpoint.
420 Virupas (7 Rupas) is treated as the 100% benchmark.
"""

from __future__ import annotations

from typing import Any

from engine.vedic.shadbala import BENEFICS, SIGN_LORD, _drishti, _norm

REFERENCE_VIRUPAS = 420.0  # 7 rupas = 100%
GRAHAS = ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn"]

GRAHA_NAME_EN = {
    "sun": "Sun", "moon": "Moon", "mars": "Mars", "mercury": "Mercury",
    "jupiter": "Jupiter", "venus": "Venus", "saturn": "Saturn",
}

# Whole-sign classification of each sign (0-based) into its directional type, and
# the house (1/4/7/10) where that type holds full directional strength.
#   human   -> Lagna (1st, east)      quadruped -> 10th (south, meridian)
#   watery  -> 4th (north, nadir)     insect    -> 7th (west)
_SIGN_TYPE = [
    "quadruped",  # Aries
    "quadruped",  # Taurus
    "human",      # Gemini
    "watery",     # Cancer
    "quadruped",  # Leo
    "human",      # Virgo
    "human",      # Libra
    "insect",     # Scorpio
    "quadruped",  # Sagittarius
    "quadruped",  # Capricorn
    "human",      # Aquarius
    "watery",     # Pisces
]
_STRONG_HOUSE = {"human": 1, "quadruped": 10, "watery": 4, "insect": 7}


def _dig_bala(house: int, sign: int) -> float:
    """Directional strength of a bhava: 60 at the ideal house, 0 opposite it."""
    strong = _STRONG_HOUSE[_SIGN_TYPE[sign]]
    weak = ((strong - 1 + 6) % 12) + 1
    dist = abs(house - weak)
    dist = min(dist, 12 - dist)  # house-steps from the powerless point, 0..6
    return 10.0 * dist


def _drishti_bala(madhya: float, planet_longitudes: dict[str, float]) -> float:
    """Net aspect on the bhava midpoint: benefic adds, malefic subtracts, /4."""
    total = 0.0
    for g in GRAHAS:
        lon = planet_longitudes.get(g)
        if lon is None:
            continue
        angle = _norm(madhya - float(lon))  # aspected - aspecting
        d = _drishti(g, angle)
        total += d if g in BENEFICS else -d
    return total / 4.0


def compute_bhava_bala(
    lagna_rashi: int,
    planet_longitudes: dict[str, float],
    shadbala: dict[str, Any],
) -> dict[str, Any]:
    """Bhava Bala payload for /kundali/detail.

    ``lagna_rashi`` is 1-based (Aries=1). ``shadbala`` is the compute_shadbala result.
    """
    lord_virupas = {
        row["key"]: float(row["total_virupas"]) for row in shadbala["planets"]
    }

    houses: list[dict[str, Any]] = []
    for house in range(1, 13):
        sign = (lagna_rashi - 1 + house - 1) % 12  # 0-based sign on this bhava
        madhya = sign * 30.0 + 15.0
        lord = SIGN_LORD[sign]

        bhavadhipati = lord_virupas.get(lord, 0.0)
        disha = _dig_bala(house, sign)
        drishti = _drishti_bala(madhya, planet_longitudes)
        total = bhavadhipati + disha + drishti

        houses.append({
            "house": house,
            "madhyaLongitude": round(madhya, 4),
            "lordKey": lord,
            "lordName": GRAHA_NAME_EN[lord],
            "bhavadhipati": round(bhavadhipati, 2),
            "disha": round(disha, 2),
            "drishti": round(drishti, 2),
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

    return {
        "houses": houses,
        "strongest": strongest,
        "weakest": weakest,
        "rulershipPercent": rulership,
        "referenceVirupas": REFERENCE_VIRUPAS,
    }
