"""Bikram Sambat conversion — official lookup table with sankranti fallback."""

from __future__ import annotations

import json
from bisect import bisect_right
from datetime import date, datetime, timedelta, timezone
from functools import lru_cache
from pathlib import Path
from typing import Optional

from engine.astronomy.swiss_eph import calculate_sunrise
from engine.astronomy.timescale import to_nepal_time
from engine.vedic.constants import (
    BS_CALENDAR_DATA,
    BS_ESTIMATED_MIN_YEAR,
    BS_MAX_YEAR,
    BS_MIN_YEAR,
    BS_MONTH_NAMES,
    BS_MONTH_NAMES_NEPALI,
    BS_SUPPORTED_MAX_YEAR,
    get_bs_year_data,
)
from engine.vedic.sankranti import find_mesh_sankranti, find_sankranti

_OFFICIAL_YEAR_RANGES: tuple[tuple[date, date, int], ...] = tuple(
    (
        start_date,
        start_date + timedelta(days=sum(month_lengths)),
        year,
    )
    for year, (month_lengths, start_date) in sorted(BS_CALENDAR_DATA.items())
)
_OFFICIAL_YEAR_STARTS: tuple[date, ...] = tuple(row[0] for row in _OFFICIAL_YEAR_RANGES)

_MONTH_SEARCH_STARTS = [
    (4, 1), (5, 1), (6, 1), (7, 1), (8, 1), (9, 1),
    (10, 1), (11, 1), (12, 1), (1, 1), (2, 1), (3, 1),
]


def _gregorian_year_for_bs_month(bs_year: int, bs_month: int) -> int:
    return bs_year - 57 if bs_month <= 9 else bs_year - 56


@lru_cache(maxsize=1)
def _load_bs_overrides() -> dict:
    path = Path(__file__).resolve().parent / "bs_overrides.json"
    if not path.exists():
        return {"gregorian_to_bs": {}, "bs_to_gregorian": {}}
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    data.setdefault("gregorian_to_bs", {})
    data.setdefault("bs_to_gregorian", {})
    return data


def _get_bs_override_for_gregorian(gregorian_date: date) -> Optional[tuple[int, int, int]]:
    entry = _load_bs_overrides().get("gregorian_to_bs", {}).get(gregorian_date.isoformat())
    if not entry:
        return None
    return int(entry["year"]), int(entry["month"]), int(entry["day"])


def _get_gregorian_override_for_bs(year: int, month: int, day: int) -> Optional[date]:
    key = f"{year:04d}-{month:02d}-{day:02d}"
    entry = _load_bs_overrides().get("bs_to_gregorian", {}).get(key)
    if not entry:
        return None
    return date.fromisoformat(entry)


def _sankranti_start_date(sankranti_utc: datetime) -> date:
    """Nepal convention: month starts on sankranti day if before sunrise, else next day."""
    local = to_nepal_time(sankranti_utc)
    local_date = local.date()
    sunrise_utc = calculate_sunrise(local_date)
    sunrise_local = to_nepal_time(sunrise_utc)
    if local <= sunrise_local:
        return local_date
    return local_date + timedelta(days=1)


def is_valid_bs_date(year: int, month: int, day: int) -> bool:
    if year < BS_ESTIMATED_MIN_YEAR or year > BS_SUPPORTED_MAX_YEAR:
        return False
    if not 1 <= month <= 12 or day < 1:
        return False
    return day <= get_bs_month_length(year, month)


def get_bs_month_length(bs_year: int, bs_month: int) -> int:
    data = get_bs_year_data(bs_year)
    if data is not None:
        return data[0][bs_month - 1]
    start = _get_bs_month_start_estimated(bs_year, bs_month)
    if bs_month < 12:
        next_start = _get_bs_month_start_estimated(bs_year, bs_month + 1)
    else:
        next_start = _get_bs_month_start_estimated(bs_year + 1, 1)
    return (next_start - start).days


def _get_bs_month_start_official(bs_year: int, bs_month: int) -> date:
    data = get_bs_year_data(bs_year)
    if data is None:
        raise ValueError(f"BS year {bs_year} not in lookup table")
    month_lengths, year_start = data
    return year_start + timedelta(days=sum(month_lengths[: bs_month - 1]))


def _get_bs_month_start_estimated(bs_year: int, bs_month: int) -> date:
    greg_year = _gregorian_year_for_bs_month(bs_year, bs_month)
    greg_month, greg_day = _MONTH_SEARCH_STARTS[bs_month - 1]
    search_start = datetime(greg_year, greg_month, greg_day, tzinfo=timezone.utc)
    sankranti = find_sankranti(bs_month - 1, search_start - timedelta(days=15), max_days=45)
    if sankranti is None:
        raise ValueError(f"Could not find sankranti for BS {bs_year}/{bs_month}")
    return _sankranti_start_date(sankranti)


def get_bs_month_start(bs_year: int, bs_month: int) -> date:
    """Gregorian date when BS month begins."""
    if not 1 <= bs_month <= 12:
        raise ValueError("bs_month must be 1..12")
    if BS_MIN_YEAR <= bs_year <= BS_MAX_YEAR:
        return _get_bs_month_start_official(bs_year, bs_month)
    return _get_bs_month_start_estimated(bs_year, bs_month)


