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

from datetime import date

import hashlib
import json
import sqlite3
import threading
from string import Formatter
from pathlib import Path
from typing import Any

from engine.astronomy.paths import documents_db_path, documents_source_dir

_ADDED_COLUMNS: list[tuple[str, str]] = [
    ("category", "TEXT NOT NULL DEFAULT 'stotram'"),
    ("subcategory", "TEXT"),
    ("inline_chapters", "INTEGER NOT NULL DEFAULT 0"),
    # JSON object: {"1": ["documents/slug/a.png", ...]} — ritual diagrams etc.
    ("chapter_images", "TEXT"),
]

# Same additive/nullable/idempotent pattern as _ADDED_COLUMNS, but for the
# shlokas table. sukta_number groups a chaptered scripture's verses one level
# below "chapter" (e.g. the Rigveda: chapter = Mandala, sukta = the group of
# verses within it) without forcing every document to model suktas — it's
# simply null for anything that doesn't have them.
_ADDED_SHLOKA_COLUMNS: list[tuple[str, str]] = [
    ("sukta_number", "INTEGER"),
    ("sukta_rishi", "TEXT"),
    ("sukta_devata", "TEXT"),
    ("sukta_chhanda", "TEXT"),
    # Which Veda verse this shloka quotes, e.g. "rigveda:1.1.3". Null when it
    # isn't a quotation from the four samhitas.
    ("veda_cite", "TEXT"),
    # Each mantra's own details, as the Ved Portal (वेद.com) gives them, in Devanagari.
    ("devata", "TEXT"),
    ("rishi", "TEXT"),
    ("chhanda", "TEXT"),
    ("svara", "TEXT"),
    ("padapatha", "TEXT"),
    ("meaning_hi", "TEXT"),
    # Samaveda mantra with the pitch digits (1, 2, 3) above the syllables.
    ("sanskrit_swara", "TEXT"),
]

