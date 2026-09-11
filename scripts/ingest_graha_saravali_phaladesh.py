"""Ingest a batch of per-graha "ग्रह फलादेश" documents into
data/bhava_reference.json: the existing ``grahaHouseSaravali`` table, plus
two new tables — ``grahaBhaveshPhala`` and ``grahaBhaveshPhalaSupplementary``
— for that same batch's "भावेश फल" content (added in a second pass, per
explicit user direction not to drop it).

Source: sibling files in ``../../graha-phaladesh-src/`` (not committed to
this repo, same as the other ``ingest_*`` scripts' source docs), named
``<n>_<graha>_full_phaladesh.md``. Each file has one "## <emoji> <ग्रह>"
header followed by 12 "### ⬡ भाव N मा <ग्रह>को फल" sections, each with
three parts:

  1) 📜 **श्लोक — <source>** > <shloka>
     * **अर्थ:** ...
     * **व्याख्या:** ...
     * **स्थिति:** <emoji> <रेटिङ शब्द>

  2) #### भावेश फल (बृहत्पाराशर होराशास्त्र)
     * **N भाव को स्वामी <ग्रह> → N भाव मा**
     📜 **<citation, e.g. बृ.पा.हो.शा. (भावेशफलाध्याय) — श्लोक N>** > <shloka>
     * **अर्थ:** ...
     * **व्याख्या:** ...

  3) #### 🏠 भावेश फलम्
     * **संस्कृत श्लोक:** > <shloka>
     * **अर्थ:** ...
     * **विस्तृत व्याख्या:** ...

<source> in part 1 is "सारावली" throughout मंगल/शुक्र/शनि/केतु, but सूर्य's
file mixes सारावली, जातक पारिजात and फलदीपिका per house — the actual
per-house source is captured, not hardcoded.

Parts 2 and 3 assume the graha both owns and occupies house N for every N
(nonsensical for grahas that own only 1-2 houses, and meaningless for
rahu/ketu which own none) — a different framing from the existing
``bhaveshPhala``/``bhaveshPhalaSupplementary`` tables (keyed by real
house-ownership, shared across every ascendant, already sourced from an
actual BPHS ch. 13 transcription). That mismatch is why parts 2-3 go into
their own ``grahaBhaveshPhala``/``grahaBhaveshPhalaSupplementary`` tables
(keyed by graha + house, not house-ownership pairs) instead of being
merged into the existing ones — merging would have conflated two
different models and overwritten unrelated, already-correct data for
grahas/house-pairs outside this batch. In every file but Surya's, parts
2-3's text is a single template repeated for all 12 houses with only the
house number swapped in (part 1 still varies per house, at minimum by
स्थिति/rating) — ingested as-is per explicit user direction; see this
script's git history for the prior revision that left parts 2-3 out for
that reason.

Only entries for houses present in a given source file are replaced;
other grahas' entries in all three tables are untouched. ``houseTheme``
(part 1 only) is preserved from the existing entry (or filled from the
standard 12-house name list below) since the new files don't carry it.

Rating mapping (part 1's स्थिति emoji/word -> existing ``ratingLabel`` keys):
  💰 लाभदायक                  -> shubh
  ⚠️ मध्यम                    -> mishrit
  ⚠️ कष्टदायक / कष्टदायक/सावधान -> kamjor

``shlokaSourceNe`` is the captured source name/citation (a real citation,
replacing part 1's old "वैदिक ज्योतिष सन्दर्भ" placeholder); part 3's is
always the source's own generic label, "संस्कृत श्लोक". ``shlokaSourceEn``
is an English title where known (सारावली/जातक पारिजात/फलदीपिका for part 1,
"Sanskrit shloka" for part 3), else mirrors the Nepali (part 2's citation
line, e.g. "बृ.पा.हो.शा. ... श्लोक ११", isn't translated). ``meaningEn``/
``explanationEn`` mirror the Nepali text throughout (translation debt,
same convention as the rest of this file's non-English-sourced content).

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
BHAVESH_PHALA_HEADER_RE = re.compile(r"^####\s*भावेश\s*फल", re.MULTILINE)
BHAVESH_PHALAM_HEADER_RE = re.compile(r"^####\s*🏠\s*भावेश\s*फलम्", re.MULTILINE)

SARAVALI_BLOCK_RE = re.compile(
    r"📜\s*\*\*श्लोक\s*—\s*(.+?)\*\*\s*\n((?:>.*\n?)+)"
)
BHAVESH_SHLOKA_RE = re.compile(
    r"📜\s*\*\*(.+?)\*\*\s*\n((?:>.*\n?)+)"
)
BHAVESHAM_SHLOKA_RE = re.compile(
    # सूर्य house 3 has a source typo ("शल्क" for "श्लोक") — tolerate any
    # word there rather than require the exact spelling.
    r"\*\s*\*\*संस्कृत \S+:\*\*\s*\n((?:>.*\n?)+)"
)
SOURCE_EN_NAME = {
    "सारावली": "Saravali",
    "जातक पारिजात": "Jataka Parijata",
    "फलदीपिका": "Phaladeepika",
}
MEANING_RE = re.compile(r"\*\s*\*\*अर्थ:\*\*\s*(.+)")
EXPLANATION_RE = re.compile(r"\*\s*\*\*व्याख्या:\*\*\s*(.+)")
DETAILED_EXPLANATION_RE = re.compile(r"\*\s*\*\*विस्तृत व्याख्या:\*\*\s*(.+)")
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


def parse_saravali(segment: str, path_name: str, house_num: str) -> dict:
    saravali_m = SARAVALI_BLOCK_RE.search(segment)
    meaning_m = MEANING_RE.search(segment)
    explanation_m = EXPLANATION_RE.search(segment)
    status_m = STATUS_RE.search(segment)
    if not (saravali_m and meaning_m and explanation_m and status_m):
        raise ValueError(f"{path_name}: house {house_num} missing a सारावली field")

    status_text = status_m.group(1) or status_m.group(2)
    source_ne = saravali_m.group(1).strip()
    return {
        "shloka": parse_shloka(saravali_m.group(2)),
        "sourceNe": source_ne,
        "sourceEn": SOURCE_EN_NAME.get(source_ne, source_ne),
        "meaning": meaning_m.group(1).strip(),
        "explanation": explanation_m.group(1).strip(),
        "rating": rating_from_status(status_text),
    }


def parse_bhavesh_phala(segment: str, path_name: str, house_num: str) -> dict:
    shloka_m = BHAVESH_SHLOKA_RE.search(segment)
    meaning_m = MEANING_RE.search(segment)
    explanation_m = EXPLANATION_RE.search(segment)
    if not (shloka_m and meaning_m and explanation_m):
        raise ValueError(f"{path_name}: house {house_num} missing a भावेश फल field")

    source_ne = shloka_m.group(1).strip()
    return {
        "shloka": parse_shloka(shloka_m.group(2)),
        "sourceNe": source_ne,
        "sourceEn": source_ne,
        "meaning": meaning_m.group(1).strip(),
        "explanation": explanation_m.group(1).strip(),
    }


def parse_bhavesh_phalam(segment: str, path_name: str, house_num: str) -> dict:
    shloka_m = BHAVESHAM_SHLOKA_RE.search(segment)
    meaning_m = MEANING_RE.search(segment)
    explanation_m = DETAILED_EXPLANATION_RE.search(segment)
    if not (shloka_m and meaning_m and explanation_m):
        raise ValueError(f"{path_name}: house {house_num} missing a भावेश फलम् field")

    return {
        "shloka": parse_shloka(shloka_m.group(1)),
        "sourceNe": "संस्कृत श्लोक",
        "sourceEn": "Sanskrit shloka",
        "meaning": meaning_m.group(1).strip(),
        "explanation": explanation_m.group(1).strip(),
    }


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

        bp_header_m = BHAVESH_PHALA_HEADER_RE.search(body)
        bpm_header_m = BHAVESH_PHALAM_HEADER_RE.search(body)
        if not (bp_header_m and bpm_header_m):
            raise ValueError(f"{path.name}: house {house_num} missing a भावेश फल/फलम् heading")

        saravali_segment = body[: bp_header_m.start()]
        bhavesh_phala_segment = body[bp_header_m.end() : bpm_header_m.start()]
        bhavesh_phalam_segment = body[bpm_header_m.end() :]

        out[house_num] = {
            "saravali": parse_saravali(saravali_segment, path.name, house_num),
            "bhaveshPhala": parse_bhavesh_phala(bhavesh_phala_segment, path.name, house_num),
            "bhaveshPhalam": parse_bhavesh_phalam(bhavesh_phalam_segment, path.name, house_num),
        }
    return out


def main() -> None:
    with TARGET_JSON.open("r", encoding="utf-8") as f:
        data = json.load(f)

    saravali_table = data["grahaHouseSaravali"]
    bhavesh_phala_table = data.setdefault("grahaBhaveshPhala", {})
    bhavesh_phalam_table = data.setdefault("grahaBhaveshPhalaSupplementary", {})

    for graha_key, filename in SOURCE_FILES.items():
        path = SOURCE_DIR / filename
        houses = parse_file(path)

        saravali_graha = saravali_table.setdefault(graha_key, {})
        bp_graha = bhavesh_phala_table.setdefault(graha_key, {})
        bpm_graha = bhavesh_phalam_table.setdefault(graha_key, {})

        for house_num, parsed in houses.items():
            house_int = to_int(house_num)
            saravali = parsed["saravali"]
            existing_theme = saravali_graha.get(house_num, {}).get("houseTheme")
            saravali_graha[house_num] = {
                "house": house_int,
                "houseTheme": existing_theme or HOUSE_THEME[house_num],
                "shloka": saravali["shloka"],
                "shlokaSourceNe": saravali["sourceNe"],
                "shlokaSourceEn": saravali["sourceEn"],
                "meaningNe": saravali["meaning"],
                "meaningEn": saravali["meaning"],
                "explanationNe": saravali["explanation"],
                "explanationEn": saravali["explanation"],
                "rating": saravali["rating"],
            }

            bp = parsed["bhaveshPhala"]
            bp_graha[house_num] = {
                "house": house_int,
                "shloka": bp["shloka"],
                "shlokaSourceNe": bp["sourceNe"],
                "shlokaSourceEn": bp["sourceEn"],
                "meaningNe": bp["meaning"],
                "meaningEn": bp["meaning"],
                "explanationNe": bp["explanation"],
                "explanationEn": bp["explanation"],
            }

            bpm = parsed["bhaveshPhalam"]
            bpm_graha[house_num] = {
                "house": house_int,
                "shloka": bpm["shloka"],
                "shlokaSourceNe": bpm["sourceNe"],
                "shlokaSourceEn": bpm["sourceEn"],
                "meaningNe": bpm["meaning"],
                "meaningEn": bpm["meaning"],
                "explanationNe": bpm["explanation"],
                "explanationEn": bpm["explanation"],
            }

        print(f"{graha_key}: {len(houses)} houses updated (saravali + bhaveshPhala + bhaveshPhalam)")

    with TARGET_JSON.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


if __name__ == "__main__":
    main()
