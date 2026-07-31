"""Annual Panchak Patro — Moon transit through Dhanishta pada 3 … Revati."""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Any

from engine.astronomy.panchanga import NAKSHATRA_NAMES
from engine.astronomy.timescale import resolve_observer_timezone
from engine.astronomy.ut_instant import (
    LocalCivilFields,
    day_instant_utc,
    local_civil_fields,
    parse_ephemeris_instant,
)
from engine.vedic.bikram_sambat import gregorian_to_bs
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


def _format_clock_en_hm(hour: int, minute: int) -> str:
    h12 = hour % 12 or 12
    meridiem = "AM" if hour < 12 else "PM"
    return f"{h12}:{minute:02d} {meridiem}"


def _format_clock_ne_hm(hour: int, minute: int) -> str:
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


def _patro_date_for(fields: LocalCivilFields) -> tuple[int, int, int]:
    """BS/BBS triple for a local civil day, on either side of 1 CE."""
    if fields.year >= 1:
        return gregorian_to_bs(date(fields.year, fields.month, fields.day))
    from engine.astronomy.jd_calendar import CivilDay
    from engine.vedic.bikram_sambat import locate_patro_day_for_civil

    return locate_patro_day_for_civil(CivilDay(fields.year, fields.month, fields.day))


def _moment_stamp(fields: LocalCivilFields) -> dict[str, Any]:
    bs_y, bs_m, bs_d = _patro_date_for(fields)
    return {
        "iso": fields.iso(),
        "jd": fields.civil_day_jd,
        "bs_year": bs_y,
        "bs_month": bs_m,
        "bs_day": bs_d,
        "time_short": fields.time_short(),
        "time_en": _format_clock_en_hm(fields.hour, fields.minute),
        "time_ne": _format_clock_ne_hm(fields.hour, fields.minute),
    }


def _period_overlaps(
    start: LocalCivilFields, end: LocalCivilFields, year_start, year_end
) -> bool:
    """Day-granularity overlap, compared on the JD axis so BCE bounds work."""
    from engine.astronomy.jd_calendar import civil_day_jd_ut

    start_jd_bound = civil_day_jd_ut(year_start.year, year_start.month, year_start.day)
    end_jd_bound = civil_day_jd_ut(year_end.year, year_end.month, year_end.day)
    return start.civil_day_jd <= end_jd_bound and end.civil_day_jd >= start_jd_bound


def _find_next_panchak_start(after: datetime) -> datetime | None:
    """Next ingress into Dhanishta pada 3 after `after`."""
    cursor = after
    for _ in range(120):
        entry = find_next_pada_entry("moon", cursor)
        if entry is None:
            return None
        entry_dt = parse_ephemeris_instant(entry["entry_time_utc"])
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
        entry_dt = parse_ephemeris_instant(entry["entry_time_utc"])
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
        entry_dt = parse_ephemeris_instant(entry["entry_time_utc"])
        if entry_dt >= before:
            break
        if _flat_from_entry(entry) == _PANCHAK_START_FLAT:
            last_start = entry_dt
        cursor = entry_dt + timedelta(seconds=30)
    return last_start


def list_panchak_periods(
    year_start,
    year_end,
    *,
    timezone_name: str,
) -> list[tuple[datetime, datetime]]:
    """Raw UTC (start, end) pairs overlapping the inclusive civil span.

    Bounds accept ``date`` or ``CivilDay``; the scan below runs on instants, and
    ``UtInstant`` carries BCE ones through the same arithmetic and comparisons.
    """
    tz = resolve_observer_timezone(timezone_name)
    pad = timedelta(days=_SEARCH_PAD_DAYS)
    search_start = day_instant_utc(year_start) - pad
    search_end = day_instant_utc(year_end, hour=23, minute=59, second=59) + pad

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
        if _period_overlaps(
            local_civil_fields(start_utc, timezone_name),
            local_civil_fields(end_utc, timezone_name),
            year_start,
            year_end,
        ):
            filtered.append((start_utc, end_utc))
    return filtered


def _format_periods(
    periods: list[tuple[datetime, datetime]],
    *,
    timezone_name: str,
) -> list[dict[str, Any]]:
    formatted: list[dict[str, Any]] = []
    for start_utc, end_utc in periods:
        # Duration comes off the UTC instants — same elapsed time, and UtInstant
        # subtraction yields a timedelta just as datetime subtraction does.
        duration_en, duration_ne = _format_duration(start_utc, end_utc)
        formatted.append({
            "start": _moment_stamp(local_civil_fields(start_utc, timezone_name)),
            "end": _moment_stamp(local_civil_fields(end_utc, timezone_name)),
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
        **_year_range_jd_fields_panchak(year_start, year_end),
        "location": location.as_dict(),
        "count": len(periods),
        "periods": _format_periods(periods, timezone_name=location.timezone),
    }


def _year_range_jd_fields_panchak(year_start: date, year_end: date) -> dict[str, float]:
    from engine.astronomy.jd_calendar import civil_day_jd_from_date

    return {
        "range_start_jd": civil_day_jd_from_date(year_start),
        "range_end_jd": civil_day_jd_from_date(year_end),
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
