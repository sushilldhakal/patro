"""Load and serve auspicious-date (साइत) listings — official JSON + computed ephemeris."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from core.location import DEFAULT_LOCATION, ObserverLocation
from panchanga.constants import BS_ESTIMATED_MIN_YEAR, BS_SUPPORTED_MAX_YEAR
from services.sait_generator import get_generated_sait

ROOT = Path(__file__).resolve().parents[1]
SAIT_RULES_PATH = ROOT / "rules" / "sait_dates_v1.json"

BS_MONTHS_NE = [
    "वैशाख", "जेठ", "असार", "साउन", "भदौ", "असोज",
    "कात्तिक", "मंसिर", "पुष", "माघ", "फागुन", "चैत",
]

ANNAPRASAN_NOTE = (
    "अन्नप्रासन requires the child's birth date to pick the 5–8 month window; "
    "year-wide listings show nakshatra-suitable days only."
)


@lru_cache(maxsize=1)
def _load_rules() -> dict[str, Any]:
    with SAIT_RULES_PATH.open(encoding="utf-8") as fh:
        return json.load(fh)


def list_sait_categories() -> list[dict[str, str | bool]]:
    rules = _load_rules()
    categories = rules.get("categories") or {}
    result: list[dict[str, str | bool]] = []
    for cat_id, meta in categories.items():
        entry: dict[str, str | bool] = {
            "id": cat_id,
            "label_ne": meta.get("label_ne", cat_id),
        }
        if cat_id == "annaprasan":
            entry["requires_birth_date"] = True
        result.append(entry)
    return result


def list_sait_years() -> list[int]:
    """All BS years supported by the computed engine (1700–2200)."""
    return list(range(BS_ESTIMATED_MIN_YEAR, BS_SUPPORTED_MAX_YEAR + 1))


def _static_month_entries(bs_year: int, category: str) -> dict[str, list[int]] | None:
    rules = _load_rules()
    year_key = str(bs_year)
    years = rules.get("years") or {}
    by_month = ((years.get(year_key) or {}).get(category) or {})
    if not by_month:
        return None
    return {str(k): list(v) for k, v in by_month.items()}


def _format_month_entries(by_month: dict[str, list[int]]) -> list[dict[str, Any]]:
    months: list[dict[str, Any]] = []
    for month_key, days in sorted(by_month.items(), key=lambda item: int(item[0])):
        month = int(month_key)
        day_list = sorted(int(d) for d in (days or []))
        if not day_list:
            continue
        months.append(
            {
                "month": month,
                "month_name_ne": BS_MONTHS_NE[month - 1],
                "days": day_list,
            }
        )
    return months


def get_sait_month_entries(
    bs_year: int,
    category: str,
    location: ObserverLocation = DEFAULT_LOCATION,
) -> dict[str, Any]:
    rules = _load_rules()
    categories = rules.get("categories") or {}
    if category not in categories:
        raise ValueError(f"Unknown sait category: {category}")

    static = _static_month_entries(bs_year, category)
    if static is not None:
        source = "official"
        by_month = static
    else:
        generated = get_generated_sait(bs_year, category, location)
        source = generated.get("source", "computed")
        by_month = generated.get("months") or {}

    payload: dict[str, Any] = {
        "bs_year": bs_year,
        "category": category,
        "category_label_ne": categories[category].get("label_ne", category),
        "months": _format_month_entries(by_month),
        "source": source,
    }
    if category == "annaprasan" and source == "computed":
        payload["note"] = ANNAPRASAN_NOTE
    return payload
