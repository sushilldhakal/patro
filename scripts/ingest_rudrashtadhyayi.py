#!/usr/bin/env python3
"""Parse the two Rudrashtadhyayi source texts into documents_source JSON.

Reads a Devanagari file and a hand-prepared IAST transliteration file that
mirror each other section-for-section and verse-for-verse, and zips them
into one manifest. There is no translation source for this text (unlike
vigyan-bhairava-tantra.txt), so meaning_ne/meaning_en are left null.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC_DEVA = ROOT / "Shri Shuklayajurvediya Rudrashtadhyayi.txt"
SRC_IAST = ROOT / "Rudrashtadhyayi.txt"
OUT = Path(__file__).resolve().parents[1] / "data/documents_source/rudrashtadhyayi.json"

# 1-indexed line numbers of each section's heading line, for each source file.
# A section's content runs from (heading + 1) to (next heading - 1), or to
# TAIL_END for the last section — chosen to stop before the closing
# dedication paragraph, which isn't part of the recited text.
DEVA_HEADS = [6, 18, 55, 127, 183, 239, 511, 542, 573, 727, 807]
DEVA_TAIL_END = 866

IAST_HEADS = [6, 17, 53, 124, 180, 236, 507, 537, 567, 721, 801]
IAST_TAIL_END = 862

CHAPTER_TITLES = [
    ("मङ्गलाचरणम् (ध्यानम्)", "Invocation and dhyana"),
    ("प्रथमोऽध्यायः — गणपति मन्त्र र शिवसङ्कल्प सूक्तम्", "Ganapati mantras and the Shiva Sankalpa hymn"),
    ("द्वितीयोऽध्यायः — पुरुषसूक्तम्", "The Purusha Sukta"),
    ("तृतीयोऽध्यायः — अप्रतिरथ सूक्तम्", "The Apratiratha Sukta"),
    ("चतुर्थोऽध्यायः — सौर र मैत्र सूक्तम्", "The Saura and Maitra hymns"),
    ("पञ्चमोऽध्यायः — रुद्रसूक्तम् (नीलसूक्तम्)", "The Rudra Sukta (Namakam)"),
    ("षष्ठोऽध्यायः — महाच्छिर, सोमस्तवन र त्र्यम्बक यजन", "Mahachchira, Soma-stavana and Tryambaka yajana"),
    ("सप्तमोऽध्यायः — जटाध्यायः", "The Jata Adhyaya"),
    ("अष्टमोऽध्यायः — चमक प्रश्नः", "The Chamaka Prashna"),
    ("शान्त्यध्यायः", "The Shanti Adhyaya (peace chant)"),
    ("स्वस्तिप्रार्थनामन्त्राः", "Svasti Prarthana mantras"),
]


def read_lines(path: Path) -> list[str]:
    return path.read_text(encoding="utf-8").splitlines()


def find_heads(lines: list[str]) -> list[int]:
    """Recompute IAST heading line numbers after inserting the fix-up blank
    line below, since that insertion shifts everything after it by one."""
    heads = []
    for i, line in enumerate(lines, start=1):
        if re.match(r"^\d+\. ", line.strip()):
            heads.append(i)
    return heads


def section_ranges(heads: list[int], tail_end: int) -> list[tuple[int, int]]:
    ranges = []
    for i, h in enumerate(heads):
        start = h + 1
        end = heads[i + 1] - 1 if i + 1 < len(heads) else tail_end
        ranges.append((start, end))
    return ranges


def parse_section(lines: list[str], start: int, end: int) -> list[str]:
    """1-indexed inclusive [start, end] -> verse strings.

    Verse boundaries are blank-line-delimited blocks whose joined text ends
    in a danda ("॥"), optionally followed by a verse number and a second
    danda. A block that doesn't end this way (a sub-heading like "हरिः ॐ",
    or a bracketed alternate-reading note) is carried forward and merged
    into the next verse, matching how other documents in this catalogue
    fold in-line speaker/section tags into the surrounding verse text.
    """
    raw = lines[start - 1 : end]
    blocks: list[list[str]] = []
    cur: list[str] = []
    for line in raw:
        if line.strip() == "":
            if cur:
                blocks.append(cur)
                cur = []
        else:
            cur.append(line.strip())
    if cur:
        blocks.append(cur)

    verses: list[str] = []
    buffer: list[str] = []
    for block in blocks:
        text = re.sub(r"\s+", " ", " ".join(block)).strip()
        # A trailing "(...)" is a variant-reading footnote, not verse text.
        core = re.sub(r"\s*\([^()]*\)\s*$", "", text)
        buffer.append(text)
        if core.rstrip().endswith("॥"):
            joined = re.sub(r"\s+", " ", " ".join(buffer)).strip()
            joined = re.sub(r"\s*\([^()]*\)\s*$", "", joined).strip()
            verses.append(joined)
            buffer = []
    if buffer:
        raise SystemExit(f"unclosed verse buffer: {' '.join(buffer)[:120]!r}")

    # Each of the 9 adhyaya sections is followed a few lines later by an
    # "iti rudre ...adhyayah || N||" colophon line that closes it — it sits
    # inside this section's own line range (the next section's heading
    # comes after a blank line following it), so it always parses out as a
    # spurious final "verse". Drop it; it isn't recited scripture text.
    if verses and re.match(r"^(इति रुद्रे|iti rudr)", verses[-1], re.I):
        verses.pop()
    return verses


def parse() -> list[dict]:
    deva_lines = read_lines(SRC_DEVA)
    iast_lines = read_lines(SRC_IAST)

    # The IAST source is missing one blank line the Devanagari source has
    # (between the unnumbered mangala verse and the "atha dhyānam" cue),
    # which otherwise merges those two verses into one on that side only.
    for i, line in enumerate(iast_lines):
        if line.strip().endswith("vibhūm ॥"):
            iast_lines.insert(i + 1, "")
            break

    iast_heads = find_heads(iast_lines)
    if len(iast_heads) != len(DEVA_HEADS):
        raise SystemExit(
            f"section count mismatch: deva={len(DEVA_HEADS)} iast={len(iast_heads)}"
        )

    deva_ranges = section_ranges(DEVA_HEADS, DEVA_TAIL_END)
    iast_ranges = section_ranges(iast_heads, IAST_TAIL_END + 1)

    chapters: list[dict] = []
    for idx, ((ds, de), (is_, ie)) in enumerate(zip(deva_ranges, iast_ranges)):
        sanskrit_verses = parse_section(deva_lines, ds, de)
        translit_verses = parse_section(iast_lines, is_, ie)
        if len(sanskrit_verses) != len(translit_verses):
            raise SystemExit(
                f"section {idx + 1} verse-count mismatch: "
                f"sanskrit={len(sanskrit_verses)} transliteration={len(translit_verses)}"
            )
        chapter_number = idx + 1
        title_ne, title_en = CHAPTER_TITLES[idx]
        shlokas = []
        for vi, (sa, tr) in enumerate(zip(sanskrit_verses, translit_verses), start=1):
            shlokas.append(
                {
                    "verse_number": vi,
                    "verse_label": f"{chapter_number}.{vi}",
                    "sanskrit": sa,
                    "transliteration": tr,
                    "meaning_ne": None,
                    "meaning_en": None,
                    "audio_file": None,
                }
            )
        chapters.append(
            {
                "number": chapter_number,
                "title_ne": title_ne,
                "title_en": title_en,
                "shlokas": shlokas,
            }
        )
    return chapters


def main() -> None:
    chapters = parse()
    total = sum(len(c["shlokas"]) for c in chapters)
    print(f"parsed {len(chapters)} chapters, {total} shlokas")

    manifest = {
        "slug": "rudrashtadhyayi",
        "order_index": 17,
        "category": "scripture",
        "title_sa": "श्रीशुक्लयजुर्वेदीय रुद्राष्टाध्यायी",
        "title_ne": "श्रीशुक्लयजुर्वेदीय रुद्राष्टाध्यायी",
        "title_en": "Shri Shuklayajurvediya Rudrashtadhyayi",
        "subtitle_ne": "शुक्ल यजुर्वेद, वाजसनेयी संहिता · ११ खण्ड",
        "subtitle_en": "Shukla Yajurveda, Vajasaneyi Samhita · 11 sections",
        "description_ne": (
            "रुद्राभिषेकमा प्रयोग हुने शुक्ल यजुर्वेदीय संकलन — गणपति मन्त्र र "
            "शिवसङ्कल्प सूक्तबाट सुरु भई, पुरुषसूक्त, अप्रतिरथ सूक्त, सौर-मैत्र "
            "सूक्त, रुद्रसूक्त (नमकम्), जटाध्याय, चमक प्रश्न हुँदै शान्तिपाठ र "
            "स्वस्तिप्रार्थना मन्त्रमा टुङ्गिन्छ।"
        ),
        "description_en": (
            "A Shukla Yajurveda compilation used in Rudrabhisheka worship — "
            "opening with Ganapati mantras and the Shiva Sankalpa hymn, then "
            "the Purusha Sukta, the Apratiratha Sukta, the Saura and Maitra "
            "hymns, the Rudra Sukta (Namakam), the Jata Adhyaya, the Chamaka "
            "Prashna, the Shanti Adhyaya, and closing with the Svasti "
            "Prarthana mantras."
        ),
        "source_ne": "शुक्ल यजुर्वेद, वाजसनेयी संहिता",
        "source_en": "Shukla Yajurveda, Vajasaneyi Samhita",
        "cover_image": "",
        "has_chapters": True,
        "chapters": chapters,
    }
    OUT.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
