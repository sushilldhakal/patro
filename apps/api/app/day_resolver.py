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

The conversions themselves live in :mod:`engine.calendar.era` and
:mod:`engine.calendar.date_keys`; this module only chooses which one applies.
"""

from __future__ import annotations

from starlette.requests import Request

from app.relative_day import is_relative_day_key, normalize_day_key, relative_day_jd_ut, today_jd_ut
from engine.calendar.date_keys import DayResolutionError, parse_date_key


def _era_ctx(request: Request):
    return getattr(request.state, "era_ctx", None)


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
        return parse_date_key(date_key, input_era)

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
