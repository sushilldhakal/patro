"""Turn the Purana CSV dataset into JSON manifests in data/documents_source/.

The CSVs (`calender-patro/purana/*.csv`, or `PURANA_SOURCE_DIR`) are only read
here, on a machine that has them. What the API seeds from — locally and on
the server — is the checked-in `<slug>.json` each run writes, like the
Mahabharata and the Ramayana.

    python scripts/ingest_puranas.py            # every Purana whose CSV is present
    python scripts/ingest_puranas.py garuda-purana agni-purana

Re-run after changing the mapping in services/scripture/purana_documents.py.
"""

from __future__ import annotations

import json
import sqlite3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from engine.astronomy.paths import documents_source_dir  # noqa: E402
from services.scripture.documents_db import _SCHEMA  # noqa: E402
from services.scripture.purana_documents import PURANAS, purana_dir, seed_puranas  # noqa: E402

_DOC_FIELDS = (
    "slug", "order_index", "category", "subcategory", "title_sa", "title_ne", "title_en",
    "subtitle_ne", "subtitle_en", "description_ne", "description_en", "source_ne", "source_en",
)
_OPTIONAL_VERSE_FIELDS = ("transliteration", "meaning_ne", "meaning_en")


def _manifest(conn: sqlite3.Connection, slug: str) -> dict:
    doc = conn.execute("SELECT * FROM documents WHERE slug = ?", (slug,)).fetchone()
    manifest = {field: doc[field] for field in _DOC_FIELDS}
    manifest["has_chapters"] = True
    manifest["inline_chapters"] = False
    rows = conn.execute(
        "SELECT * FROM shlokas WHERE document_slug = ? ORDER BY global_order", (slug,)
    ).fetchall()
    # A few CSVs return to an earlier chapter near the end (a verse range filed
    # out of place); its verses join that chapter rather than open it twice.
    by_number: dict[int | None, list[sqlite3.Row]] = {}
    for row in rows:
        by_number.setdefault(row["chapter_number"], []).append(row)
    chapters = []
    for number, verses in by_number.items():
        shlokas = []
        for v in verses:
            shloka = {"verse_number": v["verse_number"], "verse_label": v["verse_label"], "sanskrit": v["sanskrit"]}
            for field in _OPTIONAL_VERSE_FIELDS:
                if v[field]:
                    shloka[field] = v[field]
            shlokas.append(shloka)
        chapters.append(
            {
                "number": number,
                "title_ne": verses[0]["chapter_title_ne"],
                "title_en": verses[0]["chapter_title_en"],
                "shlokas": shlokas,
            }
        )
    manifest["chapters"] = chapters
    return manifest


def main(only: list[str]) -> None:
    if purana_dir() is None:
        sys.exit("No Purana CSV folder: put the CSVs in calender-patro/purana/ or set PURANA_SOURCE_DIR.")
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    conn.executescript(_SCHEMA)
    seed_puranas(conn)
    out_dir = documents_source_dir()
    for spec in PURANAS:
        if only and spec.slug not in only:
            continue
        if conn.execute("SELECT 1 FROM documents WHERE slug = ?", (spec.slug,)).fetchone() is None:
            print(f"skip {spec.slug}: no CSV")
            continue
        manifest = _manifest(conn, spec.slug)
        path = out_dir / f"{spec.slug}.json"
        path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        verses = sum(len(c["shlokas"]) for c in manifest["chapters"])
        print(f"wrote {path.name}: {len(manifest['chapters'])} chapters, {verses} verses")


if __name__ == "__main__":
    main(sys.argv[1:])
