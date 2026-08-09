"""Rashifal API helpers — daily from cache/compute; weekly/monthly aggregates."""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any, Literal

from engine.astronomy.location import DEFAULT_LOCATION, ObserverLocation
from engine.vedic.bikram_sambat import gregorian_to_bs, iter_bs_month_civil_days
from engine.vedic.daily import get_daily_panchanga
from engine.vedic.rashifal import aggregate_rashifal_signs, build_daily_rashifal

Period = Literal["daily", "weekly", "monthly"]


def _rashifal_from_daily_raw(raw: dict[str, Any]) -> dict[str, Any]:
    block = raw.get("rashifal")
    if isinstance(block, dict) and block.get("signs"):
        return block
    table = raw.get("chandrabala_table")
    if not isinstance(table, dict):
        raise ValueError("panchanga missing chandrabala_table")
    vaara = (raw.get("vaara") or {}).get("number")
    return build_daily_rashifal(table, vaara_num=vaara)


def rashifal_for_gregorian(
    greg: date,
    location: ObserverLocation = DEFAULT_LOCATION,
    *,
    period: Period = "daily",
) -> dict[str, Any]:
    if period == "daily":
        raw = get_daily_panchanga(greg, location)
        return _rashifal_from_daily_raw(raw)

    if period == "weekly":
        dailies: list[dict[str, Any]] = []
        for offset in range(7):
            d = greg + timedelta(days=offset)
            raw = get_daily_panchanga(d, location)
            dailies.append(_rashifal_from_daily_raw(raw))
        out = aggregate_rashifal_signs(dailies, period="weekly")
        out["range_start_ad"] = greg.isoformat()
        out["range_end_ad"] = (greg + timedelta(days=6)).isoformat()
        return out

    # monthly — BS month containing greg
    bs_year, bs_month, _bs_day = gregorian_to_bs(greg)
    dailies = []
    for _bs_day, civil_iso in iter_bs_month_civil_days(bs_year, bs_month):
        g = date.fromisoformat(civil_iso)
        raw = get_daily_panchanga(g, location)
        dailies.append(_rashifal_from_daily_raw(raw))
    out = aggregate_rashifal_signs(dailies, period="monthly")
    out["bs_year"] = bs_year
    out["bs_month"] = bs_month
    return out
