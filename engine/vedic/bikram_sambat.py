"""Bikram Sambat conversion — official lookup table with sankranti fallback."""

from __future__ import annotations

import json
from bisect import bisect_right
from datetime import date, datetime, timedelta, timezone
from functools import lru_cache
from pathlib import Path
from typing import Optional

import swisseph as swe

from engine.astronomy.jd_calendar import CivilDay, date_if_supported, format_civil_iso
from engine.astronomy.sun import calculate_sunrise
from engine.astronomy.timescale import to_nepal_time
from engine.vedic.constants import (
    BS_CALENDAR_DATA,
    BS_CALENDAR_MIN_YEAR,
    BS_ESTIMATED_MIN_YEAR,
    BS_MAX_YEAR,
    BS_MIN_YEAR,
    BS_MONTH_NAMES,
    BS_MONTH_NAMES_NEPALI,
    BS_PANCHANGA_MIN_YEAR,
    BS_SUPPORTED_MAX_YEAR,
    get_bs_year_data,
)
from engine.vedic.sankranti import find_mesh_sankranti

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
    """Civil (proleptic Gregorian, astronomical) year holding this BS/BBS month.

    The signed axis has **no year 0**: BS 1 (57 BCE) is immediately preceded by
    BBS 1 (58 BCE), i.e. signed −1. A single uniform offset would implicitly
    reserve a slot for signed 0 and leave civil −57 / 58 BCE unreachable, which
    is exactly what happened — every BBS year came out one year too early
    (BBS 1 landed on 59 BCE). Negative years therefore shift up by one.
    """
    offset = 57 if bs_year >= 1 else 56
    return bs_year - offset if bs_month <= 9 else bs_year - offset + 1


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


def _sankranti_start_date(sankranti_utc):
    """Nepal convention: month starts on sankranti day if before sunrise, else next day.

    Returns a ``date`` for CE sankrantis and a ``CivilDay`` for pre-1 CE ones,
    where the instant arrives as a ``UtInstant`` that has no ``.date()``.
    """
    from engine.astronomy.ut_instant import UtInstant

    if not isinstance(sankranti_utc, UtInstant):
        local = to_nepal_time(sankranti_utc)
        local_date = local.date()
        sunrise_utc = calculate_sunrise(local_date)
        sunrise_local = to_nepal_time(sunrise_utc)
        if local <= sunrise_local:
            return local_date
        return local_date + timedelta(days=1)

    from engine.astronomy.jd_calendar import CivilDay
    from engine.astronomy.ut_instant import local_civil_fields

    fields = local_civil_fields(sankranti_utc, "Asia/Kathmandu")
    civil = CivilDay(fields.year, fields.month, fields.day)
    # Compare the UTC instants directly — equivalent to comparing both in local
    # time, and avoids needing a local-time object we cannot build here.
    if sankranti_utc <= calculate_sunrise(civil):
        return civil
    return civil + timedelta(days=1)


def is_valid_bs_date(year: int, month: int, day: int) -> bool:
    from engine.vedic.patro_year_axis import (
        PATRO_SIGNED_YEAR_MIN,
        PATRO_SIGNED_YEAR_MAX,
        validate_patro_signed_year,
    )

    try:
        validate_patro_signed_year(year)
    except ValueError:
        return False
    if year < PATRO_SIGNED_YEAR_MIN or year > PATRO_SIGNED_YEAR_MAX:
        return False
    if not 1 <= month <= 12 or day < 1:
        return False
    return day <= get_bs_month_length(year, month)


def get_bs_month_length(bs_year: int, bs_month: int) -> int:
    data = get_bs_year_data(bs_year)
    if data is not None:
        return data[0][bs_month - 1]
    start = get_bs_month_start_civil(bs_year, bs_month)
    if bs_month < 12:
        next_start = get_bs_month_start_civil(bs_year, bs_month + 1)
    else:
        next_start = get_bs_month_start_civil(bs_year + 1, 1)
    return int(round(next_start.to_jd_ut() - start.to_jd_ut()))


def _get_bs_month_start_official(bs_year: int, bs_month: int) -> date:
    data = get_bs_year_data(bs_year)
    if data is None:
        raise ValueError(f"BS year {bs_year} not in lookup table")
    month_lengths, year_start = data
    return year_start + timedelta(days=sum(month_lengths[: bs_month - 1]))


def _get_bs_month_start_estimated(bs_year: int, bs_month: int) -> date:
    civil = _get_bs_month_start_civil(bs_year, bs_month)
    d = date_if_supported(civil.year, civil.month, civil.day)
    if d is None:
        raise ValueError(
            f"BS {bs_year}/{bs_month} begins at {format_civil_iso(civil.year, civil.month, civil.day)} "
            f"(before 1 CE); use civil/JD APIs — full panchanga from BS {BS_PANCHANGA_MIN_YEAR}+"
        )
    return d


