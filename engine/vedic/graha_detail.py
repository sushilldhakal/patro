"""
Graha detail builders for the standalone planet-detail pages.

Provides three views mirrored by the frontend:

  * ग्रह स्थिति  — daily full sphuta table for all 9 grahas + लग्न, with
                   rekhamsha, nakshatra/pada, nakshatra lord + KP sub-lord,
                   full sidereal degree, ecliptic latitude (शर), speed
                   (गति °/day), right ascension (विषुवांश) and declination
                   (क्रान्ति).
  * ग्रह अस्त / वक्री — yearly heliacal (asta/udaya) and retrograde (vakri/
                   margi) station timelines over a BS year.
  * चन्द्र / सूर्य ग्रहण — yearly eclipse listing (past + upcoming within the
                   BS year window) with type and local visibility.

All longitudes are sidereal (Lahiri). Equatorial quantities (RA, declination)
are ayanamsha-independent and come straight from the ecliptic→equatorial
transform in the astronomy engine.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Any

from engine.astronomy.jd_calendar import CivilDay
from engine.astronomy.motion import is_retrograde
from engine.astronomy.engine import default_engine
from engine.astronomy.panchanga import NAKSHATRA_NAMES
from engine.astronomy.planets import spashta_table
from engine.astronomy.rashi import RASHI_NAMES, RASHI_NAMES_NE
from engine.astronomy.sun import calculate_sunrise
from engine.astronomy.timescale import resolve_observer_timezone
from engine.astronomy.ut_instant import as_julian_day
from engine.vedic.gochar import GRAHA_META, GRAHA_ORDER, NAKSHATRA_SPAN, PADA_SPAN
from engine.vedic.names_ne import NAKSHATRA_NAMES_NE, to_nepali_digits
from engine.vedic.vimshottari import (
    DASHA_LORD_NE,
    DASHA_SEQUENCE as DASHA_ORDER,
    DASHA_YEARS,
    NAKSHATRA_LORDS_NE,
)

# Vakri (retrograde) rows cover the classical fast+slow grahas — the Moon and
# the nodes never turn retrograde, so they are excluded there.
YEARLY_GRAHAS: list[str] = ["mercury", "venus", "mars", "jupiter", "saturn"]

# Asta (combustion) display order — includes the Moon (चन्द्र तारा अस्त). The
# Moon is combust once every lunation near the new moon; the inner/outer planets
# use the Surya-Siddhanta heliacal orbs from engine.vedic.udayast.
ASTA_PLANET_GRAHAS: list[str] = ["mercury", "venus", "mars", "jupiter", "saturn"]
ASTA_GRAHAS: list[str] = ["mercury", "venus", "moon", "mars", "jupiter", "saturn"]

# Moon Tara Asta combustion orb (Sun–Moon longitudinal elongation, degrees). The
# Moon counts as combust on any civil day it dips below this; the reported window
# runs from moonrise of the first such day to moonset of the last. Calibrated to
# the standard Nepali patro चन्द्र तारा अस्त tables (13°).
MOON_ASTA_ORB = 13.0


# ─── formatting helpers ───────────────────────────────────────────────────────

def _dms_in_rashi(lon: float) -> str:
    """`21° कन्या 53′ 14″` — degree-in-sign with the Nepali rashi name."""
    lon = lon % 360.0
    rashi_idx = int(lon // 30) % 12
    d = lon % 30.0
    deg = int(d)
    m_float = (d - deg) * 60.0
    minute = int(m_float)
    sec = int(round((m_float - minute) * 60))
    if sec >= 60:
        sec -= 60
        minute += 1
    if minute >= 60:
        minute -= 60
        deg += 1
    return f"{deg:02d}° {RASHI_NAMES_NE[rashi_idx]} {minute:02d}′ {sec:02d}″"


def _dms_latitude(lat: float) -> str:
    """`04° द. 45′ 02″` — signed ecliptic latitude, उ. (north) / द. (south)."""
    hemi = "उ." if lat >= 0 else "द."
    a = abs(lat)
    deg = int(a)
    m_float = (a - deg) * 60.0
    minute = int(m_float)
    sec = int(round((m_float - minute) * 60))
    if sec >= 60:
        sec -= 60
        minute += 1
    if minute >= 60:
        minute -= 60
        deg += 1
    return f"{deg:02d}° {hemi} {minute:02d}′ {sec:02d}″"


def _nakshatra_lords(lon: float) -> tuple[str, str]:
    """(nakshatra lord ne, KP sub-lord ne) for a sidereal longitude."""
    lon = lon % 360.0
    nak_idx = int(lon // NAKSHATRA_SPAN) % 27
    star_lord_ne = NAKSHATRA_LORDS_NE[nak_idx]

    # KP sub-lord: vimshottari proportions inside the nakshatra span.
    pos_in_nak = lon - nak_idx * NAKSHATRA_SPAN
    elapsed_years = (pos_in_nak / NAKSHATRA_SPAN) * 120.0
    start_idx = nak_idx % 9
    cumulative = 0.0
    sub_lord = DASHA_ORDER[start_idx]
    for i in range(9):
        lord = DASHA_ORDER[(start_idx + i) % 9]
        cumulative += DASHA_YEARS[lord]
        if elapsed_years < cumulative:
            sub_lord = lord
            break
    return star_lord_ne, DASHA_LORD_NE[sub_lord]


def _pada_for(lon: float) -> tuple[int, int]:
    lon = lon % 360.0
    nak = int(lon // NAKSHATRA_SPAN) % 27
    pos_in_nak = lon % NAKSHATRA_SPAN
    pada = min(int(pos_in_nak / PADA_SPAN) + 1, 4)
    return nak, pada


def _iso(jd: float) -> str:
    return default_engine.datetime_from_jd(jd).isoformat()


# ─── ग्रह स्थिति — daily sphuta table ──────────────────────────────────────────

def _graha_row(graha: str, sid_lon: float, speed: float, extras: dict[str, Any], *,
               is_retro: bool, is_combust: bool) -> dict[str, Any]:
    meta = GRAHA_META[graha]
    nak_idx, pada = _pada_for(sid_lon)
    star_lord_ne, sub_lord_ne = _nakshatra_lords(sid_lon)
    return {
        "graha": graha,
        "name_ne": meta["ne"],
        "name_vedic": meta["vedic"],
        "symbol": meta["symbol"],
        "rekhamsha": _dms_in_rashi(sid_lon),
        "rashi_ne": RASHI_NAMES_NE[int(sid_lon % 360 // 30) % 12],
        "nakshatra": NAKSHATRA_NAMES[nak_idx],
        "nakshatra_ne": NAKSHATRA_NAMES_NE[nak_idx],
        "pada": pada,
        "pada_ne": to_nepali_digits(pada),
        "nakshatra_lord_ne": star_lord_ne,
        "sub_lord_ne": sub_lord_ne,
        "full_degree": round(sid_lon % 360.0, 2),
        "shara": _dms_latitude(extras.get("latitude", 0.0)),
        "shara_deg": round(extras.get("latitude", 0.0), 4),
        "speed_deg_day": round(speed, 2),
        "is_retrograde": is_retro,
        "is_combust": is_combust,
        "right_ascension": round(extras.get("right_ascension", 0.0), 2),
        "declination": round(extras.get("declination", 0.0), 2),
    }


def _build_graha_sthiti_at_sunrise(
    sunrise: Any,
    location: Any,
    *,
    date_ad: str,
    date_bs: str,
) -> dict[str, Any]:
    from engine.astronomy.ut_instant import format_ut_instant_local
    from engine.vedic.udayast import is_heliacally_visible

    tz = resolve_observer_timezone(location.timezone)
    jd = default_engine.julian_day(sunrise)
    positions = spashta_table(as_julian_day(sunrise))

    rows: list[dict[str, Any]] = []

    asc_lon = default_engine.ascendant(jd, location.lat, location.lon)
    asc_extras = default_engine.ascendant_astro_extras(jd, location.lat, location.lon)
    asc_nak_idx, asc_pada = _pada_for(asc_lon)
    asc_star_lord, asc_sub_lord = _nakshatra_lords(asc_lon)
    rows.append({
        "graha": "lagna",
        "name_ne": "लग्न",
        "name_vedic": "Lagna",
        "symbol": "↑",
        "rekhamsha": _dms_in_rashi(asc_lon),
        "rashi_ne": RASHI_NAMES_NE[int(asc_lon % 360 // 30) % 12],
        "nakshatra": NAKSHATRA_NAMES[asc_nak_idx],
        "nakshatra_ne": NAKSHATRA_NAMES_NE[asc_nak_idx],
        "pada": asc_pada,
        "pada_ne": to_nepali_digits(asc_pada),
        "nakshatra_lord_ne": asc_star_lord,
        "sub_lord_ne": asc_sub_lord,
        "full_degree": round(asc_lon % 360.0, 2),
        "shara": _dms_latitude(0.0),
        "shara_deg": 0.0,
        "speed_deg_day": round(asc_extras.get("speed", 0.0), 2),
        "is_retrograde": False,
        "is_combust": False,
        "right_ascension": round(asc_extras.get("right_ascension", 0.0), 2),
        "declination": round(asc_extras.get("declination", 0.0), 2),
    })

    for graha in GRAHA_ORDER:
        pos = positions.get(graha, {})
        sid_lon = float(pos.get("longitude", 0.0))
        speed = float(pos.get("speed", 0.0))
        is_retro = is_retrograde(graha, speed)
        extras = default_engine.planet_astro_extras(jd, graha)
        combust = False
        if graha not in ("sun", "moon", "rahu", "ketu"):
            try:
                combust = not is_heliacally_visible(graha, sunrise)
            except Exception:
                combust = False
        rows.append(_graha_row(
            graha, sid_lon, speed, extras,
            is_retro=is_retro, is_combust=combust,
        ))

    return {
        "date_ad": date_ad,
        "date_bs": date_bs,
        "anchor": "sunrise",
        "timezone": str(tz),
        "sunrise_local": format_ut_instant_local(sunrise, location.timezone)["local"],
        "location": location.as_dict(),
        "rows": rows,
    }


def build_graha_sthiti(
    jd: float, location: Any, *, date_bs: str | None = None
) -> dict[str, Any]:
    """Full daily sphuta table for all 9 grahas + लग्न, computed at sunrise.

    The era-agnostic entry point: *jd* names the civil day, so ad, bc, bs and
    bbs all arrive here the same way. ``sun_service.sunrise`` picks the CE or
    BCE rise helper from the JD itself — the only thing the two merged twins
    actually disagreed about.

    ``date_bs`` is the printed Bikram label. A caller that already resolved the
    day from a BS date key passes its own (that key *is* the answer, and
    re-deriving it can land on a neighbouring day at a month boundary);
    otherwise it is derived here.
    """
    from engine.astronomy.jd_calendar import CivilDay, format_civil_iso
    from engine.astronomy.sun import sun_service

    civil = CivilDay.from_jd_ut(float(jd))
    date_ad = format_civil_iso(civil.year, civil.month, civil.day)
    return _build_graha_sthiti_at_sunrise(
        sun_service.sunrise(float(jd), location),
        location,
        date_ad=date_ad,
        date_bs=date_bs if date_bs is not None else _bs_label_for_ad_key(date_ad),
    )


# ─── ग्रह अस्त / वक्री — yearly station timelines ──────────────────────────────

def _bs_label_for_ad_key(ad: str) -> str | None:
    from engine.astronomy.jd_calendar import date_if_supported, parse_civil_iso
    from engine.vedic.bikram_sambat import format_bs_date, gregorian_to_bs, locate_patro_day_for_civil

    try:
        civil = parse_civil_iso(ad)
        greg = date_if_supported(civil.year, civil.month, civil.day)
        if greg is not None:
            y, m, d = gregorian_to_bs(greg)
        else:
            y, m, d = locate_patro_day_for_civil(civil)
        return format_bs_date(y, m, d)
    except Exception:
        return None


def _bs_year_range(bs_year: int):
    """Civil span of a BS year — ``date`` pair for CE, ``CivilDay`` pair for BCE.

    The CE branch is unchanged (it keeps the BS date overrides that
    ``bs_to_gregorian`` applies). Only years whose start predates 1 CE — where
    ``get_bs_month_start`` has no ``date`` to return and raises — fall through to
    the JD-axis equivalent, so callers on the signed patro axis stop 400ing.
    """
    from engine.vedic.bikram_sambat import (
        bs_to_gregorian,
        bs_year_civil_range,
        get_bs_month_length,
        get_bs_month_start,
    )

    try:
        year_start = get_bs_month_start(bs_year, 1)
        year_end = bs_to_gregorian(bs_year, 12, get_bs_month_length(bs_year, 12))
        return year_start, year_end
    except ValueError:
        return bs_year_civil_range(bs_year)


def _ad_year_range(ad_year: int) -> tuple[date, date]:
    return date(ad_year, 1, 1), date(ad_year, 12, 31)


def _bs_label_for(d: date) -> str | None:
    from engine.vedic.bikram_sambat import format_bs_date, gregorian_to_bs

    try:
        y, m, dd = gregorian_to_bs(d)
        return format_bs_date(y, m, dd)
    except Exception:
        return None


def _year_range_jd_fields(year_start: date | CivilDay, year_end: date | CivilDay) -> dict[str, float]:
    from engine.astronomy.jd_calendar import civil_day_jd_from_date

    if isinstance(year_start, CivilDay):
        return {
            "range_start_jd": float(year_start.to_jd_ut()),
            "range_end_jd": float(year_end.to_jd_ut()),
        }
    return {
        "range_start_jd": civil_day_jd_from_date(year_start),
        "range_end_jd": civil_day_jd_from_date(year_end),
    }


def _stamp(dt_local: datetime | Any | None, *, timezone_name: str) -> dict[str, Any] | None:
    """Format an aware local datetime as {iso, jd, time_short}."""
    if dt_local is None:
        return None
    from engine.astronomy.ut_instant import UtInstant, local_civil_fields

    fields = local_civil_fields(dt_local, timezone_name)
    iso = dt_local.isoformat() if isinstance(dt_local, (datetime, UtInstant)) else str(dt_local)
    return {
        "iso": iso,
        "jd": fields.civil_day_jd,
        "time_short": fields.time_short(),
    }


def _duration_days(
    start: datetime | Any | None,
    end: datetime | Any | None,
    *,
    timezone_name: str,
) -> int | None:
    if start is None or end is None:
        return None
    from engine.astronomy.ut_instant import local_civil_fields

    s_jd = local_civil_fields(start, timezone_name).civil_day_jd
    e_jd = local_civil_fields(end, timezone_name).civil_day_jd
    return int(round(e_jd - s_jd)) + 1


def _moon_sun_elongation(dt: datetime) -> float:
    """Unsigned Sun–Moon longitudinal elongation (0–180°)."""
    from engine.vedic.gochar import _longitude_for

    diff = (_longitude_for("moon", dt) - _longitude_for("sun", dt)) % 360.0
    return min(diff, 360.0 - diff)


def _elongation_at(instant) -> float:
    from engine.astronomy.engine import default_engine
    from engine.astronomy.ut_instant import UtInstant, as_julian_day

    if isinstance(instant, UtInstant):
        jd = instant.jd_ut
    elif isinstance(instant, datetime):
        jd = default_engine.julian_day(instant.astimezone(timezone.utc))
    else:
        jd = as_julian_day(instant)
    moon = float(default_engine.planet_position(jd, "moon")["longitude"])
    sun = float(default_engine.planet_position(jd, "sun")["longitude"])
    diff = (moon - sun) % 360.0
    return min(diff, 360.0 - diff)


def _moon_tara_asta_periods(
    from_date: date | CivilDay, to_date: date | CivilDay, location: Any, tz
) -> list[dict[str, Any]]:
    """चन्द्र तारा अस्त — combustion windows (moonrise → moonset) each lunation.

    A civil day counts as asta when the Sun–Moon elongation dips below
    ``MOON_ASTA_ORB`` at any point; consecutive asta days form one period whose
    start is the first day's moonrise and end is the last day's moonset.
    """
    from engine.astronomy.ut_instant import local_wall_instant

    def day_min_elongation(d: date | CivilDay) -> float:
        noon = local_wall_instant(d, location.timezone, hour=12, minute=0)
        if _elongation_at(noon) > 28.0:
            return 99.0
        base = local_wall_instant(d, location.timezone, hour=0, minute=0)
        return min(
            _elongation_at(base + timedelta(minutes=30 * i))
            for i in range(48)
        )

    # Group consecutive combust days.
    groups: list[tuple[date, date]] = []
    cur_start: date | None = None
    last_day: date | None = None
    cursor = from_date
    while cursor <= to_date:
        if day_min_elongation(cursor) < MOON_ASTA_ORB:
            if cur_start is None:
                cur_start = cursor
            last_day = cursor
        elif cur_start is not None:
            groups.append((cur_start, last_day))  # type: ignore[arg-type]
            cur_start = None
        cursor += timedelta(days=1)
    if cur_start is not None:
        groups.append((cur_start, last_day))  # type: ignore[arg-type]

    periods: list[dict[str, Any]] = []
    for start_day, end_day in groups:
        rise = default_engine.rise(
            start_day, "moon", location.lat, location.lon,
            timezone_name=location.timezone,
        )
        setting = default_engine.set(
            end_day, "moon", location.lat, location.lon,
            timezone_name=location.timezone,
        )
        rise_local = rise.astimezone(tz) if rise else None
        set_local = setting.astimezone(tz) if setting else None
        periods.append({
            "graha": "moon",
            "graha_ne": "चन्द्र",
            "start": _stamp(rise_local, timezone_name=location.timezone),
            "end": _stamp(set_local, timezone_name=location.timezone),
            "duration_days": _duration_days(rise_local, set_local, timezone_name=location.timezone),
            "hemisphere": None,
        })
    return periods


def _planet_asta_periods(events: list[dict[str, Any]], tz) -> list[dict[str, Any]]:
    """Pair heliacal asta→udaya events into combustion periods per graha."""
    by_graha: dict[str, list[dict[str, Any]]] = {}
    for ev in events:
        by_graha.setdefault(ev["graha"], []).append(ev)

    periods: list[dict[str, Any]] = []
    for graha, evs in by_graha.items():
        evs.sort(key=lambda e: e["entry_time_utc"])
        open_asta: dict[str, Any] | None = None
        for ev in evs:
            if ev.get("event") == "asta":
                open_asta = ev
            elif ev.get("event") == "udaya":
                periods.append(_planet_period(graha, open_asta, ev, tz))
                open_asta = None
        if open_asta is not None:
            periods.append(_planet_period(graha, open_asta, None, tz))
    return periods


def _instant_to_local(raw: str, tz) -> datetime | Any:
    """Parse API ``entry_time_utc`` for local civil-field formatting (BCE-safe)."""
    from engine.astronomy.ut_instant import parse_ephemeris_instant

    return parse_ephemeris_instant(str(raw))


def _planet_period(
    graha: str, asta: dict[str, Any] | None, udaya: dict[str, Any] | None, tz
) -> dict[str, Any]:
    from engine.vedic.gochar import GRAHA_META

    def to_local(ev: dict[str, Any] | None):
        if ev is None:
            return None
        return _instant_to_local(ev["entry_time_utc"], tz)

    start_local = to_local(asta)
    end_local = to_local(udaya)
    tz_name = getattr(tz, "key", str(tz))
    return {
        "graha": graha,
        "graha_ne": GRAHA_META[graha]["ne"],
        "start": _stamp(start_local, timezone_name=tz_name),
        "end": _stamp(end_local, timezone_name=tz_name),
        "duration_days": _duration_days(start_local, end_local, timezone_name=tz_name),
        "hemisphere": (asta or udaya or {}).get("hemisphere"),
    }


def build_graha_asta_span(
    jd_start: float, jd_end: float, location: Any
) -> dict[str, Any]:
    """Combustion (अस्त) periods over an inclusive Julian Day span.

    The era-agnostic entry point: ``EraMiddleware`` has already resolved whatever
    era the client asked for down to a JD pair, so this serves ad, bc, bs and bbs
    from one body.

    This replaces two functions whose bodies were identical line for line —
    including a ``sort_key`` closure written out twice — differing only in which
    udayast builder they called. That pair is now one JD-native call.
    """
    from engine.astronomy.jd_calendar import CivilDay
    from engine.vedic.udayast import build_udayast_span

    span_start = float(jd_start)
    span_end = float(jd_end)
    tz = resolve_observer_timezone(location.timezone)

    planet_raw = build_udayast_span(
        span_start, span_end, location, grahas=ASTA_PLANET_GRAHAS,
    )
    periods = _planet_asta_periods(planet_raw["events"], tz)
    periods.extend(
        _moon_tara_asta_periods(
            CivilDay.from_jd_ut(span_start),
            CivilDay.from_jd_ut(span_end),
            location,
            tz,
        )
    )

    def sort_key(p: dict[str, Any]) -> tuple[int, str]:
        order = ASTA_GRAHAS.index(p["graha"]) if p["graha"] in ASTA_GRAHAS else 99
        start_iso = p["start"]["iso"] if p.get("start") else (p["end"]["iso"] if p.get("end") else "")
        return (order, start_iso)

    periods.sort(key=sort_key)
    return {
        "range_start_jd": span_start,
        "range_end_jd": span_end,
        "location": location.as_dict(),
        "grahas": ASTA_GRAHAS,
        "periods": periods,
    }


def build_graha_asta_year(bs_year: int, location: Any) -> dict[str, Any]:
    """Combustion periods over a BS year. Thin wrapper over the span builder."""
    from engine.astronomy.jd_calendar import civil_day_jd_from_date

    year_start, year_end = _bs_year_range(bs_year)
    payload = build_graha_asta_span(
        civil_day_jd_from_date(year_start),
        civil_day_jd_from_date(year_end),
        location,
    )
    payload["bs_year"] = bs_year
    payload["era"] = "bs"
    return payload


def build_graha_asta_ad_year(ad_year: int, location: Any) -> dict[str, Any]:
    """Combustion periods over a Gregorian year. Thin wrapper over the span builder."""
    from engine.astronomy.jd_calendar import civil_day_jd_from_date

    year_start, year_end = _ad_year_range(ad_year)
    payload = build_graha_asta_span(
        civil_day_jd_from_date(year_start),
        civil_day_jd_from_date(year_end),
        location,
    )
    payload["ad_year"] = ad_year
    payload["era"] = "ad"
    return payload


def build_graha_vakri_span(jd_start: float, jd_end: float, location: Any) -> dict[str, Any]:
    """Yearly वक्री/मार्गी station timeline over an inclusive Julian Day span.

    The era-agnostic entry point: the caller has already resolved whatever era the
    client asked for down to a JD pair (see :mod:`engine.calendar.era`), so this
    works identically for ad, bc, bs and bbs and needs no calendar logic of its own.

    This was the reference implementation for the phase 3 pattern, but it still
    delegated to a CE/BCE pair of its own one level down. That pair is gone: the
    body lives here, and picks its rise helper from the JD like everything else.
    """
    from engine.astronomy.jd_calendar import civil_day_add
    from engine.astronomy.sun import sun_service
    from engine.vedic.gochar import _attach_local_time, find_motion_stations_in_range

    span_start = float(jd_start)
    span_end = float(jd_end)
    tz = resolve_observer_timezone(location.timezone)

    from_sunrise = sun_service.sunrise(span_start, location)
    until_sunrise = sun_service.sunrise(civil_day_add(span_end, 1), location)
    raw = find_motion_stations_in_range(
        from_sunrise, until_sunrise, grahas=YEARLY_GRAHAS
    )
    return {
        "range_start_jd": span_start,
        "range_end_jd": span_end,
        "location": location.as_dict(),
        "grahas": YEARLY_GRAHAS,
        "events": [_attach_local_time(dict(ev), tz) for ev in raw],
    }


def build_graha_vakri_year(bs_year: int, location: Any) -> dict[str, Any]:
    """Yearly वक्री/मार्गी station timeline over a BS year."""
    from engine.vedic.bikram_sambat import bs_year_civil_range

    year_start_c, year_end_c = bs_year_civil_range(bs_year)
    payload = build_graha_vakri_span(
        year_start_c.to_jd_ut(), year_end_c.to_jd_ut(), location
    )
    payload["bs_year"] = bs_year
    payload["era"] = "bs"
    return payload


def build_graha_vakri_ad_year(ad_year: int, location: Any) -> dict[str, Any]:
    """Yearly वक्री/मार्गी station timeline over a Gregorian calendar year."""
    from engine.astronomy.jd_calendar import civil_day_jd_from_date

    year_start, year_end = _ad_year_range(ad_year)
    payload = build_graha_vakri_span(
        civil_day_jd_from_date(year_start),
        civil_day_jd_from_date(year_end),
        location,
    )
    payload["ad_year"] = ad_year
    payload["era"] = "ad"
    return payload


# ─── चन्द्र / सूर्य ग्रहण — yearly eclipse listing ────────────────────────────

_SOLAR_TYPE_NE = {
    "total": "पूर्ण सूर्यग्रहण",
    "annular": "वलयाकार सूर्यग्रहण",
    "hybrid": "सङ्कर सूर्यग्रहण",
    "partial": "आंशिक सूर्यग्रहण",
}
_LUNAR_TYPE_NE = {
    "total": "पूर्ण चन्द्रग्रहण",
    "partial": "आंशिक चन्द्रग्रहण",
    "penumbral": "उपच्छाया चन्द्रग्रहण",
}
_SOLAR_TYPE_EN = {
    "total": "Total solar eclipse",
    "annular": "Annular solar eclipse",
    "hybrid": "Hybrid solar eclipse",
    "partial": "Partial solar eclipse",
}
_LUNAR_TYPE_EN = {
    "total": "Total lunar eclipse",
    "partial": "Partial lunar eclipse",
    "penumbral": "Penumbral lunar eclipse",
}


def build_eclipse_span(
    jd_start: float, jd_end: float, kind: str, location: Any
) -> dict[str, Any]:
    """Solar or lunar eclipses whose maximum falls in an inclusive Julian Day span.

    The era-agnostic entry point: ``EraMiddleware`` has already resolved whatever
    era the client asked for down to a JD pair, so this serves ad, bc, bs and bbs
    from one body and needs no calendar logic of its own.
    """
    if kind not in ("solar", "lunar"):
        raise ValueError("kind must be 'solar' or 'lunar'")

    from engine.astronomy.jd_calendar import civil_day_add
    from engine.astronomy.ut_instant import local_civil_fields

    span_start = float(jd_start)
    span_end = float(jd_end)
    # The span names inclusive civil *days*; the scan wants a half-open instant
    # window, so the last day is extended to its end.
    scan_end = float(civil_day_add(span_end, 1))

    tz = resolve_observer_timezone(location.timezone)
    geopos = (float(location.lon), float(location.lat), 0.0)

    finder = (
        default_engine.next_solar_eclipse if kind == "solar"
        else default_engine.next_lunar_eclipse
    )
    type_ne = _SOLAR_TYPE_NE if kind == "solar" else _LUNAR_TYPE_NE
    type_en = _SOLAR_TYPE_EN if kind == "solar" else _LUNAR_TYPE_EN

    events: list[dict[str, Any]] = []
    cursor = span_start
    guard = 0
    while cursor < scan_end and guard < 60:
        guard += 1
        ecl = finder(cursor, geopos=geopos)
        if ecl is None:
            break
        max_jd = ecl["max_jd"]
        if max_jd >= scan_end:
            break
        max_local = default_engine.datetime_from_jd(max_jd).astimezone(tz)
        etype = ecl["type"]
        max_fields = local_civil_fields(max_local, location.timezone)

        def _local(key: str) -> str | None:
            v = ecl.get(key)
            if not v:
                return None
            return default_engine.datetime_from_jd(v).astimezone(tz).isoformat()

        events.append({
            "kind": kind,
            "type": etype,
            "type_ne": type_ne.get(etype, etype),
            "type_en": type_en.get(etype, etype),
            "max_utc": default_engine.datetime_from_jd(max_jd).isoformat(),
            "max_local": max_local.isoformat(),
            "date_jd": max_fields.civil_day_jd,
            "visible": bool(ecl.get("visible", False)),
            "begin_local": _local("local_begin_jd") if kind == "solar" else _local("partial_begin_jd"),
            "end_local": _local("local_end_jd") if kind == "solar" else _local("partial_end_jd"),
            "penumbral_begin_local": _local("penumbral_begin_jd") if kind == "lunar" else None,
            "penumbral_end_local": _local("penumbral_end_jd") if kind == "lunar" else None,
        })
        cursor = max_jd + 10.0

    events.sort(key=lambda e: e["max_utc"])
    return {
        "kind": kind,
        "range_start_jd": span_start,
        "range_end_jd": span_end,
        "location": location.as_dict(),
        "events": events,
    }


def build_eclipse_year(bs_year: int, kind: str, location: Any) -> dict[str, Any]:
    """Eclipses within a BS year. Thin wrapper — the span builder does the work."""
    from engine.vedic.bikram_sambat import bs_year_civil_range

    year_start, year_end = bs_year_civil_range(bs_year)
    payload = build_eclipse_span(
        year_start.to_jd_ut(), year_end.to_jd_ut(), kind, location
    )
    payload["bs_year"] = bs_year
    payload["era"] = "bs"
    return payload
