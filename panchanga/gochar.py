"""
Gochar (planetary transit) calculations.

Provides:
  1. Current sidereal positions of all 9 grahas in rashi format.
  2. Next rashi-entry time for any graha (bisection search).
  3. Formatted transit table suitable for a Panchanga UI.

Terminology
-----------
Gochar  : current planetary transit through a rashi (sign).
Rashi   : one of 12 zodiac signs (Mesha…Meena), each 30°.
Vakri   : retrograde motion (speed < 0°/day).
Margi   : direct / prograde motion.

All longitudes are sidereal (Lahiri ayanamsa).
Rahu = Mean Ascending Node; Ketu = Rahu + 180° (always Vakri by convention).
"""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Any

from core.positions import RASHI_NAMES, NAKSHATRA_NAMES, RASHI_NAMES_NE
from core.swiss_eph import (
    PLANET_IDS,
    SIDEREAL_FLAGS,
    get_all_planetary_positions,
    get_julian_day,
    get_planet_position,
    init_ephemeris,
)
from core.time_utils import resolve_observer_timezone

# ─── Display metadata per graha ──────────────────────────────────────────────

GRAHA_META: dict[str, dict[str, str]] = {
    "sun":     {"vedic": "Surya",      "ne": "सूर्य",      "symbol": "☉"},
    "moon":    {"vedic": "Chandra",    "ne": "चन्द्र",    "symbol": "☽"},
    "mars":    {"vedic": "Mangala",    "ne": "मङ्गल",    "symbol": "♂"},
    "mercury": {"vedic": "Budha",      "ne": "बुध",       "symbol": "☿"},
    "jupiter": {"vedic": "Brihaspati", "ne": "बृहस्पति", "symbol": "♃"},
    "venus":   {"vedic": "Shukra",     "ne": "शुक्र",     "symbol": "♀"},
    "saturn":  {"vedic": "Shani",      "ne": "शनि",       "symbol": "♄"},
    "rahu":    {"vedic": "Rahu",       "ne": "राहु",      "symbol": "☊"},
    "ketu":    {"vedic": "Ketu",       "ne": "केतु",      "symbol": "☋"},
}

# Search window (days) for the next rashi change per graha.
# Generous upper bounds — the bisection will terminate well before these.
_RASHI_CHANGE_MAX_DAYS: dict[str, int] = {
    "sun":     35,    # ~30 days per rashi
    "moon":    3,     # ~2.3 days per rashi
    "mars":    80,    # ~45 days per rashi (can be ~6 months when retrograde)
    "mercury": 35,    # ~25 days direct, longer near retrograde
    "jupiter": 400,   # ~1 year per rashi
    "venus":   35,    # ~23 days per rashi direct
    "saturn":  800,   # ~2.5 years per rashi
    "rahu":    200,   # ~18 months per rashi (always retrograde)
    "ketu":    200,   # same as Rahu
}

from panchanga.names_ne import NAKSHATRA_NAMES_NE, to_nepali_digits

NAKSHATRA_SPAN = 360.0 / 27.0
PADA_SPAN = NAKSHATRA_SPAN / 4.0  # 3°20′

# Search window (days) for the next nakshatra / pada change per graha.
# Must exceed the longest dwell time in a month (incl. retrograde loops).
_NAKSHATRA_CHANGE_MAX_DAYS: dict[str, float] = {
    "sun": 15,
    "moon": 1.5,
    "mars": 30,
    "mercury": 40,
    "jupiter": 45,
    "venus": 12,
    "saturn": 45,
    "rahu": 45,
    "ketu": 45,
}

_PADA_CHANGE_MAX_DAYS: dict[str, float] = {
    "sun": 5,
    "moon": 0.5,
    "mars": 12,
    "mercury": 20,
    "jupiter": 20,
    "venus": 6,
    "saturn": 30,
    "rahu": 20,
    "ketu": 20,
}

# Graha display order (traditional Vedic: Surya first, Rahu/Ketu last)
GRAHA_ORDER: list[str] = [
    "sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn", "rahu", "ketu",
]


def _longitude_for(graha: str, dt: datetime) -> float:
    init_ephemeris()
    if graha == "ketu":
        rahu_pos = get_planet_position(dt, PLANET_IDS["rahu"])
        return (rahu_pos["longitude"] + 180.0) % 360.0
    return float(get_planet_position(dt, PLANET_IDS[graha])["longitude"])


