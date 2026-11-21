#!/usr/bin/env python3
"""Golden HTTP responses for ayanamsha= on the routes that take it (clock pinned).

"Now" (the running dasha, how many cycles, Saturn's transit) is pinned to NOW;
tests/http_golden_ayanamsha.rs pins the Rust server to the same moment.

Run from the Python app:

    cd apps/api && REDIS_URL= ../../.venv/bin/python ../rust/scripts/gen_http_golden_ayanamsha.py
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

REQUESTS = [
    # Under the Surya Siddhanta (the default) ayanamsha= is read but ignored:
    # the siddhanta has one ayanamsha of its own.
    "/v1/panchanga/at-time?jd=2461365.5&clock=10:30&city_id=1283240&ayanamsha=raman",
    "/v1/panchanga/at-time?jd=2461365.5&clock=10:30&city_id=1283240&ayanamsha=bogus",
    "/v1/panchanga/rashifal?date=2026-11-21&era=ad&period=daily&city_id=1283240&ayanamsha=kp",
    "/v1/panchanga/rashifal/janma?birth_tz=Asia/Kathmandu&birth_era=bs&birth_year=2050&birth_month=5&birth_day=10&birth_clock=14:30&ayanamsha=true_citra",
    "/v1/kundali/vimshottari?jd=2449220.5&clock=14:30&city_id=1283240&ayanamsha=lahiri",
    "/v1/planetary/positions?jd=2461365.5&clock=10:00&city_id=1283240&ayanamsha=raman",
    "/v1/shadbala?jd=2449220.5&clock=14:30&city_id=1283240&ayanamsha=kp",
    "/v1/kundali/2083-08-05?era=bs&city_id=1283240&ayanamsha=nepal",
    "/v1/kundali/milan?boy_era=bs&boy_year=2050&boy_month=5&boy_day=10&boy_clock=14:30&girl_era=bs&girl_year=2052&girl_month=1&girl_day=3&girl_clock=06:15&ayanamsha=raman",
    "/v1/kundali/detail?jd=2449220.5&clock=14:30&city_id=1283240&ayanamsha=true_pushya",
    "/v1/kundali/detail?jd=2449220.5&clock=14:30&city_id=1283240&ayanamsha=lahiri&siddhanta=surya_siddhanta",
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

dest = Path(__file__).resolve().parents[1] / "tests/fixtures/http_golden_ayanamsha.json"
dest.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n")
print("wrote", dest)
