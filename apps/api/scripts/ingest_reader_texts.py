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


_SW_COLOPHON = re.compile(r"स्क.{0,4}प.{0,2}राण|के[दव]{1,2}ा?रखण्ड")
_SW_OPENING = re.compile(r"कुमार.{0,8}आ.{0,2}[ज्ञञश][्ञ]?.{0,2}\s*गर्नुहुन्छ|कुमार.{0,6}भन्नुहुन्छ")
# Page-margin ornaments the scan read as characters, at the start and end of almost every line.
_SW_JUNK = re.compile(r"^(?:[&»«“”'\"()\[\]{}|/.,:;_%€£\-0-9०-९]+|[क-ह]\)|\([0-9०-९]+)$")
_SW_TAIL_JUNK = {"टु", "हँ", "हु", "छुँ", "€ँ", "॥ँ", "&ँ", "ढँ", "डु", "ॅ", "&€", "€&"}


def _swasthani_line(line: str) -> str:
    words = line.replace("\u200c", "").split()
    while words and (_SW_JUNK.match(words[0]) or words[0] in {"छ)", "क)", "5)", "&)", "0)", "6)", "७)", "८)"}):
        words.pop(0)
    while words and (_SW_JUNK.match(words[-1].rstrip(",")) or words[-1] in _SW_TAIL_JUNK) and words[-1] not in {"।", "॥", "?", "!"}:
        words.pop()
    return " ".join(words)


def _sw_readable(line: str) -> bool:
    """Scan noise ("हि क बन्दि कलरको कक तत त कक") is mostly one- and two-letter fragments."""
    words = [w for w in line.split() if re.search(r"[\u0900-\u097F]", w)]
    if not words:
        return False
    tiny = sum(1 for w in words if dev_count(w) <= 2)
    return tiny <= len(words) * 0.45 and any(dev_count(w) >= 4 for w in words)


def _swasthani_ends(lines: list[str]) -> list[int]:
    """The colophon line that closes each of the 31 chapters ("इति श्रीस्कन्दपुराणे ... ॥N॥").
    A colophon the scan lost is placed just before the next chapter's opening words."""
    found: list[tuple[int, int | None]] = []
    for i, line in enumerate(lines):
        if _SW_COLOPHON.search(line):
            text = " ".join(x.strip() for x in lines[i:i + 3])
            m = re.search(r"ध्या.{0,8}?[।|1/]+\s*([०-९0-9](?:\s?[०-९0-9])?)\s*[।|॥1/]", text) or re.search(r"[।|1]{2}\s*([०-९](?:\s?[०-९])?)\s*[।॥|1]", text)
            found.append((i, int(re.sub(r"\s", "", m.group(1)).translate(DEV_DIGITS)) if m else None))
    ends: dict[int, int] = {}
    last, at = 0, -999
    for i, n in found:
        if i - at < 150:
            continue  # pieces of one colophon scattered over a jumbled page
        # the next chapter, unless the colophon's own number shows that some were lost;
        # a number lower than expected is a misread (18 read as 14)
        n = n if n is not None and n > last + 1 and n <= 31 else last + 1
        ends[n] = i
        last, at = n, i
    for n in range(1, 32):
        if n not in ends:
            nxt = ends.get(n + 1)
            prev = ends.get(n - 1, 0)
            openings = [i for i in range(prev + 3, nxt or len(lines)) if _SW_OPENING.search(lines[i])]
            # the next chapter opens at the last "कुमारजी आज्ञा गर्नुहुन्छ" before its own colophon's chapter
            if nxt and openings:
                heads = [i for i in openings if i < nxt]
                # the chapter after it reads from end + 3, the colophon's usual depth
                ends[n] = (heads[-1] if len(heads) > 1 else heads[0]) - 3
    return [ends[n] for n in range(1, 32)]