def _rashi_index_for(graha: str, dt: datetime) -> int:
    """Return the 0-based rashi index (0=Mesha … 11=Meena) for a graha at dt."""
    return int(_longitude_for(graha, dt) / 30) % 12


def _nakshatra_index_for(graha: str, dt: datetime) -> int:
    """0-based nakshatra index (0=Ashvini … 26=Revati)."""
    return int(_longitude_for(graha, dt) / NAKSHATRA_SPAN) % 27


def _pada_tuple_for(graha: str, dt: datetime) -> tuple[int, int]:
    """(0-based nakshatra index, pada 1–4)."""
    lon = _longitude_for(graha, dt)
    nak = int(lon / NAKSHATRA_SPAN) % 27
    pos_in_nak = lon % NAKSHATRA_SPAN
    pada = min(int(pos_in_nak / PADA_SPAN) + 1, 4)
    return nak, pada


def _pada_flat_for(graha: str, dt: datetime) -> int:
    """Flat pada slot 0–107 across the ecliptic."""
    nak, pada = _pada_tuple_for(graha, dt)
    return nak * 4 + (pada - 1)


def _nakshatra_labels(nak_idx: int) -> dict[str, str]:
    name = NAKSHATRA_NAMES[nak_idx]
    return {
        "nakshatra": name,
        "nakshatra_ne": NAKSHATRA_NAMES_NE[nak_idx],
    }


def _pada_labels(nak_idx: int, pada: int) -> dict[str, Any]:
    base = _nakshatra_labels(nak_idx)
    pada_ne = to_nepali_digits(pada)
    return {
        **base,
        "pada": pada,
        "pada_ne": pada_ne,
        "label_ne": f"{base['nakshatra_ne']} {pada_ne} मा",
    }


def _attach_local_time(
    entry: dict[str, Any],
    tz,
) -> dict[str, Any]:
    entry_local = datetime.fromisoformat(entry["entry_time_utc"]).astimezone(tz)
    entry["entry_time_local"] = entry_local.strftime("%Y-%m-%d %H:%M")
    entry["entry_time_local_short"] = entry_local.strftime("%H:%M")
    entry["entry_date_ad"] = entry_local.date().isoformat()
    return entry


def _bisect_index_change(
    graha: str,
    from_dt: datetime,
    *,
    get_index,
    max_days: float,
    tolerance_hours: float = 0.25,
) -> datetime | None:
    """Return UTC instant when `get_index(graha, dt)` first changes after from_dt."""
    current = get_index(graha, from_dt)
    t_limit = from_dt + timedelta(days=max_days)

    # Coarse scan — retrograde grahas can leave and re-enter the same index
    # within max_days, so endpoint-only checks miss real crossings.
    scan_step = timedelta(hours=3)
    t_lo = from_dt
    t_hi: datetime | None = None
    cursor = from_dt
    while cursor < t_limit:
        cursor_next = min(cursor + scan_step, t_limit)
        if get_index(graha, cursor_next) != current:
            t_lo = cursor
            t_hi = cursor_next
            break
        cursor = cursor_next
    if t_hi is None:
        return None

    tolerance = timedelta(hours=tolerance_hours)
    for _ in range(60):
        if t_hi - t_lo < tolerance:
            break
        t_mid = t_lo + (t_hi - t_lo) / 2
        if get_index(graha, t_mid) == current:
            t_lo = t_mid
        else:
            t_hi = t_mid
    if get_index(graha, t_hi) == current:
        return None
    return t_hi


def _dms_absolute(lon: float) -> str:
    """Absolute zodiac position as D°M'S" (0–360°), e.g. '348°52\'10\"' for Saturn in Meena."""
    d = int(lon)
    m_frac = (lon - d) * 60
    m = int(m_frac)
    s = round((m_frac - m) * 60)
    if s >= 60:
        s -= 60; m += 1
    if m >= 60:
        m -= 60; d += 1
    return f'{d:03d}°{m:02d}\'{s:02d}"'


def _dms_in_sign(lon: float) -> str:
    """Degree-minute-second within the current rashi (0–30°)."""
    deg_in_sign = lon % 30.0
    d = int(deg_in_sign)
    m_frac = (deg_in_sign - d) * 60
    m = int(m_frac)
    s = round((m_frac - m) * 60)
    if s >= 60:
        s -= 60; m += 1
    if m >= 60:
        m -= 60; d += 1
    return f'{d:02d}°{m:02d}\'{s:02d}"'


# ─── Core gochar table ────────────────────────────────────────────────────────

