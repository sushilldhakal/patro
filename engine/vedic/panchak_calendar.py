"""Annual Panchak Patro — Moon transit through Dhanishta pada 3 … Revati."""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Any

from engine.astronomy.positions import NAKSHATRA_NAMES
from engine.astronomy.timescale import resolve_observer_timezone
from engine.vedic.bikram_sambat import format_bs_date, gregorian_to_bs
from engine.vedic.gochar import find_next_pada_entry, _pada_flat_for
from engine.vedic.graha_detail import _ad_year_range, _bs_year_range
from engine.vedic.names_ne import to_nepali_digits

# Dhanishta (index 22) pada 3 — start of Panchak zone.
_PANCHAK_START_FLAT = 22 * 4 + 2  # 90
# Ashwini pada 1 — Moon leaving Revati ends Panchak.
_PANCHAK_END_FLAT = 0
_SEARCH_PAD_DAYS = 7


def _flat_from_entry(entry: dict[str, Any]) -> int:
    nak_idx = NAKSHATRA_NAMES.index(entry["to_nakshatra"])
    return nak_idx * 4 + (int(entry["to_pada"]) - 1)


def _format_clock_en(local: datetime) -> str:
    return local.strftime("%I:%M %p").lstrip("0").replace(" 0", " ")


def _format_clock_ne(local: datetime) -> str:
    hour = local.hour
    minute = local.minute
    h12 = hour % 12 or 12
    meridiem = "अपराह्न" if hour >= 12 else "पूर्वाह्न"
    return f"{to_nepali_digits(h12)}:{to_nepali_digits(f'{minute:02d}')} {meridiem}"


