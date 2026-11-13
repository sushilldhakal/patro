"""The tropical year — the ONE source of truth for ऋतु and अयन.

Every ritu and every Uttarayana / Dakshinayana the server produces comes from
this module: the daily panchanga, the month and year grids, the seasons page,
the साइत / muhurta rules, the birth panchanga and the festival days that mark
the Sun's turn. Nothing else may cut a season or an ayana from a longitude.

Both are read from the Sun's tropical (sayana) longitude — its place against
the equinox — never from the sidereal rashi (Makar / Karka Sankranti lag the
solstices by the ayanamsa). Under drik that is the real sky from the Swiss
Ephemeris. A Surya Siddhanta request may not consult the ephemeris, so there
the text's Sun is turned tropical by the real precession, not by the text's
trepidating ayanamsha (see ``sun_longitude``).

* ऋतु — six 60° arcs from 330°: Vasanta 330–30 (vernal equinox mid-arc),
  Grishma 30–90, Varsha from the June solstice (90°), Sharad 150–210 (autumnal
  equinox mid-arc), Hemanta 210–270, Shishira from the December solstice (270°).
  South of the equator the same arc is the opposite season, three ritus on.
* अयन — Uttarayana from the December solstice (270°) to the June solstice (90°),
  Dakshinayana from 90° to 270°.
"""

from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Any

SUN_DEG_PER_DAY = 360 / 365.2422

#: Tropical longitude where Vasanta (ritu slot 0) begins.
VASANTA_START_DEG = 330
#: Tropical longitudes where the Sun turns north / south (the solstices).
UTTARAYANA_START_DEG = 270
DAKSHINAYANA_START_DEG = 90
#: South of the equator the same arc of the Sun's path is the opposite season.
SOUTHERN_RITU_SHIFT = 3

RITU_DATA = [
    {"number": 1, "name": "Vasanta", "name_sanskrit": "Vasanta", "name_ne": "वसन्त", "season": "Spring"},
    {"number": 2, "name": "Grishma", "name_sanskrit": "Grishma", "name_ne": "ग्रीष्म", "season": "Summer"},
    {"number": 3, "name": "Varsha", "name_sanskrit": "Varsha", "name_ne": "वर्षा", "season": "Monsoon"},
    {"number": 4, "name": "Sharad", "name_sanskrit": "Sharad", "name_ne": "शरद", "season": "Autumn"},
    {"number": 5, "name": "Hemanta", "name_sanskrit": "Hemanta", "name_ne": "हेमन्त", "season": "Pre-winter"},
    {"number": 6, "name": "Shishira", "name_sanskrit": "Shishira", "name_ne": "शिशिर", "season": "Winter"},
]

_RITU_KEYS = ("number", "name", "name_sanskrit", "name_ne", "season")


# ── the Sun ──────────────────────────────────────────────────────────────────

def _drik():
    from engine.astronomy.siddhanta import DRIK, siddhanta

    return siddhanta(DRIK).engine


def julian_day(moment: datetime) -> float:
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=timezone.utc)
    return _drik().julian_day(moment)


#: Real precession of the equinoxes: the IAU 2006 general precession in longitude,
#: linear term (5028.796195″ per Julian century). Linear on purpose: it carries
#: the equinox round at the real ~25,770-year rate for any date, where the
#: polynomial's higher terms run away outside a few millennia.
PRECESSION_DEG_PER_DAY = 5028.796195 / 3600 / 36525
#: Lahiri ayanamsha at J2000.0 (23° 51′ 11″) — anchors that drift to the sidereal frame.
AYANAMSHA_J2000_DEG = 23.853056
J2000 = 2451545.0


def precession_ayanamsha(jd: float) -> float:
    """Sidereal → tropical offset from the real, steady precession (not a trepidation)."""
    return AYANAMSHA_J2000_DEG + (jd - J2000) * PRECESSION_DEG_PER_DAY


def sun_longitude(jd: float) -> float:
    """Tropical (sayana) Sun longitude [0, 360) — where the Sun is against the equinox.

    * Drik (the default): the apparent tropical longitude from the Swiss Ephemeris,
      the real sky.
    * Surya Siddhanta: such a request never consults the ephemeris (it reaches dates
      the ephemeris does not cover, back to the Satya Yuga). So the Sun's place comes
      from the text itself (its nirayana longitude) and is turned tropical by the
      REAL precession above — not by the text's own trepidating ayanamsha (±27°,
      which would drift the seasons away from the solstices). Ritu and ayana stay
      tropical under both systems.
    """
    from engine.astronomy.siddhanta import DRIK, current_siddhanta

    active = current_siddhanta()
    if active.id == DRIK:
        return _drik().sun_longitude(jd, sidereal=False) % 360.0
    return (active.engine.sun_longitude(jd, sidereal=True) + precession_ayanamsha(jd)) % 360.0


