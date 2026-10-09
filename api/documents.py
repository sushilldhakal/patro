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

Every route is served through ``response_cache``'s gzip cache: the payload is
a pure function of the manifests already seeded into SQLite, and the cache
key embeds ``documents_db.content_version()`` so editing a shloka and
redeploying invalidates exactly the cached entries that changed.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Any
from zoneinfo import ZoneInfo

from fastapi import APIRouter, HTTPException, Query, Request

import config
from services import documents_db, response_cache

router = APIRouter(tags=["documents"])

# Static reference text, but the URL never changes when a manifest is added or
# edited (the content-hash suffix lives only in the server-side cache key). A
# day-long browser/edge TTL plus a week of stale-while-revalidate therefore hid
# new documents from returning visitors and Cloudflare after a deploy. Keep the
# TTL short so a new document or tab appears within minutes; the gzip disk cache
# in response_cache still protects the origin.
_CACHE_CONTROL = "public, max-age=300, s-maxage=300, stale-while-revalidate=300"

# The *list* is what changes when a document is added, so browsers never reuse
# it without asking the server first (``no-cache``: revalidate every time — the
# server answers from its gzip disk cache, so this is cheap), and the edge keeps
# it only briefly. Adding a document then shows up on the next page load with no
# manual cache-busting.
_LIST_CACHE_CONTROL = "no-cache, max-age=0, must-revalidate"
_LIST_CDN_CACHE_CONTROL = "public, s-maxage=30"


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


@router.get("/documents")
def list_documents(request: Request):
    def build():
        documents = [_resolve_document_summary(dict(d)) for d in documents_db.list_documents()]
        return {"count": len(documents), "documents": documents}

    cache_key = f"documents_list_v{documents_db.content_version()}"
    return response_cache.serve_cached_json(
        request,
        cache_key,
        build,
        cache_control=_LIST_CACHE_CONTROL,
        cdn_cache_control=_LIST_CDN_CACHE_CONTROL,
    )


@router.get("/documents/{slug}")
def document_detail(slug: str, request: Request):
    def build():
        doc = documents_db.get_document_summary(slug)
        if doc is None:
            raise HTTPException(status_code=404, detail=f"No such document: {slug}")

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

    cache_key = f"documents_detail_v{documents_db.content_version()}_{slug}"
    return response_cache.serve_cached_json(request, cache_key, build, cache_control=_CACHE_CONTROL)


@router.get("/documents/{slug}/chapters/{chapter_number}")
def document_chapter_detail(slug: str, chapter_number: int, request: Request):
    def build():
        summary = documents_db.document_summary_lite(slug)
        if summary is None:
            raise HTTPException(status_code=404, detail=f"No such document: {slug}")

        chapter = documents_db.get_chapter_shlokas(slug, chapter_number)
        if chapter is None:
            raise HTTPException(status_code=404, detail=f"No such chapter: {chapter_number}")

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

    cache_key = f"documents_chapter_v{documents_db.content_version()}_{slug}_{chapter_number}"
    return response_cache.serve_cached_json(request, cache_key, build, cache_control=_CACHE_CONTROL)


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


@router.get("/veda/daily")
def veda_daily(
    request: Request,
    day: date | None = Query(None, alias="date", description="YYYY-MM-DD (default: today in Nepal)"),
):
    """Today's Veda mantra — Sanskrit, meaning where there is one, and its audio.

    Same mantra for everyone on a given date (see
    :func:`documents_db.daily_veda_shloka`), drawn only from verses that have a
    recording. ``read_slug`` / ``read_chapter`` / ``read_verse`` locate it in the
    reader so the app can link to the passage it came from.
    """
    when = day or datetime.now(ZoneInfo("Asia/Kathmandu")).date()

    def build():
        shloka = documents_db.daily_veda_shloka(when)
        if shloka is None:
            raise HTTPException(status_code=404, detail="No mantra available")
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

    cache_key = f"veda_daily_f2_v{documents_db.content_version()}_{when.isoformat()}"
    return response_cache.serve_cached_json(
        request, cache_key, build, cache_control="public, max-age=3600, s-maxage=3600"
    )
