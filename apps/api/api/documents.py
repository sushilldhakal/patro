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
served from ``data/documents.db`` via ``services/scripture/documents_db.py``.

Every route is served through ``response_cache``'s gzip cache: the payload is
a pure function of the manifests already seeded into SQLite, and the cache
key embeds ``documents_db.content_version()`` so editing a shloka and
redeploying invalidates exactly the cached entries that changed.
"""

from __future__ import annotations

import hashlib
from datetime import date, datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, HTTPException, Query, Request

import config
from services.scripture import document_views, documents_db
from app import response_cache

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


def _cache_version() -> str:
    """Cache-key version: the manifests' content hash plus the bucket URL.

    The cached payload carries resolved audio and cover URLs (bucket URL + object key), so it
    depends on ``R2_PUBLIC_BASE_URL`` as much as on the manifests. Keyed on manifests alone, one
    answer given while the setting was missing or different — every recording link ``null`` —
    was served for as long as the manifests stayed unchanged, even after the setting was fixed.
    """
    base = config.r2_public_base_url() or ""
    return f"{documents_db.content_version()}-{hashlib.sha1(base.encode()).hexdigest()[:8]}"


def _or_404(view, *args):
    """``view(*args)``, with a missing document, chapter or mantra as a 404."""
    def build():
        try:
            return view(*args)
        except LookupError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
    return build


@router.get("/documents")
def list_documents(request: Request):
    build = document_views.documents_list

    cache_key = f"documents_list_v{_cache_version()}"
    return response_cache.serve_cached_json(
        request,
        cache_key,
        build,
        cache_control=_LIST_CACHE_CONTROL,
        cdn_cache_control=_LIST_CDN_CACHE_CONTROL,
    )


@router.get("/documents/{slug}")
def document_detail(slug: str, request: Request):
    build = _or_404(document_views.document_view, slug)

    cache_key = f"documents_detail_v{_cache_version()}_{slug}"
    return response_cache.serve_cached_json(request, cache_key, build, cache_control=_CACHE_CONTROL)


@router.get("/documents/{slug}/chapters/{chapter_number}")
def document_chapter_detail(slug: str, chapter_number: int, request: Request):
    build = _or_404(document_views.chapter_view, slug, chapter_number)

    cache_key = f"documents_chapter_v{_cache_version()}_{slug}_{chapter_number}"
    return response_cache.serve_cached_json(request, cache_key, build, cache_control=_CACHE_CONTROL)


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

    build = _or_404(document_views.daily_veda_view, when)

    cache_key = f"veda_daily_f2_v{_cache_version()}_{when.isoformat()}"
    return response_cache.serve_cached_json(
        request, cache_key, build, cache_control="public, max-age=3600, s-maxage=3600"
    )
