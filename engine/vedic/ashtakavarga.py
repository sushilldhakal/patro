"""Parashari Ashtakavarga (BPHS Ch. 66) — bindu tables per sidereal rashi."""

from __future__ import annotations

from typing import Any

from engine.astronomy.positions import RASHI_NAMES, RASHI_NAMES_NE
from engine.vedic.graha_details import rashi_from_longitude

ASHTAKAVARGA_TARGETS = ["lagna", "sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn"]

# Seven grahas only — Sarvashtakavarga excludes Lagna (337 bindus).
SAV_PLANETS = ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn"]

_BINDU_RULES: dict[str, dict[str, list[int]]] = {
    "sun": {
        "sun": [1, 2, 4, 7, 8, 9, 10, 11],
        "moon": [3, 6, 10, 11],
        "mars": [1, 2, 4, 7, 8, 9, 10, 11],
        "mercury": [3, 5, 6, 9, 10, 11, 12],
        "jupiter": [5, 6, 9, 11],
        "venus": [6, 7, 12],
        "saturn": [1, 2, 4, 7, 8, 9, 10, 11],
        "lagna": [3, 4, 6, 10, 11, 12],
    },
    "moon": {
        "sun": [3, 6, 7, 8, 10, 11],
        "moon": [1, 3, 6, 7, 10, 11],
        "mars": [2, 3, 5, 6, 10, 11],
        "mercury": [1, 3, 4, 5, 7, 8, 10, 11],
        "jupiter": [1, 4, 7, 8, 10, 11, 12],
        "venus": [3, 4, 5, 7, 9, 10, 11],
        "saturn": [3, 5, 6, 11],
        "lagna": [3, 6, 10, 11],
    },
    "mars": {
        "sun": [3, 5, 6, 10, 11],
        "moon": [3, 6, 11],
        "mars": [1, 2, 4, 7, 8, 10, 11],
        "mercury": [3, 5, 6, 11],
        "jupiter": [6, 10, 11, 12],
        "venus": [6, 8, 11, 12],
        "saturn": [1, 4, 7, 8, 9, 10, 11],
        "lagna": [1, 3, 6, 10, 11],
    },
    "mercury": {
        "sun": [5, 6, 9, 11, 12],
        "moon": [2, 4, 6, 8, 10, 11],
        "mars": [1, 2, 4, 7, 8, 9, 10, 11],
        "mercury": [1, 3, 5, 6, 9, 10, 11, 12],
        "jupiter": [6, 8, 11, 12],
        "venus": [1, 2, 3, 4, 5, 8, 9, 11],
        "saturn": [1, 2, 4, 7, 8, 9, 10, 11],
        "lagna": [1, 2, 4, 6, 8, 10, 11],
    },
    "jupiter": {
        "sun": [1, 2, 3, 4, 7, 8, 9, 10, 11],
        "moon": [2, 5, 7, 9, 11],
        "mars": [1, 2, 4, 7, 8, 10, 11],
        "mercury": [1, 2, 4, 5, 6, 9, 10, 11],
        "jupiter": [1, 2, 3, 4, 7, 8, 10, 11],
        "venus": [2, 5, 6, 9, 10, 11],
        "saturn": [3, 5, 6, 12],
        "lagna": [1, 2, 4, 5, 6, 7, 9, 10, 11],
    },
    "venus": {
        "sun": [8, 11, 12],
        "moon": [1, 2, 3, 4, 5, 8, 9, 11, 12],
        "mars": [3, 4, 6, 9, 11, 12],
        "mercury": [3, 5, 6, 9, 11],
        "jupiter": [5, 8, 9, 10, 11],
        "venus": [1, 2, 3, 4, 5, 8, 9, 10, 11],
        "saturn": [3, 4, 5, 8, 9, 10, 11],
        "lagna": [1, 2, 3, 4, 5, 8, 9, 11],
    },
    "saturn": {
        "sun": [1, 2, 4, 7, 8, 10, 11],
        "moon": [3, 6, 11],
        "mars": [3, 5, 6, 10, 11, 12],
        "mercury": [6, 8, 9, 10, 11, 12],
        "jupiter": [5, 6, 11, 12],
        "venus": [6, 11, 12],
        "saturn": [3, 5, 6, 11],
        "lagna": [1, 3, 4, 6, 10, 11],
    },
    "lagna": {
        "sun": [3, 4, 6, 10, 11, 12],
        "moon": [3, 6, 10, 11, 12],
        "mars": [1, 3, 6, 10, 11],
        "mercury": [1, 2, 4, 6, 8, 10, 11],
        "jupiter": [1, 2, 4, 5, 6, 7, 9, 10, 11],
        "venus": [1, 2, 3, 4, 5, 8, 9],
        "saturn": [1, 3, 4, 6, 10, 11],
        "lagna": [3, 6, 10, 11],
    },
}

# Rashi multipliers (B.V. Raman / Mehta). Index 0 = Mesha.
RASHI_GUNAKARA = [7, 10, 8, 4, 10, 5, 7, 8, 9, 5, 11, 12]