_SCHEMA = """
CREATE TABLE IF NOT EXISTS documents (
    slug            TEXT PRIMARY KEY,
    order_index     INTEGER NOT NULL DEFAULT 0,
    category        TEXT NOT NULL DEFAULT 'stotram',
    subcategory     TEXT,
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
    full_audio_key  TEXT,
    chapter_images  TEXT
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
    sukta_rishi             TEXT,
    sukta_devata            TEXT,
    sukta_chhanda           TEXT,
    veda_cite               TEXT,
    devata                  TEXT,
    rishi                   TEXT,
    chhanda                 TEXT,
    svara                   TEXT,
    padapatha               TEXT,
    meaning_hi              TEXT,
    sanskrit_swara          TEXT,
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
_seeded_stamp = 0.0
_current_version: str | None = None


def _connect() -> sqlite3.Connection:
    db_path = documents_db_path()
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path, timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


VERSE_DETAIL_KINDS = ("devata", "rishi", "chhanda", "svara")


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
    for kind in VERSE_DETAIL_KINDS:
        conn.execute(f"CREATE INDEX IF NOT EXISTS idx_shlokas_{kind} ON shlokas({kind}, global_order)")
    # Keyset chapter pages filter (document, chapter, global_order). CREATE TABLE
    # on a new file includes it; an existing database only picks it up here.
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_shlokas_document_chapter "
        "ON shlokas(document_slug, chapter_number, global_order)"
    )


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
    from services.scripture.shloka_sources import SOURCE_LOGIC_VERSION

    digest.update(SOURCE_LOGIC_VERSION)
    return digest.hexdigest()


def _default_audio_file(chapter_number: int | None, verse_number: int) -> str:
    if chapter_number is not None:
        return f"{chapter_number}_{verse_number}.mp3"
    return f"{verse_number}.mp3"


def _verse_prefix(label: str | None, chapter_number: int | None) -> str | None:
    """What a chapter's verse labels start with, when it is not just the chapter number.

    Samaveda pages are its adhyayas but labels are Part.Adhyaya.Mantra, so Uttararchika
    adhyaya 5 (page 13) labels its mantras ``2.5.N``: its prefix ``2.5`` lets a typed
    ``2.5.10`` find the page. Every label in a chapter shares it (all but the last part).
    """
    if not label or label.count(".") < 2:
        return None
    prefix = label.rsplit(".", 1)[0]
    # Rigveda "9.1.1" on mandala 9: the first number already names the chapter.
    if chapter_number is not None and prefix.split(".", 1)[0] == str(chapter_number):
        return None
    return prefix


def _verse_in_sukta(shloka: dict[str, Any]) -> int:
    """The shloka's place inside its sukta.

    ``verse_number`` runs through the whole chapter (a Rigveda mandala numbers
    its riks straight through). The label is ``{mandala}.{sukta}.{verse}`` — ``1.120.2`` is the
    second rik of sukta 120 — which is what the audio filenames count.
    """
    label = shloka.get("verse_label")
    if isinstance(label, str) and "." in label:
        tail = label.rsplit(".", 1)[-1]
        if tail.isdigit():
            return int(tail)
    return int(shloka["verse_number"])


def _audio_file_from_template(template: str, shloka: dict[str, Any]) -> str | None:
    """Fill ``audio_template`` from whichever fields the pattern names.

    Rigveda uses ``{mandala}``, ``{sukta}`` and ``{verse}``. Yajurveda names
    each mantra ``yajurveda_{adhyaya}_{mantra}.mp3`` (no sukta). Samaveda is
    one sequence across the whole samhita, ``samaveda_{index:04d}.mp3``.
    A field is required only when the template actually contains it.
    """
    needed = {name for _, name, _, _ in Formatter().parse(template) if name}
    values: dict[str, int] = {}
    if "mandala" in needed:
        mandala = shloka.get("chapter_number")
        if mandala is None:
            return None
        values["mandala"] = int(mandala)
    if "sukta" in needed:
        sukta = shloka.get("sukta_number")
        if sukta is None:
            return None
        values["sukta"] = int(sukta)
    if "verse" in needed:
        if "verse_number" not in shloka:
            return None
        values["verse"] = _verse_in_sukta(shloka)
    if "index" in needed:
        index = shloka.get("index")
        if index is None:
            return None
        values["index"] = int(index)
    try:
        return template.format(**values)
    except (KeyError, ValueError, IndexError):
        return None


def _audio_in_coverage(shloka: dict[str, Any], coverage: dict[str, Any] | None) -> bool:
    """Whether this verse has a clip, when the upload stops partway through.

    ``through_mandala`` includes every earlier chapter in full. ``sukta_caps``
    shortens individual suktas inside those chapters (a cap of 0 means that
    sukta has no clips). ``partial`` lists a later chapter sukta by sukta;
    anything not named there has no clip. Omit coverage to keep every verse.
    """
    if not coverage:
        return True
    mandala = shloka.get("chapter_number")
    if mandala is None:
        return True
    mandala = int(mandala)
    sukta = shloka.get("sukta_number")
    sukta_i = int(sukta) if sukta is not None else None
    verse = _verse_in_sukta(shloka) if "verse_number" in shloka else None

    partial = coverage.get("partial") or {}
    if str(mandala) in partial:
        if sukta_i is None or verse is None:
            return False
        cap = partial[str(mandala)].get(str(sukta_i))
        return cap is not None and verse <= int(cap)

    through = coverage.get("through_mandala")
    if through is not None and mandala > int(through):
        return False
    caps = (coverage.get("sukta_caps") or {}).get(str(mandala)) or {}
    if sukta_i is not None and str(sukta_i) in caps:
        if verse is None:
            return False
        return verse <= int(caps[str(sukta_i)])
    return True


def _resolve_audio_key(
    audio_prefix: str | None,
    shloka: dict[str, Any],
    audio_template: str | None = None,
) -> str | None:
    audio_file: str | None
    if "audio_file" in shloka and shloka["audio_file"]:
        audio_file = str(shloka["audio_file"]).strip() or None
    elif audio_template:
        # An explicit null audio_file means "no clip" unless the document
        # names every verse from a template (the Rigveda files in R2).
        audio_file = _audio_file_from_template(audio_template, shloka)
    elif "audio_file" in shloka:
        return None
    else:
        audio_file = _default_audio_file(shloka.get("chapter_number"), shloka["verse_number"])
    if not audio_file:
        return None
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
    audio_template = manifest.get("audio_template") or None
    audio_coverage = manifest.get("audio_coverage") or None
    full_audio_key = _resolve_full_audio_key(audio_prefix, manifest.get("full_audio_file"))
    chapters = manifest.get("chapters") or []
    chapter_images: dict[str, list[str]] = {}
    for chapter in chapters:
        number = chapter.get("number")
        images = chapter.get("images") or []
        if number is not None and images:
            chapter_images[str(number)] = [str(k).strip() for k in images if str(k).strip()]

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
            positioned = {**shloka, "chapter_number": chapter_number, "index": global_order}
            audio_key = _resolve_audio_key(audio_prefix, positioned, audio_template)
            # An explicit audio_file is a real clip. Coverage only limits keys
            # the template would otherwise invent past the end of the upload.
            if audio_template and not shloka.get("audio_file") and not _audio_in_coverage(positioned, audio_coverage):
                audio_key = None
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
                    shloka.get("sukta_rishi"),
                    shloka.get("sukta_devata"),
                    shloka.get("sukta_chhanda"),
                    shloka.get("veda_cite"),
                    shloka.get("devata"),
                    shloka.get("rishi"),
                    shloka.get("chhanda"),
                    shloka.get("svara"),
                    shloka.get("padapatha"),
                    shloka.get("meaning_hi"),
                    shloka.get("sanskrit_swara"),
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
            (slug, order_index, category, subcategory, title_sa, title_ne, title_en, subtitle_ne, subtitle_en,
             description_ne, description_en, source_ne, source_en, cover_image,
             has_chapters, inline_chapters, chapter_count, shloka_count, full_audio_key, chapter_images)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            slug,
            manifest.get("order_index", 0),
            manifest.get("category", "stotram"),
            manifest.get("subcategory") or None,
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
            json.dumps(chapter_images, ensure_ascii=False) if chapter_images else None,
        ),
    )
    conn.executemany(
        """
        INSERT INTO shlokas
            (document_slug, global_order, chapter_number, chapter_title_ne, chapter_title_en,
             verse_number, verse_label, sukta_number, sukta_rishi, sukta_devata, sukta_chhanda,
             veda_cite, devata, rishi, chhanda, svara, padapatha, meaning_hi,
             sanskrit_swara, sanskrit, transliteration, meaning_ne, meaning_en,
             audio_key, audio_duration_seconds, full_audio_start, full_audio_end)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        rows,
    )


