"""Adhik (Mala) Maas detection, and Amavasya/Purnima boundary helpers.

Adhik Maas (also called Mala Maas or Purushottam Maas) is the intercalary
extra lunar month that occurs when NO Sankranti (solar ingress to a new
rashi) falls within a lunar month. This happens roughly every 32–33 months
to reconcile the lunar and solar years.

Contrast with Kshaya Maas (panchanga/kshaya_maas.py) which is the opposite
phenomenon — a month containing TWO Sankrantis, occurring ~once per century.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional

from engine.astronomy.swiss_eph import EphemerisError
from engine.vedic.sankranti import get_sun_rashi_at_time
from engine.vedic.tithi_boundaries import find_next_tithi, find_tithi_end


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
    """Return True when no Sankranti falls within this lunar month (Mala/Adhik Maas)."""
    return get_sun_rashi_at_time(lunar_month_start) == get_sun_rashi_at_time(lunar_month_end)


# Alias used in some Hindu texts
is_mala_maas = is_adhik_maas


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


def find_adhik_maas_for_gregorian_year(gregorian_year: int) -> Optional[dict]:
    """Return Adhik (Mala) Maas metadata for the given Gregorian year, or None.

    Searches the lunar months that overlap the calendar year and returns
    metadata for the first Adhik month found whose Amavasya boundaries
    fall within or near the year.
    """
    from engine.vedic.lunar_month import get_lunar_year

    lunar_year = get_lunar_year(gregorian_year)
    adhik_months = [m for m in lunar_year.months if m.is_adhik]
    if not adhik_months:
        return None

    m = adhik_months[0]
    start_date = m.start_amavasya.date()
    end_date = (m.end_amavasya - timedelta(days=1)).date()
    purnima_date = m.end_purnima.date()

    return {
        "has_adhik_maas": True,
        "month_name": m.month_name,
        "full_name_en": f"Adhik {m.month_name}",
        "full_name_ne": f"अधिक {m.month_name}",
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "purnima_date": purnima_date.isoformat(),
        "note": (
            "Mala Maas / Adhik Maas / Purushottam Maas — "
            "no Sankranti (solar ingress) occurs within this lunar month"
        ),
    }
