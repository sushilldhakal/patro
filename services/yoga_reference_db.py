"""Static reference catalog of the 162 planetary combinations from B. V. Raman's
'Three Hundred Important Combinations' (Part I).

The source of truth is the checked-in ``data/yoga_reference.json``. This module
seeds it into a small SQLite table (``data/yoga_reference.db``, gitignored and
rebuilt on demand — the same pattern as the cities DB) and exposes read-only
lookups by id, by name, and full-text search. It is reference data, kept out of
both the Postgres user store and the kundali report cache.
"""

from __future__ import annotations

import json
import sqlite3
import threading
from typing import Any

from engine.astronomy.paths import (
    yoga_reference_db_path,
    yoga_reference_source_path,
)

_SCHEMA = """
CREATE TABLE IF NOT EXISTS yoga_combinations (
    yoga_id       TEXT PRIMARY KEY,
    sort_order    INTEGER NOT NULL,
    name          TEXT NOT NULL,
    name_ne       TEXT NOT NULL,
    definition    TEXT NOT NULL,
    definition_ne TEXT NOT NULL,
    result        TEXT NOT NULL,
    result_ne     TEXT NOT NULL,
    source        TEXT NOT NULL,
    part          TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_yoga_combinations_name
    ON yoga_combinations(name);
CREATE TABLE IF NOT EXISTS yoga_reference_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
"""

_seed_lock = threading.Lock()
_seeded = False


def _connect() -> sqlite3.Connection:
    db_path = yoga_reference_db_path()
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path, timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def _load_source() -> dict[str, Any]:
    with open(yoga_reference_source_path(), encoding="utf-8") as fh:
        return json.load(fh)


def ensure_seeded() -> None:
    """Create the table and (re)seed it whenever the JSON version advances.

    Idempotent and cheap: on a matching version it does nothing but a single
    metadata read, so it is safe to call before every lookup.
    """
    global _seeded
    if _seeded:
        return
    with _seed_lock:
        if _seeded:
            return
        data = _load_source()
        version = str(data.get("version", 0))
        with _connect() as conn:
            conn.executescript(_SCHEMA)
            current = conn.execute(
                "SELECT value FROM yoga_reference_meta WHERE key = 'version'"
            ).fetchone()
            if current is not None and current["value"] == version:
                _seeded = True
                return
            conn.execute("DELETE FROM yoga_combinations")
            conn.executemany(
                """
                INSERT INTO yoga_combinations
                    (yoga_id, sort_order, name, name_ne, definition,
                     definition_ne, result, result_ne, source, part)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    (
                        c["yoga_id"],
                        int(c["sort"]),
                        c["name"],
                        c.get("name_ne", c["name"]),
                        c["definition"],
                        c.get("definition_ne", c["definition"]),
                        c["result"],
                        c.get("result_ne", c["result"]),
                        data.get("source", ""),
                        data.get("part", ""),
                    )
                    for c in data["combinations"]
                ],
            )
            conn.execute(
                "INSERT INTO yoga_reference_meta(key, value) VALUES('version', ?) "
                "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                (version,),
            )
            conn.commit()
        _seeded = True


def _row(r: sqlite3.Row) -> dict[str, Any]:
    return {
        "yogaId": r["yoga_id"],
        "name": r["name"],
        "nameNe": r["name_ne"],
        "definition": r["definition"],
        "definitionNe": r["definition_ne"],
        "result": r["result"],
        "resultNe": r["result_ne"],
        "source": r["source"],
        "part": r["part"],
    }


def get_all() -> list[dict[str, Any]]:
    ensure_seeded()
    with _connect() as conn:
        rows = conn.execute(
            "SELECT * FROM yoga_combinations ORDER BY sort_order"
        ).fetchall()
    return [_row(r) for r in rows]


def get_by_id(yoga_id: str) -> dict[str, Any] | None:
    ensure_seeded()
    with _connect() as conn:
        row = conn.execute(
            "SELECT * FROM yoga_combinations WHERE yoga_id = ?", (yoga_id,)
        ).fetchone()
    return _row(row) if row else None


def search(query: str) -> list[dict[str, Any]]:
    """Case-insensitive match over name, definition and result."""
    ensure_seeded()
    like = f"%{query.strip()}%"
    with _connect() as conn:
        rows = conn.execute(
            """
            SELECT * FROM yoga_combinations
            WHERE name LIKE ? COLLATE NOCASE
               OR definition LIKE ? COLLATE NOCASE
               OR result LIKE ? COLLATE NOCASE
               OR name_ne LIKE ?
               OR definition_ne LIKE ?
               OR result_ne LIKE ?
            ORDER BY sort_order
            """,
            (like, like, like, like, like, like),
        ).fetchall()
    return [_row(r) for r in rows]
