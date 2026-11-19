"""Shared Redis cache for whole public GET responses.

Why: the heavy grids (year/month patro, gochar, documents) already cache their
payload through ``serve_cached_json``, but most of the traffic is elsewhere —
daily panchanga, at-time, rashifal, festivals, holidays, sāit month lists,
element spans, city search, OG images. Each of those either recomputed per
request (sāit month ≈ 1 s every time) or kept its cache inside one worker, so
with ``WEB_CONCURRENCY`` workers the same answer was rebuilt up to N times.

This layer stores the final response bytes (after era rendering and gzip) in
Redis, shared by every worker. A hit skips the route, the era rewrite and gzip.
Redis runs with ``allkeys-lfu`` and a fixed ``maxmemory``, so the most often
requested responses stay resident and rarely used ones are evicted first.

What is cached, and for how long:

* Only ``GET`` on the public, versioned data routes (``/v1/…``) and
  ``/og-image``. None of those routes read the signed-in user; user routes
  (``/auth``, ``/profiles``, ``/events``…) are never touched.
* Only ``200`` responses without ``Set-Cookie``, and not ``private`` /
  ``no-store`` / ``no-cache``.
* A response that declares ``public`` Cache-Control is cached for its
  ``s-maxage`` when the URL names a fixed day/month/year, otherwise for its
  ``max-age`` — routes that answer for "now" (today, at-time) keep their short
  lifetime here too.
* A few deterministic routes send no Cache-Control yet; ``_UNMARKED_ROUTES``
  lists them with their own lifetime.

The key is a hash of host + path + sorted query, plus the panchanga payload
version, ``RESPONSE_CACHE_EPOCH`` and (for documents) the manifests' content
version. It deliberately does NOT include the deployed git revision: that
emptied the whole cache on every push, and the first minutes after each deploy
then ran every request cold (the load test measured 87% CPU cold against 16%
warm for the same 300 users). Data changes already change the key — the app
sends cv/sv/gv/ev/v versions in the URL and the payload version is part of it —
so a code change that alters a response without bumping one of those must bump
``RESPONSE_CACHE_EPOCH`` below. Hashing also keeps birth details from the
personal rashifal query out of the key names.

Identical misses share one build. When many requests miss the same key at the
same moment (a festival morning, the first minutes after a cache entry
expires), the first takes a Redis lock and computes; the rest wait for its
stored answer instead of each running the same 1 s build. A waiter that sees
the lock released without an answer (the response was not cacheable) or waits
longer than ``_PEER_WAIT_S`` computes on its own, so nothing ever hangs on it.

Public responses also get ``stale-if-error`` added to Cache-Control, so when the
server is overloaded or down Cloudflare keeps serving the last good copy.

Personal rashifal is ``private`` for every shared cache, but the same person
reopens it many times a day; ``_PRIVATE_SERVER_ROUTES`` keeps those answers in
Redis (server side only, still sent as private) when the URL names the day.

Every Redis failure is a miss: the request runs exactly as it would without
this layer.
"""

from __future__ import annotations

import asyncio
import gzip
import hashlib
import json
import logging
import os
import re
from urllib.parse import parse_qsl, urlencode

import config
from services.platform import redis_cache

logger = logging.getLogger(__name__)

_KEY_NS = "resp:"
_MAX_BODY_BYTES = int(os.getenv("REDIS_RESPONSE_MAX_BYTES", str(4 * 1024 * 1024)))
_MAX_TTL_S = int(os.getenv("REDIS_RESPONSE_MAX_TTL_S", str(7 * 24 * 3600)))
_MIN_TTL_S = 30

