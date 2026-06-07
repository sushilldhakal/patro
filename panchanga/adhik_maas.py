"""Adhik Maas detection and amavasya/purnima finding."""

from datetime import datetime
from typing import Optional

from core.swiss_eph import EphemerisError
from panchanga.sankranti import get_sun_rashi_at_time
from panchanga.tithi_boundaries import find_next_tithi, find_tithi_end


def find_purnima(after: datetime, max_days: int = 35) -> Optional[datetime]:
    shukla_15_start = find_next_tithi(15, "shukla", after, within_days=max_days)
    if shukla_15_start is None:
        return None
    return find_tithi_end(shukla_15_start)


def find_amavasya(after: datetime, max_days: int = 35) -> Optional[datetime]:
    krishna_15_start = find_next_tithi(15, "krishna", after, within_days=max_days)
    if krishna_15_start is None:
        return None
    return find_tithi_end(krishna_15_start)


def is_adhik_maas(lunar_month_start: datetime, lunar_month_end: datetime) -> bool:
    return get_sun_rashi_at_time(lunar_month_start) == get_sun_rashi_at_time(lunar_month_end)


def get_lunar_month_boundaries(after: datetime) -> tuple[datetime, datetime, datetime]:
    start = find_amavasya(after)
    if start is None:
        raise EphemerisError(f"Could not find Amavasya after {after}")
    purnima = find_purnima(start, max_days=20)
    if purnima is None:
        raise EphemerisError(f"Could not find Purnima after {start}")
    end = find_amavasya(purnima, max_days=20)
    if end is None:
        raise EphemerisError(f"Could not find ending Amavasya after {purnima}")
    return start, purnima, end
