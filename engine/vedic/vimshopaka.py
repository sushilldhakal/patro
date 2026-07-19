"""
Vimshopaka Bala — the 20-point divisional (varga) strength of the seven
classical planets.

For each division in a chosen classification the planet's sign is found, its
relationship with that sign's lord is graded on the five-fold (Panchadha
Maitri) scale, and the division's contribution is::

    contribution = Swavishwa (division points) × Varga Vishwa (relationship) / 20

The Varga Vishwa (relationship points, 20-point scale) is:
    exaltation / moolatrikona / own sign  20
    extreme friend (adhi-mitra)           18
    friend (mitra)                        15
    neutral (sama)                        10
    enemy (shatru)                         7
    extreme enemy (adhi-shatru)            5
    debilitation (neecha)                  0   (BPHS Ch. 8: shunya)

A planet in moolatrikona counts as own sign (20); a planet in its
debilitation sign — the 7th from its exaltation — is bereft of strength (0),
regardless of that sign lord's friendship.

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

# Swavishwa — the points each division carries within a classification. Values
# are from the reference book; each column totals exactly 20. Keys are the varga
# division numbers (D1 = Rashi, D2 = Hora, … D60 = Shastiamsha), in ascending
# order so the emitted `divisions` list reads naturally.
SWAVISHWA: dict[str, Optional[dict[int, float]]] = {
    # Rashi 6, Hora 2, Drekkana 4, Navamsha 5, Dwadashamsha 2, Trimshamsha 1.
    "shadvarga": {1: 6.0, 2: 2.0, 3: 4.0, 9: 5.0, 12: 2.0, 30: 1.0},
    # Shadvarga split + Saptamsha 1 (Rashi 5, Hora 2, Drekkana 3, Saptamsha 1,
    # Navamsha 2.5, Dwadashamsha 4.5, Trimshamsha 2).
    "saptavarga": {1: 5.0, 2: 2.0, 3: 3.0, 7: 1.0, 9: 2.5, 12: 4.5, 30: 2.0},
    # Rashi 3, Shastiamsha 5, all eight others 1.5 each.
    "dashavarga": {
        1: 3.0, 2: 1.5, 3: 1.5, 7: 1.5, 9: 1.5, 10: 1.5,
        12: 1.5, 16: 1.5, 30: 1.5, 60: 5.0,
    },
    # Rashi 3.5, Navamsha 3, Shodashamsha 2, Shastiamsha 4, Hora/Drekkana/
    # Trimshamsha 1 each, the remaining nine 0.5 each.
    "shodashavarga": {
        1: 3.5, 2: 1.0, 3: 1.0, 4: 0.5, 7: 0.5, 9: 3.0, 10: 0.5, 12: 0.5,
        16: 2.0, 20: 0.5, 24: 0.5, 27: 0.5, 30: 1.0, 40: 0.5, 45: 0.5, 60: 4.0,
    },
}

# Guard the book's tables — every classification must total exactly 20 points.
for _cls, _pts in SWAVISHWA.items():
    if _pts is not None:
        assert abs(sum(_pts.values()) - 20.0) < 1e-9, f"{_cls} Swavishwa ≠ 20"

CLASSIFICATIONS = ("shadvarga", "saptavarga", "dashavarga", "shodashavarga")

CLASSIFICATION_LABELS = {
    "shadvarga": ("Shadvarga (6)", "षड्वर्ग (६)"),
    "saptavarga": ("Saptavarga (7)", "सप्तवर्ग (७)"),
    "dashavarga": ("Dashavarga (10)", "दशवर्ग (१०)"),
    "shodashavarga": ("Shodashavarga (16)", "षोडशवर्ग (१६)"),
}


def _exalt_sign(p: str) -> int:
    return _sign(EXALT_DEG[p])


def _debil_sign(p: str) -> int:
    """Sign of debilitation — the 7th (opposite) from the exaltation sign."""
    return (_exalt_sign(p) + 6) % 12


def _varga_vishwa(p: str, sign: int, d1_signs: dict[str, int]) -> float:
    """Relationship points (0–20) of planet ``p`` with the varga ``sign``.

    Own sign / moolatrikona / exaltation → 20; debilitation → 0; otherwise the
    five-fold (Panchadha Maitri) compound friendship of the sign's lord.
    """
    lord = SIGN_LORD[sign]
    if lord == p or sign == _exalt_sign(p):
        return 20.0
    if sign == _debil_sign(p):
        return 0.0
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
