"""Seed the Purana library from the CSV dataset next to this API.

The verse text stays on the server (`calender-patro/purana/*.csv`, or
`PURANA_SOURCE_DIR`). Documents are inserted into `documents.db` alongside the
hand-authored JSON manifests; the app only receives them through
`/v1/documents`.
"""

from __future__ import annotations

import csv
import os
import sqlite3
import sys
from dataclasses import dataclass
from pathlib import Path

csv.field_size_limit(sys.maxsize)

# Bump when the mapping below changes so an unchanged CSV still reseeds.
PURANA_IMPORT_VERSION = b"purana-csv-1"

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


def _verse_label(spec: PuranaSpec, row: dict[str, str], seen: set[str]) -> str:
    verse = _display_num(row.get("Verse"))
    subverse = _display_num(row.get(spec.subverse_col)) if spec.subverse_col else ""
    if subverse and verse and verse != "0":
        label = f"{verse}.{subverse}"
    elif subverse:
        label = subverse
    else:
        label = verse or "1"
    if label not in seen:
        seen.add(label)
        return label
    n = 2
    while f"{label}-{n}" in seen:
        n += 1
    label = f"{label}-{n}"
    seen.add(label)
    return label


def _seed_one(conn: sqlite3.Connection, spec: PuranaSpec, path: Path) -> None:
    conn.execute("DELETE FROM shlokas WHERE document_slug = ?", (spec.slug,))
    conn.execute("DELETE FROM documents WHERE slug = ?", (spec.slug,))

    global_order = 0
    chapter_number = 0
    last_key: tuple[str, ...] | None = None
    verse_in_chapter = 0
    seen_labels: set[str] = set()
    title_ne = ""
    title_en = ""
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

    with path.open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            key = tuple(_display_num(row.get(column)) for column in spec.group_cols)
            if key != last_key:
                chapter_number += 1
                last_key = key
                verse_in_chapter = 0
                seen_labels = set()
                title_ne, title_en = _chapter_titles(spec, row)
            sanskrit = (row.get("Sanskrit_Devanagari") or "").strip()
            transliteration = (row.get("Sanskrit_IAST") or "").strip()
            if not sanskrit and not transliteration:
                continue
            verse_in_chapter += 1
            global_order += 1
            batch.append(
                (
                    spec.slug,
                    global_order,
                    chapter_number,
                    title_ne,
                    title_en,
                    verse_in_chapter,
                    _verse_label(spec, row, seen_labels),
                    None,
                    None,
                    None,
                    None,
                    sanskrit or transliteration,
                    transliteration or None,
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
