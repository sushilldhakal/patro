"""Pushkara Navamsha — auspicious lagna-degree windows within each daily lagna span.

Out of 108 navamshas (9 per sign × 12 signs), 24 are Pushkara. When the ascendant
reaches the opening degree of those navamshas within a sign, that instant is the
recommended time to *initiate* important work (Sankalpa, signing, etc.).

Degree thresholds by element (start of Pushkara navamsha within the sign):
  Fire   (Mesha, Simha, Dhanu):  20°00′, 26°40′  (7th & 9th navamsha)
  Earth  (Vrish, Kanya, Makar):   6°40′, 13°20′  (3rd & 5th)
  Air    (Mithun, Tula, Kumbha): 16°40′, 23°20′  (6th & 8th)
  Water  (Karka, Vrishchik, Meena): 0°, 6°40′    (1st & 3rd)
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from engine.astronomy.engine import SIDM_LAHIRI
from engine.astronomy.positions import get_sidereal_asc_longitude
from engine.astronomy.timescale import resolve_observer_timezone

_NAVAMSHA_DEG = 30.0 / 9.0  # 3°20′

# Element → (navamsha index within sign, 1-based) pairs from tradition.
_PUSHKARA_NAV_IDX: dict[str, tuple[int, int]] = {
    "fire": (7, 9),
    "earth": (3, 5),
    "air": (6, 8),
    "water": (1, 3),
}


def rashi_element(rashi_number: int) -> str:
    """Map rashi 1–12 to fire/earth/air/water (Mesha=fire …)."""
    return ("fire", "earth", "air", "water")[(rashi_number - 1) % 4]


def pushkara_degrees_for_rashi(rashi_number: int) -> tuple[float, float]:
    """Opening degrees (within sign) of the two Pushkara navamshas."""
    a, b = _PUSHKARA_NAV_IDX[rashi_element(rashi_number)]
    return (a - 1) * _NAVAMSHA_DEG, (b - 1) * _NAVAMSHA_DEG


def _degree_in_rashi(
    dt: datetime, *, lat: float, lon: float, ayanamsa: int = SIDM_LAHIRI
) -> float:
    return get_sidereal_asc_longitude(dt, lat=lat, lon=lon, ayanamsa=ayanamsa) % 30.0


def find_lagna_degree_crossing(
    start_dt: datetime,
    end_dt: datetime,
    target_deg: float,
    *,
    lat: float,
    lon: float,
    tolerance_seconds: float = 2.0,
    ayanamsa: int = SIDM_LAHIRI,
) -> datetime | None:
    """When ascendant longitude (mod 30°) reaches target_deg during [start, end]."""
    if end_dt <= start_dt:
        return None

    d_start = _degree_in_rashi(start_dt, lat=lat, lon=lon, ayanamsa=ayanamsa)
    d_end = _degree_in_rashi(end_dt, lat=lat, lon=lon, ayanamsa=ayanamsa)

    # Ascendant moves forward through the sign during a single-rashi span.
    if d_end < d_start:
        d_end += 30.0
    adj_target = target_deg
    if adj_target < d_start - 0.02:
        adj_target += 30.0
    if adj_target > d_end + 0.02 or adj_target < d_start - 0.02:
        return None
    if abs(d_start - target_deg) < 0.03 or (target_deg == 0 and d_start < 0.5):
        return start_dt

    lo, hi = start_dt, end_dt
    for _ in range(64):
        if (hi - lo).total_seconds() <= tolerance_seconds:
            return lo + (hi - lo) / 2
        mid = lo + (hi - lo) / 2
        if _degree_in_rashi(mid, lat=lat, lon=lon, ayanamsa=ayanamsa) < target_deg - 1e-6:
            lo = mid
        else:
            hi = mid
    return hi


def _format_local_time(dt: datetime, tz_name: str) -> dict[str, str]:
    tz = resolve_observer_timezone(tz_name)
    local = dt.astimezone(tz)
    return {
        "local_time": local.strftime("%H:%M:%S"),
        "local_time_short": local.strftime("%H:%M"),
    }


def pushkara_times_for_span(
    span: dict[str, Any],
    *,
    lat: float,
    lon: float,
    timezone_name: str = "Asia/Kathmandu",
    ayanamsa: int = SIDM_LAHIRI,
) -> list[dict[str, Any]]:
    """Pushkara Navamsha clock times falling inside one lagna span."""
    start_raw = span.get("start_time")
    end_raw = span.get("end_time")
    rashi_num = int(span.get("number") or 0)
    if not start_raw or not end_raw or rashi_num < 1:
        return []

    start_dt = datetime.fromisoformat(str(start_raw).replace("Z", "+00:00"))
    end_dt = datetime.fromisoformat(str(end_raw).replace("Z", "+00:00"))

    hits: list[dict[str, Any]] = []
    for deg in pushkara_degrees_for_rashi(rashi_num):
        cross = find_lagna_degree_crossing(
            start_dt, end_dt, deg, lat=lat, lon=lon, ayanamsa=ayanamsa
        )
        if cross is None:
            continue
        times = _format_local_time(cross, timezone_name)
        hits.append(
            {
                "degree": round(deg, 4),
                "degree_dms": _dms_label(deg),
                **times,
            }
        )
    return hits


def enrich_lagna_spans_with_pushkara(
    spans: list[dict[str, Any]],
    *,
    lat: float,
    lon: float,
    timezone_name: str = "Asia/Kathmandu",
    ayanamsa: int = SIDM_LAHIRI,
) -> list[dict[str, Any]]:
    """Attach pushkara_navamsha times to each lagna span (mutates copies)."""
    enriched: list[dict[str, Any]] = []
    for span in spans:
        row = dict(span)
        row["pushkara_navamsha"] = pushkara_times_for_span(
            span, lat=lat, lon=lon, timezone_name=timezone_name, ayanamsa=ayanamsa
        )
        enriched.append(row)
    return enriched


def _dms_label(deg_float: float) -> str:
    d = int(deg_float)
    m = int(round((deg_float - d) * 60))
    if m >= 60:
        d += 1
        m = 0
    return f"{d}°{m:02d}'"