GRAHA_GUNAKARA = {
    "sun": 5, "moon": 5, "mars": 8, "mercury": 5,
    "jupiter": 10, "venus": 7, "saturn": 5, "lagna": 5,
}

_TRIKONA_GROUPS = [(1, 5, 9), (2, 6, 10), (3, 7, 11), (4, 8, 12)]

# Dual-sign pairs for Ekadhipatya (Cancer & Leo exempt).
_EKADHIPATYA_PAIRS = [(1, 8), (2, 7), (3, 6), (9, 12), (10, 11)]


def _norm_sign(rashi: int) -> int:
    return (rashi - 1) % 12 + 1


def compute_bhinnashtakavarga(target: str, contributor_signs: dict[str, int]) -> list[int]:
    """BAV bindu counts per rashi (index 0 = Mesha) for one target."""
    scores = [0] * 12
    rules = _BINDU_RULES[target]
    for contributor in ASHTAKAVARGA_TARGETS:
        donor_sign = contributor_signs.get(contributor)
        benefic_houses = rules.get(contributor)
        if not benefic_houses or donor_sign is None:
            continue
        for house in benefic_houses:
            scores[_norm_sign(donor_sign + house - 1) - 1] += 1
    return scores


def _trikona_shodhana(scores: list[int]) -> list[int]:
    out = list(scores)
    for group in _TRIKONA_GROUPS:
        vals = [out[r - 1] for r in group]
        if any(v == 0 for v in vals):
            continue
        mn = min(vals)
        if all(v == mn for v in vals):
            for r in group:
                out[r - 1] = 0
        else:
            for r in group:
                out[r - 1] -= mn
    return out


def _is_sign_occupied(rashi: int, occupant_signs: dict[str, int]) -> bool:
    return any(k != "lagna" and occupant_signs.get(k) == rashi for k in ASHTAKAVARGA_TARGETS)


def _ekadhipatya_shodhana(scores: list[int], occupant_signs: dict[str, int]) -> list[int]:
    out = list(scores)
    for a, b in _EKADHIPATYA_PAIRS:
        va, vb = out[a - 1], out[b - 1]
        occ_a = _is_sign_occupied(a, occupant_signs)
        occ_b = _is_sign_occupied(b, occupant_signs)
        if occ_a and occ_b:
            continue
        if va == 0 or vb == 0:
            continue
        if occ_a and not occ_b:
            out[b - 1] = va if vb > va else 0
            continue
        if occ_b and not occ_a:
            out[a - 1] = vb if va > vb else 0
            continue
        if va == vb:
            out[a - 1] = 0
            out[b - 1] = 0
        elif va > vb:
            out[a - 1] = vb
        else:
            out[b - 1] = va
    return out


def _matrix_rows(charts: dict[str, list[int]]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for i in range(12):
        bindus = {t: charts[t][i] for t in ASHTAKAVARGA_TARGETS}
        rows.append(
            {
                "rashi": i + 1,
                "rashiEn": RASHI_NAMES[i],
                "rashiNe": RASHI_NAMES_NE[i],
                "bindus": bindus,
                "sarvashtaka": sum(bindus[t] for t in SAV_PLANETS),
            }
        )
    return rows


def _shodhya_pinda(
    reduced: dict[str, list[int]], occupant_signs: dict[str, int]
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for target in ASHTAKAVARGA_TARGETS:
        chart = reduced[target]
        rashi_pinda = sum(chart[i] * RASHI_GUNAKARA[i] for i in range(12))
        graha_pinda = sum(
            chart[occupant_signs[g] - 1] * GRAHA_GUNAKARA[g] for g in ASHTAKAVARGA_TARGETS
        )
        rows.append(
            {
                "target": target,
                "rashiPinda": rashi_pinda,
                "grahaPinda": graha_pinda,
                "shodhyaPinda": rashi_pinda + graha_pinda,
            }
        )
    return rows


def compute_ashtakavarga(
    lagna_rashi: int, planet_longitudes: dict[str, float]
) -> dict[str, Any]:
    """Raw + reduced (Trikona then Ekadhipatya Shodhana) tables and Shodhya Pinda."""
    signs = {"lagna": _norm_sign(lagna_rashi)}
    for key in SAV_PLANETS:
        signs[key] = rashi_from_longitude(planet_longitudes.get(key, 0.0))

    raw_charts: dict[str, list[int]] = {}
    reduced_charts: dict[str, list[int]] = {}
    for target in ASHTAKAVARGA_TARGETS:
        raw = compute_bhinnashtakavarga(target, signs)
        raw_charts[target] = raw
        reduced_charts[target] = _ekadhipatya_shodhana(_trikona_shodhana(raw), signs)

    return {
        "raw": _matrix_rows(raw_charts),
        "reduced": _matrix_rows(reduced_charts),
        "shodhyaPinda": _shodhya_pinda(reduced_charts, signs),
        "signs": signs,
    }
