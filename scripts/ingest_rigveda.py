#!/usr/bin/env python3
"""Build data/documents_source/rigveda.json from data/archive.zip.

The zip holds ``complete_rigveda_all_mandalas.json``: a nested
``{"Mandala N": {"Sukta M": [rik, ...]}}`` structure, one entry per ऋक्
(rik/verse) with its samhita text, padapatha (word-split) text and an
English translation.

That three-level structure (Mandala → Sukta → rik) doesn't map onto the
documents schema's two levels (chapter → shloka) on its own, so this script
flattens it: each Mandala becomes one chapter (the app already paginates a
chaptered scripture one chapter at a time, and the Rigveda's ten Mandalas are
exactly that scale), and every rik across all of a Mandala's Suktas becomes
one shloka row carrying a ``sukta_number`` — the UI groups a chapter's
shlokas back into their Sukta breakdown from that field (see
``services/documents_db.py``'s ``sukta_number`` column and the frontend's
`DocumentChapterDetail` page).

Run from the repo root:

    python3 scripts/ingest_rigveda.py

Re-run any time ``data/archive.zip`` changes — it fully overwrites
``data/documents_source/rigveda.json``, and the API re-seeds automatically
on the next request because the manifest's bytes changed.
"""

from __future__ import annotations

import json
import re
import zipfile
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = ROOT / "data/archive.zip"
ARCHIVE_MEMBER = "complete_rigveda_all_mandalas.json"
OUT = ROOT / "data/documents_source/rigveda.json"

MANDALA_RE = re.compile(r"Mandala\s+(\d+)")
SUKTA_RE = re.compile(r"Sukta\s+(\d+)")

TITLE_SA = "ऋग्वेदः"
TITLE_NE = "ऋग्वेद"
TITLE_EN = "Rigveda"
SOURCE_EN = (
    "Rigveda Samhita — Sanskrit (accented) and padapatha text with the "
    "H. H. Wilson English translation (1850–88, public domain)"
)


def _load_source() -> dict[str, Any]:
    with zipfile.ZipFile(ARCHIVE) as zf:
        with zf.open(ARCHIVE_MEMBER) as f:
            return json.load(f)


def _rik_sanskrit(rik: dict[str, Any]) -> str:
    # Prefer the accented text (closer to how it's actually chanted); fall
    # back to the unaccented samhita text if a rik is missing it.
    accented = rik.get("sanskrit_wisdomlib")
    if accented and accented.strip():
        return accented.strip()
    return rik["samhita"]["devanagari"]["text"].strip()


def _rik_transliteration(rik: dict[str, Any]) -> str | None:
    # No continuous samhita transliteration is present in the source — the
    # padapatha (word-by-word) transliteration is the closest available and
    # is still a faithful phonetic reading.
    translit = rik.get("padapatha", {}).get("transliteration", {}).get("text")
    if translit and translit.strip():
        return translit.strip()
    return None


def _rik_meaning(rik: dict[str, Any]) -> str | None:
    translation = rik.get("translation")
    if translation and translation.strip():
        return translation.strip()
    return None


def build_manifest() -> dict[str, Any]:
    source = _load_source()

    # Sort mandalas/suktas numerically — dict insertion order in the source
    # JSON already happens to be sorted, but don't rely on that.
    mandala_keys = sorted(source.keys(), key=lambda k: int(MANDALA_RE.match(k).group(1)))

    chapters: list[dict[str, Any]] = []
    for mandala_key in mandala_keys:
        mandala_number = int(MANDALA_RE.match(mandala_key).group(1))
        suktas = source[mandala_key]
        sukta_keys = sorted(suktas.keys(), key=lambda k: int(SUKTA_RE.match(k).group(1)))

        shlokas: list[dict[str, Any]] = []
        verse_number = 0
        for sukta_key in sukta_keys:
            sukta_number = int(SUKTA_RE.match(sukta_key).group(1))
            for rik in suktas[sukta_key]:
                verse_number += 1
                rik_number = rik["rik_number"]
                shlokas.append(
                    {
                        "verse_number": verse_number,
                        "verse_label": f"{sukta_number}.{rik_number}",
                        "sukta_number": sukta_number,
                        "sanskrit": _rik_sanskrit(rik),
                        "transliteration": _rik_transliteration(rik),
                        "meaning_en": _rik_meaning(rik),
                        # No Nepali translation in the source and no audio —
                        # explicit null (not omitted) so the importer doesn't
                        # synthesize a default "<chapter>_<verse>.mp3" key.
                        "meaning_ne": None,
                        "audio_file": None,
                    }
                )

        chapters.append(
            {
                "number": mandala_number,
                "title_ne": f"मण्डल {mandala_number}",
                "title_en": f"Mandala {mandala_number}",
                "shlokas": shlokas,
            }
        )

    return {
        "slug": "rigveda",
        "order_index": 100,
        "category": "scripture",
        "title_sa": TITLE_SA,
        "title_ne": TITLE_NE,
        "title_en": TITLE_EN,
        "subtitle_ne": "१० मण्डल, १०२८ सूक्त",
        "subtitle_en": "10 Mandalas, 1028 Suktas",
        "description_ne": "ऋग्वेदका सम्पूर्ण दश मण्डल — संहिता, पदपाठ र अर्थसहित।",
        "description_en": (
            "The complete Rigveda across all ten Mandalas — samhita text, "
            "padapatha and English translation, broken down by Sukta."
        ),
        "source_ne": None,
        "source_en": SOURCE_EN,
        "cover_image": None,
        "has_chapters": True,
        "inline_chapters": False,
        "chapters": chapters,
    }


def main() -> None:
    if not ARCHIVE.is_file():
        raise SystemExit(f"Not found: {ARCHIVE}")
    manifest = build_manifest()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        json.dumps(manifest, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    chapter_count = len(manifest["chapters"])
    shloka_count = sum(len(c["shlokas"]) for c in manifest["chapters"])
    print(f"Wrote {OUT.relative_to(ROOT)}: {chapter_count} mandalas, {shloka_count} riks")


if __name__ == "__main__":
    main()
