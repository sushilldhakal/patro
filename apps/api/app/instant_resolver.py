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
:func:`instant_for_request` and never parse any of them themselves. The
resolution itself is :mod:`engine.panchanga.instants`; this module only reads
the request.
"""

from __future__ import annotations

from datetime import datetime as _datetime

from engine.panchanga.instants import (  # noqa: F401 - re-exported for the routers
    birth_instant_from_query,
    instant_at,
    instant_for_parts,
)


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

    The request contributes only the day the era middleware resolved from its
    ``inputEra`` + parts; :func:`engine.panchanga.instants.instant_at` does the
    rest. Raises ``ValueError`` for anything unusable, so callers surface a 400.
    """
    day_jd = jd if jd is not None else (_era_jd(request) if request is not None else None)
    return instant_at(
        datetime_raw=datetime_raw, jd=day_jd, clock=clock, timezone_name=timezone_name, lat=lat, lon=lon,
    )
