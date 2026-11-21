#!/usr/bin/env python3
"""Golden daily payloads for days ``datetime`` cannot hold (Julian and BCE days).

    cd apps/api && ../../.venv/bin/python ../rust/scripts/gen_daily_civil_golden.py

Writes crates/panchanga/tests/fixtures/daily_civil_golden.json: for each case the
civil day, the location, the signed patro date ``locate_patro_day_for_civil`` gives
and the full ``build_daily_panchanga_civil`` payload.
"""

from __future__ import annotations

import json
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path.cwd()))
from engine.astronomy.jd_calendar import CivilDay  # noqa: E402
from engine.astronomy.location import ObserverLocation  # noqa: E402
from engine.astronomy.siddhanta import SURYA_SIDDHANTA, use_siddhanta  # noqa: E402
from engine.calendar.bikram_sambat import locate_patro_day_for_civil  # noqa: E402
from engine.panchanga.daily_civil import build_daily_panchanga_civil  # noqa: E402

PLACES = [
    ObserverLocation(27.7, 85.32, "Asia/Kathmandu", "Kathmandu", 1283240),
    ObserverLocation(28.2096, 83.9856, "Asia/Kathmandu", "Pokhara", 1282898),
    ObserverLocation(40.7143, -74.006, "America/New_York", "New York", 5128581),
    ObserverLocation(-33.8679, 151.2073, "Australia/Sydney", "Sydney"),
    ObserverLocation(51.5085, -0.1257, "Europe/London", "London"),
]
rng = random.Random(20261121)
days = [
    CivilDay(-44, 3, 15), CivilDay(1500, 1, 1), CivilDay(1582, 10, 4), CivilDay(1582, 10, 3),
    CivilDay(0, 1, 1), CivilDay(-56, 4, 14), CivilDay(1, 1, 1), CivilDay(-3101, 2, 18),
    CivilDay(1000, 7, 4), CivilDay(-1000, 12, 31),
]
days += [CivilDay(rng.randint(-4000, 1581), rng.randint(1, 12), rng.randint(1, 28)) for _ in range(30)]

cases = []
with use_siddhanta(SURYA_SIDDHANTA):
    for i, d in enumerate(days):
        loc = PLACES[i % len(PLACES)] if i >= 4 else PLACES[0]
        bs = locate_patro_day_for_civil(d)
        try:
            payload = build_daily_panchanga_civil(
                d, loc, patro_bs_year=bs[0], patro_bs_month=bs[1], patro_bs_day=bs[2]
            )
        except TypeError as exc:
            # 1582-10-04 (Julian) mixes a UtInstant sunrise with a datetime next
            # sunrise and Python raises; Rust answers it (rust_divergences.py).
            print(f"skip {d} {loc.name}: {exc}")
            continue
        cases.append({
            "date": [d.year, d.month, d.day],
            "bs": list(bs),
            "location": {"lat": loc.lat, "lon": loc.lon, "timezone": loc.timezone, "name": loc.name, "city_id": loc.city_id},
            "payload": payload,
        })
out = Path(__file__).resolve().parents[1] / "crates/panchanga/tests/fixtures/daily_civil_golden.json"
out.write_text(json.dumps(cases, ensure_ascii=False, separators=(",", ":")) + "\n")
print(f"wrote {out.name}: {len(cases)} days, {out.stat().st_size // 1024} KB")
