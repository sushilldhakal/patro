#!/usr/bin/env python3
"""Parse vigyan-bhairava-tantra.txt into documents_source JSON."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "vigyan-bhairava-tantra.txt"
OUT = Path(__file__).resolve().parents[1] / "data/documents_source/vigyan-bhairava-tantra.json"

DEVANAGARI_DIGITS = str.maketrans("०१२३४५६७८९", "0123456789")
VERSE_HEADER = re.compile(r"^श्लोक\s+([०-९0-9]+)([a-zA-Z]*)\s*$")
NE_MARK = re.compile(r"^(?:🇳🇵\s*)?(?:नेपाली|Nepali)\s*:?\s*", re.I)
EN_MARK = re.compile(r"^(?:🇬🇧\s*)?English\s*:?\s*", re.I)
FLAG_NE = re.compile(r"^(?:🇳🇵|🇳)\s*")
FLAG_EN = re.compile(r"^🇬🇧\s*")

VOWELS = {
    "अ": "a",
    "आ": "ā",
    "इ": "i",
    "ई": "ī",
    "उ": "u",
    "ऊ": "ū",
    "ऋ": "ṛ",
    "ॠ": "ṝ",
    "ऌ": "ḷ",
    "ॡ": "ḹ",
    "ए": "e",
    "ऐ": "ai",
    "ओ": "o",
    "औ": "au",
}
MATRAS = {
    "ा": "ā",
    "ि": "i",
    "ी": "ī",
    "ु": "u",
    "ू": "ū",
    "ृ": "ṛ",
    "ॄ": "ṝ",
    "ॢ": "ḷ",
    "ॣ": "ḹ",
    "े": "e",
    "ै": "ai",
    "ो": "o",
    "ौ": "au",
}
CONSONANTS = {
    "क": "k",
    "ख": "kh",
    "ग": "g",
    "घ": "gh",
    "ङ": "ṅ",
    "च": "c",
    "छ": "ch",
    "ज": "j",
    "झ": "jh",
    "ञ": "ñ",
    "ट": "ṭ",
    "ठ": "ṭh",
    "ड": "ḍ",
    "ढ": "ḍh",
    "ण": "ṇ",
    "त": "t",
    "थ": "th",
    "द": "d",
    "ध": "dh",
    "न": "n",
    "प": "p",
    "फ": "ph",
    "ब": "b",
    "भ": "bh",
    "म": "m",
    "य": "y",
    "र": "r",
    "ल": "l",
    "व": "v",
    "श": "ś",
    "ष": "ṣ",
    "स": "s",
    "ह": "h",
    "ळ": "ḷ",
    "ऩ": "n",
    "ऱ": "r",
    "ऴ": "ḷ",
    "क़": "q",
    "ख़": "kh",
    "ग़": "g",
    "ज़": "z",
    "ड़": "ṛ",
    "ढ़": "ṛh",
    "फ़": "f",
    "य़": "y",
}
MARKS = {
    "ं": "ṃ",
    "ः": "ḥ",
    "ँ": "m̐",
    "ऽ": "'",
    "।": "|",
    "॥": "||",
    "ॐ": "oṃ",
    "्": "",
}


def to_int(num: str) -> int:
    return int(num.translate(DEVANAGARI_DIGITS))


def to_iast(text: str) -> str:
    out: list[str] = []
    i = 0
    n = len(text)
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
            out.append(VOWELS[ch])
            i += 1
            continue
        if ch in MATRAS:
            out.append(MATRAS[ch])
            i += 1
            continue
        if ch in MARKS:
            out.append(MARKS[ch])
            i += 1
            continue
        if ch in "०१२३४५६७८९":
            out.append(ch.translate(DEVANAGARI_DIGITS))
            i += 1
            continue
        out.append(ch)
        i += 1
    return re.sub(r" +", " ", "".join(out)).strip()


def join_parts(parts: list[str]) -> str:
    text = " ".join(p.strip() for p in parts if p.strip())
    return re.sub(r"\s+", " ", text).strip()


def is_ne_mark(line: str) -> tuple[bool, str]:
    rest = FLAG_NE.sub("", line).strip()
    if NE_MARK.match(rest):
        return True, NE_MARK.sub("", rest).strip()
    return False, ""


def is_en_mark(line: str) -> tuple[bool, str]:
    rest = FLAG_EN.sub("", line).strip()
    if EN_MARK.match(rest) or rest.lower().startswith("english"):
        return True, EN_MARK.sub("", rest).strip()
    return False, ""


def parse(text: str) -> tuple[str, list[dict]]:
    lines = text.splitlines()
    intro: list[str] = []
    i = 0
    while i < len(lines):
        if VERSE_HEADER.match(lines[i].strip()):
            break
        intro.append(lines[i])
        i += 1

    headers: list[tuple[int, str, int]] = []
    for idx in range(i, len(lines)):
        m = VERSE_HEADER.match(lines[idx].strip())
        if m:
            headers.append((idx, m.group(1), m.group(2) or ""))

    shlokas: list[dict] = []
    for hi, (start, raw_num, suffix) in enumerate(headers):
        end = headers[hi + 1][0] if hi + 1 < len(headers) else len(lines)
        verse_number = to_int(raw_num)
        verse_label = f"{verse_number}{suffix}"
        sa: list[str] = []
        ne: list[str] = []
        en: list[str] = []
        mode = "sa"
        for raw in lines[start + 1 : end]:
            line = raw.strip()
            if not line:
                continue
            if line in {"संस्कृत:", "संस्कृत"}:
                mode = "sa"
                continue
            hit_ne, leftover_ne = is_ne_mark(line)
            if hit_ne:
                mode = "ne"
                if leftover_ne:
                    ne.append(leftover_ne)
                continue
            hit_en, leftover_en = is_en_mark(line)
            if hit_en:
                mode = "en"
                if leftover_en:
                    en.append(leftover_en)
                continue
            if mode == "sa":
                sa.append(line)
            elif mode == "ne":
                ne.append(line)
            else:
                en.append(line)

        sanskrit = join_parts(sa)
        meaning_ne = join_parts(ne)
        meaning_en = join_parts(en)
        shlokas.append(
            {
                "verse_number": verse_number,
                "verse_label": verse_label,
                "sanskrit": sanskrit,
                "transliteration": to_iast(sanskrit) if sanskrit else "",
                "meaning_ne": meaning_ne,
                "meaning_en": meaning_en,
                "audio_file": None,
            }
        )
    description_ne = join_parts(
        [ln for ln in intro if ln.strip() and ln.strip() != "परिचय"]
    )
    return description_ne, shlokas


def main() -> None:
    description_ne, shlokas = parse(SRC.read_text(encoding="utf-8"))
    empty = [
        s["verse_label"]
        for s in shlokas
        if not s["sanskrit"] or not s["meaning_ne"] or not s["meaning_en"]
    ]
    labels = [s["verse_label"] for s in shlokas]
    print(f"parsed {len(shlokas)} shlokas")
    print("labels:", ", ".join(labels))
    if empty:
        raise SystemExit(f"empty fields on verses: {empty}")

    manifest = {
        "slug": "vigyan-bhairava-tantra",
        "order_index": 16,
        "category": "scripture",
        "title_sa": "विज्ञानभैरव तन्त्रम्",
        "title_ne": "विज्ञानभैरव तन्त्र",
        "title_en": "Vijnana Bhairava Tantra",
        "subtitle_ne": "शिव–शक्ति संवाद · ११२ धारणा",
        "subtitle_en": "A dialogue of Shiva and Shakti · 112 dharanas",
        "description_ne": description_ne,
        "description_en": (
            "A jewel of the ancient Indian tantric tradition, given as a deep "
            "dialogue between Lord Shiva (Bhairava) and Goddess Parvati (Devi). "
            "It holds 112 meditation methods that open simple yet deep ways into "
            "the many states of human consciousness, supporting self-realization "
            "and liberation. It needs no hard ritual or complex practice: it "
            "teaches the art of turning ordinary daily acts themselves into meditation."
        ),
        "source_ne": "रुद्रयामल तन्त्र",
        "source_en": "Rudrayamala Tantra",
        "cover_image": "",
        "has_chapters": False,
        "chapters": [
            {
                "number": None,
                "title_ne": None,
                "title_en": None,
                "shlokas": shlokas,
            }
        ],
    }
    OUT.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
