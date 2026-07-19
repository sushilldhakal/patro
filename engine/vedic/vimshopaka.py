"""
Vimshopaka Bala — the 20-point divisional (varga) strength of the seven
classical planets.

For each division in a chosen classification the planet's sign is found, its
relationship with that sign's lord is graded on the five-fold (Panchadha
Maitri) scale, and the division's contribution is::

    contribution = Swavishwa (division points) × Varga Vishwa (relationship) / 20

The Varga Vishwa (relationship points, 20-point scale) is:
    own sign / exaltation  20
    extreme friend (adhi-mitra)  18
    friend (mitra)               15
    neutral (sama)               10
    enemy (shatru)                7
    extreme enemy (adhi-shatru)   5

The four classifications (per the reference book):
    Shadvarga      6 divisions   (Rashi, Hora, Drekkana, Navamsha,
                                  Dwadashamsha, Trimshamsha)
    Saptavarga     7 divisions   (Shadvarga + Saptamsha)
    Dashavarga    10 divisions   (Saptavarga + Dashamsha, Shodashamsha,
                                  Shastiamsha)
    Shodashavarga 16 divisions   (all sixteen)

Each division's Swavishwa points sum to 20 within its classification, so the
maximum Vimshopaka score for any classification is 20.
"""

from __future__ import annotations

from typing import Any, Optional

from engine.vedic.shadbala import (
    EXALT_DEG,
    PLANETS,
    PLANET_NAMES,
    SIGN_LORD,
    _natural_rel,
    _sign,
    _temporal_rel,
)
from engine.vedic.vargas import varga_rashi_from_longitude

# Varga Vishwa — relationship points on the 20-point scale, keyed by the
# compound (natural + temporal) relationship score. Own sign / exaltation (20)
# is handled before this lookup.
VARGA_VISHWA = {2: 18.0, 1: 15.0, 0: 10.0, -1: 7.0, -2: 5.0}

# Division numbers making up each classification, in the canonical order.
SHADVARGA_DIVS = (1, 2, 3, 9, 12, 30)
SAPTAVARGA_DIVS = (1, 2, 3, 7, 9, 12, 30)
DASHAVARGA_DIVS = (1, 2, 3, 7, 9, 10, 12, 16, 30, 60)
SHODASHAVARGA_DIVS = (1, 2, 3, 4, 7, 9, 10, 12, 16, 20, 24, 27, 30, 40, 45, 60)

# Swavishwa — the points each division carries within a classification (they sum
# to 20). Only Shadvarga is filled from the reference book so far; the other
# three tables are pending the book's exact values and are left as None so those
# classifications are simply omitted until provided.
SWAVISHWA: dict[str, Optional[dict[int, float]]] = {
    "shadvarga": {1: 6.0, 9: 5.0, 3: 4.0, 2: 2.0, 12: 2.0, 30: 1.0},
    "saptavarga": None,       # TODO: fill from book — 7 divisions, sum 20
    "dashavarga": None,       # TODO: fill from book — 10 divisions, sum 20
    "shodashavarga": None,    # TODO: fill from book — 16 divisions, sum 20
}

CLASSIFICATIONS = ("shadvarga", "saptavarga", "dashavarga", "shodashavarga")

CLASSIFICATION_LABELS = {
    "shadvarga": ("Shadvarga (6)", "षड्वर्ग (६)"),
    "saptavarga": ("Saptavarga (7)", "सप्तवर्ग (७)"),
    "dashavarga": ("Dashavarga (10)", "दशवर्ग (१०)"),
    "shodashavarga": ("Shodashavarga (16)", "षोडशवर्ग (१६)"),
}


def _exalt_sign(p: str) -> int:
    return _sign(EXALT_DEG[p])


def _varga_vishwa(p: str, sign: int, d1_signs: dict[str, int]) -> float:
    """Relationship points (0–20) of planet ``p`` with the varga ``sign``."""
    lord = SIGN_LORD[sign]
    if lord == p or sign == _exalt_sign(p):
        return 20.0
    compound = _natural_rel(p, lord) + _temporal_rel(p, lord, d1_signs)
    return VARGA_VISHWA[compound]


def _classification_score(p: str, lon: float, d1_signs: dict[str, int],
                          swavishwa: dict[int, float]) -> float:
    total = 0.0
    for division, points in swavishwa.items():
        sign = varga_rashi_from_longitude(division, lon) - 1  # → 0-based
        total += points * _varga_vishwa(p, sign, d1_signs) / 20.0
    return total


def _grade(score: float) -> str:
    """Evaluation band per the book (out of 20)."""
    if score >= 15.0:
        return "full"        # पूर्ण — excellent results
    if score >= 10.0:
        return "mediocre"    # मध्यम — mediocre results
    if score >= 5.0:
        return "little"      # अल्प — little auspicious effect
    return "incapable"       # असमर्थ — not capable of good results


def compute_vimshopaka(lons: dict[str, float], d1_signs: dict[str, int]) -> dict[str, Any]:
    """Vimshopaka Bala for all seven planets across every defined classification.

    ``lons`` maps planet → sidereal longitude; ``d1_signs`` maps planet → its
    0-based D1 sign (used for the temporal-friendship half of the relationship).
    """
    available = [c for c in CLASSIFICATIONS if SWAVISHWA.get(c)]

    planets: list[dict[str, Any]] = []
    for p in PLANETS:
        lon = lons[p]
        scores: dict[str, Any] = {}
        for c in available:
            raw = _classification_score(p, lon, d1_signs, SWAVISHWA[c])  # type: ignore[arg-type]
            scores[c] = {"score": round(raw, 2), "grade": _grade(raw)}
        name, name_ne = PLANET_NAMES[p]
        planets.append({
            "key": p,
            "name": name,
            "name_ne": name_ne,
            "scores": scores,
        })

    return {
        "classifications": [
            {
                "key": c,
                "label": CLASSIFICATION_LABELS[c][0],
                "label_ne": CLASSIFICATION_LABELS[c][1],
                "divisions": list(SWAVISHWA[c].keys()),  # type: ignore[union-attr]
            }
            for c in available
        ],
        "planets": planets,
        "max_score": 20,
        "method": "Vimshopaka Bala (Parashari, 20-point varga strength)",
    }
