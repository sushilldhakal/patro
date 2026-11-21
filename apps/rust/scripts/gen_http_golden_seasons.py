#!/usr/bin/env python3
"""Golden HTTP responses for /v1/seasons/tropical (FastAPI TestClient, Redis off, clock pinned).

The page reads "now" (which season is current, which crossings come next); it is
pinned to NOW here and tests/http_golden_seasons.rs pins the Rust server to the
same moment.

    cd apps/api && REDIS_URL= ../../.venv/bin/python ../rust/scripts/gen_http_golden_seasons.py
"""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

os.environ.pop("REDIS_URL", None)
sys.path.insert(0, str(Path.cwd()))
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
import engine.calendar.tropical_seasons as ts  # noqa: E402

NOW = datetime(2026, 11, 15, 6, 30, 0, 123456, tzinfo=timezone.utc)


class _FixedNow(datetime):
    @classmethod
    def now(cls, tz=None):  # noqa: D102
        return NOW.astimezone(tz) if tz else NOW.replace(tzinfo=None)


ts.datetime = _FixedNow

S = "/v1/seasons/tropical"
REQUESTS = [
    S,
    f"{S}?city_id=1283240",
    f"{S}?city_id=5128581",
    f"{S}?city_id=2147714",
    f"{S}?city_id=2643743&language=en",
    f"{S}?lat=-33.9&lon=18.4&timezone=Africa/Johannesburg",
    f"{S}?lat=27.7&lon=85.3",
    f"{S}?era=bs",
]

KEEP = ("cache-control", "cdn-cache-control", "vary", "content-type", "x-siddhanta", "x-ayanamsha")

client = TestClient(app)
out = []
for path in REQUESTS:
    response = client.get(path, headers={"Accept-Encoding": "gzip"})
    out.append({
        "path": path,
        "status": response.status_code,
        "headers": {k: response.headers[k] for k in KEEP if k in response.headers},
        "body": response.text,
    })
    print(response.status_code, len(response.text), path)

dest = Path(__file__).resolve().parents[1] / "tests/fixtures/http_golden_seasons.json"
dest.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n")
print("wrote", dest)