# Deterministic routes that send no Cache-Control today, with
# (ttl when the URL names a fixed day/year, ttl otherwise). Matched as a
# substring of the path after the version prefix.
_LONG = 24 * 3600
_SHORT = 15 * 60
_UNMARKED_ROUTES: tuple[tuple[str, int, int], ...] = (
    ("/nepal/sait/", _LONG, _LONG),  # BS year + month in the path
    ("/nepal/festivals", _LONG, _SHORT),
    ("/nepal/holidays", _LONG, _SHORT),
    ("/festivals/", _LONG, _LONG),
    ("/holidays/", _LONG, _LONG),
    ("/seasons/tropical", _LONG, _SHORT),
    ("/panchanga/element", _LONG, _SHORT),
    ("/panchanga/jd/", _LONG, _LONG),
    ("/cities/", _LONG, _LONG),
    ("/convert/", _LONG, _LONG),
    ("/calendar/header/", _LONG, _LONG),
    ("/nepal/panchanga/", _LONG, _SHORT),
    ("/nepal/sankranti/", _LONG, _SHORT),
    ("/kundali/reference", _LONG, _LONG),
    ("/kundali/yogas/reference", _LONG, _LONG),
    ("/vastu/zones", _LONG, _LONG),
    ("/vastu/rooms", _LONG, _LONG),
)

# Bump when a code change alters responses without changing any version the URL
# or payload carries; RESPONSE_CACHE_EPOCH in .env adds to it for an emergency flush.
RESPONSE_CACHE_EPOCH = "1"

# Personal answers (Cache-Control: private) kept in Redis for this long when the
# URL names a fixed day. Never shared with Cloudflare: the stored headers still
# say private, and the key is a hash of the full query.
_PRIVATE_SERVER_ROUTES: tuple[tuple[str, int], ...] = (
    ("/panchanga/rashifal/personal", 6 * 3600),
    ("/panchanga/rashifal/janma", 6 * 3600),
)

# How long a request waits for an identical in-flight build before computing on
# its own. Below nginx's proxy_read_timeout so a waiter never turns into a 504.
_PEER_WAIT_S = float(os.getenv("REDIS_RESPONSE_PEER_WAIT_S", "8"))
_LOCK_TTL_S = 30

# Added to public Cache-Control: Cloudflare serves the last good copy for this
# long when the origin errors or times out.
_STALE_IF_ERROR = os.getenv("STALE_IF_ERROR_S", "86400")

# Headers replayed on a hit. Everything else (CORS, timing, cache-status) is
# per-request and added by outer layers.
_STORED_HEADERS = frozenset({
    b"content-type",
    b"content-encoding",
    b"cache-control",
    b"cdn-cache-control",
    b"x-siddhanta",
    b"content-language",
})

_MAX_AGE = re.compile(r"(?:^|[,\s])max-age=(\d+)")
_S_MAXAGE = re.compile(r"s-maxage=(\d+)")


def _epoch() -> str:
    extra = os.getenv("RESPONSE_CACHE_EPOCH", "").strip()
    return f"{RESPONSE_CACHE_EPOCH}.{extra}" if extra else RESPONSE_CACHE_EPOCH


def _content_version(path: str) -> str:
    """Manifest content version for document responses (their URLs never change on an edit)."""
    if "/documents" not in path and "/veda/" not in path:
        return ""
    try:
        from api.documents import _cache_version

        return _cache_version()
    except Exception:  # pragma: no cover - never fail a request over the key
        return ""


def _payload_version() -> str:
    from services.panchanga.panchanga_cache import CACHE_PAYLOAD_VERSION

    return str(CACHE_PAYLOAD_VERSION)


def _is_fixed_day(path: str, query: dict[str, str]) -> bool:
    from app.response_cache import _FIXED_DAY_PATH, _FIXED_DAY_QUERY

    return bool(_FIXED_DAY_PATH.search(path) or any(query.get(k) for k in _FIXED_DAY_QUERY))


