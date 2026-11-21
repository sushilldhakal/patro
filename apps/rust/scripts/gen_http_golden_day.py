#!/usr/bin/env python3
"""Golden HTTP responses for day-group routes (FastAPI TestClient, Redis off).

Run from the Python app:

    cd apps/api && REDIS_URL= ../../.venv/bin/python ../rust/scripts/gen_http_golden_day.py
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

_APP_Q = "era=ad&festivals=true&detail=true&slim=true&cv=6506&city_id=1283240&language=ne"
_FESTIVAL_DAYS = [
    "2026-10-20",
    "2026-10-21",
    "2026-11-08",
    "2026-11-10",
    "2026-04-14",
    "2026-08-28",
    "2026-03-03",
    "2026-09-05",
]

REQUESTS = [
    # Realistic day-page requests from app usage.
    "/v1/panchanga/2026-03-12?era=ad&festivals=true&detail=true&slim=true&cv=6506&city_id=1283240&language=ne",
    "/v1/panchanga/2083-11-26?era=bs&festivals=true&detail=true&slim=true&cv=6506&city_id=1283240&language=ne",
    # Festival days (enrichment + festival_saits).
    *[f"/v1/panchanga/{d}?{_APP_Q}" for d in _FESTIVAL_DAYS],
    "/v1/panchanga/2083-07-03?era=bs&festivals=true&detail=true&slim=true&cv=6506&city_id=1282898&language=en",
    # Query and JD forms.
    "/v1/panchanga?era=bs&year=2083&month=11&day=26&city_id=1283240&detail=false",
    "/v1/panchanga/jd/2461111.5?era=ad&city_id=1282898&detail=false",
    # Clock-sensitive aliases pinned through ?jd= (deterministic).
    "/v1/panchanga/today?era=bs&jd=2461111.5&city_id=1283240&detail=false",
    "/v1/panchanga/tomorrow?era=bs&jd=2461111.5&city_id=1283240&detail=false",
    # Additional city coverage.
    "/v1/panchanga/2026-11-19?era=ad&city_id=5128581&detail=false&slim=true",
    # Header and conversion helpers.
    "/v1/calendar/header/2083/11?city_id=1283240",
    "/v1/calendar/header/2083/13?city_id=1283240",
    "/v1/convert/ad-to-bs/2026-03-12",
    "/v1/convert/bs-to-ad/2083-11-26",
    "/v1/convert/bs-to-ad/not-a-date",
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

dest = Path(__file__).resolve().parents[1] / "tests/fixtures/http_golden_day.json"
dest.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n")
print("wrote", dest)
