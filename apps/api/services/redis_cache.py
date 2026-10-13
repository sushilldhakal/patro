"""Optional Redis tier shared by every worker process.

Why: with ``WEB_CONCURRENCY`` workers, each process has its own memory, so a
payload built by one worker was invisible to the rest and every worker paid the
same cold build (and ran the same startup warm). Redis gives all workers one
fast shared cache, plus cross-process locks.

Everything here degrades to a no-op. If ``REDIS_URL`` is unset, the server is
down, or a call is slow, callers just see a miss and fall through to the
Postgres/disk caches exactly as before. After a failure the client is skipped
for ``_COOLDOWN_S`` so an outage costs one short timeout, not one per request.
"""

from __future__ import annotations

import logging
import os
import time
import uuid
from contextlib import contextmanager
from typing import Iterator

import config

logger = logging.getLogger(__name__)

_PREFIX = "vp:"
_COOLDOWN_S = 30.0
# Redis is a bounded LRU cache, not a store: skip payloads larger than this.
_MAX_VALUE_BYTES = int(os.getenv("REDIS_MAX_VALUE_BYTES", str(8 * 1024 * 1024)))
_DEFAULT_TTL_S = int(os.getenv("REDIS_CACHE_TTL_S", str(7 * 24 * 3600)))

_client = None
_client_failed_at = 0.0
_unlock_script = None


def _get_client():
    global _client, _client_failed_at
    url = config.redis_url()
    if not url:
        return None
    if _client_failed_at and time.monotonic() - _client_failed_at < _COOLDOWN_S:
        return None
    if _client is None:
        try:
            import redis

            _client = redis.Redis.from_url(
                url,
                socket_connect_timeout=float(os.getenv("REDIS_CONNECT_TIMEOUT_S", "0.25")),
                socket_timeout=float(os.getenv("REDIS_SOCKET_TIMEOUT_S", "0.5")),
                health_check_interval=30,
            )
        except Exception:  # pragma: no cover - defensive
            logger.exception("redis client init failed")
            _client_failed_at = time.monotonic()
            return None
    return _client


def _trip(exc: Exception) -> None:
    global _client_failed_at
    _client_failed_at = time.monotonic()
    logger.warning("redis unavailable, bypassing for %.0fs: %s", _COOLDOWN_S, exc)


def enabled() -> bool:
    return config.redis_url() is not None


def get_bytes(key: str) -> bytes | None:
    client = _get_client()
    if client is None:
        return None
    try:
        return client.get(_PREFIX + key)
    except Exception as exc:
        _trip(exc)
        return None


def set_bytes(key: str, data: bytes, ttl: int | None = None) -> None:
    client = _get_client()
    if client is None or len(data) > _MAX_VALUE_BYTES:
        return
    try:
        client.set(_PREFIX + key, data, ex=ttl or _DEFAULT_TTL_S)
    except Exception as exc:
        _trip(exc)


def claim_once(name: str, ttl: int) -> bool:
    """True for exactly one caller per ``ttl`` window across all workers.

    With Redis unavailable every caller gets True (the pre-Redis behaviour).
    """
    client = _get_client()
    if client is None:
        return True
    try:
        return bool(client.set(_PREFIX + "once:" + name, "1", nx=True, ex=ttl))
    except Exception as exc:
        _trip(exc)
        return True


@contextmanager
def build_lock(key: str, ttl: int = 120) -> Iterator[bool]:
    """Cross-worker lock for one cache key; yields True if this caller owns it.

    The owner computes. A non-owner should wait for the owner's result (see
    ``wait_for``) instead of duplicating a 1–30 s build. With Redis down it
    yields True so the caller simply computes.
    """
    client = _get_client()
    if client is None:
        yield True
        return
    token = uuid.uuid4().hex
    name = _PREFIX + "lock:" + key
    try:
        owned = bool(client.set(name, token, nx=True, ex=ttl))
    except Exception as exc:
        _trip(exc)
        yield True
        return
    try:
        yield owned
    finally:
        if owned:
            try:
                # Release only our own lock (it may have expired and been retaken).
                if client.get(name) == token.encode():
                    client.delete(name)
            except Exception:
                pass


def wait_for(read, timeout: float = 60.0, interval: float = 0.25):
    """Poll ``read()`` until it returns a value or ``timeout`` elapses."""
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        value = read()
        if value is not None:
            return value
        time.sleep(interval)
    return None
