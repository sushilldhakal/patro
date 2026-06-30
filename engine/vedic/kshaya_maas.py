"""Kshaya Maas (lost/shrunk month) detection.

A Kshaya month occurs when TWO solar Sankrantis fall within a single
amanta lunar month (Amavasya to next Amavasya). Astronomically this happens
when the lunar month is shorter than a solar transit through one rashi.

Extremely rare — last occurred in BS 2020 (1963 CE Kartik/Mangsir); the
next is predicted around BS 2198 (2141 CE). Included for historical
accuracy and completeness.

Mala Maas (impure month) is another name for Adhik Maas (extra month),
NOT Kshaya Maas. They are opposite phenomena: Adhik = one lunar month
with zero sankrantis; Kshaya = one lunar month with two sankrantis.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional

from engine.vedic.sankranti import RASHI_NAMES, find_sankranti, get_sun_rashi_at_time


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
    return {
        "is_kshaya": True,
        "first_sankranti_rashi": sankrantis[0],
        "second_sankranti_rashi": sankrantis[1],
        "first_rashi_name": RASHI_NAMES[sankrantis[0]],
        "second_rashi_name": RASHI_NAMES[sankrantis[1]],
        "description": (
            f"Kshaya Maas: Sun enters {RASHI_NAMES[sankrantis[0]]} and "
            f"{RASHI_NAMES[sankrantis[1]]} within this single lunar month"
        ),
    }
