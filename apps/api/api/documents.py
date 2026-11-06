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
* ``GET /documents/{slug}/chapters/{chapter}``     → one chapter's shlokas, audio resolved.
                                                      With no paging query, the whole chapter
                                                      (offline download). With ``limit`` /
                                                      ``cursor`` / ``verse``, one keyset page
                                                      of verses (``global_order``, never OFFSET).

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


# Payload-shape token. ``_cache_version()`` follows manifest bytes and the bucket
# URL, so a code-only change to the page (cursors, slim verses) needs its own bump.
_CHAPTER_PAGE_CACHE = "p1"


def _chapter_cache_key(
    slug: str,
    chapter_number: int,
    *,
    paged: bool,
    cursor: int | None,
    direction: str,
    limit: int,
    verse: str | None,
) -> str:
    version = _cache_version()
    if not paged:
        return f"documents_chapter_v{version}_{slug}_{chapter_number}"
    verse_key = documents_db.verse_label_key(verse) if verse and verse.strip() else ""
    cursor_key = "" if cursor is None else str(cursor)
    return (
        f"documents_chapter_{_CHAPTER_PAGE_CACHE}_v{version}_{slug}_{chapter_number}"
        f"_c{cursor_key}_d{direction}_l{limit}_v{verse_key}"
    )


@router.get("/documents/{slug}/chapters/{chapter_number}")
def document_chapter_detail(
    slug: str,
    chapter_number: int,
    request: Request,
    limit: int | None = Query(None, description="Page size. Omit, with cursor and verse, for the whole chapter."),
    cursor: int | None = Query(None, description="A global_order. With direction, the page after or before it."),
    direction: str = Query("next", description="next (global_order greater) or prev (global_order less)."),
    verse: str | None = Query(None, max_length=80, description="verse_label to centre, e.g. 6.12.3. Devanagari digits accepted."),
):
    """One chapter.

    No ``limit``, ``cursor`` or ``verse``: the whole chapter, same body as before
    (offline packs). Any of those: a keyset page (default 25, max 100) with
    ``verses``, ``next_cursor``, ``prev_cursor`` and ``total``.
    """
    if direction not in ("next", "prev"):
        raise HTTPException(status_code=400, detail="direction must be next or prev")
    verse_text = verse.strip() if verse else ""
    paged = limit is not None or cursor is not None or bool(verse_text)
    if paged:
        clamped = documents_db.clamp_page_limit(limit)
        build = _or_404(
            document_views.chapter_page_view,
            slug,
            chapter_number,
            cursor,
            direction,
            clamped,
            verse_text or None,
        )
    else:
        clamped = documents_db.CHAPTER_PAGE_DEFAULT
        build = _or_404(document_views.chapter_view, slug, chapter_number)
    cache_key = _chapter_cache_key(
        slug,
        chapter_number,
        paged=paged,
        cursor=cursor,
        direction=direction,
        limit=clamped,
        verse=verse_text or None,
    )
    return response_cache.serve_cached_json(request, cache_key, build, cache_control=_CACHE_CONTROL)


@router.get("/veda/details/{kind}")
def veda_verses_by_detail(
    kind: str,
    request: Request,
    value: str = Query(..., min_length=1, max_length=200, description="e.g. अग्निः"),
    slug: str | None = Query(None, description="Keep to one Veda, e.g. rigveda"),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    """Every mantra with this देवता (devata), ऋषि (rishi), छन्द (chhanda) or स्वर (svara)."""
    build = _or_404(document_views.verse_detail_view, kind, value, slug, offset, limit)
    cache_key = f"veda_details_v{_cache_version()}_{kind}_{slug or 'all'}_{offset}_{limit}_{value.strip()}"
    return response_cache.serve_cached_json(request, cache_key, build, cache_control=_CACHE_CONTROL)


@router.get("/veda/details/{kind}/values")
def veda_detail_values(
    kind: str,
    request: Request,
    slug: str | None = Query(None, description="Keep to one Veda, e.g. rigveda"),
):
    """Every distinct देवता / ऋषि / छन्द / स्वर with its mantra count."""
    build = _or_404(document_views.detail_values_view, kind, slug)
    cache_key = f"veda_detail_values_v{_cache_version()}_{kind}_{slug or 'all'}"
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
