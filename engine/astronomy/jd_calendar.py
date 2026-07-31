"""Civil-day identity on the Swiss Ephemeris Julian Day axis.

Panchanga is computed from ephemeris time (JD), not from Python ``date`` /
``datetime`` alone. Those types cannot represent BCE civil labels (year 0 or
negative years), while ``swe.julday`` / ``swe.revjul`` can.

Convention here:
- **jd_ut** — Julian Day at **0h UT** on the proleptic-Gregorian civil label
  (year, month, day). Consecutive civil days are exactly 1.0 JD apart.
- **jd_instant** — any UT instant passed to ``calc_ut`` (sunrise, sankranti, …).

New code should treat ``jd_ut`` as the canonical cache key for a civil day once
BCE BS years are enabled; ``date_ad`` strings remain a display/export field.
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import NamedTuple

import swisseph as swe

# Unix epoch (1970-01-01 00:00:00 UTC) in Julian Day numbers.
JD_UNIX_EPOCH: float = 2440587.5


class CivilDay(NamedTuple):
    """Proleptic Gregorian civil day (supports BCE via negative year)."""

    year: int
    month: int
    day: int

    def to_jd_ut(self) -> float:
        return civil_day_jd_ut(self.year, self.month, self.day)

    def to_date(self) -> date:
        d = date_if_supported(self.year, self.month, self.day)
        if d is None:
            raise ValueError(f"Civil day {self!r} is outside datetime.date range")
        return d

    def isoformat(self) -> str:
        """``date``-compatible ISO string; BCE years use the astronomical sign."""
        return format_civil_iso(self.year, self.month, self.day)

    # ── `date`-compatible arithmetic ────────────────────────────────────────
    #
    # Enough of the ``date`` interface that day-walking code written against
    # ``date`` keeps working when handed a pre-1 CE day. Ordering comes free and
    # correct from the NamedTuple: comparing ``(year, month, day)`` lexically is
    # already chronological, including across negative years (-37 < -36 < 3).

    def __add__(self, other: timedelta) -> CivilDay:  # type: ignore[override]
        """Shift by whole days. Sub-day parts are truncated, as ``date + timedelta`` does."""
        if not isinstance(other, timedelta):
            return NotImplemented
        return CivilDay.from_jd_ut(self.to_jd_ut() + other.days)

    def __radd__(self, other: timedelta) -> CivilDay:
        return self.__add__(other)

    def __sub__(self, other: object):
        """``CivilDay - timedelta`` → CivilDay; ``CivilDay - day`` → timedelta."""
        if isinstance(other, timedelta):
            return CivilDay.from_jd_ut(self.to_jd_ut() - other.days)
        if isinstance(other, CivilDay):
            return timedelta(days=int(round(self.to_jd_ut() - other.to_jd_ut())))
        if isinstance(other, date):
            return timedelta(
                days=int(round(self.to_jd_ut() - CivilDay.from_date(other).to_jd_ut()))
            )
        return NotImplemented

    # Ordering against a plain ``date`` — tuple comparison alone raises TypeError,
    # and mixed comparisons show up wherever a BCE day meets a CE bound.
    @staticmethod
    def _as_tuple(other: object) -> tuple[int, int, int] | None:
        if isinstance(other, CivilDay):
            return (other.year, other.month, other.day)
        if isinstance(other, date):
            return (other.year, other.month, other.day)
        return None

    def __lt__(self, other: object) -> bool:  # type: ignore[override]
        o = self._as_tuple(other)
        return NotImplemented if o is None else (self.year, self.month, self.day) < o

    def __le__(self, other: object) -> bool:  # type: ignore[override]
        o = self._as_tuple(other)
        return NotImplemented if o is None else (self.year, self.month, self.day) <= o

    def __gt__(self, other: object) -> bool:  # type: ignore[override]
        o = self._as_tuple(other)
        return NotImplemented if o is None else (self.year, self.month, self.day) > o

    def __ge__(self, other: object) -> bool:  # type: ignore[override]
        o = self._as_tuple(other)
        return NotImplemented if o is None else (self.year, self.month, self.day) >= o

    def __eq__(self, other: object) -> bool:
        o = self._as_tuple(other)
        return NotImplemented if o is None else (self.year, self.month, self.day) == o

    def __ne__(self, other: object) -> bool:
        result = self.__eq__(other)
        return result if result is NotImplemented else not result

    # Explicit __eq__ drops the inherited tuple __hash__; keep it hashable so
    # CivilDay can still be a dict key / cache key.
    def __hash__(self) -> int:  # type: ignore[override]
        return hash((self.year, self.month, self.day))

    def __rsub__(self, other: object):
        """``date - CivilDay`` → timedelta (``date.__sub__`` can't handle us)."""
        if isinstance(other, date):
            return timedelta(
                days=int(round(CivilDay.from_date(other).to_jd_ut() - self.to_jd_ut()))
            )
        return NotImplemented

    def weekday(self) -> int:
        """Monday == 0, matching ``date.weekday()``.

        ``int(jd_ut + 0.5)`` is the Julian Day Number, whose residue mod 7 already
        lands Monday on 0 — verified against ``date.weekday()`` across 1900–2100.
        """
        return int(self.to_jd_ut() + 0.5) % 7

    def isoweekday(self) -> int:
        return self.weekday() + 1

    def replace(self, year: int | None = None, month: int | None = None, day: int | None = None) -> CivilDay:
        return CivilDay(
            self.year if year is None else year,
            self.month if month is None else month,
            self.day if day is None else day,
        )

    @classmethod
    def from_jd_ut(cls, jd_ut: float) -> CivilDay:
        y, m, d = civil_parts_from_jd_ut(jd_ut)
        return cls(y, m, d)

    @classmethod
    def from_date(cls, d: date) -> CivilDay:
        return cls(d.year, d.month, d.day)


_MONTH_FULL = (
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
)
_MONTH_ABBR = tuple(name[:3] for name in _MONTH_FULL)
# weekday() is Monday == 0, matching ``date.weekday()``.
_WEEKDAY_FULL = (
    "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
)
_WEEKDAY_ABBR = tuple(name[:3] for name in _WEEKDAY_FULL)


def format_civil_strftime(
    fmt: str,
    *,
    year: int,
    month: int,
    day: int,
    weekday: int,
    hour: int = 0,
    minute: int = 0,
    second: int = 0,
) -> str:
    """``strftime`` for the directives this codebase actually uses, BCE included.

    Supports %Y %m %d %-d %H %M %S %B %b %A %a %I %p and %%. ``datetime.strftime``
    cannot be used here because the values may describe a pre-1 CE instant, and
    C library ``strftime`` rejects non-positive years outright. Anything outside
    the supported set is left verbatim so an unhandled directive is visible in
    output rather than silently wrong.
    """
    hour12 = hour % 12 or 12
    table = {
        "%Y": f"-{abs(year):04d}" if year < 0 else f"{year:04d}",
        "%m": f"{month:02d}",
        "%d": f"{day:02d}",
        "%-d": str(day),
        "%H": f"{hour:02d}",
        "%M": f"{minute:02d}",
        "%S": f"{second:02d}",
        "%I": f"{hour12:02d}",
        "%p": "AM" if hour < 12 else "PM",
        "%B": _MONTH_FULL[month - 1],
        "%b": _MONTH_ABBR[month - 1],
        "%A": _WEEKDAY_FULL[weekday],
        "%a": _WEEKDAY_ABBR[weekday],
        "%%": "%",
    }
    out: list[str] = []
    i = 0
    while i < len(fmt):
        if fmt[i] != "%":
            out.append(fmt[i])
            i += 1
            continue
        for width in (3, 2):  # try "%-d" before "%d"
            token = fmt[i : i + width]
            if token in table:
                out.append(table[token])
                i += width
                break
        else:
            out.append(fmt[i])
            i += 1
    return "".join(out)


def civil_day_jd_ut(year: int, month: int, day: int, *, hour_ut: float = 0.0) -> float:
    """JD for a civil (y, m, d) at ``hour_ut`` UT — delegates to Swiss Ephemeris."""
    return float(swe.julday(int(year), int(month), int(day), float(hour_ut)))


def civil_day_jd_from_date(d: date) -> float:
    return civil_day_jd_ut(d.year, d.month, d.day)


def civil_parts_from_jd_ut(jd_ut: float) -> tuple[int, int, int]:
    year, month, day, _hour = swe.revjul(float(jd_ut))
    return int(year), int(month), int(day)


def civil_day_add(jd_ut: float, days: int) -> float:
    return float(jd_ut) + float(days)


def date_if_supported(year: int, month: int, day: int) -> date | None:
    """``datetime.date`` for this civil label, or ``None`` for BCE / year 0."""
    if year < 1:
        return None
    try:
        return date(year, month, day)
    except ValueError:
        return None


def format_civil_iso(year: int, month: int, day: int) -> str:
    """ISO-like civil date string (4-digit year, zero-padded month/day).

    BCE years use astronomical sign (``-0056-03-20`` = 56 BCE).
    """
    if year < 0:
        return f"-{abs(year):04d}-{month:02d}-{day:02d}"
    return f"{year:04d}-{month:02d}-{day:02d}"


def parse_civil_iso(date_key: str) -> CivilDay:
    """Parse ``YYYY-MM-DD`` / ``-YYYY-MM-DD`` civil keys (no time zone)."""
    text = date_key.strip()
    if not text:
        raise ValueError("empty civil date")
    sign = 1
    if text[0] == "-":
        sign = -1
        text = text[1:]
    elif text[0] == "+":
        text = text[1:]
    parts = text.split("-")
    if len(parts) != 3:
        raise ValueError(f"expected YYYY-MM-DD, got {date_key!r}")
    year = sign * int(parts[0])
    month = int(parts[1])
    day = int(parts[2])
    if not 1 <= month <= 12 or not 1 <= day <= 31:
        raise ValueError(f"invalid civil date {date_key!r}")
    return CivilDay(year, month, day)


def civil_iso_from_date(d: date) -> str:
    return format_civil_iso(d.year, d.month, d.day)


def jd_ut_to_unix_seconds(jd: float) -> float:
    return (float(jd) - JD_UNIX_EPOCH) * 86400.0


def unix_seconds_to_jd_ut(seconds: float) -> float:
    return float(seconds) / 86400.0 + JD_UNIX_EPOCH