def get_gochar_table(dt: datetime) -> dict[str, Any]:
    """
    Return the full Gochar table (current planetary positions) at the given moment.

    For each graha:
      - Sidereal longitude (absolute 0–360°) and degree within sign
      - Rashi number and name
      - Motion direction: Margi (direct) or Vakri (retrograde)
      - Daily speed in degrees/day
    """
    init_ephemeris()
    raw = get_all_planetary_positions(dt)

    table: dict[str, Any] = {}
    for graha in GRAHA_ORDER:
        pos  = raw.get(graha, {})
        meta = GRAHA_META[graha]
        lon  = pos.get("longitude", 0.0)
        spd  = pos.get("speed", 0.0)
        rashi_idx = (pos.get("rashi", 1) - 1) % 12  # stored 1-based in raw
        # Ketu always moves retrograde by Vedic convention (shadow node opposite Rahu)
        is_vakri = spd < 0 or graha == "ketu"
        table[graha] = {
            "name_vedic":    meta["vedic"],
            "name_ne":       meta["ne"],
            "symbol":        meta["symbol"],
            "longitude":     round(lon, 4),
            "dms_absolute":  _dms_absolute(lon),
            "rashi_no":      rashi_idx + 1,
            "rashi":         RASHI_NAMES[rashi_idx],
            "rashi_ne":      RASHI_NAMES_NE[rashi_idx],
            "deg_in_rashi":  round(lon % 30.0, 4),
            "dms_in_rashi":  _dms_in_sign(lon),
            "speed_deg_day": round(spd, 4),
            "is_retrograde": is_vakri,
            "motion":        "Vakri" if is_vakri else "Margi",
        }
    return table


# ─── Next rashi-entry finder ──────────────────────────────────────────────────

def _rashi_again_prefix(graha: str, from_dt: datetime, to_idx: int) -> str:
    """पुनः prefix when a graha re-enters a rashi it occupied earlier (retrograde loop)."""
    lookback = min(_RASHI_CHANGE_MAX_DAYS.get(graha, 35), 120)
    step = timedelta(days=1)
    cursor = from_dt - step
    end = from_dt - timedelta(days=lookback)
    while cursor >= end:
        if _rashi_index_for(graha, cursor) == to_idx:
            return "पुनः"
        cursor -= step
    return ""


def find_next_rashi_entry(
    graha: str,
    from_dt: datetime,
    *,
    tolerance_hours: float = 0.25,
) -> dict[str, Any] | None:
    """
    Find the next moment a graha enters a new rashi after from_dt.

    Parameters
    ----------
    graha           Name of the graha (e.g. "jupiter").
    from_dt         Search start (UTC datetime).
    tolerance_hours Precision required, default 15 minutes.

    Returns
    -------
    dict with entry_time, from_rashi, to_rashi, and UTC/local strings.
    None if the graha doesn't change rashi in the search window.
    """
    init_ephemeris()
    if graha not in GRAHA_META:
        raise ValueError(f"Unknown graha: {graha!r}")

    current_idx = _rashi_index_for(graha, from_dt)
    crossing = _bisect_index_change(
        graha,
        from_dt,
        get_index=_rashi_index_for,
        max_days=_RASHI_CHANGE_MAX_DAYS[graha],
        tolerance_hours=tolerance_hours,
    )
    if crossing is None:
        return None

    to_idx = _rashi_index_for(graha, crossing) % 12
    meta = GRAHA_META[graha]
    again = _rashi_again_prefix(graha, from_dt, to_idx)
    to_ne = RASHI_NAMES_NE[to_idx]
    return {
        "graha":          graha,
        "graha_vedic":    meta["vedic"],
        "graha_ne":       meta["ne"],
        "level":          "rashi",
        "from_rashi":     RASHI_NAMES[current_idx],
        "from_rashi_ne":  RASHI_NAMES_NE[current_idx],
        "to_rashi":       RASHI_NAMES[to_idx],
        "to_rashi_ne":    to_ne,
        "label_ne":       f"{again}{to_ne}मा",
        "entry_time_utc": crossing.isoformat(),
    }


def find_upcoming_rashi_entries(
    dt: datetime,
    grahas: list[str] | None = None,
    *,
    max_results_per_graha: int = 1,
) -> list[dict[str, Any]]:
    """
    Return upcoming rashi entries for specified (or all) grahas.

    Sorted chronologically. Suitable for a "planetary transits this year" panel.
    """
    if grahas is None:
        grahas = GRAHA_ORDER
    entries: list[dict[str, Any]] = []
    for graha in grahas:
        current_dt = dt
        for _ in range(max_results_per_graha):
            entry = find_next_rashi_entry(graha, current_dt)
            if entry is None:
                break
            entries.append(entry)
            # Advance past this entry to find the next one
            current_dt = datetime.fromisoformat(entry["entry_time_utc"]) + timedelta(hours=1)
    entries.sort(key=lambda e: e["entry_time_utc"])
    return entries


