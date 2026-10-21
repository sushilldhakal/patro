"""Before/after snapshot of the API's responses — the safety net for refactors.

docs/DDD-PLAN.md's binding rule: no computed value changes as a side effect of
restructuring. This calls a fixed set of GET routes in-process, with the
panchanga SQLite and blob caches off and a fixed hash seed, and records each
response's status and a SHA-256 of its body (JSON re-serialised with sorted
keys, so dict order alone is not a change).

    python scripts/endpoint_snapshot.py --write  snapshot.json   # before
    python scripts/endpoint_snapshot.py --check  snapshot.json   # after

``--check`` lists every route whose status or body moved and exits non-zero.
A route that answers differently on two calls in one run (it reads the clock)
is reported as unstable and left out, rather than masking a real change.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
from pathlib import Path

API_ROOT = Path(__file__).resolve().parents[1]

KTM = "lat=27.7172&lon=85.3240&timezone=Asia/Kathmandu"
NY = "lat=40.71&lon=-74.0&timezone=America/New_York"
BIRTH = "datetime=1990-05-12T06:30:00%2B05:45"

ROUTES: tuple[str, ...] = (
    # Calendar
    "/v1/convert/ad-to-bs/2026-10-21",
    "/v1/convert/bs-to-ad/2083-07-04",
    "/v1/calendar/header/2083/7",
    "/v1/nepal/special-months/2083",
    "/v1/nepal/sankranti/year/2026",
    "/v1/nepal/sankranti/2026-10-17",
    f"/v1/seasons/tropical?{KTM}",
    # Panchanga — day, month, year, at time, elements
    f"/v1/panchanga/2026-10-21?era=ad&festivals=true&detail=true&{KTM}",
    f"/v1/panchanga/2026-10-21?era=ad&festivals=true&detail=true&slim=true&{KTM}",
    f"/v1/panchanga/2026-10-21?era=ad&festivals=true&detail=true&reference=midnight&{KTM}",
    f"/v1/panchanga/2026-10-20?era=ad&festivals=true&detail=false&{NY}",
    f"/v1/panchanga?era=bs&year=2083&month=7&day=4&festivals=true&{KTM}",
    f"/v1/panchanga?era=bbs&year=57&month=1&day=1&detail=false&festivals=false&{KTM}",
    f"/v1/panchanga/jd/2461334.5?{KTM}",
    f"/v1/panchanga/2083/7?{KTM}",
    f"/v1/panchanga/2083/7?clock=10:30&{KTM}",
    f"/v1/panchanga/ad/2026/10?{KTM}",
    f"/v1/panchanga/bc/57/3?{KTM}",
    f"/v1/panchanga/year/2083?{KTM}",
    f"/v1/panchanga/year/2083/sun?{KTM}",
    f"/v1/panchanga/at-time?datetime=2026-10-21T10:30:00%2B05:45&{KTM}",
    "/v1/panchanga/elements",
    f"/v1/panchanga/element/tithi/day/2026-10-21?era=ad&{KTM}",
    f"/v1/panchanga/element/nakshatra/month/2083/7?{KTM}",
    f"/v1/nepal/panchanga/2026-10-21?{KTM}",
    f"/v1/nepal/panchanga/month/2083/7?{KTM}",
    f"/v1/nepal/patro/2083/7?{KTM}",
    f"/v1/nepal/patro/ad/2026/11?{KTM}",
    f"/v1/nepal/panchak/year/2026?{KTM}",
    # Festivals & Sait
    f"/v1/festivals/2026-10-21?{KTM}",
    f"/v1/festivals/bs/2083?{KTM}",
    f"/v1/holidays/2026?{KTM}",
    f"/v1/nepal/festivals?year=2083&era=bs&language=ne&{KTM}",
    f"/v1/nepal/festivals?year=2026&era=ad&language=en&{NY}",
    f"/v1/nepal/holidays?year=2083&era=bs&{KTM}",
    f"/v1/nepal/holidays?year=2083&era=bs&month=7&{KTM}",
    f"/v1/nepal/holidays?year=2026&era=ad&{KTM}",
    f"/v1/nepal/holidays?year=2026&era=ad&month=11&{KTM}",
    f"/v1/nepal/holidays?year=57&era=bbs&{KTM}",
    f"/v1/nepal/festivals?year=2026&era=ad&month=10&tradition=vaishnava&{KTM}",
    f"/v1/nepal/festivals?year=2083&era=bs&month=6&tradition=smarta&{KTM}",
    f"/v1/nepal/festivals/upcoming?from=2026-10-01&days=90&limit=20&{KTM}",
    f"/v1/nepal/festivals/upcoming?from=2026-03-20&days=60&limit=60&holidays_only=true&{KTM}",
    "/v1/nepal/sait/categories",
    "/v1/nepal/sait/years",
    "/v1/nepal/sait/about",
    "/v1/nepal/sait/vivah/about",
    f"/v1/nepal/sait/2083/month/7?{KTM}",
    f"/v1/nepal/sait/2083/vivah?{KTM}",
    f"/v1/nepal/sait/2083/vivah/detail?{KTM}",
    # Jyotish
    f"/v1/kundali/detail?{BIRTH}&{KTM}",
    f"/v1/kundali/vimshottari?{BIRTH}&{KTM}",
    f"/v1/kundali/vimshottari?{BIRTH}&cycles=2&{KTM}",
    f"/v1/kundali/report?{BIRTH}&lang=en&force=true&{KTM}",
    f"/v1/kundali/report?datetime=1955-02-03T22:10:00%2B05:30&lang=ne&force=true&{KTM}",
    f"/v1/kundali/detail?datetime=1955-02-03T22:10:00%2B05:30&{KTM}",
    "/v1/panchanga/rashifal/personal?birth_lat=27.7&birth_lon=85.3&birth_era=bs&birth_year=2050&birth_month=5"
    "&birth_day=12&birth_clock=06:30&period=daily&date=2026-10-21",
    "/v1/panchanga/rashifal/personal?birth_lat=27.7&birth_lon=85.3&birth=1960-07-01T03:00&period=monthly&date=2026-10-21",
    "/v1/kundali/dasha/expand?lord=venus&start=2010-01-01T00:00:00%2B00:00&end=2030-01-01T00:00:00%2B00:00",
    "/v1/kundali/dasha/expand?lord=sankata&start=2010-01-01T00:00:00%2B00:00&end=2018-01-01T00:00:00%2B00:00&system=yogini",
    f"/v1/shadbala?{BIRTH}&{KTM}",
    f"/v1/planetary/positions?{BIRTH}&{KTM}",
    "/v1/kundali/milan?boy_datetime=1990-05-12T06:30:00%2B05:45&girl_datetime=1992-08-20T14:10:00%2B05:45",
    "/v1/kundali/reference/bhava",
    f"/v1/nepal/panchanga/year/2083?{KTM}",
    f"/v1/nepal/panchanga/2026-10-21?format=raw&{KTM}",
    f"/v1/nepal/panchanga/2026-10-21?format=dayblock&locale=ne&{KTM}",
    "/v1/kundali/yogas/reference",
    f"/v1/nepal/gochar/2026-10-21?{KTM}",
    f"/v1/nepal/gochar/year/2083?{KTM}",
    f"/v1/nepal/gochar/ingress?from=2026-01-01&to=2026-12-31&era=ad&{KTM}",
    f"/v1/nepal/graha-sthiti/2026-10-21?{KTM}",
    f"/v1/nepal/graha-asta/year/2026?{KTM}",
    f"/v1/nepal/graha-vakri/year/2026?{KTM}",
    f"/v1/nepal/eclipse/solar/year/2026?{KTM}",
    f"/v1/panchanga/rashifal?period=daily&date=2026-10-21&{KTM}",
    f"/v1/panchanga/rashifal?period=monthly&date=2026-10-21&{KTM}",
    # Vastu, geography, scripture
    "/v1/vastu/zones",
    "/v1/vastu/rooms",
    "/v1/vastu/rooms/kitchen/detail",
    "/v1/cities/search?q=Kathmandu",
    "/v1/cities/nearest?lat=27.7&lon=85.3",
    "/v1/cities/popular",
    "/v1/documents",
    "/v1/documents/gayatri-mantra",
    "/v1/documents/bhagavad-gita",
    "/v1/documents/sri-rudram",
    "/v1/documents/bhagavad-gita/chapters/2",
    "/v1/documents/bhagavad-gita/chapters/99",
    "/v1/documents/no-such-document",
    "/v1/veda/daily?date=2026-10-21",
)


def _ensure_seed() -> None:
    """Re-run under a fixed hash seed, so set order cannot vary between runs."""
    if os.environ.get("PYTHONHASHSEED") != "0":
        env = {**os.environ, "PYTHONHASHSEED": "0"}
        os.execve(sys.executable, [sys.executable, *sys.argv], env)


# When the payload was built, not what it says.
VOLATILE_KEYS = frozenset({"generated_at", "computed_at", "cached_at"})


def _without_volatile(value):
    if isinstance(value, dict):
        return {k: _without_volatile(v) for k, v in value.items() if k not in VOLATILE_KEYS}
    if isinstance(value, list):
        return [_without_volatile(v) for v in value]
    return value


def _canonical(body: bytes) -> bytes:
    """JSON (or NDJSON, one object per line) with sorted keys and no timestamps."""
    def dump(value) -> str:
        return json.dumps(_without_volatile(value), sort_keys=True, ensure_ascii=False)

    try:
        return dump(json.loads(body)).encode()
    except ValueError:
        pass
    try:
        return "\n".join(dump(json.loads(line)) for line in body.splitlines() if line.strip()).encode()
    except ValueError:
        return body


def _digest(body: bytes) -> str:
    return hashlib.sha256(_canonical(body)).hexdigest()


def take() -> dict[str, dict]:
    os.environ.setdefault("PANCHANGA_CACHE", "0")
    os.environ.setdefault("BLOB_CACHE_USE_DB", "0")
    os.environ.pop("REDIS_URL", None)
    os.chdir(API_ROOT)
    sys.path.insert(0, str(API_ROOT))

    from fastapi.testclient import TestClient

    from app.main import app

    # Every file cache under cache/ starts empty, so each route computes.
    import tempfile

    import app.response_cache as response_cache
    import services.festivals.holiday_generator as holiday_generator
    import services.festivals.sait_generator as sait_generator
    import services.panchanga.year_cache as year_cache

    scratch = Path(tempfile.mkdtemp(prefix="endpoint-snapshot-"))
    holiday_generator.CACHE_DIR = scratch
    sait_generator.CACHE_DIR = scratch
    year_cache.YEAR_CACHE_DIR = scratch / "year"
    response_cache.RESPONSE_CACHE_DIR = scratch / "response"

    client = TestClient(app, raise_server_exceptions=False)
    snap: dict[str, dict] = {}
    for route in ROUTES:
        first = client.get(route)
        second = client.get(route)
        entry = {"status": first.status_code, "sha256": _digest(first.content)}
        if second.status_code != first.status_code or _digest(second.content) != entry["sha256"]:
            entry["unstable"] = True
        snap[route] = entry
    return snap


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--write", metavar="FILE")
    mode.add_argument("--check", metavar="FILE")
    args = parser.parse_args()
    _ensure_seed()

    snap = take()
    if args.write:
        Path(args.write).write_text(json.dumps(snap, indent=1, sort_keys=True) + "\n")
        unstable = [r for r, e in snap.items() if e.get("unstable")]
        errors = [f"{r} -> {e['status']}" for r, e in snap.items() if e["status"] >= 500]
        print(f"{len(snap)} routes written; {len(unstable)} unstable; {len(errors)} 5xx")
        for line in unstable:
            print("  unstable:", line)
        for line in errors:
            print("  5xx:", line)
        return 0

    before = json.loads(Path(args.check).read_text())
    moved = []
    for route, entry in snap.items():
        was = before.get(route)
        if was is None or was.get("unstable") or entry.get("unstable"):
            continue
        if (was["status"], was["sha256"]) != (entry["status"], entry["sha256"]):
            moved.append(f"{route}: {was['status']} -> {entry['status']}")
    compared = sum(1 for r in snap if r in before and not before[r].get("unstable") and not snap[r].get("unstable"))
    print(f"{compared} routes compared, {len(moved)} moved")
    for line in moved:
        print("  moved:", line)
    return 1 if moved else 0


if __name__ == "__main__":
    raise SystemExit(main())
