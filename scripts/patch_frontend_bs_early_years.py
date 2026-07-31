#!/usr/bin/env python3
"""Add BS 1..(PANCHANGA_MIN-1) to dhakal-patro bs-calendar-data.json (grid-only years)."""

from __future__ import annotations

import json
import sys
from pathlib import Path

API_ROOT = Path(__file__).resolve().parents[1]
OUT_PATH = API_ROOT.parent / "dhakal-patro" / "src" / "lib" / "bs-calendar-data.json"

sys.path.insert(0, str(API_ROOT))

from engine.astronomy.jd_calendar import format_civil_iso  # noqa: E402
from engine.vedic.bikram_sambat import get_bs_month_length, get_bs_month_start_civil  # noqa: E402
from engine.vedic.constants import BS_CALENDAR_MIN_YEAR, BS_PANCHANGA_MIN_YEAR  # noqa: E402


def main() -> None:
    data = json.loads(OUT_PATH.read_text(encoding="utf-8"))
    month_lengths: dict[str, list[int]] = data.setdefault("month_lengths", {})
    baisakh_1_ad: dict[str, str] = data.setdefault("baisakh_1_ad", {})

    end = BS_PANCHANGA_MIN_YEAR - 1
    for year in range(BS_CALENDAR_MIN_YEAR, end + 1):
        key = str(year)
        month_lengths[key] = [get_bs_month_length(year, m) for m in range(1, 13)]
        c = get_bs_month_start_civil(year, 1)
        baisakh_1_ad[key] = format_civil_iso(c.year, c.month, c.day)
        if year % 10 == 0 or year == end:
            print(f"  BS {year} → {baisakh_1_ad[key]}", flush=True)

    data["start_year"] = BS_PANCHANGA_MIN_YEAR
    data["browse_start_year"] = BS_PANCHANGA_MIN_YEAR
    data["panchanga_start_year"] = BS_PANCHANGA_MIN_YEAR
    note = data.get("notes", "")
    early = f"{BS_CALENDAR_MIN_YEAR}-{end}: BS↔AD grid only (BCE before ~BS 57); "
    panch = f"{BS_PANCHANGA_MIN_YEAR}+: full panchanga"
    data["notes"] = early + panch if not note else f"{early}{panch}; {note}"

    OUT_PATH.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    print(f"Updated {OUT_PATH} (start_year={BS_CALENDAR_MIN_YEAR}, panchanga from {BS_PANCHANGA_MIN_YEAR})")


if __name__ == "__main__":
    main()
