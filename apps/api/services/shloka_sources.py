"""Fill ``shlokas.veda_cite`` for every shloka whose source can be found.

Order of preference: a Veda samhita first (``rigveda:1.1.3``). A shloka that
is in no Veda but is in a Purana is cited to that Purana
(``agni-purana:1.12``). Puranas themselves are only matched against the Vedas,
so a Purana verse that quotes a mantra says which Veda it comes from.

Cites that a manifest already carries (the hand-checked puja documents, which
also drive audio) are never overwritten.
"""

from __future__ import annotations

import importlib.util
from bisect import bisect_right
import re
import sqlite3
from collections import defaultdict
from pathlib import Path

from services.purana_documents import PURANAS, PURANA_IMPORT_VERSION  # noqa: F401

SOURCE_LOGIC_VERSION = b"shloka-sources-2"

_VEDA_DOCS = ("rigveda", "yajurveda", "samaveda", "atharvaveda")
_PURANA_SLUGS = {spec.slug: spec.order_index for spec in PURANAS}
_WINDOW = 14
_MIN_PURANA_LEN = 24
_MIN_SEGMENT_LEN = 30
# Too big to scan clause by clause; exact matches still apply.
_LARGE_DOCS = ("mahabharata", "valmiki-ramayana")
_SEGMENT_SPLIT = re.compile(r"[—–॥।\n]|\.{2,}")


def _load_matcher():
    path = Path(__file__).resolve().parents[1] / "scripts" / "link_puja_veda_cites.py"
    spec = importlib.util.spec_from_file_location("_link_puja_veda_cites", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _purana_cite(slug: str, chapter_title_en: str | None, verse_label: str) -> str:
    numbers = re.findall(r"\d+", chapter_title_en or "")
    parts = [*numbers, verse_label.strip() or "1"]
    return f"{slug}:" + ".".join(parts)


def _segment_cite(
    text: str,
    matcher,
    corpus: str,
    starts: list[int],
    meta: list[tuple[int, str]],
) -> str | None:
    """A clause of a ritual text that is lifted word for word from a Purana verse."""
    best: tuple[int, str] | None = None
    for segment in _SEGMENT_SPLIT.split(text):
        folded = matcher.norm(segment)
        if len(folded) < _MIN_SEGMENT_LEN:
            continue
        at = corpus.find(folded)
        while at != -1:
            hit = meta[bisect_right(starts, at) - 1]
            if best is None or hit[0] < best[0]:
                best = hit
            at = corpus.find(folded, at + 1)
        if best is not None:
            break
    return best[1] if best else None


def fill_sources(conn: sqlite3.Connection) -> None:
    matcher = _load_matcher()
    index = matcher._load_index()
    buckets: dict[str, list[int]] = defaultdict(list)
    for idx, (folded, _cite, _audio, _veda) in enumerate(index):
        if len(folded) <= _WINDOW:
            buckets[folded].append(idx)
            continue
        for offset in range(0, len(folded) - _WINDOW + 1):
            buckets[folded[offset : offset + _WINDOW]].append(idx)

    # Puranas: exact folded text -> cite, earliest Purana wins.
    purana_by_text: dict[str, tuple[int, str]] = {}
    corpus_parts: list[str] = []
    corpus_meta: list[tuple[int, str]] = []
    marks = ",".join("?" for _ in _PURANA_SLUGS)
    for row in conn.execute(
        f"SELECT document_slug, chapter_title_en, verse_label, sanskrit FROM shlokas "
        f"WHERE document_slug IN ({marks})",
        tuple(_PURANA_SLUGS),
    ):
        folded = matcher.norm(row["sanskrit"])
        if len(folded) < _MIN_PURANA_LEN:
            continue
        rank = _PURANA_SLUGS[row["document_slug"]]
        known = purana_by_text.get(folded)
        cite = _purana_cite(row["document_slug"], row["chapter_title_en"], row["verse_label"])
        if known is None or rank < known[0]:
            purana_by_text[folded] = (rank, cite)
        # Verses are joined with a separator so a segment never spans two.
        corpus_parts.append(folded)
        corpus_meta.append((rank, cite))
    corpus = "|".join(corpus_parts)
    starts: list[int] = []
    pos = 0
    for part in corpus_parts:
        starts.append(pos)
        pos += len(part) + 1

    conn.execute(
        f"UPDATE shlokas SET veda_cite = NULL WHERE document_slug IN ({marks}) "
        f"OR document_slug IN ({','.join('?' for _ in _VEDA_DOCS)})",
        (*_PURANA_SLUGS, *_VEDA_DOCS),
    )
    updates: list[tuple[str, int]] = []
    rows = conn.execute(
        "SELECT id, document_slug, verse_label, sanskrit FROM shlokas "
        "WHERE veda_cite IS NULL"
    ).fetchall()
    for row in rows:
        slug = row["document_slug"]
        if slug in _VEDA_DOCS:
            continue
        label = row["verse_label"] or ""
        if label.startswith(("टीका", "सामग्री", "इति")):
            continue
        text = row["sanskrit"] or ""
        match = matcher._best_match(text, index, buckets)
        cite = match[2][1] if match is not None and match[0] >= 0.55 else None
        if cite is None and slug not in _PURANA_SLUGS:
            folded = matcher.norm(text)
            hit = purana_by_text.get(folded) if len(folded) >= _MIN_PURANA_LEN else None
            cite = hit[1] if hit else None
            if cite is None and slug not in _LARGE_DOCS:
                cite = _segment_cite(text, matcher, corpus, starts, corpus_meta)
        if cite:
            updates.append((cite, row["id"]))
    conn.executemany("UPDATE shlokas SET veda_cite = ? WHERE id = ?", updates)
