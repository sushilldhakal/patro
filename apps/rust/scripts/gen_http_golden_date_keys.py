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

# Valid pre-1582 day payloads (/v1/panchanga/-0044-03-15, 1500-01-01, bbs 1-01-01) are left out:
# the pre-Gregorian daily build is not ported yet (501), tracked in README.
REQUESTS = ['/v1/panchanga/2083-13-01?city_id=1283240&detail=true&slim=true',
    '/v1/festivals/2083-13-01?era=ad&city_id=1283240',
    '/v1/nepal/sankranti/2083-13-01?era=bs',
    '/v1/panchanga/element/tithi/day/2083-13-01?city_id=1283240',
    '/v1/panchanga/2083-02-32?city_id=1283240&detail=true&slim=true',
    '/v1/festivals/2083-02-32?era=ad&city_id=1283240',
    '/v1/nepal/sankranti/2083-02-32?era=bs',
    '/v1/panchanga/element/tithi/day/2083-02-32?city_id=1283240',
    '/v1/panchanga/२०८३-०८-१५?city_id=1283240&detail=true&slim=true',
    '/v1/festivals/२०८३-०८-१५?era=ad&city_id=1283240',
    '/v1/nepal/sankranti/२०८३-०८-१५?era=bs',
    '/v1/panchanga/element/tithi/day/२०८३-०८-१५?city_id=1283240',
    '/v1/panchanga/abc?city_id=1283240&detail=true&slim=true',
    '/v1/festivals/abc?era=ad&city_id=1283240',
    '/v1/nepal/sankranti/abc?era=bs',
    '/v1/panchanga/element/tithi/day/abc?city_id=1283240',
    '/v1/panchanga/0-01-01?city_id=1283240&detail=true&slim=true',
    '/v1/festivals/0-01-01?era=ad&city_id=1283240',
    '/v1/nepal/sankranti/0-01-01?era=bs',
    '/v1/panchanga/element/tithi/day/0-01-01?city_id=1283240',
    '/v1/festivals/-0044-03-15?era=ad&city_id=1283240',
    '/v1/nepal/sankranti/-0044-03-15?era=bs',
    '/v1/panchanga/element/tithi/day/-0044-03-15?city_id=1283240',
    '/v1/panchanga/2026-02-30?city_id=1283240&detail=true&slim=true',
    '/v1/festivals/2026-02-30?era=ad&city_id=1283240',
    '/v1/nepal/sankranti/2026-02-30?era=bs',
    '/v1/panchanga/element/tithi/day/2026-02-30?city_id=1283240',
    '/v1/festivals/1500-01-01?era=ad&city_id=1283240',
    '/v1/nepal/sankranti/1500-01-01?era=bs',
    '/v1/panchanga/element/tithi/day/1500-01-01?city_id=1283240',
    '/v1/panchanga/17054-01-01?city_id=1283240&detail=true&slim=true',
    '/v1/festivals/17054-01-01?era=ad&city_id=1283240',
    '/v1/nepal/sankranti/17054-01-01?era=bs',
    '/v1/panchanga/element/tithi/day/17054-01-01?city_id=1283240',
    '/v1/panchanga/2083-08-15?inputEra=ad&city_id=1283240',
    '/v1/festivals/2083-08-15?era=bs&city_id=1282898',
    '/v1/panchanga/element/nakshatra/day/2083-08-15?era=bs&city_id=1283240',
    '/v1/nepal/sankranti/2026-12-16?era=ad']

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

dest = Path(__file__).resolve().parents[1] / "tests/fixtures/http_golden_date_keys.json"
dest.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n")
print("wrote", dest)
