"""Devanagari numerals for dates and labels (०१२३४५६७८९)."""

from __future__ import annotations

NEPALI_DIGITS = str.maketrans("0123456789", "०१२३४५६७८९")


def to_nepali_digits(value: int | str) -> str:
    return str(value).translate(NEPALI_DIGITS)