def ingest_swasthani(path: Path) -> dict:
    lines = path.read_text(encoding="utf-8").splitlines()
    ends = _swasthani_ends(lines)
    # The book opens with five Sanskrit verses of praise; the katha starts after the fifth.
    start = next(i for i, l in enumerate(lines) if re.search(r"॥\s*५\s*॥|।।\s*५\s*।।", l)) + 1
    chapters = []
    for index, (title_ne, title_en, _stems) in enumerate(reversed(SWASTHANI_STORIES)):
        lo = start if index == 0 else ends[index - 1] + 3
        hi = ends[index]
        # A chapter opens on an illustrated page: captions and scan noise sit above the
        # opening words ("कुमारजी आज्ञा गर्नुहुन्छ"), so the text starts there when it is near.
        opening = next((i for i in range(lo, min(hi, lo + 90)) if _SW_OPENING.search(lines[i])), None)
        if opening is not None and index > 0:
            # only when what sits above is captions and noise, not the chapter's own question
            above = [l for l in lines[lo:opening] if "।" in l and _sw_readable(_swasthani_line(l))]
            if len(above) <= 2:
                lo = opening
        kept: list[str] = []
        in_text = False
        for raw in lines[lo:hi]:
            # captions under the opening illustration: short lines before the first sentence
            if not in_text:
                if "।" in raw and _sw_readable(_swasthani_line(raw)):
                    in_text = True
                elif len(_swasthani_line(raw).split()) <= 5:
                    continue
            if (
                _SW_COLOPHON.search(raw)
                or not keep_swasthani(raw)
                or ("नाम" in raw and "ध्याय" in raw)
                or re.search(r"संवादे|माहात्म्ये|माहात्ये|स्वस्थानी\s*-?\s*व्रतक|(.)\1{3,}|[।|]{4,}", raw)
            ):
                continue
            line = _swasthani_line(raw)
            if dev_count(line) < 10 or not _sw_readable(line):
                continue
            # a word broken over the line end ("जन्म-" / "मरण")
            if kept and kept[-1].endswith("-"):
                kept[-1] = kept[-1] + line
            else:
                kept.append(line)
        texts = [text for text in paragraphs(tidy_ne(" ".join(kept))) if readable_ne(text)]
        chapters.append(chapter(index + 1, title_ne, title_en, texts))
    print(f"  swasthani: {len(chapters)} chapters, {sum(len(c['shlokas']) for c in chapters)} paragraphs")

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


# ---------------------------------------------------------------- Chanakya Niti Darpan
#
# Each verse in the Nepali edition is: a question heading, the Sanskrit verse closed ॥N॥, a
# Nepali verse rendering closed ॥, and the prose meaning closed ॥N॥. Seventeen chapters end at
# "इति ... ऽध्यायः समाप्तम्"; after the seventeenth come Buddhichanak's Nepali verses and the
# indexes, which are not part of the text. Sanskrit Wikisource's चाणक्यनीतिः (chapters 1-15) gives
# the clean Sanskrit: a matched verse takes it, and a verse missing from the scan (pages lost in
# scanning) is filled from it.

WIKISOURCE_CHANAKYA = "https://sa.wikisource.org/w/index.php?title=%E0%A4%9A%E0%A4%BE%E0%A4%A3%E0%A4%95%E0%A5%8D%E0%A4%AF%E0%A4%A8%E0%A5%80%E0%A4%A4%E0%A4%BF%E0%A4%83&action=raw"
CHANAKYA_CACHE = Path(__file__).resolve().parents[1] / "data" / "vedcom_source" / "chanakya_wikisource.txt"
DEV_DIGITS = str.maketrans("०१२३४५६७८९", "0123456789")
_CK_HEADER = re.compile(r"नेपाली\s*'?भाषामा|नीति.{0,3}दर्प|चाणक्.{0,3}नीति|तीतिदर्|^\s*[०-९0-9\s.,]{1,6}$")
_CK_FOOT = re.compile(r"^\s*[१-९][.,]\s")
_CK_MARK = re.compile(r"[।॥|]\s*([०-९](?:\s?[०-९]){0,2})\s*(?:[।॥|][।॥|1\[\]]*|11)\s*$|\s([०-९](?:\s?[०-९])?)\s*11\s*$")
_NE_WORDS = {"छ", "छन्", "हो", "र", "के", "कस्तो", "कस्ता", "कहाँ", "पनि", "त्यो", "यो", "जो", "सधैं", "हुन्", "त", "भो", "भयो", "नै", "यी", "ती", "जस्तो", "सबै", "नि", "झैं", "जस्तै", "कि", "भन्ने", "गरौं", "हउन्", "छैन", "छैनन्"}
_NE_ENDINGS = ("छ", "छन्", "न्छ", "न्छन्", "र्छ", "र्छन्", "नु", "नू", "लाई", "हरू", "हरूको", "को", "का", "की", "मा", "ले", "बाट", "सँग", "दैन", "दछ", "दछन्", "भन्दा", "पर्छ", "पर्दछ", "एको", "एका", "यो", "छौं", "नुहोस्", "गर", "नुपर्छ")
_SA_ENDINGS = ("म्", "ः", "ं", "मु", "त्", "द्", "न्ति", "न्ते", "स्य", "आम्", "ानाम्")


