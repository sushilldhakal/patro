"""Dasha periods — the one model every dasha view is built from.

A dasha system is a cycle of lords with their years (Vimshottari's nine over
120, Yogini's eight over 36; Tribhagi is Vimshottari at a third). From birth,
the Moon's nakshatra names the first mahadasha and how much of it is left
(the balance); the rest follow in order at full length. Each period divides
into sub-periods (antardasha, pratyantar…) in the same order, each lasting
``parent years × sub-lord years ÷ cycle years``, laid out over the parent's
*full* length — so for the birth-balance mahadasha the sub-periods that ended
before birth drop out and the first one is cut at birth.

Every year here is :data:`YEAR_DAYS` long (the mean Gregorian year), for all
three systems and every depth, so a period's dates agree wherever they show.
"""

from __future__ import annotations

from collections.abc import Callable, Iterable, Mapping, Sequence
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

# Dasha year length — the mean Gregorian calendar year (matches how every
# mainstream reference implementation, e.g. drikpanchang.com, converts a
# dasha-year fraction into a date). A 360-day "savana year" drifts boundaries
# ~5.25 days earlier per elapsed year — months by mid-life.
YEAR_DAYS = 365.2425


def parse_instant(value: str) -> datetime:
    """A period boundary as stored in a payload (ISO, ``Z`` accepted; naive = UTC)."""
    dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def years_between(start: datetime, end: datetime) -> float:
    return (end - start).total_seconds() / (YEAR_DAYS * 86400.0)


def add_years(instant: datetime, years: float) -> datetime:
    return instant + timedelta(days=years * YEAR_DAYS)


@dataclass(frozen=True)
class DashaSystem:
    """A cycle of lords: their order, their full years, the cycle length, their names."""

    name: str
    sequence: tuple[str, ...]
    years: Mapping[str, float]
    cycle_years: float
    lord_ne: Mapping[str, str]


@dataclass(frozen=True)
class DashaPeriod:
    """One lord's span. ``years`` is carried for mahadashas only (their payload shows it)."""

    lord: str
    lord_ne: str
    start: datetime
    end: datetime
    years: float | None = None

    def contains(self, instant: datetime) -> bool:
        return self.start <= instant < self.end

    def to_payload(self) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "lord": self.lord,
            "lord_ne": self.lord_ne,
            "start": self.start.isoformat(),
            "end": self.end.isoformat(),
        }
        if self.years is not None:
            payload["years"] = self.years
        return payload

    @classmethod
    def from_payload(cls, row: Mapping[str, Any]) -> DashaPeriod:
        return cls(
            lord=row["lord"],
            lord_ne=row.get("lord_ne", row["lord"]),
            start=parse_instant(row["start"]),
            end=parse_instant(row["end"]),
            years=row.get("years"),
        )


@dataclass(frozen=True)
class DashaTimeline:
    """A system's mahadashas from birth, with the header its payload carries."""

    header: tuple[tuple[str, Any], ...]
    periods: tuple[DashaPeriod, ...]

    @property
    def mahadasha_lord(self) -> str:
        return self.periods[0].lord

    def running(self, instant: datetime) -> DashaPeriod | None:
        return running(self.periods, instant)

    def to_payload(self) -> dict[str, Any]:
        return {**dict(self.header), "sequence": [period.to_payload() for period in self.periods]}


def running(periods: Iterable[DashaPeriod], instant: datetime) -> DashaPeriod | None:
    """The period in force at ``instant``, if any."""
    return next((period for period in periods if period.contains(instant)), None)


def mahadashas_from_birth(
    *,
    sequence: Sequence[str],
    start_index: int,
    balance_years: float,
    full_years: Callable[[str], float],
    lord_ne: Mapping[str, str],
    birth: datetime,
    cycles: int = 1,
) -> tuple[DashaPeriod, ...]:
    """The birth-balance mahadasha, then ``cycles`` turns of the sequence at full length."""
    if birth.tzinfo is None:
        birth = birth.replace(tzinfo=timezone.utc)
    first_lord = sequence[start_index]
    cursor = birth
    first_end = add_years(cursor, balance_years)
    periods = [DashaPeriod(first_lord, lord_ne[first_lord], cursor, first_end, balance_years)]
    cursor = first_end
    for step in range(1, len(sequence) * cycles):
        lord = sequence[(start_index + step) % len(sequence)]
        years = full_years(lord)
        end = add_years(cursor, years)
        periods.append(DashaPeriod(lord, lord_ne[lord], cursor, end, years))
        cursor = end
    return tuple(periods)


def sub_periods(
    system: DashaSystem,
    lord: str,
    start: datetime,
    end: datetime,
    *,
    parent_full_years: float | None = None,
) -> list[DashaPeriod]:
    """The sub-periods of ``lord``'s span ``[start, end)``.

    ``parent_full_years`` is the parent's full length (20 for a Venus
    mahadasha). The sub-periods are laid out over that full span ending at
    ``end``; any that ended before ``start`` (the part of a birth-balance
    period before birth) is dropped, the first one left is cut at ``start``,
    and the last ends exactly at ``end``. Without it the parent is taken as
    whole — what its visible span is.
    """
    if start.tzinfo is None:
        start = start.replace(tzinfo=timezone.utc)
    if end.tzinfo is None:
        end = end.replace(tzinfo=timezone.utc)
    visible_years = years_between(start, end)
    full_years = float(parent_full_years) if parent_full_years is not None else visible_years
    if full_years <= 0:
        full_years = visible_years
    cursor = end - timedelta(days=full_years * YEAR_DAYS)
    start_index = system.sequence.index(lord)
    count = len(system.sequence)
    children: list[DashaPeriod] = []
    for step in range(count):
        sub_lord = system.sequence[(start_index + step) % count]
        length = timedelta(days=system.years[sub_lord] * full_years / system.cycle_years * YEAR_DAYS)
        child_end = end if step == count - 1 else cursor + length
        if child_end <= start:
            cursor = child_end
            continue
        children.append(DashaPeriod(sub_lord, system.lord_ne[sub_lord], max(cursor, start), child_end))
        cursor = child_end
    if children:
        last = children[-1]
        children[-1] = DashaPeriod(last.lord, last.lord_ne, last.start, end)
    return children
