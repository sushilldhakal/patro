"""Tara-bala and Chandra-bala tables (navatara cycle from the Moon's position)."""

from __future__ import annotations

from typing import Any

from engine.astronomy.positions import NAKSHATRA_NAMES, RASHI_NAMES, RASHI_NAMES_NE
from engine.vedic.avakahada import NAVATARA_TYPES, navatara_number
from engine.vedic.names_ne import NAKSHATRA_NAMES_NE


def _rows(moon_idx: int, names_ne: list[str], names_en: list[str], cycle: int) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for idx in range(cycle):
        tara_num = navatara_number(moon_idx, idx, cycle)
        meta = NAVATARA_TYPES[tara_num - 1]
        rows.append(
            {
                "name": names_ne[idx],
                "nameEn": names_en[idx],
                "tara": meta["ne"],
                "taraEn": meta["en"],
                "quality": meta["quality_ne"],
                "tone": meta["tone"],
                "taraNum": tara_num,
            }
        )
    return rows


def build_navatara_block(
    moon_nakshatra_num: int | None,
    moon_rashi_num: int | None,
) -> dict[str, Any]:
    """ताराबल (27 nakshatras) + चन्द्रबल (12 rashis) tables from the day's Moon."""
    tarabala: dict[str, Any] = {"moonLabel": None, "rows": []}
    chandrabala: dict[str, Any] = {"moonLabel": None, "rows": []}

    if moon_nakshatra_num is not None and 1 <= moon_nakshatra_num <= 27:
        idx = moon_nakshatra_num - 1
        tarabala = {
            "moonLabel": NAKSHATRA_NAMES_NE[idx],
            "moonLabelEn": NAKSHATRA_NAMES[idx],
            "rows": _rows(idx, list(NAKSHATRA_NAMES_NE), list(NAKSHATRA_NAMES), 27),
        }

    if moon_rashi_num is not None and 1 <= moon_rashi_num <= 12:
        idx = moon_rashi_num - 1
        chandrabala = {
            "moonLabel": RASHI_NAMES_NE[idx],
            "moonLabelEn": RASHI_NAMES[idx],
            "rows": _rows(idx, list(RASHI_NAMES_NE), list(RASHI_NAMES), 12),
        }

    return {"tarabala": tarabala, "chandrabala": chandrabala}
