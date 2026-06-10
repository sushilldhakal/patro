#!/usr/bin/env python3
"""
Toyanath Panchanga Engine
=========================
Generates a mathematically exact daily Panchanga for the Bikram Sambat year
2083, replicating the logic of the traditional **Toyanath Panchanga Patro**.

Computation stack:
  - Swiss Ephemeris (pyswisseph) — true sidereal planetary longitudes
  - Ayanamsa: Lahiri / Chitra Paksha  (SE_SIDM_LAHIRI)
  - Reference frame: Nirayana (sidereal), corrected from tropical
  - Day anchor: Local True Sunrise (Udaya)

═══════════════════════════════════════════════════════════════════════════════
PANCHANGA MATHEMATICS
═══════════════════════════════════════════════════════════════════════════════

All quantities are derived from true sidereal longitudes of the Sun (λ☉)
and Moon (λ☽), both corrected by the Lahiri ayanamsa (~24°07′).

────────────────────────────────────────────────────────────────────────────
1. TITHI — Lunar Day
   The Moon advances 12° relative to the Sun per tithi.

       ε   = (λ☽ − λ☉)  mod  360°          (elongation angle)
       T   = ⌊ ε / 12° ⌋ + 1               T ∈ {1 … 30}

   Paksha assignment:
       T ∈ {1 … 15} → Shukla Paksha (waxing fortnight)
       T ∈ {16 … 30} → Krishna Paksha (waning; displayed as 1–15)
   Special names: T=15 Shukla → Purnima; T=30 (=15 Krishna) → Amavasya.

────────────────────────────────────────────────────────────────────────────
2. NAKSHATRA — Lunar Mansion
   The ecliptic is divided into 27 equal arcs of 13°20′ each.

       N   = ⌊ λ☽ / (360°/27) ⌋ + 1        N ∈ {1 … 27}
       span = 13°20′ = 13.3333…°

   Each nakshatra is further divided into 4 padas of 3°20′:
       pada = ⌊ (λ☽ mod 13°20′) / 3°20′ ⌋ + 1    pada ∈ {1 … 4}

────────────────────────────────────────────────────────────────────────────
3. YOGA — Combined Sun-Moon Auspiciousness
   Measures the combined angular "speed" of the luminaries.

       Y   = ⌊ (λ☉ + λ☽) mod 360° / (360°/27) ⌋ + 1   Y ∈ {1 … 27}

────────────────────────────────────────────────────────────────────────────
4. KARANA — Half-Tithi (6° intervals)
   Two karanas exist per tithi.  Index k is 0-based from elongation:

       k   = ⌊ ε / 6° ⌋                     k ∈ {0 … 59}

   Fixed karanas (immovable, occur once per lunar month):
       k = 0  → Kimstughna  (1st half of Shukla Pratipada)
       k = 57 → Shakuni     (2nd half of Krishna Chaturdashi)
       k = 58 → Chatushpada (1st half of Amavasya)
       k = 59 → Naga        (2nd half of Amavasya)

   Repeating karanas (7 types cycling for k = 1 … 56):
       Bava, Balava, Kaulava, Taitila, Garija, Vanija, Vishti
       name = REPEATING[ (k − 1) mod 7 ]

────────────────────────────────────────────────────────────────────────────
5. VAARA — Vedic Day of Week
   The Vedic day begins at local sunrise and ends at the next local sunrise.
   The Vaara is therefore determined by the sunrise datetime, not civil midnight.
   Ravi (Sun) → Soma → Mangala → Budha → Guru → Shukra → Shani.

═══════════════════════════════════════════════════════════════════════════════
END-TIME BISECTION ALGORITHM
═══════════════════════════════════════════════════════════════════════════════

Every element (Tithi, Nakshatra, Yoga, Karana) changes continuously.
To find the exact local time when an element ends, we use the bisection
(binary search) method on the angular index function f(t):

    Given: f(t_start) = I   (current element index)
    Goal:  find t_end such that f(t_end) ≠ I, with (t_end − t_prev) < 60s

    1. t_lo = t_start,  t_hi = t_start + 36 h
    2. Repeat (up to 60 iterations):
         t_mid = (t_lo + t_hi) / 2
         if f(t_mid) == I:  t_lo = t_mid   ← element still active
         else:              t_hi = t_mid   ← element has changed
         if (t_hi − t_lo) < 60 s: break
    3. Return t_hi   (first moment the element has changed)

    Guaranteed convergence: ⌈log₂(36×3600 / 60)⌉ = 11 iterations.
    The script runs 60 iterations as a safety cap (negligible overhead).

═══════════════════════════════════════════════════════════════════════════════
GRAHA SPASHTA (Planetary Table)
═══════════════════════════════════════════════════════════════════════════════

Published at 06:00 AM local time, following Toyanath Patro convention.
Includes: Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu, Ketu.
Rahu = Mean Ascending Node (MEAN_NODE).  Ketu = Rahu + 180°.
Speed < 0 → Vakri (retrograde).

═══════════════════════════════════════════════════════════════════════════════
USAGE
═══════════════════════════════════════════════════════════════════════════════

  # Single day — BS date (defaults to Kathmandu):
  python panchanga_toyanath.py --bs-date 2083-01-01

  # Single day — AD date with custom coordinates:
  python panchanga_toyanath.py --ad-date 2026-04-14 --lat 27.46 --lon 84.43

  # Full BS year to file:
  python panchanga_toyanath.py --bs-year 2083 --output panchanga_2083.json

  # Today's panchanga (Kathmandu):
  python panchanga_toyanath.py

  # Run built-in sample (no args, shows Baisakh 1, 2083):
  python panchanga_toyanath.py --sample
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path
from typing import Any, Callable, Optional

# ─── Dependency guard ─────────────────────────────────────────────────────────
try:
    import swisseph as swe
except ImportError:
    print(
        "ERROR: pyswisseph is not installed.\n"
        "Install with:  pip install pyswisseph",
        file=sys.stderr,
    )
    sys.exit(1)

# ─── Add project root so we can import core / panchanga ──────────────────────
_SCRIPT_DIR = Path(__file__).resolve().parent
_PROJECT_ROOT = _SCRIPT_DIR.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

try:
    from core.location import ObserverLocation
    from core.positions import (
        NAKSHATRA_NAMES,
        RASHI_NAMES,
        VAARA_ENGLISH,
        VAARA_NAMES,
        YOGA_NAMES,
    )
    from core.swiss_eph import (
        calculate_sunrise,
        calculate_sunset,
        get_ayanamsa,
        get_julian_day,
        get_sun_moon_positions,
        init_ephemeris,
    )
    from core.time_utils import resolve_observer_timezone
    from panchanga.bikram_sambat import bs_month_name, bs_to_gregorian, gregorian_to_bs
except ImportError as exc:
    print(
        f"ERROR: Could not import patro project modules: {exc}\n"
        "Run this script from the patro project root, or ensure the project "
        "root is in PYTHONPATH.",
        file=sys.stderr,
    )
    sys.exit(1)

# ─── Angular span constants (degrees) ────────────────────────────────────────

TITHI_SPAN     = 12.0           # 360° / 30 tithis
NAKSHATRA_SPAN = 360.0 / 27.0   # 13°20′  (13.3333…°)
YOGA_SPAN      = 360.0 / 27.0   # 13°20′
KARANA_SPAN    = 6.0             # TITHI_SPAN / 2

# ─── Panchanga element name tables ────────────────────────────────────────────

# 30 tithi names: indices 0–14 = Shukla 1–15, indices 15–29 = Krishna 1–15
TITHI_NAMES: list[str] = [
    # Shukla Paksha ──────────────────────────────────────────────────────────
    "Pratipada", "Dwitiya",    "Tritiya",     "Chaturthi",   "Panchami",
    "Shashthi",  "Saptami",    "Ashtami",     "Navami",      "Dashami",
    "Ekadashi",  "Dwadashi",   "Trayodashi",  "Chaturdashi", "Purnima",
    # Krishna Paksha ─────────────────────────────────────────────────────────
    "Pratipada", "Dwitiya",    "Tritiya",     "Chaturthi",   "Panchami",
    "Shashthi",  "Saptami",    "Ashtami",     "Navami",      "Dashami",
    "Ekadashi",  "Dwadashi",   "Trayodashi",  "Chaturdashi", "Amavasya",
]

# Vedic day names (index 0 = Ravivara / Sunday)
VAARA_VEDIC_NAMES: list[str] = [
    "Ravivara", "Somavara", "Mangalavara", "Budhavara",
    "Guruvara", "Shukravara", "Shanivara",
]
VAARA_NEPALI_NAMES: list[str] = [
    "आइतवार", "सोमवार", "मङ्गलवार", "बुधवार",
    "बिहीवार", "शुक्रवार", "शनिवार",
]

# Fixed karanas (0-based raw index → name)
_FIXED_KARANA: dict[int, str] = {
    0:  "Kimstughna",   # 1st half of Shukla Pratipada
    57: "Shakuni",      # 2nd half of Krishna Chaturdashi
    58: "Chatushpada",  # 1st half of Amavasya
    59: "Naga",         # 2nd half of Amavasya
}
# 7 repeating karanas (cycle for raw indices 1–56)
_REPEATING_KARANA: list[str] = [
    "Bava", "Balava", "Kaulava", "Taitila", "Garija", "Vanija", "Vishti",
]

# Planets for Graha Spashta table (Rahu = mean ascending node; Ketu derived)
_GRAHA_BODIES: dict[str, int] = {
    "sun":     swe.SUN,
    "moon":    swe.MOON,
    "mars":    swe.MARS,
    "mercury": swe.MERCURY,
    "jupiter": swe.JUPITER,
    "venus":   swe.VENUS,
    "saturn":  swe.SATURN,
    "rahu":    swe.MEAN_NODE,
}

# Swiss Ephemeris flags for sidereal computation with speed
_SIDEREAL_SPEED = swe.FLG_SIDEREAL | swe.FLG_SPEED


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 1 — Location handling and input validation
# ═══════════════════════════════════════════════════════════════════════════════

def validate_coordinates(lat: float, lon: float) -> None:
    """
    Validate geographic coordinates for panchanga computation.

    Parameters
    ----------
    lat : float
        Observer latitude in decimal degrees. Valid range: −90 to +90.
    lon : float
        Observer longitude in decimal degrees. Valid range: −180 to +180.

    Raises
    ------
    ValueError
        Immediately if either value lies outside the valid geographic range.

    Warns (stderr)
        For latitudes beyond ±66.5° (Arctic/Antarctic Circle) where polar
        day or polar night can prevent sunrise calculation on some dates.
    """
    if not isinstance(lat, (int, float)) or not isinstance(lon, (int, float)):
        raise ValueError(
            f"Coordinates must be numeric. Got lat={type(lat).__name__}, "
            f"lon={type(lon).__name__}."
        )
    if not -90.0 <= lat <= 90.0:
        raise ValueError(
            f"Latitude {lat!r} is outside the valid range [−90°, +90°]. "
            "Check your input — positive = North, negative = South."
        )
    if not -180.0 <= lon <= 180.0:
        raise ValueError(
            f"Longitude {lon!r} is outside the valid range [−180°, +180°]. "
            "Check your input — positive = East, negative = West."
        )
    if abs(lat) > 66.5:
        print(
            f"WARNING: Latitude {lat}° is beyond the Arctic/Antarctic Circle "
            "(±66.5°). Sunrise may not occur on every day of the year.",
            file=sys.stderr,
        )


def build_location(
    lat: float | None,
    lon: float | None,
    elevation_m: float = 1400.0,
    timezone_str: str = "Asia/Kathmandu",
) -> dict:
    """
    Build a validated observer-location dict from user arguments.

    Rules
    -----
    - Both lat **and** lon provided → use those exact coordinates.
    - Only one of lat/lon provided  → raise ValueError (both required together).
    - Neither provided               → default to Kathmandu, Nepal:
          Latitude  27.7172° N
          Longitude 85.3240° E
          Elevation 1400 m
          Timezone  Asia/Kathmandu (UTC+05:45)

    Returns
    -------
    dict with keys: latitude, longitude, elevation_m, timezone, name
    """
    if lat is None and lon is None:
        return {
            "latitude":    27.7172,
            "longitude":   85.3240,
            "elevation_m": 1400.0,
            "timezone":    "Asia/Kathmandu",
            "name":        "Kathmandu, Nepal (default)",
        }
    if lat is None or lon is None:
        raise ValueError(
            "Both --lat and --lon must be supplied together. "
            "Omit both to fall back to the Kathmandu default."
        )
    validate_coordinates(lat, lon)
    return {
        "latitude":    float(lat),
        "longitude":   float(lon),
        "elevation_m": float(elevation_m),
        "timezone":    timezone_str,
        "name":        f"Custom ({lat:.4f}°, {lon:.4f}°)",
    }


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 2 — Formatting helpers
# ═══════════════════════════════════════════════════════════════════════════════

def format_dms(degrees: float) -> str:
    """
    Convert a non-negative decimal-degree value to a D°M'S" string.

    Examples
    --------
    >>> format_dms(0.12)       # → '00°07'12"'
    >>> format_dms(123.7525)   # → '123°45'09"'
    >>> format_dms(359.9997)   # → '359°59'59"'
    """
    degrees = abs(degrees)
    d = int(degrees)
    m_frac = (degrees - d) * 60.0
    m = int(m_frac)
    s = round((m_frac - m) * 60.0)
    # Handle rounding carry-overs
    if s >= 60:
        s -= 60; m += 1
    if m >= 60:
        m -= 60; d += 1
    return f'{d:02d}°{m:02d}\'{s:02d}"'


def format_speed_dms(speed: float) -> str:
    """
    Format a daily-motion speed as a signed D°M'S" string.
    Negative speed = retrograde (Vakri).

    Examples
    --------
    >>> format_speed_dms(0.9856)    # → '+00°59'08"'
    >>> format_speed_dms(-0.0540)   # → '−00°03'14" (Vakri)'
    """
    sign = "+" if speed >= 0 else "−"
    dms = format_dms(abs(speed))
    suffix = " (Vakri)" if speed < 0 else ""
    return f"{sign}{dms}{suffix}"


def _local_hhmm(dt_utc: datetime, tz_name: str) -> str:
    """Return 'HH:MM' in the observer's local timezone."""
    tz = resolve_observer_timezone(tz_name)
    return dt_utc.astimezone(tz).strftime("%H:%M")


