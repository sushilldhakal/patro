#!/usr/bin/env python3
"""Golden HTTP responses for the gochar routes (FastAPI TestClient, Redis off).

Run from the Python app:

    cd apps/api && REDIS_URL= ../../.venv/bin/python ../rust/scripts/gen_http_golden_gochar.py
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

G = "/v1/nepal/gochar"
REQUESTS = [
    f"{G}/2083-08-05?era=bs&city_id=1283240",
    f"{G}/2026-11-21?era=ad&city_id=1283240&upcoming=true",
    f"{G}/2083-01-01?era=bs&language=en&city_id=1282898",
    f"{G}/2026-07-04?era=ad&city_id=5128581",
    f"{G}/2027-03-15?era=ad&city_id=2643743&upcoming=true&cv=6506",
    f"{G}/2083-08-05?city_id=1283240",
    f"{G}/jd/2461365.5?city_id=1283240",
    f"{G}/jd/2461500.25?city_id=5128581&upcoming=true",
    f"{G}/year/2083?city_id=1283240",
    f"{G}/year/2082?city_id=2643743",
    f"{G}/ingress?from=2026-11-01&to=2026-11-30&era=ad&level=patro&city_id=1283240",
    f"{G}/ingress?from=2083-08-01&to=2083-08-29&era=bs&level=patro&city_id=1283240",
    f"{G}/ingress?from=2026-01-01&to=2027-12-31&era=ad&level=rashi",
    f"{G}/ingress?from=2026-11-01&to=2026-11-15&era=ad&level=pada&city_id=5128581",
    f"{G}/ingress?from=2026-11-01&to=2026-12-31&era=ad&level=nakshatra&grahas=sun,mars,rahu",
    f"{G}/ingress?from=2026-01-01&to=2026-12-31&era=ad&level=udayast&city_id=2643743",
    f"{G}/ingress?from=2026-11-01&to=2026-11-30&level=pada&grahas=moon",
    f"{G}/ingress?from=2026-11-30&to=2026-11-01&era=ad",
    f"{G}/ingress?from=2026-11-01&to=2026-11-30&grahas=pluto,sun,xx",
    f"{G}/ingress?from=2026-11-01&level=hour",
    f"{G}/ingress?from=abc&to=2026-11-30&era=ad",
    f"{G}/2083-13-05?era=bs",
    f"{G}/abc?era=ad",
    f"{G}/jd/xyz",
    f"{G}/year/0",
    f"{G}/2026-11-21?era=ad&upcoming=maybe",
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

dest = Path(__file__).resolve().parents[1] / "tests/fixtures/http_golden_gochar.json"
dest.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n")
print("wrote", dest)
