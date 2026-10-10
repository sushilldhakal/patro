"""One-off ingestion of the Phaladeepika navagraha/bhava report into
data/bhava_reference.json.

Source: ``../../phaladeepika-navagraha-bhava-phala.md`` (sibling to this
repo) — real, cited classical content (Phaladeepika ch. 2 verses, with
author attribution to Mantreshwara), unlike the two skipped drafts covered
by ``ingest_lal_kitab.py``'s module docstring. It adds, without touching any
existing field:

  houseClassicalName        — the 12 houses' classical Sanskrit names
                               (तनु, धन, सहज, ... व्यय), with real English
                               names from the source itself (not translation
                               debt for this one field).
  phaladeepikaKarakatva     — per-graha (9) karakatva shloka + citation +
                               translation + physical/temperamental nature.
  phaladeepikaHouseResults  — per-graha (7: sun-saturn; rahu/ketu excluded,
                               since the source itself says their house
                               result varies by rashi/drishti and gives none)
                               x 12-house traditional summary. The source
                               explicitly flags that Phaladeepika ch. 8's
                               verses for this table aren't available to it,
                               so these are summaries, not shlokas — kept
                               separate from (not merged into) the existing,
                               differently-sourced ``grahaHouseSaravali``.
  grahaDusthaSusthaRule     — the general "combust/debilitated/enemy-sign/
                               6-8-12-house => dusstha" principle (ch. 2
                               closing verse) — chart-wide, not house-keyed.
  phaladeepikaSource        — citation string for the "स्रोत" line.

English mirrors Nepali (translation debt) except houseClassicalName's `en`,
which comes straight from the source's own English house names.

Run from the repo root: ``python scripts/ingest_phaladeepika.py``
"""

from __future__ import annotations

import json
import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SOURCE_MD = REPO_ROOT.parent / "phaladeepika-navagraha-bhava-phala.md"
TARGET_JSON = REPO_ROOT / "data" / "bhava_reference.json"

GRAHA_SECTION_MAP = {
    "सूर्य": "sun",
    "चन्द्र": "moon",
    "मंगल": "mars",
    "बुध": "mercury",
    "बृहस्पति": "jupiter",
    "शुक्र": "venus",
    "शनि": "saturn",
}

NEPALI_DIGITS = "०१२३४५६७८९"
DIGIT_TRANSLATE = str.maketrans(NEPALI_DIGITS, "0123456789")

ITEM_RE = re.compile(
    r"([०-९]+)\.\s*([^:()]+?)\s*\(([^)]+)\):\s*(.*?)(?=\s*[०-९]+\.\s*[^:()]+\([^)]+\):|$)",
    re.DOTALL,
)
RESULT_ITEM_RE = re.compile(
    r"([०-९]+)\.\s*([^:]+?):\s*(.*?)(?=\s*[०-९]+\.\s*[^:]+:|$)",
    re.DOTALL,
)


def to_int(s: str) -> int:
    return int(s.translate(DIGIT_TRANSLATE))


def bilingual(ne: str, en: str | None = None) -> dict[str, str]:
    return {"ne": ne.strip(), "en": (en if en is not None else ne).strip()}


CITATION_PATTERN = re.compile(r"^([०-९]+)।([०-९]+)$")


def citation_pair(suffix: str) -> tuple[str, str]:
    """('२।१' -> ('फलदीपिका, २।१', 'Phaladeepika, 2.1')); a non-verse-number
    citation (e.g. 'अध्याय २ को अन्त्य') falls back to en == ne."""
    ne = f"फलदीपिका, {suffix}"
    m = CITATION_PATTERN.match(suffix)
    en = f"Phaladeepika, {to_int(m.group(1))}.{to_int(m.group(2))}" if m else ne
    return ne, en


def parse_house_names(section2: str) -> dict[str, dict]:
    out: dict[str, dict] = {}
    for num, name_ne, name_en, _desc in ITEM_RE.findall(section2):
        out[str(to_int(num))] = bilingual(name_ne.strip(), name_en.strip())
    return out


def parse_house_results(block: str) -> dict[str, dict]:
    out: dict[str, dict] = {}
    for num, _name, text in RESULT_ITEM_RE.findall(block):
        out[str(to_int(num))] = bilingual(text.strip().rstrip("।") + "।")
    return out


