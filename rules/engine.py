"""Simple festival rule matcher — no DSL, no v4 catalog."""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any, Optional

from core.location import DEFAULT_LOCATION, ObserverLocation
from panchanga.bikram_sambat import bs_to_gregorian
from panchanga.bs_year import bs_solar_year_for_gregorian_year
from panchanga.lunar_month import find_festival_in_lunar_month
from panchanga.sankranti import find_makara_sankranti, find_mesh_sankranti


def compute_lunar_festival(
    rule: dict[str, Any],
    gregorian_year: int,
    location: ObserverLocation = DEFAULT_LOCATION,
) -> Optional[date]:
    month_model = rule.get("month_model", "festival")
    return find_festival_in_lunar_month(
        lunar_month_name=rule["lunar_month"],
        tithi=int(rule["tithi"]),
        paksha=rule["paksha"],
        gregorian_year=gregorian_year,
        adhik_policy=rule.get("adhik_policy", "skip"),
        date_selection=rule.get("date_selection", "udaya"),
        location=location,
        month_model=month_model,
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


def compute_bs_fixed_festival(
    rule: dict[str, Any],
    gregorian_year: int,
) -> Optional[date]:
    """Festival on a fixed BS month + day — authoritative lookup-table result."""
    bs_month = rule.get("bs_month")
    bs_day = rule.get("bs_day", 1)
    if not bs_month:
        return None
    for bs_year in (gregorian_year + 56, gregorian_year + 57):
        try:
            greg = bs_to_gregorian(bs_year, bs_month, bs_day)
            if greg.year == gregorian_year:
                return greg
        except ValueError:
            continue
    return None


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
    elif rule_type == "bs_fixed":
        start = compute_bs_fixed_festival(rule, gregorian_year)
    else:
        return None

    if start is None:
        return None

    end = start + timedelta(days=duration - 1)
    return start, end


def bs_year_for_gregorian(gregorian_year: int) -> int:
    """Approximate BS year label for a Gregorian calendar year."""
    return bs_solar_year_for_gregorian_year(gregorian_year, 1)


def get_special_months_for_gregorian_year(
    gregorian_year: int,
) -> dict[str, Any]:
    """Return Adhik Maas and Kshaya Maas metadata for a Gregorian year.

    Adhik Maas (Mala Maas / Purushottam Maas): extra intercalary lunar month
    with no Sankranti — occurs roughly every 32–33 months.

    Kshaya Maas: extremely rare lost month with two Sankrantis — last in
    BS 2020 (1963 CE), next predicted ~BS 2198 (2141 CE).
    """
    from panchanga.adhik_maas import find_adhik_maas_for_gregorian_year
    from panchanga.kshaya_maas import get_kshaya_maas_info, is_kshaya_maas
    from panchanga.lunar_month import get_lunar_year

    adhik = find_adhik_maas_for_gregorian_year(gregorian_year)

    # Scan lunar months for Kshaya
    kshaya: Optional[dict[str, Any]] = None
    lunar_year = get_lunar_year(gregorian_year)
    for month in lunar_year.months:
        if is_kshaya_maas(month.start_amavasya, month.end_amavasya):
            info = get_kshaya_maas_info(month.start_amavasya, month.end_amavasya)
            if info:
                info["start_date"] = month.start_amavasya.date().isoformat()
                info["end_date"] = (month.end_amavasya - timedelta(days=1)).date().isoformat()
                kshaya = info
                break

    return {
        "gregorian_year": gregorian_year,
        "bs_year": bs_year_for_gregorian(gregorian_year),
        "adhik_maas": adhik or {"has_adhik_maas": False},
        "kshaya_maas": kshaya or {"is_kshaya": False},
    }