def ttl_for(path: str, query: dict[str, str], cache_control: str | None) -> int | None:
    """Seconds to keep this response in Redis, or None to skip it."""
    fixed = _is_fixed_day(path, query)
    if cache_control:
        cc = cache_control.lower()
        if "private" in cc and "no-store" not in cc and query.get("date"):
            for marker, ttl in _PRIVATE_SERVER_ROUTES:
                if path.endswith(marker):
                    return ttl
        if "private" in cc or "no-store" in cc or "no-cache" in cc:
            return None
        if not cc.startswith("public"):
            return None
        s_max = _S_MAXAGE.search(cc)
        max_age = _MAX_AGE.search(cc)
        if fixed and s_max:
            ttl = int(s_max.group(1))
        elif max_age:
            ttl = int(max_age.group(1))
        elif s_max:
            ttl = int(s_max.group(1))
        else:
            return None
        # max-age=0 means "always revalidate" (custom sait subsets): keep it out.
        if ttl < _MIN_TTL_S:
            return None
        return min(ttl, _MAX_TTL_S)
    for marker, fixed_ttl, live_ttl in _UNMARKED_ROUTES:
        if marker in path:
            return fixed_ttl if fixed else live_ttl
    return None


def _eligible_path(path: str) -> bool:
    if path.endswith("/og-image"):
        return True
    return f"/{config.api_version()}/" in path


def _header(scope, name: bytes) -> str:
    for key, value in scope.get("headers", []):
        if key == name:
            return value.decode("latin-1")
    return ""


def cache_key(scope, epoch: str | None = None) -> str:
    query = sorted(parse_qsl(scope.get("query_string", b"").decode("latin-1"), keep_blank_values=True))
    raw = "\n".join((
        _header(scope, b"host").split(":")[0].lower(),
        scope.get("root_path", "") + scope["path"],
        urlencode(query),
        _payload_version(),
        epoch if epoch is not None else _epoch(),
        _content_version(scope["path"]),
    ))
    return _KEY_NS + hashlib.sha256(raw.encode("utf-8")).hexdigest()


def with_stale_if_error(headers: list[tuple[bytes, bytes]]) -> list[tuple[bytes, bytes]]:
    """Add ``stale-if-error`` to public Cache-Control / CDN-Cache-Control that lack it."""
    out = []
    for k, v in headers:
        lk = k.lower()
        if lk in (b"cache-control", b"cdn-cache-control"):
            low = v.lower()
            if low.startswith(b"public") and b"stale-if-error" not in low:
                v = v + b", stale-if-error=" + _STALE_IF_ERROR.encode()
        out.append((k, v))
    return out


def _pack(headers: list[tuple[bytes, bytes]], body: bytes) -> bytes:
    meta = json.dumps([[k.decode("latin-1"), v.decode("latin-1")] for k, v in headers]).encode()
    return len(meta).to_bytes(4, "big") + meta + body


def _unpack(blob: bytes) -> tuple[list[tuple[bytes, bytes]], bytes]:
    size = int.from_bytes(blob[:4], "big")
    meta = json.loads(blob[4 : 4 + size])
    return [(k.encode("latin-1"), v.encode("latin-1")) for k, v in meta], blob[4 + size :]


