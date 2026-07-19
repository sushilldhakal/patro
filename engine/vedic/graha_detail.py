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

from engine.astronomy.engine import default_engine
from engine.astronomy.positions import NAKSHATRA_NAMES, RASHI_NAMES, RASHI_NAMES_NE
from engine.astronomy.swiss_eph import (
    calculate_sunrise,
    get_all_planetary_positions,
    init_ephemeris,
)
from engine.astronomy.timescale import resolve_observer_timezone
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


def build_graha_sthiti(date_ad: date, location: Any) -> dict[str, Any]:
    """Full daily sphuta table for all 9 grahas + लग्न, computed at sunrise."""
    from engine.vedic.bikram_sambat import format_bs_date, gregorian_to_bs
    from engine.vedic.udayast import is_heliacally_visible

    init_ephemeris()
    tz = resolve_observer_timezone(location.timezone)
    sunrise = calculate_sunrise(
        date_ad,
        latitude=location.lat,
        longitude=location.lon,
        timezone_name=location.timezone,
    )
    jd = default_engine.julian_day(sunrise)
    positions = get_all_planetary_positions(sunrise)

    rows: list[dict[str, Any]] = []

    # लग्न (ascendant) first — the reference tables lead with it.
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
        is_retro = bool(pos.get("is_retrograde", speed < 0.0))
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

    bs_y, bs_m, bs_d = gregorian_to_bs(date_ad)
    return {
        "date_ad": date_ad.isoformat(),
        "date_bs": format_bs_date(bs_y, bs_m, bs_d),
        "timezone": str(tz),
        "sunrise_local": sunrise.astimezone(tz).isoformat(),
        "location": location.as_dict(),
        "rows": rows,
    }


# ─── ग्रह अस्त / वक्री — yearly station timelines ──────────────────────────────

def _bs_year_range(bs_year: int) -> tuple[date, date]:
    from engine.vedic.bikram_sambat import bs_to_gregorian, get_bs_month_length, get_bs_month_start

    year_start = get_bs_month_start(bs_year, 1)
    year_end = bs_to_gregorian(bs_year, 12, get_bs_month_length(bs_year, 12))
    return year_start, year_end


def _bs_label_for(d: date) -> str | None:
    from engine.vedic.bikram_sambat import format_bs_date, gregorian_to_bs

    try:
        y, m, dd = gregorian_to_bs(d)
        return format_bs_date(y, m, dd)
    except Exception:
        return None


def _stamp(dt_local: datetime | None) -> dict[str, Any] | None:
    """Format an aware local datetime as {iso, date_ad, date_bs, time_short}."""
    if dt_local is None:
        return None
    d = dt_local.date()
    return {
        "iso": dt_local.isoformat(),
        "date_ad": d.isoformat(),
        "date_bs": _bs_label_for(d),
        "time_short": dt_local.strftime("%H:%M"),
    }


def _duration_days(start: datetime | None, end: datetime | None) -> int | None:
    if start is None or end is None:
        return None
    return (end.date() - start.date()).days + 1


def _moon_sun_elongation(dt: datetime) -> float:
    """Unsigned Sun–Moon longitudinal elongation (0–180°)."""
    from engine.vedic.gochar import _longitude_for

    diff = (_longitude_for("moon", dt) - _longitude_for("sun", dt)) % 360.0
    return min(diff, 360.0 - diff)


