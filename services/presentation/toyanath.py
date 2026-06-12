"""Toyanath Panchanga Patro — derived from canonical Surya schema."""

from __future__ import annotations

from typing import Any

from panchanga.names_ne import to_nepali_digits
from services.presentation.canonical import to_canonical


def to_toyanath(daily_state: dict[str, Any]) -> dict[str, Any]:
    """Toyanath-style daily patro block with Devanagari-first labels."""
    c = to_canonical(daily_state)
    p = c["panchanga"]

    return {
        "meta": {
            "format": "toyanath",
            "from_cache": c["meta"].get("from_cache", False),
            "convention": "Udaya tithi at local true sunrise; Lahiri ayanamsa",
            "derived_from": "surya_canonical",
        },
        "mastak": {
            "bs_date": c["date"]["bs"],
            "bs_date_ne": _bs_ne(c["date"]["bs"]),
            "ad_date": c["date"]["ad"],
            "vaara_ne": c["date"].get("weekday_ne"),
            "vaara_en": c["date"]["weekday"],
            "paksha_ne": p.get("paksha_ne"),
            "sthana": c["location"].get("city"),
        },
        "samaya": {
            "sunrise": c["sun"].get("sunrise"),
            "sunset": c["sun"].get("sunset"),
            "noon": c["sun"].get("noon"),
            "moonrise": c["moon"].get("moonrise"),
            "moonset": c["moon"].get("moonset"),
        },
        "panchanga": {
            "tithi": _toyanath_anga(p.get("tithi")),
            "nakshatra": _toyanath_anga(p.get("nakshatra")),
            "yoga": _toyanath_anga(p.get("yoga")),
            "karana": _toyanath_anga(p.get("karana")),
        },
        "muhurta": {
            "rahu_kalam": _split_window(c["muhurta"].get("rahu_kalam")),
            "yamaganda": _split_window(c["muhurta"].get("yamaganda")),
            "gulika": _split_window(c["muhurta"].get("gulika")),
            "abhijit": _split_window(c["muhurta"].get("abhijit")),
        },
        "utsav": [
            {
                "name_ne": f.get("name_ne") or f.get("name"),
                "name_en": f.get("name"),
            }
            for f in c.get("festivals", [])
        ],
        "special": c.get("special"),
    }


def to_toyanath_month(month_payload: dict[str, Any]) -> dict[str, Any]:
    """Full BS month as Toyanath patro grid."""
    rows = []
    for day in month_payload.get("calendar", []):
        rows.append({
            "gate": to_nepali_digits(day.get("day", "")),
            "gate_en": day.get("day"),
            "miti_ad": day.get("date_ad"),
            "vaara_ne": day.get("weekday"),
            "tithi_ne": day.get("tithi_ne") or day.get("tithi"),
            "tithi_en": day.get("tithi"),
            "nakshatra": day.get("nakshatra"),
            "sunrise": day.get("sunrise"),
            "sunset": day.get("sunset"),
            "parva": day.get("festivals", []),
        })

    return {
        "meta": {"format": "toyanath", "view": "monthly_patro", "derived_from": "patro_month"},
        "shirshak": {
            "bs_year": month_payload.get("year_bs"),
            "bs_month": month_payload.get("month_bs"),
            "mahina_ne": month_payload.get("month_name_ne"),
            "mahina_en": month_payload.get("month_name"),
            "chandra_mahina": month_payload.get("lunar_month"),
            "adhik": month_payload.get("lunar_month_is_adhik", False),
            "sthan": (month_payload.get("location") or {}).get("name"),
        },
        "panktiharu": rows,
    }


def _bs_ne(bs_date: str | None) -> str | None:
    if not bs_date:
        return None
    parts = bs_date.split("-")
    if len(parts) != 3:
        return bs_date
    y, m, d = parts
    return f"{to_nepali_digits(y)}-{to_nepali_digits(m)}-{to_nepali_digits(d)}"


def _toyanath_anga(block: dict[str, Any] | None) -> dict[str, str | None]:
    if not block:
        return {"nama": None, "antya": None}
    return {
        "nama": block.get("name_ne") or block.get("name"),
        "antya": block.get("end_time"),
    }


def _split_window(value: str | None) -> dict[str, str | None]:
    if not value or "-" not in value:
        return {"start": None, "end": None}
    start, end = value.split("-", 1)
    return {"start": start, "end": end}
