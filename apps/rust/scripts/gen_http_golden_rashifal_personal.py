#!/usr/bin/env python3
"""Golden HTTP responses for the janma and personal rashifal routes (FastAPI TestClient, Redis off).

Run from the Python app:

    cd apps/api && REDIS_URL= ../../.venv/bin/python ../rust/scripts/gen_http_golden_rashifal_personal.py
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

J = "/v1/panchanga/rashifal/janma"
P = "/v1/panchanga/rashifal/personal"
KTM_BIRTH = "birth_lat=27.7&birth_lon=85.3&birth_tz=Asia/Kathmandu&birth_era=bs&birth_year=2050&birth_month=5&birth_day=10&birth_clock=14:30"
NY_BIRTH = "birth_lat=40.71&birth_lon=-74.01&birth_tz=America/New_York&birth_era=ad&birth_year=1990&birth_month=5&birth_day=10&birth_clock=06:05"
OLD_BIRTH = "birth_lat=28.2&birth_lon=83.98&birth_tz=Asia/Kathmandu&birth_era=ad&birth_year=1980&birth_month=11&birth_day=2&birth_clock=23:40"
ISO_BIRTH = "birth_lat=51.5&birth_lon=-0.12&birth_tz=Europe/London&birth=1975-03-30T01:30"
REQUESTS = [
    f"{J}?birth_tz=Asia/Kathmandu&birth_era=bs&birth_year=2050&birth_month=5&birth_day=10&birth_clock=14:30",
    f"{J}?birth_tz=America/New_York&birth_era=ad&birth_year=1990&birth_month=5&birth_day=10&birth_clock=06:05",
    f"{J}?birth=1990-05-10T14:30&birth_tz=America/New_York",
    f"{J}?birth=1985-01-01T00:00",
    f"{J}?birth_era=bs&birth_year=2081&birth_month=1&birth_day=1",
    f"{J}?birth_era=bs&birth_year=2081&birth_month=1&birth_day=1&era=bs&language=en",
    f"{J}?birth=1990-05-10T14:30:00%2B05:45",
    f"{J}",
    f"{J}?birth_year=abc&birth_month=1&birth_day=1",
    f"{J}?birth_tz=Mars/Base&birth_era=ad&birth_year=1990&birth_month=5&birth_day=10&birth_clock=10:00",
    f"{J}?birth_era=ad&birth_year=1990&birth_month=5&birth_day=10&birth_clock=25:00",
    f"{J}?birth=1990-13-01T10:00",
    f"{J}?birth_era=xx&birth_year=1990&birth_month=5&birth_day=10",
    f"{P}?date=2026-11-21&era=ad&period=daily&cv=6506&city_id=1283240&{KTM_BIRTH}",
    f"{P}?date=2026-11-21&era=ad&period=weekly&cv=6506&city_id=1283240&{KTM_BIRTH}",
    f"{P}?date=2026-11-21&era=ad&period=monthly&cv=6506&city_id=1283240&{KTM_BIRTH}",
    f"{P}?date=2026-11-21&era=ad&period=yearly&cv=6506&city_id=1283240&{KTM_BIRTH}",
    f"{P}?date=2026-12-02&era=ad&period=daily&city_id=5128581&language=en&{NY_BIRTH}",
    f"{P}?date=2027-02-14&era=ad&period=monthly&city_id=2643743&{NY_BIRTH}",
    f"{P}?date=2026-11-21&era=ad&period=daily&city_id=1282898&{OLD_BIRTH}",
    f"{P}?date=2026-11-21&era=ad&period=yearly&city_id=1282898&{OLD_BIRTH}",
    f"{P}?date=2026-09-09&era=ad&period=weekly&city_id=2643743&{ISO_BIRTH}",
    f"{P}?era=bs&year=2083&month=8&day=5&period=daily&city_id=1283240&{KTM_BIRTH}",
    f"{P}?date=2083-08-05&period=daily&{KTM_BIRTH}",
    f"{P}?date=2026-11-21&era=ad&city_id=1283240&birth_era=bs&birth_year=2050&birth_month=5&birth_day=10",
    f"{P}?date=2026-11-21&era=ad&period=hourly&city_id=1283240&birth_lon=85.3&birth_year=x",
    f"{P}?date=2026-11-21&era=ad&city_id=1283240&birth_lat=abc&birth_lon=85.3&birth_era=bs&birth_year=2050&birth_month=5&birth_day=10",
    f"{P}?date=2026-11-21&era=ad&city_id=1283240&birth_lat=27.7&birth_lon=85.3",
    f"{P}?date=abc&era=ad&city_id=1283240&{KTM_BIRTH}",
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

dest = Path(__file__).resolve().parents[1] / "tests/fixtures/http_golden_rashifal_personal.json"
dest.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n")
print("wrote", dest)
