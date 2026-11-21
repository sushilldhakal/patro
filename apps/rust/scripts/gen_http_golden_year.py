#!/usr/bin/env python3
"""Golden HTTP responses for the year and full-month routes (FastAPI TestClient, Redis off).

Run from the Python app:

    cd apps/api && REDIS_URL= ../../.venv/bin/python ../rust/scripts/gen_http_golden_year.py
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

REQUESTS = [
    "/v1/panchanga/2083/8?full=true&city_id=1283240",
    "/v1/panchanga/2083/8?full=true&slim=true&city_id=1283240&cv=6506",
    "/v1/panchanga/2082/12?full=true&slim=true&era=bs&language=ne&city_id=1282898",
    "/v1/panchanga/2083/1?full=true&exclude_international=true&city_id=5128581&era=bs&language=en",
    "/v1/panchanga/year/2083?wheel=true&language=ne&cv=6506&city_id=1283240",
    "/v1/panchanga/year/2081?wheel=true&language=en&era=bs&city_id=2643743",
    "/v1/panchanga/year/2083?city_id=1283240",
    "/v1/panchanga/year/2083/sun?city_id=1283240",
    "/v1/panchanga/year/2080/sun?city_id=5128581",
    "/v1/panchanga/year/2084/sun",
    "/v1/panchanga/year/abc?city_id=1283240",
    "/v1/panchanga/year/0?city_id=1283240",
    "/v1/panchanga/year/20000?city_id=1283240",
    "/v1/panchanga/year/4000000?era=bbs",
    "/v1/panchanga/year/2083?wheel=maybe",
    "/v1/panchanga/year/2083/sun?era=xx",
    "/v1/panchanga/ad/2026/11?city_id=1283240",
    "/v1/panchanga/ad/2027/4?city_id=1283240&cv=6506&era=ad&language=en",
    "/v1/panchanga/ad/2026/12?full=true&slim=true&city_id=5128581",
    "/v1/panchanga/ad/2025/1?exclude_international=true&city_id=2643743",
    "/v1/panchanga/ad/2024/2?city_id=1282898&era=ad&language=ne",
    "/v1/panchanga/ad/0/5",
    "/v1/panchanga/ad/2026/13",
    "/v1/panchanga/ad/2026/5?clock=10:00",
    "/v1/panchanga/ad/abc/1",
    "/v1/panchanga/bc/0/1",
    "/v1/panchanga/bc/100/13",
    "/v1/panchanga/bc/x/1",
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

dest = Path(__file__).resolve().parents[1] / "tests/fixtures/http_golden_year.json"
dest.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n")
print("wrote", dest)
