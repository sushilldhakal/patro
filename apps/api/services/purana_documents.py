"""Seed the Purana library from the CSV dataset next to this API.

The verse text stays on the server (`calender-patro/purana/*.csv`, or
`PURANA_SOURCE_DIR`). Documents are inserted into `documents.db` alongside the
hand-authored JSON manifests; the app only receives them through
`/v1/documents`.
"""

from __future__ import annotations

import csv
import os
import re
import sqlite3
import sys
from dataclasses import dataclass
from pathlib import Path

csv.field_size_limit(sys.maxsize)

# Bump when the mapping below changes so an unchanged CSV still reseeds.
PURANA_IMPORT_VERSION = b"purana-csv-5"

_DEVANAGARI_DIGITS = str.maketrans("0123456789", "०१२३४५६७८९")


@dataclass(frozen=True)
class PuranaSpec:
    filename: str
    slug: str
    order_index: int
    subcategory: str
    title_sa: str
    title_ne: str
    title_en: str
    description_ne: str
    description_en: str
    group_cols: tuple[str, ...]
    title_parts: tuple[tuple[str, str, str], ...]
    subverse_col: str | None = None


PURANAS: tuple[PuranaSpec, ...] = (
    PuranaSpec(
        "Brahmapurana_cleaned_with_devanagari.csv",
        "brahma-purana",
        30,
        "adi",
        "ब्रह्मपुराणम्",
        "ब्रह्मपुराण",
        "Brahma Purana",
        "ब्रह्मपुराणको संस्कृत पाठ — अध्यायअनुसार।",
        "Sanskrit text of the Brahma Purana, by chapter.",
        ("Chapter",),
        (("Chapter", "अध्याय", "Chapter"),),
    ),
    PuranaSpec(
        "Vishnupurana_cleaned_with_devanagari.csv",
        "vishnu-purana",
        31,
        "vishnu",
        "विष्णुपुराणम्",
        "विष्णुपुराण",
        "Vishnu Purana",
        "विष्णुपुराणको उपलब्ध संस्कृत पाठ — अंश र अध्यायअनुसार।",
        "Available Sanskrit text of the Vishnu Purana, by book and chapter.",
        ("Book", "Chapter"),
        (("Book", "अंश", "Book"), ("Chapter", "अध्याय", "Chapter")),
        subverse_col="Subverse",
    ),
    PuranaSpec(
        "Sivapurana_books_1_7_cleaned_with_devanagari.csv",
        "shiva-purana",
        32,
        "shiva",
        "शिवपुराणम्",
        "शिवपुराण",
        "Shiva Purana",
        "शिवपुराणको उपलब्ध संस्कृत पाठ — संहिता र अध्यायअनुसार।",
        "Available Sanskrit text of the Shiva Purana, by samhita and chapter.",
        ("Book", "Chapter"),
        (("Book", "संहिता", "Samhita"), ("Chapter", "अध्याय", "Chapter")),
    ),
    PuranaSpec(
        "Bhagavatam_cleaned_with_devanagari.csv",
        "bhagavata-purana",
        33,
        "bhagavata",
        "श्रीमद्भागवतपुराणम्",
        "श्रीमद्भागवतपुराण",
        "Bhagavata Purana",
        "श्रीमद्भागवतको संस्कृत पाठ — स्कन्ध र अध्यायअनुसार।",
        "Sanskrit text of the Bhagavata Purana, by skandha and chapter.",
        ("Skandha", "Chapter"),
        (("Skandha", "स्कन्ध", "Skandha"), ("Chapter", "अध्याय", "Chapter")),
    ),
    PuranaSpec(
        "Naradapurana_cleaned_with_devanagari.csv",
        "narada-purana",
        34,
        "adi",
        "नारदपुराणम्",
        "नारदपुराण",
        "Narada Purana",
        "नारदपुराणको संस्कृत पाठ — खण्ड र अध्यायअनुसार।",
        "Sanskrit text of the Narada Purana, by khanda and chapter.",
        ("Khanda", "Chapter"),
        (("Khanda", "खण्ड", "Khanda"), ("Chapter", "अध्याय", "Chapter")),
    ),
    PuranaSpec(
        "Markandeyapurana_cleaned_with_devanagari.csv",
        "markandeya-purana",
        35,
        "markandeya",
        "मार्कण्डेयपुराणम्",
        "मार्कण्डेयपुराण",
        "Markandeya Purana",
        "मार्कण्डेयपुराणको संस्कृत पाठ — अध्यायअनुसार।",
        "Sanskrit text of the Markandeya Purana, by chapter.",
        ("Section", "Chapter"),
        (("Chapter", "अध्याय", "Chapter"),),
    ),
    PuranaSpec(
        "Agnipurana_cleaned_with_devanagari.csv",
        "agni-purana",
        36,
        "adi",
        "अग्निपुराणम्",
        "अग्निपुराण",
        "Agni Purana",
        "अग्निपुराणको संस्कृत पाठ — अध्यायअनुसार।",
        "Sanskrit text of the Agni Purana, by chapter.",
        ("Chapter",),
        (("Chapter", "अध्याय", "Chapter"),),
    ),
    PuranaSpec(
        "Skandapurana_Revakanda_cleaned_with_devanagari.csv",
        "skanda-purana",
        37,
        "skanda",
        "स्कन्दपुराणम्",
        "स्कन्दपुराण (रेवाखण्ड)",
        "Skanda Purana (Reva Khanda)",
        "स्कन्दपुराणको रेवाखण्ड — संस्कृत पाठ, अध्यायअनुसार।",
        "Sanskrit text of the Reva Khanda of the Skanda Purana, by chapter.",
        ("Chapter",),
        (("Chapter", "अध्याय", "Chapter"),),
    ),
    PuranaSpec(
        "Vamanapurana_Saromahatmya_cleaned_with_devanagari.csv",
        "vamana-purana",
        38,
        "adi",
        "वामनपुराणम्",
        "वामनपुराण (सरोमाहात्म्य)",
        "Vamana Purana (Saromahatmya)",
        "वामनपुराणको सरोमाहात्म्य — संस्कृत पाठ, अध्यायअनुसार।",
        "Sanskrit text of the Saromahatmya of the Vamana Purana, by chapter.",
        ("Chapter",),
        (("Chapter", "अध्याय", "Chapter"),),
    ),
    PuranaSpec(
        "Kurmapurana_cleaned_with_devanagari.csv",
        "kurma-purana",
        39,
        "adi",
        "कूर्मपुराणम्",
        "कूर्मपुराण",
        "Kurma Purana",
        "कूर्मपुराणको संस्कृत पाठ — विभाग र अध्यायअनुसार।",
        "Sanskrit text of the Kurma Purana, by part and chapter.",
        ("Vibhaga", "Section", "Chapter"),
        (("Vibhaga", "विभाग", "Part"), ("Chapter", "अध्याय", "Chapter")),
    ),
    PuranaSpec(
        "Matsyapurana_cleaned_with_devanagari.csv",
        "matsya-purana",
        40,
        "adi",
        "मत्स्यपुराणम्",
        "मत्स्यपुराण",
        "Matsya Purana",
        "मत्स्यपुराणको संस्कृत पाठ — अध्यायअनुसार।",
        "Sanskrit text of the Matsya Purana, by chapter.",
        ("Section", "Chapter"),
        (("Chapter", "अध्याय", "Chapter"),),
    ),
    PuranaSpec(
        "Garudapurana_cleaned_with_devanagari.csv",
        "garuda-purana",
        41,
        "garuda",
        "गरुडपुराणम्",
        "गरुडपुराण",
        "Garuda Purana",
        "गरुडपुराणको संस्कृत पाठ — खण्ड र अध्यायअनुसार।",
        "Sanskrit text of the Garuda Purana, by khanda and chapter.",
        ("Section", "Khanda", "Chapter"),
        (("Khanda", "खण्ड", "Khanda"), ("Chapter", "अध्याय", "Chapter")),
    ),
    PuranaSpec(
        "Brahmandapurana_cleaned_with_devanagari.csv",
        "brahmanda-purana",
        42,
        "adi",
        "ब्रह्माण्डपुराणम्",
        "ब्रह्माण्डपुराण",
        "Brahmanda Purana",
        "ब्रह्माण्डपुराणको संस्कृत पाठ — खण्ड र अध्यायअनुसार।",
        "Sanskrit text of the Brahmanda Purana, by khanda and chapter.",
        ("Khanda", "Chapter"),
        (("Khanda", "खण्ड", "Khanda"), ("Chapter", "अध्याय", "Chapter")),
    ),
    PuranaSpec(
        "Vayupurana_Revakhanda_cleaned_with_devanagari.csv",
        "vayu-purana",
        43,
        "adi",
        "वायुपुराणम्",
        "वायुपुराण (रेवाखण्ड)",
        "Vayu Purana (Reva Khanda)",
        "वायुपुराणको रेवाखण्ड — संस्कृत पाठ, अध्यायअनुसार।",
        "Sanskrit text of the Reva Khanda of the Vayu Purana, by chapter.",
        ("Chapter",),
        (("Chapter", "अध्याय", "Chapter"),),
    ),
    PuranaSpec(
        "Narasimhapurana_cleaned_with_devanagari.csv",
        "narasimha-purana",
        44,
        "adi",
        "नृसिंहपुराणम्",
        "नृसिंहपुराण",
        "Narasimha Purana",
        "नृसिंहपुराणको संस्कृत पाठ — अध्यायअनुसार।",
        "Sanskrit text of the Narasimha Purana, by chapter.",
        ("Chapter",),
        (("Chapter", "अध्याय", "Chapter"),),
    ),
    PuranaSpec(
        "Devigita_cleaned_with_devanagari.csv",
        "devi-gita",
        45,
        "devi-bhagavata",
        "देवीगीता",
        "देवीगीता",
        "Devi Gita",
        "देवीगीताको संस्कृत पाठ — अध्यायअनुसार।",
        "Sanskrit text of the Devi Gita, by chapter.",
        ("Chapter",),
        (("Chapter", "अध्याय", "Chapter"),),
    ),
)


