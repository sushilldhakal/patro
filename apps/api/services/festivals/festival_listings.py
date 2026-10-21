"""Festival and holiday listings — the use cases behind /nepal/festivals,
/nepal/holidays and /nepal/festivals/upcoming.

A listing reads the cached BS-year festival stack (``holiday_generator``) and
shapes it: an AD year is the union of the two BS years it overlaps, a month
filter keeps what touches the month, every row carries its BS dates, and a
festival list can be narrowed to one observing tradition. The routers only
parse the query and turn :class:`ValueError` into 400 and a cache miss into 404.

The same festival recurs in each BS year, so when two BS years are merged an
occurrence is its id *and* its start date — by id alone one year's instance
silently replaced the other's.
"""

from __future__ import annotations

import calendar
from datetime import date, timedelta
from typing import Any, Iterable

from engine.astronomy.location import ObserverLocation
from engine.calendar.bs_date import BsDate
from engine.festivals import tradition as tradition_module
from engine.festivals.occurrence import occurrence_key
from services.festivals.holiday_generator import (
    FestivalCacheMissError,
    HolidayCacheMissError,
    filter_holidays_by_bs_month,
    get_bs_festivals,
    get_bs_holidays,
    load_rules,
)


def with_bs_dates(rows: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    """Each row with ``bs_start_date`` / ``bs_end_date`` beside its AD dates."""
    return [
        {
            **row,
            "bs_start_date": str(BsDate.from_gregorian(date.fromisoformat(row["start_date"]))),
            "bs_end_date": str(BsDate.from_gregorian(date.fromisoformat(row["end_date"]))),
        }
        for row in rows
    ]


def apply_tradition(festivals: list, tradition_value: str | None) -> tuple[list, str]:
    """Narrow a computed festival list to one observing tradition.

    Applied on read rather than baked into the cache key: the cached payload is
    the superset (``all``), and filtering it is a list comprehension over ~550
    entries. Keying the cache per tradition would multiply every stored year by
    the number of traditions to remove one festival from each.

    Raises :class:`ValueError` for an unknown tradition.
    """
    resolved = tradition_module.normalize(tradition_value)
    if resolved == tradition_module.DEFAULT:
        return festivals, resolved
    return tradition_module.filter_entries(festivals, resolved, load_rules()), resolved


def _touches_ad_year(row: dict[str, Any], ad_year: int) -> bool:
    start = date.fromisoformat(row["start_date"])
    end = date.fromisoformat(row["end_date"])
    return start.year <= ad_year <= end.year or start.year == ad_year or end.year == ad_year


def _touches_ad_month(rows: list[dict[str, Any]], ad_year: int, ad_month: int) -> list[dict[str, Any]]:
    first = date(ad_year, ad_month, 1)
    last = date(ad_year, ad_month, calendar.monthrange(ad_year, ad_month)[1])
    return [
        row for row in rows
        if date.fromisoformat(row["start_date"]) <= last and date.fromisoformat(row["end_date"]) >= first
    ]


def _merge_bs_years(load, bs_years: Iterable[int], keep, miss: type[Exception]) -> list[dict[str, Any]]:
    """Rows of several BS years, each occurrence once, by start date."""
    seen: dict[tuple[str, str], dict[str, Any]] = {}
    for bs_year in bs_years:
        try:
            rows = load(bs_year)
        except miss:
            continue
        for row in rows:
            if keep(row):
                seen[occurrence_key(row)] = row
    return sorted(seen.values(), key=lambda row: row["start_date"])


def holidays_for_ad_year(
    ad_year: int, location: ObserverLocation, *, cache_only: bool = False,
) -> list[dict[str, Any]]:
    """Public holidays touching an AD year — from the two BS years it overlaps."""
    return _merge_bs_years(
        lambda bs_year: get_bs_holidays(bs_year, location, cache_only=cache_only)["holidays"],
        (ad_year + 56, ad_year + 57),
        lambda row: _touches_ad_year(row, ad_year),
        HolidayCacheMissError,
    )


def holiday_listing(
    year: int, era: str, location: ObserverLocation, *, month: int | None = None, signed_bs_year: int | None = None,
) -> dict[str, Any]:
    """/nepal/holidays. ``signed_bs_year`` is the BS/BBS year the router read from ``year``."""
    if era == "ad":
        rows = holidays_for_ad_year(year, location)
        if month is not None:
            rows = _touches_ad_month(rows, year, month)
        enriched = with_bs_dates(rows)
        return {"ad_year": year, "era": "ad", "count": len(enriched), "holidays": enriched}
    if era == "bc":
        raise ValueError("Nepal holiday listings are not defined for era=bc; use era=bs, bbs, or ad.")

    payload = get_bs_holidays(signed_bs_year, location)
    rows = payload["holidays"]
    if month is not None:
        rows = filter_holidays_by_bs_month(rows, signed_bs_year, month)
    result: dict[str, Any] = {
        "bs_year": signed_bs_year,
        "era": era,
        "gregorian_range": payload.get("gregorian_range"),
        "count": len(rows),
        "holidays": with_bs_dates(rows),
    }
    if payload.get("unavailable_reason"):
        result["unavailable_reason"] = payload["unavailable_reason"]
    if era == "bbs":
        result["bbs"] = year
    return result


def festival_listing(
    year: int,
    era: str,
    location: ObserverLocation,
    *,
    month: int | None = None,
    tradition: str | None = None,
    signed_bs_year: int | None = None,
) -> dict[str, Any]:
    """/nepal/festivals. Raises :class:`ValueError` for a bad tradition or era=bc."""
    # A malformed tradition is a bad request whether or not the year is cached.
    tradition_module.normalize(tradition)

    if era == "ad":
        rows = _merge_bs_years(
            lambda bs_year: get_bs_festivals(bs_year, location)["festivals"],
            (year + 56, year + 57),
            lambda row: _touches_ad_year(row, year),
            FestivalCacheMissError,
        )
        if month is not None:
            rows = _touches_ad_month(rows, year, month)
        enriched, resolved = apply_tradition(with_bs_dates(rows), tradition)
        payload: dict[str, Any] = {"ad_year": year, "era": "ad", "count": len(enriched), "festivals": enriched}
        if tradition is not None:
            payload["tradition"] = resolved
        return payload
    if era == "bc":
        raise ValueError("Festival rules are not defined for era=bc; use era=bs, bbs, or ad.")

    payload = get_bs_festivals(signed_bs_year, location, bs_month=month)
    enriched, resolved = apply_tradition(with_bs_dates(payload["festivals"]), tradition)
    result: dict[str, Any] = {**payload, "era": era, "count": len(enriched), "festivals": enriched}
    if era == "bbs":
        result["bbs"] = year
    if tradition is not None:
        result["tradition"] = resolved
    return result


def upcoming_festivals(
    location: ObserverLocation, start: date, *, days: int, limit: int, holidays_only: bool = False,
) -> dict[str, Any]:
    """/nepal/festivals/upcoming: the next festivals from ``start``, across the BS-year boundary."""
    window_end = start + timedelta(days=days)

    def in_window(row: dict[str, Any]) -> bool:
        if date.fromisoformat(row["end_date"]) < start or date.fromisoformat(row["start_date"]) > window_end:
            return False
        return not holidays_only or bool(row.get("is_public_holiday"))

    rows = _merge_bs_years(
        lambda bs_year: get_bs_festivals(bs_year, location)["festivals"],
        (start.year + 56, start.year + 57, start.year + 58),
        in_window,
        FestivalCacheMissError,
    )
    rows = [
        {**row, "days_until": (date.fromisoformat(row["start_date"]) - start).days}
        for row in rows
    ][:limit]
    enriched = with_bs_dates(rows)
    return {"from": start.isoformat(), "days": days, "count": len(enriched), "festivals": enriched}
