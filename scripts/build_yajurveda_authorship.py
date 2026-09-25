#!/usr/bin/env python3
"""Build data/yajurveda_authorship.json from the Adhyaya catalog markdown.

Traditional Rishi / Devata / Chhanda per mantra-range, keyed "<adhyaya>":
a list of {start, end, rishi, devata, chhanda} in reading order, where
start/end are 1-based mantra positions within that Adhyaya (matching the
running ``verse_number`` ingest_yajurveda.py assigns, not the source's own
printed — occasionally duplicated — numbering).

The source (data/yajurveda_source/yajurveda-adhyaya-catalog.md) gives one
markdown table per Adhyaya, each row covering a contiguous range of mantras
("**1.1 – 1.3**" or a single "**40.1**"). The catalog's closing "SUMMARY
TABLE OF ALL 40 ADHYAYAS" section is a coarser re-statement of the same
per-Adhyaya headers and is intentionally not parsed here.

ingest_yajurveda.py merges this file into each shloka by (adhyaya, position),
the same way ingest_rigveda.py merges rigveda_authorship.json by
(mandala, sukta) — see services/documents_db.py's sukta_number column and
the frontend's DocumentChapterDetail page, which groups a chapter's shlokas
back into these ranges and shows the Rishi/Devata/Chhanda header per group.

    python3 scripts/build_yajurveda_authorship.py
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "data/yajurveda_source/yajurveda-adhyaya-catalog.md"
OUT = ROOT / "data/yajurveda_authorship.json"

CHAPTER_HEADER_RE = re.compile(r"^###\s*\*\*.*?CHAPTER\s+(\d+)", re.IGNORECASE)
SUMMARY_HEADER_RE = re.compile(r"^##\s*\*\*SUMMARY TABLE", re.IGNORECASE)
ROW_RE = re.compile(
    r"^\|\s*\*\*(\d+)\.(\d+)(?:\s*[–—-]\s*(?:\d+\.)?(\d+))?\*\*\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|"
)


def _clean(cell: str) -> str:
    return cell.replace("**", "").strip()


def build_manifest() -> dict[str, list[dict[str, Any]]]:
    lines = CATALOG.read_text(encoding="utf-8").splitlines()

    chapters: dict[str, list[dict[str, Any]]] = {}
    current: list[dict[str, Any]] | None = None

    for line in lines:
        if SUMMARY_HEADER_RE.match(line):
            break

        header = CHAPTER_HEADER_RE.match(line)
        if header:
            current = []
            chapters[str(int(header.group(1)))] = current
            continue

        if current is None:
            continue

        row = ROW_RE.match(line)
        if not row:
            continue
        start, end = int(row.group(2)), int(row.group(3) or row.group(2))
        current.append(
            {
                "start": start,
                "end": end,
                "rishi": _clean(row.group(4)),
                "devata": _clean(row.group(5)),
                "chhanda": _clean(row.group(6)),
            }
        )

    return chapters


def main() -> None:
    if not CATALOG.is_file():
        raise SystemExit(f"Not found: {CATALOG}")
    manifest = build_manifest()
    OUT.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=False) + "\n",
        encoding="utf-8",
    )
    total_ranges = sum(len(v) for v in manifest.values())
    print(f"Wrote {OUT.relative_to(ROOT)}: {len(manifest)} adhyayas, {total_ranges} mantra ranges")


if __name__ == "__main__":
    main()
