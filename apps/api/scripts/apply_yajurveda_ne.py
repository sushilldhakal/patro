#!/usr/bin/env python3
"""Copy Nepali meanings from ``data/vedcom_source/yajurveda_ne.jsonl`` into Yajurveda.

Each line is ``{"label": "1.1", "meaning_ne": "..."}``. Only ``meaning_ne`` on
the matching Yajurveda verse is written. ``meaning_en`` and every other Veda are
left untouched. Running again updates labels already present, so a batch can be
rewritten and reapplied. Verses absent from the file keep their current value
(null, until a batch covers them).
"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    src = ROOT / "data/vedcom_source/yajurveda_ne.jsonl"
    meanings: dict[str, str] = {}
    for line in src.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        row = json.loads(line)
        meanings[row["label"]] = row["meaning_ne"]

    path = ROOT / "data/documents_source/yajurveda.json"
    raw = path.read_text(encoding="utf-8")
    doc = json.loads(raw)
    applied = 0
    for chapter in doc["chapters"]:
        for shloka in chapter["shlokas"]:
            text = meanings.get(shloka["verse_label"])
            if text is None:
                continue
            shloka["meaning_ne"] = text
            applied += 1
    missing = len(set(meanings) - {s["verse_label"] for c in doc["chapters"] for s in c["shlokas"]})
    path.write_text(
        json.dumps(doc, ensure_ascii=False, indent=2) + ("\n" if raw.endswith("\n") else ""),
        encoding="utf-8",
    )
    print(f"applied {applied} of {len(meanings)} ({missing} labels not in yajurveda)")


if __name__ == "__main__":
    main()
