"""Ingest a batch of per-graha "ग्रह फलादेश" documents into the existing
``grahaHouseSaravali`` table in data/bhava_reference.json, replacing the
short generic one-liner entries that table originally held (each sourced
only as "वैदिक ज्योतिष सन्दर्भ" / "Classical Vedic astrology reference" —
not a real citation) with real Saravali-cited, per-house shloka +
अर्थ + व्याख्या + स्थिति content supplied directly by the user, one graha
per markdown file.

Source: sibling files in ``../../graha-phaladesh-src/`` (not committed to
this repo, same as the other ``ingest_*`` scripts' source docs), named
``<n>_<graha>_full_phaladesh.md``. Each file has one "## <emoji> <ग्रह>"
header followed by 12 "### ⬡ भाव N मा <ग्रह>को फल" sections, each with:

  📜 **श्लोक — <source>** > <shloka>
  * **अर्थ:** ...
  * **व्याख्या:** ...
  * **स्थिति:** <emoji> <रेटिङ शब्द>

<source> is "सारावली" throughout मंगल/शुक्र/शनि/केतु, but सूर्य's file mixes
सारावली, जातक पारिजात and फलदीपिका per house — the actual per-house source
is captured, not hardcoded.

Each file also carries "भावेश फल (बृहत्पाराशर होराशास्त्र)" and "भावेश
फलम्" sub-sections per house. These are deliberately NOT ingested here:
they assume the graha both owns and occupies house N for every N
(nonsensical for grahas that own only 1-2 houses, and meaningless for
rahu/ketu which own none), which doesn't fit the existing ``bhaveshPhala``
/ ``bhaveshPhalaSupplementary`` schema (keyed by real house-ownership,
shared across every ascendant, already sourced from an actual BPHS ch. 13
transcription) — and in every file but Surya's, the text is a single
template repeated for all 12 houses with only the house number swapped in,
not distinct per-house content. Folding that in would corrupt an already
correct, unrelated table. Only the सारावली block (which is genuinely
distinct per house even in the four templated files, since स्थिति/rating
varies) is used.

Only ``grahaHouseSaravali[graha]`` entries for houses present in a given
source file are replaced; other grahas' entries are untouched.
``houseTheme`` is preserved from the existing entry (or filled from the
standard 12-house name list below) since the new files don't carry it.

Rating mapping (स्थिति emoji/word -> existing ``ratingLabel`` keys):
  💰 लाभदायक                  -> shubh
  ⚠️ मध्यम                    -> mishrit
  ⚠️ कष्टदायक / कष्टदायक/सावधान -> kamjor

``shlokaSourceNe`` is the captured source name (a real citation, replacing
the old "वैदिक ज्योतिष सन्दर्भ" placeholder); ``shlokaSourceEn`` is its
English title where known (सारावली/जातक पारिजात/फलदीपिका), else mirrors
the Nepali. ``meaningEn``/``explanationEn`` mirror the Nepali text
(translation debt, same convention as the rest of this file's
non-English-sourced content).

Run from the repo root: ``python scripts/ingest_graha_saravali_phaladesh.py``
"""

from __future__ import annotations

import json
import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SOURCE_DIR = REPO_ROOT.parent / "graha-phaladesh-src"
TARGET_JSON = REPO_ROOT / "data" / "bhava_reference.json"

SOURCE_FILES = {
    "sun": "1_surya_full_phaladesh.md",
    "mars": "3_mangala_full_phaladesh.md",
    "venus": "6_sukra_full_phaladesh.md",
    "saturn": "7_sani_full_phaladesh.md",
    "ketu": "9_ketu_full_phaladesh.md",
}

HOUSE_THEME = {
    "1": "लग्न",
    "2": "धन भाव",
    "3": "सहज भाव",
    "4": "सुख भाव",
    "5": "सन्तान/बुद्धि",
    "6": "रिपु भाव",
    "7": "दाम्पत्य भाव",
    "8": "आयु भाव",
    "9": "भाग्य भाव",
    "10": "कर्म भाव",
    "11": "आय भाव",
    "12": "व्यय भाव",
}

NEPALI_DIGITS = "०१२३४५६७८९"
DIGIT_TRANSLATE = str.maketrans(NEPALI_DIGITS, "0123456789")

