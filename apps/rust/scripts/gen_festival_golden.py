#!/usr/bin/env python3
"""Golden festival lists from the production Python festival engine.

    cd apps/api && ../../.venv/bin/python ../rust/scripts/gen_festival_golden.py

Writes crates/festivals/tests/fixtures/festival_golden.json: whole BS years of festivals
(Kathmandu and a foreign observer), Gregorian years, and per-day lists.
"""

from __future__ import annotations

import json
import sys
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path.cwd()))
from engine.astronomy.location import ObserverLocation  # noqa: E402
from engine.astronomy.siddhanta import SURYA_SIDDHANTA, use_siddhanta  # noqa: E402
from services.festivals import holiday_generator as hg  # noqa: E402
from services.festivals.patro_generator import festivals_for_day  # noqa: E402

KTM = ObserverLocation()
NY = ObserverLocation(40.7143, -74.006, "America/New_York", "New York")
out = {"bs_years": [], "gregorian_years": [], "days": []}
with use_siddhanta(SURYA_SIDDHANTA):
    for bs_year, loc in [(2081, KTM), (2082, KTM), (2083, KTM), (2084, KTM), (2040, KTM), (2150, KTM), (2083, NY)]:
        fest = hg.generate_bs_festivals(bs_year, loc)["festivals"]
        out["bs_years"].append({"bs_year": bs_year, "location": loc.as_dict(), "festivals": fest})
    for gy, loc in [(2026, KTM), (1990, KTM), (2026, NY)]:
        out["gregorian_years"].append({"year": gy, "location": loc.as_dict(),
                                       "festivals": hg.generate_festivals(gy, hg.festival_location(loc))["festivals"]})
    year = out["bs_years"][2]["festivals"]
    d = date(2026, 4, 14)
    while d < date(2027, 4, 14):
        out["days"].append({"date": d.isoformat(), "festivals": festivals_for_day(year, d)})
        d += timedelta(days=1)
path = Path(__file__).resolve().parents[1] / "crates/festivals/tests/fixtures/festival_golden.json"
path.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")) + "\n")
print(f"wrote {path.name}: {sum(len(y['festivals']) for y in out['bs_years'])} BS-year rows, {len(out['days'])} days")