def dev_digits(number: int) -> str:
    return str(number).translate(str.maketrans("0123456789", "०१२३४५६७८९"))


def _words(line: str) -> list[str]:
    return re.findall(r"[ऀ-ॿ]+", line)


def _is_nepali(line: str) -> bool:
    words = _words(line)
    if not words or line.rstrip(" ।॥|").endswith(("?", ":")):
        return True
    ne = sum(1 for w in words if w in _NE_WORDS or (len(w) > 2 and w.endswith(_NE_ENDINGS)))
    sa = sum(1 for w in words if w.endswith(_SA_ENDINGS))
    return ne - sa >= 2 or (ne - sa >= 1 and len(words) <= 5)


def _heading(line: str) -> bool:
    return line.rstrip().endswith((":", "?")) and len(line) < 70


def _close(line: str) -> tuple[int, str] | None:
    m = _CK_MARK.search(line)
    if not m:
        return None
    return int(re.sub(r"\s", "", m.group(1) or m.group(2)).translate(DEV_DIGITS)), line[:m.start()].rstrip(" ।॥|")


def _trigrams(text: str) -> set[str]:
    flat = re.sub(r"[^अ-ह]", "", text)
    return {flat[i:i + 3] for i in range(len(flat) - 2)}


def _chanakya_lines(lines: list[str]) -> list[str]:
    """Page headers and footnotes out. A footnote ("१. ...") is a few lines of quotation or remark."""
    out: list[str] = []
    skip = 0
    for raw in lines:
        line = raw.replace("‌", "").strip()
        if not line:
            continue
        if _CK_HEADER.search(line) and len(line) < 75:
            skip = 0
            continue
        if _CK_FOOT.match(line) and len(line) < 200:
            skip = 4
            continue
        if skip:
            skip -= 1
            if not _heading(line):
                continue
            skip = 0
        out.append(line)
    return out


def _wikisource_chanakya() -> list[list[str]]:
    if not CHANAKYA_CACHE.exists():
        import urllib.request

        request = urllib.request.Request(WIKISOURCE_CHANAKYA, headers={"User-Agent": "doc-reader/1.0"})
        with urllib.request.urlopen(request, timeout=60) as response:
            CHANAKYA_CACHE.parent.mkdir(parents=True, exist_ok=True)
            CHANAKYA_CACHE.write_bytes(response.read())
    parts = re.split(r"==([^=]+)==", CHANAKYA_CACHE.read_text(encoding="utf-8"))
    chapters = []
    for i in range(1, len(parts), 2):
        verses = []
        for body in re.split(r"॥\s*[०-९]+\s*॥", parts[i + 1]):
            lines = [re.sub(r"\s+", " ", l).strip(" ।") for l in re.split(r"<br\s*/?>|\n", body)]
            lines = [l for l in lines if re.search(r"[ऀ-ॿ]", l)]
            if lines:
                verses.append(" ।\n".join(lines))
        chapters.append(verses)
    return chapters


def _ocr_sanskrit(text: str) -> str:
    text = text.replace("5", "ऽ").replace("$", "ऽ").replace("॑", "").replace("॒", "")
    text = re.sub(r"[^\u0900-\u097F\s।॥ऽ\-]", "", text)
    text = re.sub(r"[\"'“”‘’]", "", text)
    text = re.sub(r"\s*[।|]\s*$", "", text, flags=re.M)
    return re.sub(r"[ \t]+", " ", text).strip()


def _tidy_meaning(text: str) -> str:
    text = re.sub(r"[।॥|]{2,}", "॥", text)
    text = re.sub(r"[\"“”‘’]|(?<=\S)'", "", text)
    return re.sub(r"[ \t]+", " ", text).strip(" ।॥|")


