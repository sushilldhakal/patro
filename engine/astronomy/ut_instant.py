"""UTC instants as Julian Day — BCE-safe when ``datetime`` cannot represent the year."""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone
from typing import Any, NamedTuple
from zoneinfo import ZoneInfo

import swisseph as swe

from engine.astronomy.timescale import resolve_observer_timezone


_EXPANDED_ISO_RE = re.compile(
    r"^(?P<year>-?\d{1,6})-(?P<month>\d{2})-(?P<day>\d{2})"
    r"[T ](?P<hour>\d{2}):(?P<minute>\d{2})(?::(?P<second>\d{2}(?:\.\d+)?))?"
)


def format_expanded_utc_iso(jd_ut: float) -> str:
    """``±YYYY-MM-DDTHH:MM:SS.ffffff+00:00`` for any JD, BCE included."""
    year, month, day, hour = swe.revjul(float(jd_ut))
    total = max(0.0, float(hour)) * 3600.0
    h = int(total // 3600)
    rem = total - h * 3600
    m = int(rem // 60)
    sec = rem - m * 60
    # Guard the 59.9999→60 rounding seam rather than emitting ":60".
    if sec >= 59.9999995:
        sec = 59.999999
    sign = "-" if year < 0 else ""
    return f"{sign}{abs(year):04d}-{month:02d}-{day:02d}T{h:02d}:{m:02d}:{sec:09.6f}+00:00"


def jd_from_expanded_utc_iso(text: str) -> float:
    """Inverse of :func:`format_expanded_utc_iso` (UTC assumed)."""
    match = _EXPANDED_ISO_RE.match(text)
    if match is None:
        raise ValueError(f"not an expanded ISO instant: {text!r}")
    second = float(match.group("second") or 0.0)
    hour = int(match.group("hour")) + int(match.group("minute")) / 60 + second / 3600
    return swe.julday(
        int(match.group("year")), int(match.group("month")), int(match.group("day")), hour
    )


def _iso_year_is_ce(text: str) -> bool:
    """True when a timestamp's year is ≥ 1, i.e. ``datetime`` can hold it."""
    match = _EXPANDED_ISO_RE.match(text)
    return match is not None and int(match.group("year")) >= 1


@dataclass(frozen=True, slots=True)
class UtInstant:
    """Timezone-aware UT instant stored as ephemeris Julian Day."""

    jd_ut: float

    @property
    def tzinfo(self) -> timezone:
        return timezone.utc

    # ── `datetime`-like UTC field access ────────────────────────────────────
    #
    # Mirrors what ``dt.year`` / ``dt.date()`` give on a UTC-aware datetime, so
    # calendar-walking code that inspects an instant's civil fields keeps working
    # when the instant predates 1 CE.

    @property
    def _utc_parts(self) -> tuple[int, int, int, float]:
        year, month, day, hour = swe.revjul(self.jd_ut)
        return int(year), int(month), int(day), float(hour)

    @property
    def year(self) -> int:
        return self._utc_parts[0]

    @property
    def month(self) -> int:
        return self._utc_parts[1]

    @property
    def day(self) -> int:
        return self._utc_parts[2]

    @property
    def hour(self) -> int:
        return int(self._utc_parts[3])

    @property
    def minute(self) -> int:
        return int((self._utc_parts[3] % 1.0) * 60)

    @property
    def second(self) -> int:
        return int((((self._utc_parts[3] % 1.0) * 60) % 1.0) * 60)

    def date(self):
        """UTC civil day as a :class:`CivilDay` (the ``date`` stand-in)."""
        from engine.astronomy.jd_calendar import CivilDay

        year, month, day, _hour = self._utc_parts
        return CivilDay(year, month, day)

    def strftime(self, fmt: str) -> str:
        """``datetime.strftime`` stand-in — the C library rejects years <= 0."""
        from engine.astronomy.jd_calendar import format_civil_strftime

        year, month, day, _hour = self._utc_parts
        return format_civil_strftime(
            fmt,
            year=year,
            month=month,
            day=day,
            weekday=self.date().weekday(),
            hour=self.hour,
            minute=self.minute,
            second=self.second,
        )

    def astimezone(self, tz: ZoneInfo | timezone | None) -> UtInstant:
        return self

    def isoformat(self) -> str:
        """UTC ISO 8601 with an expanded (possibly negative or zero) year.

        Deliberately the same shape CE instants emit — ``…T05:01:29.000000+00:00``
        — so a client needs one timestamp parser, not two. This used to return a
        ``jd:<float>`` sentinel, which leaked into API payloads on BCE/BBS days:
        `datetime.fromisoformat` blew up on it in the month/wheel builders, and
        anywhere the UI clipped a timestamp to HH:MM it rendered as "jd:16".

        ``parse_ephemeris_instant`` reads this back, and still accepts the legacy
        sentinel so payloads already sitting in the SQLite cache keep working.
        """
        return format_expanded_utc_iso(self.jd_ut)

    def __sub__(self, other: UtInstant | datetime | timedelta) -> timedelta | UtInstant:
        if isinstance(other, timedelta):
            return UtInstant(self.jd_ut - other.total_seconds() / 86400.0)
        if isinstance(other, UtInstant):
            delta_jd = self.jd_ut - other.jd_ut
        elif isinstance(other, datetime):
            from engine.astronomy.engine import default_engine

            delta_jd = self.jd_ut - default_engine.julian_day(
                other.astimezone(timezone.utc)
            )
        else:
            return NotImplemented  # type: ignore[return-value]
        return timedelta(seconds=delta_jd * 86400.0)

    def __add__(self, other: timedelta) -> UtInstant:
        if isinstance(other, timedelta):
            return UtInstant(self.jd_ut + other.total_seconds() / 86400.0)
        return NotImplemented  # type: ignore[return-value]

    def __radd__(self, other: timedelta) -> UtInstant:
        return self.__add__(other)

    def _cmp(self, other: UtInstant | datetime) -> float:
        if isinstance(other, UtInstant):
            return self.jd_ut - other.jd_ut
        from engine.astronomy.engine import default_engine

        return self.jd_ut - default_engine.julian_day(other.astimezone(timezone.utc))

    def __lt__(self, other: object) -> bool:
        if isinstance(other, (UtInstant, datetime)):
            return self._cmp(other) < 0
        return NotImplemented

    def __le__(self, other: object) -> bool:
        if isinstance(other, (UtInstant, datetime)):
            return self._cmp(other) <= 0
        return NotImplemented

    def __gt__(self, other: object) -> bool:
        if isinstance(other, (UtInstant, datetime)):
            return self._cmp(other) > 0
        return NotImplemented

    def __ge__(self, other: object) -> bool:
        if isinstance(other, (UtInstant, datetime)):
            return self._cmp(other) >= 0
        return NotImplemented


class LocalCivilFields(NamedTuple):
    """Observer-local wall clock for an instant, valid for BCE as well as CE."""

    year: int
    month: int
    day: int
    hour: int
    minute: int
    second: int
    offset_seconds: int = 0

    @property
    def civil_day_jd(self) -> float:
        """JD at 0h UT of this local civil day — for day-granularity comparisons."""
        return swe.julday(self.year, self.month, self.day, 0.0)

    def date_iso(self) -> str:
        sign = "-" if self.year < 0 else ""
        return f"{sign}{abs(self.year):04d}-{self.month:02d}-{self.day:02d}"

    def time_short(self) -> str:
        return f"{self.hour:02d}:{self.minute:02d}"

    def offset_iso(self) -> str:
        """``±HH:MM`` — kept so ``iso()`` matches ``datetime.isoformat()`` exactly."""
        total = int(self.offset_seconds)
        sign = "+" if total >= 0 else "-"
        total = abs(total)
        return f"{sign}{total // 3600:02d}:{(total % 3600) // 60:02d}"

    def iso(self) -> str:
        return (
            f"{self.date_iso()}T{self.hour:02d}:{self.minute:02d}:{self.second:02d}"
            f"{self.offset_iso()}"
        )


def local_civil_fields(
    instant: datetime | UtInstant, timezone_name: str
) -> LocalCivilFields:
    """Local civil date + clock for an instant — works for ``datetime`` and ``UtInstant``.

    Lets formatting code that used ``dt.astimezone(tz).date()`` / ``.hour`` keep
    working on pre-1 CE instants, where ``datetime`` cannot represent the year.
    """
    if isinstance(instant, UtInstant):
        tz = resolve_observer_timezone(timezone_name)
        ref = datetime(2000, 6, 15, 12, 0, tzinfo=timezone.utc)
        offset = tz.utcoffset(ref) or timedelta(0)
        year, month, day, local_hour = swe.revjul(
            instant.jd_ut + offset.total_seconds() / 86400.0
        )
        h = int(local_hour)
        m = int((local_hour - h) * 60)
        s = int(round(((local_hour - h) * 60 - m) * 60))
        # Guard the rounding seam so we never emit :60.
        if s >= 60:
            s, m = 0, m + 1
        if m >= 60:
            m, h = 0, h + 1
        return LocalCivilFields(
            int(year), int(month), int(day), h, m, s, int(offset.total_seconds())
        )
    local = instant.astimezone(resolve_observer_timezone(timezone_name))
    local_offset = local.utcoffset() or timedelta(0)
    return LocalCivilFields(
        local.year,
        local.month,
        local.day,
        local.hour,
        local.minute,
        local.second,
        int(local_offset.total_seconds()),
    )


def day_instant_utc(
    day: Any, *, hour: int = 0, minute: int = 0, second: int = 0
) -> datetime | UtInstant:
    """UTC instant at a wall-clock time on a civil day — accepts ``date`` or ``CivilDay``.

    Replaces the ``datetime(d.year, d.month, d.day, h, tzinfo=utc)`` idiom, which
    raises ``year -37 is out of range`` on any pre-1 CE day. CE days still get a
    real ``datetime`` built exactly as before, so CE results are unchanged; BCE
    days fall through to a JD-backed :class:`UtInstant`.
    """
    year, month, dom = day.year, day.month, day.day
    if year >= 1:
        return datetime(year, month, dom, hour, minute, second, tzinfo=timezone.utc)
    from engine.astronomy.jd_calendar import civil_day_jd_ut

    hour_ut = hour + minute / 60.0 + second / 3600.0
    return UtInstant(civil_day_jd_ut(year, month, dom, hour_ut=hour_ut))


def local_wall_instant(
    day: Any,
    timezone_name: str,
    *,
    hour: int = 0,
    minute: int = 0,
    second: int = 0,
) -> datetime | UtInstant:
    """Instant of a local wall-clock time on a civil day — BCE-safe.

    Replaces ``datetime.combine(day, time(h, m, s), tzinfo=tz)``, which rejects a
    ``CivilDay``. CE days take the identical ``combine`` path, so CE results are
    unchanged; BCE days get a JD-backed :class:`UtInstant` at the same wall clock,
    using the zone's fixed offset (the tz database has no BCE coverage anyway).
    """
    tz = resolve_observer_timezone(timezone_name)
    if isinstance(day, date):
        return datetime.combine(day, time(hour, minute, second), tzinfo=tz)
    from engine.astronomy.jd_calendar import civil_day_jd_ut

    ref = datetime(2000, 6, 15, 12, 0, tzinfo=timezone.utc)
    offset_hours = (tz.utcoffset(ref) or timedelta(0)).total_seconds() / 3600.0
    hour_ut = hour + minute / 60.0 + second / 3600.0 - offset_hours
    return UtInstant(civil_day_jd_ut(day.year, day.month, day.day, hour_ut=hour_ut))


def ut_instant_from_jd(jd: float) -> UtInstant | datetime:
    """``datetime`` when CE-representable, else ``UtInstant``."""
    year, _month, _day, _hour = swe.revjul(float(jd))
    if year >= 1:
        from engine.astronomy.engine import default_engine

        return default_engine.datetime_from_jd(jd)
    return UtInstant(float(jd))


def local_weekday_py_from_jd(jd_ut: float, timezone_name: str) -> int:
    """Python weekday (Mon=0) for local civil date at this UT instant."""
    tz = resolve_observer_timezone(timezone_name)
    ref = datetime(2000, 6, 15, 12, 0, tzinfo=timezone.utc)
    offset = tz.utcoffset(ref) or timedelta(0)
    local_jd = float(jd_ut) + offset.total_seconds() / 86400.0
    # ``int(jd + 0.5)`` is the Julian Day Number, whose residue mod 7 already
    # lands Monday on 0 — the same identity CivilDay.weekday() relies on. An
    # extra Sunday→Monday rotation used to be applied here on top of that,
    # putting every BCE vara one day early.
    return int(local_jd + 0.5) % 7


def format_ut_instant_local(
    instant: UtInstant | datetime,
    timezone_name: str,
) -> dict[str, str]:
    """Wall-clock fields for BCE or CE instants."""
    tz = resolve_observer_timezone(timezone_name)
    if isinstance(instant, UtInstant):
        ref = datetime(2000, 6, 15, 12, 0, tzinfo=timezone.utc)
        offset = tz.utcoffset(ref) or timedelta(0)
        local_jd = instant.jd_ut + offset.total_seconds() / 86400.0
        # Date and clock must both come from ``local_jd``. Taking the date from
        # the UTC instant while taking the hour from the local one dropped the
        # midnight rollover, so any Kathmandu time after ~18:15 UTC was stamped
        # with the previous civil day (a yoga ending 05:35 read as the 15th, not
        # the 16th, which looked like an end *before* its own start).
        year, month, day, local_hour = swe.revjul(local_jd)
        h = int(local_hour)
        m = int((local_hour - h) * 60)
        s = int(((local_hour - h) * 60 - m) * 60)
        civil_label = f"{year:04d}-{month:02d}-{day:02d}" if year >= 0 else f"-{abs(year):04d}-{month:02d}-{day:02d}"
        local_iso = f"{civil_label}T{h:02d}:{m:02d}:{s:02d}"
        return {
            "utc_jd": str(instant.jd_ut),
            "local": local_iso,
            "local_time": f"{h:02d}:{m:02d}:{s:02d}",
            "local_time_short": f"{h:02d}:{m:02d}",
        }
    local = instant.astimezone(tz)
    return {
        "utc": instant.astimezone(timezone.utc).isoformat(),
        "local": local.isoformat(),
        "local_time": local.strftime("%H:%M:%S"),
        "local_time_short": local.strftime("%H:%M"),
    }


def as_julian_day(dt: datetime | UtInstant | Any) -> float:
    if isinstance(dt, UtInstant):
        return dt.jd_ut
    from engine.astronomy.engine import default_engine

    return default_engine.julian_day(dt)


def parse_ephemeris_instant(value: str) -> datetime | UtInstant:
    text = value.replace("Z", "+00:00")
    # Legacy sentinel — still in SQLite cache rows written before isoformat()
    # switched to expanded ISO. Keep reading it so old rows stay usable.
    if text.startswith("jd:"):
        return UtInstant(float(text[3:]))
    # Year ≤ 0 has no `datetime`, so it round-trips through JD instead.
    if not _iso_year_is_ce(text):
        return UtInstant(jd_from_expanded_utc_iso(text))
    return datetime.fromisoformat(text)


def parse_local_wall_iso(text: str, timezone_name: str) -> datetime | UtInstant:
    """Observer-local wall clock from muhurta ``start_local`` / ``end_local`` fields."""
    raw = text.strip().replace("Z", "+00:00")
    if re.search(r"[+-]\d{2}:\d{2}$", raw):
        return parse_ephemeris_instant(raw)
    match = _EXPANDED_ISO_RE.match(raw)
    if match is None:
        return parse_ephemeris_instant(raw)
    from engine.astronomy.jd_calendar import CivilDay

    year = int(match.group("year"))
    month = int(match.group("month"))
    day = int(match.group("day"))
    hour = int(match.group("hour"))
    minute = int(match.group("minute"))
    second = int(float(match.group("second") or 0))
    return local_wall_instant(
        CivilDay(year, month, day),
        timezone_name,
        hour=hour,
        minute=minute,
        second=second,
    )


def local_hhmm(instant: datetime | UtInstant, timezone_name: str) -> str:
    if isinstance(instant, UtInstant):
        return format_ut_instant_local(instant, timezone_name)["local_time_short"]
    tz = resolve_observer_timezone(timezone_name)
    return instant.astimezone(tz).strftime("%H:%M")