def parse_graha_sections(full_text: str) -> dict[str, dict]:
    # Split on "३.N ग्रहनाम (English)" headers.
    header_re = re.compile(r"^३\.[०-९]+\s+(\S+)\s+\([^)]+\)\s*$", re.MULTILINE)
    headers = list(header_re.finditer(full_text))
    result: dict[str, dict] = {}
    for i, m in enumerate(headers):
        graha_ne = m.group(1)
        if graha_ne not in GRAHA_SECTION_MAP:
            continue
        graha_key = GRAHA_SECTION_MAP[graha_ne]
        start = m.end()
        end = headers[i + 1].start() if i + 1 < len(headers) else len(full_text)
        body = full_text[start:end].strip()

        shloka_source_m = re.search(r"\(फलदीपिका,\s*([^)]+)\)", body)
        shloka_source = shloka_source_m.group(1).strip() if shloka_source_m else ""

        karakatva_m = re.search(r"ग्रहको कारकत्व र स्वरूप:\s*(.+)", body)
        karakatva_line = karakatva_m.group(1).strip() if karakatva_m else ""

        # Shloka: the Sanskrit verse line sits between the karakatva line and
        # "नेपाली अनुवाद:". Take the first non-empty line after the
        # karakatva line that isn't "नेपाली अनुवाद:" itself.
        lines = [ln.strip() for ln in body.splitlines() if ln.strip()]
        shloka_line = ""
        for idx, ln in enumerate(lines):
            if ln.startswith("ग्रहको कारकत्व"):
                shloka_line = re.sub(r"\s*\(फलदीपिका,[^)]+\)\s*$", "", lines[idx + 1]).strip()
                break

        translation_m = re.search(r"नेपाली अनुवाद:\s*(.+?)\n", body + "\n")
        translation = translation_m.group(1).strip() if translation_m else ""

        nature_m = re.search(r"विस्तृत व्याख्या:\s*(.+?)\n", body + "\n")
        nature = nature_m.group(1).strip() if nature_m else ""

        results_m = re.search(r"१२ भावको फल[^\n]*\n(.+)", body, re.DOTALL)
        results = parse_house_results(results_m.group(1)) if results_m else {}

        result[graha_key] = {
            "karakatvaLine": karakatva_line,
            "shloka": shloka_line,
            "shlokaSource": shloka_source,
            "translation": translation,
            "nature": nature,
            "houseResults": results,
        }
    return result


def parse_rahu_ketu(full_text: str) -> dict[str, dict]:
    section_m = re.search(r"३\.[०-९]+\s+राहु र केतु.*?\n(.+?)\n\n४\.", full_text, re.DOTALL)
    section = section_m.group(1) if section_m else ""
    out: dict[str, dict] = {}
    rahu_m = re.search(r"राहुको स्वरूप:\s*(.+)", section)
    if rahu_m:
        out["rahu"] = {"nature": rahu_m.group(1).strip()}
    ketu_m = re.search(r"केतुको स्वरूप:\s*(.+)", section)
    if ketu_m:
        out["ketu"] = {"nature": ketu_m.group(1).strip()}
    return out


def parse_dustha_sustha(full_text: str) -> dict:
    section_m = re.search(r"४\. विशेष योग.*?\n(.+?)\n\n५\.", full_text, re.DOTALL)
    section = section_m.group(1) if section_m else ""
    shloka_m = re.search(r"^(मूढोऽपि.+?)\s*\(फलदीपिका,\s*([^)]+)\)\s*$", section, re.MULTILINE)
    shloka = shloka_m.group(1).strip() if shloka_m else ""
    shloka_source = shloka_m.group(2).strip() if shloka_m else ""
    explanation_m = re.search(r"यस शास्त्रीय सिद्धान्त अनुसार:\s*(.+)", section, re.DOTALL)
    explanation = explanation_m.group(1).strip() if explanation_m else ""
    return {
        "shloka": shloka,
        "shlokaSource": shloka_source,
        "text": explanation,
    }


