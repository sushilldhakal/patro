"""Turn the four scanned reader texts into documents_source JSON.

The scans live next to the monorepo (the Desktop folder), not in git. What the
API seeds is the JSON this writes:

    python scripts/ingest_reader_texts.py

Swasthani and Chanakya are Nepali books. Harishchandra is Motiram Bhatta's
Nepali verse. The file named surya.txt is the 1861 English Goladhyaya of the
Siddhanta Shiromani, not the Surya Siddhanta. Pandey's hOCR is the Surya
Siddhanta: the root verse plus his Hindi translation.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

SOURCE = Path(__file__).resolve().parents[4]
OUT = Path(__file__).resolve().parents[1] / "data" / "documents_source"

DEV = re.compile(r"[\u0900-\u097F]")
LATIN = re.compile(r"[A-Za-z]")


def dev_count(text: str) -> int:
    return len(DEV.findall(text))


def only_dev(text: str) -> str:
    return "".join(ch for ch in text if "\u0900" <= ch <= "\u097F")


def tidy_ne(text: str) -> str:
    text = re.sub(r"[A-Za-z0-9]+", " ", text)
    text = re.sub(r"[^\u0900-\u097F।॥\s]", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip(" ।")


def paragraphs(text: str, target: int = 380, limit: int = 620) -> list[str]:
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        return []
    parts = re.split(r"(?<=[।॥.?!])\s+", text)
    chunks: list[str] = []
    buf = ""
    for part in parts:
        part = part.strip()
        if not part:
            continue
        if buf and len(buf) + 1 + len(part) > target:
            chunks.append(buf)
            buf = part
        else:
            buf = f"{buf} {part}".strip()
        if len(buf) >= limit:
            chunks.append(buf)
            buf = ""
    if buf:
        chunks.append(buf)
    return chunks


def shloka(number: int, label: str, text: str, meaning: str | None = None) -> dict:
    return {
        "verse_number": number,
        "verse_label": label,
        "sanskrit": text,
        "meaning_ne": meaning,
        "meaning_en": None,
        "audio_file": None,
    }


def chapter(number: int, title_ne: str, title_en: str, texts: list[str]) -> dict:
    return {
        "number": number,
        "title_ne": title_ne,
        "title_en": title_en,
        "shlokas": [shloka(i, str(i), text) for i, text in enumerate(texts, 1)],
    }


def write(manifest: dict) -> None:
    path = OUT / f"{manifest['slug']}.json"
    path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    verses = sum(len(ch["shlokas"]) for ch in manifest["chapters"])
    print(f"{manifest['slug']}: {len(manifest['chapters'])} chapters, {verses} passages -> {path.name}")


def keep_swasthani(line: str) -> bool:
    if "उपाख्यान" in line:
        return False
    if "व्रतकथा" in line and "स्वस्थानी" in line and len(line) < 90:
        return False
    if dev_count(line) < 12:
        return False
    dev = only_dev(line)
    noise = len(re.findall(r"[^\u0900-\u097F\s।॥]", line))
    return len(dev) >= noise


# Later stories are tested first so a garbled running head lands on the right one.
# Brihat Swasthani's thirty-one upakhyanas, in book order.
SWASTHANI_STORIES: list[tuple[str, str, tuple[str, ...]]] = [
    ("पवित्रा-उपाख्यान", "Pavitra", ("पवित्रा", "पबित्रा", "पचित्रा")),
    ("काञ्चनमालिनी-उपाख्यान", "Kanchanamalini", ("मालिनी",)),
    ("सुलोचना-उपाख्यान", "Sulochana", ("सुलोचना",)),
    ("गोमापूर्ववृत्तान्त-उपाख्यान", "Goma's earlier life", ("पूर्ववृत्तान्त",)),
    ("चन्द्रावती-स्ववृत्तान्त-उपाख्यान", "Chandravati tells her story", ("स्ववृत्तान्त", "स्वबृत्तान्त")),
    ("चन्द्रावतीव्रत-उपाख्यान", "Chandravati's vrata", ("चन्द्रावती",)),
    ("नवराज-ब्राह्मणभोजन-उपाख्यान", "Navaraj feeds the brahmins", ("भोजन",)),
    ("नवराज-ब्राह्मणनिमन्त्रण-उपाख्यान", "Navaraj invites the brahmins", ("निमन्त्रण", "निमन्त्रण")),
    ("गोमा-स्वस्थानीव्रत-उपाख्यान", "Goma's Swasthani vrata", ("गोमास्वस्थानी", "गोमास्वस्थानीव्रत")),
    ("सप्तर्षि-व्रतोपदेश-उपाख्यान", "The Saptarshi's teaching", ("सप्तर्षि", "व्रतोपदेश")),
    ("गोमाविवाह-उपाख्यान", "Goma's wedding", ("गोमाविवाह", "गोपाविवाह", "गोमाविचाह")),
    ("गोमाजन्म-उपाख्यान", "Goma's birth", ("गोमाजन्म", "गौमाजन्म")),
    ("माघमासमहिमा-उपाख्यान", "The glory of Magh", ("माघमास",)),
    ("नागिनीव्रत-उपाख्यान", "The Naga daughters' vrata", ("नागिनी", "नागिमी", "मागिनी")),
    ("वृन्दाधर्महरण-उपाख्यान", "The taking of Vrinda's dharma", ("वृन्दा", "वुन्दा", "बुन्दा")),
    ("महादेवमृगरूप-उपाख्यान", "Mahadeva as a deer", ("मृगरूप",)),
    ("तारकासुरवध-उपाख्यान", "The slaying of Tarakasura", ("तारकासुर",)),
    ("शिवश्वसुरगृहगमन-उपाख्यान", "Shiva goes to his father-in-law's house", ("श्वसुर", "गृहगमन", "गृहगपन")),
    ("पार्वतीविवाह-उपाख्यान", "Parvati's wedding", ("पार्वती", "प्रार्वती")),
    ("स्वस्थानीव्रत-उपाख्यान", "The Swasthani vrata", ("स्वस्थानीव्रत", "स्वस्थानीत्नत")),
    ("मृगस्थली-उपाख्यान", "Mrigasthali", ("मृगस्थली",)),
    ("पीठोत्पत्ति-उपाख्यान", "The origin of the pithas", ("पीठोत्पत्ति", "पीठ")),
    ("सतीअङ्गपतन-उपाख्यान", "Sati's limbs fall", ("अङ्गपतन", "अंगपतन")),
    ("दक्षयज्ञविध्वंस-उपाख्यान", "The ruin of Daksha's sacrifice", ("विध्वंस", "विध्वस")),
    ("दक्षसेना-उपाख्यान", "Daksha's army", ("दक्षसेना", "क्षसेना")),
    ("दक्षयज्ञ-उपाख्यान", "Daksha's sacrifice", ("दक्षयज्ञ", "दक्षयञ्च")),
    ("त्रिपुरदाह-उपाख्यान", "The burning of Tripura", ("त्रिपुर",)),
    ("सतीविवाह-उपाख्यान", "Sati's wedding", ("सतीविवाह", "सत्तीविवाह")),
    ("दक्षकन्या-उपाख्यान", "Daksha's daughters", ("दक्षकन्या",)),
    ("दिक्पाल-उपाख्यान", "The guardians of the directions", ("दिक्पाल",)),
    ("सृष्टिक्रम-उपाख्यान", "The order of creation", ("सृष्टि",)),
]


def swasthani_index(line: str) -> int | None:
    if "उपाख्यान" not in line and "उपाख्यान" not in line:
        return None
    folded = only_dev(line)
    if "उपाख्यान" not in folded and "उपाख्यान" not in folded:
        return None
    for offset, (_ne, _en, stems) in enumerate(SWASTHANI_STORIES):
        if any(stem in folded for stem in stems):
            return len(SWASTHANI_STORIES) - 1 - offset
    return None


def ingest_swasthani(path: Path) -> dict:
    lines = path.read_text(encoding="utf-8").splitlines()
    buckets: list[list[str]] = [[] for _ in range(len(SWASTHANI_STORIES) + 1)]
    current = 0
    for line in lines:
        found = swasthani_index(line)
        if found is not None and found + 1 >= current:
            current = found + 1
            continue
        if current == 0 or not keep_swasthani(line):
            continue
        cleaned = tidy_ne(line)
        if dev_count(cleaned) >= 12:
            buckets[current].append(cleaned)

    chapters = []
    number = 1
    # buckets[0] is unused. Story 0 in the reversed table is the last chapter.
    ordered = list(reversed(SWASTHANI_STORIES))
    for index, (title_ne, title_en, _stems) in enumerate(ordered, 1):
        texts = [text for text in paragraphs(" ".join(buckets[index])) if readable_ne(text)]
        if not texts:
            continue
        chapters.append(chapter(number, title_ne, title_en, texts))
        number += 1

    return {
        "slug": "swasthani-brata-katha",
        "order_index": 42,
        "category": "katha",
        "subcategory": "vrat-katha",
        "title_sa": "बृहत्स्वस्थानीव्रतकथा",
        "title_ne": "बृहत् स्वस्थानी व्रतकथा",
        "title_en": "Brihat Swasthani Vrat Katha",
        "subtitle_ne": f"{len(chapters)} अध्याय",
        "subtitle_en": f"{len(chapters)} chapters",
        "description_ne": "माघमा पढिने बृहत् स्वस्थानी व्रतकथा। सृष्टिदेखि गोमा र नवराजको कथासम्मका उपाख्यान, स्क्यानबाट उतारेको पाठ। केही हरफमा छापाको दाग बाँकी छ।",
        "description_en": "The Brihat Swasthani Vrat Katha read through Magh, from the creation upakhyana through Goma and Navaraj. Taken from a scanned book, so a few lines still carry the print.",
        "source_ne": "बृहत् स्वस्थानी व्रतकथा",
        "source_en": "Brihat Swasthani Vrat Katha",
        "cover_image": "",
        "has_chapters": True,
        "inline_chapters": False,
        "chapters": chapters,
    }


CHANAKYA_HEADER = re.compile(r"अध्याय\s*[-–—]?\s*([०-९0-9]+)")
DEV_DIGITS = str.maketrans("०१२३४५६७८९", "0123456789")


def chanakya_number(line: str) -> int | None:
    match = CHANAKYA_HEADER.search(line)
    if not match:
        return None
    if "नेपाली" not in line and len(line.strip()) > 24:
        return None
    try:
        return int(match.group(1).translate(DEV_DIGITS))
    except ValueError:
        return None


def dev_digits(number: int) -> str:
    return str(number).translate(str.maketrans("0123456789", "०१२३४५६७८९"))


def readable_ne(text: str) -> bool:
    letters = len(re.findall(r"[\u0900-\u0965]", text))
    digits = len(re.findall(r"[०-९]", text))
    words = text.split()
    if letters < 36 or len(words) < 8:
        return False
    if digits > letters * 0.2:
        return False
    short = sum(1 for word in words if dev_count(word) <= 1)
    tiny = sum(1 for word in words if dev_count(word) <= 2)
    return short <= len(words) * 0.4 and tiny <= len(words) * 0.5


def keep_chanakya(line: str) -> bool:
    if chanakya_number(line) is not None:
        return False
    if "नेपाली भाषा" in line and "अर्थ" in line:
        return False
    if dev_count(line) < 8:
        return False
    folded = only_dev(line)
    if folded in {"चाणक्यनीतिदर्पण", "चाणक्यनीतिदर्पणम्"}:
        return False
    noise = len(re.findall(r"[^\u0900-\u097F\s।॥]", line))
    return dev_count(line) >= noise


def ingest_chanakya(path: Path) -> dict:
    buckets: dict[int, list[str]] = {}
    current = 1
    for line in path.read_text(encoding="utf-8").splitlines():
        number = chanakya_number(line)
        if number is not None:
            current = number
            continue
        if not keep_chanakya(line):
            continue
        cleaned = tidy_ne(line)
        if dev_count(cleaned) >= 8:
            buckets.setdefault(current, []).append(cleaned)

    chapters = []
    for number in sorted(buckets):
        texts = [text for text in paragraphs(" ".join(buckets[number]), 320, 560) if readable_ne(text)]
        if texts:
            label = dev_digits(number)
            chapters.append(chapter(number, f"अध्याय {label}", f"Chapter {label}", texts))
    return {
        "slug": "chanakya-niti-darpan",
        "order_index": 111,
        "category": "shastra",
        "subcategory": "dharmashastra",
        "title_sa": "चाणक्यनीतिदर्पणः",
        "title_ne": "चाणक्य नीति दर्पण",
        "title_en": "Chanakya Niti Darpan",
        "subtitle_ne": f"{len(chapters)} अध्याय · श्लोक र अर्थ",
        "subtitle_en": f"{len(chapters)} chapters · verse and meaning",
        "description_ne": "चाणक्य नीति दर्पणको नेपाली संस्करण। प्रत्येक अध्यायमा संस्कृत श्लोक, त्यसको पद्य अनुवाद र गद्य अर्थ छ।",
        "description_en": "A Nepali edition of the Chanakya Niti Darpan. Each chapter gives the Sanskrit verse, a verse rendering, and the meaning in prose.",
        "source_ne": "चाणक्यनीतिदर्पण",
        "source_en": "Chanakya Niti Darpan",
        "cover_image": "",
        "has_chapters": True,
        "inline_chapters": False,
        "chapters": chapters,
    }


HARISH_MARKER = re.compile(r"^[\(\[]\s*[०-९0-9]+\s*[\)\]]\.?\s*$")
HARISH_TITLE = re.compile(r"सत्य\s*[-–]?\s*हरिश्च")


def ingest_harishchandra(path: Path) -> dict:
    verses: list[str] = []
    buf: list[str] = []
    started = False

    def flush() -> None:
        text = tidy_ne(" ".join(buf))
        buf.clear()
        if dev_count(text) >= 20:
            verses.append(text)

    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if HARISH_MARKER.match(stripped):
            if started:
                flush()
            started = True
            continue
        if HARISH_TITLE.search(stripped):
            if started:
                flush()
            continue
        if not started or dev_count(stripped) < 8:
            continue
        buf.append(stripped)
    flush()

    return {
        "slug": "satya-harishchandra-katha",
        "order_index": 43,
        "category": "katha",
        "subcategory": "purana-katha",
        "title_sa": "सत्यहरिश्चन्द्रकथा",
        "title_ne": "सत्य हरिश्चन्द्र कथा",
        "title_en": "Satya Harishchandra Katha",
        "subtitle_ne": "मोतीराम भट्ट",
        "subtitle_en": "Motiram Bhatta",
        "description_ne": "राजा हरिश्चन्द्रको सत्य कथा, मोतीराम भट्टको नेपाली पद्यमा। रत्न पुस्तक भण्डार, काठमाडौं।",
        "description_en": "The story of King Harishchandra in Motiram Bhatta's Nepali verse. Ratna Pustak Bhandar, Kathmandu.",
        "source_ne": "मोतीराम भट्ट, रत्न पुस्तक भण्डार, काठमाडौं",
        "source_en": "Motiram Bhatta, Ratna Pustak Bhandar, Kathmandu",
        "cover_image": "",
        "has_chapters": False,
        "chapters": [
            {
                "number": None,
                "title_ne": None,
                "title_en": None,
                "shlokas": [shloka(i, str(i), text) for i, text in enumerate(verses, 1)],
            }
        ],
    }


GOLADHYAYA = [
    ("अध्याय १ · गोलाध्ययनको प्रशंसा", "Chapter 1 · In praise of the sphere"),
    ("अध्याय २ · गोलाका प्रश्न", "Chapter 2 · Questions on the sphere"),
    ("अध्याय ३ · भुवनकोश", "Chapter 3 · Bhuvanakosha, cosmography"),
    ("अध्याय ४ · मध्यगति", "Chapter 4 · Madhyagati, the mean places"),
    ("अध्याय ५ · स्पष्टगति", "Chapter 5 · The true places"),
    ("अध्याय ६ · गोलाबन्ध", "Chapter 6 · Golabandha, the armillary sphere"),
    ("अध्याय ७ · त्रिप्रश्न", "Chapter 7 · Triprashna, time, place and direction"),
    ("अध्याय ८ · ग्रहण", "Chapter 8 · Eclipses"),
    ("अध्याय ९ · दृक्कर्म", "Chapter 9 · Drikkarma, rising and setting"),
    ("अध्याय १० · शृङ्गोन्नति", "Chapter 10 · Shringonnati, the moon's phases"),
    ("अध्याय ११ · यन्त्र", "Chapter 11 · Instruments"),
    ("अध्याय १२ · ऋतु", "Chapter 12 · The seasons"),
    ("अध्याय १३ · प्रश्न", "Chapter 13 · Questions"),
]
CHAPTER_LINE = re.compile(r"^(?:CHAPTER|Chapter|Chapteb|CHAPTEB)\s+([IVXLC0-9]+)\b")
def keep_english(line: str) -> bool:
    stripped = line.strip()
    if not stripped or CHAPTER_LINE.match(stripped):
        return False
    if re.fullmatch(r"(?i)digitized by|google", stripped):
        return False
    if re.match(r"(?i)^end of ", stripped):
        return False
    if re.search(r"overdue|borrower|coUection|COLLECTION OF ORIENTAL|recaUed|WIDENER|Harvard Co|preservation", stripped, re.I):
        return False
    letters = LATIN.findall(stripped)
    if len(letters) < 18:
        return False
    if len(letters) / max(len(stripped), 1) < 0.55:
        return False
    # A scanned page header: "106 Translation of the" or "II. 3.] Siddhanta".
    if len(letters) < 45 and (
        re.match(r"(?i)^\d{2,4}\s+translation\b", stripped)
        or re.search(r"\]\s*\S{0,12}$", stripped)
        or re.match(r"(?i)^translation of the\b", stripped)
    ):
        return False
    return True


def ingest_goladhyaya(path: Path) -> dict:
    buckets: list[list[str]] = [[] for _ in range(13)]
    current = -1
    # The scan has no "CHAPTER XI" line. The yantra chapter begins after the
    # close of chapter 10 and runs until "CHAPTER XII".
    yantra_open = False
    pending_hyphen = False
    for raw in path.read_text(encoding="utf-8").splitlines():
        stripped = raw.strip()
        if re.match(r"End of Chapter X\b", stripped):
            current = 10
            yantra_open = True
            pending_hyphen = False
            continue
        match = CHAPTER_LINE.match(stripped)
        if match and "—" not in stripped and len(stripped) < 40:
            # The contents list uses the same word, then an em dash. Real
            # chapter openings are a short line of their own, in order.
            token = match.group(1).upper()
            if yantra_open and current == 10 and token.startswith("XI"):
                current = 11
            elif current < 12:
                current += 1
            continue
        if current < 0 or not keep_english(stripped):
            pending_hyphen = False
            continue
        piece = re.sub(r"\s+", " ", stripped)
        if pending_hyphen and buckets[current]:
            buckets[current][-1] = buckets[current][-1][:-1] + piece
        else:
            buckets[current].append(piece)
        pending_hyphen = piece.endswith("-") and piece[-2:-1].isalpha()

    chapters = []
    for index, (title_ne, title_en) in enumerate(GOLADHYAYA):
        joined = " ".join(buckets[index])
        joined = re.sub(r"\s+", " ", joined)
        texts = [
            text
            for text in paragraphs(joined, 460, 780)
            if len(LATIN.findall(text)) >= 40
        ]
        if texts:
            chapters.append(chapter(index + 1, title_ne, title_en, texts))

    return {
        "slug": "siddhanta-shiromani-goladhyaya",
        "order_index": 112,
        "category": "shastra",
        "subcategory": "ganita",
        "title_sa": "सिद्धान्तशिरोमणिः गोलाध्यायः",
        "title_ne": "सिद्धान्तशिरोमणि, गोलाध्याय",
        "title_en": "Siddhanta Shiromani, Goladhyaya",
        "subtitle_ne": "भास्कर · १३ अध्याय",
        "subtitle_en": "Bhaskara · 13 chapters",
        "description_ne": "भास्कराचार्यको सिद्धान्तशिरोमणिको गोलाध्याय, सन् १८६१ को अङ्ग्रेजी अनुवाद। यो सूर्यसिद्धान्त होइन। स्क्यानका केही हरफ अस्पष्ट छन्।",
        "description_en": "The Goladhyaya, the sphere, of Bhaskara's Siddhanta Shiromani, in the English translation printed at Calcutta in 1861. This is not the Surya Siddhanta. Some lines of the scan are unclear.",
        "source_ne": "सिद्धान्तशिरोमणि, गोलाध्याय · कलकत्ता, १८६१",
        "source_en": "Siddhanta Shiromani, Goladhyaya, Calcutta, 1861",
        "cover_image": "",
        "has_chapters": True,
        "inline_chapters": False,
        "chapters": chapters,
    }


# Pandey's edition prints the Sanskrit verse, Ranganatha's commentary, then
# Pandey's Hindi. The running head is "अधिकार: - chapter page".
SURYA_CHAPTERS = [
    (("मध्यमाधिकार",), "मध्यमाधिकार", "Madhyamadhikara, the mean motions"),
    (("स्पष्टाधिकार",), "स्पष्टाधिकार", "Spashtadhikara, the true places"),
    (("त्रिप्रश्नाधिकार", "त्रिप्रश्नगाधिकार"), "त्रिप्रश्नाधिकार", "Triprashna, direction, place and time"),
    (("चन्द्रग्रहणाधिकार",), "चन्द्रग्रहणाधिकार", "Lunar eclipses"),
    (("सूर्यग्रहणाधिकार",), "सूर्यग्रहणाधिकार", "Solar eclipses"),
    (("छेद्यकाधिकार",), "छेद्यकाधिकार", "Chedyaka, the projection"),
    (("ग्रहयुत्यधिकार",), "ग्रहयुत्यधिकार", "Conjunctions of the planets"),
    (("नक्षत्रग्रहयुत्यधिकार",), "नक्षत्रग्रहयुत्यधिकार", "Conjunctions with the nakshatras"),
    (("उदयास्ताधिकार",), "उदयास्ताधिकार", "Rising and setting"),
    (("न्नत्यधिकार",), "शृङ्गोन्नत्यधिकार", "The moon's horns"),
    (("पाताधिकार",), "पाताधिकार", "Pata, vyatipata and vaidhrti"),
    (("भूगोलाध्याय",), "भूगोलाध्याय", "Bhugola, the sphere of the earth"),
    (("ज्यौतिषोपनिषदध्याय", "ज्योतिषोपनिषदध्याय"), "ज्यौतिषोपनिषदध्याय", "Jyotishopanishad, the armillary sphere"),
    (("मानाध्याय", "सानाध्याय"), "मानाध्याय", "Mana, the measures of time"),
]
# The scan closes a verse with ॥ १ ॥, ॥ १६ ।।, or ।। १ ॥।.
_VERSE_END = re.compile(
    r"[॥।|]{1,3}\s*[०-९0-9]+\s*(?:[-–—,]{1,2}\s*[०-९0-9]+\s*)?[॥।|]{1,3}"
)
_COMMENTARY = ("इत्यर्थ", "इति भाव", "भाव:", "नन्व", "चकार:", "समास", "विग्रह", "उक्तम्", "कथित")
# Whole words. "है" inside a Sanskrit compound is not one of these.
_HINDI_WORDS = {
    "है", "हैं", "में", "किया", "किये", "लिए", "लिये", "यह", "यह", "नहीं",
    "होता", "होती", "होते", "जाता", "जाती", "जाते", "हुए", "हुई", "हुये",
    "होकर", "वाला", "वाले", "वाली", "गया", "गये", "गई", "रहे", "रहा", "रही",
    "होगा", "होंगे", "करते", "करता", "करती", "द्वारा", "कहा", "कही", "बताया",
    "बताये", "था", "थी", "थे", "और", "उस", "उसके", "इस", "इसके", "को",
}


def _verse_nums(marker: str) -> list[int]:
    folded = marker.translate(str.maketrans("०१२३४५६७८९", "0123456789"))
    return [int(piece) for piece in re.findall(r"\d+", folded)]


def _hindi_hits(text: str) -> int:
    return sum(1 for token in re.findall(r"[\u0900-\u097F]+", text) if token in _HINDI_WORDS)


def _is_hindi(text: str) -> bool:
    if any(word in text for word in ("इत्यर्थ", "इति भाव", "भाव:", "चकार")):
        return False
    hits = _hindi_hits(text)
    return hits >= 2 or (hits >= 1 and len(text) < 220)


def _verse_marker(text: str) -> bool:
    # "। ३ ।" is a list, not a verse close. A real close has ॥ or dandas on both sides.
    return "॥" in text or sum(text.count(ch) for ch in "।|") >= 4


def _sanskrit_tail(body: str) -> str | None:
    """A chapter introduction sits in front of the first shloka, in the same span."""
    parts = re.split(r"(?<=[।])\s+", body)
    tail: list[str] = []
    for part in reversed(parts):
        if not part.strip():
            continue
        if _hindi_hits(part) > 0:
            break
        tail.append(part)
    if not tail:
        return None
    text = " ".join(reversed(tail)).strip()
    if text == body.strip() or (25 <= len(text) <= 500 and "।" in text):
        return text
    return None


def _is_moola(text: str) -> bool:
    if "।" not in text or _is_hindi(text) or not 25 <= len(text) <= 340:
        return False
    return not any(word in text for word in _COMMENTARY)


def _chapter_index(line: str) -> int | None:
    # A chapter banner is a short line such as "अथ भूगोलाध्याय: - १२".
    # Commentary sentences also begin with अथ and name other chapters.
    if len(line.strip()) > 46:
        return None
    folded = only_dev(line)
    # Sandhi writes मध्यमाधिकार, so the अ of अधिकार is not in the line.
    if "धिकार" not in folded and "ध्याय" not in folded:
        return None
    found = None
    for index, (stems, _title, _en) in enumerate(SURYA_CHAPTERS):
        if any(stem in folded for stem in stems):
            found = index
    return found


def ingest_surya_siddhanta(path: Path) -> dict:
    lines = path.read_text(encoding="utf-8").splitlines()
    start = next(i for i, line in enumerate(lines) if "मध्यमाधिकार" in line and "सूर्यसिद्धान्त" in line)
    buckets: list[list[str]] = [[] for _ in SURYA_CHAPTERS]
    current = 0
    for line in lines[start:]:
        stripped = line.replace("\u200c", "").strip()
        if not stripped or dev_count(stripped) < 8:
            continue
        jumped = _chapter_index(stripped)
        if jumped is not None and jumped >= current:
            current = jumped
            continue
        if re.search(r"सूर्यसिद्धान्त\s*:", stripped) and len(stripped) < 28:
            continue
        buckets[current].append(re.sub(r"\s+", " ", stripped))

    chapters = []
    for index, (_stems, title_ne, title_en) in enumerate(SURYA_CHAPTERS):
        text = " ".join(buckets[index])
        pending: dict[int, str] = {}
        passages: list[tuple[str, str, str]] = []
        cursor = 0
        for match in _VERSE_END.finditer(text):
            if not _verse_marker(match.group()):
                continue
            body = tidy_ne(text[cursor:match.start()])
            cursor = match.end()
            numbers = _verse_nums(match.group())
            if (
                not numbers
                or numbers[0] > 100
                or not body
                or any(word in body for word in ("गूढार्थ", "गूढप्रकाश", "रड्नाथ", "रङ्गनाथ", "सम्पूर्ण"))
            ):
                continue
            tail = _sanskrit_tail(body)
            if tail and _is_moola(re.sub(r"^.{0,70}?(?:चरणम्|चरणमू|वर्णनम्|उवाच|प्रकरणम्)\s+", "", tail)):
                cleaned = re.sub(r"^.{0,70}?(?:चरणम्|चरणमू|वर्णनम्|उवाच|प्रकरणम्)\s+", "", tail)
                cleaned = re.sub(r"\s+", " ", cleaned).strip(" ।")
                for number in numbers:
                    pending.setdefault(number, cleaned)
                continue
            if _is_hindi(body):
                body = re.split(r"विशेष\s*[:：—\-]", body)[0].strip(" ।")
                words = body.split()
                while words and (
                    re.fullmatch(r"[०-९]+", words[0])
                    or (len(words[0]) <= 3 and words[0] not in _HINDI_WORDS)
                ):
                    words.pop(0)
                body = " ".join(words)
                # The first short verse with this number is the moola. Later
                # short verses with the same numbers belong to the commentary,
                # and they are dropped once the Hindi for this verse arrives.
                sanskrit = " ".join(
                    pending[number] for number in range(numbers[0], numbers[-1] + 1) if number in pending
                )
                if sanskrit:
                    pending.clear()
                    label = dev_digits(numbers[0]) if len(numbers) == 1 else f"{dev_digits(numbers[0])}–{dev_digits(numbers[-1])}"
                    # Hindi stays out of the reader until an English and a Nepali meaning exist.
                    passages.append((label, sanskrit, ""))
                continue
            if _is_moola(body):
                body = re.sub(r"^.{0,70}?(?:चरणम्|चरणमू|वर्णनम्|उवाच|प्रकरणम्)\s+", "", body)
                cleaned = re.sub(r"\s+", " ", body).strip(" ।")
                for number in numbers:
                    pending.setdefault(number, cleaned)
        for number in sorted(pending):
            passages.append((dev_digits(number), pending[number], ""))
        # A commentary verse numbered १ that leaks out after verse २० would restart the count.
        rising: list[tuple[str, str, str]] = []
        high = 0
        for label, sanskrit, meaning in passages:
            start = _verse_nums(label)
            opening = start[0] if start else 0
            if high and opening < high:
                continue
            high = max(high, opening)
            rising.append((label, sanskrit, meaning))
        passages = rising
        shlokas = []
        for verse_number, (label, sanskrit, meaning) in enumerate(passages, 1):
            if dev_count(sanskrit) < 12:
                continue
            shlokas.append(shloka(verse_number, label, sanskrit, meaning or None))
        if shlokas:
            chapters.append({
                "number": index + 1,
                "title_ne": title_ne,
                "title_en": title_en,
                "shlokas": shlokas,
            })

    paired = sum(1 for ch in chapters for row in ch["shlokas"] if row["meaning_ne"])
    total = sum(len(ch["shlokas"]) for ch in chapters)
    print(f"  paired {paired} of {total}")
    return {
        "slug": "surya-siddhanta",
        "order_index": 113,
        "category": "shastra",
        "subcategory": "ganita",
        "title_sa": "सूर्यसिद्धान्तः",
        "title_ne": "सूर्यसिद्धान्त",
        "title_en": "Surya Siddhanta",
        "subtitle_ne": f"{len(chapters)} अध्याय",
        "subtitle_en": f"{len(chapters)} chapters",
        "description_ne": "सूर्यसिद्धान्तका मूल श्लोक। हिन्दी अर्थ देखाइँदैन।",
        "description_en": "The root verses of the Surya Siddhanta. The Hindi gloss is not shown.",
        "source_ne": "प्रो. रामचन्द्र पाण्डेय, चौखम्बा सुरभारती, वाराणसी",
        "source_en": "Prof. Ramchandra Pandey, Chowkhamba Surabharati, Varanasi",
        "cover_image": "",
        "has_chapters": True,
        "inline_chapters": False,
        "chapters": chapters,
    }


def main() -> None:
    root = Path(sys.argv[1]) if len(sys.argv) > 1 else SOURCE
    write(ingest_swasthani(root / "Swasthani Brata Katha.txt"))
    write(ingest_harishchandra(root / "satya-harish.txt"))
    write(ingest_chanakya(root / "chanakya.txt"))
    pandey = next(root.glob("Surya Siddhanta - Prof. Ram Chandra Pandey*"))
    write(ingest_surya_siddhanta(pandey))


if __name__ == "__main__":
    main()