def _local_iso(dt_utc: datetime, tz_name: str) -> str:
    """Return ISO 8601 datetime string in the observer's local timezone."""
    tz = resolve_observer_timezone(tz_name)
    return dt_utc.astimezone(tz).isoformat()


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 3 — Core panchanga element computations
# ═══════════════════════════════════════════════════════════════════════════════

def _elongation(dt: datetime) -> float:
    """
    Moon–Sun angular elongation (nirayana/sidereal), range [0°, 360°).

    This is the fundamental input for Tithi and Karana calculations.
    Lahiri ayanamsa has already been applied via FLG_SIDEREAL.
    """
    sun_long, moon_long = get_sun_moon_positions(dt)
    return (moon_long - sun_long) % 360.0


def compute_tithi(dt: datetime) -> dict[str, Any]:
    """
    Tithi from Moon–Sun elongation.

    Returns number (1–30), display_number (1–15), paksha, name, elongation,
    progress within the current tithi (0.0–1.0), and DMS-formatted angle.
    """
    elong = _elongation(dt)
    raw = int(elong / TITHI_SPAN)          # 0-indexed, 0–29
    tithi_num = min(raw + 1, 30)           # 1–30
    paksha = "shukla" if tithi_num <= 15 else "krishna"
    display_num = tithi_num if tithi_num <= 15 else tithi_num - 15
    # Special names for full moon and new moon
    if display_num == 15:
        name = "Purnima" if paksha == "shukla" else "Amavasya"
    else:
        name = TITHI_NAMES[tithi_num - 1]
    progress = (elong % TITHI_SPAN) / TITHI_SPAN
    return {
        "number":        tithi_num,
        "display_number": display_num,
        "paksha":        paksha,
        "name":          name,
        "elongation":    round(elong, 6),
        "elongation_dms": format_dms(elong),
        "progress":      round(progress, 4),
    }