def purana_dir() -> Path | None:
    override = os.environ.get("PURANA_SOURCE_DIR", "").strip()
    if override:
        path = Path(override)
        return path if path.is_dir() else None
    # nepali-holiday-api/services/this_file.py → calender-patro/purana
    sibling = Path(__file__).resolve().parents[2] / "purana"
    return sibling if sibling.is_dir() else None


def purana_source_paths() -> list[Path]:
    directory = purana_dir()
    if directory is None:
        return []
    return sorted(
        path
        for spec in PURANAS
        if (path := directory / spec.filename).is_file()
    )


def _display_num(raw: str | None) -> str:
    text = (raw or "").strip()
    if not text:
        return ""
    try:
        number = float(text)
    except ValueError:
        return text
    if number == int(number):
        return str(int(number))
    return text


def _ne_int(n: int) -> str:
    return str(n).translate(_DEVANAGARI_DIGITS)


def _chapter_titles(spec: PuranaSpec, row: dict[str, str]) -> tuple[str, str]:
    section = (row.get("Section") or "").strip().lower()
    if section == "mangala" and not _display_num(row.get("Chapter")):
        return "मङ्गलाचरण", "Invocation"
    ne_parts: list[str] = []
    en_parts: list[str] = []
    for column, ne_label, en_label in spec.title_parts:
        value = _display_num(row.get(column))
        if not value or value.lower() == "main":
            continue
        ne_parts.append(f"{ne_label} {value}")
        en_parts.append(f"{en_label} {value}")
    if not ne_parts:
        return "अध्याय", "Chapter"
    return " · ".join(ne_parts), " · ".join(en_parts)


