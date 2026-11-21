#!/usr/bin/env python3
"""The Python side of crates/astronomy/benches/surya_siddhanta.rs: same workloads.

    cd apps/api && ../../.venv/bin/python ../rust/scripts/bench_surya_siddhanta.py
"""

from __future__ import annotations

import sys
import timeit
from pathlib import Path

sys.path.insert(0, str(Path.cwd()))
from engine.astronomy.siddhanta import surya_siddhanta_math as ss  # noqa: E402

JD = 2461345.5
CASES = {
    "true_position: 8 bodies": lambda: [ss.true_position(b, JD) for b in ss.BODIES],
    "sunrise: Kathmandu": lambda: ss.next_rise_or_set("sun", JD, 27.7172, 85.324, rising=True),
    "moonrise: Kathmandu": lambda: ss.next_rise_or_set("moon", JD, 27.7172, 85.324, rising=True),
    "next lunar eclipse": lambda: ss.next_eclipse(JD, "lunar"),
}
for name, fn in CASES.items():
    timer = timeit.Timer(fn)
    loops, _ = timer.autorange()
    best = min(timer.repeat(5, loops)) / loops
    print(f"{name:26s} {best * 1e6:12.2f} µs")