def compute_nakshatra(moon_long: float) -> dict[str, Any]:
    """
    Nakshatra from Moon's sidereal longitude.

    nakshatra = ⌊ λ☽ / 13°20′ ⌋ + 1   (1–27)
    pada      = ⌊ fractional_part × 4 ⌋ + 1   (1–4)
    """
    nak_float = moon_long / NAKSHATRA_SPAN
    nak_num = int(nak_float) + 1
    if nak_num > 27:
        nak_num = 1
    progress = nak_float % 1.0
    pada = min(int(progress * 4) + 1, 4)
    return {
        "number":            nak_num,
        "name":              NAKSHATRA_NAMES[nak_num - 1],
        "pada":              pada,
        "moon_longitude":    round(moon_long, 6),
        "moon_longitude_dms": format_dms(moon_long),
        "progress":          round(progress, 4),
    }


def compute_yoga(sun_long: float, moon_long: float) -> dict[str, Any]:
    """
    Yoga from the combined sidereal longitudes of Sun and Moon.

    yoga = ⌊ (λ☉ + λ☽) mod 360° / 13°20′ ⌋ + 1   (1–27)
    """
    combined = (sun_long + moon_long) % 360.0
    yoga_float = combined / YOGA_SPAN
    yoga_num = int(yoga_float) + 1
    if yoga_num > 27:
        yoga_num = 1
    progress = yoga_float % 1.0
    return {
        "number":                 yoga_num,
        "name":                   YOGA_NAMES[yoga_num - 1],
        "combined_longitude":     round(combined, 6),
        "combined_longitude_dms": format_dms(combined),
        "progress":               round(progress, 4),
    }


