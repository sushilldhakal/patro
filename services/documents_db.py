"""Documents (शोत्र/स्तोत्र) reference data — Sanskrit text, meanings, audio refs.

The source of truth is the hand-authored ``data/documents_source/*.json``
manifests (see that folder's README for the format). This module seeds them
into ``data/documents.db`` (gitignored, rebuilt on demand — same pattern as
``vastu_rules_db.py``) and exposes read-only lookups. It is reference data
shared by every viewer, kept out of the Postgres user store.

Re-seeding is content-hash versioned: a sha256 over every manifest's raw
bytes is stored in ``documents_meta``, so editing a shloka or adding a new
document and redeploying is enough — no manual "bump the version" step.
"""

from __future__ import annotations

import hashlib
import json
import sqlite3
import threading
from pathlib import Path
from typing import Any

from engine.astronomy.paths import documents_db_path, documents_source_dir

_ADDED_COLUMNS: list[tuple[str, str]] = [
    ("category", "TEXT NOT NULL DEFAULT 'stotram'"),
    ("inline_chapters", "INTEGER NOT NULL DEFAULT 0"),
]

# Same additive/nullable/idempotent pattern as _ADDED_COLUMNS, but for the
# shlokas table. sukta_number groups a chaptered scripture's verses one level
# below "chapter" (e.g. the Rigveda: chapter = Mandala, sukta = the group of
# verses within it) without forcing every document to model suktas — it's
# simply null for anything that doesn't have them.
_ADDED_SHLOKA_COLUMNS: list[tuple[str, str]] = [
    ("sukta_number", "INTEGER"),
]

_SCHEMA = """
CREATE TABLE IF NOT EXISTS documents (
    slug            TEXT PRIMARY KEY,
    order_index     INTEGER NOT NULL DEFAULT 0,
    category        TEXT NOT NULL DEFAULT 'stotram',
    title_sa        TEXT NOT NULL,
    title_ne        TEXT NOT NULL,
    title_en        TEXT NOT NULL,
    subtitle_ne     TEXT,
    subtitle_en     TEXT,
    description_ne  TEXT,
    description_en  TEXT,
    source_ne       TEXT,
    source_en       TEXT,
    cover_image     TEXT,
    has_chapters    INTEGER NOT NULL DEFAULT 0,
    inline_chapters INTEGER NOT NULL DEFAULT 0,
    chapter_count   INTEGER NOT NULL DEFAULT 0,
    shloka_count    INTEGER NOT NULL DEFAULT 0,
    full_audio_key  TEXT
);

CREATE TABLE IF NOT EXISTS shlokas (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    document_slug           TEXT NOT NULL REFERENCES documents(slug),
    global_order            INTEGER NOT NULL,
    chapter_number          INTEGER,
    chapter_title_ne        TEXT,
    chapter_title_en        TEXT,
    verse_number            INTEGER NOT NULL,
    verse_label             TEXT NOT NULL,
    sukta_number            INTEGER,
    sanskrit                TEXT NOT NULL,
    transliteration         TEXT,
    meaning_ne              TEXT,
    meaning_en              TEXT,
    audio_key               TEXT,
    audio_duration_seconds  REAL,
    full_audio_start        REAL,
    full_audio_end          REAL
);
CREATE INDEX IF NOT EXISTS idx_shlokas_document_order
    ON shlokas(document_slug, global_order);
CREATE INDEX IF NOT EXISTS idx_shlokas_document_chapter
    ON shlokas(document_slug, chapter_number, global_order);

CREATE TABLE IF NOT EXISTS documents_meta (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
"""

_seed_lock = threading.Lock()
_seeded = False
_current_version: str | None = None


def _connect() -> sqlite3.Connection:
    db_path = documents_db_path()
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path, timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def _migrate_added_columns(conn: sqlite3.Connection) -> None:
    """Add missing columns to an existing table. Additive, nullable, idempotent."""
    existing = {row[1] for row in conn.execute("PRAGMA table_info(documents)")}
    if existing:
        for name, coltype in _ADDED_COLUMNS:
            if name in existing:
                continue
            conn.execute(f"ALTER TABLE documents ADD COLUMN {name} {coltype}")

    existing_shloka_cols = {row[1] for row in conn.execute("PRAGMA table_info(shlokas)")}
    if existing_shloka_cols:
        for name, coltype in _ADDED_SHLOKA_COLUMNS:
            if name in existing_shloka_cols:
                continue
            conn.execute(f"ALTER TABLE shlokas ADD COLUMN {name} {coltype}")


