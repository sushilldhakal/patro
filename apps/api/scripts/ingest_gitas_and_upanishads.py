#!/usr/bin/env python3
"""Build data/documents_source/<slug>.json for the Gitas/Upanishads not yet
in the app, from the raw CSVs in the sibling ``indian-scriptures`` checkout
(``../indian-scriptures/data/processed/{gitas,upanishads}/*.csv``).

Those CSVs carry Sanskrit text only (title, mantra, verse number) — no
meanings. Every document written here therefore has ``meaning_ne`` /
``meaning_en`` set to null on every shloka: real translations get patched in
later, verse by verse, the same way ``scripts/patch_bhagavad_gita_ch*.py``
did for the Gita. Nothing here is fabricated.

The CSVs are also messy in a few well-understood ways this script corrects:
  - a stray "0<title> उपनिषद्" heading fused onto the first verse's text
    (Isavasya, Kena) — dropped.
  - five files (Karika, Kena, Mundaka, Prasna, Svetashvatara) end with a row
    that's an exact duplicate of row 0 — a scrape artifact, dropped.
  - Avadhuta Gita numbers each chapter's verses 1..N with no chapter column,
    so chapters are recovered from where the running number resets to 1.
  - the Upanishads number verses "adhyaya.section.mantra"; a document is
    chaptered by its first component when more than one value appears
    (e.g. Prasna's 6 questions), otherwise left as a single chapter.

Already-present documents (Ashtavakra Gita, Bhagavad Gita, Mandukya
Upanishad) are not touched — this only adds what's missing. Re-run any time
the source CSVs change; each output file is fully overwritten.
"""

from __future__ import annotations

import csv
import json
import re
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = ROOT.parent / "indian-scriptures" / "data" / "processed"
OUT_DIR = ROOT / "data" / "documents_source"

DEVANAGARI_DIGITS = str.maketrans("०१२३४५६७८९", "0123456789")
ASCII_TO_DEVA = str.maketrans("0123456789", "०१२३४५६७८९")

# --- Devanagari -> IAST transliteration (same table as ingest_bhagavad_gita.py) ---
VOWELS = {
    "अ": "a", "आ": "ā", "इ": "i", "ई": "ī", "उ": "u", "ऊ": "ū",
    "ऋ": "ṛ", "ॠ": "ṝ", "ऌ": "ḷ", "ॡ": "ḹ",
    "ए": "e", "ऐ": "ai", "ओ": "o", "औ": "au",
}
MATRAS = {
    "ा": "ā", "ि": "i", "ी": "ī", "ु": "u", "ू": "ū",
    "ृ": "ṛ", "ॄ": "ṝ", "ॢ": "ḷ", "ॣ": "ḹ",
    "े": "e", "ै": "ai", "ो": "o", "ौ": "au",
}
CONSONANTS = {
    "क": "k", "ख": "kh", "ग": "g", "घ": "gh", "ङ": "ṅ",
    "च": "c", "छ": "ch", "ज": "j", "झ": "jh", "ञ": "ñ",
    "ट": "ṭ", "ठ": "ṭh", "ड": "ḍ", "ढ": "ḍh", "ण": "ṇ",
    "त": "t", "थ": "th", "द": "d", "ध": "dh", "न": "n",
    "प": "p", "फ": "ph", "ब": "b", "भ": "bh", "म": "m",
    "य": "y", "र": "r", "ल": "l", "व": "v",
    "श": "ś", "ष": "ṣ", "स": "s", "ह": "h", "ळ": "ḷ",
}
MARKS = {
    "ं": "ṃ", "ः": "ḥ", "ँ": "m̐", "ऽ": "'",
    "।": "|", "॥": "||", "ॐ": "oṃ", "्": "",
}


def to_iast(text: str) -> str:
    out: list[str] = []
    i, n = 0, len(text)
    while i < n:
        ch = text[i]
        if ch in CONSONANTS:
            root = CONSONANTS[ch]
            nxt = text[i + 1] if i + 1 < n else ""
            if nxt == "्":
                out.append(root)
                i += 2
                continue
            if nxt in MATRAS:
                out.append(root + MATRAS[nxt])
                i += 2
                continue
            out.append(root + "a")
            i += 1
            continue
        if ch in VOWELS:
            out.append(VOWELS[ch]); i += 1; continue
        if ch in MATRAS:
            out.append(MATRAS[ch]); i += 1; continue
        if ch in MARKS:
            out.append(MARKS[ch]); i += 1; continue
        if ch in "०१२३४५६७८९":
            out.append(ch.translate(DEVANAGARI_DIGITS)); i += 1; continue
        out.append(ch); i += 1
    return re.sub(r" +", " ", "".join(out)).strip()