def _manifest_stamp(paths: list[Path] | None = None) -> float:
    """Newest manifest mtime. A running server uses this to notice a new or edited JSON file."""
    latest = 0.0
    for path in paths if paths is not None else _manifest_paths():
        try:
            latest = max(latest, path.stat().st_mtime)
        except OSError:
            continue
    return latest


def ensure_seeded() -> None:
    global _seeded, _seeded_stamp, _current_version
    # Uvicorn --reload watches Python, not these JSON files. Recheck the
    # folder mtime so adding a document shows up on the next request.
    if _seeded and _manifest_stamp() <= _seeded_stamp:
        return
    with _seed_lock:
        paths = _manifest_paths()
        stamp = _manifest_stamp(paths)
        if _seeded and stamp <= _seeded_stamp:
            return
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
                _seeded_stamp = stamp
                return

            # The Puranas are manifests too (scripts/ingest_puranas.py writes them
            # from the CSV dataset), so the server needs nothing beyond git.
            for path in paths:
                manifest = json.loads(path.read_text(encoding="utf-8"))
                _seed_from_manifest(conn, manifest)

            from services.scripture.shloka_sources import fill_sources

            fill_sources(conn)

            conn.execute(
                "INSERT INTO documents_meta (key, value) VALUES ('version', ?) "
                "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                (version,),
            )
        _current_version = version
        _seeded = True
        _seeded_stamp = stamp