def compute_karana(elong: float) -> dict[str, Any]:
    """
    Karana from Moon–Sun elongation (6° half-tithi intervals).

    raw_index k = ⌊ ε / 6° ⌋   (0–59)
    k = 0        → Kimstughna (fixed)
    k ∈ 1–56     → cycling through 7 repeating karanas
    k = 57       → Shakuni (fixed)
    k = 58       → Chatushpada (fixed)
    k = 59       → Naga (fixed)
    """
    raw = min(int(elong / KARANA_SPAN), 59)   # 0-based, 0–59
    if raw in _FIXED_KARANA:
        name = _FIXED_KARANA[raw]
        is_fixed = True
    else:
        # (raw − 1) cycles through 7 repeating names: Bava(0)…Vishti(6)
        name = _REPEATING_KARANA[(raw - 1) % 7]
        is_fixed = False
    progress = (elong % KARANA_SPAN) / KARANA_SPAN
    return {
        "number":    raw + 1,      # 1-based for human display
        "raw_index": raw,
        "name":      name,
        "is_fixed":  is_fixed,
        "progress":  round(progress, 4),
    }


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 4 — End-time bisection algorithm
# ═══════════════════════════════════════════════════════════════════════════════

def _bisect_element_end(
    start_dt:  datetime,
    index_fn:  Callable[[datetime], int],
    *,
    max_hours: float = 36.0,
    tolerance_s: int = 60,
) -> datetime:
    """
    Bisection root-finder: locate the exact moment when a panchanga element
    transitions to its next value.

    Parameters
    ----------
    start_dt    Datetime at which the element's current index is captured.
    index_fn    Pure function  f(t) → int  returning the element's current
                integer index. Must change value exactly once in [start_dt,
                start_dt + max_hours].
    max_hours   Upper bound of the search window (hours).  36 h covers even
                the slowest Nakshatra / Yoga transitions.
    tolerance_s Desired precision in seconds.  Default 60 s (1 minute).

    Returns
    -------
    datetime   The first moment (rounded to ±tolerance_s) when
               index_fn(t) ≠ index_fn(start_dt).

    Algorithm
    ---------
    Bisection on the Boolean predicate "element still active":
      t_lo := start_dt        (element known active here)
      t_hi := start_dt + max  (element may have changed by here)

      Repeat up to 60 iterations:
        t_mid = midpoint(t_lo, t_hi)
        if f(t_mid) == current_index:  t_lo = t_mid   (active → push lo)
        else:                          t_hi = t_mid   (changed → push hi)
        stop when (t_hi − t_lo) < tolerance

    Convergence: ⌈log₂(36 h × 3600 s / 60 s)⌉ = 11 iterations guaranteed.
    The 60-iteration cap is a safety net with negligible overhead.
    """
    current_idx = index_fn(start_dt)
    t_lo = start_dt
    t_hi = start_dt + timedelta(hours=max_hours)
    tolerance = timedelta(seconds=tolerance_s)

    for _ in range(60):
        if t_hi - t_lo < tolerance:
            break
        t_mid = t_lo + (t_hi - t_lo) / 2
        if index_fn(t_mid) == current_idx:
            t_lo = t_mid   # element still active at midpoint
        else:
            t_hi = t_mid   # element has changed at midpoint

    return t_hi