def _format_duration(start: datetime, end: datetime) -> tuple[str, str]:
    total_seconds = max(0, (end - start).total_seconds())
    days = int(total_seconds // 86400)
    hours = int((total_seconds % 86400) // 3600)
    duration_en = f"{days} day{'s' if days != 1 else ''} {hours} hour{'s' if hours != 1 else ''}"
    day_ne = to_nepali_digits(days)
    hour_ne = to_nepali_digits(hours)
    duration_ne = f"{day_ne} दिन {hour_ne} घण्टा"
    return duration_en, duration_ne


def _moment_stamp(dt_local: datetime) -> dict[str, Any]:
    d = dt_local.date()
    bs_y, bs_m, bs_d = gregorian_to_bs(d)
    return {
        "iso": dt_local.isoformat(),
        "date_ad": d.isoformat(),
        "date_bs": format_bs_date(bs_y, bs_m, bs_d),
        "bs_year": bs_y,
        "bs_month": bs_m,
        "bs_day": bs_d,
        "time_short": dt_local.strftime("%H:%M"),
        "time_en": _format_clock_en(dt_local),
        "time_ne": _format_clock_ne(dt_local),
    }


def _period_overlaps(start_local: datetime, end_local: datetime, year_start: date, year_end: date) -> bool:
    return start_local.date() <= year_end and end_local.date() >= year_start


def _find_next_panchak_start(after: datetime) -> datetime | None:
    """Next ingress into Dhanishta pada 3 after `after`."""
    cursor = after
    for _ in range(120):
        entry = find_next_pada_entry("moon", cursor)
        if entry is None:
            return None
        entry_dt = datetime.fromisoformat(entry["entry_time_utc"])
        if _flat_from_entry(entry) == _PANCHAK_START_FLAT:
            return entry_dt
        cursor = entry_dt + timedelta(seconds=30)
    return None


def _find_next_panchak_end(after: datetime) -> datetime | None:
    """Next ingress into Ashwini pada 1 (Panchak end) after `after`."""
    cursor = after + timedelta(seconds=30)
    for _ in range(120):
        entry = find_next_pada_entry("moon", cursor)
        if entry is None:
            return None
        entry_dt = datetime.fromisoformat(entry["entry_time_utc"])
        if _flat_from_entry(entry) == _PANCHAK_END_FLAT:
            return entry_dt
        cursor = entry_dt + timedelta(seconds=30)
    return None


def _find_open_start(before: datetime) -> datetime | None:
    """Most recent Panchak start (Dhanishta pada 3 ingress) at or before `before`."""
    cursor = before - timedelta(days=_SEARCH_PAD_DAYS)
    last_start: datetime | None = None
    while cursor < before:
        entry = find_next_pada_entry("moon", cursor)
        if entry is None:
            break
        entry_dt = datetime.fromisoformat(entry["entry_time_utc"])
        if entry_dt >= before:
            break
        if _flat_from_entry(entry) == _PANCHAK_START_FLAT:
            last_start = entry_dt
        cursor = entry_dt + timedelta(seconds=30)
    return last_start


def list_panchak_periods(
    year_start: date,
    year_end: date,
    *,
    timezone_name: str,
) -> list[tuple[datetime, datetime]]:
    """Raw UTC (start, end) pairs overlapping the inclusive Gregorian span."""
    tz = resolve_observer_timezone(timezone_name)
    pad = timedelta(days=_SEARCH_PAD_DAYS)
    search_start = datetime(
        year_start.year, year_start.month, year_start.day, tzinfo=timezone.utc,
    ) - pad
    search_end = datetime(
        year_end.year, year_end.month, year_end.day, 23, 59, 59, tzinfo=timezone.utc,
    ) + pad

    cursor = search_start
    period_start: datetime | None = None
    if _pada_flat_for("moon", cursor) >= _PANCHAK_START_FLAT:
        period_start = _find_open_start(cursor)

    raw: list[tuple[datetime, datetime]] = []
    if period_start is not None:
        end_dt = _find_next_panchak_end(period_start)
        if end_dt is not None and end_dt <= search_end:
            raw.append((period_start, end_dt))
            cursor = end_dt + timedelta(seconds=30)

    while cursor < search_end:
        start_dt = _find_next_panchak_start(cursor)
        if start_dt is None or start_dt > search_end:
            break
        end_dt = _find_next_panchak_end(start_dt)
        if end_dt is None:
            break
        raw.append((start_dt, end_dt))
        cursor = end_dt + timedelta(seconds=30)

    filtered: list[tuple[datetime, datetime]] = []
    for start_utc, end_utc in raw:
        start_local = start_utc.astimezone(tz)
        end_local = end_utc.astimezone(tz)
        if _period_overlaps(start_local, end_local, year_start, year_end):
            filtered.append((start_utc, end_utc))
    return filtered


def _format_periods(
    periods: list[tuple[datetime, datetime]],
    *,
    timezone_name: str,
) -> list[dict[str, Any]]:
    tz = resolve_observer_timezone(timezone_name)
    formatted: list[dict[str, Any]] = []
    for start_utc, end_utc in periods:
        start_local = start_utc.astimezone(tz)
        end_local = end_utc.astimezone(tz)
        duration_en, duration_ne = _format_duration(start_local, end_local)
        formatted.append({
            "start": _moment_stamp(start_local),
            "end": _moment_stamp(end_local),
            "duration_en": duration_en,
            "duration_ne": duration_ne,
        })
    return formatted


def _build_for_range(
    year_start: date,
    year_end: date,
    location: Any,
) -> dict[str, Any]:
    periods = list_panchak_periods(
        year_start, year_end, timezone_name=location.timezone,
    )
    return {
        "gregorian_range": {"start": year_start.isoformat(), "end": year_end.isoformat()},
        "location": location.as_dict(),
        "count": len(periods),
        "periods": _format_periods(periods, timezone_name=location.timezone),
    }


def build_panchak_bs_year(bs_year: int, location: Any) -> dict[str, Any]:
    year_start, year_end = _bs_year_range(bs_year)
    payload = _build_for_range(year_start, year_end, location)
    payload["bs_year"] = bs_year
    payload["era"] = "bs"
    return payload


def build_panchak_ad_year(ad_year: int, location: Any) -> dict[str, Any]:
    year_start, year_end = _ad_year_range(ad_year)
    payload = _build_for_range(year_start, year_end, location)
    payload["ad_year"] = ad_year
    payload["era"] = "ad"
    return payload
