"""The one place a day-scoped request becomes a Julian Day.

Day routes call :func:`day_jd_for_request` and receive a number. They do not
learn which calendar the caller used, whether the day was addressed by JD, by
calendar parts, by a date string, or by the word "today" — those are all
input encodings, and this module is where they stop being visible.

Precedence, highest first:

1. ``?jd=`` — already an identity, nothing to convert.
2. ``?year=&month=&day=`` read in ``?inputEra=`` — the canonical calendar form.
3. A relative path segment (``today``/``tomorrow``/``now``) — resolved as an
   *instant* at the observer's location, never parsed as a date.
4. A ``{date_key}`` path segment (``2083-10-12``), parsed in the input era.
5. Nothing at all — the observer's current day.

The conversions themselves live in :mod:`engine.calendar.era`; this module only
chooses which one applies.
"""

from __future__ import annotations

from starlette.requests import Request

from app.relative_day import is_relative_day_key, normalize_day_key, relative_day_jd_ut, today_jd_ut
from engine.astronomy.engine import EphemerisError
from engine.calendar.era import to_jd


class DayResolutionError(ValueError):
    """The request did not describe a day this system can address."""


def _era_ctx(request: Request):
    return getattr(request.state, "era_ctx", None)


def _parse_date_key(date_key: str, era: str) -> float:
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
        from engine.astronomy.jd_calendar import parse_civil_iso

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
    from engine.astronomy.jd_calendar import CivilDay, date_if_supported

    if is_relative_day_key(date_key):
        raise DayResolutionError(
            f"{date_key!r} names an instant, not a calendar date; "
            "use /panchanga/today (or /tomorrow), or pass ?jd="
        )

    civil = CivilDay.from_jd_ut(_parse_date_key(date_key, era))
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
    from engine.astronomy.jd_calendar import CivilDay

    try:
        return CivilDay.from_jd_ut(_parse_date_key(date_key, era))
    except (DayResolutionError, ValueError):
        return None


def day_jd_for_request(request: Request, date_key: str | None = None) -> float:
    """Resolve whatever this request used to name a day into a Julian Day."""
    ctx = _era_ctx(request)
    params = request.query_params

    if ctx is not None:
        # Addressed by JD, or by explicit calendar parts the middleware already
        # converted — both outrank anything sitting in the path.
        if ctx.from_jd_param and ctx.julian is not None:
            return ctx.julian
        if ctx.julian is not None and None not in (ctx.year, ctx.month, ctx.day):
            return ctx.julian

    if date_key is not None:
        key = normalize_day_key(date_key)
        if is_relative_day_key(key):
            try:
                return relative_day_jd_ut(key, params)
            except ValueError as exc:
                raise DayResolutionError(str(exc)) from exc
        # The input era, not the display era, decides how to read the string.
        input_era = (ctx.input_era if ctx is not None else None) or _input_era(params)
        return _parse_date_key(date_key, input_era)

    if ctx is not None and ctx.julian is not None:
        return ctx.julian
    return today_jd_ut(params)


def _input_era(params) -> str:
    """Input calendar for a bare ``{date_key}`` when the caller named none.

    ``inputEra`` is the explicit spelling. ``era`` is accepted as a fallback
    because a path-addressed day has no other way to say which calendar its
    string is written in; it still has no effect on how the response is
    labelled. BS is the default, matching what these paths address.
    """
    raw = (params.get("inputEra") or params.get("input_era") or params.get("era") or "").strip().lower()
    return raw or "bs"
