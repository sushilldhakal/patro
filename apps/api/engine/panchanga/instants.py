"""A moment named by its parts — the resolution every chart and "at time" view uses.

Three encodings, one resolution, in precedence order:

* a Julian Day (the civil day, carrying no calendar) plus an observer-local clock;
* era + year/month/day plus a clock — converted to that Julian Day first;
* an ISO datetime — naive values are read in the observer's timezone (the only
  form that cannot address a pre-1 CE moment).

``app.instant_resolver`` adds the one thing a request contributes (the day the
era middleware already resolved); everything else is here.
"""

from __future__ import annotations

from datetime import datetime, timezone

from engine.astronomy.jd_calendar import CivilDay, date_if_supported
from engine.astronomy.timescale import resolve_observer_timezone
from engine.calendar.era import to_jd
from engine.panchanga.at_time import parse_clock_on_date, parse_query_datetime


def instant_at(
    *,
    datetime_raw: str | None,
    jd: float | None,
    clock: str | None,
    timezone_name: str,
    lat: float | None = None,
    lon: float | None = None,
) -> datetime:
    """``jd``+``clock`` or ``datetime`` → a moment. Raises ``ValueError`` when unusable.

    A Julian Day is an identity and an ISO string is a spelling, so the JD form
    wins when both are supplied.
    """
    if jd is not None:
        if not clock:
            raise ValueError(
                "a Julian Day or calendar date needs a clock (observer-local HH:MM) "
                "to name a moment"
            )
        civil = CivilDay.from_jd_ut(float(jd))
        greg = date_if_supported(civil.year, civil.month, civil.day)
        # Pre-1 CE days have no ``datetime.date``; the CivilDay carries them.
        anchor = greg if greg is not None else civil
        return parse_clock_on_date(clock, anchor, timezone_name=timezone_name, lat=lat, lon=lon)
    return parse_query_datetime(datetime_raw, timezone_name=timezone_name, lat=lat, lon=lon)


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
) -> datetime:
    """One moment from its own era + parts (or its own Julian Day).

    Milan names *two* birth moments in a single request, so neither can come
    from the request-wide era context; each person's parts are converted here.
    """
    day_jd = jd
    if day_jd is None and None not in (year, month, day):
        day_jd = to_jd(era or "ad", int(year), int(month), int(day))
    return instant_at(
        datetime_raw=datetime_raw, jd=day_jd, clock=clock, timezone_name=timezone_name, lat=lat, lon=lon,
    )


def local_birth_instant(birth: str, birth_tz: str) -> datetime:
    """Naive local birth datetime (``YYYY-MM-DDTHH:MM``) → a UTC instant."""
    local = datetime.fromisoformat(birth)
    if local.tzinfo is None:
        local = local.replace(tzinfo=resolve_observer_timezone(birth_tz))
    return local.astimezone(timezone.utc)


def birth_instant_from_query(
    *,
    birth: str | None = None,
    birth_tz: str = "Asia/Kathmandu",
    birth_era: str | None = None,
    birth_year: int | None = None,
    birth_month: int | None = None,
    birth_day: int | None = None,
    birth_clock: str | None = None,
    lat: float | None = None,
    lon: float | None = None,
) -> datetime:
    """A saved profile's birth moment. Era parts win over a Gregorian ISO.

    Clients send the profile's stored ``birth_date`` / ``birth_era`` / clock
    (and timezone) and this is the only place those become an instant. The
    older ``birth=YYYY-MM-DDTHH:MM`` form stays for callers that already hold
    a Gregorian civil datetime.
    """
    clock = birth_clock
    if not clock and birth and "T" in birth:
        clock = birth.split("T", 1)[1]

    if None not in (birth_year, birth_month, birth_day):
        return instant_for_parts(
            era=birth_era or "ad",
            year=int(birth_year),
            month=int(birth_month),
            day=int(birth_day),
            clock=clock or "12:00",
            datetime_raw=None,
            jd=None,
            timezone_name=birth_tz,
            lat=lat,
            lon=lon,
        )

    if birth:
        return local_birth_instant(birth, birth_tz)

    raise ValueError(
        "Provide birth_era + birth_year/month/day + birth_clock, or a birth datetime."
    )
