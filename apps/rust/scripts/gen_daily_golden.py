#!/usr/bin/env python3
"""Golden daily payloads (the whole payload) from the production Python builder.

    cd apps/api && ../../.venv/bin/python ../rust/scripts/gen_daily_golden.py

Writes crates/panchanga/tests/fixtures/daily_golden.json: for each case the date,
the location and the full Python payload in the Python key order. The Rust test
compares every key the Rust builder emits.
"""

from __future__ import annotations

import json
import random
import sys
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path.cwd()))
from engine.astronomy.location import ObserverLocation  # noqa: E402
from engine.astronomy.siddhanta import SURYA_SIDDHANTA, use_siddhanta  # noqa: E402
from engine.panchanga.daily import build_daily_panchanga  # noqa: E402
sys.path.insert(0, str(Path(__file__).resolve().parent))
from rust_divergences import apply as _apply_divergences  # noqa: E402

_apply_divergences()

PLACES = [
    ObserverLocation(),
    ObserverLocation(28.2096, 83.9856, "Asia/Kathmandu", "Pokhara", 1282898),
    ObserverLocation(26.4525, 87.2718, "Asia/Kathmandu", "Biratnagar"),
    ObserverLocation(40.7143, -74.006, "America/New_York", "New York", 5128581),
    ObserverLocation(-33.8679, 151.2073, "Australia/Sydney", "Sydney"),
    ObserverLocation(51.5085, -0.1257, "Europe/London", "London"),
]
rng = random.Random(20261122)
days = [date(2026, 11, 1) + timedelta(days=i) for i in range(35)]  # a month around today
days += [date(rng.randint(1600, 2200), rng.randint(1, 12), rng.randint(1, 28)) for _ in range(60)]
days += [date(1986, 1, 1), date(1920, 1, 1), date(1919, 12, 31), date(2026, 3, 8), date(2026, 11, 2)]
# Adhik Jestha 2026: the pūrṇimānta paksha split (शुद्ध / अधिक) in Kathmandu.
adhik = [date(2026, 5, 12) + timedelta(days=3 * i) for i in range(13)]

cases = []
with use_siddhanta(SURYA_SIDDHANTA):
    for i, d in enumerate(days + adhik):
        loc = PLACES[i % len(PLACES)] if 35 <= i < len(days) else PLACES[0]
        payload = build_daily_panchanga(d, loc)
        cases.append({
            "date": d.isoformat(),
            "location": {"lat": loc.lat, "lon": loc.lon, "timezone": loc.timezone, "name": loc.name, "city_id": loc.city_id},
            "payload": payload,
        })
out = Path(__file__).resolve().parents[1] / "crates/panchanga/tests/fixtures/daily_golden.json"
out.write_text(json.dumps(cases, ensure_ascii=False, separators=(",", ":")) + "\n")
print(f"wrote {out.name}: {len(cases)} days, {out.stat().st_size // 1024} KB")
