#!/usr/bin/env python3
"""Golden HTTP responses for /v1/nepal/sait/* from the FastAPI app.

Run from apps/api:
  REDIS_URL= ../../.venv/bin/python ../rust/scripts/gen_http_golden_sait.py
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

# Bypass response cache persistence for deterministic builder output.
rc.read_cached_bytes = lambda *a, **k: None
_orig_write = rc.write_cached_bytes
rc.write_cached_bytes = lambda key, payload, **k: _orig_write(
    key, payload, persist=False, redis=False
)

REQUESTS = [
    # metadata
    "/v1/nepal/sait/categories?era=bs&language=ne&cv=6506",
    "/v1/nepal/sait/years?era=ad&language=en&cv=6506",
    "/v1/nepal/sait/about?era=bs&language=ne",
    "/v1/nepal/sait/vivah/about?era=bs&language=ne",
    "/v1/nepal/sait/annaprasan/about?era=ad&language=en",
    "/v1/nepal/sait/unknown/about?era=bs&language=ne",
    # month-all: Kathmandu / Pokhara / New York; adhik-year month (2083 Jestha≈2)
    "/v1/nepal/sait/2083/month/7?era=bs&language=ne&cv=6506&city_id=1283240",
    "/v1/nepal/sait/2083/month/7?era=bs&language=ne&city_id=1282898",
    "/v1/nepal/sait/2082/month/12?era=bs&language=en&city_id=5128581",
    "/v1/nepal/sait/2083/month/2?era=bs&language=ne&city_id=1283240",
    "/v1/nepal/sait/2083/month/1?era=ad&language=en&city_id=1283240",
    "/v1/nepal/sait/2083/month/13?era=bs&city_id=1283240",
    "/v1/nepal/sait/2083/month/7?era=bs&city_id=abc",
    # year listings across cities / categories (incl. non-muhurta vas)
    "/v1/nepal/sait/2083/vivah?era=bs&language=ne&cv=6506&city_id=1283240",
    "/v1/nepal/sait/2083/vivah?era=bs&language=ne&city_id=1282898",
    "/v1/nepal/sait/2082/vivah?era=bs&language=en&city_id=5128581",
    "/v1/nepal/sait/2083/griha-pravesh?era=bs&language=ne&city_id=1283240",
    "/v1/nepal/sait/2083/rudri-jurne?era=bs&city_id=1283240",
    "/v1/nepal/sait/2083/agni-jurne?era=ad&language=en&city_id=1282898",
    "/v1/nepal/sait/2083/annaprasan?era=bs&city_id=1283240",
    "/v1/nepal/sait/2083/unknown?era=bs&city_id=1283240",
    # detail + exclude + nakshatra modes
    "/v1/nepal/sait/2083/vivah/detail?era=bs&language=ne&city_id=1283240",
    "/v1/nepal/sait/2083/vivah/detail?era=bs&language=ne&city_id=1283240&exclude=nakshatra,tithi",
    "/v1/nepal/sait/2083/vivah/detail?era=bs&city_id=1282898&exclude=vara,yoga",
    "/v1/nepal/sait/2083/bratabandha/detail?era=bs&city_id=1283240&nakshatra_mode=nepali",
    "/v1/nepal/sait/2083/bratabandha/detail?era=bs&city_id=1283240&nakshatra_mode=liberal",
    "/v1/nepal/sait/2083/griha-aarambha/detail?era=bs&language=en&city_id=5128581",
    "/v1/nepal/sait/2083/rudri-jurne/detail?era=bs&city_id=1283240",
    "/v1/nepal/sait/0/vivah/detail?era=bs&city_id=1283240",
    "/v1/nepal/sait/2083/vivah/detail?era=bs&city_id=1283240&siddhanta=abc",
    "/v1/nepal/sait/2083/bratabandha/detail?era=bs&city_id=1283240&nakshatra_mode=bogus",
    # personalize
    "/v1/nepal/sait/2083/vivah/personalize?era=bs&language=ne&city_id=1283240&janma_nakshatra=4&janma_rashi=2",
    "/v1/nepal/sait/2083/vivah/personalize?era=bs&language=en&city_id=5128581&birth_era=ad&birth_year=1990&birth_month=5&birth_day=15&birth_clock=10:30",
    "/v1/nepal/sait/2083/annaprasan/personalize?era=bs&city_id=1283240&birth_era=bs&birth_year=2082&birth_month=10&birth_day=5&gender=female",
    "/v1/nepal/sait/2083/griha-pravesh/personalize?era=bs&city_id=1282898&janma_nakshatra=10&janma_rashi=5",
    "/v1/nepal/sait/2083/vivah/personalize?era=bs&city_id=1283240",
    "/v1/nepal/sait/2083/vivah/personalize?era=bs&city_id=1283240&janma_nakshatra=x&janma_rashi=2",
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

dest = Path(__file__).resolve().parents[1] / "tests/fixtures/http_golden_sait.json"
dest.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n")
print("wrote", dest)
