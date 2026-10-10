"""One-off ingestion of the full Lal Kitab source doc into data/bhava_reference.json.

Source: ``../../lal-kitab.md`` (sibling to this repo, alongside
``bhrigu-naadi-sangraha-sutra.md`` and ``jyotish-sutra.md`` — see those files'
own quality notes before ever treating them as ingestion-ready the way this
one is). 15 parts:

  1       आधारभूत नियम        — general rules, no graha/house key
  2-10    per-graha x 12 houses — replaces the old, differently-worded
                                  ``lalKitabHouse`` (was hand-authored from a
                                  different source, 108 entries either way)
  11      ग्रह युति            — 2/3-graha combination effects
  12-15   ऋण-विचार / वर्षफल /
          स्वास्थ्य संकेत /
          धन-समृद्धि-वास्तु    — general guidance, not house-specific

English mirrors Nepali for all of this (translation debt), matching the
existing convention for the other hand-authored-post-launch additions in
this same file (see bhava_reference.py's module docstring).

Run from the repo root: ``python scripts/ingest_lal_kitab.py``
"""

from __future__ import annotations

import json
import re
from datetime import date
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SOURCE_MD = REPO_ROOT.parent / "lal-kitab.md"
TARGET_JSON = REPO_ROOT / "data" / "bhava_reference.json"

GRAHA_MAP = {
    "सूर्य": "sun",
    "चन्द्र": "moon",
    "मंगल": "mars",
    "बुध": "mercury",
    "बृहस्पति": "jupiter",
    "शुक्र": "venus",
    "शनि": "saturn",
    "राहु": "rahu",
    "केतु": "ketu",
}

NEPALI_DIGITS = "०१२३४५६७८९"
DIGIT_TRANSLATE = str.maketrans(NEPALI_DIGITS, "0123456789")

GENERAL_PART_KEYS = {
    "परम्परागत ऋण-विचार": "rinVichar",
    "वर्षफल": "varshaphal",
    "स्वास्थ्य संकेत": "healthSignals",
    "धन, समृद्धि र वास्तु": "wealthVastu",
}

PART_HEADER_RE = re.compile(r"^भाग\s+(\S+)\s+—\s+(.+)$")
GRAHA_HOUSE_RE = re.compile(r"^(\S+)\s+—\s+भाव\s+(\S+)$")
SAFETY_TIP_PREFIX = "सुरक्षित व्यवहारिक सुझाव:"


def to_int(s: str) -> int:
    return int(s.translate(DIGIT_TRANSLATE))


def bilingual(ne: str) -> dict[str, str]:
    return {"ne": ne, "en": ne}


def parse(lines: list[str]) -> dict:
    lal_kitab_house: dict[str, dict[str, dict]] = {g: {} for g in GRAHA_MAP.values()}
    safety_tips: dict[str, dict] = {}
    yuti: list[dict] = []
    basics: list[dict] = []
    general: dict[str, list[dict]] = {v: [] for v in GENERAL_PART_KEYS.values()}

    i = 0
    n = len(lines)
    current_part_title = None

    while i < n:
        line = lines[i]
        m = PART_HEADER_RE.match(line)
        if m:
            current_part_title = m.group(2).strip()
            i += 1
            continue

        if current_part_title in GRAHA_MAP:
            graha_key = GRAHA_MAP[current_part_title]
            gh = GRAHA_HOUSE_RE.match(line)
            if gh:
                house = to_int(gh.group(2))
                i += 1
                body = lines[i]
                lal_kitab_house[graha_key][str(house)] = bilingual(body)
                i += 1
                continue
            if line.startswith(SAFETY_TIP_PREFIX):
                safety_tips[graha_key] = bilingual(line[len(SAFETY_TIP_PREFIX) :].strip())
                i += 1
                continue
            i += 1
            continue

        if current_part_title == "आधारभूत नियम":
            if line == "◆":
                i += 1
                basics.append(bilingual(lines[i]))
                i += 1
                continue
            i += 1
            continue

        if current_part_title == "ग्रह युति":
            if " + " in line and not line.startswith("◆"):
                grahas_ne = [g.strip() for g in line.split(" + ")]
                if all(g in GRAHA_MAP for g in grahas_ne):
                    grahas = [GRAHA_MAP[g] for g in grahas_ne]
                    i += 1
                    text = lines[i]
                    yuti.append({"grahas": grahas, "textNe": text, "textEn": text})
                    i += 1
                    continue
            i += 1
            continue

        if current_part_title in GENERAL_PART_KEYS:
            key = GENERAL_PART_KEYS[current_part_title]
            if line == "◆":
                i += 1
                general[key].append(bilingual(lines[i]))
                i += 1
                continue
            i += 1
            continue

        i += 1

    return {
        "lalKitabHouse": lal_kitab_house,
        "lalKitabSafetyTips": safety_tips,
        "lalKitabYuti": yuti,
        "lalKitabBasics": basics,
        "lalKitabRinVichar": general["rinVichar"],
        "lalKitabVarshaphal": general["varshaphal"],
        "lalKitabHealthSignals": general["healthSignals"],
        "lalKitabWealthVastu": general["wealthVastu"],
    }


