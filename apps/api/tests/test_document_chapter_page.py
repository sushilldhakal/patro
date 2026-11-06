"""Keyset pages of a scripture chapter: cursors, verse lookup, limit clamp."""

from __future__ import annotations

import json
import sqlite3

from fastapi import FastAPI
from fastapi.testclient import TestClient

from api import documents
from engine.astronomy.paths import documents_db_path
from services.scripture import documents_db


def _client() -> TestClient:
    app = FastAPI()
    app.include_router(documents.router)
    return TestClient(app)


def _chapter_with_room(client: TestClient) -> tuple[str, int, list[str]]:
    """A real chapter long enough to turn several pages (the Gita, not a Purana)."""
    detail = client.get("/documents/bhagavad-gita")
    assert detail.status_code == 200
    chapters = [c for c in detail.json()["chapters"] if (c.get("shloka_count") or 0) >= 40]
    assert chapters, "expected a Gita chapter of at least 40 verses"
    number = chapters[0]["number"]
    full = client.get(f"/documents/bhagavad-gita/chapters/{number}")
    assert full.status_code == 200
    body = full.json()
    assert "verses" not in body
    assert "next_cursor" not in body
    labels = [s["verse_label"] for s in body["chapter"]["shlokas"]]
    assert len(labels) >= 40
    return "bhagavad-gita", number, labels


def _page(client: TestClient, slug: str, number: int, **query) -> dict:
    res = client.get(f"/documents/{slug}/chapters/{number}", params=query)
    assert res.status_code == 200, res.text
    return res.json()


def test_chapter_order_index_exists():
    documents_db.ensure_seeded()
    conn = sqlite3.connect(documents_db_path())
    row = conn.execute(
        "SELECT sql FROM sqlite_master WHERE type = 'index' AND name = 'idx_shlokas_document_chapter'"
    ).fetchone()
    assert row is not None
    sql = row[0]
    assert "document_slug" in sql and "chapter_number" in sql and "global_order" in sql


def test_unpaged_chapter_is_unchanged():
    client = _client()
    slug, number, labels = _chapter_with_room(client)
    body = _page(client, slug, number)
    assert [s["verse_label"] for s in body["chapter"]["shlokas"]] == labels
    assert "padapatha" not in body["chapter"]["shlokas"][0]
    assert "meaning_hi" not in body["chapter"]["shlokas"][0]


def test_first_page_and_next_chain_has_no_gap_or_overlap():
    client = _client()
    slug, number, labels = _chapter_with_room(client)
    seen: list[str] = []
    cursor = None
    pages = 0
    while True:
        query: dict = {"limit": 10, "direction": "next"}
        if cursor is not None:
            query["cursor"] = cursor
        body = _page(client, slug, number, **query)
        assert body["total"] == len(labels)
        got = [v["verse_label"] for v in body["verses"]]
        assert got
        assert not set(got) & set(seen)
        seen.extend(got)
        pages += 1
        if pages == 1:
            assert body["prev_cursor"] is None
            assert len(got) == 10
        if body["next_cursor"] is None:
            assert body["prev_cursor"] is not None or len(labels) <= 10
            break
        assert body["next_cursor"] != cursor
        cursor = body["next_cursor"]
        assert pages < 30
    assert seen == labels


def test_prev_paging_walks_back_to_the_start():
    client = _client()
    slug, number, labels = _chapter_with_room(client)
    # Land on the last page, then walk prev cursors back.
    last = _page(client, slug, number, limit=10, direction="prev")
    assert last["next_cursor"] is None
    seen = [v["verse_label"] for v in last["verses"]]
    cursor = last["prev_cursor"]
    while cursor is not None:
        body = _page(client, slug, number, limit=10, direction="prev", cursor=cursor)
        got = [v["verse_label"] for v in body["verses"]]
        assert got
        assert got[-1] != seen[0] or not set(got) & set(seen)
        assert not set(got) & set(seen)
        seen = got + seen
        cursor = body["prev_cursor"]
    assert seen == labels
    assert _page(client, slug, number, limit=10)["prev_cursor"] is None