def _tithi_index(dt: datetime) -> int:
    """Index function for tithi bisection: changes when Tithi advances."""
    return int(_elongation(dt) / TITHI_SPAN)


def _nakshatra_index(dt: datetime) -> int:
    """Index function for Nakshatra bisection: changes when Moon crosses 13°20′."""
    _, moon_long = get_sun_moon_positions(dt)
    return int(moon_long / NAKSHATRA_SPAN)


def _yoga_index(dt: datetime) -> int:
    """Index function for Yoga bisection: changes when (λ☉+λ☽) crosses 13°20′."""
    sun_long, moon_long = get_sun_moon_positions(dt)
    return int(((sun_long + moon_long) % 360.0) / YOGA_SPAN)


def _karana_index(dt: datetime) -> int:
    """Index function for Karana bisection: changes every 6° of elongation."""
    return int(_elongation(dt) / KARANA_SPAN)


def find_tithi_end(sunrise_dt: datetime) -> datetime:
    """
    Find the exact local time when the Tithi at sunrise ends.
    Uses bisection over the elongation-angle tithi-index function.
    """
    return _bisect_element_end(sunrise_dt, _tithi_index)


def find_nakshatra_end(sunrise_dt: datetime) -> datetime:
    """
    Find the exact local time when the Nakshatra at sunrise ends.
    Bisects the Moon's longitude nakshatra-index function.
    """
    return _bisect_element_end(sunrise_dt, _nakshatra_index)


def find_yoga_end(sunrise_dt: datetime) -> datetime:
    """
    Find the exact local time when the Yoga at sunrise ends.
    Bisects the combined (λ☉+λ☽) yoga-index function.
    """
    return _bisect_element_end(sunrise_dt, _yoga_index)


def find_karana_end(start_dt: datetime) -> datetime:
    """
    Find the exact local time when the Karana starting at start_dt ends.
    Bisects the 6° elongation karana-index function.
    """
    return _bisect_element_end(start_dt, _karana_index)


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 5 — Graha Spashta (planetary table at 06:00 AM local)
# ═══════════════════════════════════════════════════════════════════════════════

