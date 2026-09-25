#!/usr/bin/env python3
"""Build data/documents_source/yajurveda.json from data/yajurveda_source/.

The source file (``vajasneyi_madhyadina_samhita.json``) is the Shukla
Yajurveda's Vajasaneyi Madhyandina Samhita: a list of 40 objects, one per
Adhyaya, each carrying the whole Adhyaya's text as a single Devanagari
string with each mantra closed by a printed "।। <number> ।।" marker (the
numbering restarts at 1 in every Adhyaya).

That's a flatter structure than the Rigveda's Mandala → Sukta → rik (no
Sukta-equivalent grouping is present in this source), so this script maps
onto the documents schema's two levels directly: each Adhyaya becomes one
chapter, and each "।। N ।।"-delimited span of text becomes one shloka.
``sukta_number`` is left null throughout — same as every other non-Rigveda
document (see services/documents_db.py).

Run from the repo root:

    python3 scripts/ingest_yajurveda.py

Re-run any time data/yajurveda_source/vajasneyi_madhyadina_samhita.json
changes — it fully overwrites data/documents_source/yajurveda.json, and the
API re-seeds automatically on the next request because the manifest's bytes
changed.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data/yajurveda_source/vajasneyi_madhyadina_samhita.json"
OUT = ROOT / "data/documents_source/yajurveda.json"

# Traditional Rishi/Devata/Chhanda per mantra-range (see
# scripts/build_yajurveda_authorship.py) — merged in below by (adhyaya,
# 1-based mantra position). A chapter's trailing mantras past its last
# documented range simply get no attribution, same as Rigveda riks with no
# Anukramani entry yet.
AUTHORSHIP_PATH = ROOT / "data/yajurveda_authorship.json"

TITLE_SA = "यजुर्वेदः"
TITLE_NE = "यजुर्वेद"
TITLE_EN = "Yajurveda"
SOURCE_EN = (
    "Shukla Yajurveda — Vajasaneyi Madhyandina Samhita (Devanagari text, "
    "public domain digitisation)"
)
SOURCE_NE = "शुक्ल यजुर्वेद — वाजसनेयि माध्यन्दिन संहिता"

_DEVANAGARI_DIGITS = str.maketrans("०१२३४५६७८९", "0123456789")

# A mantra-closing marker: "।। <number> ।।", with inconsistent internal
# spacing in the source (sometimes "।। १।।", sometimes "।। १० ।।", sometimes
# a stray space splitting the digits themselves, e.g. "१ ०" for "१०").
_MARKER_RE = re.compile(r"।।\s*([^।]{1,15}?)\s*।।")


def _marker_number(raw: str) -> str | None:
    cleaned = re.sub(r"\s+", "", raw).translate(_DEVANAGARI_DIGITS)
    return cleaned if cleaned.isdigit() else None


def _load_authorship() -> dict[str, list[dict[str, Any]]]:
    if not AUTHORSHIP_PATH.is_file():
        return {}
    return json.loads(AUTHORSHIP_PATH.read_text(encoding="utf-8"))


def _range_lookup(ranges: list[dict[str, Any]], position: int) -> tuple[int, dict[str, Any]] | None:
    """The (1-based) range index and entry covering this mantra position, if any."""
    for i, entry in enumerate(ranges, start=1):
        if entry["start"] <= position <= entry["end"]:
            return i, entry
    return None


def _split_adhyaya(text: str) -> list[tuple[str, str]]:
    """Split one Adhyaya's raw text into (verse_label, sanskrit) pairs, in order."""
    verses: list[tuple[str, str]] = []
    pos = 0
    for m in _MARKER_RE.finditer(text):
        number = _marker_number(m.group(1))
        if number is None:
            # Not a verse-number marker (essentially never happens in this
            # source once digit-splitting whitespace is stripped) — skip
            # rather than mis-split a mantra in two.
            continue
        raw_verse = text[pos:m.start()]
        sanskrit = re.sub(r"\s+", " ", raw_verse).strip()
        if sanskrit:
            verses.append((number, sanskrit))
        pos = m.end()
    return verses


def build_manifest() -> dict[str, Any]:
    source: list[dict[str, Any]] = json.loads(SOURCE.read_text(encoding="utf-8"))
    source.sort(key=lambda d: int(d["adhyaya"]))
    authorship = _load_authorship()

    chapters: list[dict[str, Any]] = []
    total_verses = 0
    for adhyaya_entry in source:
        adhyaya_number = int(adhyaya_entry["adhyaya"])
        verses = _split_adhyaya(adhyaya_entry["text"])
        ranges = authorship.get(str(adhyaya_number), [])

        shlokas: list[dict[str, Any]] = []
        for verse_number, (verse_label, sanskrit) in enumerate(verses, start=1):
            found = _range_lookup(ranges, verse_number)
            range_index, attribution = found if found else (None, {})
            shlokas.append(
                {
                    "verse_number": verse_number,
                    "verse_label": verse_label,
                    "sukta_number": range_index,
                    "sukta_rishi": attribution.get("rishi"),
                    "sukta_devata": attribution.get("devata"),
                    "sukta_chhanda": attribution.get("chhanda"),
                    "sanskrit": sanskrit,
                    "transliteration": None,
                    "meaning_ne": None,
                    "meaning_en": None,
                    "audio_file": None,
                }
            )
        total_verses += len(shlokas)

        chapters.append(
            {
                "number": adhyaya_number,
                "title_ne": f"अध्याय {adhyaya_number}",
                "title_en": f"Adhyaya {adhyaya_number}",
                "shlokas": shlokas,
            }
        )

    return {
        "slug": "yajurveda",
        "order_index": 101,
        "category": "scripture",
        "title_sa": TITLE_SA,
        "title_ne": TITLE_NE,
        "title_en": TITLE_EN,
        "subtitle_ne": f"{len(chapters)} अध्याय, {total_verses} मन्त्र",
        "subtitle_en": f"{len(chapters)} Adhyayas, {total_verses} mantras",
        "description_ne": "शुक्ल यजुर्वेदको वाजसनेयि माध्यन्दिन संहिता — सम्पूर्ण ४० अध्याय।",
        "description_en": (
            "The complete Shukla Yajurveda Vajasaneyi Madhyandina Samhita across "
            "all forty Adhyayas."
        ),
        "source_ne": SOURCE_NE,
        "source_en": SOURCE_EN,
        "cover_image": None,
        "has_chapters": True,
        "inline_chapters": False,
        "chapters": chapters,
    }


def main() -> None:
    if not SOURCE.is_file():
        raise SystemExit(f"Not found: {SOURCE}")
    manifest = build_manifest()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        json.dumps(manifest, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    chapter_count = len(manifest["chapters"])
    shloka_count = sum(len(c["shlokas"]) for c in manifest["chapters"])
    print(f"Wrote {OUT.relative_to(ROOT)}: {chapter_count} adhyayas, {shloka_count} mantras")


if __name__ == "__main__":
    main()