def to_deva(n: int) -> str:
    return str(n).translate(ASCII_TO_DEVA)


# --- CSV row cleanup ---

TRIPLET_RE = re.compile(r"(\d+)\.(\d+)\.(\d+)")
SINGLE_RE = re.compile(r"(\d+)")
JUNK_HEADING_RE = re.compile(r"^[0०][^,]*उपनिषद्?$")
# A handful of rows carry a trailing editorial word-count note in parens
# right after the verse marker, e.g. "...।।1.5.1--1.5.3।।(असौ लोको...)।।" —
# strip that first so the digit marker underneath it is exposed.
TRAILING_PAREN_RE = re.compile(r"\([^()]*\)\s*।।\s*$")
# The digit marker itself, optionally a "1.5.1--1.5.3" range.
TRAILING_MARK_RE = re.compile(
    r"।।\s*[0-9०-९]+(?:\.[0-9०-९]+){0,2}(?:\s*--\s*[0-9०-९]+(?:\.[0-9०-९]+){0,2})?\s*।।\s*$"
)


def parse_triplet(raw: str) -> tuple[int, int, int] | None:
    m = TRIPLET_RE.search(raw.translate(DEVANAGARI_DIGITS))
    return tuple(int(x) for x in m.groups()) if m else None  # type: ignore[return-value]


def parse_triplet_from_row(row: dict[str, str]) -> tuple[int, int, int] | None:
    """The `number` column is itself malformed on a few rows (its digits got
    swapped out for an editorial note) — fall back to searching the raw
    mantra text, which still carries its own trailing "।।a.b.c।।" marker."""
    return parse_triplet(row["number"]) or parse_triplet(row["mantra"])


def parse_single(raw: str) -> int | None:
    m = SINGLE_RE.search(raw.translate(DEVANAGARI_DIGITS))
    return int(m.group(1)) if m else None


def dedupe_consecutive(rows: list[dict[str, str]]) -> list[dict[str, str]]:
    """A verse-range reference like "1.5.1--1.5.3" was scraped into one
    identical row per verse in the range instead of being split out — keep
    only the first of each run of exact duplicates."""
    out: list[dict[str, str]] = []
    for row in rows:
        if out and out[-1]["mantra"] == row["mantra"]:
            continue
        out.append(row)
    return out


def clean_sanskrit(mantra: str) -> str:
    parts = [p.strip() for p in mantra.split(",")]
    parts = [p for p in parts if p]
    if parts and JUNK_HEADING_RE.match(parts[0]):
        parts = parts[1:]
    text = re.sub(r"\s+", " ", " ".join(parts)).strip()
    text = re.sub(r"^--\s*", "", text)
    text = TRAILING_PAREN_RE.sub("", text).strip()
    text = TRAILING_MARK_RE.sub("।।", text)
    return text.strip()


def load_rows(csv_path: Path) -> list[dict[str, str]]:
    with csv_path.open(newline="", encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh))
    return dedupe_consecutive(rows)


def shloka(verse_number: int, verse_label: str, sanskrit: str) -> dict[str, Any]:
    return {
        "verse_number": verse_number,
        "verse_label": verse_label,
        "sanskrit": sanskrit,
        "transliteration": to_iast(sanskrit),
        "meaning_ne": None,
        "meaning_en": None,
        "audio_file": None,
    }


def chapter(number: int | None, title_ne: str | None, title_en: str | None, shlokas: list[dict]) -> dict:
    return {"number": number, "title_ne": title_ne, "title_en": title_en, "shlokas": shlokas}


# --- Per-numbering-scheme builders ---


def build_flat(rows: list[dict[str, str]]) -> list[dict]:
    """Single chapter, verses numbered 1..N with no resets; an unnumbered
    trailing row (a colophon) gets a textual label instead of a number."""
    shlokas = []
    for i, row in enumerate(rows, start=1):
        n = parse_single(row["number"])
        label = str(n) if n is not None else "समाप्ति"
        shlokas.append(shloka(i, label, clean_sanskrit(row["mantra"])))
    return [chapter(None, None, None, shlokas)]


