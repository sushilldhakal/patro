"""Scripture reader views — the payloads behind /documents and /veda/daily.

Each view is a pure function of the manifests seeded into ``documents.db``
(``documents_db``) plus the R2 base URL that turns a stored audio or cover key
into a playable link. A missing document, chapter or mantra raises
:class:`LookupError` with the message the route returns as its 404; HTTP
caching stays in the router.
"""

from __future__ import annotations

from datetime import date
from typing import Any

import config
from services.scripture import documents_db


def _resolve_asset_url(key: str | None) -> str | None:
    """Turn a stored R2 object key into a playable URL.

    A manifest may already give a full ``http(s)://`` URL (e.g. a cover image
    hosted elsewhere) — used as-is. A bare key needs ``R2_PUBLIC_BASE_URL``;
    without it there is nothing to resolve against, so the key is dropped
    rather than handed to the client as a broken relative path.
    """
    if not key:
        return None
    if key.startswith("http://") or key.startswith("https://"):
        return key
    base = config.r2_public_base_url()
    if not base:
        return None
    return f"{base}/{key}"


def _resolve_document_summary(doc: dict[str, Any]) -> dict[str, Any]:
    # pop() must run before the dict literal spreads `doc` — {**doc, "k": doc.pop(...)}
    # captures doc's keys at spread time, so "cover_image" would survive alongside
    # "cover_image_url" if the pop and the spread were combined in one expression.
    cover_image = doc.pop("cover_image", None)
    full_audio_key = doc.pop("full_audio_key", None)
    return {
        **doc,
        "cover_image_url": _resolve_asset_url(cover_image),
        "full_audio_url": _resolve_asset_url(full_audio_key),
    }


def _resolve_shloka(s: dict[str, Any]) -> dict[str, Any]:
    audio_key = s.pop("audio_key", None)
    return {**s, "audio_url": _resolve_asset_url(audio_key)}


_VEDA_NAMES = {
    "rigveda": ("ऋग्वेद", "Rigveda"),
    "yajurveda": ("यजुर्वेद", "Yajurveda"),
    "samaveda": ("सामवेद", "Samaveda"),
    "atharvaveda": ("अथर्ववेद", "Atharvaveda"),
}


def _veda_source_parts(slug: str, shloka: dict[str, Any]) -> list[dict[str, Any]]:
    """The citation trail — "मण्डल 3 » सूक्त 27 » मन्त्र 1" — as structured parts.

    The mantra number is the verse's place *within its sukta* (the last part of
    its ``verse_label``, ``27.1`` → 1), not its running number in the chapter.
    Only the Rigveda and Atharvaveda are cited by sukta.
    """
    parts: list[dict[str, Any]] = [
        {
            "label_ne": shloka.get("chapter_title_ne"),
            "label_en": shloka.get("chapter_title_en"),
            "value": None,
        }
    ]
    label = str(shloka.get("verse_label") or "")
    if slug in ("rigveda", "atharvaveda") and shloka.get("sukta_number") is not None:
        parts.append({"label_ne": "सूक्त", "label_en": "Sukta", "value": shloka["sukta_number"]})
    mantra = label.rsplit(".", 1)[-1] if label else str(shloka["verse_number"])
    parts.append({"label_ne": "मन्त्र", "label_en": "Mantra", "value": mantra})
    return parts


def documents_list() -> dict[str, Any]:
    documents = [_resolve_document_summary(dict(d)) for d in documents_db.list_documents()]
    return {"count": len(documents), "documents": documents}


def document_view(slug: str) -> dict[str, Any]:
    """One document's metadata; verses embedded when the document has no chapter picker."""
    doc = documents_db.get_document_summary(slug)
    if doc is None:
        raise LookupError(f"No such document: {slug}")

    chapters = []
    embed_shlokas = (not doc["has_chapters"]) or bool(doc.get("inline_chapters"))
    for chapter in doc["chapters"]:
        if embed_shlokas:
            shlokas = [_resolve_shloka(s) for s in chapter["shlokas"]]
            chapters.append({**chapter, "shlokas": shlokas})
        else:
            # Metadata only — already shaped this way by get_document_summary.
            chapters.append(chapter)

    return {**_resolve_document_summary(doc), "chapters": chapters}


def chapter_view(slug: str, chapter_number: int) -> dict[str, Any]:
    summary = documents_db.document_summary_lite(slug)
    if summary is None:
        raise LookupError(f"No such document: {slug}")

    chapter = documents_db.get_chapter_shlokas(slug, chapter_number)
    if chapter is None:
        raise LookupError(f"No such chapter: {chapter_number}")

    shlokas = [_resolve_shloka(dict(s)) for s in chapter["shlokas"]]

    return {
        **_resolve_document_summary(summary),
        "chapter": {
            "number": chapter["number"],
            "title_ne": chapter["title_ne"],
            "title_en": chapter["title_en"],
            "shlokas": shlokas,
        },
    }


def daily_veda_view(when: date) -> dict[str, Any]:
    """The day's Veda mantra with its citation trail and reader location."""
    shloka = documents_db.daily_veda_shloka(when)
    if shloka is None:
        raise LookupError("No mantra available")
    slug = shloka.pop("document_slug")
    chapter_number = shloka.pop("chapter_number")
    source_parts = _veda_source_parts(slug, shloka)
    shloka.pop("chapter_title_ne", None)
    shloka.pop("chapter_title_en", None)
    summary = documents_db.document_summary_lite(slug) or {}
    ne, en = _VEDA_NAMES[slug]
    return {
        "date": when.isoformat(),
        "veda": {"slug": slug, "name_ne": ne, "name_en": en},
        "source_ne": summary.get("source_ne"),
        "source_en": summary.get("source_en"),
        "source_parts": source_parts,
        "read_slug": slug,
        "read_chapter": chapter_number,
        "read_verse": shloka["verse_label"],
        "shloka": _resolve_shloka(dict(shloka)),
    }
