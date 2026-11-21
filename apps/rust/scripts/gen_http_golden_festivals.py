#!/usr/bin/env python3
"""Golden HTTP responses for festival/holiday routes (FastAPI TestClient, Redis off).

Run from apps/api:

    REDIS_URL= ../../.venv/bin/python /path/to/festivals/scripts/gen_http_golden_festivals.py

Writes tests/fixtures/http_golden_festivals.json under this Rust workspace.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

os.environ.pop("REDIS_URL", None)
sys.path.insert(0, str(Path.cwd()))

import app.startup as startup  # noqa: E402
import app.response_cache as rc  # noqa: E402
from services.festivals import holiday_generator as hg  # noqa: E402

startup.ensure_swiss_ephemeris_files = lambda: None
startup.warm_holiday_cache = lambda: []

hg.clear_year_payload_memo()
hg.load_festivals_cached = lambda *a, **k: None
hg.save_festivals_cache = lambda *a, **k: None
hg.load_cached = lambda *a, **k: None
hg.save_cache = lambda *a, **k: None
hg.load_bs_festivals_cached = lambda *a, **k: None
hg.save_bs_festivals_cache = lambda *a, **k: None
hg.load_bs_cached = lambda *a, **k: None
hg.save_bs_cache = lambda *a, **k: None

# Disable on-disk response-cache persistence for routes that go through serve_cached_json.
rc.read_cached_bytes = lambda *a, **k: None
_orig_write = rc.write_cached_bytes
rc.write_cached_bytes = (
    lambda key, payload, **k: _orig_write(key, payload, persist=False, redis=False)
)

from fastapi.testclient import TestClient  # noqa: E402
from app.main import app  # noqa: E402

REQUESTS = [
    # High-traffic listings: Kathmandu / Pokhara / New York, BS and AD, languages.
    "/v1/nepal/festivals?year=2083&era=bs&language=ne&cv=6506&city_id=1283240",
    "/v1/nepal/festivals?year=2026&era=ad&city_id=1283240",
    "/v1/nepal/festivals?year=2083&era=bs&month=7&tradition=vaishnava&city_id=1283240",
    "/v1/nepal/festivals?year=2083&era=bs&month=7&language=en&city_id=5128581",
    "/v1/nepal/holidays?year=2083&era=bs&city_id=1283240",
    "/v1/nepal/holidays?year=2083&era=bs&language=ne&city_id=1282898",
    "/v1/nepal/holidays?year=2026&era=ad&month=10&city_id=5128581",
    # Upcoming: pinned from=, holidays_only, Pokhara.
    "/v1/nepal/festivals/upcoming?from=2026-10-20&days=90&limit=15&city_id=1283240",
    "/v1/nepal/festivals/upcoming?from=2026-10-20&days=120&limit=10&holidays_only=true&city_id=1282898",
    # BS-year festival/holiday payloads (include stamp fields).
    "/v1/festivals/bs/2083?city_id=1283240",
    "/v1/festivals/bs/2083?month=7&city_id=1282898",
    "/v1/holidays/2083?city_id=1283240",
    "/v1/holidays/2083?month=7&city_id=1282898",
    # Day pages: festival day (Dashain), multi-day Tihar, empty day, languages.
    "/v1/festivals/2082-06-14?era=bs&language=ne&cv=6506&city_id=1283240",
    "/v1/festivals/2026-10-20?era=ad&city_id=1283240",
    "/v1/festivals/2026-11-10?era=ad&language=en&city_id=1282898",
    "/v1/festivals/2083-07-10?era=bs&city_id=1283240",
    "/v1/festivals/2026-10-20?era=ad&city_id=5128581",
    # Special months: adhik-only and adhik+kshaya years, multiple cities.
    "/v1/nepal/special-months/2083?city_id=1283240",
    "/v1/nepal/special-months/2039?city_id=1283240",
    "/v1/nepal/special-months/2039?city_id=5128581",
    "/v1/nepal/special-months/2077?city_id=1282898",
    # Sankranti year + known sankranti day (Makara / Mesh).
    "/v1/nepal/sankranti/year/2026?city_id=1283240",
    "/v1/nepal/sankranti/year/2026?city_id=5128581",
    "/v1/nepal/sankranti/2083-01-01?era=bs&city_id=1283240",
    "/v1/nepal/sankranti/2026-04-14?era=ad&city_id=5128581",
    "/v1/nepal/sankranti/2026-01-14?era=ad&city_id=1283240",
    # Festival-shaped year summary.
    "/v1/nepal/panchanga/year/2083?city_id=1283240",
    # Error / edge cases.
    "/v1/nepal/festivals?year=2026&era=bc&city_id=1283240",
    "/v1/nepal/holidays?year=2083&era=xyz&city_id=1283240",
    "/v1/nepal/festivals?year=2083&era=bs&month=13&city_id=1283240",
    "/v1/nepal/festivals/upcoming?from=bad-date&city_id=1283240",
    "/v1/nepal/festivals/upcoming?from=2026-10-20&days=0&city_id=1283240",
    "/v1/nepal/festivals/upcoming?from=2026-10-20&limit=0&city_id=1283240",
    "/v1/festivals/not-a-date?era=bs&city_id=1283240",
    "/v1/nepal/sankranti/not-a-date?era=bs&city_id=1283240",
    "/v1/nepal/sankranti/2083-01-01?era=bbs&city_id=1283240",
    "/v1/festivals/bs/0?city_id=1283240",
    "/v1/holidays/0?city_id=1283240",
    "/v1/nepal/special-months/0?city_id=1283240",
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

dest = Path(__file__).resolve().parents[1] / "tests/fixtures/http_golden_festivals.json"
dest.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n")
print("wrote", dest)
