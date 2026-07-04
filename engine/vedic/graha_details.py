"""Graha reference rules: sign lords, dignities, natural relations, KP sub-lords.

Single source of truth for the chart-detail rules the web/mobile clients render.
Ported from the web client so every consumer gets identical results from the API.
"""

from __future__ import annotations

from typing import Any

from engine.vedic.vimshottari import DASHA_SEQUENCE, DASHA_YEARS

GRAHA_DETAIL_ORDER = [
    "sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn", "rahu", "ketu",
]

NAKSHATRA_SPAN_DEG = 360.0 / 27.0

# Sign lords, index 0 = Mesha.
RASHI_LORD_KEYS = [
    "mars", "venus", "mercury", "moon", "sun", "mercury",
    "venus", "mars", "jupiter", "saturn", "saturn", "jupiter",
]

# Naisargika (natural) friendships per Parashara; nodes per common convention.
FRIENDS: dict[str, list[str]] = {
    "sun": ["moon", "mars", "jupiter"],
    "moon": ["sun", "mercury"],
    "mars": ["sun", "moon", "jupiter"],
    "mercury": ["sun", "venus"],
    "jupiter": ["sun", "moon", "mars"],
    "venus": ["mercury", "saturn"],
    "saturn": ["mercury", "venus"],
    "rahu": ["mercury", "venus", "saturn"],
    "ketu": ["mars", "venus", "saturn"],
}

ENEMIES: dict[str, list[str]] = {
    "sun": ["venus", "saturn"],
    "moon": [],
    "mars": ["mercury"],
    "mercury": ["moon"],
    "jupiter": ["mercury", "venus"],
    "venus": ["sun", "moon"],
    "saturn": ["sun", "moon", "mars"],
    "rahu": ["sun", "moon", "mars"],
    "ketu": ["sun", "moon"],
}

# Exaltation / debilitation / moolatrikona (degree band) / own signs.
DIGNITY_DATA: dict[str, dict[str, Any]] = {
    "sun": {"exalt": 1, "debil": 7, "moola": (5, 20), "own": [5]},
    "moon": {"exalt": 2, "debil": 8, "moola": (2, 30), "own": [4]},
    "mars": {"exalt": 10, "debil": 4, "moola": (1, 12), "own": [1, 8]},
    "mercury": {"exalt": 6, "debil": 12, "moola": (6, 20), "own": [3, 6]},
    "jupiter": {"exalt": 4, "debil": 10, "moola": (9, 10), "own": [9, 12]},
    "venus": {"exalt": 12, "debil": 6, "moola": (7, 15), "own": [2, 7]},
    "saturn": {"exalt": 7, "debil": 1, "moola": (11, 20), "own": [10, 11]},
    "rahu": {"exalt": 2, "debil": 8, "moola": None, "own": [11]},
    "ketu": {"exalt": 8, "debil": 2, "moola": None, "own": [8]},
}

# Combustion (asta) orbs from the Sun in degrees; retrograde Mercury/Venus shrink.
COMBUST_ORBS: dict[str, dict[str, float]] = {
    "moon": {"direct": 12},
    "mars": {"direct": 17},
    "mercury": {"direct": 14, "retro": 12},
    "jupiter": {"direct": 11},
    "venus": {"direct": 10, "retro": 8},
    "saturn": {"direct": 15},
}


def norm_lon(longitude: float) -> float:
    return longitude % 360.0