def build_reset(rows: list[dict[str, str]], title_ne_fmt: str, title_en_fmt: str) -> list[dict]:
    """Chapters recovered from where the flat verse number resets to 1
    (Avadhuta Gita: no chapter column, but each chapter restarts at 1)."""
    boundaries = [i for i, r in enumerate(rows) if parse_single(r["number"]) == 1]
    boundaries.append(len(rows))
    chapters = []
    for idx in range(len(boundaries) - 1):
        start, end = boundaries[idx], boundaries[idx + 1]
        cn = idx + 1
        shlokas = []
        for j, row in enumerate(rows[start:end], start=1):
            n = parse_single(row["number"]) or j
            shlokas.append(shloka(j, str(n), clean_sanskrit(row["mantra"])))
        chapters.append(
            chapter(cn, title_ne_fmt.format(n=to_deva(cn)), title_en_fmt.format(n=cn), shlokas)
        )
    return chapters


def build_triplet(
    rows: list[dict[str, str]],
    chapter_titles: dict[int, tuple[str, str]] | None = None,
) -> list[dict]:
    """Groups rows by the first ("adhyaya") component of their a.b.c verse
    number. A row with no parseable triplet (a colophon, or a malformed
    reference) is folded into whichever chapter the previous row belonged
    to. Returns a single unchaptered group when only one 'a' value occurs."""
    groups: list[tuple[int, list[dict[str, str]]]] = []
    current_a: int | None = None
    for row in rows:
        triplet = parse_triplet_from_row(row)
        a = triplet[0] if triplet else current_a
        if a is None:
            a = 1
        if not groups or groups[-1][0] != a:
            groups.append((a, []))
        groups[-1][1].append(row)
        current_a = a

    single_chapter = len({a for a, _ in groups}) <= 1
    chapters = []
    for a, group_rows in groups:
        shlokas = []
        last_good: tuple[int, int, int] | None = None
        for j, row in enumerate(group_rows, start=1):
            triplet = parse_triplet_from_row(row)
            if triplet:
                label = f"{triplet[0]}.{triplet[1]}.{triplet[2]}"
                last_good = triplet
            elif "इति" in row["mantra"] or "समाप्त" in row["mantra"]:
                # A closing colophon (end-of-section/end-of-text line) with no
                # verse number of its own.
                label = "समाप्ति"
            elif last_good:
                # A handful of rows have a typo'd reference (e.g. "13.2" for
                # "1.3.2") that neither column recovers — the sequence itself
                # is reliable, so infer the next mantra number from it.
                label = f"{last_good[0]}.{last_good[1]}.{last_good[2] + 1}"
                last_good = (last_good[0], last_good[1], last_good[2] + 1)
            else:
                label = str(j)
            shlokas.append(shloka(j, label, clean_sanskrit(row["mantra"])))
        if single_chapter:
            chapters.append(chapter(None, None, None, shlokas))
        else:
            title_ne, title_en = (chapter_titles or {}).get(a, (f"अध्याय {to_deva(a)}", f"Chapter {a}"))
            chapters.append(chapter(a, title_ne, title_en, shlokas))
    return chapters


def drop_trailing_duplicate(rows: list[dict[str, str]]) -> list[dict[str, str]]:
    """Five source files end with a row that exactly duplicates row 0 — a
    scrape artifact, not a real repeated verse."""
    if len(rows) > 1 and rows[-1]["mantra"] == rows[0]["mantra"]:
        return rows[:-1]
    return rows


def write_manifest(manifest: dict[str, Any]) -> None:
    out_path = OUT_DIR / f"{manifest['slug']}.json"
    out_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    total = sum(len(c["shlokas"]) for c in manifest["chapters"])
    print(f"wrote {out_path} ({len(manifest['chapters'])} chapter(s), {total} shlokas)")


