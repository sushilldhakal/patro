#!/usr/bin/env python3
"""Golden file for patro::date_key: Python's date-key reader on good and bad keys.

    cd apps/api && ../../.venv/bin/python ../rust/scripts/gen_date_key_golden.py
"""

from __future__ import annotations

import json
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path.cwd()))

from engine.astronomy.siddhanta import SURYA_SIDDHANTA, use_siddhanta  # noqa: E402
from engine.calendar.date_keys import (  # noqa: E402
    civil_day_for_date_key, greg_date_for_date_key, parse_date_key,
)

RUST = Path(__file__).resolve().parents[1]
rng = random.Random(20261121)
ERAS = ["ad", "bc", "bs", "bbs", " BS ", "Ad", "xx", ""]
KEYS = [
    "2083-08-15", "2026-11-21", "2083-13-01", "2083-00-10", "2083-01-00", "2083-02-32", "2083-02-31",
    "2026-02-29", "2026-02-30", "2026-02-31", "2024-02-29", "1582-10-10", "1582-10-04", "1582-10-15",
    "0-01-01", "1-01-01", "-0044-03-15", "-1-01-01", "-44-13-01", "-44-01-32", "+2026-01-01",
    "17053-01-01", "17054-01-01", "3891138-01-01", "3891139-01-01", "100-01-01", "56-12-30",
    "today", "Tomorrow", " now ", "2083-8-5", " 2083-08-15 ", "2083_1-01-01", "2083-0_1-01",
    "2083/08/15", "2083-08", "2083-08-15-01", "abc", "", "2083--08", "२०८३-०८-१५", "a'b-1-1",
    "2083-08-15T00:00", "9999-12-31", "10000-01-01", "2083- 08-15",
]
KEYS += [f"{rng.randint(1, 3000)}-{rng.randint(1, 12)}-{rng.randint(1, 32)}" for _ in range(80)]


def attempt(fn, *args):
    try:
        out = fn(*args)
    except Exception as exc:  # noqa: BLE001
        return {"err": str(exc)}
    if out is None:
        return None
    if isinstance(out, float):
        return {"jd": out}
    return {"day": [out.year, out.month, out.day]}


with use_siddhanta(SURYA_SIDDHANTA):
    cases = [
        {"key": k, "era": e, "parse": attempt(parse_date_key, k, e),
         "greg": attempt(greg_date_for_date_key, k, e), "civil": attempt(civil_day_for_date_key, k, e)}
        for k in KEYS for e in ERAS
    ]
out = RUST / "crates/patro/tests/fixtures/date_key_golden.json"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(cases, ensure_ascii=False) + "\n")
print(f"wrote {out.relative_to(RUST)} ({len(cases)} cases)")
