"""Disk cache for whole-year panchanga responses.

A BS year for a fixed location is deterministic — it only changes when the
engine logic changes. Rebuilding it per request costs 365 SQLite reads plus
~26 MB of JSON serialization (2.5 s warm, 30 s+ cold), so the serialized,
gzip-compressed response bytes are cached on disk and served directly.

Files are stamped with ``CACHE_PAYLOAD_VERSION`` — bumping the version in
``services/panchanga_cache.py`` automatically orphans stale year files.
"""

from __future__ import annotations

import gzip
import json
import os
from pathlib import Path
from typing import Any

from engine.astronomy.location import ObserverLocation
from services.panchanga_cache import CACHE_PAYLOAD_VERSION, resolve_cache_keys

YEAR_CACHE_DIR = Path(__file__).resolve().parent.parent / "cache" / "year"


def year_cache_path(bs_year: int, location: ObserverLocation, *, full: bool) -> Path:
    location_key, _ = resolve_cache_keys(location)
    safe_key = location_key.replace("/", "_").replace(":", "_")
    variant = "full" if full else "lite"
    return YEAR_CACHE_DIR / (
        f"year_v{CACHE_PAYLOAD_VERSION}_{bs_year}_{variant}_{safe_key}.json.gz"
    )


def read_year_cache(bs_year: int, location: ObserverLocation, *, full: bool) -> bytes | None:
    """Gzipped JSON bytes for the year, or None when not yet computed."""
    path = year_cache_path(bs_year, location, full=full)
    try:
        return path.read_bytes()
    except FileNotFoundError:
        return None


def write_year_cache(
    bs_year: int,
    location: ObserverLocation,
    payload: dict[str, Any],
    *,
    full: bool,
) -> bytes:
    """Serialize + gzip the payload, persist atomically, return the bytes."""
    path = year_cache_path(bs_year, location, full=full)
    path.parent.mkdir(parents=True, exist_ok=True)
    raw = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    compressed = gzip.compress(raw, compresslevel=6)
    tmp = path.with_name(path.name + ".tmp")
    tmp.write_bytes(compressed)
    os.replace(tmp, path)  # atomic — concurrent readers never see partial files
    return compressed
