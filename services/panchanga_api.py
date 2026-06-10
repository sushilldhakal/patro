"""Panchanga computation API — structured time-state responses."""

from __future__ import annotations

from datetime import date
from typing import Any, Literal

from core.location import DEFAULT_LOCATION, ObserverLocation
from core.time_utils import resolve_observer_timezone
from panchanga.bikram_sambat import (
    bs_month_name,
    bs_to_gregorian,
    format_bs_date,
    get_bs_month_length,
    get_bs_month_start,
    gregorian_to_bs,
    iter_bs_month_days,
    parse_bs_date,
    shaka_year,
)
from panchanga.daily import get_daily_panchanga
from services.patro_generator import _collect_bs_year_festivals, _festivals_for_day


def _local_stamp(iso_dt: str | None, timezone_name: str) -> str | None:
    if not iso_dt:
        return None
    from datetime import datetime

    dt = datetime.fromisoformat(iso_dt)
    local = dt.astimezone(resolve_observer_timezone(timezone_name))
    return local.strftime("%Y-%m-%d %H:%M")


def _element_state(block: dict, timezone_name: str) -> dict[str, Any]:
    return {
        "name": block["name"],
        "name_ne": block.get("name_ne"),
        "start": _local_stamp(block.get("start_time"), timezone_name),
        "end": _local_stamp(block.get("end_time"), timezone_name),
        "next": block["next"]["name"],
        "next_ne": block["next"].get("name_ne"),
    }


def resolve_panchanga_date(
    date_key: str,
    *,
    era: Literal["bs", "ad"] = "bs",
) -> date:
    """Resolve ``2083-10-12`` (BS) or ``2027-01-25`` (AD) to Gregorian."""
    if era == "ad":
        return date.fromisoformat(date_key)
    bs_year, bs_month, bs_day = parse_bs_date(date_key)
    return bs_to_gregorian(bs_year, bs_month, bs_day)


def build_daily_state(
    greg: date,
    location: ObserverLocation = DEFAULT_LOCATION,
    *,
    include_festivals: bool = False,
    include_detail: bool = True,
) -> dict[str, Any]:
    """Single-day astronomical state — the grid row as JSON."""
    raw = get_daily_panchanga(greg, location, include_festivals=include_festivals)
    from_cache = bool(raw.pop("_from_cache", False))
    bs = raw["bs_date"]
    tz = location.timezone

    payload: dict[str, Any] = {
        "date_bs": format_bs_date(bs["year"], bs["month"], bs["day"]),
        "date_ad": greg.isoformat(),
        "weekday": raw["vaara"]["name_ne"],
        "weekday_en": raw["vaara"]["name_english"],
        "sun": {
            "sunrise": raw["sunrise"]["local_time_short"],
            "sunset": raw["sunset"]["local_time_short"],
            "noon": (raw.get("muhurta") or {}).get("abhijit", {}).get("solar_noon"),
        },
        "moon": {
            "rise": (raw["moonrise"] or {}).get("local_time_short"),
            "set": (raw["moonset"] or {}).get("local_time_short"),
        },
        "tithi": _element_state(raw["tithi"], tz),
        "nakshatra": _element_state(raw["nakshatra"], tz),
        "yoga": _element_state(raw["yoga"], tz),
        "karana": _element_state(raw["karana"], tz),
        "paksha": raw["paksha"]["label_en"],
        "paksha_ne": raw["paksha"]["label_ne"],
        "chandra_rashi": raw["chandra_rashi"]["name"],
        "chandra_rashi_ne": raw["chandra_rashi"]["name_ne"],
        "surya_rashi": raw["surya_rashi"]["name"],
        "surya_rashi_ne": raw["surya_rashi"]["name_ne"],
        "ritu": raw["ritu"]["name"],
        "ritu_ne": raw["ritu"]["name_ne"],
        "aayan": raw["aayan"]["name"],
        "aayan_ne": raw["aayan"]["name_ne"],
        "dinamaan": raw["dinamaan"]["label_en"],
        "muhurta":  raw.get("muhurta"),
        "location": raw["location"],
        "lunar_calendar": raw.get("lunar_calendar"),
        "lunar_month": raw.get("lunar_month"),
        "bs_date": raw["bs_date"],
        "from_cache": from_cache,
    }

    if include_festivals and "festivals" in raw:
        payload["festivals"] = [
            {
                "id": f["id"],
                "name": f.get("name_en") or f.get("name"),
                "name_ne": f.get("name_ne"),
                "type": f.get("type"),
                "category": f.get("category"),
            }
            for f in raw["festivals"]
        ]

    if include_detail:
        payload["detail"] = raw

    return payload


def build_patro_month(
    bs_year: int,
    bs_month: int,
    location: ObserverLocation = DEFAULT_LOCATION,
) -> dict[str, Any]:
    """Printable Surya-style monthly Patro grid (canonical month view)."""
    from services.presentation.patro import to_patro_month

    month_payload = build_month_calendar(bs_year, bs_month, location)
    header = build_calendar_header(bs_year, bs_month, location)
    return to_patro_month(month_payload, header=header)


