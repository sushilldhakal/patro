"""Lunar month windows and festival date lookup (Project Parva compatible)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from typing import Literal, Optional

from core.location import DEFAULT_LOCATION, ObserverLocation
from panchanga.adhik_maas import find_amavasya, find_purnima, is_adhik_maas
from panchanga.sankranti import BS_MONTH_NAMES, find_sankranti, get_sun_rashi_at_time
from panchanga.tithi import get_udaya_tithi
from panchanga.tithi_boundaries import find_next_tithi


@dataclass
class LunarMonth:
    start_amavasya: datetime
    end_purnima: datetime
    end_amavasya: datetime
    month_name: str
    month_index: int
    is_adhik: bool
    sun_rashi_at_purnima: int
    sankranti_date: Optional[datetime] = None

    @property
    def full_name(self) -> str:
        return f"Adhik {self.month_name}" if self.is_adhik else self.month_name


@dataclass
class LunarYear:
    gregorian_year: int
    bs_year: int
    months: list[LunarMonth]
    has_adhik: bool
    adhik_month_name: Optional[str] = None


def name_lunar_month(start_amavasya: datetime, end_amavasya: datetime) -> str:
    """Name a lunar month using Sun's rashi at the month's Purnima."""
    search_start = start_amavasya + timedelta(days=2)
    purnima = find_purnima(search_start)
    if purnima is None or purnima >= end_amavasya:
        midpoint = start_amavasya + (end_amavasya - start_amavasya) / 2
        purnima = find_purnima(midpoint - timedelta(days=3)) or midpoint

    sun_rashi = get_sun_rashi_at_time(purnima)
    return BS_MONTH_NAMES[sun_rashi]


def compute_lunar_month(start_amavasya: datetime) -> LunarMonth:
    purnima = find_purnima(start_amavasya + timedelta(days=2))
    if purnima is None:
        raise ValueError(f"Could not find Purnima after {start_amavasya}")

    next_amavasya = find_amavasya(purnima + timedelta(days=2))
    if next_amavasya is None:
        raise ValueError(f"Could not find Amavasya after {purnima}")

    sun_rashi = get_sun_rashi_at_time(purnima)
    month_name = name_lunar_month(start_amavasya, next_amavasya)
    is_adhik = is_adhik_maas(start_amavasya, next_amavasya)

    sankranti = None
    for target_rashi in range(12):
        candidate = find_sankranti(target_rashi, start_amavasya, max_days=35)
        if candidate and start_amavasya <= candidate < next_amavasya:
            sankranti = candidate
            break

    return LunarMonth(
        start_amavasya=start_amavasya,
        end_purnima=purnima,
        end_amavasya=next_amavasya,
        month_name=month_name,
        month_index=(sun_rashi + 1) if sun_rashi < 12 else 1,
        is_adhik=is_adhik,
        sun_rashi_at_purnima=sun_rashi,
        sankranti_date=sankranti,
    )


def build_lunar_year(gregorian_year: int) -> LunarYear:
    search_start = datetime(gregorian_year, 2, 15, tzinfo=timezone.utc)
    first_amavasya = find_amavasya(search_start)
    if first_amavasya is None:
        raise ValueError(f"Could not find starting Amavasya for {gregorian_year}")

    months: list[LunarMonth] = []
    current_amavasya = first_amavasya
    for _ in range(14):
        try:
            month = compute_lunar_month(current_amavasya)
            months.append(month)
            current_amavasya = month.end_amavasya
            if current_amavasya.year > gregorian_year + 1:
                break
        except ValueError:
            break

    has_adhik = any(m.is_adhik for m in months)
    adhik_name = next((m.month_name for m in months if m.is_adhik), None)
    bs_year = gregorian_year + 56 if first_amavasya.month < 4 else gregorian_year + 57

    return LunarYear(
        gregorian_year=gregorian_year,
        bs_year=bs_year,
        months=months,
        has_adhik=has_adhik,
        adhik_month_name=adhik_name,
    )


_lunar_year_cache: dict[int, LunarYear] = {}


def get_lunar_year(gregorian_year: int) -> LunarYear:
    if gregorian_year not in _lunar_year_cache:
        _lunar_year_cache[gregorian_year] = build_lunar_year(gregorian_year)
    return _lunar_year_cache[gregorian_year]


def get_lunar_month_for_date(target: date) -> dict:
    """Return lunar month identity for a Gregorian civil date."""
    check = datetime.combine(target, datetime.min.time().replace(hour=12), tzinfo=timezone.utc)
    for gregorian_year in (target.year - 1, target.year, target.year + 1):
        lunar_year = get_lunar_year(gregorian_year)
        for month in lunar_year.months:
            if month.start_amavasya <= check < month.end_amavasya:
                return {
                    "name": month.month_name,
                    "full_name": month.full_name,
                    "is_adhik": month.is_adhik,
                    "type": "adhik" if month.is_adhik else "nija",
                    "paksha_model": "amanta",
                }
    return {"name": None, "full_name": None, "is_adhik": False, "type": "unknown"}


def find_festival_in_lunar_month(
    lunar_month_name: str,
    tithi: int,
    paksha: str,
    gregorian_year: int,
    adhik_policy: Literal["skip", "use_adhik", "both"] = "skip",
    date_selection: Literal["udaya", "boundary"] = "udaya",
    location: ObserverLocation = DEFAULT_LOCATION,
) -> Optional[date]:
    candidates: list[tuple[date, bool]] = []

    for search_year in (gregorian_year - 1, gregorian_year):
        lunar_year = get_lunar_year(search_year)
        matching_months = [m for m in lunar_year.months if m.month_name == lunar_month_name]

        for month in matching_months:
            if adhik_policy == "skip" and month.is_adhik:
                continue
            if adhik_policy == "use_adhik" and not month.is_adhik:
                if any(m.is_adhik for m in matching_months):
                    continue

            if date_selection == "boundary":
                boundary = _boundary_tithi_date_in_month(month, tithi, paksha)
                if boundary:
                    candidates.append((boundary, False))
                continue

            exact = _search_tithi_in_month(month, tithi, paksha, location)
            if exact:
                candidates.append((exact, True))
                continue

            boundary = _boundary_tithi_date_in_month(month, tithi, paksha)
            if boundary:
                candidates.append((boundary, False))

    if not candidates:
        return None

    def _rank(item: tuple[date, bool]) -> tuple[int, int, int, int, date]:
        result_date, exact = item
        return (
            0 if result_date.year == gregorian_year else 1,
            abs(result_date.year - gregorian_year),
            0 if result_date.year >= gregorian_year else 1,
            0 if exact else 1,
            result_date,
        )

    return min(candidates, key=_rank)[0]


def _boundary_tithi_date_in_month(month: LunarMonth, tithi: int, paksha: str) -> Optional[date]:
    search_start = month.start_amavasya if paksha == "shukla" else month.end_purnima
    search_end = month.end_amavasya
    tithi_datetime = find_next_tithi(tithi, paksha, search_start, within_days=35)
    if tithi_datetime is None:
        return None
    if paksha == "krishna" and tithi == 15:
        if not (search_start <= tithi_datetime <= month.end_amavasya + timedelta(hours=24)):
            return None
    elif not (search_start <= tithi_datetime < search_end):
        return None
    return tithi_datetime.date()


def _search_tithi_in_month(
    month: LunarMonth,
    tithi: int,
    paksha: str,
    location: ObserverLocation = DEFAULT_LOCATION,
) -> Optional[date]:
    candidate_date = _boundary_tithi_date_in_month(month, tithi, paksha)
    if candidate_date is None:
        return None

    for offset in range(5):
        check_date = candidate_date + timedelta(days=offset - 1)
        try:
            udaya = get_udaya_tithi(check_date, location)
            if udaya["tithi"] == tithi and udaya["paksha"] == paksha:
                return check_date
        except (RuntimeError, TypeError, ValueError):
            continue
    return None
