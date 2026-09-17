"""Documents (शोत्र/स्तोत्र) routes — Sanskrit text, meanings, and R2 audio URLs.

* ``GET /documents``        → list of documents for the library grid
* ``GET /documents/{slug}`` → one document's chapters + shlokas, audio/cover
                               keys resolved to playable URLs

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


@router.get("/documents")
def list_documents():
    documents = [_resolve_document_summary(dict(d)) for d in documents_db.list_documents()]
    return {"count": len(documents), "documents": documents}


@router.get("/documents/{slug}")
def document_detail(slug: str):
    doc = documents_db.get_document_detail(slug)
    if doc is None:
        raise HTTPException(status_code=404, detail=f"No such document: {slug}")

    def _resolve_shloka(s: dict[str, Any]) -> dict[str, Any]:
        audio_key = s.pop("audio_key", None)
        return {**s, "audio_url": _resolve_asset_url(audio_key)}

    chapters = []
    for chapter in doc["chapters"]:
        shlokas = [_resolve_shloka(s) for s in chapter["shlokas"]]
        chapters.append({**chapter, "shlokas": shlokas})

    return {**_resolve_document_summary(doc), "chapters": chapters}
