#!/usr/bin/env python3
"""Write the golden file the Rust Surya Siddhanta port is tested against.

Every value comes from the production Python module
(apps/api/engine/astronomy/siddhanta/surya_siddhanta_math.py), so the Rust crate
is checked against exactly what the live server computes.

    cd apps/api && ../../.venv/bin/python ../rust/scripts/gen_surya_siddhanta_golden.py

Writes apps/rust/crates/astronomy/tests/fixtures/surya_siddhanta_golden.json.
Floats are written with repr(), which round-trips exactly.
"""

from __future__ import annotations

import json
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path.cwd()))
from engine.astronomy.siddhanta import surya_siddhanta_math as ss  # noqa: E402

OUT = Path(__file__).resolve().parents[1] / "crates/astronomy/tests/fixtures/surya_siddhanta_golden.json"

rng = random.Random(20261120)

# Days to test: the text's anchors, the deep past, the app's everyday range, the far future.
ANCHORS = [
    ss.SATYA_YUGA_START_JD,
    ss.SATYA_YUGA_START_JD + 1_000_000.25,
    ss.KALI_EPOCH_JD,
    ss.KALI_EPOCH_JD + 0.5,
    ss.KALI_EPOCH_JD + 1800 * ss.YEAR_DAYS,
    ss.KALI_EPOCH_JD + 3600 * ss.YEAR_DAYS,
    2461345.5,  # 1 Nov 2026
    2461072.5,  # 1 Feb 2026
    2459015.5,  # 15 Jun 2020
    2451545.0,  # J2000
]
EVERYDAY = [rng.uniform(2415020.5, 2488069.5) for _ in range(120)]  # 1900–2100
DEEP = [rng.uniform(ss.SATYA_YUGA_START_JD, 2415020.5) for _ in range(40)]
FUTURE = [rng.uniform(2488069.5, 2488069.5 + 3_650_000) for _ in range(20)]
JDS = ANCHORS + EVERYDAY + DEEP + FUTURE

PLACES = [(27.7172, 85.324), (28.2096, 83.9856), (40.7143, -74.006), (-33.8679, 151.2073), (0.0, 0.0), (64.84, -147.72)]
MEAN_KEYS = list(ss.REVS_MAHAYUGA)
APSIS_KEYS = ["moon", *ss.APSIS_REVS_KALPA]
NODE_KEYS = ["moon", *ss.NODE_REVS_KALPA]


def place_jds(count: int) -> list[tuple[float, float, float]]:
    return [(rng.choice(JDS[: 10 + 120]), *rng.choice(PLACES)) for _ in range(count)]


golden: dict[str, list] = {
    "mean_longitude": [[k, jd, ss.mean_longitude(k, jd)] for jd in JDS for k in MEAN_KEYS],
    "apsis_longitude": [[k, jd, ss.apsis_longitude(k, jd)] for jd in JDS for k in APSIS_KEYS],
    "node_longitude": [[k, jd, ss.node_longitude(k, jd)] for jd in JDS for k in NODE_KEYS],
    "true_position": [[b, jd, *ss.true_position(b, jd)] for jd in JDS for b in ss.BODIES],
    "true_longitude_and_speed": [[b, jd, *ss.true_longitude_and_speed(b, jd)] for jd in JDS for b in ss.BODIES],
    "ayanamsha": [[jd, ss.ayanamsha(jd)] for jd in JDS],
    "mean_sign_ingresses_since_kali": [[k, jd, ss.mean_sign_ingresses_since_kali(k, jd)] for jd in JDS for k in ("jupiter", "sun", "moon")],
    "equatorial": [[lon, lat, *ss.equatorial(lon, lat)] for lon, lat in ((rng.uniform(0, 360), rng.uniform(-6, 6)) for _ in range(200))],
    "local_sidereal_degrees": [[jd, lon, ss.local_sidereal_degrees(jd, lon)] for jd, _, lon in place_jds(200)],
    "equation_of_time_days": [[jd, ss.equation_of_time_days(jd)] for jd in JDS],
    "altitude": [[b, jd, lat, lon, ss.altitude(b, jd, lat, lon)] for jd, lat, lon in place_jds(60) for b in ("sun", "moon", "mars", "venus")],
    "ascendant": [[jd, lat, lon, ss.ascendant(jd, lat, lon)] for jd, lat, lon in place_jds(200)],
    "next_rise_or_set": [
        [b, jd, lat, lon, rising, ss.next_rise_or_set(b, jd, lat, lon, rising=rising)]
        for jd, lat, lon in place_jds(40)
        for b in ("sun", "moon")
        for rising in (True, False)
    ],
    "elongation": [[jd, ss.elongation(jd)] for jd in JDS],
    "next_syzygy": [
        [jd, target, backward, ss.next_syzygy(jd, target, backward=backward)]
        for jd in JDS[:60]
        for target in (0.0, 180.0)
        for backward in (False, True)
    ],
    "eclipse_measures": [[jd, ss.eclipse_measures(jd)] for jd in JDS[:80]],
    "next_eclipse": [
        [jd, kind, backward, ss.next_eclipse(jd, kind, backward=backward)]
        for jd in ANCHORS + EVERYDAY[:30]
        for kind in ("lunar", "solar")
        for backward in (False, True)
    ],
}
# Local solar eclipses at the global ones found above, seen from every place.
golden["solar_eclipse_local"] = [
    [found["max_jd"], lat, lon, ss.solar_eclipse_local(found["max_jd"], lat, lon)]
    for _, kind, _, found in golden["next_eclipse"][:40]
    if kind == "solar" and found is not None
    for lat, lon in PLACES
]

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(golden, separators=(",", ":")) + "\n")
print(f"wrote {OUT} ({OUT.stat().st_size // 1024} KB, {sum(len(v) for v in golden.values())} cases)")
