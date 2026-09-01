"""Vastu zone-use + room-index reference data.

The source of truth is the checked-in ``data/vastu_zone_uses.json`` (verbatim
per-zone best/avoid content — see ``engine/vedic/vastu/rules.py``) and
``data/vastu_room_index.json`` (the derived room/feature/opening -> zone
index, both produced by ``dhakal-patro/scripts/extract-vastu-content.mjs``
from the web client's existing, cross-referenced zone descriptions). This
module seeds both into one SQLite file (``data/vastu.db``, gitignored and
rebuilt on demand — the same pattern as ``yoga_reference_db.py``) and exposes
read-only lookups. It is reference data, kept out of the Postgres user store.
"""

from __future__ import annotations

import json
import sqlite3
import threading
from typing import Any

from engine.astronomy.paths import (
    vastu_db_path,
    vastu_room_index_source_path,
    vastu_zone_uses_source_path,
)

_SCHEMA = """
CREATE TABLE IF NOT EXISTS vastu_zone_uses (
    zone_ref            TEXT PRIMARY KEY,
    granularity         TEXT NOT NULL,
    zone_id             TEXT NOT NULL,
    name_ne             TEXT,
    name_en             TEXT,
    deity_ne            TEXT,
    deity_en            TEXT,
    importance_ne       TEXT,
    importance_en       TEXT,
    best_ne             TEXT NOT NULL,
    best_en             TEXT NOT NULL,
    avoid_ne            TEXT NOT NULL,
    avoid_en            TEXT NOT NULL,
    sources             TEXT NOT NULL,
    verification_status TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_vastu_zone_uses_granularity
    ON vastu_zone_uses(granularity);

CREATE TABLE IF NOT EXISTS vastu_room_index (
    row_id             INTEGER PRIMARY KEY AUTOINCREMENT,
    subject            TEXT NOT NULL,
    subject_type       TEXT NOT NULL,
    zone_ref           TEXT NOT NULL,
    polarity           TEXT NOT NULL,
    matched_phrase_en  TEXT NOT NULL,
    matched_phrase_ne  TEXT,
    zone_note          TEXT
);
CREATE INDEX IF NOT EXISTS idx_vastu_room_index_subject
    ON vastu_room_index(subject);
CREATE INDEX IF NOT EXISTS idx_vastu_room_index_zone
    ON vastu_room_index(zone_ref);

CREATE TABLE IF NOT EXISTS vastu_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
"""

_seed_lock = threading.Lock()
_seeded = False


def _connect() -> sqlite3.Connection:
    db_path = vastu_db_path()
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path, timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def _load_json(path, label: str) -> dict[str, Any]:
    if not path.is_file():
        raise FileNotFoundError(f"{label} source missing: {path}. Commit it and redeploy.")
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def ensure_seeded() -> None:
    """Create both tables and (re)seed them whenever either JSON's version advances.

    Both tables share one version key (the zone-uses version — the two files
    are produced together by the same extraction pass, so they're expected to
    move in lockstep) so a partial re-seed can never leave them out of sync.
    """
    global _seeded
    if _seeded:
        return
    with _seed_lock:
        if _seeded:
            return
        zones_data = _load_json(vastu_zone_uses_source_path(), "Vastu zone-uses")
        index_data = _load_json(vastu_room_index_source_path(), "Vastu room-index")
        version = str(zones_data.get("version", 0))
        with _connect() as conn:
            conn.executescript(_SCHEMA)
            current = conn.execute(
                "SELECT value FROM vastu_meta WHERE key = 'version'"
            ).fetchone()
            if current is not None and current["value"] == version:
                _seeded = True
                return

            conn.execute("DELETE FROM vastu_zone_uses")
            conn.execute("DELETE FROM vastu_room_index")

            sources_json = json.dumps(zones_data.get("sources", []), ensure_ascii=False)
            verification_status = zones_data.get("verification_status", "unverified")

            def field(z: dict, key: str, lang: str) -> str | None:
                v = z.get(key)
                return v[lang] if v else None

            conn.executemany(
                """
                INSERT INTO vastu_zone_uses
                    (zone_ref, granularity, zone_id, name_ne, name_en,
                     deity_ne, deity_en, importance_ne, importance_en,
                     best_ne, best_en, avoid_ne, avoid_en, sources, verification_status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    (
                        f"{z['granularity']}:{z['id']}",
                        z["granularity"],
                        z["id"],
                        field(z, "name", "ne"), field(z, "name", "en"),
                        field(z, "deity", "ne"), field(z, "deity", "en"),
                        field(z, "importance", "ne"), field(z, "importance", "en"),
                        z["best"]["ne"], z["best"]["en"],
                        z["avoid"]["ne"], z["avoid"]["en"],
                        sources_json,
                        verification_status,
                    )
                    for z in zones_data["zones"]
                ],
            )
            conn.executemany(
                """
                INSERT INTO vastu_room_index
                    (subject, subject_type, zone_ref, polarity,
                     matched_phrase_en, matched_phrase_ne, zone_note)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    (
                        m["subject"],
                        m["subject_type"],
                        m["zone"],
                        m["polarity"],
                        m["matched_phrase_en"],
                        m.get("matched_phrase_ne"),
                        m.get("zone_note"),
                    )
                    for m in index_data["mappings"]
                ],
            )
            conn.execute(
                "INSERT INTO vastu_meta(key, value) VALUES('version', ?) "
                "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                (version,),
            )
            conn.commit()
        _seeded = True