HOUSE_HEADER_RE = re.compile(
    r"^###\s*⬡\s*भाव\s*([0-9०-९]+)\s.*?मा.*?फल\s*$", re.MULTILINE
)
SARAVALI_BLOCK_RE = re.compile(
    r"📜\s*\*\*श्लोक\s*—\s*(.+?)\*\*\s*\n((?:>.*\n?)+)"
)
SOURCE_EN_NAME = {
    "सारावली": "Saravali",
    "जातक पारिजात": "Jataka Parijata",
    "फलदीपिका": "Phaladeepika",
}
MEANING_RE = re.compile(r"\*\s*\*\*अर्थ:\*\*\s*(.+)")
EXPLANATION_RE = re.compile(r"\*\s*\*\*व्याख्या:\*\*\s*(.+)")
# Two स्थिति formats appear across the batch: a labelled one ("* **स्थिति:**
# ⚠️ कष्टदायक") used by मंगल/शुक्र/शनि/केतु, and an unlabelled emoji+bold one
# ("* ⚠️ **कष्टदायक / सावधान**") used by सूर्य.
STATUS_RE = re.compile(
    r"\*\s*(?:\*\*स्थिति:\*\*\s*(.+)|[💰⚠️]+\s*\*\*(.+?)\*\*)"
)


def to_int(s: str) -> int:
    return int(s.translate(DIGIT_TRANSLATE))


def rating_from_status(status_text: str) -> str:
    text = status_text.strip()
    if "लाभदायक" in text:
        return "shubh"
    if "मध्यम" in text:
        return "mishrit"
    if "कष्टदायक" in text:
        return "kamjor"
    raise ValueError(f"Unrecognised स्थिति text: {status_text!r}")


def parse_shloka(block: str) -> str:
    lines = [ln.strip() for ln in block.strip().splitlines()]
    cleaned = [re.sub(r"^>\s?", "", ln).strip() for ln in lines]
    return "\n".join(ln for ln in cleaned if ln)


def parse_file(path: Path) -> dict[str, dict]:
    text = path.read_text(encoding="utf-8")
    headers = list(HOUSE_HEADER_RE.finditer(text))
    if len(headers) != 12:
        raise ValueError(f"{path.name}: expected 12 house sections, found {len(headers)}")

    out: dict[str, dict] = {}
    for i, m in enumerate(headers):
        house_num = str(to_int(m.group(1)))
        start = m.end()
        end = headers[i + 1].start() if i + 1 < len(headers) else len(text)
        body = text[start:end]

        saravali_m = SARAVALI_BLOCK_RE.search(body)
        meaning_m = MEANING_RE.search(body)
        explanation_m = EXPLANATION_RE.search(body)
        status_m = STATUS_RE.search(body)
        if not (saravali_m and meaning_m and explanation_m and status_m):
            raise ValueError(f"{path.name}: house {house_num} missing a required field")

        status_text = status_m.group(1) or status_m.group(2)
        source_ne = saravali_m.group(1).strip()
        out[house_num] = {
            "shloka": parse_shloka(saravali_m.group(2)),
            "sourceNe": source_ne,
            "sourceEn": SOURCE_EN_NAME.get(source_ne, source_ne),
            "meaning": meaning_m.group(1).strip(),
            "explanation": explanation_m.group(1).strip(),
            "rating": rating_from_status(status_text),
        }
    return out


def main() -> None:
    with TARGET_JSON.open("r", encoding="utf-8") as f:
        data = json.load(f)

    saravali = data["grahaHouseSaravali"]

    for graha_key, filename in SOURCE_FILES.items():
        path = SOURCE_DIR / filename
        houses = parse_file(path)
        graha_table = saravali.setdefault(graha_key, {})
        for house_num, parsed in houses.items():
            existing = graha_table.get(house_num, {})
            graha_table[house_num] = {
                "house": to_int(house_num),
                "houseTheme": existing.get("houseTheme") or HOUSE_THEME[house_num],
                "shloka": parsed["shloka"],
                "shlokaSourceNe": parsed["sourceNe"],
                "shlokaSourceEn": parsed["sourceEn"],
                "meaningNe": parsed["meaning"],
                "meaningEn": parsed["meaning"],
                "explanationNe": parsed["explanation"],
                "explanationEn": parsed["explanation"],
                "rating": parsed["rating"],
            }
        print(f"{graha_key}: {len(houses)} houses updated")

    with TARGET_JSON.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


if __name__ == "__main__":
    main()
