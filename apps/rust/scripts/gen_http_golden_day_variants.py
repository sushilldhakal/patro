#!/usr/bin/env python3
"""Golden HTTP responses for day routes with reference=midnight / civil=true (FastAPI TestClient, Redis off).

Run from the Python app:

    cd apps/api && REDIS_URL= ../../.venv/bin/python ../rust/scripts/gen_http_golden_day_variants.py
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

REQUESTS = [
    # reference=midnight (build_panchanga_civil_day).
    f"/v1/panchanga/2026-11-01?{_APP_Q}&reference=midnight",
    f"/v1/panchanga/2026-10-21?{_APP_Q}&reference=midnight",
    "/v1/panchanga/2026-11-08?era=ad&city_id=1283240&reference=midnight&detail=false",
    "/v1/panchanga/2026-11-08?era=ad&city_id=1283240&reference=midnight&festivals=false",
    "/v1/panchanga/2083-07-03?era=bs&city_id=1282898&reference=midnight&festivals=true",
    "/v1/panchanga/jd/2461111.5?era=ad&city_id=1283240&reference=midnight&slim=true",
    # New York: an ordinary day, and both DST transitions (divergence #13).
    "/v1/panchanga/2026-07-08?era=ad&city_id=5128581&reference=midnight",
    "/v1/panchanga/2026-03-08?era=ad&city_id=5128581&reference=midnight&festivals=true",
    "/v1/panchanga/2026-11-01?era=ad&city_id=5128581&reference=midnight&slim=true",
    # civil=true (civil_timeline).
    f"/v1/panchanga/2026-11-01?{_APP_Q}&civil=true",
    "/v1/panchanga/2026-04-14?era=ad&city_id=1283240&civil=true&detail=false",
    "/v1/panchanga/2026-03-08?era=ad&city_id=5128581&civil=true",
    "/v1/panchanga/2026-11-01?era=ad&city_id=5128581&civil=true&detail=false",
    "/v1/panchanga/2026-06-21?era=ad&city_id=1282898&civil=true&reference=midnight",
    # Before 1582: civil is ignored; midnight is refused (501).
    "/v1/panchanga/jd/2268923.5?era=ad&city_id=1283240&civil=true&detail=false",
    "/v1/panchanga/jd/1705060.5?era=ad&city_id=1283240&reference=midnight",
    "/v1/panchanga/jd/2268923.5?era=ad&city_id=1283240&reference=midnight",
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

dest = Path(__file__).resolve().parents[1] / "tests/fixtures/http_golden_day_variants.json"
dest.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n")
print("wrote", dest)