def _zone_row(r: sqlite3.Row) -> dict[str, Any]:
    return {
        "zoneRef": r["zone_ref"],
        "granularity": r["granularity"],
        "id": r["zone_id"],
        "name": {"ne": r["name_ne"], "en": r["name_en"]} if r["name_ne"] else None,
        "deity": {"ne": r["deity_ne"], "en": r["deity_en"]} if r["deity_ne"] else None,
        "importance": {"ne": r["importance_ne"], "en": r["importance_en"]} if r["importance_ne"] else None,
        "best": {"ne": r["best_ne"], "en": r["best_en"]},
        "avoid": {"ne": r["avoid_ne"], "en": r["avoid_en"]},
        "sources": json.loads(r["sources"]),
        "verificationStatus": r["verification_status"],
    }


def _mapping_row(r: sqlite3.Row) -> dict[str, Any]:
    return {
        "subject": r["subject"],
        "subjectType": r["subject_type"],
        "zone": r["zone_ref"],
        "polarity": r["polarity"],
        "matchedPhrase": {"en": r["matched_phrase_en"], "ne": r["matched_phrase_ne"]},
        "zoneNote": r["zone_note"],
    }


def get_all_zones(granularity: str | None = None) -> list[dict[str, Any]]:
    ensure_seeded()
    with _connect() as conn:
        if granularity:
            rows = conn.execute(
                "SELECT * FROM vastu_zone_uses WHERE granularity = ? ORDER BY zone_ref",
                (granularity,),
            ).fetchall()
        else:
            rows = conn.execute("SELECT * FROM vastu_zone_uses ORDER BY zone_ref").fetchall()
    return [_zone_row(r) for r in rows]


def get_zone(granularity: str, zone_id: str) -> dict[str, Any] | None:
    ensure_seeded()
    with _connect() as conn:
        row = conn.execute(
            "SELECT * FROM vastu_zone_uses WHERE zone_ref = ?",
            (f"{granularity}:{zone_id}",),
        ).fetchone()
    return _zone_row(row) if row else None


def get_by_subject(subject: str) -> list[dict[str, Any]]:
    ensure_seeded()
    with _connect() as conn:
        rows = conn.execute(
            "SELECT * FROM vastu_room_index WHERE subject = ? ORDER BY polarity, zone_ref",
            (subject,),
        ).fetchall()
    return [_mapping_row(r) for r in rows]


def get_by_zone(granularity: str, zone_id: str) -> list[dict[str, Any]]:
    ensure_seeded()
    with _connect() as conn:
        rows = conn.execute(
            "SELECT * FROM vastu_room_index WHERE zone_ref = ? ORDER BY subject",
            (f"{granularity}:{zone_id}",),
        ).fetchall()
    return [_mapping_row(r) for r in rows]


def all_subjects() -> list[str]:
    ensure_seeded()
    with _connect() as conn:
        rows = conn.execute("SELECT DISTINCT subject FROM vastu_room_index ORDER BY subject").fetchall()
    return [r["subject"] for r in rows]


def rule_version() -> str:
    ensure_seeded()
    with _connect() as conn:
        row = conn.execute("SELECT value FROM vastu_meta WHERE key = 'version'").fetchone()
    return row["value"] if row else "unknown"
