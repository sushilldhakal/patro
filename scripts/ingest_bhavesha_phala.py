"""Ingest the collected Bhavesha Phala (house-lord-placement) content into
data/bhava_reference.json as a new, secondary source alongside the existing
BPHS-ch.13-sourced `bhaveshPhala`.

Source: ``../../bhavesha-phala-collected.md`` (sibling to this repo) — five
rounds of NotebookLM extraction, collected verbatim across a conversation
after the first two rounds turned out incomplete/truncated. See that file's
own "Status" section for the provenance of each round. Net result: real,
cited content (mostly BPHS, some Phaladeepika) for all 144 lord-house
pairs, though of uneven depth — 106 pairs have a full shloka + IAST +
translation + analysis, the remaining 38 (Dhanesha houses 4-12, and 3-4
houses each for Sahajesha/Sukhesha/Panchesha/Shashtesha/Saptamesha/
Dharmesha/Karmesha/Labhesha/Vyayesha) only have Round 1's short prose
summary with no shloka.

This is intentionally NOT merged into the existing `bhaveshPhala` field —
that field is an "actual transcription of BPHS chapter 13" per
bhava_reference.py's docstring, already complete for 139/144 pairs with
verified shlokas, and this new set's citations are less rigorous (informal
"Source Image N" / "Source 16" references, inconsistent across rounds, a
few entries reusing another house's shloka rather than having their own).
Written to `bhaveshPhalaSupplementary` instead, shown as a second,
separately-cited source in the per-house dialog — same pattern as
`phaladeepikaKarakatva` alongside `grahaKarakatva`.

Run from the repo root: ``python scripts/ingest_bhavesha_phala.py``
"""

from __future__ import annotations

import json
import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SOURCE_MD = REPO_ROOT.parent / "bhavesha-phala-collected.md"
TARGET_JSON = REPO_ROOT / "data" / "bhava_reference.json"

ORDINAL_TO_NUM = {
    "1st": 1, "2nd": 2, "3rd": 3, "4th": 4, "5th": 5, "6th": 6,
    "7th": 7, "8th": 8, "9th": 9, "10th": 10, "11th": 11, "12th": 12,
}
LORD_NAME_TO_NUM = {
    "Lagnesha": 1, "Dhanesha": 2, "Sahajesha": 3, "Sukhesha": 4,
    "Panchesha": 5, "Shashtesha": 6, "Saptamesha": 7, "Ashtamesha": 8,
    "Dharmesha": 9, "Karmesha": 10, "Labhesha": 11, "Vyayesha": 12,
}


def split_rounds(full_text: str) -> dict[str, str]:
    parts = re.split(r"\n## (Round \d+[^\n]*)\n", full_text)
    # parts[0] is the preamble before the first "## Round" heading.
    rounds: dict[str, str] = {}
    for i in range(1, len(parts), 2):
        heading, body = parts[i], parts[i + 1]
        num_m = re.match(r"Round (\d+)", heading)
        rounds[num_m.group(1)] = body
    return rounds


def entry() -> dict:
    return {"shloka": None, "iast": None, "translationEn": None, "analysisEn": None}


# ── Round 1: simple prose, no shlokas. Only used as a fallback for pairs
# no later round covers. ─────────────────────────────────────────────────

def parse_round1(text: str) -> dict[tuple[int, int], dict]:
    out: dict[tuple[int, int], dict] = {}

    # Lagnesha (section 2) / Dhanesha (section 3): "N.M <Lord> in the Kth House\n<text>"
    for m in re.finditer(
        r"^\d+\.\d+ (Lagnesha|Dhanesha) in the (\d+)(?:st|nd|rd|th) House\n(.+?)(?=\n\d+\.\d+ |\n\(Note:|\n\d+\. Section|\Z)",
        text, re.MULTILINE | re.DOTALL,
    ):
        lord_name, house_str, body = m.group(1), m.group(2), m.group(3)
        lord_num = LORD_NAME_TO_NUM[lord_name]
        house = int(house_str)
        e = entry()
        e["analysisEn"] = body.strip()
        out[(lord_num, house)] = e

    # The other 9 lords: "N. Section ...: <Lord> Phala (Results of the Mth Lord)"
    # followed by a mini-list "1st: text\n3rd: text\n...".
    for sec_m in re.finditer(
        r"Section [IVX]+: (\w+) Phala \(Results of the (\d+)(?:st|nd|rd|th) Lord\)\n(.+?)(?=\n\d+\. Section|\n\d+\. Conclusion)",
        text, re.DOTALL,
    ):
        lord_name, lord_num_str, body = sec_m.group(1), sec_m.group(2), sec_m.group(3)
        lord_num = int(lord_num_str)
        for line_m in re.finditer(
            r"^(\d+)(?:st|nd|rd|th): (.+)$", body, re.MULTILINE,
        ):
            house = int(line_m.group(1))
            e = entry()
            e["analysisEn"] = line_m.group(2).strip()
            out[(lord_num, house)] = e

    return out