def rashi_from_longitude(longitude: float) -> int:
    """Sidereal rashi 1-12 from a longitude in degrees."""
    return int(norm_lon(longitude) // 30) + 1


def rashi_lord_key(rashi: int) -> str:
    return RASHI_LORD_KEYS[(rashi - 1) % 12]


def owned_rashis(graha: str) -> list[int]:
    """Signs (1-12) ruled by a graha; rahu/ketu rule none in the Parashari scheme."""
    return [i + 1 for i, lord in enumerate(RASHI_LORD_KEYS) if lord == graha]


def natural_relation(graha: str, other: str) -> str:
    if graha == other:
        return "self"
    if other in FRIENDS.get(graha, []):
        return "friend"
    if other in ENEMIES.get(graha, []):
        return "enemy"
    return "neutral"


def graha_dignity(graha: str, rashi: int, deg_in_rashi: float | None = None) -> str:
    """Sign-based dignity. Pass deg_in_rashi for D1 so moolatrikona bands apply."""
    d = DIGNITY_DATA[graha]
    if rashi == d["debil"]:
        return "debilitated"
    if rashi == d["exalt"]:
        if deg_in_rashi is not None:
            # Moon: Taurus 0-3° exalted, 3-30° moolatrikona.
            if graha == "moon":
                return "exalted" if deg_in_rashi < 3 else "moolatrikona"
            # Mercury: Virgo 0-15° exalted, 15-20° moolatrikona, rest own.
            if graha == "mercury":
                if deg_in_rashi < 15:
                    return "exalted"
                return "moolatrikona" if deg_in_rashi < 20 else "own"
        return "exalted"
    moola = d["moola"]
    if moola and rashi == moola[0]:
        return "moolatrikona" if deg_in_rashi is None or deg_in_rashi < moola[1] else "own"
    if rashi in d["own"]:
        return "own"
    rel = natural_relation(graha, rashi_lord_key(rashi))
    if rel == "friend":
        return "friend_house"
    if rel == "enemy":
        return "enemy_house"
    return "neutral_house"


def nakshatra_index_from_longitude(longitude: float) -> int:
    """0-based nakshatra index from a sidereal longitude."""
    return min(int(norm_lon(longitude) // NAKSHATRA_SPAN_DEG), 26)


def nakshatra_pada_from_longitude(longitude: float) -> tuple[int, int]:
    """(0-based nakshatra index, pada 1-4) from a sidereal longitude."""
    lon = norm_lon(longitude)
    index = nakshatra_index_from_longitude(lon)
    within = lon - index * NAKSHATRA_SPAN_DEG
    pada = min(int(within // (NAKSHATRA_SPAN_DEG / 4)) + 1, 4)
    return index, pada


def nakshatra_lord_key(longitude: float) -> str:
    """Nakshatra (Vimshottari) lord for a sidereal longitude."""
    return DASHA_SEQUENCE[nakshatra_index_from_longitude(longitude) % 9]


def kp_sub_lord_from_longitude(longitude: float) -> str:
    """KP sub-lord: nakshatra split into 9 parts proportional to Vimshottari years."""
    lon = norm_lon(longitude)
    index = nakshatra_index_from_longitude(lon)
    start_idx = index % 9
    elapsed = ((lon - index * NAKSHATRA_SPAN_DEG) / NAKSHATRA_SPAN_DEG) * 120.0
    for i in range(9):
        lord = DASHA_SEQUENCE[(start_idx + i) % 9]
        if elapsed < DASHA_YEARS[lord]:
            return lord
        elapsed -= DASHA_YEARS[lord]
    return DASHA_SEQUENCE[start_idx]


def is_combust(
    graha: str,
    longitude: float,
    sun_longitude: float,
    retrograde: bool = False,
) -> bool | None:
    """Whether a graha is combust (asta); None for the Sun and the nodes."""
    orb = COMBUST_ORBS.get(graha)
    if orb is None:
        return None
    diff = abs(longitude - sun_longitude) % 360.0
    elongation = 360.0 - diff if diff > 180.0 else diff
    limit = orb.get("retro", orb["direct"]) if retrograde else orb["direct"]
    return elongation <= limit


def longitude_dms_parts(longitude: float) -> dict[str, int]:
    """Degrees / minutes / seconds inside the occupied rashi."""
    lon = norm_lon(longitude)
    return _dms_from_deg_in_sign(int(lon // 30) + 1, lon % 30)


def _dms_from_deg_in_sign(rashi_num: int, deg_in_sign: float) -> dict[str, int]:
    total_sec = round(deg_in_sign * 3600)
    if total_sec >= 30 * 3600:
        total_sec = 30 * 3600 - 1
    return {
        "rashiNum": rashi_num,
        "deg": total_sec // 3600,
        "min": (total_sec % 3600) // 60,
        "sec": total_sec % 60,
    }
