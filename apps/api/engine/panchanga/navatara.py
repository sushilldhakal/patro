"""Navatara tarabala / chandrabala tables — computed from moon nakshatra / rashi."""

from __future__ import annotations

from typing import Any, Literal

from engine.panchanga.angas import NAKSHATRA_NAMES
from engine.astronomy.rashi import RASHI_NAMES, RASHI_NAMES_NE
from engine.panchanga.balam_panchaka import CHANDRA_GOOD_HOUSES
from engine.panchanga.names_ne import NAKSHATRA_NAMES_NE

NavataraTone = Literal["best", "good", "neutral", "bad", "worst"]

# One 9-tara table. 1 is medium, 3/5/7 are bad (7 worst), the rest are good.
TARA_NAMES_NE = ("जन्म", "सम्पत्", "विपत्", "क्षेम", "प्रत्यक्", "साधक", "निधन", "मित्र", "परम मित्र")
TARA_NAMES_EN = ("Janma", "Sampat", "Vipat", "Kshema", "Pratyak", "Sadhaka", "Naidhana", "Mitra", "Parama Mitra")

_NAVATARA_TYPES: list[dict[str, Any]] = [
    {"id": 1, "tara": TARA_NAMES_NE[0], "tara_en": TARA_NAMES_EN[0], "quality": "मध्यम", "quality_en": "Medium", "tone": "neutral"},
    {"id": 2, "tara": TARA_NAMES_NE[1], "tara_en": TARA_NAMES_EN[1], "quality": "अति शुभ", "quality_en": "Very auspicious", "tone": "best"},
    {"id": 3, "tara": TARA_NAMES_NE[2], "tara_en": TARA_NAMES_EN[2], "quality": "अशुभ", "quality_en": "Inauspicious", "tone": "bad"},
    {"id": 4, "tara": TARA_NAMES_NE[3], "tara_en": TARA_NAMES_EN[3], "quality": "अति शुभ", "quality_en": "Very auspicious", "tone": "best"},
    {"id": 5, "tara": TARA_NAMES_NE[4], "tara_en": TARA_NAMES_EN[4], "quality": "अशुभ", "quality_en": "Inauspicious", "tone": "bad"},
    {"id": 6, "tara": TARA_NAMES_NE[5], "tara_en": TARA_NAMES_EN[5], "quality": "अति शुभ", "quality_en": "Very auspicious", "tone": "best"},
    {"id": 7, "tara": TARA_NAMES_NE[6], "tara_en": TARA_NAMES_EN[6], "quality": "घातक", "quality_en": "Fatal", "tone": "worst"},
    {"id": 8, "tara": TARA_NAMES_NE[7], "tara_en": TARA_NAMES_EN[7], "quality": "शुभ", "quality_en": "Auspicious", "tone": "good"},
    {"id": 9, "tara": TARA_NAMES_NE[8], "tara_en": TARA_NAMES_EN[8], "quality": "अति शुभ", "quality_en": "Very auspicious", "tone": "best"},
]

_NE_DIGITS = "०१२३४५६७८९"
# Mixed houses are favourable only in शुक्ल पक्ष in some texts; the table stays neutral.
_CHANDRA_MIXED = frozenset({2, 5, 9})
_CHANDRA_BAD = frozenset({4, 12})


def compute_navatara_number(moon_idx: int, target_idx: int, cycle_size: int) -> int:
    diff = (target_idx - moon_idx + cycle_size) % cycle_size
    if diff == 0:
        return 1
    return ((9 - (diff % 9)) % 9) + 1


def navatara_meta(tara_num: int) -> dict[str, Any]:
    row = next((t for t in _NAVATARA_TYPES if t["id"] == tara_num), _NAVATARA_TYPES[0])
    return {
        "tara": row["tara"],
        "quality": row["quality"],
        "tone": row["tone"],
        "tara_num": tara_num,
    }


def tara_labels(tara_num: int) -> dict[str, Any]:
    """Nepali and English tara name, quality and tone. 1-based."""
    row = _NAVATARA_TYPES[(tara_num - 1) % 9]
    return {
        "tara": row["tara"],
        "tara_en": row["tara_en"],
        "quality": row["quality"],
        "quality_en": row["quality_en"],
        "tone": row["tone"],
        "tara_num": row["id"],
    }


def chandra_house_label(house: int) -> str:
    digits = "".join(_NE_DIGITS[int(c)] for c in str(house))
    return f"{digits}औं भाव"


def chandra_house_quality(house: int) -> tuple[str, NavataraTone]:
    if house == 8:
        return "अष्टम चन्द्र", "worst"
    if house in CHANDRA_GOOD_HOUSES:
        return "शुभ", "good"
    if house in _CHANDRA_MIXED:
        return "मध्यम", "neutral"
    if house in _CHANDRA_BAD:
        return "अशुभ", "bad"
    return "मध्यम", "neutral"


def _build_table(
    moon_idx: int,
    names_ne: list[str],
    names_en: list[str],
    cycle_size: int,
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for idx, name_ne in enumerate(names_ne):
        tara_num = compute_navatara_number(moon_idx, idx, cycle_size)
        meta = navatara_meta(tara_num)
        rows.append(
            {
                "index": idx,
                "name": name_ne,
                "name_en": names_en[idx] if idx < len(names_en) else None,
                **meta,
            }
        )
    return rows


def build_tarabala_table(nakshatra_block: dict[str, Any]) -> dict[str, Any]:
    """Full 27-nakshatra navatara table from today's moon nakshatra."""
    moon_num = int(nakshatra_block["number"])
    moon_idx = moon_num - 1
    moon_label = nakshatra_block.get("name_ne") or NAKSHATRA_NAMES_NE[moon_idx]
    return {
        "moon_index": moon_idx,
        "moon_label": moon_label,
        "moon_label_en": nakshatra_block.get("name") or NAKSHATRA_NAMES[moon_idx],
        "rows": _build_table(moon_idx, NAKSHATRA_NAMES_NE, NAKSHATRA_NAMES, 27),
    }


def build_chandrabalam_table(chandra_rashi: dict[str, Any]) -> dict[str, Any]:
    """Twelve janma rashis graded by the house the transit Moon occupies."""
    moon_num = int(chandra_rashi["number"])
    moon_idx = moon_num - 1
    moon_label = chandra_rashi.get("name_ne") or RASHI_NAMES_NE[moon_idx]
    rows: list[dict[str, Any]] = []
    for idx, name_ne in enumerate(RASHI_NAMES_NE):
        house = (moon_idx - idx) % 12 + 1
        quality, tone = chandra_house_quality(house)
        rows.append(
            {
                "index": idx,
                "name": name_ne,
                "name_en": RASHI_NAMES[idx],
                "house": house,
                "tara": chandra_house_label(house),
                "quality": quality,
                "tone": tone,
            }
        )
    return {
        "moon_index": moon_idx,
        "moon_label": moon_label,
        "moon_label_en": chandra_rashi.get("name") or RASHI_NAMES[moon_idx],
        "rows": rows,
    }
