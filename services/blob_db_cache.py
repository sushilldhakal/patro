"""Postgres-backed key→bytes cache for computed panchāṅga payloads.

The panchāṅga year / month / day responses are deterministic gzip-JSON blobs
keyed by a versioned string. A serverless filesystem cache does not survive a
cold start or shard across instances, so the first request after every restart
pays the full (~30 s year) build. Persisting the same blobs in the shared
Postgres (the DB already used for auth / profiles / sait) lets any instance read
them straight back.

Mirrors ``services.sait_db_cache``: when ``DATABASE_URL`` is unset (local dev,
tests) the loader returns ``None`` and the writer no-ops, and the caller falls
back to the on-disk file cache. DB errors are logged and swallowed so a cache
outage degrades to a recompute, never an error.
"""

from __future__ import annotations

import logging

import config

logger = logging.getLogger(__name__)


def db_available() -> bool:
    return config.database_url() is not None


def load_blob(cache_key: str) -> bytes | None:
    """Return the cached gzip bytes for ``cache_key``, or None on miss/no-DB."""
    if not db_available():
        return None
    try:
        from sqlalchemy import select

        from database.db import db_session
        from database.models import BlobCache

        with db_session() as session:
            row = session.execute(
                select(BlobCache).where(BlobCache.cache_key == cache_key)
            ).scalar_one_or_none()
            return bytes(row.data) if row is not None else None
    except Exception:  # pragma: no cover - defensive
        logger.exception("blob cache read failed (%s)", cache_key)
        return None


def save_blob(cache_key: str, data: bytes) -> None:
    """Upsert the gzip bytes for ``cache_key`` (no-op without a DB)."""
    if not db_available():
        return
    try:
        from sqlalchemy import select

        from database.db import db_session
        from database.models import BlobCache

        with db_session() as session:
            row = session.execute(
                select(BlobCache).where(BlobCache.cache_key == cache_key)
            ).scalar_one_or_none()
            if row is None:
                session.add(BlobCache(cache_key=cache_key, data=data))
            else:
                row.data = data
    except Exception:  # pragma: no cover - defensive
        # Concurrent inserts can collide on the primary key; the value is
        # identical, so a lost write is harmless — log and move on.
        logger.exception("blob cache write failed (%s)", cache_key)