def _before_close(text: str) -> str:
    """The prose ends at its ॥N॥, wherever the scan put it; a footnote or page header after it goes."""
    m = re.search(r"[।॥|!]+\s*[०-९]{1,2}\s*[।॥|1!)\]]+|\s[०-९]{1,2}\s*[।॥|][।॥|1!)\]]*", text)
    return text[:m.start()] if m and m.start() > 20 else text


# Pages the scan jumbled, put right by hand: the first words of the verse → its meaning and
# rendering. Keys are the verse's opening; a None rendering keeps the one parsed.
CHANAKYA_FIXES: dict[str, dict] = {
    "एकेनापि सुवृक्षेण": {
        "meaning": "सत्पुत्रबाट लाभ\nएउटा मात्र पनि राम्रो वृक्षबाट, जसमा सुन्दर फूल र गन्ध छ, पूरा वन सुवासित हुन्छ, जस्तै सुपुत्रले कुल।",
        "padya": "सुगन्ध वृक्ष यौटैले वनै सुगन्ध पार्दछ ।\nसत्पुत्र छ त यौटैले कुलै मान बढाउँछ ॥",
    },
    "एकेनापि सुपुत्रेण": {
        "meaning": "विद्यायुक्त एउटा मात्र सुपुत्रले सबै कुल आनन्दित हुन्छ, जस्तै चन्द्रमाले रात्रि।",
        "padya": None,
    },
    "एकोऽपि गुणवान्": {
        "sanskrit": "एकोऽपि गुणवान् पुत्रो निर्गुणैश्च शतैरपि ।\nएकश्चन्द्रस्तमो हन्ति न च ताराः सहस्रशः",
        "meaning": "धेरै कुपुत्रको के काम ?\nगुणवान् एउटै पुत्र सय निर्गुण पुत्रभन्दा श्रेष्ठ छ; एउटै चन्द्रमाले अँध्यारो हटाउँछ, हजारौं ताराले हटाउन सक्दैनन्।",
        "padya": None,
    },
    "एकोदरसमुदभूता": {
        "sanskrit": "एकोदरसमुद्भूता एकनक्षत्रजातकाः ।\nन भवन्ति समाः शीले यथा बदरकण्टकाः",
        "meaning": None,
        "padya": None,
    },
    "वित्तंदेहि": {
        "sanskrit": "वित्तं देहि गुणान्वितेषु मतिमन् नान्यत्र देहि क्वचित्\nप्राप्तं वारिनिधेर्जलं घनमुचां माधुर्ययुक्तं सदा ।\nजीवान् स्थावरजङ्गमांश्च सकलान् संजीव्य भूमण्डलं\nभूयः पश्यत देवकोटिगुणितं गच्छेत्तमम्भोनिधिम्",
        "meaning": "दान सत्पात्रलाई गरौं\nहे बुद्धिमान्! गुणवान्हरूलाई धन देऊ, अरूलाई कहिल्यै नदेऊ। समुद्रबाट मेघलाई प्राप्त भएको जल सधैं मीठो हुन्छ, र पृथ्वीका सबै चर-अचर जीवलाई जिलाएर त्यही जल करोडौं गुणा भएर फेरि समुद्रमै पुग्छ।",
        "padya": "देऊ दान सुपात्रलाई समझी सत्पुण्य मिल्छन् तब ।\nहुन्नन् धर्म कुपात्रमा धन दिई यो बात हो वास्तव ॥\nपुग्छन् मेघ समुद्रबाट जल त्यो स्वच्छै भई झर्दछन्\nसिञ्चित् पारि चराचरै जलनिधी पौँचेर ती मिल्दछन् ॥",
    },
    "न्च्न": {"drop": True},
    "काकः पक्षिषु चाण्डालः": {
        "meaning": "चाण्डाल कुन कुन हुन् ?\nपक्षीमा काग, पशुमा कुकुर, मुनिहरूमा पाप र सबैमा निन्दा गर्ने मानिस चाण्डाल हो।",
        "padya": None,
    },
    "एकेन शुष्कवृक्षेण": {
        "meaning": "मूर्ख पुत्रबाट हानि\nएउटा सुकेको वृक्ष आगोले दन्किँदा सारा वन जल्छ, जस्तै कुपुत्रले कुल।",
        "padya": None,
    },
}


