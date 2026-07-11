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
import threading
from pathlib import Path
from typing import Any, Callable

from fastapi import HTTPException, Request
from fastapi.responses import Response

from engine.astronomy.location import ObserverLocation
from services.panchanga_cache import CACHE_PAYLOAD_VERSION, resolve_cache_keys

RESPONSE_CACHE_DIR = Path(__file__).resolve().parent.parent / "cache" / "response"

# Deterministic panchanga for a fixed input is immutable until the engine
# changes; let browsers (max-age) and shared/CDN caches (s-maxage) hold it too.
#
# Two profiles:
#   * LIVE     — current & future BS years; edge holds 1 day so tweaks and the
#                current day's data propagate quickly.
#   * IMMUTABLE — past BS years; the payload never changes for a given URL until
#                the engine version bumps, so the edge may hold it for a year.
#
# IMPORTANT: cache keys embed CACHE_PAYLOAD_VERSION but the *URL* does not, so an
# engine bump does NOT change the public URL. Purge the CDN (Cloudflare) cache on
# deploys that bump the engine, otherwise the edge keeps serving pre-bump JSON
# for up to the s-maxage window.
DEFAULT_CACHE_CONTROL = "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800"
_LIVE_CACHE_CONTROL = "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800"
# Daily / at-time panchanga — short edge TTL so engine field additions (e.g. nivas_shool)
# reach browsers within an hour without a manual Cloudflare purge.
DAILY_PANCHANGA_CACHE_CONTROL = (
    "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400"
)
_AT_TIME_PANCHANGA_CACHE_CONTROL = (
    "public, max-age=60, s-maxage=300, stale-while-revalidate=3600"
)
# Public alias for API routes
AT_TIME_PANCHANGA_CACHE_CONTROL = _AT_TIME_PANCHANGA_CACHE_CONTROL
_IMMUTABLE_CACHE_CONTROL = (
    "public, max-age=86400, s-maxage=31536000, stale-while-revalidate=2592000, immutable"
)


def bs_year_cache_control(bs_year: int) -> str:
    """Edge cache directive tuned to whether ``bs_year`` is historical or live.

    Past years are immutable (long CDN TTL); the current and future years get a
    shorter edge TTL so refinements and the live day surface within a day.
    """
    from datetime import date

    from engine.vedic.bikram_sambat import gregorian_to_bs

    current_bs_year, _, _ = gregorian_to_bs(date.today())
    return _IMMUTABLE_CACHE_CONTROL if bs_year < current_bs_year else _LIVE_CACHE_CONTROL


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


# Per-key build locks collapse a cold-cache stampede: when N requests race for
# the same missing key (common right after a deploy that bumps the cache version,
# when every visitor asks for the current year at once), only the first computes
# the 0.8–30 s payload; the rest wait and then read the freshly written bytes.
# The keyspace is bounded (cities × years × variants), so retaining a lock per
# key seen is negligible memory. Single-process only — with multiple workers each
# still collapses its own stampede, cutting duplicate computes N-fold per worker.
_build_locks: dict[str, threading.Lock] = {}
_build_locks_guard = threading.Lock()


def _build_lock(cache_key: str) -> threading.Lock:
    with _build_locks_guard:
        lock = _build_locks.get(cache_key)
        if lock is None:
            lock = threading.Lock()
            _build_locks[cache_key] = lock
        return lock


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
        with _build_lock(cache_key):
            # Re-check under the lock: a racing request may have built it while
            # we waited, turning our expensive compute into a cheap disk read.
            compressed = read_cached_bytes(cache_key)
            if compressed is None:
                try:
                    payload = build()
                except ValueError as exc:
                    raise HTTPException(status_code=400, detail=str(exc)) from exc
                compressed = write_cached_bytes(cache_key, payload)

    headers = {
        "Cache-Control": cache_control,
        # Cloudflare and other CDNs honour CDN-Cache-Control over Cache-Control,
        # letting the edge cache aggressively while browsers follow max-age.
        "CDN-Cache-Control": cache_control,
        "Vary": "Accept-Encoding",
    }
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