def main() -> None:
    raw_lines = SOURCE_MD.read_text(encoding="utf-8").splitlines()
    lines = [ln.strip() for ln in raw_lines if ln.strip()]

    parsed = parse(lines)

    # Sanity checks against the counts the source doc claims.
    house_total = sum(len(v) for v in parsed["lalKitabHouse"].values())
    assert house_total == 108, f"expected 108 graha-house entries, got {house_total}"
    for graha_key in GRAHA_MAP.values():
        assert len(parsed["lalKitabHouse"][graha_key]) == 12, graha_key
    assert len(parsed["lalKitabSafetyTips"]) == 9, len(parsed["lalKitabSafetyTips"])
    assert len(parsed["lalKitabYuti"]) == 42, len(parsed["lalKitabYuti"])
    assert len(parsed["lalKitabBasics"]) > 0, "no basics rules parsed"
    for key in ("lalKitabRinVichar", "lalKitabVarshaphal", "lalKitabHealthSignals", "lalKitabWealthVastu"):
        assert len(parsed[key]) > 0, f"no rules parsed for {key}"

    with TARGET_JSON.open("r", encoding="utf-8") as f:
        data = json.load(f)

    data["lalKitabHouse"] = parsed["lalKitabHouse"]
    data["lalKitabSafetyTips"] = parsed["lalKitabSafetyTips"]
    data["lalKitabYuti"] = parsed["lalKitabYuti"]
    data["lalKitabBasics"] = parsed["lalKitabBasics"]
    data["lalKitabRinVichar"] = parsed["lalKitabRinVichar"]
    data["lalKitabVarshaphal"] = parsed["lalKitabVarshaphal"]
    data["lalKitabHealthSignals"] = parsed["lalKitabHealthSignals"]
    data["lalKitabWealthVastu"] = parsed["lalKitabWealthVastu"]
    data["version"] = date.today().strftime("%Y.%m.%d") + ".1"

    with TARGET_JSON.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"lalKitabHouse: {house_total} entries across {len(GRAHA_MAP)} grahas")
    print(f"lalKitabSafetyTips: {len(parsed['lalKitabSafetyTips'])}")
    print(f"lalKitabYuti: {len(parsed['lalKitabYuti'])}")
    print(f"lalKitabBasics: {len(parsed['lalKitabBasics'])}")
    print(f"lalKitabRinVichar: {len(parsed['lalKitabRinVichar'])}")
    print(f"lalKitabVarshaphal: {len(parsed['lalKitabVarshaphal'])}")
    print(f"lalKitabHealthSignals: {len(parsed['lalKitabHealthSignals'])}")
    print(f"lalKitabWealthVastu: {len(parsed['lalKitabWealthVastu'])}")
    print(f"version -> {data['version']}")


if __name__ == "__main__":
    main()
