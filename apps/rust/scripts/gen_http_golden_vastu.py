#!/usr/bin/env python3
"""Golden HTTP responses for the seven /v1/vastu routes (FastAPI TestClient, Redis off).

GET  zones, zones/{granularity}/{id}, rooms, rooms/{subject}/detail
POST analyze, sketch, house-plan

Run from the Python app:

    cd apps/api && REDIS_URL= ../../.venv/bin/python ../rust/scripts/gen_http_golden_vastu.py

`--random N --seed S --out NAME` writes N fresh random house-plan / sketch /
analyze bodies instead (the temporary zz_verify fixture).
"""

from __future__ import annotations

import argparse
import json
import os
import random
import sys
from pathlib import Path

os.environ.pop("REDIS_URL", None)
sys.path.insert(0, str(Path.cwd()))
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
import app.response_cache as rc  # noqa: E402

rc.read_cached_bytes = lambda *a, **k: None
_orig_write = rc.write_cached_bytes
rc.write_cached_bytes = lambda key, payload, **k: _orig_write(
    key, payload, persist=False, redis=False
)

sys.path.insert(0, str(Path(__file__).resolve().parent))
from rust_divergences import apply as _apply_divergences  # noqa: E402

_apply_divergences()

V = "/v1/vastu"

EXTRA_POOL = [
    "living", "kitchen", "dining", "puja", "study", "office", "store", "laundry",
    "staircase", "garage", "guest", "family", "balcony", "courtyard", "garden",
    "servant", "gym", "library", "kitchen_dining",
]
SKETCH_EXTRAS = [k for k in EXTRA_POOL]


def site(w, d, unit="m", facing="east", **kw):
    out = {"plot_width": w, "plot_depth": d, "unit": unit, "facing": facing}
    out.update(kw)
    return out


def req(**kw):
    return kw


