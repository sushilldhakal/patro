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
from services.blob_db_cache import db_available, load_blob, save_blob
from services.panchanga_cache import CACHE_PAYLOAD_VERSION, resolve_cache_keys

YEAR_CACHE_DIR = Path(__file__).resolve().parent.parent / "cache" / "year"


def year_cache_path(bs_year: int, location: ObserverLocation, *, variant: str) -> Path:
    """``variant`` names the payload shape: "full", "lite", "sun", ..."""
    location_key, _ = resolve_cache_keys(location)
    safe_key = location_key.replace("/", "_").replace(":", "_")
    return YEAR_CACHE_DIR / (
        f"year_v{CACHE_PAYLOAD_VERSION}_{bs_year}_{variant}_{safe_key}.json.gz"
    )


def read_year_cache(bs_year: int, location: ObserverLocation, *, variant: str) -> bytes | None:
    """Gzipped JSON bytes for the year, or None when not yet computed.

    Shared Postgres is the primary store (survives cold starts on ephemeral
    hosts and is shared across instances); the on-disk file is the local-dev
    fallback when ``DATABASE_URL`` is unset. The versioned filename doubles as
    the DB key, so a payload-shape bump misses cleanly in both stores.
    """
    path = year_cache_path(bs_year, location, variant=variant)
    if db_available():
        return load_blob(path.name)
    try:
        return path.read_bytes()
    except FileNotFoundError:
        return None


def write_year_cache(
    bs_year: int,
    location: ObserverLocation,
    payload: dict[str, Any],
    *,
    variant: str,
) -> bytes:
    """Serialize + gzip the payload, persist (DB or disk), return the bytes."""
    path = year_cache_path(bs_year, location, variant=variant)
    raw = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    compressed = gzip.compress(raw, compresslevel=6)
    if db_available():
        save_blob(path.name, compressed)
        return compressed
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + ".tmp")
    tmp.write_bytes(compressed)
    os.replace(tmp, path)  # atomic — concurrent readers never see partial files
    return compressed
