"""BsDate — one day on the Bikram Sambat calendar, as a value.

Replaces the ``(bs_year, bs_month, bs_day)`` triple and the ``{"year", "month",
"day"}`` dict that travel through the code. It unpacks like the triple
(``y, m, d = bs``), so a call site can adopt it without touching its
neighbours, and ``str(bs)`` is the ``YYYY-MM-DD`` form every payload carries.

Like :func:`parse_bs_date` it does not range-check: whether a month has that
day is :meth:`is_valid`'s question, asked where the caller needs it.
"""

from __future__ import annotations

from collections.abc import Iterator, Mapping
from dataclasses import dataclass
from datetime import date
from typing import Any

from engine.calendar.bikram_sambat import (
    bs_month_name,
    bs_to_gregorian,
    format_bs_date,
    gregorian_to_bs,
    is_valid_bs_date,
    parse_bs_date,
)


@dataclass(frozen=True, order=True)
class BsDate:
    year: int
    month: int
    day: int

    @classmethod
    def parse(cls, text: str) -> BsDate:
        """``"2083-02-24"`` → BsDate; ValueError for anything else (including "today")."""
        return cls(*parse_bs_date(text))

    @classmethod
    def from_gregorian(cls, greg: date) -> BsDate:
        return cls(*gregorian_to_bs(greg))

    @classmethod
    def of(cls, fields: Mapping[str, Any]) -> BsDate:
        """From a payload's ``bs_date`` block (``{"year", "month", "day", …}``)."""
        return cls(fields["year"], fields["month"], fields["day"])

    def to_gregorian(self) -> date:
        return bs_to_gregorian(self.year, self.month, self.day)

    def is_valid(self) -> bool:
        return is_valid_bs_date(self.year, self.month, self.day)

    def month_name(self, *, nepali: bool = False) -> str:
        return bs_month_name(self.month, nepali=nepali)

    def __iter__(self) -> Iterator[int]:
        return iter((self.year, self.month, self.day))

    def __str__(self) -> str:
        return format_bs_date(self.year, self.month, self.day)