def fixed_cases() -> list[dict]:
    cases: list[dict] = []

    def get(path):
        cases.append({"method": "GET", "path": path})

    def post(path, body=None, raw=None):
        case = {"method": "POST", "path": path}
        if raw is not None:
            case["raw"] = raw
        else:
            case["json"] = body
        cases.append(case)

    # ── GET ────────────────────────────────────────────────────────────────
    get(f"{V}/zones")
    for kind in ("dir8", "dir16", "pada32", "inner4", "bogus"):
        get(f"{V}/zones?kind={kind}")
    get(f"{V}/zones/dir8/north")
    get(f"{V}/zones/dir8/center")
    get(f"{V}/zones/dir16/nne")
    get(f"{V}/zones/pada32/aditi")
    get(f"{V}/zones/inner4/aryama")
    get(f"{V}/zones/pada32/nothing")
    get(f"{V}/zones/dir32/north")
    get(f"{V}/rooms")
    get(f"{V}/rooms?subject=kitchen")
    get(f"{V}/rooms?subject=nothing")
    get(f"{V}/rooms?subject=")
    for subject in ("puja", "kitchen", "master_bedroom", "main_door", "living", "septic", "nothing"):
        get(f"{V}/rooms/{subject}/detail")

    # ── analyze ────────────────────────────────────────────────────────────
    post(f"{V}/analyze", {"site": site(40, 60, "ft"), "requirement": {}})
    post(f"{V}/analyze", {"site": site(5, 6), "requirement": req(bedrooms=4, extras=["living", "kitchen", "spa"])})
    post(f"{V}/analyze", {"site": site(12, 15), "requirement": req(bedrooms=2, master_bedroom_index=5, toilets=2, bathrooms=1, combined_toilet_bath=1)})
    post(f"{V}/analyze", {"site": site(15, 20, "ft"), "requirement": req(extras=["garage", "store", "bedroom", "toilet", "courtyard"])})
    post(f"{V}/analyze", {"site": {"plot_width": 0, "plot_depth": 10}, "requirement": {}})
    post(f"{V}/analyze", {"site": {"plot_depth": 10}, "requirement": {"mode": "loose"}})
    post(f"{V}/analyze", {"requirement": {}})
    post(f"{V}/analyze", None)
    post(f"{V}/analyze", raw="{not json")

    # ── sketch ─────────────────────────────────────────────────────────────
    post(f"{V}/sketch", {"plot_width": 12, "plot_depth": 15})
    post(f"{V}/sketch", {"plot_width": 9.144, "plot_depth": 18.288, "facing": "north", "plan": {"bedrooms": 4, "toilets": 2, "bathrooms": 1, "combined": 1, "storeys": 2}})
    post(f"{V}/sketch", {"plot_width": 20, "plot_depth": 25, "facing": "south", "plan": {"bedrooms": 5, "master_bedroom": 2, "extras": SKETCH_EXTRAS, "storeys": 3, "mode": "strict"}})
    post(f"{V}/sketch", {"plot_width": 6, "plot_depth": 8, "facing": "west", "plan": {"bedrooms": 3, "extras": ["living", "kitchen", "dining", "puja", "staircase", "garage"], "storeys": 2, "floors": {"puja": "first", "kitchen": "third", "garage": "first"}}})
    post(f"{V}/sketch", {"plot_width": 30, "plot_depth": 30, "plan": {"extras": ["courtyard", "garden", "balcony"], "combined": 2}})
    post(f"{V}/sketch", {"plot_width": 10.5, "plot_depth": 7.25, "plan": {"extras": ["spa", "living"]}})
    post(f"{V}/sketch", {"plot_width": 10, "plot_depth": 10, "plan": {"floors": {"sauna": "first"}}})
    post(f"{V}/sketch", {"plot_width": 1001, "plot_depth": 10})
    post(f"{V}/sketch", {"plot_width": 10, "plot_depth": 10, "facing": "up"})
    post(f"{V}/sketch", {"plot_width": "12", "plot_depth": 10, "plan": {"bedrooms": "2", "storeys": 4}})
    post(f"{V}/sketch", {"plot_width": 10, "plot_depth": 10, "plan": {"floors": {"puja": "basement"}, "mode": "balanced"}})

    # ── house-plan ─────────────────────────────────────────────────────────
    hp = f"{V}/house-plan"
    post(hp, {"site": site(40, 60, "ft"), "requirement": {}})
    post(hp, {"site": site(12, 15), "requirement": {}})
    for facing in ("north", "east", "south", "west"):
        post(hp, {"site": site(10, 14, facing=facing), "requirement": req(bedrooms=3, toilets=2, bathrooms=1)})
    post(hp, {"site": site(9, 8, facing="south"), "requirement": req(bedrooms=2)})
    post(hp, {"site": site(15, 20, facing="west"), "requirement": req(bedrooms=4, toilets=2, bathrooms=1, combined_toilet_bath=1, storeys=2, extras=["living", "kitchen", "dining", "puja", "study", "store"])})
    post(hp, {"site": site(18, 22, facing="north"), "requirement": req(bedrooms=5, master_bedroom_index=3, toilets=3, bathrooms=2, storeys=3, extras=["living", "kitchen", "dining", "puja", "garage", "garden", "gym", "library"], floors={"puja": "ground", "study": "first"})})
    post(hp, {"site": site(50, 70, "ft", facing="south"), "requirement": req(bedrooms=3, toilets=2, combined_toilet_bath=1, mode="strict")})
    post(hp, {"site": site(14, 14), "requirement": req(extras=["living", "kitchen_dining", "puja", "courtyard"], mode="balanced")})
    post(hp, {"site": site(25, 30, facing="east"), "requirement": req(bedrooms=4, toilets=2, bathrooms=2, extras=["living", "kitchen", "dining", "puja", "office", "laundry", "balcony", "family", "servant", "guest"], storeys=2)})
    post(hp, {"site": site(7, 9), "requirement": req(bedrooms=5, toilets=5, bathrooms=5, combined_toilet_bath=5)})
    post(hp, {"site": site(11.3, 13.7, facing="north"), "requirement": req(bedrooms=2, toilets=1, extras=["living", "kitchen", "staircase"], storeys=2)})
    post(hp, {"site": site(30, 40, "ft", facing="west", north_bearing=12.5, entrance_preference="ne", floors=2), "requirement": req(bedrooms=3, storeys=2)})
    post(hp, {"site": site(12, 15), "requirement": req(extras=["living", "spa"])})
    post(hp, {"site": site(12, 15, unit="yd"), "requirement": {}})
    post(hp, {"site": site(12, 15), "requirement": req(bedrooms=0, floors={"puja": "roof"})})
    post(hp, {"site": site(12, 15, north_bearing=360), "requirement": req(extras="living")})
    post(hp, {"site": site(12, 15), "requirement": req(bedrooms=2.5, toilets=True, storeys=2.0)})
    # Python bug fixed (rust_divergences.py #26): an extra listed twice gave two spaces
    # one id, and the band search deleted that dict key twice (KeyError -> 500).
    post(hp, {"site": site(30, 40, "ft"), "requirement": req(bedrooms="2", extras=["living", "living", "kitchen"])})
    # A 422 past GZipMiddleware's 1024-byte minimum comes back gzipped with Vary.
    post(hp, raw='{"site":{"plot_width":"abc","plot_depth":true,"unit":5,"floors":"2","entrance_preference":5,"north_bearing":null},"requirement":{"extras":[1,"a",null],"floors":[],"bedrooms":"x","mode":null}}')
    post(f"{V}/sketch", raw='{"plot_width":"1_2","plot_depth":"9.5","plan":{"bedrooms":"3.0","toilets":" 2 ","combined":"+1","storeys":true}}')
    post(f"{V}/sketch", {"plot_width": 10, "plot_depth": 10, "plan": {"extras": ["living", "living"]}})
    post(f"{V}/analyze", raw='{"a":1,}')
    return cases


