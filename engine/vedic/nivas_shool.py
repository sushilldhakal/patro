"""Nivas and Shool — directional abodes and homa indicators for the daily panchanga.

Formulas follow Dharmasindhu / Muhurta Chintamani conventions (also used by
kaalavidya). Timed segments are recomputed at tithi, nakshatra, and karana
boundaries so the frontend only renders API data.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from engine.astronomy.positions import get_chandra_rashi, get_karana, get_nakshatra
from engine.vedic.element_boundaries import (
    find_karana_end,
    find_moon_rashi_end,
    find_nakshatra_end,
    find_tithi_end,
)
from engine.vedic.ghati_time import time_from_sunrise
from engine.vedic.rashi_spans import get_surya_nakshatra
from engine.vedic.tithi import calculate_tithi

# Python weekday (Mon=0 … Sun=6) → disha shool index (0=E, 1=W, 2=N, 3=S).
# Mon=E, Tue=N, Wed=N, Thu=S, Fri=W, Sat=E, Sun=W (DrikPanchang convention).
_DISHA_SHOOLA_MAP = [0, 2, 2, 3, 1, 0, 1]

# Python weekday → Vedic vaara (1=Ravi … 7=Shani) for Agnivasa
_PY_TO_VAARA = {6: 1, 0: 2, 1: 3, 2: 4, 3: 5, 4: 6, 5: 7}

_DIRECTIONS = (
    {"key": "E", "name_en": "East", "name_ne": "पूर्व"},
    {"key": "W", "name_en": "West", "name_ne": "पश्चिम"},
    {"key": "N", "name_en": "North", "name_ne": "उत्तर"},
    {"key": "S", "name_en": "South", "name_ne": "दक्षिण"},
)

# Rahu Vasa is a distinct 8-direction weekday cycle (NOT the Disha Shool set):
# starting Sunday = North it rotates N → NW → W → SW → S → SE → E across the
# week, using intercardinal points too (DrikPanchang / Muhurta convention).
# Keyed by Python weekday (Mon=0 … Sun=6).
_RAHU_VASA_BY_PY_WEEKDAY = {
    0: {"direction_key": "NW", "name_en": "North-West", "name_ne": "वायव्य"},   # Monday
    1: {"direction_key": "W", "name_en": "West", "name_ne": "पश्चिम"},          # Tuesday
    2: {"direction_key": "SW", "name_en": "South-West", "name_ne": "नैऋत्य"},   # Wednesday
    3: {"direction_key": "S", "name_en": "South", "name_ne": "दक्षिण"},         # Thursday
    4: {"direction_key": "SE", "name_en": "South-East", "name_ne": "आग्नेय"},   # Friday
    5: {"direction_key": "E", "name_en": "East", "name_ne": "पूर्व"},           # Saturday
    6: {"direction_key": "N", "name_en": "North", "name_ne": "उत्तर"},          # Sunday
}


def _rahu_vasa(weekday_py: int) -> dict[str, Any]:
    return dict(_RAHU_VASA_BY_PY_WEEKDAY[weekday_py % 7])

_AGNIVASA = (
    {"name_en": "Prithvi", "name_ne": "पृथ्वी", "subtitle_en": "Earth", "subtitle_ne": "भूमि", "is_auspicious": True},
    {"name_en": "Akasha", "name_ne": "आकाश", "subtitle_en": "Sky", "subtitle_ne": "आकाश", "is_auspicious": False},
    {"name_en": "Patala", "name_ne": "पाताल", "subtitle_en": "Nadir", "subtitle_ne": "पाताल", "is_auspicious": False},
)

# Agnivasa formula remainder → index in _AGNIVASA (0/3→Prithvi, 1→Akasha, 2→Patala)
_AGNIVASA_RESULT = {0: 0, 3: 0, 1: 1, 2: 2}

_SHIVAVASA = (
    {"name_en": "Gauri-sannidhau", "name_ne": "गौरी सन्निधि", "is_auspicious": True},
    {"name_en": "Sabhayam", "name_ne": "सभा", "is_auspicious": False},
    {"name_en": "Vrishabhaarudha", "name_ne": "वृषभारूढ", "is_auspicious": True},
    {"name_en": "Kailase", "name_ne": "कैलास", "is_auspicious": False},
    {"name_en": "Bhojane", "name_ne": "भोजन", "is_auspicious": False},
    {"name_en": "Kridayam", "name_ne": "क्रीडा", "is_auspicious": False},
    {"name_en": "Shmashane", "name_ne": "श्मशान", "is_auspicious": False},
)
_SHIVAVASA_RESULT = {1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 0: 6}

_HOMAHUTI_GRAHAS = (
    {"key": "sun", "symbol": "☉", "name_en": "Surya", "name_ne": "सूर्य", "is_auspicious": False},
    {"key": "moon", "symbol": "☽", "name_en": "Chandra", "name_ne": "चन्द्र", "is_auspicious": False},
    {"key": "mars", "symbol": "♂", "name_en": "Mangala", "name_ne": "मंगल", "is_auspicious": False},
    {"key": "mercury", "symbol": "☿", "name_en": "Budha", "name_ne": "बुध", "is_auspicious": True},
    {"key": "jupiter", "symbol": "♃", "name_en": "Guru", "name_ne": "गुरु", "is_auspicious": True},
    {"key": "venus", "symbol": "♀", "name_en": "Shukra", "name_ne": "शुक्र", "is_auspicious": True},
    {"key": "saturn", "symbol": "♄", "name_en": "Shani", "name_ne": "शनि", "is_auspicious": False},
    {"key": "rahu", "symbol": "☊", "name_en": "Rahu", "name_ne": "राहु", "is_auspicious": False},
    {"key": "ketu", "symbol": "☋", "name_en": "Ketu", "name_ne": "केतु", "is_auspicious": False},
)

_KUMBHACHAKRA_PARTS = (
    {"name_en": "Head", "name_ne": "शिर", "is_auspicious": False},
    {"name_en": "Eyes", "name_ne": "नेत्र", "is_auspicious": False},
    {"name_en": "Throat", "name_ne": "कण्ठ", "is_auspicious": False},
    {"name_en": "Heart", "name_ne": "हृदय", "is_auspicious": False},
    {"name_en": "Navel", "name_ne": "नाभि", "is_auspicious": False},
    {"name_en": "Bottom", "name_ne": "अधोभाग", "is_auspicious": True},
    {"name_en": "Thighs", "name_ne": "जङ्घा", "is_auspicious": False},
)

# Moon rashi → Bhadra loka during Vishti karana
_BHADRA_LOKA_BY_RASHI = {
    1: "swarga",
    2: "swarga",
    3: "swarga",
    8: "swarga",
    4: "prithvi",
    5: "prithvi",
    11: "prithvi",
    12: "prithvi",
    6: "patala",
    7: "patala",
    9: "patala",
    10: "patala",
}

_BHADRA_LOKA = {
    "swarga": {
        "name_en": "Swarga",
        "name_ne": "स्वर्ग",
        "subtitle_en": "Heaven",
        "subtitle_ne": "स्वर्ग",
        "is_auspicious": True,
    },
    "prithvi": {
        "name_en": "Prithvi",
        "name_ne": "पृथ्वी",
        "subtitle_en": "Earth",
        "subtitle_ne": "भूमि",
        "is_auspicious": False,
    },
    "patala": {
        "name_en": "Patala",
        "name_ne": "पाताल",
        "subtitle_en": "Nadir",
        "subtitle_ne": "पाताल",
        "is_auspicious": True,
    },
}


def _local_short(dt: datetime, timezone_name: str) -> str:
    from engine.astronomy.timescale import resolve_observer_timezone

    local = dt.astimezone(resolve_observer_timezone(timezone_name))
    return local.strftime("%H:%M")


def _attach_span_end(
    span: dict[str, Any],
    end_dt: datetime,
    sunrise_dt: datetime,
    day_end: datetime,
    timezone_name: str,
) -> None:
    if end_dt >= day_end:
        span["until_full_night"] = True
        return
    end_info = time_from_sunrise(end_dt, sunrise_dt, timezone_name)
    span.update(
        {
            "end_time": end_dt.isoformat(),
            "end_local_time": end_info["local_time"],
            "end_local_time_short": _local_short(end_dt, timezone_name),
        }
    )


def _direction(idx: int) -> dict[str, Any]:
    d = _DIRECTIONS[idx % 4]
    return {
        "direction_key": d["key"],
        "name_en": d["name_en"],
        "name_ne": d["name_ne"],
    }


def _disha_shool(weekday_py: int) -> dict[str, Any]:
    idx = _DISHA_SHOOLA_MAP[weekday_py % 7]
    out = _direction(idx)
    safe = [d for i, d in enumerate(_DIRECTIONS) if i != idx]
    out["auspicious_directions"] = [
        {"direction_key": d["key"], "name_en": d["name_en"], "name_ne": d["name_ne"]}
        for d in safe
    ]
    return out


def _agnivasa_at(tithi_absolute: int, weekday_py: int) -> dict[str, Any]:
    vaara = _PY_TO_VAARA[weekday_py % 7]
    remainder = (tithi_absolute + vaara + 1) % 4
    entry = _AGNIVASA[_AGNIVASA_RESULT[remainder]]
    return {
        **entry,
        "name_en": entry["name_en"],
        "name_ne": entry["name_ne"],
    }


def _shivavasa_at(tithi_absolute: int) -> dict[str, Any]:
    paksha_tithi = ((tithi_absolute - 1) % 15) + 1
    remainder = (paksha_tithi * 2 + 5) % 7
    entry = _SHIVAVASA[_SHIVAVASA_RESULT[remainder]]
    return dict(entry)


def _homahuti_at(instant: datetime) -> dict[str, Any]:
    sun_nak = get_surya_nakshatra(instant)["number"]
    moon_nak = get_nakshatra(instant)[0]
    distance = (moon_nak - sun_nak) % 27
    graha = _HOMAHUTI_GRAHAS[(distance // 3) % 9]
    return dict(graha)


def _chandra_vasa_at(instant: datetime) -> dict[str, Any]:
    rashi = get_chandra_rashi(instant)["number"]
    return _direction((rashi - 1) % 4)


def _kumbha_chakra_at(paksha_tithi: int, weekday_py: int) -> dict[str, Any]:
    idx = (weekday_py + paksha_tithi) % 7
    part = _KUMBHACHAKRA_PARTS[idx]
    return {
        **part,
        "index": idx,
    }


def _tithi_at(instant: datetime) -> dict[str, Any]:
    return calculate_tithi(instant)


def _collect_tithi_boundaries(
    sunrise_dt: datetime,
    next_sunrise_dt: datetime,
) -> list[datetime]:
    points = [sunrise_dt]
    cursor = sunrise_dt
    while cursor < next_sunrise_dt:
        end_dt = min(find_tithi_end(cursor), next_sunrise_dt)
        if end_dt < next_sunrise_dt and end_dt not in points:
            points.append(end_dt)
        if end_dt >= next_sunrise_dt:
            break
        cursor = end_dt + timedelta(seconds=90)
    return points


def _collect_nakshatra_boundaries(
    sunrise_dt: datetime,
    next_sunrise_dt: datetime,
) -> list[datetime]:
    points = [sunrise_dt]
    cursor = sunrise_dt
    while cursor < next_sunrise_dt:
        end_dt = min(find_nakshatra_end(cursor), next_sunrise_dt)
        if end_dt < next_sunrise_dt and end_dt not in points:
            points.append(end_dt)
        if end_dt >= next_sunrise_dt:
            break
        cursor = end_dt + timedelta(seconds=90)
    return points


def _collect_rashi_boundaries(
    sunrise_dt: datetime,
    next_sunrise_dt: datetime,
) -> list[datetime]:
    points = [sunrise_dt]
    cursor = sunrise_dt
    while cursor < next_sunrise_dt:
        end_dt = min(find_moon_rashi_end(cursor), next_sunrise_dt)
        if end_dt < next_sunrise_dt and end_dt not in points:
            points.append(end_dt)
        if end_dt >= next_sunrise_dt:
            break
        cursor = end_dt + timedelta(seconds=90)
    return points


def _build_timed_segments(
    boundaries: list[datetime],
    sunrise_dt: datetime,
    next_sunrise_dt: datetime,
    timezone_name: str,
    compute_value: Any,
) -> list[dict[str, Any]]:
    if not boundaries:
        return []

    segments: list[dict[str, Any]] = []
    for idx, start in enumerate(boundaries):
        end = boundaries[idx + 1] if idx + 1 < len(boundaries) else next_sunrise_dt
        value = compute_value(start)
        span: dict[str, Any] = {
            "start_time": start.isoformat(),
            "start_local_time_short": _local_short(start, timezone_name),
            **value,
        }
        if end < next_sunrise_dt:
            _attach_span_end(span, end, sunrise_dt, next_sunrise_dt, timezone_name)
        else:
            span["until_full_night"] = True
        segments.append(span)
    return segments


def _collect_vishti_spans(
    sunrise_dt: datetime,
    next_sunrise_dt: datetime,
    timezone_name: str,
) -> list[dict[str, Any]]:
    spans: list[dict[str, Any]] = []
    cursor = sunrise_dt
    while cursor < next_sunrise_dt:
        _, name = get_karana(cursor)
        if name != "Vishti":
            cursor = find_karana_end(cursor) + timedelta(seconds=90)
            continue
        end_dt = min(find_karana_end(cursor), next_sunrise_dt)
        rashi = get_chandra_rashi(cursor)["number"]
        loka_key = _BHADRA_LOKA_BY_RASHI.get(rashi, "prithvi")
        loka = _BHADRA_LOKA[loka_key]
        span: dict[str, Any] = {
            "start_time": cursor.isoformat(),
            "start_local_time_short": _local_short(cursor, timezone_name),
            **loka,
            "loka": loka_key,
        }
        if end_dt < next_sunrise_dt:
            _attach_span_end(span, end_dt, sunrise_dt, next_sunrise_dt, timezone_name)
        else:
            span["until_full_night"] = True
        spans.append(span)
        cursor = end_dt + timedelta(seconds=90)
    return spans


def build_nivas_shool_block(
    sunrise_dt: datetime,
    next_sunrise_dt: datetime,
    *,
    weekday_py: int,
    timezone_name: str,
) -> dict[str, Any]:
    """Compute Nivas & Shool for the Hindu day (sunrise → next sunrise)."""
    disha = _disha_shool(weekday_py)

    tithi_bounds = _collect_tithi_boundaries(sunrise_dt, next_sunrise_dt)
    nak_bounds = _collect_nakshatra_boundaries(sunrise_dt, next_sunrise_dt)
    rashi_bounds = _collect_rashi_boundaries(sunrise_dt, next_sunrise_dt)

    def agni_at(instant: datetime) -> dict[str, Any]:
        tithi = _tithi_at(instant)
        return _agnivasa_at(tithi["number"], weekday_py)

    def shiva_at(instant: datetime) -> dict[str, Any]:
        tithi = _tithi_at(instant)
        return _shivavasa_at(tithi["number"])

    def kumbha_at(instant: datetime) -> dict[str, Any]:
        tithi = _tithi_at(instant)
        return _kumbha_chakra_at(tithi["display_number"], weekday_py)

    agnivasa_segments = _build_timed_segments(
        tithi_bounds, sunrise_dt, next_sunrise_dt, timezone_name, agni_at
    )
    shivavasa_segments = _build_timed_segments(
        tithi_bounds, sunrise_dt, next_sunrise_dt, timezone_name, shiva_at
    )
    kumbha_segments = _build_timed_segments(
        tithi_bounds, sunrise_dt, next_sunrise_dt, timezone_name, kumbha_at
    )
    homahuti_segments = _build_timed_segments(
        sorted(set(tithi_bounds + nak_bounds)),
        sunrise_dt,
        next_sunrise_dt,
        timezone_name,
        _homahuti_at,
    )
    chandra_vasa_segments = _build_timed_segments(
        rashi_bounds, sunrise_dt, next_sunrise_dt, timezone_name, _chandra_vasa_at
    )
    bhadravasa_segments = _collect_vishti_spans(sunrise_dt, next_sunrise_dt, timezone_name)

    return {
        "homahuti": {
            "current": homahuti_segments[0] if homahuti_segments else _homahuti_at(sunrise_dt),
            "segments": homahuti_segments,
        },
        "disha_shool": disha,
        "rahu_vasa": _rahu_vasa(weekday_py),
        "agnivasa": {
            "current": agnivasa_segments[0] if agnivasa_segments else agni_at(sunrise_dt),
            "segments": agnivasa_segments,
        },
        "shivavasa": {
            "current": shivavasa_segments[0] if shivavasa_segments else shiva_at(sunrise_dt),
            "segments": shivavasa_segments,
        },
        "chandra_vasa": {
            "current": chandra_vasa_segments[0] if chandra_vasa_segments else _chandra_vasa_at(sunrise_dt),
            "segments": chandra_vasa_segments,
        },
        "bhadravasa": {
            "active": bool(bhadravasa_segments),
            "segments": bhadravasa_segments,
        },
        "kumbha_chakra": {
            "current": kumbha_segments[0] if kumbha_segments else kumbha_at(sunrise_dt),
            "segments": kumbha_segments,
        },
    }
