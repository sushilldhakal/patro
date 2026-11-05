"""Replace the portal's private-use glyphs in text already merged (see vedcom_glyphs.py). Idempotent."""

from __future__ import annotations

import json
from pathlib import Path

from vedcom_glyphs import SANSKRIT_GLYPHS, clean_sanskrit

ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    for veda in SANSKRIT_GLYPHS:
        path = ROOT / f"data/documents_source/{veda}.json"
        raw = path.read_text(encoding="utf-8")
        doc = json.loads(raw)
        fixed = 0
        for chapter in doc["chapters"]:
            for shloka in chapter["shlokas"]:
                new = clean_sanskrit(veda, shloka.get("sanskrit"))
                if new != shloka.get("sanskrit"):
                    shloka["sanskrit"] = new
                    fixed += 1
        path.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + ("\n" if raw.endswith("\n") else ""), encoding="utf-8")
        print(f"{veda}: {fixed} verses repaired")


if __name__ == "__main__":
    main()