def build_month_calendar(
    bs_year: int,
    bs_month: int,
    location: ObserverLocation = DEFAULT_LOCATION,
    *,
    full: bool = False,
) -> dict[str, Any]:
    """BS month as a calendar array — the Patro grid as JSON."""
    if not 1 <= bs_month <= 12:
        raise ValueError("bs_month must be 1..12")

    festivals = _collect_bs_year_festivals(bs_year, location)
    calendar: list[dict[str, Any]] = []

    for bs_day, greg in iter_bs_month_days(bs_year, bs_month):
        day_festivals = _festivals_for_day(festivals, greg)
        panchanga = get_daily_panchanga(greg, location)
        row: dict[str, Any] = {
            "day": bs_day,
            "date_ad": greg.isoformat(),
            "weekday": panchanga["vaara"]["name_ne"],
            "weekday_en": panchanga["vaara"]["name_english"],
            "tithi": panchanga["tithi"]["name"],
            "tithi_ne": panchanga["tithi"]["name_ne"],
            "nakshatra": panchanga["nakshatra"]["name"],
            "sunrise": panchanga["sunrise"]["local_time_short"],
            "sunset": panchanga["sunset"]["local_time_short"],
            "festivals": [f.get("name_en") or f.get("name") for f in day_festivals],
        }
        if full:
            row["panchanga"] = build_daily_state(
                greg,
                location,
                include_festivals=True,
                include_detail=False,
            )
        calendar.append(row)

    month_start = get_bs_month_start(bs_year, bs_month)
    month_length = get_bs_month_length(bs_year, bs_month)
    mid_greg = bs_to_gregorian(bs_year, bs_month, min(15, month_length))
    mid_panchanga = get_daily_panchanga(mid_greg, location)
    lunar = mid_panchanga["lunar_month"]
    return {
        "year_bs": bs_year,
        "month_bs": bs_month,
        "month_name": bs_month_name(bs_month),
        "month_name_ne": bs_month_name(bs_month, nepali=True),
        "month_start_ad": month_start.isoformat(),
        "month_length": month_length,
        "lunar_month": lunar.get("name"),
        "lunar_month_full": lunar.get("full_name"),
        "lunar_month_is_adhik": lunar.get("is_adhik", False),
        "lunar_month_type": lunar.get("type"),
        "location": location.as_dict(),
        "calendar": calendar,
    }


def build_calendar_header(
    bs_year: int,
    bs_month: int,
    location: ObserverLocation = DEFAULT_LOCATION,
) -> dict[str, Any]:
    """Multi-era header for a BS month."""
    month_start = get_bs_month_start(bs_year, bs_month)
    mid_greg = bs_to_gregorian(bs_year, bs_month, min(15, get_bs_month_length(bs_year, bs_month)))
    mid_panchanga = get_daily_panchanga(mid_greg, location)
    lunar = mid_panchanga["lunar_month"]
    ns = mid_panchanga["ns_date"]

    greg_label = month_start.strftime("%B %Y")
    ns_label = f"{ns['year']}"
    if ns.get("paksha_ne"):
        ns_label = f"{ns['year']} ({ns['paksha_ne']})"

    return {
        "bikram_sambat": str(bs_year),
        "bikram_sambat_month": bs_month_name(bs_month),
        "bikram_sambat_month_ne": bs_month_name(bs_month, nepali=True),
        "gregorian": greg_label,
        "gregorian_range": {
            "start": month_start.isoformat(),
            "end": (
                bs_to_gregorian(bs_year, bs_month, get_bs_month_length(bs_year, bs_month)).isoformat()
            ),
        },
        "lunar_month": lunar.get("name"),
        "lunar_month_full": lunar.get("full_name"),
        "lunar_month_is_adhik": lunar.get("is_adhik", False),
        "lunar_month_type": lunar.get("type"),
        "shaka_sambat": str(shaka_year(month_start)),
        "nepal_sambat": ns_label,
        "nepal_sambat_detail": ns,
        "location": location.as_dict(),
    }


def build_festivals_for_date(
    date_key: str,
    location: ObserverLocation = DEFAULT_LOCATION,
    *,
    era: Literal["bs", "ad"] = "bs",
) -> dict[str, Any]:
    greg = resolve_panchanga_date(date_key, era=era)
    bs_year, bs_month, bs_day = gregorian_to_bs(greg)
    festivals = _collect_bs_year_festivals(bs_year, location)
    active = _festivals_for_day(festivals, greg)

    return {
        "date_bs": format_bs_date(bs_year, bs_month, bs_day),
        "date_ad": greg.isoformat(),
        "festivals": [
            {
                "id": f["id"],
                "name": f.get("name_en") or f.get("name"),
                "name_ne": f.get("name_ne"),
                "type": f.get("type"),
                "category": f.get("category"),
            }
            for f in active
        ],
    }


def build_kundali(
    date_key: str,
    location: ObserverLocation = DEFAULT_LOCATION,
    *,
    era: Literal["bs", "ad"] = "bs",
) -> dict[str, Any]:
    """Planetary positions at sunrise — API-only kundali snapshot."""
    greg = resolve_panchanga_date(date_key, era=era)
    raw = get_daily_panchanga(greg, location)
    bs = raw["bs_date"]
    planets: dict[str, str] = {}

    for name, pos in raw["planets"].items():
        degree = pos["longitude"] % 30
        planets[name] = f"{pos['rashi_name']} {degree:.1f}°"

    return {
        "date_bs": format_bs_date(bs["year"], bs["month"], bs["day"]),
        "date_ad": greg.isoformat(),
        "location": raw["location"],
        "planets": planets,
        "planets_detail": raw["planets"],
        "lagna_note": "Lagna requires birth time; positions are at sunrise (udaya).",
    }