# ── Round 2: Lagnesha (full) + Dhanesha (1-3). Inline single-paragraph
# entries with 4 labels. ─────────────────────────────────────────────────

def parse_labeled_block(
    body: str, shloka_label: str, iast_label: str, translation_label: str, analysis_label: str,
) -> dict:
    e = entry()
    pattern = (
        re.escape(shloka_label) + r":?\s*(.*?)\s*"
        + re.escape(iast_label) + r":?\s*(.*?)\s*"
        + re.escape(translation_label) + r":?\s*(.*?)\s*"
        + re.escape(analysis_label) + r":?\s*(.*)$"
    )
    m = re.search(pattern, body, re.DOTALL)
    if not m:
        return e
    e["shloka"] = m.group(1).strip() or None
    e["iast"] = m.group(2).strip() or None
    e["translationEn"] = m.group(3).strip() or None
    e["analysisEn"] = m.group(4).strip() or None
    return e


def parse_round2(text: str) -> dict[tuple[int, int], dict]:
    out: dict[tuple[int, int], dict] = {}
    headers = list(re.finditer(
        r"^\d+\.\d+ (\d+)(?:st|nd|rd|th) Lord in the (\d+)(?:st|nd|rd|th) House$",
        text, re.MULTILINE,
    ))
    for i, m in enumerate(headers):
        lord_num, house = int(m.group(1)), int(m.group(2))
        start = m.end()
        end = headers[i + 1].start() if i + 1 < len(headers) else len(text)
        body = text[start:end]
        if "(Note: Continuing" in body:
            body = body.split("(Note: Continuing")[0]
        e = parse_labeled_block(
            body, "Sanskrit Shloka", "English Transliteration", "English Translation",
            "Detailed Astrological Explanation",
        )
        out[(lord_num, house)] = e
    return out


# ── Round 3: Ashtamesha, 4 labeled lines per entry, some entries reuse
# another house's shloka via "(Same as Verse N for the Mth House)". ──────

def parse_round3(text: str) -> dict[tuple[int, int], dict]:
    out: dict[tuple[int, int], dict] = {}
    headers = list(re.finditer(
        r"^\d+\. 8th Lord in the (\d+)(?:st|nd|rd|th) House(?: \(Lagna\))?$",
        text, re.MULTILINE,
    ))
    raw: dict[int, dict] = {}
    for i, m in enumerate(headers):
        house = int(m.group(1))
        start = m.end()
        end = headers[i + 1].start() if i + 1 < len(headers) else len(text)
        body = text[start:end].strip()
        raw[house] = {}
        shloka_m = re.search(r"^Sanskrit Shloka:\s*(.+)$", body, re.MULTILINE)
        iast_m = re.search(r"^IAST Transliteration:\s*(.+)$", body, re.MULTILINE)
        trans_m = re.search(r"^English Translation:\s*(.+)$", body, re.MULTILINE)
        analysis_m = re.search(r"^Astrological Analysis:\s*(.+)$", body, re.MULTILINE)
        raw[house]["shloka"] = shloka_m.group(1).strip() if shloka_m else None
        raw[house]["iast"] = iast_m.group(1).strip() if iast_m else None
        raw[house]["translationEn"] = trans_m.group(1).strip() if trans_m else None
        raw[house]["analysisEn"] = analysis_m.group(1).strip() if analysis_m else None

    for house, e in raw.items():
        same_as_m = re.match(r"\(Same as Verse \d+ for the (\d+)(?:st|nd|rd|th) House\)", e["shloka"] or "")
        if same_as_m:
            ref_house = int(same_as_m.group(1))
            e["shloka"] = raw[ref_house]["shloka"]
            e["iast"] = raw[ref_house]["iast"]
        out[(8, house)] = e
    return out


# ── Round 4: Sahajesha, 4 labeled lines per entry. ────────────────────────

