#!/usr/bin/env python3
"""Generate the apps' offline BS month tables, one per calculation.

Both apps convert BS ↔ AD on the device (today's date, month grids, pickers) from
these tables, so each must hold exactly the months the API computes for that
calculation: drik with each ayanamsha, and the Surya Siddhanta. Every month starts
on the Kathmandu civil day of its sankranti (engine.calendar.bikram_sambat).

Writes ``packages/domain/src/calendar/bs-calendar-data/<calculation>.json``:
12 digits per BS year from ``first_year`` (each month's length minus 29), and
Baisakh 1 (proleptic Gregorian ISO, as the apps read it) wherever it does not
follow from the year before.

Run from apps/api:
  ../../.venv/bin/python -m scripts.generate_frontend_bs_calendar
  ../../.venv/bin/python -m scripts.generate_frontend_bs_calendar --check
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

API_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(API_ROOT))

OUT_DIR = API_ROOT.parents[1] / "packages" / "domain" / "src" / "calendar" / "bs-calendar-data"
FIRST_YEAR = 1
LAST_YEAR = 3000
#: Browse and full-panchanga floor of the apps' pickers (BS 1–59 are history, not browse).
BROWSE_START_YEAR = 60

#: (file name = the apps' calculationKey, siddhanta, ayanamsha)
CALCULATIONS = (
    ("drik", "drik", None),
    ("drik.raman", "drik", "raman"),
    ("drik.kp", "drik", "kp"),
    ("drik.true_citra", "drik", "true_citra"),
    ("drik.true_pushya", "drik", "true_pushya"),
    ("surya_siddhanta", "surya_siddhanta", None),
)

_UNIX_EPOCH_JD = 2440587.5


def _iso_from_days(days: int) -> str:
    """Proleptic Gregorian ISO of a day count since 1970-01-01 (the apps' isoFromDays)."""
    z = days + 719468
    era = z // 146097
    doe = z - era * 146097
    yoe = (doe - doe // 1460 + doe // 36524 - doe // 146096) // 365
    doy = doe - (365 * yoe + yoe // 4 - yoe // 100)
    mp = (5 * doy + 2) // 153
    d = doy - (153 * mp + 2) // 5 + 1
    m = mp + 3 if mp < 10 else mp - 9
    y = yoe + era * 400 + (1 if m <= 2 else 0)
    return f"{'-' if y < 0 else ''}{abs(y):04d}-{m:02d}-{d:02d}"


def build_table() -> dict:
    """The packed table for the calculation active in the current context."""
    from engine.calendar.bikram_sambat import get_bs_month_start_civil

    def day_of(year: int, month: int) -> int:
        return int(round(get_bs_month_start_civil(year, month).to_jd_ut() - _UNIX_EPOCH_JD))

    digits: list[str] = []
    anchors: dict[str, str] = {}
    running: int | None = None
    for year in range(FIRST_YEAR, LAST_YEAR + 1):
        starts = [day_of(year, m) for m in range(1, 13)] + [day_of(year + 1, 1)]
        if running != starts[0]:
            anchors[str(year)] = _iso_from_days(starts[0])
        for a, b in zip(starts, starts[1:]):
            length = b - a
            if not 29 <= length <= 32:
                raise ValueError(f"BS {year}: month length {length} does not pack")
            digits.append(str(length - 29))
        running = starts[-1]
    return {
        "first_year": FIRST_YEAR,
        "last_year": LAST_YEAR,
        "start_year": BROWSE_START_YEAR,
        "end_year": LAST_YEAR,
        "browse_start_year": BROWSE_START_YEAR,
        "panchanga_start_year": BROWSE_START_YEAR,
        "month_lengths_packed": "".join(digits),
        "baisakh_1_ad_anchors": anchors,
    }


def render(key: str, table: dict) -> str:
    payload = {
        "calculation": key,
        "source": "apps/api scripts/generate_frontend_bs_calendar.py",
        "notes_packed": (
            "month_lengths_packed: 12 digits per BS year from first_year, each the month's length minus 29. "
            "baisakh_1_ad_anchors: Baisakh 1 (proleptic Gregorian ISO) where it does not follow from the year before."
        ),
        **table,
    }
    return json.dumps(payload, ensure_ascii=False, indent=2) + "\n"


def main() -> int:
    from app.wiring import configure
    from engine.astronomy.siddhanta import use_ayanamsha, use_siddhanta

    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="fail if a written table is out of date")
    args = parser.parse_args()
    configure()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    stale = []
    for key, siddhanta_id, ayanamsha in CALCULATIONS:
        with use_siddhanta(siddhanta_id), use_ayanamsha(ayanamsha):
            text = render(key, build_table())
        path = OUT_DIR / f"{key}.json"
        if args.check:
            if not path.exists() or path.read_text(encoding="utf-8") != text:
                stale.append(path.name)
            continue
        path.write_text(text, encoding="utf-8")
        print(f"wrote {path.relative_to(API_ROOT.parents[1])}")
    if stale:
        print(f"out of date: {', '.join(stale)} — run scripts.generate_frontend_bs_calendar", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
