"""Replace the portal's private-use glyphs in text already merged (see vedcom_glyphs.py). Idempotent."""

from __future__ import annotations

import json
from pathlib import Path

from vedcom_glyphs import GLYPHS, clean

ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    for veda in sorted({v for v, _ in GLYPHS}):
        path = ROOT / f"data/documents_source/{veda}.json"
        raw = path.read_text(encoding="utf-8")
        doc = json.loads(raw)
        fixed = 0
        for chapter in doc["chapters"]:
            for shloka in chapter["shlokas"]:
                for field in sorted({f for v, f in GLYPHS if v == veda}):
                    new = clean(veda, field, shloka.get(field))
                    if new != shloka.get(field):
                        shloka[field] = new
                        fixed += 1
        path.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + ("\n" if raw.endswith("\n") else ""), encoding="utf-8")
        print(f"{veda}: {fixed} fields repaired")


if __name__ == "__main__":
    main()