def signed_diff(deg: float) -> float:
    return ((deg % 360) + 540) % 360 - 180


def crossing_jd(target_deg: float, guess_jd: float) -> float:
    """JD at which the tropical Sun reaches *target_deg*, refined from *guess_jd*."""
    jd = guess_jd
    for _ in range(12):
        jd -= signed_diff(sun_longitude(jd) - target_deg) / SUN_DEG_PER_DAY
    return jd


def jd_to_utc(jd: float) -> datetime:
    return _drik().datetime_from_jd(jd)


# ── ritu ─────────────────────────────────────────────────────────────────────

def ritu_slot(longitude: float) -> int:
    """0–5 ritu slot (northern) of a tropical longitude: 0 Vasanta … 5 Shishira."""
    return int(((longitude - VASANTA_START_DEG) % 360) // 60)


def slot_start_deg(slot: int) -> int:
    return (VASANTA_START_DEG + slot * 60) % 360


def is_southern(lat: float | None) -> bool:
    return lat is not None and lat < 0


def ritu_at(jd: float, lat: float | None = None) -> dict[str, Any]:
    """The season at the observer at *jd*."""
    lon = sun_longitude(jd)
    slot = ritu_slot(lon)
    south = is_southern(lat)
    ritu = RITU_DATA[(slot + SOUTHERN_RITU_SHIFT) % 6 if south else slot]
    return {
        **{k: ritu[k] for k in _RITU_KEYS},
        "solar_slot": slot,
        "sun_rashi": int(lon // 30) % 12 + 1,
        "basis": "tropical_southern" if south else "tropical",
    }


# ── ayana ────────────────────────────────────────────────────────────────────

def is_uttarayana(longitude: float) -> bool:
    """Sun between the December solstice (270°) and the June solstice (90°)."""
    return longitude >= UTTARAYANA_START_DEG or longitude < DAKSHINAYANA_START_DEG


def ayana_at(jd: float) -> dict[str, Any]:
    lon = sun_longitude(jd)
    uttara = is_uttarayana(lon)
    return {
        "name": "Uttarayana" if uttara else "Dakshinayana",
        "name_ne": "उत्तरायण" if uttara else "दक्षिणायण",
        "name_sanskrit": "Uttarayana" if uttara else "Dakshinayana",
        "sun_rashi": int(lon // 30) % 12 + 1,
        "basis": "tropical",
        "kranti_mark": "उ" if uttara else "द",
    }


def ayana_turn_jd(gregorian_year: int, ayana: str) -> float:
    """JD of the solstice at which the Sun turns north (``"uttara"``) or south (``"dakshina"``)."""
    if ayana == "uttara":
        target, guess = UTTARAYANA_START_DEG, datetime(gregorian_year, 12, 21, 12, tzinfo=timezone.utc)
    elif ayana == "dakshina":
        target, guess = DAKSHINAYANA_START_DEG, datetime(gregorian_year, 6, 21, 12, tzinfo=timezone.utc)
    else:
        raise ValueError(f"ayana must be 'uttara' or 'dakshina'; got {ayana!r}")
    return crossing_jd(target, julian_day(guess))


def ayana_start_date(gregorian_year: int, ayana: str, location: Any) -> date:
    """First local day of the new ayana at *location* — the first day whose sunrise
    falls after the solstice, the same sunrise rule the panchanga day uses."""
    from datetime import timedelta

    from engine.astronomy.sun import calculate_sunrise
    from engine.astronomy.timescale import resolve_observer_timezone
    from engine.astronomy.ut_instant import as_julian_day

    turn = ayana_turn_jd(gregorian_year, ayana)
    day = jd_to_utc(turn).astimezone(resolve_observer_timezone(location.timezone)).date()
    sunrise = calculate_sunrise(
        day, latitude=location.lat, longitude=location.lon, timezone_name=location.timezone
    )
    return day if as_julian_day(sunrise) >= turn else day + timedelta(days=1)
