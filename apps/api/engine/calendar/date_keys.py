"""A calendar date written as text (``2083-10-12``) → the day it names.

The path segment of a day route is an *input encoding*: it is read in an era,
becomes a Julian Day here and is never seen again (``?jd=`` and
``?year=&month=&day=&inputEra=`` are the other two encodings; all three land
in the same place). Which encoding a request used is decided in
``app.day_resolver``; reading the text is calendar knowledge and lives here.
"""

from __future__ import annotations

from engine.astronomy.engine import EphemerisError
from engine.astronomy.jd_calendar import CivilDay, date_if_supported, parse_civil_iso
from engine.calendar.day_keys import is_relative_day_key
from engine.calendar.era import to_jd


class DayResolutionError(ValueError):
    """The request did not describe a day this system can address."""


def parse_date_key(date_key: str, era: str) -> float:
    """A ``Y-M-D`` path segment → JD, read in ``era``.

    The calendar string is an *input encoding*: it becomes a Julian Day here and
    is never seen again. ``?jd=`` and ``?year=&month=&day=&inputEra=`` are the
    other two encodings; all three land in the same place.
    """
    text = date_key.strip()

    # A leading '-' is an astronomical (proleptic, BCE) ISO year. That spelling
    # predates the era codes and only ever appears in a path, so it is decoded
    # here rather than teaching `to_jd` about signed years.
    if text.startswith("-"):
        try:
            return parse_civil_iso(text).to_jd_ut()
        except Exception as exc:  # noqa: BLE001 - surfaced as a 400 by the caller
            raise DayResolutionError(f"{date_key!r} is not a date this era can read") from exc

    parts = text.split("-")
    if len(parts) != 3:
        raise DayResolutionError(
            f"{date_key!r} is not a Y-M-D date; use ?jd= or ?year=&month=&day="
        )
    try:
        year, month, day = (int(p) for p in parts)
    except ValueError as exc:
        raise DayResolutionError(
            f"{date_key!r} is not a Y-M-D date; use ?jd= or ?year=&month=&day="
        ) from exc

    try:
        return to_jd(era, year, month, day)
    except ValueError as exc:
        raise DayResolutionError(str(exc)) from exc
    except EphemerisError as exc:
        # A year can be on the axis and still have no ephemeris behind it (the
        # .se1 files are per-machine). That is a bad request, not a server fault.
        raise DayResolutionError(
            f"{era} year {year} is outside the installed ephemeris range, so no "
            "panchanga can be computed for it"
        ) from exc


def greg_date_for_date_key(date_key: str, era: str):
    """A ``Y-M-D`` string in ``era`` → Gregorian ``date``, resolved through JD.

    The single converter for day-scoped routes that still hand a ``date`` to the
    engine. There is no second path from a calendar label to a day: everything
    goes through :func:`engine.calendar.era.to_jd` and back out of the JD.

    Raises :class:`DayResolutionError` (a ``ValueError``) for anything that is not
    a day this can address — including a relative key, which names an instant and
    belongs on ``/today`` rather than in a date parser.
    """
    if is_relative_day_key(date_key):
        raise DayResolutionError(
            f"{date_key!r} names an instant, not a calendar date; "
            "use /panchanga/today (or /tomorrow), or pass ?jd="
        )

    civil = CivilDay.from_jd_ut(parse_date_key(date_key, era))
    greg = date_if_supported(civil.year, civil.month, civil.day)
    if greg is None:
        raise DayResolutionError(
            f"{date_key} is before 1 CE; address it with ?jd= on a route that supports it"
        )
    return greg


def civil_day_for_date_key(date_key: str, era: str):
    """``CivilDay`` for a ``Y-M-D`` string in ``era``, or ``None`` if unreadable.

    For range endpoints whose bounds arrive as strings and may fall outside the
    Gregorian ``date`` range (early BS, BCE). ``None`` means "not resolvable
    here" and lets the caller fall through to its own error path — it is not an
    assertion that the date is invalid.
    """
    if is_relative_day_key(date_key):
        return None
    try:
        return CivilDay.from_jd_ut(parse_date_key(date_key, era))
    except (DayResolutionError, ValueError):
        return None
