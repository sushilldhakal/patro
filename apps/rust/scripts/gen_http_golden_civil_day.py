#!/usr/bin/env python3
"""Golden HTTP responses for day routes on Julian and BCE days (FastAPI TestClient, Redis off).

Run from the Python app:

    cd apps/api && REDIS_URL= ../../.venv/bin/python ../rust/scripts/gen_http_golden_civil_day.py
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

sys.path.insert(0, str(Path(__file__).resolve().parent))
from rust_divergences import apply as _apply_divergences  # noqa: E402

_apply_divergences()

REQUESTS = [
    "/v1/panchanga/at-time?jd=1705060.5&clock=10:30&city_id=1283240",
    "/v1/panchanga/at-time?jd=1705060.5&clock=05:10&city_id=1283240&era=bs",
    "/v1/panchanga/at-time?jd=1705060.5&clock=23:59:30&city_id=1283240&era=ad",
    "/v1/panchanga/at-time?era=ad&year=1500&month=1&day=1&clock=21:00&city_id=5128581",
    "/v1/panchanga/at-time?era=bbs&year=100&month=5&day=10&clock=12:00&city_id=1282898",
    "/v1/panchanga/at-time?datetime=-0044-03-15T10:30:00&city_id=1283240",
    "/v1/convert/bs-to-ad/13-01-03",
    "/v1/convert/bs-to-ad/1556-10-05",
    "/v1/convert/bs-to-ad/-100-05-10",
    "/v1/calendar/header/13/1?city_id=1283240",
    "/v1/calendar/header/1556/10",
    "/v1/panchanga/-0044-03-15?era=ad&city_id=1283240",
    "/v1/panchanga/-0044-03-15?era=ad&festivals=true&detail=true&slim=true&cv=6506&city_id=1283240&language=ne",
    "/v1/panchanga/1500-01-01?era=ad&city_id=1283240&detail=false",
    "/v1/panchanga/1582-10-03?era=ad&city_id=1282898&detail=false",
    "/v1/panchanga/1000-07-04?era=ad&city_id=5128581&slim=true",
    "/v1/panchanga/13-01-03?era=bs&city_id=1283240&detail=false",
    "/v1/panchanga/45-03-15?era=bc&city_id=1283240&detail=false",
    "/v1/panchanga/jd/1705060.5?era=bbs&detail=false",
    "/v1/panchanga/jd/1705060.5?era=bs&detail=false&slim=true",
    "/v1/panchanga?era=bbs&year=100&month=5&day=10&city_id=5128581&detail=false",
    "/v1/panchanga?era=bs&year=1000&month=12&day=30&city_id=1283240",
    "/v1/panchanga/-3101-02-18?era=ad&city_id=1283240&detail=false",
    "/v1/panchanga/-0044-03-15?era=ad&reference=midnight&city_id=1283240",
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

dest = Path(__file__).resolve().parents[1] / "tests/fixtures/http_golden_civil_day.json"
dest.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n")
print("wrote", dest)