def random_cases(n: int, seed: int) -> list[dict]:
    rng = random.Random(seed)
    cases: list[dict] = []
    for _ in range(n):
        kind = rng.choices(("hp", "sketch", "analyze"), weights=(6, 3, 1))[0]
        unit = rng.choice(("m", "ft"))
        lo, hi = (6, 32) if unit == "m" else (20, 100)
        w = round(rng.uniform(lo, hi), rng.choice((0, 1, 2)))
        d = round(rng.uniform(lo, hi), rng.choice((0, 1, 2)))
        facing = rng.choice(("north", "east", "south", "west"))
        extras = rng.sample(EXTRA_POOL, rng.randint(0, 9))
        if rng.random() < 0.8:
            for core in ("living", "kitchen", "dining", "puja"):
                if core not in extras and rng.random() < 0.7:
                    extras.append(core)
        storeys = rng.randint(1, 3)
        floors = {k: rng.choice(("ground", "first", "third", "any")) for k in rng.sample(EXTRA_POOL + ["bedroom", "toilet"], rng.randint(0, 3))}
        if kind == "sketch":
            body = {
                "plot_width": w if unit == "m" else round(w * 0.3048, 3),
                "plot_depth": d if unit == "m" else round(d * 0.3048, 3),
                "facing": facing,
                "plan": {
                    "bedrooms": rng.randint(1, 5), "toilets": rng.randint(1, 5),
                    "bathrooms": rng.randint(0, 5), "combined": rng.randint(0, 3),
                    "master_bedroom": rng.randint(1, 5), "extras": extras,
                    "mode": rng.choice(("strict", "flexible")), "storeys": storeys,
                    "floors": floors,
                },
            }
            cases.append({"method": "POST", "path": f"{V}/sketch", "json": body})
            continue
        requirement = {
            "bedrooms": rng.randint(1, 5), "master_bedroom_index": rng.randint(1, 5),
            "toilets": rng.randint(1, 4), "bathrooms": rng.randint(0, 3),
            "combined_toilet_bath": rng.randint(0, 2), "extras": extras,
            "mode": rng.choice(("strict", "balanced", "flexible")), "storeys": storeys,
            "floors": floors,
        }
        body = {"site": site(w, d, unit, facing), "requirement": requirement}
        cases.append({"method": "POST", "path": f"{V}/house-plan" if kind == "hp" else f"{V}/analyze", "json": body})
    return cases


KEEP = (
    "cache-control",
    "cdn-cache-control",
    "vary",
    "content-type",
    "x-siddhanta",
    "x-ayanamsha",
)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--random", type=int, default=0)
    ap.add_argument("--seed", type=int, default=1)
    ap.add_argument("--out", default="http_golden_vastu")
    args = ap.parse_args()
    cases = random_cases(args.random, args.seed) if args.random else fixed_cases()

    client = TestClient(app, raise_server_exceptions=False)
    out = []
    for case in cases:
        headers = {"Accept-Encoding": "gzip"}
        if case["method"] == "GET":
            response = client.get(case["path"], headers=headers)
            body_in = None
        elif "raw" in case:
            headers["Content-Type"] = "application/json"
            response = client.post(case["path"], content=case["raw"], headers=headers)
            body_in = case["raw"]
        elif case["json"] is None:
            response = client.post(case["path"], headers=headers)
            body_in = None
        else:
            body_in = json.dumps(case["json"])
            headers["Content-Type"] = "application/json"
            response = client.post(case["path"], content=body_in, headers=headers)
        out.append(
            {
                "method": case["method"],
                "path": case["path"],
                "request_body": body_in,
                "status": response.status_code,
                "headers": {k: response.headers[k] for k in KEEP if k in response.headers},
                "body": response.text,
            }
        )
        print(response.status_code, len(response.text), case["method"], case["path"])

    dest = Path(__file__).resolve().parents[1] / f"tests/fixtures/{args.out}.json"
    dest.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n")
    print("wrote", dest)


if __name__ == "__main__":
    main()
