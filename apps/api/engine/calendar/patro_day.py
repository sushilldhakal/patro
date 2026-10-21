"""PatroDay — one day of a BS month: its Bikram Sambat date and its civil day.

The patro axis reaches back past 1 CE, so the civil day is a ``date`` for CE
days and a :class:`~engine.astronomy.jd_calendar.CivilDay` before. A PatroDay
unpacks like the ``(bs_day, civil_day)`` pair ``iter_bs_month_days`` used to
yield (``for bs_day, greg in …``), so call sites adopt it one at a time.
"""

from __future__ import annotations

from collections.abc import Iterator
from dataclasses import dataclass
from datetime import date

from engine.astronomy.jd_calendar import CivilDay
from engine.calendar.bs_date import BsDate


@dataclass(frozen=True)
class PatroDay:
    bs: BsDate
    civil: date | CivilDay

    @property
    def day(self) -> int:
        return self.bs.day

    @property
    def gregorian(self) -> date | None:
        """The ``date``, or ``None`` for a pre-1 CE day."""
        return self.civil if isinstance(self.civil, date) else None

    def __iter__(self) -> Iterator[int | date | CivilDay]:
        return iter((self.bs.day, self.civil))

    def __getitem__(self, index: int):
        return (self.bs.day, self.civil)[index]
