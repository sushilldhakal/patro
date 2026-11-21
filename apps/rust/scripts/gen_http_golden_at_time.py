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

REQUESTS = ['/v1/panchanga/at-time?jd=2461365.5&clock=10:30&cv=6506&city_id=1283240',
    '/v1/panchanga/at-time?jd=2461365.5&clock=05:10&cv=6506&city_id=1283240',
    '/v1/panchanga/at-time?jd=2461365.5&clock=23:59:30&city_id=1283240',
    '/v1/panchanga/at-time?jd=2461365.5&clock=00:00&city_id=1283240&era=bs&language=ne',
    '/v1/panchanga/at-time?jd=2461400.5&clock=18:45&era=ad&language=en&city_id=1283240',
    '/v1/panchanga/at-time?jd=2461290.5&clock=12:00&city_id=1282898',
    '/v1/panchanga/at-time?jd=2461365.5&clock=09:15&city_id=5128581&era=ad&language=en',
    '/v1/panchanga/at-time?jd=2461500.5&clock=21:00&city_id=5128581',
    '/v1/panchanga/at-time?datetime=2026-11-21T10:30:00&city_id=1283240',
    '/v1/panchanga/at-time?datetime=2026-11-21T10:30:00%2B05:45&city_id=1283240',
    '/v1/panchanga/at-time?datetime=2026-11-21T04:45:00Z&city_id=1283240',
    '/v1/panchanga/at-time?datetime=2026-11-21%2006:00&city_id=1283240',
    '/v1/panchanga/at-time?datetime=2027-04-14T14:20:30.250&city_id=1283240',
    '/v1/panchanga/at-time?datetime=2026-11-21&city_id=1283240',
    '/v1/panchanga/at-time?era=bs&year=2083&month=8&day=5&clock=10:30&city_id=1283240',
    '/v1/panchanga/at-time?era=bs&inputEra=ad&year=2026&month=11&day=21&clock=16:00&city_id=1283240',
    '/v1/panchanga/at-time?era=bs&year=2083&month=13&day=5&clock=10:30&city_id=1283240',
    '/v1/panchanga/at-time?jd=2461365.5&city_id=1283240',
    '/v1/panchanga/at-time?jd=2461365.5&clock=25:00&city_id=1283240',
    '/v1/panchanga/at-time?jd=2461365.5&clock=ab:30&city_id=1283240',
    '/v1/panchanga/at-time?jd=2461365.5&clock=10&city_id=1283240',
    '/v1/panchanga/at-time?datetime=2026-13-01T10:00&city_id=1283240',
    '/v1/panchanga/at-time?datetime=21-11-2026&city_id=1283240',
    '/v1/panchanga/at-time?datetime=2026-11-21T10:30:00.12&city_id=1283240',
    '/v1/panchanga/at-time?jd=abc&clock=10:00&city_id=1283240',
    '/v1/panchanga/at-time?datetime=2026-02-30T10:00&city_id=1283240',
    '/v1/panchanga/at-time?datetime=2026-11-21T10&city_id=5128581',
    '/v1/panchanga/at-time?jd=2461365.5&clock=10:30&era=xx&city_id=1283240']

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

dest = Path(__file__).resolve().parents[1] / "tests/fixtures/http_golden_at_time.json"
dest.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n")
print("wrote", dest)
