#!/usr/bin/env python3
"""Golden HTTP responses for /v1/kundali/detail (FastAPI TestClient, Redis off, clock pinned).

"Now" (the running dasha, how many cycles, Saturn's transit) is pinned to NOW;
tests/http_golden_kundali_detail.rs pins the Rust server to the same moment.

Run from the Python app:

    cd apps/api && REDIS_URL= ../../.venv/bin/python ../rust/scripts/gen_http_golden_kundali_detail.py
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

os.environ.pop("REDIS_URL", None)
sys.path.insert(0, str(Path.cwd()))
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
import app.response_cache as rc  # noqa: E402

# Keep request-time route output (no Redis/disk payload reuse) while preserving
# route behavior and headers.
rc.read_cached_bytes = lambda *a, **k: None
_orig_write = rc.write_cached_bytes
rc.write_cached_bytes = lambda key, payload, **k: _orig_write(
    key, payload, persist=False, redis=False
)

from datetime import datetime, timezone  # noqa: E402

import engine.jyotish.kundali_detail as kd  # noqa: E402
sys.path.insert(0, str(Path(__file__).resolve().parent))
from rust_divergences import apply as _apply_divergences  # noqa: E402

_apply_divergences()

NOW = datetime(2026, 11, 15, 6, 30, 0, 123456, tzinfo=timezone.utc)


class _FixedNow(datetime):
    @classmethod
    def now(cls, tz=None):  # noqa: D102
        return NOW.astimezone(tz) if tz else NOW.replace(tzinfo=None)


kd.datetime = _FixedNow

D = "/v1/kundali/detail"
REQUESTS = [
    f"{D}?jd=2449220.5&clock=14:30&city_id=1283240",
    f"{D}?datetime=1990-05-10T06:05&city_id=5128581",
    f"{D}?datetime=1985-01-01T00:00:00%2B05:30&city_id=1283240",
    f"{D}?era=bs&year=2050&month=5&day=10&clock=14:30&city_id=1283240",
    f"{D}?era=bs&year=2083&month=8&day=1&clock=04:10&city_id=1282898&language=en",
    f"{D}?jd=2444543.5&clock=23:40&city_id=1282898",
    f"{D}?datetime=1975-03-30T01:30&city_id=2643743",
    f"{D}?datetime=1948-09-12T05:20&city_id=1283240",
    f"{D}?datetime=2001-02-28T19:05&city_id=2643743",
    f"{D}?datetime=2026-10-01T12:00&city_id=1283240",
    f"{D}?datetime=1962-07-04T16:45:30Z&city_id=5128581",
    f"{D}?jd=2451545.5&clock=00:00:30&lat=27.7&lon=85.3",
    f"{D}?datetime=1990-05-10T23:45&city_id=1283240",
    f"{D}?datetime=1990-05-11T01:45&city_id=1283240",
    f"{D}?jd=2449220.5",
    f"{D}?jd=abc&clock=10:00",
    f"{D}?datetime=1990-13-10T06:05&city_id=1283240",
]

KEEP = (
    "cache-control",
    "cdn-cache-control",
    "vary",
    "content-type",
    "x-siddhanta",
    "x-ayanamsha",
)

client = TestClient(app)
out = []
for path in REQUESTS:
    response = client.get(path, headers={"Accept-Encoding": "gzip"})
    out.append(
        {
            "path": path,
            "status": response.status_code,
            "headers": {k: response.headers[k] for k in KEEP if k in response.headers},
            "body": response.text,
        }
    )
    print(response.status_code, len(response.text), path)

dest = Path(__file__).resolve().parents[1] / "tests/fixtures/http_golden_kundali_detail.json"
dest.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n")
print("wrote", dest)
