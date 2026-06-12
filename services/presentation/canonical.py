"""
Surya Panchanga canonical JSON — the single source of truth response model.

All other formats (Toyanath patro, raw engine, regional variants) derive from this.
"""

from __future__ import annotations

from datetime import date
from typing import Any

from services.presentation.helpers import (
    ENGINE_VERSION,
    build_special_block,
    end_time_hhmm,
    festival_list,
    muhurta_window,
    primary_festival,
    tithi_display_name,
)


def to_canonical(daily_state: dict[str, Any]) -> dict[str, Any]:
    """Map engine daily_state → Surya Panchanga canonical schema."""
    greg = date.fromisoformat(daily_state["date_ad"])
    loc = daily_state.get("location") or {}
    muhurta = daily_state.get("muhurta") or {}
    paksha = daily_state.get("paksha")

    tithi = daily_state.get("tithi") or {}
    nakshatra = daily_state.get("nakshatra") or {}
    yoga = daily_state.get("yoga") or {}
    karana = daily_state.get("karana") or {}

    return {
        "date": {
            "ad": daily_state.get("date_ad"),
            "bs": daily_state.get("date_bs"),
            "weekday": daily_state.get("weekday_en"),
            "weekday_ne": daily_state.get("weekday"),
        },
        "location": {
            "city": loc.get("name"),
            "city_id": loc.get("city_id"),
            "lat": loc.get("lat"),
            "lon": loc.get("lon"),
            "timezone": loc.get("timezone"),
        },
        "sun": {
            "sunrise": (daily_state.get("sun") or {}).get("sunrise"),
            "sunset": (daily_state.get("sun") or {}).get("sunset"),
            "noon": (daily_state.get("sun") or {}).get("noon")
            or (muhurta.get("abhijit") or {}).get("solar_noon"),
        },
        "moon": {
            "moonrise": (daily_state.get("moon") or {}).get("rise"),
            "moonset": (daily_state.get("moon") or {}).get("set"),
        },
        "panchanga": {
            "tithi": {
                "name": tithi_display_name(tithi, paksha),
                "name_ne": tithi.get("name_ne"),
                "end_time": end_time_hhmm(tithi.get("end")),
            },
            "nakshatra": {
                "name": nakshatra.get("name"),
                "name_ne": nakshatra.get("name_ne"),
                "end_time": end_time_hhmm(nakshatra.get("end")),
            },
            "yoga": {
                "name": yoga.get("name"),
                "name_ne": yoga.get("name_ne"),
                "end_time": end_time_hhmm(yoga.get("end")),
            },
            "karana": {
                "name": karana.get("name"),
                "name_ne": karana.get("name_ne"),
                "end_time": end_time_hhmm(karana.get("end")),
            },
            "paksha": paksha,
            "paksha_ne": daily_state.get("paksha_ne"),
        },
        "muhurta": {
            "rahu_kalam": muhurta_window(muhurta.get("rahu_kalam")),
            "yamaganda": muhurta_window(muhurta.get("yamaganda")),
            "gulika": muhurta_window(muhurta.get("gulika")),
            "abhijit": muhurta_window(muhurta.get("abhijit")),
        },
        "astrology": {
            "sun_rashi": daily_state.get("surya_rashi"),
            "sun_rashi_ne": daily_state.get("surya_rashi_ne"),
            "moon_rashi": daily_state.get("chandra_rashi"),
            "moon_rashi_ne": daily_state.get("chandra_rashi_ne"),
            "ritu": daily_state.get("ritu"),
            "ritu_ne": daily_state.get("ritu_ne"),
            "aayan": daily_state.get("aayan"),
            "ayanamsa": "Lahiri",
        },
        "festivals": festival_list(daily_state.get("festivals")),
        "is_public_holiday": daily_state.get("is_public_holiday", False),
        "special": build_special_block(
            greg,
            location_timezone=loc.get("timezone") or "Asia/Kathmandu",
            lunar_month=daily_state.get("lunar_month"),
        ),
        "meta": {
            "format": "surya_canonical",
            "engine_version": ENGINE_VERSION,
            "from_cache": daily_state.get("from_cache", False),
        },
    }
