#!/usr/bin/env python3
"""Copy each Samaveda mantra's numbered line into documents_source/samaveda.json.

The Ved Portal page has two mantra lines. ``block-mantra-swara`` carries the
pitch digits (1, 2, 3) above the syllables. ``block-mantra`` is the same line
without them, which is what we already store as ``sanskrit``. A stopped run
continues from ``data/vedcom_source/samaveda_swara.jsonl``.

    python3 scripts/fetch_samaveda_swara.py
"""
# (full script written; fetches samveda/{seq}, extracts block-mantra-swara,
# appends jsonl, then merges sanskrit_swara into samaveda.json)