def _chanakya_verses(lines: list[str], web: list[str]) -> list[dict]:
    web_grams = [_trigrams(v) for v in web]
    groups: list[tuple[int, int]] = []
    k = 0
    while k < len(lines):
        if _is_nepali(lines[k]) or _heading(lines[k]):
            k += 1
            continue
        j = k
        while j + 1 < len(lines) and j - k < 3 and not _is_nepali(lines[j + 1]) and not _close(lines[j]):
            j += 1
        run = " ".join(lines[k:j + 1])
        grams = _trigrams(run)
        match = max((len(grams & w) / max(1, len(grams)) for w in web_grams), default=0)
        closes = bool(_close(lines[j])) or re.search(r"(॥|।।|\|\||[०-९]\s*[।॥|1!\]]*)\s*$", lines[j]) is not None
        last = groups[-1][1] if groups else -9
        right_after = k - last <= 1 or (k - last <= 5 and all(not _is_nepali(x) or len(_words(x)) < 4 for x in lines[last + 1:k]))
        if j > k and len(_words(run)) >= 8 and (match >= 0.5 or (closes and match >= 0.45) or (_close(lines[j]) and not right_after)):
            groups.append((k, j))
            k = j + 1
        else:
            k += 1
    verses = []
    for gi, (k, j) in enumerate(groups):
        end = groups[gi + 1][0] if gi + 1 < len(groups) else len(lines)
        sanskrit = [(_close(l) or (0, l))[1] for l in lines[k:j + 1]]
        rest = lines[j + 1:end]
        next_heading = rest.pop() if rest and _heading(rest[-1]) else None
        # The Nepali rendering: up to the first line closed with a bare ॥ (at most four lines),
        # else as many lines as the verse has, then any bracketed extra stanza.
        bare = re.compile(r"(॥|।।|\|\|)[।॥|!]*\s*$")
        n_pad = next((i + 1 for i, l in enumerate(rest[:4]) if bare.search(l) and not _close(l)), min(len(sanskrit), 4))
        if n_pad < len(rest) and rest[n_pad].lstrip().startswith("("):
            close = next((i for i in range(n_pad, min(len(rest), n_pad + 8)) if ")" in rest[i]), None)
            if close is not None:
                n_pad = close + 1
        padya_lines, prose_lines = rest[:n_pad], rest[n_pad:]
        # The prose ends at its own ॥N॥; an editor's stanza after it is not the meaning.
        end_at = next((i for i, l in enumerate(prose_lines) if _close(l)), None)
        if end_at is not None:
            prose_lines = prose_lines[:end_at] + [_close(prose_lines[end_at])[1]]
        padya = "\n".join(padya_lines)
        prose = "\n".join(prose_lines)
        prose_lines = prose.strip().splitlines()
        verses.append({
            "sanskrit": _ocr_sanskrit("\n".join(sanskrit)),
            "padya": "\n".join(_tidy_meaning(l) for l in padya.strip().splitlines() if l.strip()),
            "prose": _tidy_meaning(_before_close(" ".join(prose_lines))),
            "next_heading": next_heading,
        })
    heading = None
    for verse in verses:
        verse["heading"], heading = heading, verse.pop("next_heading")
        if verse["heading"]:
            verse["heading"] = verse["heading"].strip(" -_\"'").rstrip(":").strip()
    return verses


