"""Chandrabalam, Tarabalam, Panchaka Rahita, and Udaya Lagna for daily Patro."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from core.positions import (
    NAKSHATRA_NAMES,
    RASHI_NAMES,
    RASHI_NAMES_NE,
    get_nakshatra,
)
from panchanga.ghati_time import time_from_sunrise
from panchanga.names_ne import NAKSHATRA_NAMES_NE
from panchanga.tithi import calculate_tithi

# Favorable janma-rashi offsets from moon rashi (Patro convention).
_CHANDRA_OFFSETS_CURRENT = (1, 2, 5, 6, 9, 11)
_CHANDRA_OFFSETS_NEXT = (0, 2, 3, 6, 7, 10)

# Favorable janma-nakshatra offsets from moon nakshatra (Patro convention).
_TARA_OFFSETS = (0, 2, 4, 6, 8, 10, 13, 15, 17, 19, 21, 24)

_PANCHAKA_BAD = {
    1: ("Mrityu Panchaka", "मृत्यु पञ्चक"),
    2: ("Agni Panchaka", "अग्नि पञ्चक"),
    4: ("Raja Panchaka", "राज पञ्चक"),
    6: ("Chora Panchaka", "चोर पञ्चक"),
    8: ("Roga Panchaka", "रोग पञ्चक"),
}
_PANCHAKA_GOOD = ("Shubha Muhurta", "शुभ मुहूर्त")


def _rashi_chip(rashi_index: int) -> dict[str, Any]:
    return {
        "number": rashi_index + 1,
        "name": RASHI_NAMES[rashi_index],
        "name_ne": RASHI_NAMES_NE[rashi_index],
    }


def _nak_chip(nak_index: int) -> dict[str, Any]:
    return {
        "number": nak_index + 1,
        "name": NAKSHATRA_NAMES[nak_index],
        "name_ne": NAKSHATRA_NAMES_NE[nak_index],
    }


def _time_fields(end_dt: datetime, sunrise_dt: datetime) -> dict[str, str]:
    info = time_from_sunrise(end_dt, sunrise_dt)
    return {
        "end_time": end_dt.isoformat(),
        "end_local_time": info["local_time"],
        "end_local_time_short": end_dt.strftime("%H:%M"),
        "end_hours_clock": info["hours_clock"],
        "end_ghati_clock": info["ghati_clock"],
    }


def build_chandrabalam(
    sunrise_dt: datetime,
    chandra_rashi_spans: list[dict[str, Any]],
) -> dict[str, Any]:
    """Shubha chandrabalam rashis for current and next moon-rashi periods."""
    if not chandra_rashi_spans:
        return {"till": None, "set1": [], "set2": []}

    current = chandra_rashi_spans[0]
    moon_idx = int(current["number"]) - 1
    set1 = [_rashi_chip((moon_idx + off) % 12) for off in _CHANDRA_OFFSETS_CURRENT]

    till: dict[str, str] | None = None
    if len(chandra_rashi_spans) > 1 and chandra_rashi_spans[0].get("end_time"):
        end_dt = datetime.fromisoformat(chandra_rashi_spans[0]["end_time"].replace("Z", "+00:00"))
        till = _time_fields(end_dt, sunrise_dt)
        next_idx = int(chandra_rashi_spans[1]["number"]) - 1
    else:
        next_idx = (moon_idx + 1) % 12

    set2 = [_rashi_chip((next_idx + off) % 12) for off in _CHANDRA_OFFSETS_NEXT]

    return {
        "till": till,
        "set1": set1,
        "set2": set2,
    }


def build_tarabalam(
    sunrise_dt: datetime,
    nakshatra_block: dict[str, Any],
) -> dict[str, Any]:
    """Shubha tarabalam nakshatras for current and next moon-nakshatra periods."""
    current_num = int(nakshatra_block["number"])
    current_idx = current_num - 1
    set1 = [_nak_chip((current_idx + off) % 27) for off in _TARA_OFFSETS]

    till: dict[str, str] | None = None
    next_num = nakshatra_block.get("next", {}).get("number")
    if nakshatra_block.get("end_time") and next_num:
        end_dt = datetime.fromisoformat(nakshatra_block["end_time"].replace("Z", "+00:00"))
        till = _time_fields(end_dt, sunrise_dt)
        next_idx = int(next_num) - 1
    else:
        next_idx = (current_idx + 1) % 27

    set2 = [_nak_chip((next_idx + off) % 27) for off in _TARA_OFFSETS]

    return {
        "till": till,
        "set1": set1,
        "set2": set2,
    }


def _panchaka_remainder(dt: datetime, lagna_num: int, vaara_num: int) -> int:
    tithi_num = int(calculate_tithi(dt)["number"])
    nak_num = int(get_nakshatra(dt)[0])
    vaara_panchaka = vaara_num + 1  # Sunday=1 … Saturday=7
    total = tithi_num + vaara_panchaka + nak_num + lagna_num
    return total % 9


def _segment_label(remainder: int) -> tuple[str, str, bool]:
    if remainder in _PANCHAKA_BAD:
        en, ne = _PANCHAKA_BAD[remainder]
        return en, ne, False
    en, ne = _PANCHAKA_GOOD
    return en, ne, True


def build_panchaka_rahita(
    sunrise_dt: datetime,
    lagna_spans: list[dict[str, Any]],
    vaara_num: int,
) -> list[dict[str, Any]]:
    """
    Panchaka rahita windows from lagna spans.

    Sum tithi + vaara + nakshatra + lagna (÷9); remainders 0/3/5/7 are auspicious.
    """
    if not lagna_spans:
        return []

    raw: list[dict[str, Any]] = []
    for span in lagna_spans:
        start_dt = datetime.fromisoformat(span["start_time"].replace("Z", "+00:00"))
        end_dt = datetime.fromisoformat(span["end_time"].replace("Z", "+00:00"))
        lagna_num = int(span["number"])
        remainder = _panchaka_remainder(start_dt, lagna_num, vaara_num)
        en, ne, good = _segment_label(remainder)
        start_info = time_from_sunrise(start_dt, sunrise_dt)
        end_info = time_from_sunrise(end_dt, sunrise_dt)
        raw.append(
            {
                "name": en,
                "name_ne": ne,
                "good": good,
                "remainder": remainder,
                "start_time": start_dt.isoformat(),
                "end_time": end_dt.isoformat(),
                "start_local_time": start_info["local_time"],
                "end_local_time": end_info["local_time"],
                "start_local_time_short": start_dt.strftime("%H:%M"),
                "end_local_time_short": end_dt.strftime("%H:%M"),
                "start_hours_clock": start_info["hours_clock"],
                "end_hours_clock": end_info["hours_clock"],
            }
        )

    merged: list[dict[str, Any]] = []
    for seg in raw:
        if merged and merged[-1]["good"] == seg["good"] and merged[-1]["name_ne"] == seg["name_ne"]:
            merged[-1]["end_time"] = seg["end_time"]
            merged[-1]["end_local_time"] = seg["end_local_time"]
            merged[-1]["end_local_time_short"] = seg["end_local_time_short"]
            merged[-1]["end_hours_clock"] = seg["end_hours_clock"]
        else:
            merged.append(dict(seg))

    return merged


def build_udaya_lagna(lagna_spans: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Udaya lagna rows (alias of lagna_spans with display-friendly fields)."""
    rows: list[dict[str, Any]] = []
    for span in lagna_spans:
        start_short = span.get("start_local_time", "")[:5]
        end_short = span.get("end_local_time", "")[:5]
        rows.append(
            {
                "number": span["number"],
                "name": span["name"],
                "name_ne": span["name_ne"],
                "start_time": span["start_time"],
                "end_time": span["end_time"],
                "start_local_time": span["start_local_time"],
                "end_local_time": span["end_local_time"],
                "start_local_time_short": start_short,
                "end_local_time_short": end_short,
                "start_hours_clock": span.get("start_hours_clock"),
                "end_hours_clock": span.get("end_hours_clock"),
                "pushkara_navamsha": span.get("pushkara_navamsha") or [],
            }
        )
    return rows
