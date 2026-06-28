"""Load and serve auspicious-date (साइत) listings from rules/sait_dates_v1.json."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
SAIT_RULES_PATH = ROOT / "rules" / "sait_dates_v1.json"

BS_MONTHS_NE = [
    "वैशाख", "जेठ", "असार", "साउन", "भदौ", "असोज",
    "कात्तिक", "मंसिर", "पुष", "माघ", "फागुन", "चैत",
]


@lru_cache(maxsize=1)
def _load_rules() -> dict[str, Any]:
    with SAIT_RULES_PATH.open(encoding="utf-8") as fh:
        return json.load(fh)


def list_sait_categories() -> list[dict[str, str]]:
    rules = _load_rules()
    categories = rules.get("categories") or {}
    return [
        {"id": cat_id, "label_ne": meta.get("label_ne", cat_id)}
        for cat_id, meta in categories.items()
    ]


def list_sait_years() -> list[int]:
    rules = _load_rules()
    years = rules.get("years") or {}
    return sorted(int(y) for y in years.keys())


def get_sait_month_entries(bs_year: int, category: str) -> dict[str, Any]:
    rules = _load_rules()
    categories = rules.get("categories") or {}
    if category not in categories:
        raise ValueError(f"Unknown sait category: {category}")

    year_key = str(bs_year)
    years = rules.get("years") or {}
    by_month = ((years.get(year_key) or {}).get(category) or {})

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

    return {
        "bs_year": bs_year,
        "category": category,
        "category_label_ne": categories[category].get("label_ne", category),
        "months": months,
    }