def _with_wikisource(verses: list[dict], web: list[str]) -> tuple[list[dict], int, int]:
    """Matched verses take the clean Sanskrit; verses lost from the scan come from Wikisource."""
    if not web:
        return verses, 0, 0
    web_grams = [_trigrams(v) for v in web]
    taken: dict[int, tuple[float, int]] = {}
    for i, verse in enumerate(verses):
        grams = _trigrams(verse["sanskrit"])
        scores = [len(grams & w) / max(1, len(w)) for w in web_grams]
        best = max(range(len(web)), key=lambda q: scores[q])
        if scores[best] >= 0.45 and (best not in taken or taken[best][0] < scores[best]):
            taken[best] = (scores[best], i)
    # A second, looser pass pairs what is left: a badly scanned verse, or a variant reading.
    left = [i for i in range(len(verses)) if i not in {i for _s, i in taken.values()}]
    pairs = []
    for i in left:
        grams = _trigrams(verses[i]["sanskrit"])
        for w in range(len(web)):
            if w not in taken:
                score = len(grams & web_grams[w]) / max(1, min(len(grams), len(web_grams[w])))
                if score >= 0.33:
                    pairs.append((score, i, w))
    used: set[int] = set()
    for score, i, w in sorted(pairs, reverse=True):
        if i not in used and w not in taken:
            taken[w] = (score, i)
            used.add(i)
    by_verse = {i: w for w, (_s, i) in taken.items()}
    out: list[dict] = []
    placed: set[int] = set()
    for i, verse in enumerate(verses):
        w = by_verse.get(i)
        if w is not None:
            # web verses before this one that the scan lost
            for missing in range(w):
                if missing not in taken and missing not in placed and all(missing > p for p in placed):
                    out.append({"sanskrit": web[missing], "padya": "", "prose": "", "heading": None})
                    placed.add(missing)
            # Only a close match takes the web text: two verses can share most of their words
            # (the fragrant tree and the dry tree of 3.14-15), and a loose match would put one
            # verse's Sanskrit over the other's meaning.
            grams = _trigrams(verse["sanskrit"])
            rival = max((len(grams & web_grams[q]) / max(1, len(web_grams[q])) for q in range(len(web)) if q != w), default=0)
            if taken[w][0] >= 0.6 or (taken[w][0] >= 0.4 and taken[w][0] - rival >= 0.2):
                verse = {**verse, "sanskrit": web[w]}
            placed.add(w)
        out.append(verse)
    for missing in range(len(web)):
        if missing not in taken and missing not in placed and all(missing > p for p in placed):
            out.append({"sanskrit": web[missing], "padya": "", "prose": "", "heading": None})
            placed.add(missing)
    return out, len(taken), len(out) - len(verses)


def ingest_chanakya(path: Path) -> dict:
    lines = path.read_text(encoding="utf-8").splitlines()
    ends = [i for i, l in enumerate(lines) if re.search(r"इति.{0,12}ध्याय", l) and re.search(r"स[यप]ाप|समाप", l)][:17]
    start = next(i for i, l in enumerate(lines) if "ग्रन्यारम्म" in l or "ग्रन्थारम्भ" in l)
    web = _wikisource_chanakya()
    bounds = [start] + ends
    chapters = []
    matched = filled = 0
    for c in range(17):
        web_c = web[c] if c < len(web) else []
        verses = _chanakya_verses(_chanakya_lines(lines[bounds[c] + 1:bounds[c + 1]]), web_c)
        # A page break can split one verse into two cards (8.5): join a card that repeats the last.
        joined: list[dict] = []
        for verse in verses:
            if joined and len(_trigrams(verse["sanskrit"]) & _trigrams(joined[-1]["sanskrit"])) >= 0.5 * max(1, len(_trigrams(verse["sanskrit"]))):
                last = joined[-1]
                last["padya"] = "\n".join(x for x in (last["padya"], verse["padya"]) if x)
                last["prose"] = max(last["prose"], verse["prose"], key=len)
                continue
            joined.append(verse)
        verses, m, f = _with_wikisource(joined, web_c)
        fixed: list[dict] = []
        for verse in verses:
            flat = verse["sanskrit"].replace("\n", " ")
            fix = next((v for k, v in CHANAKYA_FIXES.items() if flat.startswith(k)), None)
            if fix and fix.get("drop"):
                continue
            if fix:
                verse["sanskrit"] = fix.get("sanskrit") or verse["sanskrit"]
                if fix.get("meaning"):
                    verse["heading"], verse["prose"] = None, fix["meaning"]
                if fix.get("padya"):
                    verse["padya"] = fix["padya"]
            fixed.append(verse)
        verses = fixed
        matched += m
        filled += f
        shlokas = []
        for n, verse in enumerate(verses, 1):
            meaning = "\n".join(x for x in (verse["heading"], verse["prose"]) if x) or None
            item = shloka(n, dev_digits(n), verse["sanskrit"], meaning)
            if verse["padya"]:
                item["commentaries"] = [{"key": "padya", "ne": verse["padya"], "en": None}]
            shlokas.append(item)
        label = dev_digits(c + 1)
        chapters.append({"number": c + 1, "title_ne": f"अध्याय {label}", "title_en": f"Chapter {c + 1}", "shlokas": shlokas})
    total = sum(len(ch["shlokas"]) for ch in chapters)
    print(f"  chanakya: {total} verses, {matched} matched to Wikisource, {filled} filled from it")
    return {
        "slug": "chanakya-niti-darpan",
        "order_index": 111,
        "category": "shastra",
        "subcategory": "dharmashastra",
        "title_sa": "चाणक्यनीतिदर्पणः",
        "title_ne": "चाणक्य नीति दर्पण",
        "title_en": "Chanakya Niti Darpan",
        "subtitle_ne": f"१७ अध्याय · {dev_digits(total)} श्लोक",
        "subtitle_en": f"17 chapters · {total} verses",
        "description_ne": "चाणक्य नीति दर्पणका १७ अध्याय। हरेक श्लोकमुनि विषय, गद्य अर्थ र नेपाली पद्यानुवाद। अध्याय १–१५ को संस्कृत पाठ संस्कृत विकिस्रोतसँग मिलाइएको छ, र स्क्यानमा छुटेका श्लोक त्यहीँबाट थपिएका छन्।",
        "description_en": "The 17 chapters of the Chanakya Niti Darpan. Under each verse: its topic, the meaning in Nepali prose and a Nepali verse rendering. The Sanskrit of chapters 1-15 follows Sanskrit Wikisource, which also supplies verses missing from the scan.",
        "source_ne": "चाणक्यनीतिदर्पण, नेपाली भाषामा श्लोक र अर्थ सहित · संस्कृत विकिस्रोत",
        "source_en": "Chanakya Niti Darpan with Nepali verse and meaning; Sanskrit Wikisource",
        "cover_image": "",
        "has_chapters": True,
        "inline_chapters": False,
        "chapters": chapters,
    }