def manifest(
    slug: str,
    order_index: int,
    title_sa: str,
    title_ne: str,
    title_en: str,
    subtitle_ne: str,
    subtitle_en: str,
    description_ne: str,
    description_en: str,
    source_ne: str,
    source_en: str,
    chapters: list[dict],
) -> dict[str, Any]:
    return {
        "slug": slug,
        "order_index": order_index,
        "category": "scripture",
        "title_sa": title_sa,
        "title_ne": title_ne,
        "title_en": title_en,
        "subtitle_ne": subtitle_ne,
        "subtitle_en": subtitle_en,
        "description_ne": description_ne,
        "description_en": description_en,
        "source_ne": source_ne,
        "source_en": source_en,
        "cover_image": "",
        "has_chapters": len(chapters) > 1,
        "chapters": chapters,
    }


def main() -> None:
    gitas = SRC_ROOT / "gitas"
    upanishads = SRC_ROOT / "upanishads"
    manifests: list[dict[str, Any]] = []

    # --- Gitas ---

    manifests.append(
        manifest(
            "avadhuta-gita", 30,
            "अवधूतगीता", "अवधूत गीता", "Avadhuta Gita",
            "दत्तात्रेय · ८ अध्याय", "Attributed to Dattatreya · 8 chapters",
            "दत्तात्रेयद्वारा उपदेशित अद्वैत वेदान्तको गहन गीता।",
            "An Advaita Vedanta text attributed to the sage Dattatreya.",
            "दत्तात्रेय, अवधूतगीता", "Attributed to Dattatreya",
            build_reset(load_rows(gitas / "avadhuta_gita.csv"), "अध्याय {n}", "Chapter {n}"),
        )
    )
    manifests.append(
        manifest(
            "kapila-gita", 31,
            "कपिलगीता", "कपिल गीता", "Kapila Gita",
            "श्रीमद्भागवत, तृतीय स्कन्ध", "Srimad Bhagavatam, Canto 3",
            "कपिल मुनिले आफ्नी माता देवहूतिलाई दिनुभएको सांख्य र भक्तियोगको उपदेश।",
            "Sage Kapila's teaching of Sankhya and bhakti yoga to his mother, Devahuti.",
            "श्रीमद्भागवत, तृतीय स्कन्ध", "Srimad Bhagavatam, Canto 3",
            build_triplet(load_rows(gitas / "kapila_gita.csv")),
        )
    )
    manifests.append(
        manifest(
            "sriram-gita", 32,
            "श्रीरामगीता", "श्रीराम गीता", "Sriram Gita (Rama Gita)",
            "अध्यात्मरामायण, उत्तरकाण्ड", "Adhyatma Ramayana, Uttara Kanda",
            "उमा-महेश्वर संवादमा श्रीरामले वेदान्तको सार उपदेश गर्नुभएको प्रसङ्ग।",
            "Rama's teaching on the essence of Vedanta, narrated as a dialogue between Shiva and Parvati.",
            "अध्यात्मरामायण, उत्तरकाण्ड, सर्ग ५", "Adhyatma Ramayana, Uttara Kanda, Sarga 5",
            build_flat(load_rows(gitas / "sriram_gita.csv")),
        )
    )
    manifests.append(
        manifest(
            "sruti-gita", 33,
            "श्रुतिगीता", "श्रुति गीता", "Sruti Gita",
            "श्रीमद्भागवत", "Srimad Bhagavatam",
            "वेदहरू (श्रुति) स्वयंले भगवान्को स्तुति गरेको प्रसङ्ग।",
            "The Vedas (Shruti), personified, offering their own hymn of praise to the Lord.",
            "श्रीमद्भागवत", "Srimad Bhagavatam",
            build_flat(load_rows(gitas / "sruti_gita.csv")),
        )
    )
    manifests.append(
        manifest(
            "uddhava-gita", 34,
            "उद्धवगीता", "उद्धव गीता", "Uddhava Gita",
            "श्रीमद्भागवत, एकादश स्कन्ध", "Srimad Bhagavatam, Canto 11",
            "श्रीकृष्णले आफ्ना परम भक्त उद्धवलाई दिनुभएको अन्तिम उपदेश।",
            "Krishna's final teaching to his devoted friend Uddhava.",
            "श्रीमद्भागवत, एकादश स्कन्ध", "Srimad Bhagavatam, Canto 11",
            build_flat(load_rows(gitas / "uddhava_gita.csv")),
        )
    )
    manifests.append(
        manifest(
            "vibhishana-gita", 35,
            "विभीषणगीता", "विभीषण गीता", "Vibhishana Gita",
            "रामचरितमानस, लङ्काकाण्ड", "Ramcharitmanas, Lanka Kanda",
            "युद्धअघि विभीषणलाई श्रीरामले धर्मको रथको रूपकमार्फत दिनुभएको उपदेश।",
            "Rama's teaching to Vibhishana on the eve of battle, using the allegory of the chariot of righteousness.",
            "रामचरितमानस, लङ्काकाण्ड", "Ramcharitmanas, Lanka Kanda",
            build_flat(load_rows(gitas / "vibhishana_gita.csv")),
        )
    )

    # --- Upanishads ---

    manifests.append(
        manifest(
            "isavasya-upanishad", 36,
            "ईशावास्योपनिषद्", "ईशावास्य उपनिषद्", "Isavasya Upanishad",
            "शुक्ल यजुर्वेद", "Shukla Yajurveda",
            "सबैभन्दा छोटो प्रधान उपनिषद्हरूमध्ये एक — त्याग र कर्मको समन्वय।",
            "One of the shortest of the principal Upanishads — on renunciation and action in harmony.",
            "शुक्ल यजुर्वेद", "Shukla Yajurveda",
            build_triplet(load_rows(upanishads / "isavasya_upanishad.csv")),
        )
    )
    manifests.append(
        manifest(
            "kena-upanishad", 37,
            "केनोपनिषद्", "केन उपनिषद्", "Kena Upanishad",
            "सामवेद · ४ खण्ड", "Samaveda · 4 khandas",
            'नामकरण गर्ने पहिलो शब्द "केन" (कसद्वारा?) बाट सुरु हुने ब्रह्मविद्या।',
            'Named for its opening word "kena" ("by whom?") — an inquiry into Brahman.',
            "सामवेद", "Samaveda",
            build_triplet(
                drop_trailing_duplicate(load_rows(upanishads / "kena_upanishad.csv")),
                {
                    1: ("खण्ड १", "Khanda 1"),
                    2: ("खण्ड २", "Khanda 2"),
                    3: ("खण्ड ३", "Khanda 3"),
                    4: ("खण्ड ४", "Khanda 4"),
                },
            ),
        )
    )
    manifests.append(
        manifest(
            "katha-upanishad", 38,
            "कठोपनिषद्", "कठ उपनिषद्", "Katha Upanishad",
            "कृष्ण यजुर्वेद", "Krishna Yajurveda",
            "नचिकेता र यमराजबीचको संवादमार्फत मृत्यु र आत्माको स्वरूपको विवेचना।",
            "The dialogue between the boy Nachiketa and Yama, lord of death, on the nature of the self.",
            "कृष्ण यजुर्वेद", "Krishna Yajurveda",
            build_triplet(load_rows(upanishads / "katha_upanishad.csv")),
        )
    )
    manifests.append(
        manifest(
            "prasna-upanishad", 39,
            "प्रश्नोपनिषद्", "प्रश्न उपनिषद्", "Prasna Upanishad",
            "अथर्ववेद · ६ प्रश्न", "Atharvaveda · 6 questions",
            "छ जना जिज्ञासुले ऋषि पिप्पलादलाई सोधेका छ प्रश्न र तिनका उत्तर।",
            "Six seekers put six questions to the sage Pippalada, and his answers.",
            "अथर्ववेद", "Atharvaveda",
            build_triplet(
                drop_trailing_duplicate(load_rows(upanishads / "prasna_upanishad.csv")),
                {n: (f"प्रश्न {to_deva(n)}", f"Question {n}") for n in range(1, 7)},
            ),
        )
    )
    manifests.append(
        manifest(
            "mundaka-upanishad", 40,
            "मुण्डकोपनिषद्", "मुण्डक उपनिषद्", "Mundaka Upanishad",
            "अथर्ववेद · ३ मुण्डक", "Atharvaveda · 3 Mundakas",
            "अपरा र परा विद्याबीचको भेद छुट्याई परा विद्याको मार्ग देखाउने उपनिषद्।",
            "Distinguishes the \"lower\" and \"higher\" knowledge, and points to the path of the higher.",
            "अथर्ववेद", "Atharvaveda",
            build_triplet(
                drop_trailing_duplicate(load_rows(upanishads / "mundaka_upanishad.csv")),
                {n: (f"मुण्डक {to_deva(n)}", f"Mundaka {n}") for n in range(1, 4)},
            ),
        )
    )
    manifests.append(
        manifest(
            "svetashvatara-upanishad", 41,
            "श्वेताश्वतरोपनिषद्", "श्वेताश्वतर उपनिषद्", "Svetashvatara Upanishad",
            "कृष्ण यजुर्वेद · ६ अध्याय", "Krishna Yajurveda · 6 chapters",
            "ईश्वर, प्रकृति र आत्माको सम्बन्धबारे ईश्वरवादी दर्शन प्रस्तुत गर्ने उपनिषद्।",
            "A theistic Upanishad exploring the relationship between God, nature (prakriti), and the individual soul.",
            "कृष्ण यजुर्वेद", "Krishna Yajurveda",
            build_triplet(
                drop_trailing_duplicate(load_rows(upanishads / "svetashvatra_upanishad.csv")),
                {n: (f"अध्याय {to_deva(n)}", f"Chapter {n}") for n in range(1, 7)},
            ),
        )
    )
    manifests.append(
        manifest(
            "taittiriya-upanishad", 42,
            "तैत्तिरीयोपनिषद्", "तैत्तिरीय उपनिषद्", "Taittiriya Upanishad",
            "कृष्ण यजुर्वेद", "Krishna Yajurveda",
            "शिक्षावल्ली, ब्रह्मानन्दवल्ली र भृगुवल्ली गरी तीन खण्डमा रहेको उपनिषद् (यहाँ शिक्षावल्लीको अंश)।",
            "Traditionally in three sections — Shiksha, Brahmananda and Bhrigu Valli (this text covers part of the Shiksha Valli).",
            "कृष्ण यजुर्वेद", "Krishna Yajurveda",
            build_triplet(load_rows(upanishads / "taittiriya_upanishad.csv")),
        )
    )
    manifests.append(
        manifest(
            "aitareya-upanishad", 43,
            "ऐतरेयोपनिषद्", "ऐतरेय उपनिषद्", "Aitareya Upanishad",
            "ऋग्वेद", "Rigveda",
            "सृष्टिको उत्पत्ति र आत्माको स्वरूपबारे विवेचना गर्ने ऋग्वेदसँग सम्बन्धित उपनिषद्।",
            "A Rigveda-affiliated Upanishad on the origin of creation and the nature of the self.",
            "ऋग्वेद", "Rigveda",
            build_triplet(load_rows(upanishads / "aitereya_upanishad.csv")),
        )
    )
    manifests.append(
        manifest(
            "brihadaranyaka-upanishad", 44,
            "बृहदारण्यकोपनिषद्", "बृहदारण्यक उपनिषद्", "Brihadaranyaka Upanishad",
            "शुक्ल यजुर्वेद", "Shukla Yajurveda",
            "सबैभन्दा ठूलो उपनिषद्हरूमध्ये एक — यहाँ प्रथम अध्यायको अंश।",
            "One of the longest Upanishads — this text covers part of its first chapter.",
            "शुक्ल यजुर्वेद", "Shukla Yajurveda",
            build_triplet(load_rows(upanishads / "brihadaranyaka_upanishad.csv")),
        )
    )
    manifests.append(
        manifest(
            "karika-upanishad", 45,
            "गौडपादकारिका", "गौडपाद कारिका (माण्डूक्य)", "Gaudapada Karika (on the Mandukya Upanishad)",
            "४ प्रकरण", "4 Prakaranas",
            "आचार्य गौडपादद्वारा माण्डूक्य उपनिषद्माथि रचिएको अद्वैत वेदान्तको आधारभूत कारिका ग्रन्थ।",
            "Gaudapada's foundational Advaita Vedanta verses (karikas) on the Mandukya Upanishad.",
            "गौडपादकारिका (माण्डूक्योपनिषद्सम्बद्ध)", "Verses traditionally appended to the Mandukya Upanishad",
            build_triplet(
                drop_trailing_duplicate(load_rows(upanishads / "karika_upanishad.csv")),
                {
                    1: ("आगमप्रकरणम्", "Agama Prakarana"),
                    2: ("वैतथ्यप्रकरणम्", "Vaitathya Prakarana"),
                    3: ("अद्वैतप्रकरणम्", "Advaita Prakarana"),
                    4: ("अलातशान्तिप्रकरणम्", "Alatashanti Prakarana"),
                },
            ),
        )
    )

    for m in manifests:
        write_manifest(m)


if __name__ == "__main__":
    main()
