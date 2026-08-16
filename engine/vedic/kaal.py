"""Day-part (kāla) windows and vyāpinī tithi-day selection.

Most festivals fall on the day whose *udaya* (sunrise) tithi matches the rule —
the tithi the printed patro prints against that civil day. A handful do not:
their observance is tied to a particular part of the day, and the date is the
day on which the tithi **pervades** (vyāpinī) that part, whatever the sunrise
tithi happens to be.

Two such kālas matter for the Nepali patro:

``madhyahna``
    The third of five equal parts of daylight — midday. Vijaya Dashami takes
    the day Daśamī pervades it. In 2024 Daśamī ran 10-12 11:14 → 10-13 09:24
    NPT: present at midday on the 12th, gone by midday on the 13th, so Tika was
    the 12th even though the 13th is the udaya-Daśamī day.

``pradosh``
    The first fifth of the night, from sunset. Laxmi Puja takes the day
    Amāvasyā pervades it, which is why the lamps are lit on 2022-10-24 (the
    Amāvasyā begins 17:43, minutes after sunset) rather than on the 25th, whose
    sunrise it also covers.

``aparahna`` — the fourth fifth of daylight — is defined here too; it is the
kāla several Śrāddha rules cite, though no rule uses it yet.

Both windows are proportional rather than fixed clock spans, so they stay
meaningful away from Kathmandu's latitude, where daylight is not ~12 hours.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Literal, Optional

from engine.astronomy.location import DEFAULT_LOCATION, ObserverLocation
from engine.astronomy.sun import calculate_sunrise, calculate_sunset
from engine.astronomy.timescale import resolve_observer_timezone

Kaal = Literal["madhyahna", "aparahna", "pradosh"]

KAAL_NAMES: tuple[str, ...] = ("madhyahna", "aparahna", "pradosh")

# Which fifth of the daylight span each daytime kala occupies (0-based).
_DAY_FIFTH: dict[str, int] = {"madhyahna": 2, "aparahna": 3}


def kaal_window(
    day: date,
    kaal: Kaal,
    location: ObserverLocation = DEFAULT_LOCATION,
) -> tuple[datetime, datetime]:
    """The (start, end) instants of ``kaal`` on ``day`` at ``location``."""
    sunrise = calculate_sunrise(
        day,
        latitude=location.lat,
        longitude=location.lon,
        timezone_name=location.timezone,
    )
    sunset = calculate_sunset(
        day,
        latitude=location.lat,
        longitude=location.lon,
        timezone_name=location.timezone,
    )

    if kaal in _DAY_FIFTH:
        part = (sunset - sunrise) / 5
        index = _DAY_FIFTH[kaal]
        return sunrise + index * part, sunrise + (index + 1) * part

    if kaal == "pradosh":
        next_sunrise = calculate_sunrise(
            day + timedelta(days=1),
            latitude=location.lat,
            longitude=location.lon,
            timezone_name=location.timezone,
        )
        return sunset, sunset + (next_sunrise - sunset) / 5

    raise ValueError(f"Unknown kaal: {kaal!r}")


def _overlap_seconds(
    a_start: datetime, a_end: datetime, b_start: datetime, b_end: datetime
) -> float:
    latest_start = max(a_start, b_start)
    earliest_end = min(a_end, b_end)
    return max((earliest_end - latest_start).total_seconds(), 0.0)


def vyapini_date(
    tithi_start: datetime,
    tithi_end: datetime,
    kaal: Kaal,
    location: ObserverLocation = DEFAULT_LOCATION,
) -> Optional[date]:
    """The civil day on which a tithi pervades ``kaal``, or None if it never does.

    A tithi runs 19–26 hours, so it can reach the same kāla on two consecutive
    days; the day it covers more of wins, earlier day breaking an exact tie. It
    can also fall entirely between two of them — a kṣaya tithi that opens after
    one midday and closes before the next — and then there is no vyāpinī day at
    all and the caller falls back to the udaya rule.
    """
    local_tz = resolve_observer_timezone(location.timezone)
    first = tithi_start.astimezone(local_tz).date()
    last = tithi_end.astimezone(local_tz).date()

    best: Optional[date] = None
    best_overlap = 0.0
    day = first
    while day <= last:
        window_start, window_end = kaal_window(day, kaal, location)
        overlap = _overlap_seconds(tithi_start, tithi_end, window_start, window_end)
        if overlap > best_overlap:
            best, best_overlap = day, overlap
        day += timedelta(days=1)

    return best
