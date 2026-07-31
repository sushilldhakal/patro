"""The one place a request's *instant* becomes a concrete moment in time.

The day pipeline (:mod:`app.day_resolver`) resolves a whole civil day to a Julian
Day. Birth charts need finer granularity than a day — a moment — so they are
addressed as a civil day (Julian Day) plus an observer-local clock.

Three encodings, one resolution — in precedence order:

``?jd=&clock=``
    Canonical. The day carries no calendar, exactly as everywhere else in the
    system, and ``clock`` is read in the observer's timezone.

``?inputEra=&year=&month=&day=&clock=``
    The same calendar grammar the day routes use. :class:`~app.era_middleware.
    EraMiddleware` has already turned the parts into a Julian Day, so a client
    can name a birth date in BS (or BBS, or BC) without converting anything
    itself.

``?datetime=``
    An ISO instant. Naive values are read in the observer's timezone. This is
    the only form that cannot address a pre-1 CE birth moment.

All three land on the same aware ``datetime``. Handlers should call
:func:`instant_for_request` and never parse any of them themselves.
"""

from __future__ import annotations

from datetime import datetime as _datetime


def _era_jd(request) -> float | None:
    """JD the era middleware resolved, but only when the caller named a real date.

    ``era_ctx.julian`` falls back to the observer's today when no parts were
    given; that default must not silently become somebody's birth moment.
    """
    ctx = getattr(getattr(request, "state", None), "era_ctx", None)
    if ctx is None or ctx.julian is None:
        return None
    if ctx.from_jd_param:
        return ctx.julian
    if None in (ctx.year, ctx.month, ctx.day):
        return None
    return ctx.julian


def instant_for_parts(
    *,
    era: str | None,
    year: int | None,
    month: int | None,
    day: int | None,
    clock: str | None,
    datetime_raw: str | None,
    jd: float | None,
    timezone_name: str,
    lat: float | None = None,
    lon: float | None = None,
) -> _datetime:
    """One moment, addressed independently of the request-wide era context.

    Milan names *two* birth moments in a single request, so neither can come from
    :class:`~app.era_middleware.EraMiddleware` — that resolves one date per
    request. Each person therefore carries their own era + parts (or their own
    Julian Day), converted here through the same codec as everything else.
    """
    from engine.calendar.era import to_jd

    day_jd = jd
    if day_jd is None and None not in (year, month, day):
        try:
            day_jd = to_jd(era or "ad", int(year), int(month), int(day))
        except ValueError as exc:
            raise ValueError(str(exc)) from exc

    return instant_for_request(
        datetime_raw=datetime_raw,
        jd=day_jd,
        clock=clock,
        timezone_name=timezone_name,
        lat=lat,
        lon=lon,
    )


def instant_for_request(
    *,
    datetime_raw: str | None,
    jd: float | None,
    clock: str | None,
    timezone_name: str,
    lat: float | None = None,
    lon: float | None = None,
    request=None,
) -> _datetime:
    """Resolve ``jd``+``clock``, era parts + ``clock``, or ``datetime`` to a moment.

    A Julian Day is an identity and an ISO string is a spelling, so the JD forms
    win when more than one is supplied. Raises ``ValueError`` for anything
    unusable, so callers surface a 400 the same way they already do.
    """
    from engine.vedic.at_time import parse_clock_on_date, parse_query_datetime
    from services.panchanga_api import resolve_panchanga_jd_ut

    day_jd = jd if jd is not None else (_era_jd(request) if request is not None else None)

    if day_jd is not None:
        if not clock:
            raise ValueError(
                "a Julian Day or calendar date needs a clock (observer-local HH:MM) "
                "to name a moment"
            )
        _, civil, greg = resolve_panchanga_jd_ut(day_jd)
        # Pre-1 CE days have no ``datetime.date``; the CivilDay carries them.
        anchor = greg if greg is not None else civil
        return parse_clock_on_date(
            clock,
            anchor,
            timezone_name=timezone_name,
            lat=lat,
            lon=lon,
        )

    return parse_query_datetime(
        datetime_raw,
        timezone_name=timezone_name,
        lat=lat,
        lon=lon,
    )
