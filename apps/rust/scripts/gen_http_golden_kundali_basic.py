#!/usr/bin/env python3
"""Golden HTTP responses for vimshottari and planetary positions (FastAPI TestClient, Redis off).

Run from the Python app:

    cd apps/api && REDIS_URL= ../../.venv/bin/python ../rust/scripts/gen_http_golden_kundali_basic.py
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

V = "/v1/kundali/vimshottari"
P = "/v1/planetary/positions"
REQUESTS = [
    f"{V}?jd=2449220.5&clock=14:30&city_id=1283240",
    f"{V}?datetime=1990-05-10T06:05&city_id=5128581",
    f"{V}?datetime=1985-01-01T00:00:00%2B05:30&city_id=1283240&cycles=2",
    f"{V}?era=bs&year=2050&month=5&day=10&clock=14:30&city_id=1283240&cycles=3",
    f"{V}?jd=2444543.5&clock=23:40&city_id=1282898",
    f"{V}?datetime=1975-03-30T01:30&city_id=2643743",
    f"{V}?jd=2449220.5&clock=14:30&cycles=0",
    f"{V}?jd=2449220.5&clock=14:30&cycles=9",
    f"{V}?jd=2449220.5",
    f"{P}?jd=2461365.5&clock=10:00&city_id=1283240",
    f"{P}?datetime=2026-11-21T18:45&city_id=5128581",
    f"{P}?era=bs&year=2083&month=8&day=5&clock=05:00&city_id=1282898&language=en",
    f"{P}?datetime=2027-06-21T12:00:00Z&city_id=2643743",
    f"{P}?jd=abc&clock=10:00",
    "/v1/shadbala?jd=2449220.5&clock=14:30&city_id=1283240",
    "/v1/shadbala?datetime=1990-05-10T06:05&city_id=5128581",
    "/v1/shadbala?era=bs&year=2050&month=5&day=10&clock=14:30&city_id=1283240",
    "/v1/shadbala?jd=2444543.5&clock=23:40&city_id=1282898",
    "/v1/shadbala?datetime=1975-03-30T01:30&city_id=2643743",
    "/v1/shadbala?jd=2461365.5&clock=04:00&city_id=1283240",
    "/v1/shadbala?datetime=2026-11-21T12:00:00Z&city_id=1850147",
    "/v1/kundali/yogas/reference?v=3",
    "/v1/kundali/yogas/reference?id=46",
    "/v1/kundali/yogas/reference?id=75-106",
    "/v1/kundali/yogas/reference?id=999",
    "/v1/kundali/yogas/reference?q=SUN",
    "/v1/kundali/yogas/reference?q=%25",
    "/v1/kundali/yogas/reference?q=%E0%A4%B8%E0%A5%82%E0%A4%B0%E0%A5%8D%E0%A4%AF",
    "/v1/kundali/reference/bhava?v=2",
    "/v1/kundali/2083-08-05?era=bs&city_id=1283240",
    "/v1/kundali/2026-11-21?era=ad&city_id=5128581",
    "/v1/kundali/2083-01-01?city_id=1282898",
    "/v1/kundali/2026-11-21?era=bc",
    "/v1/kundali/2083-13-01?era=bs",
    "/v1/kundali/dasha/expand?lord=jupiter&start=2020-04-23T20:44:04.283502%2B00:00&end=2036-04-23T17:51:16.283502%2B00:00",
    "/v1/kundali/dasha/expand?lord=moon&start=1993-08-21T08:45:00Z&end=1995-04-24T19:14:04.283502Z",
    "/v1/kundali/dasha/expand?lord=moon&start=2025-12-14T04:53:20.375589%2B05:45&end=2035-12-14T15:05:20.375589%2B05:45",
    "/v1/kundali/dasha/expand?lord=mars&start=2026-10-14T13:44:20%2B05:30&end=2027-05-15T15:08:02%2B05:45",
    "/v1/kundali/dasha/expand?lord=siddha&start=2020-01-01T00:00:00&end=2027-01-01T00:00:00&system=yogini",
    "/v1/kundali/dasha/expand?lord=pluto&start=2020-01-01&end=2021-01-01",
    "/v1/kundali/dasha/expand?lord=sun&start=bad&end=2021-01-01",
    "/v1/kundali/dasha/expand?lord=sun",
    "/v1/kundali/milan?boy_era=bs&boy_year=2050&boy_month=5&boy_day=10&boy_clock=14:30&girl_era=bs&girl_year=2052&girl_month=1&girl_day=3&girl_clock=06:15",
    "/v1/kundali/milan?boy_datetime=1990-05-10T06:05&boy_timezone=America/New_York&girl_datetime=1992-11-02T23:40&girl_timezone=Asia/Kathmandu&lang=en",
    "/v1/kundali/milan?boy_jd=2449220.5&boy_clock=14:30&boy_lat=27.7&boy_lon=85.3&girl_jd=2449900.5&girl_clock=08:00&girl_lat=51.5&girl_lon=-0.12&girl_timezone=Europe/London",
    "/v1/kundali/milan?boy_jd=2449220.5&boy_clock=14:30&girl_jd=2449220.5&girl_clock=14:30",
    "/v1/kundali/milan?boy_jd=2449220.5&boy_clock=14:30",
    "/v1/kundali/milan?girl_jd=2449220.5&girl_clock=14:30",
    "/v1/kundali/milan?boy_year=0&boy_month=13&girl_jd=x",
    "/v1/kundali/milan?boy_jd=2449220.5&boy_clock=14:30&girl_jd=2449220.5&girl_clock=10:00&girl_timezone=Mars/Base",
    "/v1/kundali/milan?boy_jd=2449220.5&girl_jd=2449220.5&girl_clock=10:00",
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

dest = Path(__file__).resolve().parents[1] / "tests/fixtures/http_golden_kundali_basic.json"
dest.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n")
print("wrote", dest)
