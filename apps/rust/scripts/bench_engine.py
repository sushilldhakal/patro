#!/usr/bin/env python3
"""Python side of crates/calendar/benches/engine.rs: same workloads, caches cleared.

    cd apps/api && ../../.venv/bin/python ../rust/scripts/bench_engine.py
"""

from __future__ import annotations

import sys
import timeit
from datetime import date, datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path.cwd()))
from engine.astronomy.engine import default_engine as engine  # noqa: E402
from engine.astronomy.siddhanta import SURYA_SIDDHANTA, use_siddhanta  # noqa: E402
from engine.calendar import bikram_sambat as bs  # noqa: E402
from engine.panchanga.angas import panchanga_service as ps  # noqa: E402
from engine.panchanga.tithi_boundaries import find_tithi_end  # noqa: E402

JD = 2461345.5
AT = datetime(2026, 11, 1, 6, 30, 15, 123456, tzinfo=timezone.utc)


def fresh(fn):
    """Clear every memo first, so Python pays the same cold cost Rust always pays."""
    def run():
        engine.cache_clear()
        engine._rise_cache.clear()
        bs._solve_bs_month_start_civil.cache_clear()
        return fn()
    return run


CASES = {
    "all angas at an instant": fresh(lambda: (ps.tithi(JD), ps.nakshatra(JD), ps.yoga(JD), ps.karana(JD))),
    "tithi end": fresh(lambda: find_tithi_end(AT)),
    "sunrise, Kathmandu": fresh(lambda: engine.rise(date(2026, 11, 1), "sun", 27.7172, 85.324, 0.0, timezone_name="Asia/Kathmandu")),
    "BS year: 12 month starts": fresh(lambda: [bs.get_bs_month_start_civil(2083, m) for m in range(1, 13)]),
}
with use_siddhanta(SURYA_SIDDHANTA):
    for name, fn in CASES.items():
        timer = timeit.Timer(fn)
        loops, _ = timer.autorange()
        best = min(timer.repeat(5, loops)) / loops
        print(f"{name:28s} {best * 1e6:12.1f} µs")