def iter_bs_month_days(bs_year: int, bs_month: int):
    """Yield (bs_day, gregorian_date) for each day in a BS month."""
    start = get_bs_month_start(bs_year, bs_month)
    length = get_bs_month_length(bs_year, bs_month)
    for offset in range(length):
        yield offset + 1, start + timedelta(days=offset)


def _gregorian_to_bs_official(gregorian_date: date) -> tuple[int, int, int]:
    range_index = bisect_right(_OFFICIAL_YEAR_STARTS, gregorian_date) - 1
    if range_index < 0:
        raise ValueError(f"Date {gregorian_date} is before official BS range")

    start_date, year_end_exclusive, bs_year = _OFFICIAL_YEAR_RANGES[range_index]
    if gregorian_date >= year_end_exclusive:
        raise ValueError(f"Date {gregorian_date} is outside official BS range")

    days_from_year_start = (gregorian_date - start_date).days
    month_lengths = BS_CALENDAR_DATA[bs_year][0]
    remaining_days = days_from_year_start

    for month_idx, month_len in enumerate(month_lengths):
        if remaining_days < month_len:
            return bs_year, month_idx + 1, remaining_days + 1
        remaining_days -= month_len

    raise ValueError(f"Failed to convert {gregorian_date} to Bikram Sambat")


def _gregorian_to_bs_estimated(gregorian_date: date) -> tuple[int, int, int]:
    mesh_dt = find_mesh_sankranti(gregorian_date.year)
    if mesh_dt is None:
        raise ValueError(f"Could not find Mesh Sankranti for {gregorian_date.year}")

    mesh_start = _sankranti_start_date(mesh_dt)
    if gregorian_date >= mesh_start:
        bs_year = gregorian_date.year + 57
    else:
        bs_year = gregorian_date.year + 56

    for bs_month in range(1, 13):
        month_start = _get_bs_month_start_estimated(bs_year, bs_month)
        month_len = get_bs_month_length(bs_year, bs_month)
        month_end = month_start + timedelta(days=month_len - 1)
        if month_start <= gregorian_date <= month_end:
            return bs_year, bs_month, (gregorian_date - month_start).days + 1

    raise ValueError(f"Could not map {gregorian_date} to Bikram Sambat")


def gregorian_to_bs(greg: date) -> tuple[int, int, int]:
    """Map a Gregorian date to (bs_year, bs_month, bs_day)."""
    override = _get_bs_override_for_gregorian(greg)
    if override is not None:
        return override
    try:
        return _gregorian_to_bs_official(greg)
    except ValueError:
        return _gregorian_to_bs_estimated(greg)


def _bs_to_gregorian_official(year: int, month: int, day: int) -> date:
    if not is_valid_bs_date(year, month, day):
        raise ValueError(f"Invalid BS date: {year}-{month:02d}-{day:02d}")
    month_lengths, year_start = get_bs_year_data(year)  # type: ignore[misc]
    return year_start + timedelta(days=sum(month_lengths[: month - 1]) + day - 1)


def _bs_to_gregorian_estimated(year: int, month: int, day: int) -> date:
    month_start = _get_bs_month_start_estimated(year, month)
    month_len = get_bs_month_length(year, month)
    if not 1 <= day <= month_len:
        raise ValueError(f"bs_day must be 1..{month_len} for BS {year}/{month}")
    return month_start + timedelta(days=day - 1)


def bs_to_gregorian(bs_year: int, bs_month: int, bs_day: int) -> date:
    """Convert Bikram Sambat (year, month, day) to Gregorian civil date."""
    override = _get_gregorian_override_for_bs(bs_year, bs_month, bs_day)
    if override is not None:
        return override
    if BS_MIN_YEAR <= bs_year <= BS_MAX_YEAR:
        return _bs_to_gregorian_official(bs_year, bs_month, bs_day)
    return _bs_to_gregorian_estimated(bs_year, bs_month, bs_day)


def bs_year_date_range(bs_year: int) -> tuple[date, date]:
    """Inclusive Gregorian range covered by a BS year."""
    start = get_bs_month_start(bs_year, 1)
    data = get_bs_year_data(bs_year)
    if data is not None:
        month_lengths, year_start = data
        end = year_start + timedelta(days=sum(month_lengths) - 1)
    else:
        end = get_bs_month_start(bs_year + 1, 1) - timedelta(days=1)
    return start, end


def bs_month_name(bs_month: int, nepali: bool = False) -> str:
    names = BS_MONTH_NAMES_NEPALI if nepali else BS_MONTH_NAMES
    return names[bs_month - 1]


def format_bs_date(bs_year: int, bs_month: int, bs_day: int) -> str:
    return f"{bs_year}-{bs_month:02d}-{bs_day:02d}"


def parse_bs_date(value: str) -> tuple[int, int, int]:
    parts = value.strip().split("-")
    if len(parts) != 3:
        raise ValueError(f"Invalid BS date: {value}")
    try:
        bs_year, bs_month, bs_day = (int(p) for p in parts)
    except ValueError as exc:
        raise ValueError(f"Invalid BS date: {value}") from exc
    return bs_year, bs_month, bs_day


def shaka_year(greg: date) -> int:
    return greg.year - 78 if greg.month >= 4 else greg.year - 79