# A GRETIL-style verse id glued into a cell, e.g. ViP_1,1.31 or शिव्प्_७.१,१.१अब्.
# The id is not part of the shloka. Several of them in one cell means that cell
# is a run of shlokas and has to be split.
_LATIN_MARK = re.compile(
    r"\(?(?P<raw>(?:ViP|BrP|brp|bhp|BhP|NsP|śivp|sivp|ivp|narp|garp|markp|Mats|bndp|rks|ap)"
    r"_[0-9]+\*?(?:[a-zāīūṛ]*[.,]\s*[0-9]+)+(?:ab|cd|ef|a|b|c|d|e|f)?(?:\*[0-9]+)?(?:_[0-9]+)?(?:ab|cd|ef|a|b|c|d|e|f)?)"
    r"\)?(?![A-Za-z0-9])",
    re.IGNORECASE,
)
_DEV_MARK = re.compile(
    r"\(?(?P<raw>(?:(?![०-९])[ऀ-ॿ]){2,12}"
    r"_[०-९0-9]+\*?(?:[ऀ-ॿ]*[.,]\s*[०-९0-9]+)+(?:अब्|च्द्|ए|फ|अ|ब|च|द)?(?:\*[०-९0-9]+)?(?:_[०-९0-9]+)?(?:अब्|च्द्|ए|फ|अ|ब|च|द)?)"
    r"\)?"
)
_ASCII_DIGITS = str.maketrans("०१२३४५६७८९", "0123456789")
_LEAD_LIMIT = 180


