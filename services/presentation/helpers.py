"""Shared formatters for Surya canonical Panchanga JSON."""

from __future__ import annotations

from datetime import date
from typing import Any

ENGINE_VERSION = "2.2.0"


def end_time_hhmm(end_stamp: str | None) -> str | None:
    """Extract HH:MM from 'YYYY-MM-DD HH:MM' local stamp."""
    if not end_stamp:
        return None
    if " " in end_stamp:
        return end_stamp.split(" ", 1)[1]
    if len(end_stamp) >= 5 and end_stamp[2:3] == ":":
        return end_stamp[:5]
    return end_stamp


def muhurta_window(block: dict[str, Any] | None) -> str | None:
    if not block:
        return None
    start = block.get("start_time")
    end = block.get("end_time")
    if start and end:
        return f"{start}-{end}"
    return None


def tithi_display_name(tithi_block: dict[str, Any] | None, paksha_en: str | None) -> str | None:
    if not tithi_block:
        return None
    name = tithi_block.get("name")
    if not name:
        return None
    if not paksha_en:
        return name
    paksha_label = "Shukla" if "shukla" in paksha_en.lower() else "Krishna"
    if name in ("Purnima", "Amavasya"):
        return f"{paksha_label} {name}"
    return f"{paksha_label} {name}"


def festival_list(festivals: list[dict[str, Any]] | None) -> list[dict[str, str]]:
    if not festivals:
        return []
    return [
        {
            "id": f.get("id", ""),
            "name": f.get("name") or f.get("name_en") or "",
            **({"name_ne": f["name_ne"]} if f.get("name_ne") else {}),
        }
        for f in festivals
    ]


def primary_festival(festivals: list[dict[str, Any]] | None) -> str | None:
    if not festivals:
        return None
    first = festivals[0]
    return first.get("name") or first.get("name_en")


def build_special_block(
    greg: date,
    *,
    location_timezone: str,
    lunar_month: dict[str, Any] | None = None,
) -> dict[str, Any]:
    from panchanga.sankranti_calendar import sankrantis_on_date

    is_adhik = bool(lunar_month and lunar_month.get("is_adhik"))
    is_kshaya = bool(lunar_month and lunar_month.get("type") == "kshaya")

    sankranti_event = None
    events = sankrantis_on_date(greg, timezone_name=location_timezone)
    if events:
        ev = events[0]
        sankranti_event = {
            "sign": ev["to_rashi"],
            "sign_ne": ev.get("to_rashi_ne"),
            "timestamp": ev["timestamp"]["local_display"],
            "type": "sankranti",
            "bs_month": ev.get("bs_month_name"),
        }

    return {
        "adhik_maas": is_adhik,
        "kshaya_maas": is_kshaya,
        "sankranti": sankranti_event,
    }
