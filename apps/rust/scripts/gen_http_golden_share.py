#!/usr/bin/env python3
"""Golden HTTP responses for GET /share/panchanga (FastAPI TestClient, Redis off).

The crawler HTML for a shared /panchanga link. Every request names its `date`, so
nothing depends on "today". The Host header decides og:url's host (www twin).

Run from the Python app:

    cd apps/api && REDIS_URL= FRONTEND_URL= ../../.venv/bin/python ../rust/scripts/gen_http_golden_share.py
"""

from __future__ import annotations

import argparse
import json
import os
import random
import sys
from pathlib import Path

os.environ.pop("REDIS_URL", None)
os.environ.pop("FRONTEND_URL", None)
sys.path.insert(0, str(Path.cwd()))
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
sys.path.insert(0, str(Path(__file__).resolve().parent))
from rust_divergences import apply as _apply_divergences  # noqa: E402

_apply_divergences()

S = "/share/panchanga"
CITIES = (1283240, 1282898, 5128581, 2643743)

FIXED = [
    (f"{S}?city=1283240&date=2026-11-15", None),
    (f"{S}?city=1283240&date=2026-11-15&card=periods", None),
    (f"{S}?city=1283240&date=2026-11-15&card=d1", None),
    (f"{S}?city=1282898&date=2025-04-14&place=Pokhara%20%26%20Lekhnath", None),
    (f"{S}?city=5128581&date=2024-02-29&time=06:30", None),
    (f"{S}?city=2643743&date=2026-06-21&card=periods&place=%3Cb%3E'London'%3C/b%3E", None),
    (f"{S}?lat=27.7&lon=85.3&date=2026-01-01", None),
    (f"{S}?lat=40.71&lon=-74.0&tz=America/New_York&date=2026-03-08&card=d1", None),
    (f"{S}?city=99999999&lat=28.2&lon=83.98&date=2026-08-15", None),
    (f"{S}?city=99999999&date=2026-08-15", None),
    (f"{S}?lat=95&lon=85&date=2026-08-15", None),
    (f"{S}?tz=Not/AZone&date=2026-08-15", None),
    (f"{S}?date=2026-11-15", None),
    (f"{S}?date=2026-11-15&city=1283240", "vedicpatro.com"),
    (f"{S}?date=2026-11-15&city=1283240", "www.vedicpatro.com:443"),
    (f"{S}?date=2026-11-15&city=1283240", "api.vedicpatro.com"),
    (f"{S}?city=abc&date=2026-11-15", None),
    (f"{S}?lat=abc&date=2026-11-15", None),
    (f"{S}?city=1283240&date=2026-11-15&card=", None),
    (f"{S}?city=1283240&date=1990-05-10", None),
    (f"{S}?city=1283240&date=2090-12-31&card=periods", None),
]

KEEP = ("cache-control", "cdn-cache-control", "vary", "content-type", "x-siddhanta", "x-ayanamsha")


def random_requests(n: int, seed: int) -> list[tuple[str, str | None]]:
    rng = random.Random(seed)
    out = []
    for _ in range(n):
        y = rng.randint(1700, 2150)
        m = rng.randint(1, 12)
        d = rng.randint(1, 28)
        parts = [f"date={y:04d}-{m:02d}-{d:02d}"]
        if rng.random() < 0.7:
            parts.append(f"city={rng.choice(CITIES)}")
        else:
            parts.append(f"lat={rng.uniform(-60, 65):.3f}&lon={rng.uniform(-170, 170):.3f}")
        if rng.random() < 0.5:
            parts.append(f"card={rng.choice(['periods', 'd1', 'day'])}")
        if rng.random() < 0.3:
            parts.append("place=" + rng.choice(["Home", "%E0%A4%95%E0%A4%BE%E0%A4%A0%E0%A4%AE%E0%A4%BE%E0%A4%A1%E0%A5%8C%E0%A4%81", "A%20%26%20B"]))
        rng.shuffle(parts)
        out.append((f"{S}?{'&'.join(parts)}", rng.choice([None, None, "vedicpatro.com", "www.vedicpatro.com"])))
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--random", type=int, default=0)
    ap.add_argument("--seed", type=int, default=1)
    ap.add_argument("--out", default="http_golden_share")
    args = ap.parse_args()
    reqs = random_requests(args.random, args.seed) if args.random else FIXED
    client = TestClient(app, raise_server_exceptions=False)
    out = []
    for path, host in reqs:
        headers = {"Accept-Encoding": "gzip"}
        if host:
            headers["Host"] = host
        r = client.get(path, headers=headers)
        out.append({"path": path, "host": host, "status": r.status_code,
                    "headers": {k: r.headers[k] for k in KEEP if k in r.headers}, "body": r.text})
        print(r.status_code, len(r.text), host or "", path)
    dest = Path(__file__).resolve().parents[1] / f"tests/fixtures/{args.out}.json"
    dest.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n")
    print("wrote", dest)


if __name__ == "__main__":
    main()