def content_version() -> str:
    """Content-hash version of the currently seeded manifests.

    Changes only when a manifest's bytes change, so callers (the response
    cache) can key off it and get automatic invalidation on content edits
    without a manual cache-bust step.
    """
    ensure_seeded()
    return _current_version or "0"


def _row_to_document_summary(row: sqlite3.Row) -> dict[str, Any]:
    # subcategory is optional on databases created before the library groups.
    subcategory = row["subcategory"] if "subcategory" in row.keys() else None
    return {
        "slug": row["slug"],
        "order_index": row["order_index"],
        "category": row["category"],
        "subcategory": subcategory,
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


def _chapter_images_map(doc_row: sqlite3.Row) -> dict[str, list[str]]:
    if "chapter_images" not in doc_row.keys():
        return {}
    raw = doc_row["chapter_images"]
    if not raw:
        return {}
    try:
        data = json.loads(raw)
    except (TypeError, ValueError):
        return {}
    if not isinstance(data, dict):
        return {}
    out: dict[str, list[str]] = {}
    for key, value in data.items():
        if isinstance(value, list):
            out[str(key)] = [str(v) for v in value if v]
    return out


def _attach_chapter_images(chapters: list[dict[str, Any]], doc_row: sqlite3.Row) -> None:
    images = _chapter_images_map(doc_row)
    if not images:
        return
    for chapter in chapters:
        number = chapter.get("number")
        if number is None:
            continue
        keys = images.get(str(number)) or []
        if keys:
            chapter["images"] = keys


def _shloka_row_to_dict(r: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": r["id"],
        "global_order": r["global_order"],
        "verse_number": r["verse_number"],
        "verse_label": r["verse_label"],
        "sukta_number": r["sukta_number"],
        "sukta_rishi": r["sukta_rishi"],
        "sukta_devata": r["sukta_devata"],
        "sukta_chhanda": r["sukta_chhanda"],
        "veda_cite": r["veda_cite"] if "veda_cite" in r.keys() else None,
        "devata": r["devata"],
        "rishi": r["rishi"],
        "chhanda": r["chhanda"],
        "svara": r["svara"],
        "padapatha": r["padapatha"],
        "meaning_hi": r["meaning_hi"],
        "sanskrit_swara": r["sanskrit_swara"] if "sanskrit_swara" in r.keys() else None,
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

    _attach_chapter_images(chapters, doc_row)
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
                       COUNT(*) AS shloka_count,
                       -- With MIN() in the list, SQLite reads verse_label off that same row.
                       MIN(global_order) AS first_order, verse_label AS first_label
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
                    "verse_prefix": _verse_prefix(r["first_label"], r["chapter_number"]),
                }
                for r in chapter_rows
            ]

    _attach_chapter_images(chapters, doc_row)
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


_LATIN_DIGITS = str.maketrans("०१२३४५६७८९", "0123456789")
_DEVA_DIGITS = str.maketrans("0123456789", "०१२३४५६७८९")

CHAPTER_PAGE_DEFAULT = 25
CHAPTER_PAGE_MAX = 100


def clamp_page_limit(limit: int | None) -> int:
    """Page size for a chapter: 25 unless the caller asked, never outside 1..100."""
    if limit is None:
        return CHAPTER_PAGE_DEFAULT
    return max(1, min(CHAPTER_PAGE_MAX, int(limit)))


def verse_label_key(label: str) -> str:
    """Verse label with Devanagari digits folded to Latin, for lookup and cache keys."""
    return label.strip().translate(_LATIN_DIGITS)


def verse_label_forms(label: str) -> list[str]:
    """Spellings to match: the typed label, Latin digits, and Devanagari digits."""
    raw = label.strip()
    latin = raw.translate(_LATIN_DIGITS)
    deva = latin.translate(_DEVA_DIGITS)
    forms: list[str] = []
    for form in (raw, latin, deva):
        if form and form not in forms:
            forms.append(form)
    return forms


