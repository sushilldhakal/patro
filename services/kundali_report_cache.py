"""SQLite cache for generated kundali interpretation reports.

Reports are keyed by birth instant + observer location + ayanamsha + language so
repeat requests with the same inputs are served without recomputing.
"""

from __future__ import annotations

import json
import logging
import os
import sqlite3
from datetime import datetime, timezone
from typing import Any

from engine.astronomy.location import ObserverLocation
from engine.astronomy.paths import kundali_db_path
from services.panchanga_cache import resolve_cache_keys

logger = logging.getLogger(__name__)

# Bump when cached record shape or report algorithm changes.
CACHE_PAYLOAD_VERSION = 1

_SCHEMA = """
CREATE TABLE IF NOT EXISTS kundali_report_cache (
    cache_key TEXT PRIMARY KEY,
    birth_instant TEXT NOT NULL,
    location_key TEXT NOT NULL,
    ayanamsha TEXT NOT NULL,
    lang TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    computed_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_kundali_report_cache_lookup
    ON kundali_report_cache(birth_instant, location_key, ayanamsha, lang);
"""


def cache_enabled() -> bool:
    return os.environ.get("KUNDALI_REPORT_CACHE", "true").lower() not in {"0", "false", "no"}


def _connect() -> sqlite3.Connection:
    db_path = kundali_db_path()
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path, timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def ensure_schema() -> None:
    with _connect() as conn:
        conn.executescript(_SCHEMA)


def make_cache_key(
    birth_instant: str,
    location: ObserverLocation,
    ayanamsha: str,
    lang: str,
) -> str:
    location_key, _ = resolve_cache_keys(location)
    return f"{birth_instant}|{location_key}|{ayanamsha}|{lang}"


def _payload_valid(payload: dict[str, Any]) -> bool:
    if payload.get("_cache_version", 0) < CACHE_PAYLOAD_VERSION:
        return False
    records = payload.get("records")
    if not isinstance(records, list) or not records:
        return False
    has_meta = any(r.get("kind") == "meta" for r in records if isinstance(r, dict))
    has_done = any(r.get("kind") == "done" for r in records if isinstance(r, dict))
    return has_meta and has_done


def get_cached_report(cache_key: str) -> list[dict[str, Any]] | None:
    if not cache_enabled():
        return None

    ensure_schema()
    with _connect() as conn:
        row = conn.execute(
            "SELECT payload_json FROM kundali_report_cache WHERE cache_key = ?",
            (cache_key,),
        ).fetchone()

    if row is None:
        return None

    payload = json.loads(row["payload_json"])
    if not _payload_valid(payload):
        logger.debug("Stale kundali report cache for %s — recomputing", cache_key)
        return None
    return payload["records"]


def store_report_cache(
    cache_key: str,
    *,
    birth_instant: str,
    location: ObserverLocation,
    ayanamsha: str,
    lang: str,
    records: list[dict[str, Any]],
) -> None:
    if not cache_enabled():
        return

    location_key, _ = resolve_cache_keys(location)
    ensure_schema()
    payload = {
        "_cache_version": CACHE_PAYLOAD_VERSION,
        "records": records,
    }
    row = {
        "cache_key": cache_key,
        "birth_instant": birth_instant,
        "location_key": location_key,
        "ayanamsha": ayanamsha,
        "lang": lang,
        "payload_json": json.dumps(payload, ensure_ascii=False),
        "computed_at": datetime.now(timezone.utc).isoformat(),
    }

    with _connect() as conn:
        conn.execute(
            """
            INSERT INTO kundali_report_cache (
                cache_key, birth_instant, location_key, ayanamsha, lang,
                payload_json, computed_at
            ) VALUES (
                :cache_key, :birth_instant, :location_key, :ayanamsha, :lang,
                :payload_json, :computed_at
            )
            ON CONFLICT(cache_key) DO UPDATE SET
                birth_instant = excluded.birth_instant,
                location_key = excluded.location_key,
                ayanamsha = excluded.ayanamsha,
                lang = excluded.lang,
                payload_json = excluded.payload_json,
                computed_at = excluded.computed_at
            """,
            row,
        )
        conn.commit()