@lru_cache(maxsize=16384)
def _get_bs_month_start_civil(bs_year: int, bs_month: int) -> CivilDay:
    # Pure function of (year, month) — the sankranti instant that opens a BS
    # month never changes. Locating one civil day probes up to ~50 month starts
    # (month scan + get_bs_month_length's lookahead), so this is the difference
    # between one solve per month and one per probe.
    from engine.astronomy.jd_calendar import civil_day_jd_ut
    from engine.astronomy.engine import default_engine
    from engine.vedic.sankranti import find_sankranti_after_jd

    greg_year = _gregorian_year_for_bs_month(bs_year, bs_month)
    greg_month, greg_day = _MONTH_SEARCH_STARTS[bs_month - 1]
    search_jd = civil_day_jd_ut(greg_year, greg_month, greg_day) - 15.0
    sankranti_jd = find_sankranti_after_jd(bs_month - 1, search_jd, max_days=45)
    if sankranti_jd is None:
        raise ValueError(f"Could not find sankranti for BS {bs_year}/{bs_month}")

    y, m, d, _hour = swe.revjul(sankranti_jd)
    if int(y) >= 1:
        sankranti = default_engine.datetime_from_jd(sankranti_jd)
        start = _sankranti_start_date(sankranti)
        return CivilDay.from_date(start)
    return CivilDay(int(y), int(m), int(d))


def get_bs_month_start_civil(bs_year: int, bs_month: int) -> CivilDay:
    """Civil (proleptic Gregorian) label when a BS month begins — includes BCE."""
    if not 1 <= bs_month <= 12:
        raise ValueError("bs_month must be 1..12")
    if BS_MIN_YEAR <= bs_year <= BS_MAX_YEAR:
        return CivilDay.from_date(_get_bs_month_start_official(bs_year, bs_month))
    return _get_bs_month_start_civil(bs_year, bs_month)


def get_bs_month_start(bs_year: int, bs_month: int):
    """Civil day a BS month begins — ``date`` when CE, ``CivilDay`` when BCE.

    Used to raise for pre-1 CE months, which is what walled off the month/day/year
    endpoints for BS < 60. ``CivilDay`` carries the same year/month/day plus
    ``date``-compatible ordering and day arithmetic, so day-walking callers keep
    working; only code that hands the value to ``datetime(...)`` needs
    ``day_instant_utc``. CE returns the identical ``date`` as before.
    """
    if not 1 <= bs_month <= 12:
        raise ValueError("bs_month must be 1..12")
    if BS_MIN_YEAR <= bs_year <= BS_MAX_YEAR:
        return _get_bs_month_start_official(bs_year, bs_month)
    civil = _get_bs_month_start_civil(bs_year, bs_month)
    supported = date_if_supported(civil.year, civil.month, civil.day)
    return supported if supported is not None else civil


def iter_bs_month_days(bs_year: int, bs_month: int):
    """Yield ``(bs_day, civil_day)`` for each day in a BS month.

    ``civil_day`` is a ``date`` for CE days and a ``CivilDay`` for pre-1 CE ones,
    rather than raising as it used to — see :func:`get_bs_month_start`.
    """
    from engine.astronomy.jd_calendar import CivilDay, civil_day_add, date_if_supported

    start_c = get_bs_month_start_civil(bs_year, bs_month)
    length = get_bs_month_length(bs_year, bs_month)
    jd = start_c.to_jd_ut()
    for offset in range(length):
        civil = CivilDay.from_jd_ut(civil_day_add(jd, offset))
        greg = date_if_supported(civil.year, civil.month, civil.day)
        yield offset + 1, (greg if greg is not None else civil)


def iter_bs_month_civil_days(bs_year: int, bs_month: int):
    """Yield (bs_day, civil_iso) for every day — BCE-safe."""
    from engine.astronomy.jd_calendar import CivilDay, civil_day_add, format_civil_iso

    start_c = get_bs_month_start_civil(bs_year, bs_month)
    length = get_bs_month_length(bs_year, bs_month)
    jd = start_c.to_jd_ut()
    for offset in range(length):
        civil = CivilDay.from_jd_ut(civil_day_add(jd, offset))
        yield offset + 1, format_civil_iso(civil.year, civil.month, civil.day)


@lru_cache(maxsize=4096)
def _patro_year_start_jd(signed: int) -> float:
    # A year start is a fixed astronomical constant, but resolving one costs a
    # sankranti solve. The year-locating search below probes ~15 of them per
    # call, so without this every BCE day request re-solved the same handful.
    from engine.vedic.patro_year_axis import validate_patro_signed_year

    validate_patro_signed_year(signed)
    return get_bs_month_start_civil(signed, 1).to_jd_ut()


