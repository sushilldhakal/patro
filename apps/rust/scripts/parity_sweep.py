#!/usr/bin/env python3
"""Calls every GET route of the OpenAPI document on the Python server and on the Rust server
with the same sample parameters, and compares status codes and response bodies.

    python3 apps/rust/scripts/parity_sweep.py [--python http://127.0.0.1:8080] [--rust http://127.0.0.1:8092]

A route is "same" when the status matches and the JSON bodies are equal; "shape" when only
numbers or strings differ (the keys and types match); "DIFFERENT" otherwise. Rust-only
divergences listed in rust_divergences.py show up here as differences.
"""
import argparse
import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

OPENAPI = Path(__file__).resolve().parents[1] / "crates/api/assets/openapi/openapi.json"

SAMPLES = {
    "year": "2083", "bs_year": "2083", "ad_year": "2026", "month": "8", "bs_month": "8", "day": "8",
    "date": "2026-11-24", "date_ad": "2026-11-24", "date_bs": "2083-08-08", "city_id": "1283240",
    "lat": "27.7172", "lon": "85.324", "latitude": "27.7172", "longitude": "85.324",
    "language": "en", "era": "bs", "kind": "solar", "category": "vivah", "slug": "swasthani-brata-katha",
    "name": "tithi", "id": "1", "q": "kath", "query": "kath", "limit": "5", "jd": "2461000.5",
    "datetime": "2026-11-24T10:00:00", "time": "10:00", "tz": "Asia/Kathmandu", "chapter": "1",
    "chapter_number": "1", "jd_ut": "2461000.5", "date_key": "2026-11-24",
}


def sample(name, schema, required):
    if name in SAMPLES:
        return SAMPLES[name]
    if "example" in schema:
        return str(schema["example"])
    if "default" in schema and schema["default"] is not None:
        return str(schema["default"])
    if "enum" in schema:
        return str(schema["enum"][0])
    t = schema.get("type", "string")
    if t == "integer":
        return "1"
    if t == "number":
        return "1"
    if t == "boolean":
        return "true"
    return "x" if required else None


def call(base, path):
    try:
        with urllib.request.urlopen(base + path, timeout=180) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()
    except Exception as e:  # noqa: BLE001
        return 0, str(e).encode()


def shape(a, b):
    if type(a) is not type(b):
        return False
    if isinstance(a, dict):
        return a.keys() == b.keys() and all(shape(a[k], b[k]) for k in a)
    if isinstance(a, list):
        return all(shape(x, y) for x, y in zip(a, b)) if a and b else True
    return True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--python", default="http://127.0.0.1:8080")
    ap.add_argument("--rust", default="http://127.0.0.1:8092")
    args = ap.parse_args()
    doc = json.loads(OPENAPI.read_text())
    counts = {"same": 0, "shape": 0, "DIFFERENT": 0, "status": 0, "both-error": 0}
    rows = []
    for raw, item in sorted(doc["paths"].items()):
        op = item.get("get")
        if not op:
            continue
        path, query = raw, {}
        skip = False
        for p in op.get("parameters", []):
            schema = p.get("schema", {})
            value = sample(p["name"], schema, p.get("required", False))
            if p["in"] == "path":
                path = path.replace("{" + p["name"] + "}", urllib.parse.quote(value or "x"))
            elif p["in"] == "query" and (p.get("required") or value is not None and p["name"] in SAMPLES) and value is not None:
                query[p["name"]] = value
        if "{" in path or skip:
            continue
        url = path + ("?" + urllib.parse.urlencode(query) if query else "")
        py_status, py_body = call(args.python, url)
        rs_status, rs_body = call(args.rust, url)
        if py_status != rs_status:
            kind = "status"
        elif py_status >= 400:
            kind = "both-error"
        else:
            try:
                pj, rj = json.loads(py_body), json.loads(rs_body)
                kind = "same" if pj == rj else ("shape" if shape(pj, rj) else "DIFFERENT")
            except ValueError:
                kind = "same" if py_body == rs_body else "DIFFERENT"
        counts[kind] += 1
        rows.append((kind, url, py_status, rs_status))
    for kind, url, ps, rs in rows:
        if kind in ("status", "DIFFERENT", "shape"):
            print(f"{kind:10} py={ps} rust={rs}  {url[:150]}")
    print(json.dumps(counts))
    return 0 if counts["status"] == 0 and counts["DIFFERENT"] == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
