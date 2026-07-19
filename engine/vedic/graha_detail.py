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

# Yearly asta/vakri rows cover the classical fast+slow grahas (no Sun/nodes;
# the Moon is never retrograde and never combust, so it is excluded there — the
# UI notes this). Order matches the reference patro tables.
YEARLY_GRAHAS: list[str] = ["mercury", "venus", "mars", "jupiter", "saturn"]


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


def build_graha_asta_year(bs_year: int, location: Any) -> dict[str, Any]:
    """Yearly heliacal udaya/asta timeline over a BS year (fast + slow grahas)."""
    from engine.vedic.bikram_sambat import gregorian_to_bs, format_bs_date
    from engine.vedic.udayast import build_udayast_range

    year_start, year_end = _bs_year_range(bs_year)
    raw = build_udayast_range(year_start, year_end, location, grahas=YEARLY_GRAHAS)
    events: list[dict[str, Any]] = []
    for ev in raw["events"]:
        ad = ev.get("entry_date_ad") or (ev.get("entry_time_utc", "")[:10])
        bs_label = None
        try:
            y, m, d = gregorian_to_bs(date.fromisoformat(ad))
            bs_label = format_bs_date(y, m, d)
        except Exception:
            pass
        events.append({**ev, "entry_date_ad": ad, "entry_date_bs": bs_label})
    return {
        "bs_year": bs_year,
        "gregorian_range": {"start": year_start.isoformat(), "end": year_end.isoformat()},
        "location": location.as_dict(),
        "grahas": YEARLY_GRAHAS,
        "events": events,
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
