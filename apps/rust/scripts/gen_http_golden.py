#!/usr/bin/env python3
"""Golden HTTP responses from the FastAPI app (in-process TestClient, Redis off).

    cd apps/api && REDIS_URL= ../../.venv/bin/python ../rust/scripts/gen_http_golden.py

Writes apps/rust/tests/fixtures/http_golden.json: for each request the status, the
headers a client sees (cache, CORS, calculation) and the decompressed body text.
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

# Bypass the response cache: every Kathmandu-equivalent observer shares one cache key,
# so a cached body carries whichever caller's `location` block filled it first. The
# golden must be what the builders compute, not what an earlier request left behind.
rc.read_cached_bytes = lambda *a, **k: None
_orig_write = rc.write_cached_bytes
rc.write_cached_bytes = lambda key, payload, **k: _orig_write(key, payload, persist=False, redis=False)

REQUESTS = [
    "/v1/panchanga/2083/8?era=bs&language=ne&cv=6506&city_id=1283240",
    "/v1/panchanga/2083/1?era=bs&language=ne&cv=6506&city_id=1283240",
    "/v1/panchanga/2083/2?era=bs&language=ne&city_id=1282898",
    "/v1/panchanga/2082/12?era=bs&language=en&city_id=5128581",
    "/v1/panchanga/2080/6?era=bs&language=ne&exclude_international=true",
    "/v1/panchanga/2083/7",
    "/v1/panchanga/2083/13?era=bs",
    "/v1/panchanga/2050/3?era=bs&lat=27.70012&lon=85.33333",
    "/health",
]
KEEP = ("cache-control", "cdn-cache-control", "vary", "content-type", "x-siddhanta", "x-ayanamsha")

client = TestClient(app)
out = []
for path in REQUESTS:
    r = client.get(path, headers={"Accept-Encoding": "gzip"})
    out.append({
        "path": path,
        "status": r.status_code,
        "headers": {k: r.headers[k] for k in KEEP if k in r.headers},
        "body": r.text,
    })
    print(r.status_code, len(r.text), path)
dest = Path(__file__).resolve().parents[1] / "tests/fixtures/http_golden.json"
dest.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n")
print("wrote", dest)
