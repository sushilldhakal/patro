#!/usr/bin/env python3
"""Golden HTTP responses for BS month grids with ?clock= (FastAPI TestClient, Redis off).

Run from the Python app:

    cd apps/api && REDIS_URL= ../../.venv/bin/python ../rust/scripts/gen_http_golden_month_clock.py
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
sys.path.insert(0, str(Path(__file__).resolve().parent))
from rust_divergences import apply as _apply_divergences  # noqa: E402

_apply_divergences()
import app.response_cache as rc  # noqa: E402

# Keep request-time route output (no Redis/disk payload reuse) while preserving
# route behavior and headers.
rc.read_cached_bytes = lambda *a, **k: None
_orig_write = rc.write_cached_bytes
rc.write_cached_bytes = lambda key, payload, **k: _orig_write(
    key, payload, persist=False, redis=False
)

REQUESTS = [
    # Month grid with ?clock= (build_month_calendar_at_clock).
    "/v1/panchanga/2083/7?clock=06:00&city_id=1283240",
    "/v1/panchanga/2083/1?clock=12:00&city_id=1283240&exclude_international=true",
    "/v1/panchanga/2082/12?clock=18:30:15&city_id=1282898",
    "/v1/panchanga/2083/3?clock=05:15&city_id=1283240&full=true",
    "/v1/panchanga/2083/9?clock=21:00&city_id=5128581&full=true&slim=true",
    "/v1/panchanga/2083/11?clock=02:30&city_id=5128581",
    "/v1/panchanga/2040/5?clock=10:00&city_id=1283240",
    # Empty clock is the udaya grid; bad clocks.
    "/v1/panchanga/2083/7?clock=&city_id=1283240",
    "/v1/panchanga/2083/7?clock=25:00&city_id=1283240",
    "/v1/panchanga/2083/7?clock=noon&city_id=1283240",
    "/v1/panchanga/2083/7?clock=7&city_id=1283240",
    # AD month refuses clock mode; pre-1582 BS years.
    "/v1/panchanga/ad/2026/7?clock=06:00&city_id=1283240",
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

dest = Path(__file__).resolve().parents[1] / "tests/fixtures/http_golden_month_clock.json"
dest.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n")
print("wrote", dest)