def _manifest_paths() -> list[Path]:
    src_dir = documents_source_dir()
    if not src_dir.is_dir():
        return []
    # Leading-underscore files (e.g. _example.json) are templates, not content.
    return sorted(p for p in src_dir.glob("*.json") if not p.name.startswith("_"))


def _content_version(paths: list[Path]) -> str:
    digest = hashlib.sha256()
    for path in paths:
        digest.update(path.name.encode("utf-8"))
        digest.update(path.read_bytes())
    return digest.hexdigest()


def _default_audio_file(chapter_number: int | None, verse_number: int) -> str:
    if chapter_number is not None:
        return f"{chapter_number}_{verse_number}.mp3"
    return f"{verse_number}.mp3"


def _resolve_audio_key(audio_prefix: str | None, shloka: dict[str, Any]) -> str | None:
    if "audio_file" in shloka:
        audio_file = shloka["audio_file"]
        if audio_file is None:
            return None
        audio_file = str(audio_file).strip()
        if not audio_file:
            return None
    else:
        audio_file = _default_audio_file(shloka.get("chapter_number"), shloka["verse_number"])
    if audio_file.startswith("http://") or audio_file.startswith("https://"):
        return audio_file
    prefix = (audio_prefix or "").strip().strip("/")
    return f"{prefix}/{audio_file}" if prefix else audio_file


def _resolve_full_audio_key(audio_prefix: str | None, full_audio_file: Any) -> str | None:
    """Same key-joining rule as a shloka's audio, for the whole-document recording."""
    if not full_audio_file:
        return None
    full_audio_file = str(full_audio_file).strip()
    if not full_audio_file:
        return None
    if full_audio_file.startswith("http://") or full_audio_file.startswith("https://"):
        return full_audio_file
    prefix = (audio_prefix or "").strip().strip("/")
    return f"{prefix}/{full_audio_file}" if prefix else full_audio_file


def _seed_from_manifest(conn: sqlite3.Connection, manifest: dict[str, Any]) -> None:
    slug = manifest["slug"]
    has_chapters = bool(manifest.get("has_chapters"))
    inline_chapters = bool(manifest.get("inline_chapters"))
    audio_prefix = manifest.get("audio_prefix")
    full_audio_key = _resolve_full_audio_key(audio_prefix, manifest.get("full_audio_file"))
    chapters = manifest.get("chapters") or []

    global_order = 0
    shloka_count = 0
    chapter_count = 0
    rows: list[tuple[Any, ...]] = []

    for chapter in chapters:
        chapter_number = chapter.get("number") if has_chapters else None
        if chapter_number is not None:
            chapter_count += 1
        for shloka in chapter.get("shlokas") or []:
            global_order += 1
            shloka_count += 1
            audio_key = _resolve_audio_key(
                audio_prefix, {**shloka, "chapter_number": chapter_number}
            )
            rows.append(
                (
                    slug,
                    global_order,
                    chapter_number,
                    chapter.get("title_ne"),
                    chapter.get("title_en"),
                    shloka["verse_number"],
                    shloka.get("verse_label") or str(shloka["verse_number"]),
                    shloka.get("sukta_number"),
                    shloka["sanskrit"],
                    shloka.get("transliteration"),
                    shloka.get("meaning_ne"),
                    shloka.get("meaning_en"),
                    audio_key,
                    shloka.get("audio_duration_seconds"),
                    shloka.get("full_audio_start"),
                    shloka.get("full_audio_end"),
                )
            )

    conn.execute("DELETE FROM shlokas WHERE document_slug = ?", (slug,))
    conn.execute("DELETE FROM documents WHERE slug = ?", (slug,))

    conn.execute(
        """
        INSERT INTO documents
            (slug, order_index, category, title_sa, title_ne, title_en, subtitle_ne, subtitle_en,
             description_ne, description_en, source_ne, source_en, cover_image,
             has_chapters, inline_chapters, chapter_count, shloka_count, full_audio_key)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            slug,
            manifest.get("order_index", 0),
            manifest.get("category", "stotram"),
            manifest["title_sa"],
            manifest["title_ne"],
            manifest["title_en"],
            manifest.get("subtitle_ne"),
            manifest.get("subtitle_en"),
            manifest.get("description_ne"),
            manifest.get("description_en"),
            manifest.get("source_ne"),
            manifest.get("source_en"),
            manifest.get("cover_image") or None,
            1 if has_chapters else 0,
            1 if inline_chapters else 0,
            chapter_count,
            shloka_count,
            full_audio_key,
        ),
    )
    conn.executemany(
        """
        INSERT INTO shlokas
            (document_slug, global_order, chapter_number, chapter_title_ne, chapter_title_en,
             verse_number, verse_label, sukta_number, sanskrit, transliteration, meaning_ne, meaning_en,
             audio_key, audio_duration_seconds, full_audio_start, full_audio_end)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        rows,
    )