# ─── Next nakshatra / pada entry finders ─────────────────────────────────────

def find_next_nakshatra_entry(
    graha: str,
    from_dt: datetime,
    *,
    tolerance_hours: float = 0.25,
) -> dict[str, Any] | None:
    """Next nakshatra ingress (13°20′ step) for a graha after from_dt."""
    if graha not in GRAHA_META:
        raise ValueError(f"Unknown graha: {graha!r}")

    current_idx = _nakshatra_index_for(graha, from_dt)
    crossing = _bisect_index_change(
        graha,
        from_dt,
        get_index=_nakshatra_index_for,
        max_days=_NAKSHATRA_CHANGE_MAX_DAYS[graha],
        tolerance_hours=tolerance_hours,
    )
    if crossing is None:
        return None

    new_idx = _nakshatra_index_for(graha, crossing)
    meta = GRAHA_META[graha]
    from_labels = _nakshatra_labels(current_idx)
    to_labels = _nakshatra_labels(new_idx)
    return {
        "graha": graha,
        "graha_vedic": meta["vedic"],
        "graha_ne": meta["ne"],
        "level": "nakshatra",
        "from_nakshatra": from_labels["nakshatra"],
        "from_nakshatra_ne": from_labels["nakshatra_ne"],
        "to_nakshatra": to_labels["nakshatra"],
        "to_nakshatra_ne": to_labels["nakshatra_ne"],
        "label_ne": f"{to_labels['nakshatra_ne']} मा",
        "entry_time_utc": crossing.isoformat(),
    }


def find_next_pada_entry(
    graha: str,
    from_dt: datetime,
    *,
    tolerance_hours: float = 0.25,
) -> dict[str, Any] | None:
    """Next nakshatra-pada ingress (3°20′ step) for a graha after from_dt."""
    if graha not in GRAHA_META:
        raise ValueError(f"Unknown graha: {graha!r}")

    from_nak, from_pada = _pada_tuple_for(graha, from_dt)
    crossing = _bisect_index_change(
        graha,
        from_dt,
        get_index=_pada_flat_for,
        max_days=_PADA_CHANGE_MAX_DAYS[graha],
        tolerance_hours=tolerance_hours,
    )
    if crossing is None:
        return None

    to_nak, to_pada = _pada_tuple_for(graha, crossing)
    meta = GRAHA_META[graha]
    from_labels = _pada_labels(from_nak, from_pada)
    to_labels = _pada_labels(to_nak, to_pada)
    return {
        "graha": graha,
        "graha_vedic": meta["vedic"],
        "graha_ne": meta["ne"],
        "level": "pada",
        "from_nakshatra": from_labels["nakshatra"],
        "from_nakshatra_ne": from_labels["nakshatra_ne"],
        "from_pada": from_pada,
        "from_pada_ne": from_labels["pada_ne"],
        "to_nakshatra": to_labels["nakshatra"],
        "to_nakshatra_ne": to_labels["nakshatra_ne"],
        "to_pada": to_pada,
        "to_pada_ne": to_labels["pada_ne"],
        "label_ne": to_labels["label_ne"],
        "entry_time_utc": crossing.isoformat(),
    }