def get_chapter_shlokas(slug: str, chapter_number: int) -> dict[str, Any] | None:
    """One chapter's shlokas, filtered directly in SQL.

    Unlike routing a chapter request through :func:`get_document_detail`, this
    never reads (or Python-regroups) any other chapter's verse text.
    """
    ensure_seeded()
    with _connect() as conn:
        doc_row = conn.execute("SELECT * FROM documents WHERE slug = ?", (slug,)).fetchone()
        shloka_rows = conn.execute(
            "SELECT * FROM shlokas WHERE document_slug = ? AND chapter_number = ? "
            "ORDER BY global_order ASC",
            (slug, chapter_number),
        ).fetchall()
    if not shloka_rows:
        return None
    first = shloka_rows[0]
    chapter = {
        "number": first["chapter_number"],
        "title_ne": first["chapter_title_ne"],
        "title_en": first["chapter_title_en"],
        "shlokas": [_shloka_row_to_dict(r) for r in shloka_rows],
    }
    if doc_row is not None:
        _attach_chapter_images([chapter], doc_row)
    return chapter


def _chapter_meta(conn: sqlite3.Connection, slug: str, chapter_number: int) -> sqlite3.Row | None:
    return conn.execute(
        "SELECT chapter_number, chapter_title_ne, chapter_title_en, COUNT(*) AS total "
        "FROM shlokas WHERE document_slug = ? AND chapter_number = ?",
        (slug, chapter_number),
    ).fetchone()


def _rows_after(
    conn: sqlite3.Connection, slug: str, chapter_number: int, cursor: int | None, limit: int
) -> list[sqlite3.Row]:
    """Verses with global_order strictly after `cursor` (or the first `limit` when cursor is None)."""
    if cursor is None:
        return conn.execute(
            "SELECT * FROM shlokas WHERE document_slug = ? AND chapter_number = ? "
            "ORDER BY global_order ASC LIMIT ?",
            (slug, chapter_number, limit),
        ).fetchall()
    return conn.execute(
        "SELECT * FROM shlokas WHERE document_slug = ? AND chapter_number = ? AND global_order > ? "
        "ORDER BY global_order ASC LIMIT ?",
        (slug, chapter_number, cursor, limit),
    ).fetchall()


def _rows_before(
    conn: sqlite3.Connection, slug: str, chapter_number: int, cursor: int | None, limit: int
) -> list[sqlite3.Row]:
    """Verses with global_order strictly before `cursor`, returned in reading order.

    With no cursor, this is the last `limit` verses of the chapter.
    """
    if cursor is None:
        rows = conn.execute(
            "SELECT * FROM shlokas WHERE document_slug = ? AND chapter_number = ? "
            "ORDER BY global_order DESC LIMIT ?",
            (slug, chapter_number, limit),
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM shlokas WHERE document_slug = ? AND chapter_number = ? AND global_order < ? "
            "ORDER BY global_order DESC LIMIT ?",
            (slug, chapter_number, cursor, limit),
        ).fetchall()
    rows.reverse()
    return rows


def _page_cursors(
    conn: sqlite3.Connection, slug: str, chapter_number: int, rows: list[sqlite3.Row]
) -> tuple[int | None, int | None]:
    """prev_cursor / next_cursor are global_order values, null when that direction is exhausted."""
    if not rows:
        return None, None
    first = int(rows[0]["global_order"])
    last = int(rows[-1]["global_order"])
    has_prev = conn.execute(
        "SELECT 1 FROM shlokas WHERE document_slug = ? AND chapter_number = ? AND global_order < ? LIMIT 1",
        (slug, chapter_number, first),
    ).fetchone()
    has_next = conn.execute(
        "SELECT 1 FROM shlokas WHERE document_slug = ? AND chapter_number = ? AND global_order > ? LIMIT 1",
        (slug, chapter_number, last),
    ).fetchone()
    return (first if has_prev else None, last if has_next else None)


