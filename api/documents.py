"""Documents (शोत्र/स्तोत्र) routes — Sanskrit text, meanings, and R2 audio URLs.

* ``GET /documents``                              → list of documents for the library grid
* ``GET /documents/{slug}``                        → one document's metadata. For a
                                                      paginated chaptered document (the Gita),
                                                      chapters carry only a ``shloka_count``
                                                      so the client can render a chapter picker
                                                      without downloading the whole book. For
                                                      ``inline_chapters`` documents (Sri Rudram),
                                                      every chapter's verses are embedded here
                                                      so the whole text renders on one page.
* ``GET /documents/{slug}/chapters/{chapter}``     → one chapter's shlokas, audio resolved

Splitting by chapter (never by an arbitrary page size) keeps this scaling to
much larger multi-chapter works later: the unit of pagination is always the
chapter a verse is already labelled with (see ``verse_label``), not a fixed
count of verses.

No auth — same public/read-only shape as vastu, panchanga, kundali. Content
lives in ``data/documents_source/*.json`` (see that folder's README) and is
served from ``data/documents.db`` via ``services/documents_db.py``.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException

import config
from services import documents_db

router = APIRouter(tags=["documents"])


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


def _find_chapter(doc: dict[str, Any], chapter_number: int) -> dict[str, Any] | None:
    return next((c for c in doc["chapters"] if c["number"] == chapter_number), None)


@router.get("/documents")
def list_documents():
    documents = [_resolve_document_summary(dict(d)) for d in documents_db.list_documents()]
    return {"count": len(documents), "documents": documents}


@router.get("/documents/{slug}")
def document_detail(slug: str):
    doc = documents_db.get_document_detail(slug)
    if doc is None:
        raise HTTPException(status_code=404, detail=f"No such document: {slug}")

    chapters = []
    embed_shlokas = (not doc["has_chapters"]) or bool(doc.get("inline_chapters"))
    for chapter in doc["chapters"]:
        if embed_shlokas:
            shlokas = [_resolve_shloka(s) for s in chapter["shlokas"]]
            chapters.append({**chapter, "shlokas": shlokas})
        else:
            # Metadata only — a paginated chaptered document's verses are
            # fetched per chapter (see /documents/{slug}/chapters/{chapter}).
            chapters.append(
                {
                    "number": chapter["number"],
                    "title_ne": chapter["title_ne"],
                    "title_en": chapter["title_en"],
                    "shloka_count": len(chapter["shlokas"]),
                }
            )

    return {**_resolve_document_summary(doc), "chapters": chapters}


@router.get("/documents/{slug}/chapters/{chapter_number}")
def document_chapter_detail(slug: str, chapter_number: int):
    doc = documents_db.get_document_detail(slug)
    if doc is None:
        raise HTTPException(status_code=404, detail=f"No such document: {slug}")

    chapter = _find_chapter(doc, chapter_number)
    if chapter is None:
        raise HTTPException(status_code=404, detail=f"No such chapter: {chapter_number}")

    summary = dict(doc)
    summary.pop("chapters", None)
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