def _signed_to_index(signed: int) -> int:
    """Signed patro year → gap-free index (the axis has no year 0)."""
    return signed if signed < 0 else signed - 1


def _index_to_signed(index: int) -> int:
    return index if index < 0 else index + 1


def bs_year_civil_range(bs_year: int) -> tuple[CivilDay, CivilDay]:
    """Inclusive civil span for a signed BS/BBS year (BCE-safe)."""
    start_c = get_bs_month_start_civil(bs_year, 1)
    start_jd_12 = get_bs_month_start_civil(bs_year, 12).to_jd_ut()
    end_jd = start_jd_12 + get_bs_month_length(bs_year, 12) - 1
    end_c = CivilDay.from_jd_ut(end_jd)
    return start_c, end_c


def locate_patro_day_for_civil(civil: CivilDay) -> tuple[int, int, int]:
    """Map a civil day to (signed patro year, bs_month, bs_day) on the BS/BBS axis."""
    from engine.vedic.patro_year_axis import PATRO_SIGNED_YEAR_MAX, PATRO_SIGNED_YEAR_MIN

    jd = civil.to_jd_ut()
    greg = date_if_supported(civil.year, civil.month, civil.day)
    if greg is not None:
        try:
            return gregorian_to_bs(greg)
        except ValueError:
            pass

    # Last year whose start is at or before ``jd``. Searched on the gap-free
    # index so year 0 never has to be special-cased mid-loop, and with a *ceiling*
    # midpoint because this is a "find last true" search: with the floor midpoint
    # the state (lo, lo+1) picked mid == lo, so the `lo = mid` branch made no
    # progress and the loop spun forever (BS 21 and BS 59 both hung a worker).
    lo = _signed_to_index(PATRO_SIGNED_YEAR_MIN)
    hi = _signed_to_index(PATRO_SIGNED_YEAR_MAX)
    while lo < hi:
        mid = (lo + hi + 1) // 2
        if _patro_year_start_jd(_index_to_signed(mid)) <= jd:
            lo = mid
        else:
            hi = mid - 1
    start_year = _index_to_signed(lo)

    for signed in (start_year, _index_to_signed(lo + 1)):
        if signed == 0 or signed < PATRO_SIGNED_YEAR_MIN or signed > PATRO_SIGNED_YEAR_MAX:
            continue
        for bs_month in range(1, 13):
            start_jd = get_bs_month_start_civil(signed, bs_month).to_jd_ut()
            length = get_bs_month_length(signed, bs_month)
            if start_jd <= jd < start_jd + length:
                return signed, bs_month, int(jd - start_jd) + 1

    raise ValueError(f"Civil day {civil} is outside patro axis {PATRO_SIGNED_YEAR_MIN}..{PATRO_SIGNED_YEAR_MAX}")


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
        # ``get_bs_month_start`` (not ``_estimated``) so a BCE month start comes
        # back as a CivilDay instead of raising; it compares and subtracts against
        # a ``date`` the same way.
        month_start = get_bs_month_start(bs_year, bs_month)
        month_len = get_bs_month_length(bs_year, bs_month)
        month_end = month_start + timedelta(days=month_len - 1)
        if month_start <= gregorian_date <= month_end:
            return bs_year, bs_month, (gregorian_date - month_start).days + 1

    raise ValueError(f"Could not map {gregorian_date} to Bikram Sambat")


def gregorian_to_bs(greg) -> tuple[int, int, int]:
    """Map a civil day to (bs_year, bs_month, bs_day) — accepts ``date`` or ``CivilDay``.

    A pre-1 CE day goes straight to :func:`locate_patro_day_for_civil`, whose
    JD-axis search handles the signed BS/BBS axis. The ``year + 57/56`` guess in
    ``_gregorian_to_bs_estimated`` assumes the CE offset and cannot place BCE days.
    """
    from engine.astronomy.jd_calendar import CivilDay

    if not isinstance(greg, date):
        return locate_patro_day_for_civil(CivilDay(greg.year, greg.month, greg.day))
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


def _bs_to_gregorian_estimated(year: int, month: int, day: int):
    # ``get_bs_month_start`` (not the ``_estimated`` variant) so a BCE month start
    # comes back as a CivilDay instead of raising; ``+ timedelta`` works on both.
    month_start = get_bs_month_start(year, month)
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
    from app.relative_day import is_relative_day_key

    if is_relative_day_key(value):
        key = value.strip().lower()
        raise ValueError(
            f"{key!r} is a relative day key, not a BS calendar date; "
            f"use GET /panchanga/{key}?era="
        )
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
