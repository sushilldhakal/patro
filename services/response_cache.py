"""Generic on-disk gzip cache for deterministic JSON GET responses.

Many endpoints (month/year patro grids, gochar-year, calendar headers) are a
pure function of (path params, location) and only change when the engine logic
changes. Rebuilding them per request costs 0.3–15 s of Swiss Ephemeris work
plus large JSON serialization. This module caches the serialized, gzip-
compressed response bytes on disk keyed by a caller-supplied string; the first
request computes, every later one streams the bytes back in milliseconds.

Cache keys embed ``CACHE_PAYLOAD_VERSION`` so an engine version bump orphans
every stale file automatically (old files just sit unused; safe to delete).
"""

from __future__ import annotations

import gzip
import json
import os
from pathlib import Path
from typing import Any, Callable

from fastapi import HTTPException, Request
from fastapi.responses import Response

from engine.astronomy.location import ObserverLocation
from services.panchanga_cache import CACHE_PAYLOAD_VERSION, resolve_cache_keys

RESPONSE_CACHE_DIR = Path(__file__).resolve().parent.parent / "cache" / "response"

# Deterministic panchanga for a fixed input is immutable until the engine
# changes; let browsers/Cloudflare cache it too.
DEFAULT_CACHE_CONTROL = "public, max-age=86400, stale-while-revalidate=604800"


def location_cache_key(location: ObserverLocation) -> str:
    """Stable location token (Kathmandu-equivalent coords collapse to one key)."""
    return resolve_cache_keys(location)[0].replace(":", "_").replace("/", "_")


def _path(cache_key: str) -> Path:
    safe = cache_key.replace("/", "_").replace(":", "_")
    return RESPONSE_CACHE_DIR / f"v{CACHE_PAYLOAD_VERSION}_{safe}.json.gz"


def read_cached_bytes(cache_key: str) -> bytes | None:
    try:
        return _path(cache_key).read_bytes()
    except FileNotFoundError:
        return None


def write_cached_bytes(cache_key: str, payload: Any) -> bytes:
    path = _path(cache_key)
    path.parent.mkdir(parents=True, exist_ok=True)
    raw = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    compressed = gzip.compress(raw, compresslevel=6)
    tmp = path.with_name(path.name + ".tmp")
    tmp.write_bytes(compressed)
    os.replace(tmp, path)  # atomic — concurrent readers never see partial files
    return compressed


def serve_cached_json(
    request: Request,
    cache_key: str,
    build: Callable[[], Any],
    *,
    cache_control: str = DEFAULT_CACHE_CONTROL,
) -> Response:
    """Serve a deterministic payload from the gzip disk cache, computing once."""
    compressed = read_cached_bytes(cache_key)
    if compressed is None:
        try:
            payload = build()
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        compressed = write_cached_bytes(cache_key, payload)

    headers = {"Cache-Control": cache_control, "Vary": "Accept-Encoding"}
    if "gzip" in request.headers.get("accept-encoding", "").lower():
        # Pre-compressed bytes straight from disk; GZipMiddleware skips
        # responses that already carry Content-Encoding.
        headers["Content-Encoding"] = "gzip"
        return Response(content=compressed, media_type="application/json", headers=headers)
    return Response(
        content=gzip.decompress(compressed),
        media_type="application/json",
        headers=headers,
    )
