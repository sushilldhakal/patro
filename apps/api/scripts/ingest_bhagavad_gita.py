#!/usr/bin/env python3
"""Parse bhagvad_gita.txt into data/documents_source/bhagavad-gita.json."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "bhagvad_gita.txt"
OUT = Path(__file__).resolve().parents[1] / "data/documents_source/bhagavad-gita.json"

DEVANAGARI_DIGITS = str.maketrans("०१२३४५६७८९", "0123456789")
VERSE_END = re.compile(r"॥\s*([०-९]+)\s*-\s*([०-९]+)\s*॥")
CHAPTER_HEADER = re.compile(r"अथ\s*.*?ऽध्यायः\s*।\s*(.+?)\s*$")
SPEAKER = re.compile(r"^(.+उवाच)\s*।?\s*$")
COLOPHON_START = "ॐ तत्सदिति"

CHAPTER_EN = {
    1: "Arjuna Vishada Yoga — The Grief of Arjuna",
    2: "Sankhya Yoga — The Yoga of Knowledge",
    3: "Karma Yoga — The Yoga of Action",
    4: "Jnana Karma Sannyasa Yoga — Knowledge and Renunciation of Action",
    5: "Karma Sannyasa Yoga — The Yoga of Renunciation",
    6: "Dhyana Yoga — The Yoga of Meditation",
    7: "Jnana Vijnana Yoga — Knowledge and Realization",
    8: "Aksara Brahma Yoga — The Imperishable Brahman",
    9: "Raja Vidya Raja Guhya Yoga — Royal Knowledge and the Royal Secret",
    10: "Vibhuti Yoga — The Yoga of Divine Glories",
    11: "Vishvarupa Darshana Yoga — The Vision of the Cosmic Form",
    12: "Bhakti Yoga — The Yoga of Devotion",
    13: "Kshetra Kshetrajna Vibhaga Yoga — The Field and the Knower",
    14: "Gunatraya Vibhaga Yoga — The Three Gunas",
    15: "Purushottama Yoga — The Supreme Person",
    16: "Daivasura Sampad Vibhaga Yoga — Divine and Demonic Natures",
    17: "Shraddhatraya Vibhaga Yoga — The Three Kinds of Faith",
    18: "Moksha Sannyasa Yoga — Liberation through Renunciation",
}

EXISTING_MEANINGS = {
    "1.1": {
        "meaning_ne": "धृतराष्ट्रले भने: हे सञ्जय, धर्मभूमि कुरुक्षेत्रमा युद्धको इच्छाले जम्मा भएका मेरा र पाण्डुका पुत्रहरूले के गरे?",
        "meaning_en": "Dhritarashtra said: O Sanjaya, what did my sons and the sons of Pandu do, having gathered eager to fight on the holy field of Kurukshetra?",
    },
    "1.2": {
        "meaning_ne": "सञ्जयले भने: पाण्डवहरूको व्यूह देखेर राजा दुर्योधन आचार्य (द्रोण) नजिक गएर यसो भने।",
        "meaning_en": "Sanjaya said: Seeing the army of the Pandavas arrayed, King Duryodhana approached his teacher Drona and spoke these words.",
    },
    "1.3": {
        "meaning_ne": "हे आचार्य, तपाईंका बुद्धिमान् शिष्य द्रुपदपुत्रले व्यूह रचेको पाण्डुपुत्रहरूको विशाल सेना हेर्नुहोस्।",
        "meaning_en": "O teacher, behold this great army of the sons of Pandu, arrayed by your own talented disciple, the son of Drupada.",
    },
    "ध्यानम्": {
        "meaning_ne": "शान्त आकार भएका, शेषनागमा शयन गर्ने, कमलनाभ, देवताका ईश्वर, विश्वका आधार, आकाशजस्तै व्यापक, मेघवर्ण, शुभ अङ्ग भएका, लक्ष्मीका कान्त, कमलनयन, योगीहरूको ध्यानले प्राप्त हुने, भवभय हरण गर्ने, सबै लोकका एकमात्र नाथ विष्णुलाई म वन्दना गर्छु।",
        "meaning_en": "I bow to Vishnu — of peaceful form, reclining on the serpent, lotus-naveled, lord of the gods, support of the world, vast as the sky, cloud-hued, of auspicious limbs, beloved of Lakshmi, lotus-eyed, reachable through the yogis' meditation, destroyer of the fear of worldly existence, the one lord of all worlds.",
    },
}

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


def to_int(deva: str) -> int:
    return int(deva.translate(DEVANAGARI_DIGITS))


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


def ne_title(raw: str) -> str:
    return raw.strip().rstrip("ः।. ")


def normalize_sanskrit(parts: list[str], speaker: str | None) -> str:
    body = " ".join(p.strip() for p in parts if p.strip())
    body = re.sub(r"\s+", " ", body).strip()
    body = VERSE_END.sub("॥", body)
    body = re.sub(r"\s+॥", "॥", body)
    body = re.sub(r"\s+।", "।", body)
    if speaker:
        speaker_txt = speaker if speaker.endswith("।") else f"{speaker}।"
        body = f"{speaker_txt} {body}"
    return body


COLOPHON_END = re.compile(r"॥\s*([०-९]+)\s*॥\s*$")


def to_deva(n: int) -> str:
    return str(n).translate(str.maketrans("0123456789", "०१२३४५६७८९"))


def parse(text: str) -> tuple[dict[int, str], dict[int, list[dict]]]:
    chapter_titles: dict[int, str] = {}
    chapters: dict[int, list[dict]] = {n: [] for n in range(1, 19)}
    buf: list[str] = []
    speaker: str | None = None
    colophon_buf: list[str] = []
    collecting_colophon = False
    dhyana_buf: list[str] = []
    collecting_dhyana = False

    for raw in text.splitlines():
        line = raw.strip()
        if not line:
            continue

        header = CHAPTER_HEADER.match(line)
        if header:
            collecting_colophon = False
            colophon_buf = []
            buf = []
            continue

        if collecting_dhyana:
            dhyana_buf.append(line)
            continue

        if line.startswith(COLOPHON_START):
            collecting_colophon = True
            colophon_buf = [line]
            buf = []
            speaker = None
            continue

        if collecting_colophon:
            colophon_buf.append(line)
            end = COLOPHON_END.search(line)
            if not end:
                continue
            chapter_n = to_int(end.group(1))
            last_n = chapters[chapter_n][-1]["verse_number"] if chapters[chapter_n] else 0
            chapters[chapter_n].append(
                _extra_shloka(
                    last_n + 1,
                    f"इति {to_deva(chapter_n)}",
                    normalize_sanskrit(colophon_buf, None),
                )
            )
            collecting_colophon = False
            colophon_buf = []
            if chapter_n == 18:
                collecting_dhyana = True
            continue

        if re.fullmatch(r".{0,24}उवाच\s*।?", line) and "॥" not in line:
            speaker = re.sub(r"\s*।\s*$", "", line).strip()
            continue

        buf.append(line)
        end = VERSE_END.search(line)
        if not end:
            continue

        chapter_n = to_int(end.group(1))
        verse_n = to_int(end.group(2))
        sanskrit = normalize_sanskrit(buf, speaker)
        chapters.setdefault(chapter_n, []).append(
            {
                "verse_number": verse_n,
                "verse_label": f"{chapter_n}.{verse_n}",
                "sanskrit": sanskrit,
                "transliteration": to_iast(sanskrit),
                "audio_file": None,
            }
        )
        buf = []
        speaker = None

    if dhyana_buf:
        last_n = chapters[18][-1]["verse_number"]
        chapters[18].append(
            _extra_shloka(last_n + 1, "ध्यानम्", normalize_sanskrit(dhyana_buf, None))
        )

    current = 0
    for raw in text.splitlines():
        header = CHAPTER_HEADER.match(raw.strip())
        if not header:
            continue
        current += 1
        chapter_titles[current] = ne_title(header.group(1))
    return chapter_titles, chapters


def _extra_shloka(verse_number: int, verse_label: str, sanskrit: str) -> dict:
    return {
        "verse_number": verse_number,
        "verse_label": verse_label,
        "sanskrit": sanskrit,
        "transliteration": to_iast(sanskrit),
        "audio_file": None,
    }


def main() -> None:
    titles, chapters = parse(SRC.read_text(encoding="utf-8"))
    counts = {n: len(chapters.get(n, [])) for n in range(1, 19)}
    total = sum(counts.values())
    print("verse counts:", counts, "total:", total)
    missing = [n for n in range(1, 19) if counts[n] == 0]
    if missing:
        raise SystemExit(f"missing chapters: {missing}")

    out_chapters = []
    for n in range(1, 19):
        sa_title = titles.get(n) or f"अध्याय {n}"
        shlokas = []
        for shloka in chapters[n]:
            extra = EXISTING_MEANINGS.get(shloka["verse_label"])
            if extra is None and shloka["verse_label"].startswith("इति "):
                yoga_en = CHAPTER_EN[n].split(" — ", 1)[0]
                extra = {
                    "meaning_ne": (
                        f"ॐ तत् सत्। यस प्रकार श्रीमद्भगवद्गीता रूपी उपनिषद्, ब्रह्मविद्या र "
                        f"योगशास्त्रअन्तर्गत श्रीकृष्ण–अर्जुन संवादमा {sa_title} नामक "
                        f"{to_deva(n)} अध्याय समाप्त भयो।"
                    ),
                    "meaning_en": (
                        f"Om tat sat. Thus ends chapter {n}, named {yoga_en}, in the "
                        f"Upanishad of the Bhagavad Gita, the knowledge of Brahman, "
                        f"the scripture of yoga, in the dialogue between Krishna and Arjuna."
                    ),
                }
            if extra:
                shloka = {**shloka, **extra}
            else:
                shloka = {**shloka, "meaning_ne": None, "meaning_en": None}
            shlokas.append(shloka)
        out_chapters.append(
            {
                "number": n,
                "title_ne": sa_title,
                "title_en": CHAPTER_EN[n],
                "shlokas": shlokas,
            }
        )

    manifest = {
        "slug": "bhagavad-gita",
        "order_index": 2,
        "category": "scripture",
        "title_sa": "श्रीमद्भगवद्गीता",
        "title_ne": "श्रीमद्भगवद्गीता",
        "title_en": "Bhagavad Gita",
        "subtitle_ne": "महाभारत, भीष्मपर्व · १८ अध्याय",
        "subtitle_en": "Mahabharata, Bhishma Parva · 18 chapters",
        "description_ne": "अर्जुनलाई श्रीकृष्णले कुरुक्षेत्रको युद्धभूमिमा दिनुभएको उपदेश — सम्पूर्ण १८ अध्याय।",
        "description_en": "Krishna's counsel to Arjuna on the battlefield of Kurukshetra — the complete 18 chapters.",
        "source_ne": "महाभारत, भीष्मपर्व",
        "source_en": "Mahabharata, Bhishma Parva",
        "cover_image": "",
        "has_chapters": True,
        "audio_prefix": "documents/bhagavad-gita",
        "chapters": out_chapters,
    }
    OUT.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUT} ({total} shlokas, {len(out_chapters)} chapters)")


if __name__ == "__main__":
    main()