def parse_round4(text: str) -> dict[tuple[int, int], dict]:
    out: dict[tuple[int, int], dict] = {}
    headers = list(re.finditer(
        r"^\d+\. Placement Analysis: 3rd Lord in the (\d+)(?:st|nd|rd|th) House$",
        text, re.MULTILINE,
    ))
    for i, m in enumerate(headers):
        house = int(m.group(1))
        start = m.end()
        end = headers[i + 1].start() if i + 1 < len(headers) else len(text)
        body = text[start:end]
        e = entry()
        shloka_m = re.search(r"^Sanskrit Shloka Retrieval:\s*(.+)$", body, re.MULTILINE)
        iast_m = re.search(r"^Transliteration:\s*(.+)$", body, re.MULTILINE)
        trans_m = re.search(r"^Direct Translation:\s*(.+)$", body, re.MULTILINE)
        analysis_m = re.search(r"^Astrological Synthesis:\s*(.+)$", body, re.MULTILINE)
        e["shloka"] = shloka_m.group(1).strip() if shloka_m else None
        e["iast"] = iast_m.group(1).strip() if iast_m else None
        e["translationEn"] = trans_m.group(1).strip() if trans_m else None
        e["analysisEn"] = analysis_m.group(1).strip() if analysis_m else None
        out[(3, house)] = e
    return out


# ── Round 5: 8 lords, unlabeled positional lines (shloka / iast / quoted
# translation / "Detailed Analysis: ..."). ────────────────────────────────

def parse_round5(text: str) -> dict[tuple[int, int], dict]:
    out: dict[tuple[int, int], dict] = {}
    headers = list(re.finditer(
        r"^\d+\.\d+ (\d+)(?:st|nd|rd|th) Lord in the (\d+)(?:st|nd|rd|th) House$",
        text, re.MULTILINE,
    ))
    for i, m in enumerate(headers):
        lord_num, house = int(m.group(1)), int(m.group(2))
        start = m.end()
        end = headers[i + 1].start() if i + 1 < len(headers) else len(text)
        lines = [ln.strip() for ln in text[start:end].strip().splitlines() if ln.strip()]
        e = entry()
        if len(lines) >= 4:
            e["shloka"] = lines[0]
            e["iast"] = lines[1]
            e["translationEn"] = lines[2].strip('"')
            analysis_m = re.match(r"Detailed Analysis:\s*(.+)", lines[3])
            e["analysisEn"] = analysis_m.group(1).strip() if analysis_m else lines[3]
        out[(lord_num, house)] = e
    return out


def main() -> None:
    full_text = SOURCE_MD.read_text(encoding="utf-8")
    rounds = split_rounds(full_text)

    merged: dict[tuple[int, int], dict] = {}
    merged.update(parse_round1(rounds["1"]))
    merged.update(parse_round2(rounds["2"]))
    merged.update(parse_round3(rounds["3"]))
    merged.update(parse_round4(rounds["4"]))
    merged.update(parse_round5(rounds["5"]))

    missing = [(lord, house) for lord in range(1, 13) for house in range(1, 13) if (lord, house) not in merged]
    assert not missing, f"missing {len(missing)} pairs: {missing[:10]}..."
    assert len(merged) == 144, len(merged)

    with_shloka = sum(1 for e in merged.values() if e["shloka"])
    print(f"Total pairs: {len(merged)} (expected 144)")
    print(f"With real shloka: {with_shloka}")
    print(f"Prose-only (Round 1 fallback): {144 - with_shloka}")

    payload: dict[str, dict[str, dict]] = {}
    for (lord_num, house), e in merged.items():
        payload.setdefault(str(lord_num), {})[str(house)] = {
            "shloka": e["shloka"],
            "iast": e["iast"],
            "ne": e["analysisEn"] or e["translationEn"] or "",
            "en": e["analysisEn"] or e["translationEn"] or "",
            "translationNe": e["translationEn"] or "",
            "translationEn": e["translationEn"] or "",
        }

    with TARGET_JSON.open("r", encoding="utf-8") as f:
        data = json.load(f)

    data["bhaveshPhalaSupplementary"] = payload
    data["bhaveshPhalaSupplementarySource"] = (
        "बृहत्पाराशरहोराशास्त्रम् / फलदीपिका — थप भावेश-स्थान सूत्र सङ्ग्रह, "
        "विभिन्न प्रयासहरूमा सङ्कलित।"
    )
    # NOTE: this script's own `ne`/`translationNe` output is English-mirrored
    # (this script's source was 100% English) — run
    # scripts/translate_bhavesh_supplementary_ne.py immediately after this
    # one to fill in the real, hand-translated Nepali before shipping.

    with TARGET_JSON.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print("Wrote bhaveshPhalaSupplementary + bhaveshPhalaSupplementarySource")


if __name__ == "__main__":
    main()
