#!/usr/bin/env python3
"""FastAPI's OpenAPI schema and docs pages, recorded for the Rust server to serve.

The Rust server keeps Python's routes, parameters and shapes, so the schema FastAPI
generates describes it too. Re-run after any route or parameter change:

    cd apps/api && REDIS_URL= ../../.venv/bin/python ../rust/scripts/gen_openapi_assets.py
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

dest = Path(__file__).resolve().parents[1] / "crates/api/assets/openapi"
dest.mkdir(parents=True, exist_ok=True)
client = TestClient(app)
meta = {}
for path, name in [
    ("/openapi.json", "openapi.json"),
    ("/docs", "docs.html"),
    ("/redoc", "redoc.html"),
    ("/docs/oauth2-redirect", "oauth2-redirect.html"),
]:
    r = client.get(path)
    assert r.status_code == 200, (path, r.status_code)
    (dest / name).write_bytes(r.content)
    meta[path] = {"file": name, "content-type": r.headers["content-type"]}
    print(r.status_code, path, len(r.content), r.headers["content-type"])
(dest / "meta.json").write_text(json.dumps(meta, indent=1) + "\n")