def main() -> None:
    full_text = SOURCE_MD.read_text(encoding="utf-8")

    section2_m = re.search(r"२\. १२ भावहरूको.*?\n.+?\n(.+?)\n\n३\.", full_text, re.DOTALL)
    house_names = parse_house_names(section2_m.group(1)) if section2_m else {}
    assert len(house_names) == 12, f"expected 12 house names, got {len(house_names)}"

    graha_sections = parse_graha_sections(full_text)
    assert set(graha_sections.keys()) == set(GRAHA_SECTION_MAP.values()), graha_sections.keys()
    for key, entry in graha_sections.items():
        assert len(entry["houseResults"]) == 12, f"{key}: {len(entry['houseResults'])} house results"
        assert entry["shloka"], f"{key}: missing shloka"
        assert entry["shlokaSource"], f"{key}: missing shloka source"

    rahu_ketu = parse_rahu_ketu(full_text)
    assert "rahu" in rahu_ketu and "ketu" in rahu_ketu, rahu_ketu

    dustha_sustha = parse_dustha_sustha(full_text)
    assert dustha_sustha["shloka"], "missing dustha/sustha shloka"

    house_classical_name = house_names

    phaladeepika_karakatva: dict[str, dict] = {}
    phaladeepika_house_results: dict[str, dict] = {}
    for key, entry in graha_sections.items():
        source_ne, source_en = citation_pair(entry["shlokaSource"])
        karakatva_ne, karakatva_en = bilingual(entry["karakatvaLine"]).values()
        translation_ne, translation_en = bilingual(entry["translation"]).values()
        nature_ne, nature_en = bilingual(entry["nature"]).values()
        phaladeepika_karakatva[key] = {
            "shloka": entry["shloka"],
            "shlokaSourceNe": source_ne,
            "shlokaSourceEn": source_en,
            "karakatvaLineNe": karakatva_ne,
            "karakatvaLineEn": karakatva_en,
            "translationNe": translation_ne,
            "translationEn": translation_en,
            "natureNe": nature_ne,
            "natureEn": nature_en,
        }
        phaladeepika_house_results[key] = entry["houseResults"]
    for key, entry in rahu_ketu.items():
        suffix = "२।३३" if key == "rahu" else "२।३४"
        source_ne, source_en = citation_pair(suffix)
        nature_ne, nature_en = bilingual(entry["nature"]).values()
        phaladeepika_karakatva[key] = {
            "shloka": "",
            "shlokaSourceNe": source_ne,
            "shlokaSourceEn": source_en,
            "karakatvaLineNe": "",
            "karakatvaLineEn": "",
            "translationNe": "",
            "translationEn": "",
            "natureNe": nature_ne,
            "natureEn": nature_en,
        }

    dustha_source_ne, dustha_source_en = citation_pair(dustha_sustha["shlokaSource"])
    dustha_text_ne, dustha_text_en = bilingual(dustha_sustha["text"]).values()
    graha_dustha_sustha_rule = {
        "shloka": dustha_sustha["shloka"],
        "shlokaSourceNe": dustha_source_ne,
        "shlokaSourceEn": dustha_source_en,
        "ne": dustha_text_ne,
        "en": dustha_text_en,
    }

    phaladeepika_source = (
        "फलदीपिका — आचार्य मन्त्रेश्वर (मार्कण्डेय भट्टाद्रि), अध्याय २। "
        "भाव-फल (भावश्रय फल) परम्परागत सारांश हो — अध्याय ८ का मूल श्लोक अहिले अनुपलब्ध।"
    )

    with TARGET_JSON.open("r", encoding="utf-8") as f:
        data = json.load(f)

    data["houseClassicalName"] = house_classical_name
    data["phaladeepikaKarakatva"] = phaladeepika_karakatva
    data["phaladeepikaHouseResults"] = phaladeepika_house_results
    data["grahaDusthaSusthaRule"] = graha_dustha_sustha_rule
    data["phaladeepikaSource"] = phaladeepika_source

    with TARGET_JSON.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"houseClassicalName: {len(house_classical_name)}")
    print(f"phaladeepikaKarakatva: {len(phaladeepika_karakatva)} grahas")
    print(f"phaladeepikaHouseResults: {len(phaladeepika_house_results)} grahas x 12 houses")
    print("grahaDusthaSusthaRule: ok" if graha_dustha_sustha_rule["shloka"] else "MISSING")


if __name__ == "__main__":
    main()