def ensure_seeded() -> None:
    global _seeded, _current_version
    if _seeded:
        return
    with _seed_lock:
        if _seeded:
            return
        paths = _manifest_paths()
        version = _content_version(paths)
        with _connect() as conn:
            conn.executescript(_SCHEMA)
            _migrate_added_columns(conn)
            current = conn.execute(
                "SELECT value FROM documents_meta WHERE key = 'version'"
            ).fetchone()
            if current is not None and current["value"] == version:
                _current_version = version
                _seeded = True
                return

            for path in paths:
                manifest = json.loads(path.read_text(encoding="utf-8"))
                _seed_from_manifest(conn, manifest)

            conn.execute(
                "INSERT INTO documents_meta (key, value) VALUES ('version', ?) "
                "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                (version,),
            )
        _current_version = version
        _seeded = True


def content_version() -> str:
    """Content-hash version of the currently seeded manifests.

    Changes only when a manifest's bytes change, so callers (the response
    cache) can key off it and get automatic invalidation on content edits
    without a manual cache-bust step.
    """
    ensure_seeded()
    return _current_version or "0"


def _row_to_document_summary(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "slug": row["slug"],
        "order_index": row["order_index"],
        "category": row["category"],
        "title_sa": row["title_sa"],
        "title_ne": row["title_ne"],
        "title_en": row["title_en"],
        "subtitle_ne": row["subtitle_ne"],
        "subtitle_en": row["subtitle_en"],
        "description_ne": row["description_ne"],
        "description_en": row["description_en"],
        "cover_image": row["cover_image"],
        "has_chapters": bool(row["has_chapters"]),
        "inline_chapters": bool(row["inline_chapters"]) if "inline_chapters" in row.keys() else False,
        "chapter_count": row["chapter_count"],
        "shloka_count": row["shloka_count"],
        "full_audio_key": row["full_audio_key"],
    }


def _document_detail_base(doc_row: sqlite3.Row) -> dict[str, Any]:
    detail = _row_to_document_summary(doc_row)
    detail["source_ne"] = doc_row["source_ne"]
    detail["source_en"] = doc_row["source_en"]
    return detail


def _shloka_row_to_dict(r: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": r["id"],
        "global_order": r["global_order"],
        "verse_number": r["verse_number"],
        "verse_label": r["verse_label"],
        "sukta_number": r["sukta_number"],
        "sanskrit": r["sanskrit"],
        "transliteration": r["transliteration"],
        "meaning_ne": r["meaning_ne"],
        "meaning_en": r["meaning_en"],
        "audio_key": r["audio_key"],
        "audio_duration_seconds": r["audio_duration_seconds"],
        "full_audio_start": r["full_audio_start"],
        "full_audio_end": r["full_audio_end"],
    }


def list_documents() -> list[dict[str, Any]]:
    ensure_seeded()
    with _connect() as conn:
        rows = conn.execute(
            "SELECT * FROM documents ORDER BY order_index ASC, title_en ASC"
        ).fetchall()
    return [_row_to_document_summary(r) for r in rows]


