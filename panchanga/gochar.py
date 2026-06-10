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

from core.positions import RASHI_NAMES
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

# Graha display order (traditional Vedic: Surya first, Rahu/Ketu last)
GRAHA_ORDER: list[str] = [
    "sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn", "rahu", "ketu",
]


def _rashi_index_for(graha: str, dt: datetime) -> int:
    """Return the 0-based rashi index (0=Mesha … 11=Meena) for a graha at dt."""
    init_ephemeris()
    if graha == "ketu":
        rahu_pos = get_planet_position(dt, PLANET_IDS["rahu"])
        return int(((rahu_pos["longitude"] + 180.0) % 360.0) / 30) % 12
    return int(get_planet_position(dt, PLANET_IDS[graha])["longitude"] / 30) % 12


def _dms_from_longitude(lon: float) -> str:
    """Convert decimal longitude to D°M'S" within its sign (0–30°)."""
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
        table[graha] = {
            "name_vedic":    meta["vedic"],
            "name_ne":       meta["ne"],
            "symbol":        meta["symbol"],
            "longitude":     round(lon, 4),
            "dms_absolute":  _dms_from_longitude(lon),     # degree within sign
            "rashi_no":      rashi_idx + 1,
            "rashi":         RASHI_NAMES[rashi_idx],
            "deg_in_rashi":  round(lon % 30.0, 4),
            "dms_in_rashi":  _dms_from_longitude(lon),
            "speed_deg_day": round(spd, 4),
            "is_retrograde": spd < 0,
            "motion":        "Vakri" if spd < 0 else "Margi",
        }
    return table


# ─── Next rashi-entry finder ──────────────────────────────────────────────────

def find_next_rashi_entry(
    graha: str,
    from_dt: datetime,
    *,
    tolerance_hours: float = 0.25,
) -> dict[str, Any] | None:
    """
    Find the next moment a graha enters a new rashi after from_dt.

    Uses bisection: the rashi index function changes exactly once in any
    interval shorter than the graha's rashi dwell time.

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

    max_days    = _RASHI_CHANGE_MAX_DAYS[graha]
    current_idx = _rashi_index_for(graha, from_dt)

    t_lo = from_dt
    t_hi = from_dt + timedelta(days=max_days)

    # Quick check: does it change at all in the window?
    if _rashi_index_for(graha, t_hi) == current_idx:
        return None    # No rashi change in the search window

    # Bisect to find the exact crossing moment
    tolerance = timedelta(hours=tolerance_hours)
    for _ in range(60):
        if t_hi - t_lo < tolerance:
            break
        t_mid = t_lo + (t_hi - t_lo) / 2
        if _rashi_index_for(graha, t_mid) == current_idx:
            t_lo = t_mid
        else:
            t_hi = t_mid

    new_idx  = _rashi_index_for(graha, t_hi)
    meta     = GRAHA_META[graha]
    return {
        "graha":          graha,
        "graha_vedic":    meta["vedic"],
        "graha_ne":       meta["ne"],
        "from_rashi":     RASHI_NAMES[current_idx],
        "to_rashi":       RASHI_NAMES[new_idx % 12],
        "entry_time_utc": t_hi.isoformat(),
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

    # Enrich with next rashi entry
    if include_next_entry:
        for graha in GRAHA_ORDER:
            entry = find_next_rashi_entry(graha, sunrise_utc)
            if entry:
                entry_local = datetime.fromisoformat(entry["entry_time_utc"]).astimezone(tz)
                gochar[graha]["next_rashi_entry"] = {
                    "to_rashi":         entry["to_rashi"],
                    "entry_time_local": entry_local.strftime("%Y-%m-%d %H:%M"),
                    "entry_time_utc":   entry["entry_time_utc"],
                }
            else:
                gochar[graha]["next_rashi_entry"] = None

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