HARISH_MARKER = re.compile(r"^[\(\[]\s*[०-९0-9]+\s*[\)\]]\.?\s*$")
HARISH_TITLE = re.compile(r"सत्य\s*[-–]?\s*हरिश्च")


def ingest_harishchandra(path: Path) -> dict:
    """Motiram Bhatta's 179 stanzas. Each opens with its number in brackets; a few numbers are
    misread in the scan ("(२)" for 3, "(६७७)" for 177), so stanzas are counted, not read, and a
    card that caught two four-line stanzas is split."""
    stanzas: list[list[str]] = []
    buf: list[str] = []
    started = False

    def flush() -> None:
        # A section title inside the poem ("रानीको विलाप") is printed over the next stanza.
        lines = [
            l for l in buf
            if dev_count(l) >= 6
            and not (len(l) < 40 and "विलाप" in l and not re.search(r"[।॥]", l))
            # a page header ("१२ सत्य - हरिश्चन्द्र कथा") or a footnote ("(१) अजीगर्त ...")
            and not (len(l) < 45 and "सत्य" in l and "कथा" in l)
            and not re.match(r"^\(?[०-९0-9]+\)?\s", l)
        ]
        buf.clear()
        if not lines:
            return
        # two stanzas under one number: split into fours
        if len(lines) >= 7:
            for i in range(0, len(lines), 4):
                if lines[i:i + 4]:
                    stanzas.append(lines[i:i + 4])
        else:
            stanzas.append(lines)

    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if HARISH_MARKER.match(stripped):
            if started:
                flush()
            started = True
            continue
        if HARISH_TITLE.search(stripped) and len(stripped) < 40:
            continue
        if re.search(r"इति\s*श्री\s*सत्य", stripped):
            break
        if not started or dev_count(stripped) < 6:
            continue
        text = re.sub(r"[।|]*॥[।|॥]*", "॥", stripped)
        text = re.sub(r"^[_\-.\s]+|\s+\.\s+", " ", text)
        text = re.sub(r"\s+", " ", text).strip()
        buf.append(text)
    flush()
    verses = ["\n".join(lines) for lines in stanzas]
    print(f"  harishchandra: {len(verses)} stanzas")

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
                "shlokas": [shloka(i, dev_digits(i), text) for i, text in enumerate(verses, 1)],
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
    # The Surya Siddhanta is built by scripts/surya_commentary.py (verses, four commentaries,
    # workings); its older ingest below is kept only for reference and is not written.


if __name__ == "__main__":
    main()
