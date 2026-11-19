"""What a day's panchanga says, for festival tests that must never compare English dates.

A lunar festival is a tithi, a solar one a sankranti, a fixed one a BS date; only a
Gregorian-fixed day (``ad_fixed``) or an announced one (Eid) is an English date.
"""

from __future__ import annotations

from datetime import date, timedelta

from engine.astronomy.location import DEFAULT_LOCATION
from engine.astronomy.sun import calculate_sunrise
from engine.astronomy.ut_instant import as_julian_day
from engine.calendar.bikram_sambat import gregorian_to_bs
from engine.panchanga.angas import panchanga_service

_STEP_DAYS = 1 / 48  # a tithi lasts at least ~19 hours: half-hour samples see every one


def _sunrise_jd(day: date) -> float:
    loc = DEFAULT_LOCATION
    return as_julian_day(calculate_sunrise(day, loc.lat, loc.lon, timezone_name=loc.timezone))


def tithis_of(day: date) -> tuple[int, set[int]]:
    """(tithi at sunrise, every tithi that runs before the next sunrise), numbered 1–30."""
    start, end = _sunrise_jd(day), _sunrise_jd(day + timedelta(days=1))
    at_sunrise = panchanga_service.tithi_number(start)
    seen = {at_sunrise}
    jd = start
    while jd < end:
        seen.add(panchanga_service.tithi_number(jd))
        jd += _STEP_DAYS
    return at_sunrise, seen


def tithi(number: int, paksha: str) -> int:
    """1–30 from a rule's tithi (1–15) and paksha."""
    return number + (15 if paksha == "krishna" else 0)


def runs_on(day: date | str, number: int, paksha: str) -> bool:
    """The tithi runs on that civil day (between its sunrise and the next)."""
    day = date.fromisoformat(day) if isinstance(day, str) else day
    return tithi(number, paksha) in tithis_of(day)[1]


def bs_of(day: date | str) -> tuple[int, int, int]:
    return gregorian_to_bs(date.fromisoformat(day) if isinstance(day, str) else day)


def off_its_definition(festival: dict, rule: dict) -> str | None:
    """Why a festival's day is not one its rule names, or None when it is."""
    day = date.fromisoformat(festival["start_date"])
    kind = rule.get("type")
    if kind == "lunar" and rule.get("tithi") and rule.get("paksha"):
        want = tithi(rule["tithi"], rule["paksha"])
        at_sunrise, seen = tithis_of(day)
        if want not in seen:
            return f"tithi {want} does not run on its day (sunrise {at_sunrise})"
        selection = rule.get("date_selection", "udaya")
        next_sunrise = tithis_of(day + timedelta(days=1))[0]
        if selection == "udaya" and at_sunrise != want and next_sunrise == want:
            return f"tithi {want} holds the next sunrise, not this day's"
        if selection == "para_yuta":
            # Joined with the next tithi, never the one before: on a day it holds sunrise
            # (the second, when it holds two); only a kshaya tithi may sit off sunrise.
            if next_sunrise == want:
                return f"tithi {want} holds the next sunrise too: that day is the one joined with the next"
            if at_sunrise != want and tithis_of(day - timedelta(days=1))[0] == want:
                return f"tithi {want} held the previous sunrise"
    elif kind == "solar" and rule.get("bs_month"):
        if bs_of(day)[1:] != (rule["bs_month"], 1):
            return f"not on the first day (sankranti) of BS month {rule['bs_month']}"
    elif kind == "bs_fixed" and rule.get("bs_month") and not rule.get("alias_of"):
        if bs_of(day)[1:] != (rule["bs_month"], rule["bs_day"]):
            return f"not on BS {rule['bs_month']}/{rule['bs_day']}"
    return None