def get_document_detail(slug: str) -> dict[str, Any] | None:
    ensure_seeded()
    with _connect() as conn:
        doc_row = conn.execute("SELECT * FROM documents WHERE slug = ?", (slug,)).fetchone()
        if doc_row is None:
            return None
        shloka_rows = conn.execute(
            "SELECT * FROM shlokas WHERE document_slug = ? ORDER BY global_order ASC",
            (slug,),
        ).fetchall()

    chapters: list[dict[str, Any]] = []
    chapters_by_key: dict[Any, dict[str, Any]] = {}
    for r in shloka_rows:
        key = r["chapter_number"]
        chapter = chapters_by_key.get(key)
        if chapter is None:
            chapter = {
                "number": r["chapter_number"],
                "title_ne": r["chapter_title_ne"],
                "title_en": r["chapter_title_en"],
                "shlokas": [],
            }
            chapters_by_key[key] = chapter
            chapters.append(chapter)
        chapter["shlokas"].append(_shloka_row_to_dict(r))

    detail = _document_detail_base(doc_row)
    detail["chapters"] = chapters
    return detail


def get_document_summary(slug: str) -> dict[str, Any] | None:
    """Document metadata plus its chapter list, sized to what ``/documents/{slug}``
    actually returns.

    A paginated chaptered document (``has_chapters`` and not ``inline_chapters``
    — the Gita) gets its chapter list from a ``GROUP BY`` count, never reading
    verse text; its chapters are fetched individually via
    :func:`get_chapter_shlokas`. A document with no chapters, or an
    ``inline_chapters`` one, embeds every verse here since the whole text is
    meant to render on one page regardless.
    """
    ensure_seeded()
    with _connect() as conn:
        doc_row = conn.execute("SELECT * FROM documents WHERE slug = ?", (slug,)).fetchone()
        if doc_row is None:
            return None
        embed_shlokas = (not doc_row["has_chapters"]) or bool(doc_row["inline_chapters"])
        if embed_shlokas:
            shloka_rows = conn.execute(
                "SELECT * FROM shlokas WHERE document_slug = ? ORDER BY global_order ASC",
                (slug,),
            ).fetchall()
            chapters: list[dict[str, Any]] = []
            chapters_by_key: dict[Any, dict[str, Any]] = {}
            for r in shloka_rows:
                key = r["chapter_number"]
                chapter = chapters_by_key.get(key)
                if chapter is None:
                    chapter = {
                        "number": r["chapter_number"],
                        "title_ne": r["chapter_title_ne"],
                        "title_en": r["chapter_title_en"],
                        "shlokas": [],
                    }
                    chapters_by_key[key] = chapter
                    chapters.append(chapter)
                chapter["shlokas"].append(_shloka_row_to_dict(r))
        else:
            chapter_rows = conn.execute(
                """
                SELECT chapter_number, chapter_title_ne, chapter_title_en,
                       COUNT(*) AS shloka_count
                FROM shlokas
                WHERE document_slug = ?
                GROUP BY chapter_number
                ORDER BY MIN(global_order) ASC
                """,
                (slug,),
            ).fetchall()
            chapters = [
                {
                    "number": r["chapter_number"],
                    "title_ne": r["chapter_title_ne"],
                    "title_en": r["chapter_title_en"],
                    "shloka_count": r["shloka_count"],
                }
                for r in chapter_rows
            ]

    detail = _document_detail_base(doc_row)
    detail["chapters"] = chapters
    return detail


def document_summary_lite(slug: str) -> dict[str, Any] | None:
    """Just the document row as a summary dict — no chapters, no shlokas.

    The base payload for a single-chapter response, where building the full
    chapter list (or worse, every chapter's verses) would be wasted work.
    """
    ensure_seeded()
    with _connect() as conn:
        doc_row = conn.execute("SELECT * FROM documents WHERE slug = ?", (slug,)).fetchone()
    if doc_row is None:
        return None
    return _document_detail_base(doc_row)


def get_chapter_shlokas(slug: str, chapter_number: int) -> dict[str, Any] | None:
    """One chapter's shlokas, filtered directly in SQL.

    Unlike routing a chapter request through :func:`get_document_detail`, this
    never reads (or Python-regroups) any other chapter's verse text.
    """
    ensure_seeded()
    with _connect() as conn:
        shloka_rows = conn.execute(
            "SELECT * FROM shlokas WHERE document_slug = ? AND chapter_number = ? "
            "ORDER BY global_order ASC",
            (slug, chapter_number),
        ).fetchall()
    if not shloka_rows:
        return None
    first = shloka_rows[0]
    return {
        "number": first["chapter_number"],
        "title_ne": first["chapter_title_ne"],
        "title_en": first["chapter_title_en"],
        "shlokas": [_shloka_row_to_dict(r) for r in shloka_rows],
    }