def _moon_tara_asta_periods(
    from_date: date, to_date: date, location: Any, tz
) -> list[dict[str, Any]]:
    """चन्द्र तारा अस्त — combustion windows (moonrise → moonset) each lunation.

    A civil day counts as asta when the Sun–Moon elongation dips below
    ``MOON_ASTA_ORB`` at any point; consecutive asta days form one period whose
    start is the first day's moonrise and end is the last day's moonset.
    """
    def day_min_elongation(d: date) -> float:
        noon = datetime(d.year, d.month, d.day, 12, tzinfo=tz).astimezone(timezone.utc)
        # The Moon moves <15°/day, so a >28° gap at noon can't reach the orb.
        if _moon_sun_elongation(noon) > 28.0:
            return 99.0
        base = datetime(d.year, d.month, d.day, tzinfo=tz)
        return min(
            _moon_sun_elongation((base + timedelta(minutes=30 * i)).astimezone(timezone.utc))
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
            "start": _stamp(rise_local),
            "end": _stamp(set_local),
            "duration_days": _duration_days(rise_local, set_local),
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


def _planet_period(
    graha: str, asta: dict[str, Any] | None, udaya: dict[str, Any] | None, tz
) -> dict[str, Any]:
    from engine.vedic.gochar import GRAHA_META

    def to_local(ev: dict[str, Any] | None) -> datetime | None:
        if ev is None:
            return None
        return datetime.fromisoformat(ev["entry_time_utc"]).astimezone(tz)

    start_local = to_local(asta)
    end_local = to_local(udaya)
    return {
        "graha": graha,
        "graha_ne": GRAHA_META[graha]["ne"],
        "start": _stamp(start_local),
        "end": _stamp(end_local),
        "duration_days": _duration_days(start_local, end_local),
        "hemisphere": (asta or udaya or {}).get("hemisphere"),
    }


def build_graha_asta_year(bs_year: int, location: Any) -> dict[str, Any]:
    """Yearly combustion (asta) periods over a BS year — planets + Moon Tara Asta."""
    from engine.vedic.udayast import build_udayast_range

    year_start, year_end = _bs_year_range(bs_year)
    init_ephemeris()
    tz = resolve_observer_timezone(location.timezone)

    planet_raw = build_udayast_range(
        year_start, year_end, location, grahas=ASTA_PLANET_GRAHAS,
    )
    periods = _planet_asta_periods(planet_raw["events"], tz)
    periods.extend(_moon_tara_asta_periods(year_start, year_end, location, tz))

    # Sort chronologically within each graha; group order follows ASTA_GRAHAS.
    def sort_key(p: dict[str, Any]) -> tuple[int, str]:
        order = ASTA_GRAHAS.index(p["graha"]) if p["graha"] in ASTA_GRAHAS else 99
        start_iso = p["start"]["iso"] if p.get("start") else (p["end"]["iso"] if p.get("end") else "")
        return (order, start_iso)

    periods.sort(key=sort_key)
    return {
        "bs_year": bs_year,
        "gregorian_range": {"start": year_start.isoformat(), "end": year_end.isoformat()},
        "location": location.as_dict(),
        "grahas": ASTA_GRAHAS,
        "periods": periods,
    }


def build_graha_vakri_year(bs_year: int, location: Any) -> dict[str, Any]:
    """Yearly वक्री/मार्गी station timeline over a BS year."""
    from engine.vedic.bikram_sambat import gregorian_to_bs, format_bs_date
    from engine.vedic.gochar import _attach_local_time, find_motion_stations_in_range

    year_start, year_end = _bs_year_range(bs_year)
    init_ephemeris()
    tz = resolve_observer_timezone(location.timezone)
    from_sunrise = calculate_sunrise(
        year_start, latitude=location.lat, longitude=location.lon,
        timezone_name=location.timezone,
    )
    until_sunrise = calculate_sunrise(
        year_end + timedelta(days=1), latitude=location.lat, longitude=location.lon,
        timezone_name=location.timezone,
    )
    raw = find_motion_stations_in_range(from_sunrise, until_sunrise, grahas=YEARLY_GRAHAS)
    events: list[dict[str, Any]] = []
    for ev in raw:
        e = _attach_local_time(dict(ev), tz)
        ad = e.get("entry_date_ad") or e.get("entry_time_utc", "")[:10]
        bs_label = None
        try:
            y, m, d = gregorian_to_bs(date.fromisoformat(ad))
            bs_label = format_bs_date(y, m, d)
        except Exception:
            pass
        events.append({**e, "entry_date_ad": ad, "entry_date_bs": bs_label})
    return {
        "bs_year": bs_year,
        "gregorian_range": {"start": year_start.isoformat(), "end": year_end.isoformat()},
        "location": location.as_dict(),
        "grahas": YEARLY_GRAHAS,
        "events": events,
    }


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


def build_eclipse_year(bs_year: int, kind: str, location: Any) -> dict[str, Any]:
    """List the solar or lunar eclipses whose maximum falls within a BS year."""
    from engine.vedic.bikram_sambat import format_bs_date, gregorian_to_bs

    if kind not in ("solar", "lunar"):
        raise ValueError("kind must be 'solar' or 'lunar'")

    year_start, year_end = _bs_year_range(bs_year)
    init_ephemeris()
    tz = resolve_observer_timezone(location.timezone)
    geopos = (float(location.lon), float(location.lat), 0.0)

    start_dt = datetime(year_start.year, year_start.month, year_start.day, tzinfo=timezone.utc)
    end_dt = datetime(year_end.year, year_end.month, year_end.day, tzinfo=timezone.utc) + timedelta(days=1)
    jd_start = default_engine.julian_day(start_dt)
    jd_end = default_engine.julian_day(end_dt)

    finder = (
        default_engine.next_solar_eclipse if kind == "solar"
        else default_engine.next_lunar_eclipse
    )
    type_ne = _SOLAR_TYPE_NE if kind == "solar" else _LUNAR_TYPE_NE
    type_en = _SOLAR_TYPE_EN if kind == "solar" else _LUNAR_TYPE_EN

    events: list[dict[str, Any]] = []
    cursor = jd_start
    guard = 0
    while cursor < jd_end and guard < 60:
        guard += 1
        ecl = finder(cursor, geopos=geopos)
        if ecl is None:
            break
        max_jd = ecl["max_jd"]
        if max_jd >= jd_end:
            break
        max_local = default_engine.datetime_from_jd(max_jd).astimezone(tz)
        etype = ecl["type"]
        ecl_date = max_local.date()
        try:
            y, m, d = gregorian_to_bs(ecl_date)
            bs_label = format_bs_date(y, m, d)
        except Exception:
            bs_label = None

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
            "date_ad": ecl_date.isoformat(),
            "date_bs": bs_label,
            "visible": bool(ecl.get("visible", False)),
            "begin_local": _local("local_begin_jd") if kind == "solar" else _local("partial_begin_jd"),
            "end_local": _local("local_end_jd") if kind == "solar" else _local("partial_end_jd"),
            "penumbral_begin_local": _local("penumbral_begin_jd") if kind == "lunar" else None,
            "penumbral_end_local": _local("penumbral_end_jd") if kind == "lunar" else None,
        })
        # Advance past this eclipse (min spacing ~15 days between eclipses).
        cursor = max_jd + 10.0

    events.sort(key=lambda e: e["max_utc"])
    return {
        "bs_year": bs_year,
        "kind": kind,
        "gregorian_range": {"start": year_start.isoformat(), "end": year_end.isoformat()},
        "location": location.as_dict(),
        "events": events,
    }
