#!/usr/bin/env python3
"""Golden HTTP responses for catalog routes from the FastAPI app.

Run from the Python API directory:
    REDIS_URL= .venv/bin/python /path/to/rust/scripts/gen_http_golden_catalog.py

Writes `tests/fixtures/http_golden_catalog.json` with status, selected headers,
and the decompressed UTF-8 response body.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from urllib.parse import urlencode

os.environ.pop("REDIS_URL", None)
sys.path.insert(0, str(Path.cwd()))

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
import app.response_cache as rc  # noqa: E402

# Bypass response cache so each request records fresh builder output.
rc.read_cached_bytes = lambda *a, **k: None
_orig_write = rc.write_cached_bytes
rc.write_cached_bytes = lambda key, payload, **k: _orig_write(
    key, payload, persist=False, redis=False
)


def path(base: str, **query: object) -> str:
    if not query:
        return base
    return f"{base}?{urlencode(query, doseq=True)}"


REQUESTS = [
    # Meta
    path("/meta/capabilities"),
    path("/meta/capabilities", era="ad", language="en", cv=6506),
    path("/about"),
    # Cities
    path("/v1/cities/search", q="kat", limit=10, language="ne", cv=6506),
    path("/v1/nepal/cities/search", q="pok", limit=5, country="NP"),
    path("/v1/cities/search", q="new", country="US", limit=5),
    path("/v1/cities/search", q="zzzznohit", limit=10),
    path("/v1/cities/nearest", lat=27.7172, lon=85.3240),
    path("/v1/nepal/cities/nearest", lat=28.2096, lon=83.9856, country="NP"),
    path("/v1/cities/nearest", lat=40.7128, lon=-74.0060, country="US"),
    path("/v1/cities/nearest", lat=27.7172, lon=85.3240, country="ZZ"),
    path("/v1/cities/popular"),
    path("/v1/nepal/cities/popular"),
    # Documents
    path("/v1/documents"),
    path("/v1/documents", language="en", cv=6506),
    path("/v1/documents/bhagavad-gita"),
    path("/v1/documents/sri-rudram"),
    path("/v1/documents/not-a-slug"),
    path("/v1/documents/bhagavad-gita/chapters/1"),
    path("/v1/documents/bhagavad-gita/chapters/1", limit=5),
    path("/v1/documents/bhagavad-gita/chapters/1", limit=5, cursor=50, direction="next"),
    path("/v1/documents/bhagavad-gita/chapters/1", limit=5, cursor=50, direction="prev"),
    path("/v1/documents/bhagavad-gita/chapters/1", limit=5, verse="1.10"),
    path("/v1/documents/bhagavad-gita/chapters/1", direction="sideways"),
    path("/v1/documents/bhagavad-gita/chapters/999"),
    path("/v1/documents/sri-rudram/chapters/1"),
    # Veda detail routes
    path("/v1/veda/details/devata/values"),
    path("/v1/veda/details/rishi/values", slug="rigveda"),
    path("/v1/veda/details/chhanda/values", slug="atharvaveda"),
    path("/v1/veda/details/devata", value="वाचस्पतिः", slug="atharvaveda", limit=3),
    path("/v1/veda/details/rishi", value="अथर्वा", slug="atharvaveda", limit=3, offset=2),
    path("/v1/veda/details/svara", value="मेधा जनक", slug="atharvaveda", limit=2),
    path("/v1/veda/details/unknown/values"),
    path("/v1/veda/daily", date="2024-06-01"),
    path("/v1/veda/daily", date="2024-12-15"),
    # Panchanga elements
    path("/v1/panchanga/elements"),
    path(
        "/v1/panchanga/element/tithi/day/2083-08-15",
        era="bs",
        language="ne",
        cv=6506,
        city_id=1283240,
    ),
    path(
        "/v1/panchanga/element/chandra-rashi/day/2026-05-12",
        era="ad",
        language="en",
        cv=6506,
        city_id=5128581,
    ),
    path("/v1/panchanga/element/nakshatra/day/2083-01-01", era="bs", city_id=1282898),
    path("/v1/panchanga/element/unknown/day/2083-08-15", era="bs", city_id=1283240),
    path("/v1/panchanga/element/tithi/day/not-a-date", era="ad", city_id=1283240),
    path("/v1/panchanga/element/tithi/spans", era="bs", year=2083, month=8, city_id=1283240),
    path(
        "/v1/panchanga/element/nakshatra/spans",
        era="bs",
        year=2083,
        month=8,
        city_id=1282898,
    ),
    path(
        "/v1/panchanga/element/yoga/spans",
        start_jd=2461500,
        end_jd=2461530,
        city_id=5128581,
    ),
    path(
        "/v1/panchanga/element/karana/spans",
        start_jd=2461500,
        end_jd=2461505,
        city_id=1283240,
    ),
    path(
        "/v1/panchanga/element/chandra-rashi/spans",
        era="bs",
        year=2082,
        month=12,
        city_id=1283240,
    ),
    path("/v1/panchanga/element/lagna/spans", era="bs", year=2083, month=8, city_id=1283240),
    path("/v1/panchanga/element/tithi/spans", city_id=1283240),
    path(
        "/v1/panchanga/element/tithi/spans",
        start_jd=2461500,
        end_jd=2462005,
        city_id=1283240,
    ),
    path("/v1/panchanga/element/tithi/month/2083/8", city_id=1283240),
    path("/v1/panchanga/element/chandra-rashi/month/2083/8", city_id=1282898),
    path("/v1/panchanga/element/lagna/month/2083/8", city_id=1283240),
    path("/v1/panchanga/element/tithi/month/2083/13", city_id=1283240),
    path("/v1/panchanga/element/unknown/month/2083/8", city_id=1283240),
    # Extra hard cases: other cities/eras/languages, adhik-adjacent BS month,
    # festival-season day, and signed-JD span bounds.
    path(
        "/v1/panchanga/element/tithi/day/2082-05-15",
        era="bs",
        language="en",
        cv=6506,
        city_id=5128581,
    ),
    path(
        "/v1/panchanga/element/yoga/day/2025-10-20",
        era="ad",
        language="ne",
        city_id=1283240,
    ),
    path(
        "/v1/panchanga/element/karana/spans",
        era="bs",
        year=2080,
        month=5,
        city_id=1282898,
        language="ne",
        cv=6506,
    ),
    path(
        "/v1/panchanga/element/nakshatra/month/2082/12",
        city_id=5128581,
        language="en",
    ),
    path(
        "/v1/panchanga/element/tithi/spans",
        start_jd=2461389.5,
        end_jd=2461389.5,
        city_id=1283240,
    ),
    path("/v1/documents/rigveda"),
    path("/v1/documents/rigveda/chapters/1", limit=3, verse="1.1.1"),
    path("/v1/veda/details/devata", value="अग्निः", slug="rigveda", limit=2),
    path("/v1/veda/daily", date="2023-01-01"),
    path("/v1/cities/search", q="कठ", limit=5, country="NP"),
    path("/v1/cities/nearest", lat=-33.8688, lon=151.2093),
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
output = []
for req in REQUESTS:
    response = client.get(req, headers={"Accept-Encoding": "gzip"})
    output.append(
        {
            "path": req,
            "status": response.status_code,
            "headers": {key: response.headers[key] for key in KEEP if key in response.headers},
            "body": response.text,
        }
    )
    print(response.status_code, len(response.text), req)

dest = Path(__file__).resolve().parents[1] / "tests/fixtures/http_golden_catalog.json"
dest.write_text(json.dumps(output, ensure_ascii=False, indent=1) + "\n")
print("wrote", dest)
