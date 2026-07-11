"""Postgres-backed cache for computed sait / muhūrta listings.

A whole BS year for a fixed location + category is deterministic given the
engine version, so the first request computes it once and persists it; every
later request — from any server instance — reads it straight back. This uses
the app's shared Postgres (the same DB as auth/profiles); a serverless
filesystem cache would not survive cold starts or be shared across instances.

All operations degrade gracefully: when ``DATABASE_URL`` is unset (local dev,
tests) the loaders return ``None`` / the writers no-op, and the caller falls
back to the on-disk file cache. DB errors are logged and swallowed so a cache
outage never breaks a panchanga response.
"""

from __future__ import annotations

import json
import logging
from typing import Any

import config
from engine.astronomy.location import ObserverLocation

logger = logging.getLogger(__name__)


def db_available() -> bool:
    return config.database_url() is not None


def load_sait_db(
    bs_year: int,
    category: str,
    location: ObserverLocation,
    engine_version: str,
) -> dict[str, Any] | None:
    """Return the cached payload for (year, category, location), or None.

    A row whose ``engine_version`` differs from the current one is treated as a
    miss so a rules change transparently recomputes.
    """
    if not db_available():
        return None
    try:
        from sqlalchemy import select

        from database.db import db_session
        from database.models import SaitCache

        loc_key = location.cache_key()
        with db_session() as session:
            row = session.execute(
                select(SaitCache).where(
                    SaitCache.bs_year == bs_year,
                    SaitCache.category == category,
                    SaitCache.location_key == loc_key,
                )
            ).scalar_one_or_none()
            if row is None or row.engine_version != engine_version:
                return None
            return json.loads(row.payload)
    except Exception:  # pragma: no cover - defensive
        logger.exception("sait DB cache read failed (%s/%s)", bs_year, category)
        return None


def save_sait_db(
    payload: dict[str, Any],
    location: ObserverLocation,
    engine_version: str,
) -> None:
    """Upsert a computed payload keyed by (year, category, location)."""
    if not db_available():
        return
    try:
        from sqlalchemy import select

        from database.db import db_session
        from database.models import SaitCache

        loc_key = location.cache_key()
        body = json.dumps(payload, ensure_ascii=False)
        with db_session() as session:
            row = session.execute(
                select(SaitCache).where(
                    SaitCache.bs_year == payload["bs_year"],
                    SaitCache.category == payload["category"],
                    SaitCache.location_key == loc_key,
                )
            ).scalar_one_or_none()
            if row is None:
                session.add(
                    SaitCache(
                        bs_year=payload["bs_year"],
                        category=payload["category"],
                        location_key=loc_key,
                        engine_version=engine_version,
                        payload=body,
                    )
                )
            else:
                row.payload = body
                row.engine_version = engine_version
    except Exception:  # pragma: no cover - defensive
        # Concurrent inserts can collide on the unique key; the value is
        # identical, so a lost write is harmless — just log and move on.
        logger.exception("sait DB cache write failed (%s/%s)", payload.get("bs_year"), payload.get("category"))
