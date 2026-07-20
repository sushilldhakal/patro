"""Parashari Ashtakavarga: bhinnashtakavarga, sarvashtakavarga, reductions, shodhya pinda.

All bindu tables follow BPHS. Each planet's bhinnashtakavarga (BAV) totals are the
classical invariants — Sun 48, Moon 49, Mars 39, Mercury 54, Jupiter 56, Venus 52,
Saturn 39 (grand total 337) — and the Lagna's own ashtakavarga totals 49. The
reduced charts apply Trikona then Ekadhipatya Shodhana, and Shodhya Pinda multiplies
the reduced bindus by the fixed Rasi and Graha measures.
"""

from __future__ import annotations

from typing import Any

from engine.astronomy.positions import RASHI_NAMES, RASHI_NAMES_NE

# Contributors, in the column order the client renders.
CONTRIBUTORS = ["lagna", "sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn"]
# Grahas only (Sarvashtaka excludes the Lagna).
GRAHAS = ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn"]

# Benefic houses (1..12, counted from each contributor's rashi) for every target's
# bhinnashtakavarga. Cross-checked against BPHS; per-target totals verified below.
BENEFIC_HOUSES: dict[str, dict[str, list[int]]] = {
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
        "mars": [2, 3, 5, 6, 9, 10, 11],
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
        "mars": [3, 5, 6, 9, 11, 12],
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
    # Lagna's own ashtakavarga (auxiliary; excluded from Sarvashtaka).
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

# Classical per-target BAV totals (invariant across every horoscope).
_EXPECTED_TOTALS = {
    "sun": 48, "moon": 49, "mars": 39, "mercury": 54,
    "jupiter": 56, "venus": 52, "saturn": 39, "lagna": 49,
}

# Trikona (trine) groups of signs, 0-based.
_TRIKONAS = [[0, 4, 8], [1, 5, 9], [2, 6, 10], [3, 7, 11]]

# Sign pairs owned by a single graha, for Ekadhipatya Shodhana (0-based signs).
# Sun (Leo) and Moon (Cancer) own one sign each — no reduction.
_EKADHIPATYA_PAIRS = [
    (0, 7),   # Mars: Aries, Scorpio
    (1, 6),   # Venus: Taurus, Libra
    (2, 5),   # Mercury: Gemini, Virgo
    (8, 11),  # Jupiter: Sagittarius, Pisces
    (9, 10),  # Saturn: Capricorn, Aquarius
]

# Shodhya Pinda multipliers.
RASIMANA = [7, 10, 8, 4, 10, 5, 7, 8, 9, 5, 11, 12]  # 0-based sign
GRAHAMANA = {
    "sun": 5, "moon": 5, "mars": 8, "mercury": 5,
    "jupiter": 10, "venus": 7, "saturn": 5,
}


def _validate_tables() -> None:
    """Guard against transcription errors in the benefic-house tables."""
    for target, expected in _EXPECTED_TOTALS.items():
        total = sum(len(v) for v in BENEFIC_HOUSES[target].values())
        if total != expected:
            raise AssertionError(
                f"Ashtakavarga table for {target} sums to {total}, expected {expected}"
            )


_validate_tables()


def _bhinna(target: str, positions: dict[str, int]) -> list[int]:
    """Bhinnashtakavarga of ``target``: bindus per sign (0-based, length 12)."""
    bindus = [0] * 12
    table = BENEFIC_HOUSES[target]
    for contributor, houses in table.items():
        base = positions[contributor]  # 0-based sign the contributor sits in
        for house in houses:
            sign = (base + house - 1) % 12
            bindus[sign] += 1
    return bindus


def _trikona_shodhana(bav: list[int]) -> list[int]:
    """Subtract the least value within each trine group (min -> 0)."""
    out = list(bav)
    for group in _TRIKONAS:
        low = min(out[i] for i in group)
        if low:
            for i in group:
                out[i] -= low
    return out


def _ekadhipatya_shodhana(bav: list[int], occupied: set[int]) -> list[int]:
    """Reduce the two signs owned by a single graha (Jataka Parijata, Adhyaya X).

    Applied to the bindus left after Trikona Shodhana, per single-lord pair:
      * both signs occupied              -> no reduction (Rule 1)
      * both empty, equal dots           -> both set to 0 (Rule 3a)
      * both empty, unequal dots         -> both set to the smaller (Rule 3b)
      * one occupied with MORE dots than the empty sign
                                         -> the empty sign set to 0 (Rule 2)
      * one occupied with FEWER dots than the empty sign
                                         -> the empty sign made equal to the
                                            occupied sign (Rule 4)
    In every one-occupied case only the empty sign changes; the occupied sign
    keeps its figure, and a tie is treated as Rule 2 (empty sign -> 0).
    """
    out = list(bav)
    for a, b in _EKADHIPATYA_PAIRS:
        va, vb = out[a], out[b]
        pa, pb = a in occupied, b in occupied
        if pa and pb:
            continue  # both tenanted — no reduction
        if not pa and not pb:
            out[a] = out[b] = 0 if va == vb else min(va, vb)
        elif pa:  # A occupied, B empty — reduce only B
            out[b] = va if va < vb else 0
        else:  # B occupied, A empty — reduce only A
            out[a] = vb if vb < va else 0
    return out


def _reduce(bav: list[int], occupied: set[int]) -> list[int]:
    return _ekadhipatya_shodhana(_trikona_shodhana(bav), occupied)


def _sign_rows(bav_by_target: dict[str, list[int]]) -> list[dict[str, Any]]:
    """Assemble the 12 per-rashi rows the client renders."""
    rows: list[dict[str, Any]] = []
    for sign in range(12):
        bindus = {t: bav_by_target[t][sign] for t in CONTRIBUTORS}
        rows.append({
            "rashi": sign + 1,
            "rashiEn": RASHI_NAMES[sign],
            "rashiNe": RASHI_NAMES_NE[sign],
            "bindus": bindus,
            "sarvashtaka": sum(bindus[g] for g in GRAHAS),
        })
    return rows


def compute_ashtakavarga(
    planet_longitudes: dict[str, float],
    lagna_longitude: float,
) -> dict[str, Any]:
    """Full Ashtakavarga payload for /kundali/detail.

    ``planet_longitudes`` must contain the seven grahas keyed by lowercase name;
    ``lagna_longitude`` is the ascendant's sidereal longitude in degrees.
    """
    positions: dict[str, int] = {
        g: int(planet_longitudes[g] % 360 // 30) % 12 for g in GRAHAS
    }
    positions["lagna"] = int(lagna_longitude % 360 // 30) % 12

    # Signs tenanted by any of the seven grahas (for Ekadhipatya).
    occupied = {positions[g] for g in GRAHAS}

    raw = {t: _bhinna(t, positions) for t in CONTRIBUTORS}
    reduced = {t: _reduce(raw[t], occupied) for t in CONTRIBUTORS}

    # Which graha(s) sit in each sign — for the Graha Pinda multiplier.
    graha_in_sign: dict[int, list[str]] = {}
    for g in GRAHAS:
        graha_in_sign.setdefault(positions[g], []).append(g)

    shodhya: list[dict[str, Any]] = []
    for t in CONTRIBUTORS:
        red = reduced[t]
        rashi_pinda = sum(red[s] * RASIMANA[s] for s in range(12))
        graha_pinda = sum(
            red[s] * sum(GRAHAMANA[g] for g in graha_in_sign.get(s, []))
            for s in range(12)
        )
        shodhya.append({
            "target": t,
            "rashiPinda": rashi_pinda,
            "grahaPinda": graha_pinda,
            "shodhyaPinda": rashi_pinda + graha_pinda,
        })

    return {
        "raw": _sign_rows(raw),
        "reduced": _sign_rows(reduced),
        "shodhyaPinda": shodhya,
        "signs": {t: positions[t] + 1 for t in CONTRIBUTORS},
    }
