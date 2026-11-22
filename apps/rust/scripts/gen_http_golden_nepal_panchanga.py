#!/usr/bin/env python3
"""Golden HTTP responses for /v1/nepal/panchanga/{date_key} and /month (TestClient, Redis off).

Run from the Python app:

    cd apps/api && REDIS_URL= ../../.venv/bin/python ../rust/scripts/gen_http_golden_nepal_panchanga.py
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

D = "/v1/nepal/panchanga"
M = "/v1/nepal/panchanga/month"
REQUESTS = [
    f"{D}/2083-08-01?city_id=1283240",
    f"{D}/2083-08-01?city_id=1283240&format=raw",
    f"{D}/2083-08-01?city_id=1283240&format=canonical",
    f"{D}/2083-08-01?city_id=1283240&format=patro",
    f"{D}/2083-08-01?city_id=1283240&format=toyanath",
    f"{D}/2083-08-01?city_id=1283240&format=dayblock",
    f"{D}/2083-08-01?city_id=1283240&format=dayblock&locale=ne",
    f"{D}/2083-08-01?city_id=1283240&format=dayblock&locale=ne&output=text",
    f"{D}/2083-08-01?city_id=1283240&format=surya&variant=nepal_official",
    f"{D}/2083-08-01?city_id=1283240&format=toyanath&variant=toyanath",
    f"{D}/2083-08-01?city_id=1283240&format=raw&variant=surya",
    f"{D}/2083-08-01?city_id=1283240&format=dayblock&variant=surya",
    f"{D}/2082-06-24?city_id=1282898",
    f"{D}/2082-01-01?city_id=1283240&format=canonical",
    f"{D}/2026-10-17?era=ad&city_id=5128581",
    f"{D}/2026-04-14?era=ad&city_id=2643743&format=toyanath",
    f"{D}/2083-07-15?era=bs&city_id=1283240&format=raw",
    f"{D}/2081-11-30?city_id=1282898&format=canonical&language=ne",
    f"{D}/2083-13-01",
    f"{D}/hello",
    f"{D}/2083-08-01?format=html",
    f"{D}/2083-08-01?variant=x&locale=fr",
    f"{M}/2083/8?city_id=1283240",
    f"{M}/2083/8?city_id=1283240&format=raw",
    f"{M}/2083/8?city_id=1283240&format=surya",
    f"{M}/2083/8?city_id=1283240&format=canonical&full=true",
    f"{M}/2083/8?city_id=1283240&format=toyanath",
    f"{M}/2083/8?city_id=1283240&format=toyanath&full=true",
    f"{M}/2083/8?city_id=1283240&format=dayblock",
    f"{M}/2083/8?city_id=1283240&format=dayblock&locale=ne&output=text",
    f"{M}/2082/12?city_id=1282898&format=patro&variant=nepal_official",
    f"{M}/2082/1?city_id=5128581&format=surya&variant=toyanath",
    f"{M}/2084/3?city_id=2643743&format=raw&variant=surya",
    f"{M}/2083/13",
    f"{M}/0/1",
    f"{M}/2083/8?format=x",
    f"{M}/2083/8?full=maybe",
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

dest = Path(__file__).resolve().parents[1] / "tests/fixtures/http_golden_nepal_panchanga.json"
dest.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n")
print("wrote", dest)