def find_ingress_entries_in_range(
    from_dt: datetime,
    until_dt: datetime,
    *,
    level: str = "pada",
    grahas: list[str] | None = None,
) -> list[dict[str, Any]]:
    """
    All ingress events of the given level between from_dt (exclusive advance)
    and until_dt (inclusive).
    """
    if level not in {"pada", "nakshatra", "rashi", "patro", "udayast"}:
        raise ValueError("level must be pada, nakshatra, rashi, patro, or udayast")
    if grahas is None:
        grahas = [g for g in GRAHA_ORDER if g != "moon"]

    if level == "udayast":
        from panchanga.udayast import find_udayast_events_in_range

        return find_udayast_events_in_range(from_dt, until_dt, grahas=grahas)

    if level == "patro":
        from panchanga.udayast import find_udayast_events_in_range

        pada = find_ingress_entries_in_range(
            from_dt, until_dt, level="pada", grahas=grahas,
        )
        # Sun rashi is already in the सूर्य राशि column — keep only pada for sun.
        rashi_grahas = [g for g in grahas if g not in {"sun", "moon"}]
        rashi = find_ingress_entries_in_range(
            from_dt, until_dt, level="rashi", grahas=rashi_grahas,
        )
        udayast = find_udayast_events_in_range(from_dt, until_dt)
        merged = pada + rashi + udayast
        merged.sort(key=lambda e: e["entry_time_utc"])
        return merged

    finder = {
        "pada": find_next_pada_entry,
        "nakshatra": find_next_nakshatra_entry,
        "rashi": find_next_rashi_entry,
    }[level]

    entries: list[dict[str, Any]] = []
    for graha in grahas:
        cursor = from_dt
        while cursor < until_dt:
            entry = finder(graha, cursor)
            if entry is None:
                break
            entry_utc = datetime.fromisoformat(entry["entry_time_utc"])
            if entry_utc > until_dt:
                break
            entries.append(entry)
            cursor = entry_utc + timedelta(seconds=90)
    entries.sort(key=lambda e: e["entry_time_utc"])
    return entries


def build_gochar_ingress_range(
    from_date: date,
    to_date: date,
    location: Any,
    *,
    level: str = "pada",
    grahas: list[str] | None = None,
) -> dict[str, Any]:
    """Ingress timeline between two civil dates (inclusive end), anchored at sunrise."""
    from core.swiss_eph import calculate_sunrise

    if to_date < from_date:
        raise ValueError("to_date must be on or after from_date")

    init_ephemeris()
    tz = resolve_observer_timezone(location.timezone)
    from_sunrise = calculate_sunrise(
        from_date,
        latitude=location.lat,
        longitude=location.lon,
        timezone_name=location.timezone,
    )
    until_sunrise = calculate_sunrise(
        to_date + timedelta(days=1),
        latitude=location.lat,
        longitude=location.lon,
        timezone_name=location.timezone,
    )
    raw = find_ingress_entries_in_range(
        from_sunrise,
        until_sunrise,
        level=level,
        grahas=grahas,
    )
    events = [_attach_local_time(dict(e), tz) for e in raw]
    return {
        "from_date_ad": from_date.isoformat(),
        "to_date_ad": to_date.isoformat(),
        "level": level,
        "location": location.as_dict(),
        "events": events,
    }


# ─── Formatted gochar response ────────────────────────────────────────────────