def graha_spashta_6am(target_date: date, loc: dict) -> dict[str, Any]:
    """
    Compute sidereal (nirayana) planetary positions at 06:00 AM local time,
    following the Toyanath Panchanga Patro table convention.

    Planets included
    ----------------
    Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu (mean node), Ketu.

    Lahiri ayanamsa is applied via swe.FLG_SIDEREAL before every calc_ut call.
    All longitudes are true nirayana degrees in [0°, 360°).

    Rahu  = Mean Ascending Node (moves retrograde, ~−0.053°/day).
    Ketu  = Rahu + 180° (South Node; always retrograde, always opposite Rahu).
    Speed = degrees/day; negative value = Vakri (retrograde motion).
    """
    tz = resolve_observer_timezone(loc["timezone"])
    dt_6am_local = datetime.combine(target_date, time(6, 0, 0), tzinfo=tz)
    dt_6am_utc   = dt_6am_local.astimezone(timezone.utc)

    swe.set_sid_mode(swe.SIDM_LAHIRI)
    jd = get_julian_day(dt_6am_utc)

    positions: dict[str, Any] = {}
    for graha_name, body_id in _GRAHA_BODIES.items():
        values = swe.calc_ut(jd, body_id, _SIDEREAL_SPEED)[0]
        lon    = values[0] % 360.0      # sidereal longitude
        speed  = values[3]              # deg/day (< 0 = retrograde)
        rashi_idx      = int(lon / 30) % 12
        deg_in_rashi   = lon % 30.0
        positions[graha_name] = {
            "longitude":       round(lon, 6),
            "dms":             format_dms(lon),
            "rashi":           RASHI_NAMES[rashi_idx],
            "rashi_no":        rashi_idx + 1,
            "deg_in_rashi":    round(deg_in_rashi, 4),
            "dms_in_rashi":    format_dms(deg_in_rashi),
            "speed_deg_day":   round(speed, 6),
            "speed_dms":       format_speed_dms(speed),
            "is_retrograde":   speed < 0,
        }

    # Derive Ketu — exactly 180° opposite Rahu
    rahu_lon       = positions["rahu"]["longitude"]
    ketu_lon       = (rahu_lon + 180.0) % 360.0
    ketu_rashi_idx = int(ketu_lon / 30) % 12
    rahu_speed     = positions["rahu"]["speed_deg_day"]
    positions["ketu"] = {
        "longitude":       round(ketu_lon, 6),
        "dms":             format_dms(ketu_lon),
        "rashi":           RASHI_NAMES[ketu_rashi_idx],
        "rashi_no":        ketu_rashi_idx + 1,
        "deg_in_rashi":    round(ketu_lon % 30.0, 4),
        "dms_in_rashi":    format_dms(ketu_lon % 30.0),
        "speed_deg_day":   round(-rahu_speed, 6),
        "speed_dms":       format_speed_dms(-rahu_speed),
        "is_retrograde":   True,   # Ketu is always retrograde by convention
    }

    return {
        "computed_at_local": dt_6am_local.isoformat(),
        "computed_at_utc":   dt_6am_utc.isoformat(),
        "ayanamsa_lahiri":   round(swe.get_ayanamsa_ut(jd), 6),
        "planets":           positions,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 6 — Full daily panchanga assembler
# ═══════════════════════════════════════════════════════════════════════════════

def build_panchanga_for_date(
    target: date,
    loc:    dict,
) -> dict[str, Any]:
    """
    Assemble the complete Toyanath-style daily Panchanga for one civil date.

    Computation order
    -----------------
    1. True sunrise & sunset at the observer's coordinates (pyswisseph).
    2. All five elements (Tithi, Nakshatra, Yoga, Karana, Vaara) evaluated
       at sunrise — this is the Udaya Tithi (ruling element for the day).
    3. End times for each changing element via bisection.
    4. Second Karana of the day (if the first ends before sunset).
    5. Graha Spashta planetary table at 06:00 AM local.

    Parameters
    ----------
    target : date   Civil (Gregorian) date.
    loc    : dict   Observer location dict from build_location().

    Returns
    -------
    dict   Fully structured JSON-ready panchanga for the requested date.
    """
    init_ephemeris()   # Ensures Lahiri ayanamsa is set in Swiss Ephemeris

    lat  = loc["latitude"]
    lon  = loc["longitude"]
    elev = loc["elevation_m"]
    tz   = loc["timezone"]

    # ── 1. Sunrise and sunset ────────────────────────────────────────────────
    sunrise_utc = calculate_sunrise(target, latitude=lat, longitude=lon,
                                    altitude=elev, timezone_name=tz)
    sunset_utc  = calculate_sunset(target, latitude=lat, longitude=lon,
                                   altitude=elev, timezone_name=tz)

    tz_obj         = resolve_observer_timezone(tz)
    sunrise_local  = sunrise_utc.astimezone(tz_obj)
    sunset_local   = sunset_utc.astimezone(tz_obj)
    duration_s     = (sunset_utc - sunrise_utc).total_seconds()
    duration_h     = int(duration_s // 3600)
    duration_m     = int((duration_s % 3600) // 60)

    # ── 2. Sidereal positions at sunrise (Lahiri nirayana) ───────────────────
    swe.set_sid_mode(swe.SIDM_LAHIRI)
    sun_long, moon_long = get_sun_moon_positions(sunrise_utc)
    elong = (moon_long - sun_long) % 360.0
    ayanamsa_val = get_ayanamsa(sunrise_utc)

    # ── 3. BS and Gregorian date labels ─────────────────────────────────────
    bs_year, bs_month, bs_day = gregorian_to_bs(target)

    # ── 4. Five Panchanga elements at Udaya (sunrise) ────────────────────────
    tithi_data   = compute_tithi(sunrise_utc)
    nak_data     = compute_nakshatra(moon_long)
    yoga_data    = compute_yoga(sun_long, moon_long)
    karana_data  = compute_karana(elong)

    # Vaara: Vedic day is determined by local sunrise datetime
    # (weekday conversion: Python Mon=0 → Vedic Sun(Ravi)=0 via (wd+1)%7)
    local_wd     = sunrise_local.weekday()
    vaara_idx    = (local_wd + 1) % 7   # 0=Sunday/Ravivara
    vaara_english = VAARA_ENGLISH[vaara_idx]   # from positions.py

    # ── 5. End times via bisection ───────────────────────────────────────────
    tithi_end_utc   = find_tithi_end(sunrise_utc)
    nak_end_utc     = find_nakshatra_end(sunrise_utc)
    yoga_end_utc    = find_yoga_end(sunrise_utc)
    karana_end_utc  = find_karana_end(sunrise_utc)

    # Helper: compute the next element name 90 s after a transition
    def _next_tithi(t: datetime) -> str:
        d = compute_tithi(t + timedelta(seconds=90))
        return d["name"]

    def _next_nakshatra(t: datetime) -> str:
        _, m = get_sun_moon_positions(t + timedelta(seconds=90))
        idx = int(m / NAKSHATRA_SPAN) % 27
        return NAKSHATRA_NAMES[idx]

    def _next_yoga(t: datetime) -> str:
        s, m = get_sun_moon_positions(t + timedelta(seconds=90))
        idx = int(((s + m) % 360.0) / YOGA_SPAN) % 27
        return YOGA_NAMES[idx]

    def _next_karana(t: datetime) -> str:
        e = _elongation(t + timedelta(seconds=90))
        return compute_karana(e)["name"]

    # ── 6. Second Karana (if first ends before sunset) ───────────────────────
    second_karana: dict | None = None
    if karana_end_utc < sunset_utc:
        k2_start    = karana_end_utc + timedelta(seconds=90)
        k2_elong    = _elongation(k2_start)
        k2_data     = compute_karana(k2_elong)
        k2_end_utc  = find_karana_end(k2_start)
        second_karana = {
            **k2_data,
            "start_time":          _local_hhmm(k2_start, tz),
            "start_datetime_local": _local_iso(k2_start, tz),
            "end_time":            _local_hhmm(k2_end_utc, tz),
            "end_datetime_local":   _local_iso(k2_end_utc, tz),
            "next":                _next_karana(k2_end_utc),
        }

    # ── 7. Graha Spashta at 06:00 AM local ──────────────────────────────────
    graha = graha_spashta_6am(target, loc)

    # ── 8. Assemble final payload ────────────────────────────────────────────
    return {
        # ── Calendar dates ──────────────────────────────────────────────────
        "date_bs": {
            "year":       bs_year,
            "month":      bs_month,
            "day":        bs_day,
            "month_name": bs_month_name(bs_month),
            "formatted":  f"{bs_year}-{bs_month:02d}-{bs_day:02d}",
        },
        "date_ad": target.isoformat(),

        # ── Observer location ────────────────────────────────────────────────
        "location": loc,

        # ── Ayanamsa (Lahiri) ────────────────────────────────────────────────
        "ayanamsa": {
            "name":   "Lahiri (Chitra Paksha)",
            "type":   "Sidereal / Nirayana",
            "value":  round(ayanamsa_val, 6),
            "dms":    format_dms(ayanamsa_val),
        },

        # ── Sunrise / sunset ─────────────────────────────────────────────────
        "sunrise": {
            "utc":   sunrise_utc.isoformat(),
            "local": sunrise_local.isoformat(),
            "time":  sunrise_local.strftime("%H:%M"),
        },
        "sunset": {
            "utc":             sunset_utc.isoformat(),
            "local":           sunset_local.isoformat(),
            "time":            sunset_local.strftime("%H:%M"),
            "duration_hm":     f"{duration_h:02d}h {duration_m:02d}m",
            "duration_seconds": int(duration_s),
        },

        # ── Vaara (Vedic day of week anchored to sunrise) ────────────────────
        "vaara": {
            "number":        vaara_idx,        # 0 = Sunday/Ravivara
            "name_vedic":    VAARA_VEDIC_NAMES[vaara_idx],
            "name_english":  vaara_english,
            "name_ne":       VAARA_NEPALI_NAMES[vaara_idx],
            "note":          "Vaara determined by local sunrise, not civil midnight",
        },

        # ── Tithi ────────────────────────────────────────────────────────────
        "tithi": {
            **tithi_data,
            "end_time":             _local_hhmm(tithi_end_utc, tz),
            "end_datetime_local":   _local_iso(tithi_end_utc, tz),
            "next":                 _next_tithi(tithi_end_utc),
        },

        # ── Nakshatra ────────────────────────────────────────────────────────
        "nakshatra": {
            **nak_data,
            "end_time":             _local_hhmm(nak_end_utc, tz),
            "end_datetime_local":   _local_iso(nak_end_utc, tz),
            "next":                 _next_nakshatra(nak_end_utc),
        },

        # ── Yoga ─────────────────────────────────────────────────────────────
        "yoga": {
            **yoga_data,
            "end_time":             _local_hhmm(yoga_end_utc, tz),
            "end_datetime_local":   _local_iso(yoga_end_utc, tz),
            "next":                 _next_yoga(yoga_end_utc),
        },

        # ── Karana (first of day + optional second) ──────────────────────────
        "karana": {
            **karana_data,
            "end_time":             _local_hhmm(karana_end_utc, tz),
            "end_datetime_local":   _local_iso(karana_end_utc, tz),
            "next":                 _next_karana(karana_end_utc),
            "second_karana":        second_karana,
        },

        # ── Graha Spashta at 06:00 AM ────────────────────────────────────────
        "graha_spashta": graha,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 7 — BS 2083 date-range iterator
# ═══════════════════════════════════════════════════════════════════════════════

def iter_bs_year_dates(bs_year: int) -> list[date]:
    """
    Return every Gregorian date corresponding to a given Bikram Sambat year.

    Strategy: scan from April 1 of (bs_year − 57) to April 30 of
    (bs_year − 56), collecting dates where gregorian_to_bs() → bs_year.
    This covers even years with unusual Baisakh 1 placement (April 10–16).
    """
    greg_start_year = bs_year - 57
    scan_start = date(greg_start_year,     4,  1)
    scan_end   = date(greg_start_year + 1, 4, 30)

    dates: list[date] = []
    current = scan_start
    while current <= scan_end:
        y, _, _ = gregorian_to_bs(current)
        if y == bs_year:
            dates.append(current)
        elif y > bs_year and dates:
            break   # Past the end of the BS year
        current += timedelta(days=1)
    return dates


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 8 — CLI
# ═══════════════════════════════════════════════════════════════════════════════

def _build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="panchanga_toyanath",
        description="Toyanath Panchanga Engine — daily Panchanga for BS 2083.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Examples:\n"
            "  python panchanga_toyanath.py --bs-date 2083-01-01\n"
            "  python panchanga_toyanath.py --ad-date 2026-08-28 --lat 27.46 --lon 84.43\n"
            "  python panchanga_toyanath.py --bs-year 2083 --output panchanga_2083.json\n"
            "  python panchanga_toyanath.py --sample\n"
        ),
    )

    # ── Date selection (mutually exclusive) ──────────────────────────────────
    dg = p.add_mutually_exclusive_group()
    dg.add_argument(
        "--bs-date", metavar="YYYY-MM-DD",
        help="BS date in YYYY-MM-DD format (e.g. 2083-01-01).",
    )
    dg.add_argument(
        "--ad-date", metavar="YYYY-MM-DD",
        help="AD (Gregorian) date in YYYY-MM-DD format (e.g. 2026-04-14).",
    )
    dg.add_argument(
        "--bs-year", type=int, metavar="YYYY",
        help="Generate full BS year (recommended: 2083). Use --output to save.",
    )
    dg.add_argument(
        "--sample", action="store_true",
        help="Run the built-in sample: Baisakh 1, 2083 — Kathmandu defaults.",
    )

    # ── Location ─────────────────────────────────────────────────────────────
    p.add_argument("--lat",  type=float, default=None,
                   help="Observer latitude (decimal °).  Omit for Kathmandu default.")
    p.add_argument("--lon",  type=float, default=None,
                   help="Observer longitude (decimal °). Omit for Kathmandu default.")
    p.add_argument("--elev", type=float, default=1400.0,
                   help="Elevation above sea level in metres (default: 1400).")
    p.add_argument("--timezone", type=str, default="Asia/Kathmandu",
                   help='IANA timezone string (default: "Asia/Kathmandu").')

    # ── Output ───────────────────────────────────────────────────────────────
    p.add_argument("--output", type=str, default=None,
                   help="Write JSON output to this file (default: stdout).")
    p.add_argument("--compact", action="store_true",
                   help="Compact JSON (no indentation). Default is pretty-printed.")
    return p


def main() -> None:
    args = _build_parser().parse_args()
    indent = None if args.compact else 2

    try:
        loc = build_location(args.lat, args.lon, args.elev, args.timezone)
    except ValueError as exc:
        print(f"Location error: {exc}", file=sys.stderr)
        sys.exit(1)

    # ── --sample ─────────────────────────────────────────────────────────────
    if args.sample:
        _run_sample()
        return

    # ── --bs-date ────────────────────────────────────────────────────────────
    if args.bs_date:
        try:
            parts = args.bs_date.split("-")
            bs_y, bs_m, bs_d = int(parts[0]), int(parts[1]), int(parts[2])
        except (ValueError, IndexError):
            print("ERROR: --bs-date must be YYYY-MM-DD (e.g. 2083-01-01)", file=sys.stderr)
            sys.exit(1)
        target_ad = bs_to_gregorian(bs_y, bs_m, bs_d)
        result = build_panchanga_for_date(target_ad, loc)
        _output(result, args.output, indent)
        return

    # ── --ad-date ────────────────────────────────────────────────────────────
    if args.ad_date:
        try:
            target_ad = date.fromisoformat(args.ad_date)
        except ValueError:
            print("ERROR: --ad-date must be YYYY-MM-DD (e.g. 2026-04-14)", file=sys.stderr)
            sys.exit(1)
        result = build_panchanga_for_date(target_ad, loc)
        _output(result, args.output, indent)
        return

    # ── --bs-year ────────────────────────────────────────────────────────────
    if args.bs_year:
        all_dates = iter_bs_year_dates(args.bs_year)
        if not all_dates:
            print(f"ERROR: No dates found for BS year {args.bs_year}", file=sys.stderr)
            sys.exit(1)
        total   = len(all_dates)
        results = []
        for i, d in enumerate(all_dates, 1):
            print(f"  [{i:3d}/{total}] Computing {d.isoformat()} ...",
                  file=sys.stderr, end="\r")
            results.append(build_panchanga_for_date(d, loc))
        print(f"\nGenerated {total} days for BS {args.bs_year}.", file=sys.stderr)
        envelope = {
            "bs_year":  args.bs_year,
            "location": loc,
            "count":    total,
            "days":     results,
        }
        _output(envelope, args.output, indent)
        return

    # ── Default: today in the observer's timezone ─────────────────────────────
    tz_obj    = resolve_observer_timezone(loc["timezone"])
    today_loc = datetime.now(tz_obj).date()
    result    = build_panchanga_for_date(today_loc, loc)
    _output(result, args.output, indent)


def _output(data: Any, filepath: str | None, indent: int | None) -> None:
    """Write JSON to stdout or a file."""
    text = json.dumps(data, ensure_ascii=False, indent=indent)
    if filepath:
        Path(filepath).write_text(text, encoding="utf-8")
        print(f"Written → {filepath}", file=sys.stderr)
    else:
        print(text)


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 9 — Built-in sample execution
# ═══════════════════════════════════════════════════════════════════════════════

def _run_sample() -> None:
    """
    Sample execution: Baisakh 1, BS 2083 at Kathmandu.

    AD date: 2026-04-14 (Tuesday)
    Location: 27.7172° N, 85.3240° E, 1400 m, UTC+05:45
    Ayanamsa: Lahiri / Chitra Paksha
    """
    print("═" * 68, file=sys.stderr)
    print("  Toyanath Panchanga Engine — Sample Execution", file=sys.stderr)
    print(f"  Date  : Baisakh 1, BS 2083 (AD 2026-04-14)", file=sys.stderr)
    print(f"  Place : Kathmandu, Nepal (27.7172°N, 85.3240°E, 1400 m)", file=sys.stderr)
    print(f"  Ayanamsa: Lahiri (Chitra Paksha)", file=sys.stderr)
    print("═" * 68, file=sys.stderr)

    init_ephemeris()
    loc = build_location(None, None)             # Kathmandu defaults
    result = build_panchanga_for_date(date(2026, 4, 14), loc)
    print(json.dumps(result, ensure_ascii=False, indent=2))


# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # Running without arguments executes the built-in sample for Baisakh 1, 2083
    if len(sys.argv) == 1:
        _run_sample()
    else:
        main()
