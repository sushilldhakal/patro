"""Kshaya Maas (lost/shrunk month) detection.

A Kshaya month occurs when TWO solar Sankrantis fall within a single
amanta lunar month (Aausi to next Aausi). Astronomically this happens
when the lunar month is shorter than a solar transit through one rashi.

Extremely rare — the last one was in BS 2039 (Jan–Feb 1983 CE, Poush–Magha
dropped); the next is due in 2124 CE (Poush again). It only happens in the
perihelion months Kartik, Margashirsha and Pausha, when the Sun runs fastest.
Each Kshaya year is flanked by two Adhik months (BS 2039: Adhik Ashwin before,
Adhik Phalgun after).

Mala Maas (impure month) is another name for Adhik Maas (extra month),
NOT Kshaya Maas. They are opposite phenomena: Adhik = one lunar month
with zero sankrantis; Kshaya = one lunar month with two sankrantis.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional

from engine.calendar.constants import BS_MONTH_NAMES
from engine.calendar.sankranti import RASHI_NAMES, find_sankranti, get_sun_rashi_at_time
from engine.panchanga.names_ne import lunar_masa_name_ne


def count_sankrantis_in_period(start: datetime, end: datetime) -> list[int]:
    """Return rashi indices for each Sankranti that occurs in the half-open [start, end) window."""
    sankrantis: list[int] = []
    seen_rashis: set[int] = set()
    check = start + timedelta(hours=6)

    while check < end:
        rashi = get_sun_rashi_at_time(check)
        next_rashi = (rashi + 1) % 12
        if next_rashi in seen_rashis:
            break
        candidate = find_sankranti(next_rashi, check, max_days=35)
        if candidate is None or candidate >= end:
            break
        sankrantis.append(next_rashi)
        seen_rashis.add(next_rashi)
        check = candidate + timedelta(hours=1)

    return sankrantis


def is_kshaya_maas(lunar_month_start: datetime, lunar_month_end: datetime) -> bool:
    """Return True if two or more Sankrantis fall within this lunar month."""
    return len(count_sankrantis_in_period(lunar_month_start, lunar_month_end)) >= 2


def get_kshaya_maas_info(
    lunar_month_start: datetime,
    lunar_month_end: datetime,
) -> Optional[dict]:
    """Return Kshaya Maas metadata dict, or None if this is not a Kshaya month.

    In a Kshaya year, the lost month is flanked by two Adhik months in the
    same or adjacent lunar year to keep the calendar in solar sync.
    """
    sankrantis = count_sankrantis_in_period(lunar_month_start, lunar_month_end)
    if len(sankrantis) < 2:
        return None
    # The month is named for the rashi the Sun holds when it opens; the next
    # name in the sequence is the one that gets dropped (Poush–Magha in 1983).
    kept = BS_MONTH_NAMES[(sankrantis[0] - 1) % 12]
    dropped = BS_MONTH_NAMES[sankrantis[0] % 12]
    return {
        "is_kshaya": True,
        "month_name": kept,
        "dropped_month_name": dropped,
        "full_name_en": f"{kept}–{dropped} Kshaya",
        "full_name_ne": (
            f"{lunar_masa_name_ne(kept)}–{lunar_masa_name_ne(dropped)} क्षय"
        ),
        "first_sankranti_rashi": sankrantis[0],
        "second_sankranti_rashi": sankrantis[1],
        "first_rashi_name": RASHI_NAMES[sankrantis[0]],
        "second_rashi_name": RASHI_NAMES[sankrantis[1]],
        "description": (
            f"Kshaya Maas: Sun enters {RASHI_NAMES[sankrantis[0]]} and "
            f"{RASHI_NAMES[sankrantis[1]]} within this single lunar month"
        ),
    }