def build_gochar_response(
    target: date,
    location: Any,  # ObserverLocation
    *,
    include_next_entry: bool = True,
    include_upcoming: bool = False,
) -> dict[str, Any]:
    """
    Full Gochar response for a given date.

    Computes positions at local sunrise (the traditional Vedic day anchor).
    Optionally includes next rashi-entry times for each graha.

    Parameters
    ----------
    target          Gregorian date.
    location        ObserverLocation (has .lat, .lon, .timezone, etc.).
    include_next_entry
                    If True, include next rashi entry for each graha.
    include_upcoming
                    If True, include next 3 entries for slow grahas
                    (Jupiter, Saturn, Rahu, Ketu) — useful for yearly view.
    """
    from core.swiss_eph import calculate_sunrise
    from panchanga.bikram_sambat import gregorian_to_bs, format_bs_date

    init_ephemeris()

    sunrise_utc = calculate_sunrise(
        target,
        latitude=location.lat,
        longitude=location.lon,
        timezone_name=location.timezone,
    )
    tz      = resolve_observer_timezone(location.timezone)
    bs_year, bs_month, bs_day = gregorian_to_bs(target)

    gochar = get_gochar_table(sunrise_utc)

    # Enrich with next rashi / nakshatra / pada entries
    if include_next_entry:
        for graha in GRAHA_ORDER:
            rashi_entry = find_next_rashi_entry(graha, sunrise_utc)
            if rashi_entry:
                rashi_entry = _attach_local_time(dict(rashi_entry), tz)
                gochar[graha]["next_rashi_entry"] = {
                    "to_rashi": rashi_entry["to_rashi"],
                    "to_rashi_ne": rashi_entry.get("to_rashi_ne"),
                    "entry_time_local": rashi_entry["entry_time_local"],
                    "entry_time_utc": rashi_entry["entry_time_utc"],
                }
            else:
                gochar[graha]["next_rashi_entry"] = None

            nak_entry = find_next_nakshatra_entry(graha, sunrise_utc)
            if nak_entry:
                nak_entry = _attach_local_time(dict(nak_entry), tz)
                gochar[graha]["next_nakshatra_entry"] = {
                    "to_nakshatra": nak_entry["to_nakshatra"],
                    "to_nakshatra_ne": nak_entry["to_nakshatra_ne"],
                    "label_ne": nak_entry["label_ne"],
                    "entry_time_local": nak_entry["entry_time_local"],
                    "entry_time_local_short": nak_entry["entry_time_local_short"],
                    "entry_time_utc": nak_entry["entry_time_utc"],
                }
            else:
                gochar[graha]["next_nakshatra_entry"] = None

            pada_entry = find_next_pada_entry(graha, sunrise_utc)
            if pada_entry:
                pada_entry = _attach_local_time(dict(pada_entry), tz)
                gochar[graha]["next_pada_entry"] = {
                    "to_nakshatra": pada_entry["to_nakshatra"],
                    "to_nakshatra_ne": pada_entry["to_nakshatra_ne"],
                    "to_pada": pada_entry["to_pada"],
                    "to_pada_ne": pada_entry["to_pada_ne"],
                    "label_ne": pada_entry["label_ne"],
                    "entry_time_local": pada_entry["entry_time_local"],
                    "entry_time_local_short": pada_entry["entry_time_local_short"],
                    "entry_time_utc": pada_entry["entry_time_utc"],
                }
            else:
                gochar[graha]["next_pada_entry"] = None

    result: dict[str, Any] = {
        "date_bs":   format_bs_date(bs_year, bs_month, bs_day),
        "date_ad":   target.isoformat(),
        "computed_at": {
            "utc":   sunrise_utc.isoformat(),
            "local": sunrise_utc.astimezone(tz).strftime("%H:%M"),
            "note":  "Positions at local true sunrise (Udaya)",
        },
        "location": location.as_dict(),
        "gochar":   gochar,
    }

    if include_upcoming:
        slow_grahas = ["jupiter", "saturn", "rahu", "ketu"]
        result["upcoming_transits"] = find_upcoming_rashi_entries(
            sunrise_utc, slow_grahas, max_results_per_graha=3
        )

    return result


def build_gochar_year_summary(
    bs_year: int,
    location: Any,
    *,
    slow_grahas: list[str] | None = None,
) -> dict[str, Any]:
    """Yearly Gochar — slow-graha rashi transitions + monthly snapshot table."""
    from panchanga.bikram_sambat import (
        bs_to_gregorian,
        format_bs_date,
        get_bs_month_length,
        get_bs_month_start,
    )

    if slow_grahas is None:
        slow_grahas = ["jupiter", "saturn", "rahu", "ketu"]

    year_start = get_bs_month_start(bs_year, 1)
    year_end = bs_to_gregorian(bs_year, 12, get_bs_month_length(bs_year, 12))

    from core.swiss_eph import calculate_sunrise

    init_ephemeris()
    sunrise_utc = calculate_sunrise(
        year_start,
        latitude=location.lat,
        longitude=location.lon,
        timezone_name=location.timezone,
    )
    upcoming = find_upcoming_rashi_entries(
        sunrise_utc,
        slow_grahas,
        max_results_per_graha=4,
    )

    monthly_snapshots: list[dict[str, Any]] = []
    for bs_month in range(1, 13):
        month_len = get_bs_month_length(bs_year, bs_month)
        mid_greg = bs_to_gregorian(bs_year, bs_month, min(15, month_len))
        mid_sunrise = calculate_sunrise(
            mid_greg,
            latitude=location.lat,
            longitude=location.lon,
            timezone_name=location.timezone,
        )
        table = get_gochar_table(mid_sunrise)
        monthly_snapshots.append({
            "bs_month": bs_month,
            "snapshot_date_ad": mid_greg.isoformat(),
            "snapshot_date_bs": format_bs_date(bs_year, bs_month, min(15, month_len)),
            "gochar": {
                graha: {
                    "rashi": table[graha]["rashi"],
                    "deg_in_rashi": table[graha].get("deg_in_rashi"),
                    "motion": table[graha].get("motion"),
                    "vakri": table[graha].get("is_retrograde", False),
                }
                for graha in GRAHA_ORDER
            },
        })

    return {
        "bs_year": bs_year,
        "gregorian_range": {"start": year_start.isoformat(), "end": year_end.isoformat()},
        "location": location.as_dict(),
        "upcoming_transits": upcoming,
        "monthly_snapshots": monthly_snapshots,
    }
