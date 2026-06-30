"""Printable monthly Patro grid — Surya canonical month view."""

from __future__ import annotations

from datetime import date
from typing import Any

from engine.vedic.bikram_sambat import bs_month_name, get_bs_month_length, shaka_year
from services.presentation.helpers import primary_festival, tithi_display_name


def to_patro_month(
    month_payload: dict[str, Any],
    *,
    header: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    BS month as printable Surya-style calendar grid.

    Each day row is sourced from panchanga cache via build_month_calendar.
    """
    bs_year = month_payload["year_bs"]
    bs_month = month_payload["month_bs"]
    month_name = month_payload.get("month_name") or bs_month_name(bs_month)

    days: list[dict[str, Any]] = []
    for row in month_payload.get("calendar", []):
        panchanga = row.get("panchanga")
        if panchanga:
            tithi_name = (panchanga.get("panchanga") or {}).get("tithi", {}).get("name")
            if not tithi_name:
                tithi_name = tithi_display_name(
                    panchanga.get("tithi"),
                    panchanga.get("paksha"),
                )
            nak = (panchanga.get("panchanga") or {}).get("nakshatra", {}).get("name")
            if not nak and panchanga.get("nakshatra"):
                nak = panchanga["nakshatra"].get("name")
            sunrise = (panchanga.get("sun") or {}).get("sunrise") or row.get("sunrise")
            festivals = panchanga.get("festivals") or []
        else:
            tithi_name = tithi_display_name(
                {"name": row.get("tithi"), "name_ne": row.get("tithi_ne")},
                None,
            ) or row.get("tithi")
            nak = row.get("nakshatra")
            sunrise = row.get("sunrise")
            festivals = [{"name": n} for n in row.get("festivals", [])]

        fest_names = row.get("festivals") or []
        festival_label = primary_festival(
            [{"name": n} for n in fest_names] if fest_names else festivals
        )

        days.append({
            "bs_day": row.get("day"),
            "ad_date": row.get("date_ad"),
            "weekday": row.get("weekday_en"),
            "weekday_ne": row.get("weekday"),
            "tithi": tithi_name,
            "tithi_ne": row.get("tithi_ne"),
            "nakshatra": nak,
            "sunrise": sunrise,
            "sunset": row.get("sunset"),
            "festival": festival_label,
            "festivals": fest_names or [f.get("name") for f in festivals if f.get("name")],
        })

    hdr = header or {}
    month_start = month_payload.get("month_start_ad", "")
    ad_month_label = hdr.get("gregorian")
    if not ad_month_label and month_start:
        ad_month_label = date.fromisoformat(month_start).strftime("%B %Y")

    shaka_val = hdr.get("shaka_sambat")
    if not shaka_val and month_start:
        shaka_val = str(shaka_year(date.fromisoformat(month_start)))

    return {
        "bs_year": bs_year,
        "bs_month": month_name,
        "bs_month_index": bs_month,
        "month_info": {
            "adhik_maas": month_payload.get("lunar_month_is_adhik", False),
            "lunar_month": month_payload.get("lunar_month"),
            "lunar_month_full": month_payload.get("lunar_month_full"),
            "days_in_month": month_payload.get("month_length")
            or get_bs_month_length(bs_year, bs_month),
            "month_start_ad": month_payload.get("month_start_ad"),
        },
        "header": {
            "shaka": shaka_val,
            "nepal_sambat": hdr.get("nepal_sambat"),
            "bikram_sambat": str(bs_year),
            "ad_month": ad_month_label,
            "lunar_month": month_payload.get("lunar_month"),
        },
        "location": month_payload.get("location"),
        "days": days,
        "meta": {
            "format": "patro_month",
            "engine_version": "2.2.0",
            "view": "printable_grid",
        },
    }