@dataclass
class _Piece:
    text: str
    """Book/chapter numbers from the verse id, without the verse number itself."""
    location: tuple[int, ...]
    verse: int | None
    # lead: prose before the first numbered shloka. tail: prose after the last one.
    kind: str  # "verse" | "lead" | "tail"


def _clean_verse(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip(" *_")


def _marker_parts(raw: str) -> tuple[tuple[int, ...], int, str]:
    body = raw.split("_", 1)[-1].translate(_ASCII_DIGITS)
    body = re.sub(
        r"(?:ab|cd|ef|अब्|च्द्|ए|फ|\*[0-9]+|_[0-9]+|[abcdefअबच्द])+$",
        "",
        body,
        flags=re.IGNORECASE,
    )
    numbers = [int(item) for item in re.findall(r"[0-9]+", body)]
    if not numbers:
        return (), 0, ""
    return tuple(numbers[:-1]), numbers[-1], ""


def _peel_lead(text: str, speaker: str) -> tuple[str, str]:
    """A long run before the first id is an introduction plus the first shloka."""
    if len(text) <= _LEAD_LIMIT or speaker not in text:
        return "", text
    cut = text.rfind(speaker) + len(speaker)
    lead, verse = text[:cut].strip(), text[cut:].strip()
    if len(verse) < 12:
        return "", text
    return lead, verse


def _split_marked(text: str, pattern: re.Pattern[str], speaker: str) -> list[_Piece]:
    matches = list(pattern.finditer(text))
    if not matches:
        return [_Piece(_clean_verse(text), (), None, "verse")]

    def piece_for(raw: str, body: str, kind: str) -> _Piece:
        location, verse, _pada = _marker_parts(raw)
        return _Piece(_clean_verse(body), location, verse, kind)

    before = text[: matches[0].start()]
    prefix_style = not re.search(r"[^\s_*()]", before)
    pieces: list[_Piece] = []
    if prefix_style:
        for index, match in enumerate(matches):
            end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
            pieces.append(piece_for(match.group("raw"), text[match.end() : end], "verse"))
    else:
        # The id sits at the end of the shloka it numbers.
        lead, first = _peel_lead(before, speaker)
        if lead:
            pieces.append(_Piece(_clean_verse(lead), (), None, "lead"))
        chunks = [first if lead else before]
        for index in range(len(matches) - 1):
            chunks.append(text[matches[index].end() : matches[index + 1].start()])
        for match, chunk in zip(matches, chunks):
            pieces.append(piece_for(match.group("raw"), chunk, "verse"))
        tail = _clean_verse(text[matches[-1].end() :])
        if len(tail) >= 20:
            pieces.append(_Piece(tail, (), None, "tail"))
    merged: list[_Piece] = []
    for item in pieces:
        if (
            merged
            and item.kind == "verse"
            and merged[-1].kind == "verse"
            and item.verse
            and (merged[-1].location, merged[-1].verse) == (item.location, item.verse)
        ):
            merged[-1].text = _clean_verse(f"{merged[-1].text} {item.text}")
        elif item.text:
            merged.append(item)
    return merged or [_Piece(_clean_verse(pattern.sub(" ", text)), (), None, "verse")]


def _expand_row(sanskrit: str, iast: str) -> list[tuple[_Piece, _Piece]]:
    """Split a cell that holds several shlokas. One pair per shloka."""
    dev_pieces = _split_marked(sanskrit, _DEV_MARK, "उवाच")
    iast_pieces = _split_marked(iast, _LATIN_MARK, "uvāca")
    if len(iast_pieces) > 1 and len(dev_pieces) == len(iast_pieces):
        return list(zip(dev_pieces, iast_pieces))
    # The two scripts disagree, or this cell is already one shloka. Keep it
    # as one card, with the verse ids removed.
    return [(
        _Piece(_clean_verse(" ".join(piece.text for piece in dev_pieces)), (), None, "verse"),
        _Piece(_clean_verse(" ".join(piece.text for piece in iast_pieces)), (), None, "verse"),
    )]


def _csv_location(spec: PuranaSpec, row: dict[str, str]) -> tuple[int, ...]:
    numbers: list[int] = []
    for column in spec.group_cols:
        value = _display_num(row.get(column))
        if value.isdigit():
            numbers.append(int(value))
    return tuple(numbers)


def _marker_chapter_title(location: tuple[int, ...]) -> tuple[str, str]:
    if len(location) <= 1:
        number = location[0] if location else 1
        return f"अध्याय {number}", f"Chapter {number}"
    head = ".".join(str(number) for number in location[:-1])
    return f"{head} · अध्याय {location[-1]}", f"{head} · Chapter {location[-1]}"


def _unique_label(label: str, seen: set[str]) -> str:
    if label not in seen:
        seen.add(label)
        return label
    n = 2
    while f"{label}-{n}" in seen:
        n += 1
    label = f"{label}-{n}"
    seen.add(label)
    return label


def _base_verse_label(spec: PuranaSpec, row: dict[str, str]) -> str:
    verse = _display_num(row.get("Verse"))
    subverse = _display_num(row.get(spec.subverse_col)) if spec.subverse_col else ""
    # Verse 0 is the invocation. Keep it off the real verse numbers so a
    # chapter that was pasted as one cell can be numbered 1, 2, 3… beside it.
    if verse == "0" and subverse:
        return f"0.{subverse}"
    if subverse and verse:
        return f"{verse}.{subverse}"
    if subverse:
        return subverse
    return verse or "1"


def _seed_one(conn: sqlite3.Connection, spec: PuranaSpec, path: Path) -> None:
    conn.execute("DELETE FROM shlokas WHERE document_slug = ?", (spec.slug,))
    conn.execute("DELETE FROM documents WHERE slug = ?", (spec.slug,))

    global_order = 0
    chapter_number = 0
    last_key: tuple[str, ...] | None = None
    title_ne = ""
    title_en = ""
    csv_loc: tuple[int, ...] = ()
    csv_chapter_id: int | None = None
    foreign_loc: tuple[int, ...] | None = None
    foreign_id: int | None = None
    seen_by_chapter: dict[int, set[str]] = {}
    count_by_chapter: dict[int, int] = {}
    batch: list[tuple] = []

    def flush() -> None:
        if not batch:
            return
        conn.executemany(
            """
            INSERT INTO shlokas
                (document_slug, global_order, chapter_number, chapter_title_ne, chapter_title_en,
                 verse_number, verse_label, sukta_number, sukta_rishi, sukta_devata, sukta_chhanda,
                 sanskrit, transliteration, meaning_ne, meaning_en,
                 audio_key, audio_duration_seconds, full_audio_start, full_audio_end)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            batch,
        )
        batch.clear()

    def emit(ch_id: int, ch_ne: str, ch_en: str, label: str, sa: str, ia: str) -> None:
        nonlocal global_order
        if not sa and not ia:
            return
        label = _unique_label(label or "1", seen_by_chapter.setdefault(ch_id, set()))
        count_by_chapter[ch_id] = count_by_chapter.get(ch_id, 0) + 1
        global_order += 1
        batch.append(
            (
                spec.slug,
                global_order,
                ch_id,
                ch_ne,
                ch_en,
                count_by_chapter[ch_id],
                label,
                None,
                None,
                None,
                None,
                sa or ia,
                ia or None,
                None,
                None,
                None,
                None,
                None,
                None,
            )
        )
        if len(batch) >= 1000:
            flush()

    def open_csv() -> int:
        nonlocal chapter_number, csv_chapter_id
        if csv_chapter_id is None:
            chapter_number += 1
            csv_chapter_id = chapter_number
        return csv_chapter_id

    def open_foreign(loc: tuple[int, ...]) -> tuple[int, str, str]:
        nonlocal chapter_number, foreign_loc, foreign_id
        if loc != foreign_loc or foreign_id is None:
            chapter_number += 1
            foreign_loc = loc
            foreign_id = chapter_number
        return foreign_id, *_marker_chapter_title(loc)

    known_locs: set[tuple[int, ...]] = set()
    with path.open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            loc = _csv_location(spec, row)
            if loc:
                known_locs.add(loc)

    with path.open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            key = tuple(_display_num(row.get(column)) for column in spec.group_cols)
            if key != last_key:
                last_key = key
                csv_chapter_id = None
                foreign_loc = None
                foreign_id = None
                title_ne, title_en = _chapter_titles(spec, row)
                csv_loc = _csv_location(spec, row)
            sanskrit = (row.get("Sanskrit_Devanagari") or "").strip()
            transliteration = (row.get("Sanskrit_IAST") or "").strip()
            if not sanskrit and not transliteration:
                continue
            pairs = _expand_row(sanskrit, transliteration or sanskrit)
            # A pasted run whose ids name a chapter that already has its own
            # rows is a duplicate. Keep only the prose that belongs here.
            pairs = [
                pair for pair in pairs
                if not (
                    pair[1].kind == "verse"
                    and pair[1].location
                    and pair[1].location != csv_loc
                    and pair[1].location in known_locs
                )
            ]
            if not pairs:
                continue
            multi = len(pairs) > 1
            row_label = _base_verse_label(spec, row)
            for index, (dev, ia) in enumerate(pairs):
                foreign = multi and ia.kind == "verse" and ia.location and ia.location != csv_loc
                if foreign:
                    ch_id, ch_ne, ch_en = open_foreign(ia.location)
                else:
                    ch_id = open_csv()
                    ch_ne, ch_en = title_ne, title_en
                if not multi or ia.kind == "lead":
                    label = row_label
                elif ia.verse:
                    label = str(ia.verse)
                elif ia.kind == "tail" and index > 0 and pairs[index - 1][1].verse:
                    label = str(pairs[index - 1][1].verse + 1)
                else:
                    label = "इति"
                emit(ch_id, ch_ne, ch_en, label, dev.text, ia.text)
    flush()

    conn.execute(
        """
        INSERT INTO documents
            (slug, order_index, category, subcategory, title_sa, title_ne, title_en,
             subtitle_ne, subtitle_en, description_ne, description_en, source_ne, source_en,
             cover_image, has_chapters, inline_chapters, chapter_count, shloka_count, full_audio_key)
        VALUES (?, ?, 'purana', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 1, 0, ?, ?, NULL)
        """,
        (
            spec.slug,
            spec.order_index,
            spec.subcategory,
            spec.title_sa,
            spec.title_ne,
            spec.title_en,
            f"{_ne_int(chapter_number)} अध्याय, {_ne_int(global_order)} श्लोक",
            f"{chapter_number} chapters, {global_order} verses",
            spec.description_ne,
            spec.description_en,
            "संस्कृत मूल पाठ",
            "Sanskrit source text",
            chapter_number,
            global_order,
        ),
    )


def seed_puranas(conn: sqlite3.Connection) -> None:
    directory = purana_dir()
    if directory is None:
        return
    for spec in PURANAS:
        path = directory / spec.filename
        if path.is_file():
            _seed_one(conn, spec, path)