def test_verse_lookup_middle_first_and_last():
    client = _client()
    slug, number, labels = _chapter_with_room(client)
    middle = labels[len(labels) // 2]
    first, last = labels[0], labels[-1]

    mid = _page(client, slug, number, verse=middle, limit=11)
    mid_labels = [v["verse_label"] for v in mid["verses"]]
    assert middle in mid_labels
    assert abs(mid_labels.index(middle) - (len(mid_labels) - 1) / 2) <= 1
    assert mid["prev_cursor"] is not None and mid["next_cursor"] is not None

    head = _page(client, slug, number, verse=first, limit=11)
    assert head["verses"][0]["verse_label"] == first
    assert head["prev_cursor"] is None
    assert head["next_cursor"] is not None

    tail = _page(client, slug, number, verse=last, limit=11)
    assert tail["verses"][-1]["verse_label"] == last
    assert tail["next_cursor"] is None
    assert tail["prev_cursor"] is not None

    deva = middle.translate(str.maketrans("0123456789", "०१२३४५६७८९"))
    assert deva != middle
    via_deva = _page(client, slug, number, verse=deva, limit=11)
    assert [v["verse_label"] for v in via_deva["verses"]] == mid_labels


def test_unknown_verse_and_chapter_are_404():
    client = _client()
    missing_verse = client.get("/documents/bhagavad-gita/chapters/1", params={"verse": "not-a-verse"})
    assert missing_verse.status_code == 404
    missing_chapter = client.get("/documents/bhagavad-gita/chapters/9999", params={"limit": 25})
    assert missing_chapter.status_code == 404
    missing_doc = client.get("/documents/no-such-grantha/chapters/1", params={"limit": 25})
    assert missing_doc.status_code == 404


def test_limit_is_clamped():
    client = _client()
    wide = _page(client, "rigveda", 6, limit=500)
    assert len(wide["verses"]) == 100
    assert wide["total"] > 100
    assert wide["prev_cursor"] is None and wide["next_cursor"] is not None
    one = _page(client, "rigveda", 6, limit=0)
    assert len(one["verses"]) == 1
    negative = _page(client, "rigveda", 6, limit=-4)
    assert len(negative["verses"]) == 1
    default = _page(client, "rigveda", 6, cursor=wide["next_cursor"])
    assert len(default["verses"]) == documents_db.CHAPTER_PAGE_DEFAULT


def test_paged_verse_drops_fields_the_card_does_not_use():
    client = _client()
    body = _page(client, "rigveda", 6, limit=25)
    verse = body["verses"][0]
    assert verse["sanskrit"]
    assert verse["verse_label"]
    assert "id" in verse
    for dropped in ("padapatha", "meaning_hi", "verse_number", "global_order", "audio_duration_seconds"):
        assert dropped not in verse
    # Own देवता line is present, so the sukta-wide copy of it is not repeated.
    assert verse.get("devata") or verse.get("rishi")
    for sukta_meta in ("sukta_rishi", "sukta_devata", "sukta_chhanda"):
        assert sukta_meta not in verse
    encoded = json.dumps(body["verses"], ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    assert len(encoded) < 25 * 2500


def test_chapter_cache_key_includes_the_page():
    base = dict(paged=False, cursor=None, direction="next", limit=25, verse=None)
    whole = documents._chapter_cache_key("rigveda", 6, **base)
    first = documents._chapter_cache_key("rigveda", 6, **{**base, "paged": True})
    nxt = documents._chapter_cache_key("rigveda", 6, **{**base, "paged": True, "cursor": 40})
    prev = documents._chapter_cache_key("rigveda", 6, **{**base, "paged": True, "cursor": 40, "direction": "prev"})
    other_limit = documents._chapter_cache_key("rigveda", 6, **{**base, "paged": True, "limit": 50})
    by_verse = documents._chapter_cache_key("rigveda", 6, **{**base, "paged": True, "verse": "६.१२.३"})
    by_latin = documents._chapter_cache_key("rigveda", 6, **{**base, "paged": True, "verse": "6.12.3"})
    assert len({whole, first, nxt, prev, other_limit, by_verse}) == 6
    assert by_verse == by_latin
    assert "rigveda" in first and "_6_" in first
    assert documents._CHAPTER_PAGE_CACHE in first
