"""Relative day keys — words that name a day by when you ask, not a calendar date.

The calendar parsers reject these with a pointer to the right route, so the set
belongs to the calendar; ``app.relative_day`` turns a key into a day at request
time.
"""

from __future__ import annotations

RELATIVE_DAY_KEYS = frozenset({"today", "tomorrow", "now", "current"})


def normalize_day_key(key: str) -> str:
    return key.strip().lower()


def is_relative_day_key(key: str) -> bool:
    return normalize_day_key(key) in RELATIVE_DAY_KEYS
