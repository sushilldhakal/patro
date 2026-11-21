#!/usr/bin/env python3
"""Golden HTTP responses for gochar and graha routes on Julian and BCE days (FastAPI TestClient, Redis off).

Run from the Python app:

    cd apps/api && REDIS_URL= ../../.venv/bin/python ../rust/scripts/gen_http_golden_civil_graha.py
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

sys.path.insert(0, str(Path(__file__).resolve().parent))
from rust_divergences import apply as _apply_divergences  # noqa: E402

_apply_divergences()

REQUESTS = [
    "/v1/panchanga/element/tithi/spans?start_jd=1705060.5&end_jd=1705062.5",
    "/v1/panchanga/element/nakshatra/spans?era=bc&year=45&month=3&city_id=1283240",
    "/v1/panchanga/element/chandra-rashi/spans?start_jd=2268932.5&end_jd=2268940.5&city_id=5128581",
    "/v1/panchanga/element/karana/spans?era=ad&year=1500&month=1&city_id=1282898",
    "/v1/panchanga/element/yoga/spans?era=bs&year=13&month=1",
    "/v1/panchanga/rashifal?era=ad&date=1500-01-01&city_id=1283240",
    "/v1/panchanga/rashifal/janma?birth_era=ad&birth_year=1500&birth_month=1&birth_day=1&birth_clock=10:00&birth_tz=Asia/Kathmandu",
    "/v1/panchanga/rashifal/janma?birth_era=bbs&birth_year=100&birth_month=5&birth_day=10&birth_clock=10:00&birth_tz=America/New_York",
    "/v1/panchanga/rashifal/janma?birth_era=bc&birth_year=45&birth_month=3&birth_day=15",
    "/v1/nepal/sait/2083/vivah/personalize?birth_era=ad&birth_year=1500&birth_month=1&birth_day=1&birth_clock=10:00",
    "/v1/nepal/sait/2083/vivah/personalize?birth_era=bbs&birth_year=100&birth_month=5&birth_day=10",
    "/v1/nepal/sait/2083/annaprashan/personalize?birth_era=ad&birth_year=1500&birth_month=1&birth_day=1&gender=male",
    "/v1/panchanga/year/13/sun?city_id=1283240",
    "/v1/panchanga/year/1639/sun?city_id=5128581",
    "/v1/panchanga/element/tithi/month/13/1?city_id=1283240",
    "/v1/panchanga/element/nakshatra/month/1556/10",
    "/v1/nepal/gochar/-0044-03-15?era=ad",
    "/v1/nepal/gochar/jd/1705060.5?upcoming=true&city_id=5128581",
    "/v1/nepal/gochar/1556-10-05?era=bs&city_id=1282898",
    "/v1/nepal/gochar/year/13",
    "/v1/nepal/gochar/year/1556?city_id=5128581",
    "/v1/nepal/gochar/ingress?era=ad&from=1500-01-01&to=1500-03-01",
    "/v1/nepal/gochar/ingress?era=ad&from=-0044-03-01&to=-0044-04-15&level=patro",
    "/v1/nepal/gochar/ingress?era=bs&from=13-01-01&to=13-02-10&level=rashi&grahas=sun,mars,jupiter",
    "/v1/nepal/gochar/ingress?era=ad&from=1000-07-01&to=1000-08-01&level=udayast",
    "/v1/nepal/panchak/year/13",
    "/v1/nepal/panchak/year/1556?city_id=5128581",
    "/v1/nepal/graha-asta/year/13",
    "/v1/nepal/graha-asta/year/1500?era=ad&city_id=1282898",
    "/v1/nepal/graha-vakri/year/13",
    "/v1/nepal/graha-vakri/year/45?era=bc",
    "/v1/nepal/graha-sthiti/-0044-03-15?era=ad",
    "/v1/nepal/graha-sthiti/1500-01-01?era=ad&city_id=5128581",
    "/v1/nepal/eclipse/solar/year/13",
    "/v1/nepal/eclipse/lunar/year/1556",
    "/v1/nepal/eclipse/lunar/year/45?era=bc&city_id=5128581",
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

dest = Path(__file__).resolve().parents[1] / "tests/fixtures/http_golden_civil_graha.json"
dest.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n")
print("wrote", dest)
