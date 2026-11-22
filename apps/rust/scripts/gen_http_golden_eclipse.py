#!/usr/bin/env python3
"""Golden HTTP responses for the eclipse route (FastAPI TestClient, Redis off).

Run from the Python app:

    cd apps/api && REDIS_URL= ../../.venv/bin/python ../rust/scripts/gen_http_golden_eclipse.py
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

E = "/v1/nepal/eclipse"
REQUESTS = [
    f"{E}/solar/year/2083?era=bs&year=2083&language=ne&city_id=1283240",
    f"{E}/lunar/year/2083?era=bs&year=2083&city_id=1283240",
    f"{E}/lunar/year/2026?era=ad&city_id=1283240",
    f"{E}/solar/year/2027?era=ad&year=2027&city_id=5128581&language=en",
    f"{E}/solar/year/2024?era=ad&city_id=5128581",
    f"{E}/lunar/year/2025?era=ad&city_id=2643743",
    f"{E}/solar/year/2090",
    f"{E}/lunar/year/2081?city_id=1282898&cv=6506",
    f"{E}/moon/year/2083",
    f"{E}/solar/year/0",
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

dest = Path(__file__).resolve().parents[1] / "tests/fixtures/http_golden_eclipse.json"
dest.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n")
print("wrote", dest)
