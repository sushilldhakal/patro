"""Bikram Sambat month boundaries via sankranti (computed, no lookup table)."""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

from core.time_utils import to_nepal_time
from panchanga.sankranti import BS_MONTH_NAMES, find_sankranti

BS_MONTH_NAMES_NEPALI = [
    "वैशाख", "जेठ", "असार", "साउन", "भदौ", "असोज",
    "कात्तिक", "मङ्सिर", "पुस", "माघ", "फागुन", "चैत",
]

_MONTH_SEARCH_STARTS = [
    (4, 1), (5, 1), (6, 1), (7, 1), (8, 1), (9, 1),
    (10, 1), (11, 1), (12, 1), (1, 1), (2, 1), (3, 1),
]


def _gregorian_year_for_bs_month(bs_year: int, bs_month: int) -> int:
    return bs_year - 57 if bs_month <= 9 else bs_year - 56


def get_bs_month_start(bs_year: int, bs_month: int) -> date:
    """Gregorian date when BS month begins (sankranti day, Nepal civil date)."""
    if not 1 <= bs_month <= 12:
        raise ValueError("bs_month must be 1..12")

    greg_year = _gregorian_year_for_bs_month(bs_year, bs_month)
    greg_month, greg_day = _MONTH_SEARCH_STARTS[bs_month - 1]
    search_start = datetime(greg_year, greg_month, greg_day, tzinfo=timezone.utc)
    target_rashi = bs_month - 1

    sankranti = find_sankranti(target_rashi, search_start - timedelta(days=15), max_days=45)
    if sankranti is None:
        raise ValueError(f"Could not find sankranti for BS {bs_year}/{bs_month}")

    return to_nepal_time(sankranti).date()


def get_bs_month_length(bs_year: int, bs_month: int) -> int:
    start = get_bs_month_start(bs_year, bs_month)
    if bs_month < 12:
        next_start = get_bs_month_start(bs_year, bs_month + 1)
    else:
        next_start = get_bs_month_start(bs_year + 1, 1)
    return (next_start - start).days


def iter_bs_month_days(bs_year: int, bs_month: int):
    """Yield (bs_day, gregorian_date) for each day in a BS month."""
    start = get_bs_month_start(bs_year, bs_month)
    length = get_bs_month_length(bs_year, bs_month)
    for offset in range(length):
        greg = start + timedelta(days=offset)
        yield offset + 1, greg


def gregorian_to_bs(greg: date) -> tuple[int, int, int]:
    """Map a Gregorian date to (bs_year, bs_month, bs_day) via month boundaries."""
    for bs_year in range(greg.year + 55, greg.year + 59):
        for bs_month in range(1, 13):
            month_start = get_bs_month_start(bs_year, bs_month)
            month_len = get_bs_month_length(bs_year, bs_month)
            month_end = month_start + timedelta(days=month_len - 1)
            if month_start <= greg <= month_end:
                return bs_year, bs_month, (greg - month_start).days + 1
    raise ValueError(f"Could not map {greg} to Bikram Sambat")


def bs_year_date_range(bs_year: int) -> tuple[date, date]:
    """Inclusive Gregorian range covered by a BS year."""
    start = get_bs_month_start(bs_year, 1)
    end = get_bs_month_start(bs_year + 1, 1) - timedelta(days=1)
    return start, end


def bs_month_name(bs_month: int, nepali: bool = False) -> str:
    names = BS_MONTH_NAMES_NEPALI if nepali else BS_MONTH_NAMES
    return names[bs_month - 1]
