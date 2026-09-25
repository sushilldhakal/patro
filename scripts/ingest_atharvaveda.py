#!/usr/bin/env python3
"""Build data/documents_source/atharvaveda.json from data/atharvaveda_source/.

The source is twenty ``atharvaveda_kaanda_<N>.json`` files (the Shaunaka
recension), one per Kaanda: each a list of ``{veda, samhita, kaanda, sukta,
text}`` objects. ``text`` bundles three things for a Sukta, in order:

1. A title line (its traditional subject, e.g. "मेधाजननम्।").
2. An attribution line — verse range, Rishi, Devata, Chhanda — whose format
   varies a lot sukta to sukta (single verse vs. range, nested parenthetical
   per-verse breakdowns, multi-line for the longer Kandas). Not parsed here;
   see the module docstring note below.
3. The mantras themselves, each closed by a printed "॥<number>॥" marker.

Every Kaanda becomes one chapter (mirrors ingest_rigveda.py's Mandala →
chapter), and each Sukta's real ``sukta`` number becomes ``sukta_number`` —
already globally correct per Kaanda straight from the source, unlike the
Yajurveda's printed numbering (no reset/renumbering needed here). Rishi /
Devata / Chhanda are left null for now: the attribution line's format is too
irregular to parse reliably without risking wrong data (unlike the Yajurveda
catalog's clean table) — see scripts/build_yajurveda_authorship.py for the
precedent this intentionally does *not* follow yet.

The title/attribution preamble is stripped rather than merged into the first
mantra: a line is treated as preamble as long as it doesn't itself contain a
"॥" verse-closing marker (title lines never do; the first real verse line
always does), so this works whether a Sukta has a title only, a title plus
an attribution line, or a multi-line attribution.

Run from the repo root:

    python3 scripts/ingest_atharvaveda.py

Re-run any time data/atharvaveda_source/*.json changes — it fully overwrites
data/documents_source/atharvaveda.json, and the API re-seeds automatically on
the next request because the manifest's bytes changed.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "data/atharvaveda_source"
OUT = ROOT / "data/documents_source/atharvaveda.json"

TITLE_SA = "अथर्ववेदः"
TITLE_NE = "अथर्ववेद"
TITLE_EN = "Atharvaveda"
SOURCE_EN = "Atharvaveda — Shaunaka Samhita (Devanagari text, public domain digitisation)"
SOURCE_NE = "अथर्ववेद — शौनक संहिता"

_MARKER_RE = re.compile(r"॥\s*([^॥]{1,10}?)\s*॥")
# Vedic pitch-accent combining marks (udatta ॑, anudatta ॒, the Vedic
# extensions block, and the handful of accent chars living in Devanagari
# Extended) — present in essentially every mantra line of a chanted Samhita
# text, and never in a prose title or attribution line.
_ACCENT_RE = re.compile(r"[॑-॔᳐-᳿꣠-ꣿ]")


def _verse_stream(text: str) -> str:
    """Everything from the first real mantra line onward — drops the title
    line and, when present, the attribution line(s) above it.

    Both title and attribution lines are unaccented prose (even one naming a
    Rishi or Devata, e.g. "मेधातिथिः। वेदः। त्रिष्टुप्।"), while every mantra
    line carries Vedic accent marks — so a line is preamble exactly when it
    has neither an accent mark nor a "॥" closing marker. That holds whether
    the preamble is a title alone, title + one attribution line, a title
    split across two lines, several chained attribution clauses (Kaanda 13
    Sukta 6 runs to three), or — for about a third of Kaanda 20, borrowed
    straight from the Rigveda — no preamble at all, straight to verse.
    """
    lines = text.splitlines(keepends=True)
    for i, line in enumerate(lines):
        if "॥" in line or _ACCENT_RE.search(line):
            return "".join(lines[i:])
    return ""


def _split_sukta(text: str) -> list[str]:
    """The Sanskrit of each mantra in this Sukta, in order."""
    stream = _verse_stream(text)
    mantras: list[str] = []
    pos = 0
    for m in _MARKER_RE.finditer(stream):
        raw = stream[pos:m.start()]
        sanskrit = re.sub(r"\s+", " ", raw).strip()
        if sanskrit:
            mantras.append(sanskrit)
        pos = m.end()
    return mantras


def _load_kaanda(path: Path) -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = json.loads(path.read_text(encoding="utf-8"))
    entries.sort(key=lambda e: int(e["sukta"]))
    return entries


def build_manifest() -> dict[str, Any]:
    paths = sorted(
        SOURCE_DIR.glob("atharvaveda_kaanda_*.json"),
        key=lambda p: int(re.search(r"_(\d+)\.json$", p.name).group(1)),
    )

    chapters: list[dict[str, Any]] = []
    total_verses = 0
    total_suktas = 0
    for path in paths:
        kaanda_number = int(re.search(r"_(\d+)\.json$", path.name).group(1))
        suktas = _load_kaanda(path)

        shlokas: list[dict[str, Any]] = []
        verse_number = 0
        for entry in suktas:
            sukta_number = int(entry["sukta"])
            mantras = _split_sukta(entry["text"])
            if not mantras:
                # A handful of suktas in the source carry only an attribution
                # line and no transcribed mantra text (e.g. Kaanda 20's
                # Rigveda-derived suktas 3 and 13) — nothing to add.
                continue
            total_suktas += 1
            for rik_number, sanskrit in enumerate(mantras, start=1):
                verse_number += 1
                shlokas.append(
                    {
                        "verse_number": verse_number,
                        "verse_label": f"{sukta_number}.{rik_number}",
                        "sukta_number": sukta_number,
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
                "number": kaanda_number,
                "title_ne": f"काण्ड {kaanda_number}",
                "title_en": f"Kaanda {kaanda_number}",
                "shlokas": shlokas,
            }
        )

    chapters.sort(key=lambda c: c["number"])

    return {
        "slug": "atharvaveda",
        "order_index": 102,
        "category": "scripture",
        "title_sa": TITLE_SA,
        "title_ne": TITLE_NE,
        "title_en": TITLE_EN,
        "subtitle_ne": f"{len(chapters)} काण्ड, {total_suktas} सूक्त",
        "subtitle_en": f"{len(chapters)} Kandas, {total_suktas} Suktas",
        "description_ne": "अथर्ववेदको शौनक संहिता — सम्पूर्ण २० काण्ड।",
        "description_en": "The complete Atharvaveda (Shaunaka Samhita) across all twenty Kandas.",
        "source_ne": SOURCE_NE,
        "source_en": SOURCE_EN,
        "cover_image": None,
        "has_chapters": True,
        "inline_chapters": False,
        "chapters": chapters,
    }


def main() -> None:
    if not SOURCE_DIR.is_dir():
        raise SystemExit(f"Not found: {SOURCE_DIR}")
    manifest = build_manifest()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        json.dumps(manifest, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    chapter_count = len(manifest["chapters"])
    shloka_count = sum(len(c["shlokas"]) for c in manifest["chapters"])
    print(f"Wrote {OUT.relative_to(ROOT)}: {chapter_count} kandas, {shloka_count} mantras")


if __name__ == "__main__":
    main()