def _page_around(
    conn: sqlite3.Connection, slug: str, chapter_number: int, anchor: int, limit: int
) -> list[sqlite3.Row]:
    """`limit` verses with `anchor` roughly in the middle, clipped to the chapter ends."""
    before = (limit - 1) // 2
    n_before = conn.execute(
        "SELECT COUNT(*) FROM shlokas WHERE document_slug = ? AND chapter_number = ? AND global_order < ?",
        (slug, chapter_number, anchor),
    ).fetchone()[0]
    n_after = conn.execute(
        "SELECT COUNT(*) FROM shlokas WHERE document_slug = ? AND chapter_number = ? AND global_order > ?",
        (slug, chapter_number, anchor),
    ).fetchone()[0]
    take_before = min(before, n_before)
    take_after = limit - 1 - take_before
    if take_after > n_after:
        take_before = min(n_before, take_before + (take_after - n_after))
        take_after = n_after
    anchor_row = conn.execute(
        "SELECT * FROM shlokas WHERE document_slug = ? AND chapter_number = ? AND global_order = ?",
        (slug, chapter_number, anchor),
    ).fetchone()
    if anchor_row is None:
        return []
    prev_rows = _rows_before(conn, slug, chapter_number, anchor, take_before) if take_before else []
    next_rows = _rows_after(conn, slug, chapter_number, anchor, take_after) if take_after else []
    return [*prev_rows, anchor_row, *next_rows]


def get_chapter_page(
    slug: str,
    chapter_number: int,
    *,
    cursor: int | None,
    direction: str,
    limit: int,
    verse: str | None,
) -> dict[str, Any] | None:
    """One keyset page of a chapter.

    ``verse`` (a verse_label, Devanagari or Latin digits) returns the page that
    contains it, with that verse roughly centred. Otherwise ``cursor`` is a
    global_order and ``direction`` is ``next`` (global_order greater) or
    ``prev`` (global_order less). No OFFSET. Returns None when the chapter
    does not exist. An unknown verse raises LookupError.
    """
    ensure_seeded()
    limit = clamp_page_limit(limit)
    if direction not in ("next", "prev"):
        direction = "next"
    with _connect() as conn:
        doc_row = conn.execute("SELECT * FROM documents WHERE slug = ?", (slug,)).fetchone()
        meta = _chapter_meta(conn, slug, chapter_number)
        if meta is None or not meta["total"]:
            return None
        if verse and verse.strip():
            forms = verse_label_forms(verse)
            placeholders = ",".join("?" * len(forms))
            found = conn.execute(
                f"SELECT global_order FROM shlokas WHERE document_slug = ? AND chapter_number = ? "
                f"AND verse_label IN ({placeholders}) ORDER BY global_order ASC LIMIT 1",
                (slug, chapter_number, *forms),
            ).fetchone()
            if found is None:
                raise LookupError(f"No such verse: {verse.strip()}")
            rows = _page_around(conn, slug, chapter_number, int(found["global_order"]), limit)
        elif direction == "prev":
            rows = _rows_before(conn, slug, chapter_number, cursor, limit)
        else:
            rows = _rows_after(conn, slug, chapter_number, cursor, limit)
        prev_cursor, next_cursor = _page_cursors(conn, slug, chapter_number, rows)
    chapter = {
        "number": meta["chapter_number"],
        "title_ne": meta["chapter_title_ne"],
        "title_en": meta["chapter_title_en"],
        "shlokas": [_shloka_row_to_dict(r) for r in rows],
        "total": int(meta["total"]),
        "prev_cursor": prev_cursor,
        "next_cursor": next_cursor,
    }
    if doc_row is not None:
        _attach_chapter_images([chapter], doc_row)
    return chapter


VEDA_SLUGS = ("rigveda", "yajurveda", "samaveda", "atharvaveda")

#: Mantras a card can show comfortably — and, being picked only among verses
#: with a recording, every one of them has audio.
_DAILY_MIN_CHARS = 20
_DAILY_MAX_CHARS = 260


