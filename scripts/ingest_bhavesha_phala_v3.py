"""Re-populate `bhaveshPhala` from the re-verified BPHS ch. 13 transcription.

`bhaveshPhala` was emptied to `{}` in commit 3d05efb ("Refactor
bhava_reference.json to enhance grahaKarakatva section") pending
re-verification of its shlokas — see `bhava_reference.py`'s module
docstring. This script restores it from
``../bhavesha-phala-bphs-report-v3.md`` (sibling to this repo), a fresh,
fully re-verified transcription of बृहत्पाराशर होराशास्त्र, अध्याय १३
(भावेशफलाध्यायः): all 144 house-lord → house-placement combinations, each
with a real cited shloka (0 "not found" per that document's own summary
section) — a strict improvement over the pre-removal table, which had 5
uncovered pairs falling back to paraphrased text with `shloka: null`.

The source's 12 `## N भाव ... को स्वामी ...` groups and, within each, 12
`### N भाव ... → M भाव ... मा` subsections appear in strict house order
(1-12 then 1-12), so entries are assigned by position rather than by
parsing the Devanagari numerals in the headings (which would need a
digit-conversion table for no benefit — position is unambiguous here and
the source's own "१४४ भावेश फल प्रमाणीकरण सारांश" footer confirms all 144
are present with a matched shloka).

Run from the repo root: ``python scripts/ingest_bhavesha_phala_v3.py``
"""

from __future__ import annotations

import json
import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SOURCE_MD = REPO_ROOT.parent / "bhavesha-phala-bphs-report-v3.md"
TARGET_JSON = REPO_ROOT / "data" / "bhava_reference.json"

SECTION_RE = re.compile(
    r"^### .+?→ .+?मा\s*\n"
    r"📜 \*\*.+?\*\*\n"
    r"```sanskrit\n(?P<shloka>.+?)\n```\n"
    r"\n"
    r"\*\*अर्थ:\*\* (?P<meaning>.+?)\s*\n"
    r"(?=\n---|\Z)",
    re.MULTILINE | re.DOTALL,
)


def main() -> None:
    text = SOURCE_MD.read_text(encoding="utf-8")

    entries = list(SECTION_RE.finditer(text))
    assert len(entries) == 144, f"expected 144 entries, found {len(entries)}"

    payload: dict[str, dict[str, dict]] = {}
    for i, m in enumerate(entries):
        house = i // 12 + 1
        target = i % 12 + 1
        shloka = m.group("shloka").strip()
        meaning = m.group("meaning").strip()
        payload.setdefault(str(house), {})[str(target)] = {
            "shloka": shloka,
            "ne": meaning,
            "en": meaning,
        }

    with TARGET_JSON.open("r", encoding="utf-8") as f:
        data = json.load(f)

    data["bhaveshPhala"] = payload
    data["bhaveshPhalaSource"] = (
        "बृहत्पाराशरहोराशास्त्रम्, अध्याय १३ (भावेशफलाध्यायः) — पूर्ण १४४ "
        "संयोजन, पुनः प्रमाणित संस्करण"
    )
    data["version"] = "2026.09.14.1"

    with TARGET_JSON.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"Wrote bhaveshPhala: {sum(len(v) for v in payload.values())} entries across {len(payload)} houses")


if __name__ == "__main__":
    main()
