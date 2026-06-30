#!/usr/bin/env python3
"""Generate dhakal-patro offline BS calendar JSON (1700–2200).

Uses nepali-holiday-api engine:
- 2000–2099: official month-length lookup
- 1700–1999, 2100–2200: sankranti-based estimation

Run from repo root:
  python3 nepali-holiday-api/scripts/generate_frontend_bs_calendar.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

API_ROOT = Path(__file__).resolve().parents[1]
OUT_PATH = API_ROOT.parent / "dhakal-patro" / "src" / "lib" / "bs-calendar-data.json"

sys.path.insert(0, str(API_ROOT))

from engine.vedic.bikram_sambat import get_bs_month_length, get_bs_month_start  # noqa: E402
from engine.vedic.constants import BS_ESTIMATED_MIN_YEAR, BS_SUPPORTED_MAX_YEAR  # noqa: E402


def main() -> None:
    month_lengths: dict[str, list[int]] = {}
    baisakh_1_ad: dict[str, str] = {}

    for year in range(BS_ESTIMATED_MIN_YEAR, BS_SUPPORTED_MAX_YEAR + 1):
        month_lengths[str(year)] = [get_bs_month_length(year, m) for m in range(1, 13)]
        baisakh_1_ad[str(year)] = get_bs_month_start(year, 1).isoformat()
        if year % 50 == 0:
            print(f"  {year}...", flush=True)

    baisakh_1_ad[str(BS_SUPPORTED_MAX_YEAR + 1)] = get_bs_month_start(
        BS_SUPPORTED_MAX_YEAR + 1, 1
    ).isoformat()

    payload = {
        "start_year": BS_ESTIMATED_MIN_YEAR,
        "end_year": BS_SUPPORTED_MAX_YEAR,
        "source": "nepali-holiday-api/panchanga",
        "notes": (
            f"{BS_ESTIMATED_MIN_YEAR}-1999, 2100-{BS_SUPPORTED_MAX_YEAR}: sankranti estimated; "
            "2000-2099: official lookup"
        ),
        "month_lengths": month_lengths,
        "baisakh_1_ad": baisakh_1_ad,
    }

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    span = BS_SUPPORTED_MAX_YEAR - BS_ESTIMATED_MIN_YEAR + 1
    print(f"Wrote {OUT_PATH} ({span} BS years, {BS_ESTIMATED_MIN_YEAR}-{BS_SUPPORTED_MAX_YEAR})")


if __name__ == "__main__":
    main()