def daily_veda_shloka(day: "date") -> dict[str, Any] | None:
    """The mantra of the day: one verse that has audio, the same for everyone.

    The Veda rotates by day (so all four come round evenly); the chapter is
    drawn in proportion to how many eligible verses it holds, and the verse
    uniformly within it — from a generator seeded on the date, so a given date
    always gives the same mantra on every server and every device.
    """
    import random

    ensure_seeded()
    rng = random.Random(f"veda-daily:{day.isoformat()}")
    slug = VEDA_SLUGS[day.toordinal() % len(VEDA_SLUGS)]
    eligible = (
        "document_slug = ? AND audio_key IS NOT NULL AND audio_key != '' "
        "AND length(sanskrit) BETWEEN ? AND ?"
    )
    args = (slug, _DAILY_MIN_CHARS, _DAILY_MAX_CHARS)
    with _connect() as conn:
        chapters = conn.execute(
            f"SELECT chapter_number, COUNT(*) AS n FROM shlokas WHERE {eligible} "
            "GROUP BY chapter_number ORDER BY chapter_number",
            args,
        ).fetchall()
        total = sum(r["n"] for r in chapters)
        if total == 0:
            return None
        pick = rng.randrange(total)
        chapter_number = chapters[-1]["chapter_number"]
        for row in chapters:
            if pick < row["n"]:
                chapter_number = row["chapter_number"]
                break
            pick -= row["n"]
        row = conn.execute(
            f"SELECT * FROM shlokas WHERE {eligible} AND chapter_number = ? "
            "ORDER BY global_order ASC LIMIT 1 OFFSET ?",
            (*args, chapter_number, pick),
        ).fetchone()
    if row is None:
        return None
    shloka = _shloka_row_to_dict(row)
    shloka["document_slug"] = slug
    shloka["chapter_number"] = row["chapter_number"]
    shloka["chapter_title_ne"] = row["chapter_title_ne"]
    shloka["chapter_title_en"] = row["chapter_title_en"]
    return shloka


def detail_values(kind: str, slug: str | None = None) -> list[dict[str, Any]]:
    """Every distinct देवता / ऋषि / छन्द / स्वर and how many mantras carry it, most first.

    ``slug`` keeps it to one Veda. Feeds the value dropdown on the verse-detail pages.
    """
    if kind not in VERSE_DETAIL_KINDS:
        raise ValueError(f"Unknown detail: {kind}")
    ensure_seeded()
    where = f"{kind} IS NOT NULL AND {kind} != ''"
    params: list[Any] = []
    if slug:
        where += " AND document_slug = ?"
        params.append(slug)
    with _connect() as conn:
        rows = conn.execute(
            f"SELECT {kind} AS value, COUNT(*) AS count FROM shlokas WHERE {where} GROUP BY {kind} ORDER BY count DESC, value",
            params,
        ).fetchall()
    return [{"value": r["value"], "count": r["count"]} for r in rows]


def verses_with_detail(
    kind: str, value: str, slug: str | None = None, offset: int = 0, limit: int = 50
) -> dict[str, Any]:
    """Every mantra whose देवता / ऋषि / छन्द / स्वर is ``value``, in reading order.

    ``slug`` keeps it to one Veda; without it every Veda that has the detail is searched.
    """
    if kind not in VERSE_DETAIL_KINDS:
        raise ValueError(f"Unknown detail: {kind}")
    ensure_seeded()
    where = f"s.{kind} = ?"
    params: list[Any] = [value.strip()]
    if slug:
        where += " AND s.document_slug = ?"
        params.append(slug)
    with _connect() as conn:
        total = conn.execute(f"SELECT COUNT(*) FROM shlokas s WHERE {where}", params).fetchone()[0]
        rows = conn.execute(
            f"""
            SELECT s.*, d.title_ne AS document_title_ne, d.title_en AS document_title_en
            FROM shlokas s JOIN documents d ON d.slug = s.document_slug
            WHERE {where}
            ORDER BY d.order_index, s.global_order
            LIMIT ? OFFSET ?
            """,
            [*params, limit, offset],
        ).fetchall()
    verses = [
        {
            **_shloka_row_to_dict(r),
            "document_slug": r["document_slug"],
            "document_title_ne": r["document_title_ne"],
            "document_title_en": r["document_title_en"],
            "chapter_number": r["chapter_number"],
        }
        for r in rows
    ]
    return {"kind": kind, "value": value.strip(), "total": total, "offset": offset, "verses": verses}
