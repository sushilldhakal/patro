#!/usr/bin/env python3
"""Golden CORS answers (Starlette CORSMiddleware) for the Rust CORS layer.

    cd apps/api && REDIS_URL= ../../.venv/bin/python ../rust/scripts/gen_http_golden_cors.py
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

os.environ.pop("REDIS_URL", None)
os.environ.pop("CORS_ALLOW_ORIGINS", None)
sys.path.insert(0, str(Path.cwd()))
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

DAY = "/v1/convert/ad-to-bs/2026-03-12"
GZ = "/v1/panchanga/2083/7?city_id=1283240"
CASES = [
    ("GET", DAY, {"Origin": "https://vedicpatro.com"}),
    ("GET", DAY, {"Origin": "https://evil.example"}),
    ("GET", DAY, {}),
    ("GET", GZ, {"Origin": "http://localhost:5173", "Accept-Encoding": "gzip"}),
    ("GET", "/v1/panchanga/2083/13?city_id=1283240", {"Origin": "https://www.vedicpatro.com"}),
    ("OPTIONS", DAY, {"Origin": "https://vedicpatro.com", "Access-Control-Request-Method": "GET"}),
    ("OPTIONS", DAY, {"Origin": "https://vedicpatro.com", "Access-Control-Request-Method": "GET",
                      "Access-Control-Request-Headers": "x-client, content-type"}),
    ("OPTIONS", DAY, {"Origin": "https://evil.example", "Access-Control-Request-Method": "GET"}),
    ("OPTIONS", DAY, {"Origin": "https://vedicpatro.com", "Access-Control-Request-Method": "TRACE"}),
    ("OPTIONS", DAY, {"Origin": "https://evil.example", "Access-Control-Request-Method": "TRACE"}),
]
KEEP = (
    "access-control-allow-origin",
    "access-control-allow-methods",
    "access-control-allow-headers",
    "access-control-max-age",
    "access-control-allow-credentials",
    "vary",
    "content-type",
)

client = TestClient(app)
out = []
for method, path, headers in CASES:
    r = client.request(method, path, headers=headers)
    out.append({
        "method": method,
        "path": path,
        "request_headers": headers,
        "status": r.status_code,
        "headers": {k: r.headers[k] for k in KEEP if k in r.headers},
        "body": r.text if method == "OPTIONS" else None,
    })
    print(r.status_code, method, path, headers)

dest = Path(__file__).resolve().parents[1] / "tests/fixtures/http_golden_cors.json"
dest.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n")
print("wrote", dest)
