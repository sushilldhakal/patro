"""
Muhurta calculations: Rahu Kalam, Yamaganda, Gulika, Abhijit Muhurta.

All three inauspicious periods divide the daytime (sunrise → sunset) into
8 equal Hora Kalas. The period assigned to each planet-lord rotates daily.

    Day (vaara_index 0–6):  Sun  Mon  Tue  Wed  Thu  Fri  Sat
    Rahu Kalam period:        8    2    7    5    6    4    3
    Yamaganda period:         5    4    3    2    1    8    7
    Gulika period:            7    6    5    4    3    2    1

    Mnemonic (Rahu Kalam):  "8-2-7-5-6-4-3" for Sun through Sat.

Abhijit Muhurta is the most auspicious 1/15th of the daytime, centred on
local solar noon. The daytime is divided into 15 muhurtas; Abhijit is the 8th.

Vaara index convention (matches core.positions.get_vaara):
    0 = Sunday (Ravivara)
    1 = Monday (Somavara)
    …
    6 = Saturday (Shanivara)
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from core.time_utils import resolve_observer_timezone

# ─── Period tables (1-based index into 8 equal Hora Kalas) ───────────────────

_RAHU_KALAM_PERIOD:  list[int] = [8, 2, 7, 5, 6, 4, 3]
_YAMAGANDA_PERIOD:   list[int] = [5, 4, 3, 2, 1, 8, 7]
_GULIKA_PERIOD:      list[int] = [7, 6, 5, 4, 3, 2, 1]

# The 15 traditional muhurta names (ordered 1 → 15, Abhijit = index 7 = 8th)
MUHURTA_NAMES: list[str] = [
    "Rudra", "Ahi", "Mitra", "Pitri", "Vasu",
    "Vara", "Vishvedeva", "Abhijit", "Rohini", "Naga",
    "Punarvas", "Varuna", "Aryama", "Bhaga", "Girish",
]

# Auspiciousness of each muhurta (True = auspicious)
MUHURTA_AUSPICIOUS: list[bool] = [
    False, False, True, True, True,
    True,  True,  True, True, False,
    True,  True,  True, True, True,
]


def _hora_kala(
    sunrise_utc: datetime,
    sunset_utc: datetime,
    period_no: int,
) -> tuple[datetime, datetime]:
    """
    Compute one of the 8 equal Hora Kala periods.

    Parameters
    ----------
    period_no : int   1-based (1 = first period immediately after sunrise,
                                8 = last period ending at sunset).
    """
    total_s = (sunset_utc - sunrise_utc).total_seconds()
    hora_s  = total_s / 8.0
    start   = sunrise_utc + timedelta(seconds=(period_no - 1) * hora_s)
    end     = sunrise_utc + timedelta(seconds=period_no * hora_s)
    return start, end


def _period_block(
    sunrise_utc: datetime,
    sunset_utc: datetime,
    period_no: int,
    tz_name: str,
    *,
    is_auspicious: bool,
) -> dict[str, Any]:
    tz   = resolve_observer_timezone(tz_name)
    s, e = _hora_kala(sunrise_utc, sunset_utc, period_no)
    return {
        "period_no":    period_no,
        "start_time":  s.astimezone(tz).strftime("%H:%M"),
        "end_time":    e.astimezone(tz).strftime("%H:%M"),
        "start_local": s.astimezone(tz).isoformat(),
        "end_local":   e.astimezone(tz).isoformat(),
        "start_utc":   s.isoformat(),
        "end_utc":     e.isoformat(),
        "is_auspicious": is_auspicious,
    }


def compute_rahu_kalam(
    sunrise_utc: datetime,
    sunset_utc: datetime,
    vaara_index: int,
    tz_name: str,
) -> dict[str, Any]:
    """
    Rahu Kalam — inauspicious period governed by Rahu.

    The 8 Hora Kalas span sunrise to sunset. Rahu Kalam falls on the period
    shown in the table:  Sun→8, Mon→2, Tue→7, Wed→5, Thu→6, Fri→4, Sat→3.

    Avoid starting new ventures, travel, or auspicious acts during this window.
    """
    period = _RAHU_KALAM_PERIOD[vaara_index % 7]
    block  = _period_block(sunrise_utc, sunset_utc, period, tz_name, is_auspicious=False)
    return {"lord": "Rahu", **block}


def compute_yamaganda(
    sunrise_utc: datetime,
    sunset_utc: datetime,
    vaara_index: int,
    tz_name: str,
) -> dict[str, Any]:
    """
    Yamaganda — inauspicious period associated with Yama (lord of death).

    Period table:  Sun→5, Mon→4, Tue→3, Wed→2, Thu→1, Fri→8, Sat→7.
    """
    period = _YAMAGANDA_PERIOD[vaara_index % 7]
    block  = _period_block(sunrise_utc, sunset_utc, period, tz_name, is_auspicious=False)
    return {"lord": "Yama", **block}


def compute_gulika(
    sunrise_utc: datetime,
    sunset_utc: datetime,
    vaara_index: int,
    tz_name: str,
) -> dict[str, Any]:
    """
    Gulika Kalam — inauspicious period of Gulika (Manda-putra, son of Saturn).

    Period table:  Sun→7, Mon→6, Tue→5, Wed→4, Thu→3, Fri→2, Sat→1.
    """
    period = _GULIKA_PERIOD[vaara_index % 7]
    block  = _period_block(sunrise_utc, sunset_utc, period, tz_name, is_auspicious=False)
    return {"lord": "Gulika (Manda-putra)", **block}


def compute_abhijit_muhurta(
    sunrise_utc: datetime,
    sunset_utc: datetime,
    tz_name: str,
) -> dict[str, Any]:
    """
    Abhijit Muhurta — the most auspicious window of the day.

    The daytime is divided into 15 equal muhurtas. Abhijit is the 8th muhurta,
    centred on local solar noon (midpoint between sunrise and sunset).

        muhurta_duration = (sunset − sunrise) / 15
        abhijit_start    = sunrise + 7 × muhurta_duration
        abhijit_end      = sunrise + 8 × muhurta_duration

    Note: Abhijit is traditionally considered absent on Wednesday (Budhavara)
    in some Panchanga traditions because it corresponds to the 28th nakshatra
    (Abhijit), which is excluded from the 27-nakshatra count on Wednesdays.
    """
    tz      = resolve_observer_timezone(tz_name)
    total_s = (sunset_utc - sunrise_utc).total_seconds()
    muhurta_s = total_s / 15.0
    solar_noon = sunrise_utc + timedelta(seconds=total_s / 2.0)
    start  = sunrise_utc + timedelta(seconds=7 * muhurta_s)
    end    = sunrise_utc + timedelta(seconds=8 * muhurta_s)

    return {
        "name":              "Abhijit",
        "muhurta_no":        8,
        "start_time":        start.astimezone(tz).strftime("%H:%M"),
        "end_time":          end.astimezone(tz).strftime("%H:%M"),
        "start_local":       start.astimezone(tz).isoformat(),
        "end_local":         end.astimezone(tz).isoformat(),
        "start_utc":         start.isoformat(),
        "end_utc":           end.isoformat(),
        "solar_noon":        solar_noon.astimezone(tz).strftime("%H:%M"),
        "duration_minutes":  round(muhurta_s / 60, 1),
        "is_auspicious":     True,
    }


def build_all_muhurtas(
    sunrise_utc: datetime,
    sunset_utc: datetime,
    tz_name: str,
) -> list[dict[str, Any]]:
    """
    Build the complete 15-muhurta daytime table.

    Returns a list of 15 dicts, each with name, times, and auspiciousness.
    Useful for rendering a full muhurta table in a Panchanga UI.
    """
    tz      = resolve_observer_timezone(tz_name)
    total_s = (sunset_utc - sunrise_utc).total_seconds()
    muhurta_s = total_s / 15.0
    result: list[dict[str, Any]] = []
    for i in range(15):
        s = sunrise_utc + timedelta(seconds=i * muhurta_s)
        e = sunrise_utc + timedelta(seconds=(i + 1) * muhurta_s)
        result.append({
            "number":        i + 1,
            "name":          MUHURTA_NAMES[i],
            "start_time":    s.astimezone(tz).strftime("%H:%M"),
            "end_time":      e.astimezone(tz).strftime("%H:%M"),
            "is_auspicious": MUHURTA_AUSPICIOUS[i],
        })
    return result


def build_muhurta_block(
    sunrise_utc: datetime,
    sunset_utc: datetime,
    vaara_index: int,
    tz_name: str,
) -> dict[str, Any]:
    """
    Assemble the full inauspicious-periods block for one day.

    vaara_index : 0=Sunday … 6=Saturday  (as returned by get_vaara()).
    """
    total_s   = (sunset_utc - sunrise_utc).total_seconds()
    return {
        "hora_duration_minutes":    round(total_s / 8  / 60, 1),
        "muhurta_duration_minutes": round(total_s / 15 / 60, 1),
        "rahu_kalam": compute_rahu_kalam(sunrise_utc, sunset_utc, vaara_index, tz_name),
        "yamaganda":  compute_yamaganda(sunrise_utc, sunset_utc, vaara_index, tz_name),
        "gulika":     compute_gulika(sunrise_utc, sunset_utc, vaara_index, tz_name),
        "abhijit":    compute_abhijit_muhurta(sunrise_utc, sunset_utc, tz_name),
    }
