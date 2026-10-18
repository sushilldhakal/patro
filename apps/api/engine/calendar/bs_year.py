"""Shared BS year mapping helpers (Project Parva compatible)."""

from __future__ import annotations


def bs_solar_year_for_gregorian_year(gregorian_year: int, bs_month: int) -> int:
    """Map a Gregorian year to the BS solar year for a given BS month."""

    return gregorian_year + (56 if int(bs_month) >= 10 else 57)
