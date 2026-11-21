#!/usr/bin/env python3
"""Golden HTTP responses for the nepal/patro route (FastAPI TestClient, Redis off).

Run from the Python app:

    cd apps/api && REDIS_URL= ../../.venv/bin/python ../rust/scripts/gen_http_golden_nepal_patro.py
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

N = "/v1/nepal/patro"
REQUESTS = [
    f"{N}/2083/8?cv=6506",
    f"{N}/2083/1?city_id=1283240",
    f"{N}/2082/12?city_id=1282898&format=patro&locale=ne",
    f"{N}/2084/5?city_id=5128581&era=bs&language=en",
    f"{N}/2081/3?city_id=2643743",
    f"{N}/2083/13",
    f"{N}/0/1",
    f"{N}/2083/8?format=xx&locale=fr",
    f"{N}/abc/1",
    f"{N}/2083/8?format=canonical&city_id=1283240",
    f"{N}/2083/8?format=surya&city_id=1282898",
    f"{N}/2083/2?format=toyanath&city_id=1283240",
    f"{N}/2082/7?format=toyanath&city_id=5128581&era=bs",
    f"{N}/2083/8?format=dayblock&city_id=1283240",
    f"{N}/2083/8?format=dayblock&locale=ne&city_id=1283240",
    f"{N}/2083/2?format=dayblock&locale=ne&output=text&city_id=1282898",
    f"{N}/2081/5?format=dayblock&output=text&city_id=2643743",
    f"{N}/2083/8?format=patro&output=text",
    f"{N}/2083/11?format=dayblock&city_id=5128581",
    f"{N}/ad/2026/4?city_id=1283240",
    f"{N}/ad/2025/12?city_id=5128581",
    f"{N}/ad/2026/13",
    f"{N}/ad/x/1",
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

dest = Path(__file__).resolve().parents[1] / "tests/fixtures/http_golden_nepal_patro.json"
dest.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n")
print("wrote", dest)
