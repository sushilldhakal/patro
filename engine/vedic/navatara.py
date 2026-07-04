"""Navatara tarabala / chandrabala tables — computed from moon nakshatra / rashi."""

from __future__ import annotations

from typing import Any, Literal

from engine.astronomy.positions import NAKSHATRA_NAMES, RASHI_NAMES, RASHI_NAMES_NE
from engine.vedic.names_ne import NAKSHATRA_NAMES_NE

NavataraTone = Literal["best", "good", "neutral", "bad", "worst"]

_NAVATARA_TYPES: list[dict[str, Any]] = [
    {"id": 1, "tara": "जन्म", "quality": "मध्यम", "tone": "neutral"},
    {"id": 2, "tara": "सम्पत्", "quality": "अति शुभ", "tone": "best"},
    {"id": 3, "tara": "विपत्", "quality": "अशुभ", "tone": "bad"},
    {"id": 4, "tara": "क्षेम", "quality": "अति शुभ", "tone": "best"},
    {"id": 5, "tara": "प्रत्यक्", "quality": "अशुभ", "tone": "bad"},
    {"id": 6, "tara": "साधना", "quality": "अति शुभ", "tone": "best"},
    {"id": 7, "tara": "निधन", "quality": "घातक", "tone": "worst"},
    {"id": 8, "tara": "मित्र", "quality": "शुभ", "tone": "good"},
    {"id": 9, "tara": "परम मित्र", "quality": "अति शुभ", "tone": "best"},
]


def _compute_navatara_number(moon_idx: int, target_idx: int, cycle_size: int) -> int:
    diff = (target_idx - moon_idx + cycle_size) % cycle_size
    if diff == 0:
        return 1
    return ((9 - (diff % 9)) % 9) + 1


def _navatara_meta(tara_num: int) -> dict[str, Any]:
    row = next((t for t in _NAVATARA_TYPES if t["id"] == tara_num), _NAVATARA_TYPES[0])
    return {
        "tara": row["tara"],
        "quality": row["quality"],
        "tone": row["tone"],
        "tara_num": tara_num,
    }


def _build_table(
    moon_idx: int,
    names_ne: list[str],
    names_en: list[str],
    cycle_size: int,
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for idx, name_ne in enumerate(names_ne):
        tara_num = _compute_navatara_number(moon_idx, idx, cycle_size)
        meta = _navatara_meta(tara_num)
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
    """Full 12-rashi navatara table from today's moon rashi."""
    moon_num = int(chandra_rashi["number"])
    moon_idx = moon_num - 1
    moon_label = chandra_rashi.get("name_ne") or RASHI_NAMES_NE[moon_idx]
    return {
        "moon_index": moon_idx,
        "moon_label": moon_label,
        "moon_label_en": chandra_rashi.get("name") or RASHI_NAMES[moon_idx],
        "rows": _build_table(moon_idx, RASHI_NAMES_NE, RASHI_NAMES, 12),
    }
