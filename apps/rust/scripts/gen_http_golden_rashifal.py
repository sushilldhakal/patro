#!/usr/bin/env python3
"""Golden HTTP responses for the rashifal routes (FastAPI TestClient, Redis off).

Run from the Python app:

    cd apps/api && REDIS_URL= ../../.venv/bin/python ../rust/scripts/gen_http_golden_rashifal.py
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

BASE = "/v1/panchanga/rashifal"
REQUESTS = [
    f"{BASE}?date=2026-11-21&era=ad&period=daily&cv=6506&city_id=1283240",
    f"{BASE}?date=2026-11-21&era=ad&period=weekly&cv=6506&city_id=1283240",
    f"{BASE}?date=2026-11-21&era=ad&period=monthly&cv=6506&city_id=1283240",
    f"{BASE}?date=2026-11-21&era=ad&period=yearly&cv=6506&city_id=1283240",
    f"{BASE}?date=2027-01-03&era=ad&period=daily&cv=6506&city_id=1283240&language=en",
    f"{BASE}?date=2026-06-21&era=ad&period=daily&cv=6506&city_id=1282898",
    f"{BASE}?date=2026-12-24&era=ad&period=weekly&city_id=5128581",
    f"{BASE}?date=2026-03-20&era=ad&period=daily&city_id=2643743&language=en",
    f"{BASE}?date=2026-07-01&era=ad&period=monthly&city_id=2643743",
    f"{BASE}?era=bs&language=ne&year=2083&month=8&day=5&period=daily&city_id=1283240",
    f"{BASE}?era=bs&language=en&year=2083&month=1&day=1&period=monthly&city_id=1283240",
    f"{BASE}?era=bs&inputEra=bs&date=2082-12-30&period=yearly&city_id=1282898",
    f"{BASE}?date=2083-08-05&period=daily",
    f"{BASE}?era=ad&jd=2461400.5&period=weekly&city_id=1283240",
    f"{BASE}?era=bs&jd=2461400.5&date=2083-01-01&period=daily&city_id=1283240",
    f"{BASE}?date=2083-08-05&jd=abc&city_id=1283240",
    f"{BASE}?date=2083-08-05&year=0&month=13&city_id=1283240",
    f"{BASE}?date=2083-08-05&jd=x&period=hourly&city_id=1283240",
    f"{BASE}?date=2083-08-05&era=bs&year=2083&month=9&city_id=1283240",
    f"{BASE}?era=bs&year=2083&month=2&day=40&city_id=1283240",
    f"{BASE}?date=2027-04-14&era=ad&period=daily&cv=6506&city_id=1283240",
    f"{BASE}?date=2026-11-21&era=ad&period=hourly&city_id=1283240",
    f"{BASE}?date=2026-13-01&era=ad&period=daily&city_id=1283240",
    f"{BASE}?date=abc&era=ad&city_id=1283240",
    f"{BASE}?date=2026-11-21&era=xx&city_id=1283240",
    f"{BASE}?date=2026-11-21&era=ad&period=daily&lat=27.7&lon=85.3&tz=Asia/Kathmandu",
    f"{BASE}?date=2026-11-21&era=ad&period=daily&lat=64.1&lon=-21.9&tz=Atlantic/Reykjavik",
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

dest = Path(__file__).resolve().parents[1] / "tests/fixtures/http_golden_rashifal.json"
dest.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n")
print("wrote", dest)
