"""Simple festival rule matcher — no DSL, no v4 catalog."""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any, Optional

from core.location import DEFAULT_LOCATION, ObserverLocation
from panchanga.lunar_month import find_festival_in_lunar_month, get_lunar_year
from panchanga.sankranti import find_makara_sankranti, find_mesh_sankranti


def compute_lunar_festival(
    rule: dict[str, Any],
    gregorian_year: int,
    location: ObserverLocation = DEFAULT_LOCATION,
) -> Optional[date]:
    return find_festival_in_lunar_month(
        lunar_month_name=rule["lunar_month"],
        tithi=int(rule["tithi"]),
        paksha=rule["paksha"],
        gregorian_year=gregorian_year,
        adhik_policy=rule.get("adhik_policy", "skip"),
        date_selection=rule.get("date_selection", "udaya"),
        location=location,
    )


def compute_solar_festival(
    festival_id: str,
    rule: dict[str, Any],
    gregorian_year: int,
) -> Optional[date]:
    sankranti_dt = None
    if festival_id == "maghe-sankranti" or rule.get("bs_month") == 10:
        sankranti_dt = find_makara_sankranti(gregorian_year)
    elif festival_id == "bs-new-year" or rule.get("bs_month") == 1:
        sankranti_dt = find_mesh_sankranti(gregorian_year)

    if sankranti_dt is None:
        return None
    return sankranti_dt.date()


def compute_festival_dates(
    festival_id: str,
    rule: dict[str, Any],
    gregorian_year: int,
    location: ObserverLocation = DEFAULT_LOCATION,
) -> Optional[tuple[date, date]]:
    """Return (start_date, end_date) for a festival in the given Gregorian year."""
    duration = max(int(rule.get("duration_days", 1)), 1)
    rule_type = rule.get("type", "lunar")

    if rule_type == "lunar":
        start = compute_lunar_festival(rule, gregorian_year, location)
    elif rule_type == "solar":
        start = compute_solar_festival(festival_id, rule, gregorian_year)
    else:
        return None

    if start is None:
        return None

    end = start + timedelta(days=duration - 1)
    return start, end


def bs_year_for_gregorian(gregorian_year: int) -> int:
    return get_lunar_year(gregorian_year).bs_year