class RedisResponseCacheMiddleware:
    """Pure ASGI: serve cached public GET responses from Redis, store new ones."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if (
            scope["type"] != "http"
            or scope["method"] != "GET"
            or not redis_cache.enabled()
            or not _eligible_path(scope["path"])
        ):
            await self.app(scope, receive, send)
            return

        accepts_gzip = "gzip" in _header(scope, b"accept-encoding").lower()
        key = cache_key(scope)

        if await self._try_hit(key, send, accepts_gzip):
            return

        # Miss. One request per key computes; identical ones arriving meanwhile
        # wait for its stored answer (see module docstring).
        with redis_cache.build_lock(key, ttl=_LOCK_TTL_S) as owner:
            if not owner and await self._wait_for_peer(key, send, accepts_gzip):
                return
            await self._compute(scope, receive, send, key, accepts_gzip)

    async def _try_hit(self, key: str, send, accepts_gzip: bool) -> bool:
        blob = redis_cache.get_bytes(key)
        if blob is None:
            return False
        try:
            headers, body = _unpack(blob)
        except Exception:  # corrupt entry → treat as a miss
            return False
        await self._send_hit(send, headers, body, accepts_gzip)
        return True

    async def _wait_for_peer(self, key: str, send, accepts_gzip: bool) -> bool:
        """Wait for the lock owner's stored answer; False → compute it here instead."""
        loop = asyncio.get_running_loop()
        deadline = loop.time() + _PEER_WAIT_S
        delay = 0.02
        while loop.time() < deadline:
            await asyncio.sleep(delay)
            delay = min(delay * 1.6, 0.25)
            if await self._try_hit(key, send, accepts_gzip):
                return True
            if not redis_cache.lock_held(key):
                # Owner finished. Its answer may have landed just now; else it was not cacheable.
                return await self._try_hit(key, send, accepts_gzip)
        return False

    async def _compute(self, scope, receive, send, key: str, accepts_gzip: bool) -> None:
        # Always ask the inner stack for gzip so Redis holds compressed bytes;
        # undo it below for the rare client that cannot take gzip.
        inner_headers = [(k, v) for k, v in scope.get("headers", []) if k != b"accept-encoding"]
        inner_headers.append((b"accept-encoding", b"gzip"))
        inner_scope = {**scope, "headers": inner_headers}

        state = {"start": None, "chunks": [], "size": 0, "store": False, "ttl": None, "gzip": False}
        path = scope["path"]
        query = dict(parse_qsl(scope.get("query_string", b"").decode("latin-1")))

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                headers = with_stale_if_error(list(message.get("headers", [])))
                lower = {k.lower(): v.decode("latin-1") for k, v in headers}
                state["gzip"] = lower.get(b"content-encoding", "").lower() == "gzip"
                if message.get("status") == 200 and b"set-cookie" not in lower:
                    ttl = ttl_for(path, query, lower.get(b"cache-control"))
                    if ttl:
                        state["store"], state["ttl"] = True, ttl
                state["start"] = {**message, "headers": headers}
                if state["gzip"] and not accepts_gzip:
                    # Hold the start: the length changes once we decompress.
                    return
                headers.append((b"x-cache", b"MISS" if state["store"] else b"BYPASS"))
                await send(state["start"])
                return

            if message["type"] == "http.response.body":
                chunk = message.get("body", b"")
                more = message.get("more_body", False)
                if state["store"] or (state["gzip"] and not accepts_gzip):
                    state["chunks"].append(chunk)
                    state["size"] += len(chunk)
                    if state["size"] > _MAX_BODY_BYTES:
                        state["store"] = False
                if state["gzip"] and not accepts_gzip:
                    if more:
                        return
                    body = gzip.decompress(b"".join(state["chunks"]))
                    start = state["start"]
                    hdrs = [
                        (k, v) for k, v in start["headers"]
                        if k.lower() not in (b"content-encoding", b"content-length")
                    ]
                    hdrs += [(b"content-length", str(len(body)).encode()), (b"x-cache", b"MISS")]
                    await send({**start, "headers": hdrs})
                    await send({"type": "http.response.body", "body": body})
                else:
                    await send(message)
                if not more and state["store"]:
                    self._store(key, state)
                return

            await send(message)

        await self.app(inner_scope, receive, send_wrapper)

    def _store(self, key: str, state) -> None:
        try:
            headers = [
                (k.lower(), v) for k, v in state["start"]["headers"]
                if k.lower() in _STORED_HEADERS
            ]
            body = b"".join(state["chunks"])
            redis_cache.set_bytes(key, _pack(headers, body), ttl=state["ttl"])
        except Exception:  # pragma: no cover - never break a response over caching
            logger.exception("redis response cache store failed")

    async def _send_hit(self, send, headers, body, accepts_gzip) -> None:
        encoded = any(k == b"content-encoding" and v.lower() == b"gzip" for k, v in headers)
        if encoded and not accepts_gzip:
            body = gzip.decompress(body)
            headers = [(k, v) for k, v in headers if k != b"content-encoding"]
        out = [
            *with_stale_if_error(headers),
            (b"content-length", str(len(body)).encode()),
            (b"vary", b"Accept-Encoding"),
            (b"x-cache", b"HIT"),
        ]
        await send({"type": "http.response.start", "status": 200, "headers": out})
        await send({"type": "http.response.body", "body": body})
