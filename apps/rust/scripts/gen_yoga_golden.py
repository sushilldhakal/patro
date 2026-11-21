#!/usr/bin/env python3
"""Random charts through `full_yoga_catalog` for crates/jyotish/tests/yoga_catalog.rs.

Half the charts crowd the grahas into a few signs (and some onto exaltation
degrees) so rare combinations fire; each records the inputs, a present bitstring
and the `raja_*` rows (their set and wording depend on the lords).

    cd apps/api && ../../.venv/bin/python ../rust/scripts/gen_yoga_golden.py
"""

from __future__ import annotations

import json
import random
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path.cwd()))
import engine.jyotish.interpretation as it  # noqa: E402
sys.path.insert(0, str(Path(__file__).resolve().parent))
from rust_divergences import apply as _apply_divergences  # noqa: E402

_apply_divergences()
from engine.jyotish.kundali_detail import _yogas_to_api  # noqa: E402

rng = random.Random(20261121)
EXALT = {"sun": 10, "moon": 33, "mars": 298, "mercury": 165, "jupiter": 95, "venus": 357, "saturn": 200}
NOW = datetime(2026, 1, 1, tzinfo=timezone.utc)


def chart_inputs(i: int) -> dict:
    lagna = round(rng.uniform(0, 360), 6)
    if i % 2 == 0:
        lons = [rng.uniform(0, 360) for _ in range(9)]
    else:
        signs = [rng.randrange(12) for _ in range(rng.randint(1, 4))]
        lons = [rng.choice(signs) * 30 + rng.uniform(0, 30) for _ in range(9)]
        for k, deg in EXALT.items():
            if rng.random() < 0.15:
                lons[it.PLANET_KEYS.index(k)] = deg + rng.uniform(-1.5, 1.5)
        if rng.random() < 0.5:
            lagna = rng.choice(signs) * 30 + rng.uniform(0, 30)
    lons[8] = (lons[7] + 180) % 360  # Ketu opposite Rahu
    retro = [rng.random() < 0.2 for _ in range(9)]
    dig = [rng.choice([None, round(rng.uniform(0, 60), 3)]) for _ in range(7)]
    return {
        "lons": [round(x, 6) for x in lons],
        "retro": retro,
        "lagna": lagna,
        "is_day": rng.choice([True, False, None]),
        "gulika": rng.choice([None, round(rng.uniform(0, 360), 4)]),
        "mandi": rng.choice([None, round(rng.uniform(0, 360), 4)]),
        "dig": dig,
    }


def house_inputs() -> dict:
    """Grahas dropped into a few houses from the lagna, often at exaltation degrees."""
    lagna_sign = rng.randrange(12)
    lagna = lagna_sign * 30 + rng.uniform(0, 30)
    houses = [rng.randrange(12) for _ in range(rng.randint(1, 5))]
    lons = [((lagna_sign + rng.choice(houses)) % 12) * 30 + rng.uniform(0, 30) for _ in range(9)]
    for k, deg in EXALT.items():
        if rng.random() < 0.3:
            lons[it.PLANET_KEYS.index(k)] = deg + rng.uniform(-1.5, 1.5)
    lons[8] = (lons[7] + 180) % 360
    return {
        "lons": [round(x % 360, 6) for x in lons],
        "retro": [rng.random() < 0.2 for _ in range(9)],
        "lagna": round(lagna, 6),
        "is_day": rng.choice([True, False, None]),
        "gulika": rng.choice([None, round(rng.uniform(0, 360), 4)]),
        "mandi": rng.choice([None, round(lagna_sign * 30 + rng.choice(houses) * 30 + 1, 4)]),
        "dig": [rng.choice([None, round(rng.uniform(0, 60), 3)]) for _ in range(7)],
    }


def run(inp: dict):
    planets = {k: {"longitude": inp["lons"][j], "is_retrograde": inp["retro"][j]} for j, k in enumerate(it.PLANET_KEYS)}
    shadbala = {"planets": [
        {"key": k, "status": "ok", "ratio": 1.0, "breakdown": {"dig": inp["dig"][j]}}
        for j, k in enumerate(it.PLANET_KEYS[:7]) if inp["dig"][j] is not None
    ]}
    chart = it.build_chart(planets, {"longitude": inp["lagna"]}, shadbala, {"sequence": []}, NOW,
                           is_day=inp["is_day"], gulika_lon=inp["gulika"], mandi_lon=inp["mandi"])
    return _yogas_to_api(it.full_yoga_catalog(chart))


seen_keys: dict[str, int] = {}
rare: list[dict] = []
for _ in range(150000):
    inp = house_inputs()
    rows = run(inp)
    fresh = [r["key"] for r in rows if r["present"] and seen_keys.get(r["key"], 0) < 3]
    for r in rows:
        if r["present"]:
            seen_keys[r["key"]] = seen_keys.get(r["key"], 0) + 1
    if fresh:
        rare.append(inp)

cases = []
ever: set[str] = set()
all_keys: set[str] = set()
for i in range(4000 + len(rare)):
    inp = chart_inputs(i) if i < 4000 else rare[i - 4000]
    rows = run(inp)
    assert all(isinstance(r["present"], bool) for r in rows)
    all_keys.update(r["key"] for r in rows if r["nameEn"] != "Raja Yoga")
    ever.update(r["key"] for r in rows if r["present"])
    raja = [[n, r["key"], r["descEn"], r["descNe"]] if i < 100 else [n, r["key"]]
            for n, r in enumerate(rows) if r["nameEn"] == "Raja Yoga"]
    case = {**inp, "present": "".join("1" if r["present"] else "0" for r in rows), "raja": raja}
    if i < 300:
        case["kula"] = next(r["evaluation"] for r in rows if r["key"] == "kulavardhana")
    cases.append(case)
print("rows never present:", sorted(all_keys - ever))
dest = Path(__file__).resolve().parents[1] / "crates/jyotish/tests/fixtures/yoga_catalog.json"
dest.parent.mkdir(parents=True, exist_ok=True)
dest.write_text(json.dumps(cases, ensure_ascii=False, separators=(",", ":")))
print("wrote", dest, len(cases), "charts")
