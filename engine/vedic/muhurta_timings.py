"""Extended daily muhurta timings — Amrit Kalam, Varjyam, Sandhya, yogas, Baana, etc.

Formulas follow published Panchang conventions (Muhurta Chintamani / Nārada Saṃhitā
style), aligned with common Drik/Kaalavidya outputs. Timed segments are computed on
the server; the frontend only renders API data.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from engine.astronomy.positions import (
    get_display_tithi,
    get_karana,
    get_nakshatra,
    get_paksha,
    get_tithi_angle,
    get_tithi_number,
    get_yoga,
)
from engine.astronomy.swiss_eph import get_sun_longitude
from engine.astronomy.timescale import resolve_observer_timezone
from engine.vedic.ghati_time import time_from_sunrise
from engine.vedic.rashi_spans import get_surya_nakshatra
from engine.vedic.element_boundaries import (
    _find_span_end,
    find_karana_end,
    find_nakshatra_end,
    find_nakshatra_start,
    find_sun_nakshatra_end,
    find_yoga_end,
    find_yoga_start,
)
from engine.vedic.tithi_boundaries import find_tithi_end, find_tithi_start

GHATIKA_SECONDS = 24 * 60
PERIOD_GHATIS = 4  # Amrit / Varjyam window = 4 ghatis of nakshatra duration
SANDHYA_NIGHT_GHATIKAS = 3.0

# Amrit / Varjyam offset in ghatis (0–60) for a 60-ghati nakshatra span.
# Second column (Varjyam / नक्षत्र विष) follows the classical Vish Ghatika table;
# the poison window runs offset → offset+4 ghatis of that day's true nakshatra span.
_NAKSHATRA_AMRITA_VARJYAM: list[tuple[list[int], list[int]]] = [
    ([42], [50]),   # Ashwini
    ([48], [24]),   # Bharani
    ([54], [30]),   # Krittika
    ([52], [4]),    # Rohini
    ([38], [14]),   # Mrigashira
    ([35], [11]),   # Ardra
    ([54], [30]),   # Punarvasu
    ([44], [20]),   # Pushya
    ([56], [32]),   # Ashlesha
    ([54], [30]),   # Magha
    ([44], [20]),   # Purva Phalguni
    ([42], [18]),   # Uttara Phalguni
    ([45], [21]),   # Hasta
    ([44], [20]),   # Chitra
    ([38], [14]),   # Swati
    ([38], [14]),   # Vishakha
    ([34], [10]),   # Anuradha
    ([38], [14]),   # Jyeshtha
    ([44], [20]),   # Mula
    ([48], [20]),   # Purva Ashadha
    ([44], [24]),   # Uttara Ashadha
    ([34], [10]),   # Shravana
    ([34], [10]),   # Dhanishta
    ([42], [18]),   # Shatabhisha
    ([40], [16]),   # Purva Bhadrapada
    ([48], [24]),   # Uttara Bhadrapada
    ([54], [30]),   # Revati
]

# Sarvartha Siddhi — weekday (Sun=0) → nakshatra indexes (0=Ashwini).
_SARVARTHA_SIDDHI: dict[int, list[int]] = {
    0: [3, 7, 11, 12, 20, 25],
    1: [3, 4, 7, 16, 21],
    2: [0, 2, 8, 12, 25],
    3: [2, 3, 4, 12, 16, 24, 25],
    4: [6, 7, 16, 26],
    5: [0, 6, 16, 21, 26],
    6: [3, 14, 21],
}

_GANDA_MOOLA_INDEXES = frozenset({0, 8, 9, 17, 18, 26})

_AADAL_COUNTS = frozenset({2, 7, 9, 14, 16, 21, 23, 28})
_VIDAAL_COUNTS = frozenset({3, 6, 10, 13, 17, 20, 24, 27})

# Nārada weekday Dur Muhūrta — 0-based index in 30-muhurta day (0–14 day, 15–29 night).
_DUR_MUHURTA_INDEXES: dict[int, list[int]] = {
    0: [13],
    1: [11, 8],
    2: [3, 21],
    3: [7],
    4: [11, 5],
    5: [8, 3],
    6: [1, 15],
}

# Baana (बाण) is decided by the Sun's degree *within its zodiac sign* (0–30°).
# The N-th degree spans [N-1°, N°); when the Sun occupies one of the degrees below,
# the matching baana is active for as long as the Sun stays in that 1° band. Because
# the Sun advances ~1°/day, a day carries at most one or two baana windows (a window
# that runs past sunset into the night is reported as "until full night").
_BAANA_DEGREE: dict[int, str] = {}
for _deg in (1, 10, 19, 28):
    _BAANA_DEGREE[_deg] = "mrityu"
for _deg in (2, 11, 20, 29):
    _BAANA_DEGREE[_deg] = "agni"
for _deg in (4, 13, 21):
    _BAANA_DEGREE[_deg] = "raja"
for _deg in (6, 15, 24):
    _BAANA_DEGREE[_deg] = "chora"
for _deg in (8, 17, 26):
    _BAANA_DEGREE[_deg] = "roga"

_BAANA_META: dict[str, dict[str, Any]] = {
    "raja": {"name_en": "Raja", "name_ne": "राज", "is_auspicious": False},
    "chora": {"name_en": "Chora", "name_ne": "चोर", "is_auspicious": False},
    "mrityu": {"name_en": "Mrityu", "name_ne": "मृत्यु", "is_auspicious": False},
    "agni": {"name_en": "Agni", "name_ne": "अग्नि", "is_auspicious": False},
    "roga": {"name_en": "Roga", "name_ne": "रोग", "is_auspicious": False},
}

# Abhijit-inclusive nakshatra order for Ādal / Vidāl counting.
_ABHIJIT_ORDER = [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
    27, 21, 22, 23, 24, 25, 26,
]


def _local_short(dt: datetime, timezone_name: str) -> str:
    tz = resolve_observer_timezone(timezone_name)
    return dt.astimezone(tz).strftime("%H:%M")


def _add_seconds(dt: datetime, seconds: float) -> datetime:
    whole = int(seconds // 1)
    micro = int((seconds - whole) * 1_000_000)
    return dt + timedelta(seconds=whole, microseconds=micro)


def _segment(
    start_dt: datetime,
    end_dt: datetime,
    sunrise_dt: datetime,
    day_end: datetime,
    timezone_name: str,
    *,
    until_full_night: bool = False,
) -> dict[str, Any]:
    tz = resolve_observer_timezone(timezone_name)
    start_local = start_dt.astimezone(tz)
    out: dict[str, Any] = {
        "start_time": start_dt.isoformat(),
        "end_time": end_dt.isoformat(),
        "start_local_time": start_local.isoformat(),
        "start_local_time_short": _local_short(start_dt, timezone_name),
    }
    if until_full_night or end_dt >= day_end:
        out["until_full_night"] = True
        if end_dt < day_end:
            end_info = time_from_sunrise(end_dt, sunrise_dt, timezone_name)
            out["end_local_time"] = end_info["local_time"]
            out["end_local_time_short"] = _local_short(end_dt, timezone_name)
    else:
        end_info = time_from_sunrise(end_dt, sunrise_dt, timezone_name)
        out.update(
            {
                "end_local_time": end_info["local_time"],
                "end_local_time_short": _local_short(end_dt, timezone_name),
            }
        )
    if end_dt.date() != start_dt.date():
        out["spans_midnight"] = True
    return out


def _timing_entry(
    key: str,
    name_en: str,
    name_ne: str,
    segments: list[dict[str, Any]],
    *,
    is_auspicious: bool,
) -> dict[str, Any]:
    return {
        "key": key,
        "name_en": name_en,
        "name_ne": name_ne,
        "is_auspicious": is_auspicious,
        "segments": segments,
    }


def _clip_segment(
    start_dt: datetime,
    end_dt: datetime,
    scope_start: datetime,
    scope_end: datetime,
    sunrise_dt: datetime,
    timezone_name: str,
) -> dict[str, Any] | None:
    visible_start = max(start_dt, scope_start)
    visible_end = min(end_dt, scope_end)
    if visible_start >= visible_end:
        return None
    return _segment(
        visible_start,
        visible_end,
        sunrise_dt,
        scope_end,
        timezone_name,
        until_full_night=visible_end >= scope_end and end_dt > scope_end,
    )


def _muhurta_window(
    sunrise_utc: datetime,
    sunset_utc: datetime,
    next_sunrise_utc: datetime,
    index: int,
    sunrise_dt: datetime,
    day_end: datetime,
    timezone_name: str,
) -> tuple[datetime, datetime]:
    day_s = (sunset_utc - sunrise_utc).total_seconds()
    night_s = (next_sunrise_utc - sunset_utc).total_seconds()
    if index < 15:
        part = day_s / 15.0
        start = _add_seconds(sunrise_utc, index * part)
        end = _add_seconds(sunrise_utc, (index + 1) * part)
    else:
        part = night_s / 15.0
        ni = index - 15
        start = _add_seconds(sunset_utc, ni * part)
        end = _add_seconds(sunset_utc, (ni + 1) * part)
    return start, end


def _collect_nakshatra_intervals(
    scope_start: datetime,
    scope_end: datetime,
) -> list[dict[str, Any]]:
    intervals: list[dict[str, Any]] = []
    cursor = scope_start
    while cursor < scope_end:
        num, name, _ = get_nakshatra(cursor)
        nak_start = find_nakshatra_start(cursor)
        nak_end = find_nakshatra_end(cursor)
        intervals.append(
            {
                "index": num - 1,
                "number": num,
                "name": name,
                "start_dt": nak_start,
                "end_dt": nak_end,
            }
        )
        if nak_end >= scope_end:
            break
        cursor = nak_end + timedelta(seconds=90)
    return intervals


def _find_sun_nakshatra_end(dt: datetime) -> datetime:
    return find_sun_nakshatra_end(dt)


def _sun_degree_band(dt: datetime) -> int:
    """0-based whole-degree band of the Sun within its sign (0 → 1st degree)."""
    return int(get_sun_longitude(dt) % 30.0)


def _find_sun_degree_end(dt: datetime) -> datetime:
    """Instant the Sun leaves its current 1° band (crosses to the next degree)."""
    return _find_span_end(dt, _sun_degree_band, 1.0, get_sun_longitude, max_hours=36)


def _collect_baana_segments(
    scope_start: datetime,
    scope_end: datetime,
    sunrise_utc: datetime,
    timezone_name: str,
) -> list[dict[str, Any]]:
    """Baana windows for the day, driven by the Sun's degree-in-sign."""
    segments: list[dict[str, Any]] = []
    cursor = scope_start
    for _ in range(48):  # safety bound; the Sun crosses ≤2 degrees per day
        if cursor >= scope_end:
            break
        degree_number = _sun_degree_band(cursor) + 1  # 1..30
        band_end = _find_sun_degree_end(cursor)
        key = _BAANA_DEGREE.get(degree_number)
        if key:
            seg = _clip_segment(
                cursor, band_end, scope_start, scope_end, sunrise_utc, timezone_name
            )
            if seg:
                meta = _BAANA_META[key]
                seg["subtitle_en"] = meta["name_en"]
                seg["subtitle_ne"] = meta["name_ne"]
                seg["is_auspicious"] = False
                segments.append(seg)
        if band_end >= scope_end:
            break
        cursor = band_end + timedelta(seconds=30)
    return segments


# --- Tithi doshas (Panchang Shuddhi) ---------------------------------------
# Malefic tithi by *display* number (1–15, same in both pakshas):
#   Rikta ("empty") tithis — 4th, 9th, 14th.
_RIKTA_TITHIS = frozenset({4, 9, 14})
# Dagdha ("burnt") tithi by weekday (vaara_index 0=Sunday … 6=Saturday).
_DAGDHA_TITHI_BY_VAARA = {0: 12, 1: 11, 2: 5, 3: 3, 4: 6, 5: 8, 6: 9}
# Tithi Randhra — avoid the first N ghatis (1 ghati = 24 min) of these tithis.
# 4→3h12m, 6→3h36m, 8→5h36m, 9→10h, 12→4h, 1→2h  (Muhurta Chintamani).
_TITHI_RANDHRA_GHATIS = {1: 5, 4: 8, 6: 9, 8: 14, 9: 25, 12: 10}
_GHATI_SECONDS = 24 * 60

# Visha Ghati of the Tithi — a 4-ghati (1/15 of span) poison window offset from
# the tithi's start, keyed by *display* tithi (1–15, same in both pakshas;
# 15 = Purnima/Aausi, poison in the opening 4 ghatis). Offsets are ghatis of
# the tithi's true span (Tithi Visha Ghatika table).
_TITHI_VISHA_GHATI = {
    1: 15, 2: 5, 3: 6, 4: 7, 5: 8, 6: 9, 7: 10, 8: 14,
    9: 16, 10: 18, 11: 20, 12: 20, 13: 10, 14: 14, 15: 0,
}

# Visha Ghati of the Nitya Yoga — the toxic opening N ghatis of these yogas
# (1-based yoga number). Vyatipata (17) is malefic for its entire span (None).
_YOGA_VISHA_GHATIS: dict[int, int | None] = {
    1: 5,      # Vishkumbha
    6: 6,      # Atiganda
    9: 5,      # Shula
    10: 6,     # Ganda
    13: 9,     # Vyaghata
    15: 3,     # Vajra
    17: None,  # Vyatipata — entire duration
}


def _tithi_is_malefic(display: int, paksha: str, vaara_index: int) -> bool:
    if display in _RIKTA_TITHIS:
        return True
    if display == 15 and paksha == "krishna":  # Aausi
        return True
    if _DAGDHA_TITHI_BY_VAARA.get(vaara_index % 7) == display:
        return True
    return False


def _collect_tithi_intervals(
    scope_start: datetime,
    scope_end: datetime,
) -> list[dict[str, Any]]:
    intervals: list[dict[str, Any]] = []
    cursor = scope_start
    for _ in range(40):
        if cursor >= scope_end:
            break
        num = get_tithi_number(get_tithi_angle(cursor))  # 1..30
        intervals.append(
            {
                "number": num,
                "display": get_display_tithi(num),  # 1..15
                "paksha": get_paksha(num),
                "start_dt": find_tithi_start(cursor),
                "end_dt": find_tithi_end(cursor),
            }
        )
        end_dt = intervals[-1]["end_dt"]
        if end_dt >= scope_end:
            break
        cursor = end_dt + timedelta(seconds=90)
    return intervals


def _collect_sun_nakshatra_intervals(
    scope_start: datetime,
    scope_end: datetime,
) -> list[dict[str, Any]]:
    intervals: list[dict[str, Any]] = []
    cursor = scope_start
    while cursor < scope_end:
        surya = get_surya_nakshatra(cursor)
        nak_end = min(_find_sun_nakshatra_end(cursor), scope_end)
        intervals.append(
            {
                "index": surya["number"] - 1,
                "number": surya["number"],
                "name": surya["name"],
                "start_dt": cursor,
                "end_dt": nak_end,
            }
        )
        if nak_end >= scope_end:
            break
        cursor = nak_end + timedelta(seconds=90)
    return intervals


def _collect_yoga_intervals(
    scope_start: datetime,
    scope_end: datetime,
) -> list[dict[str, Any]]:
    intervals: list[dict[str, Any]] = []
    cursor = scope_start
    for _ in range(40):
        if cursor >= scope_end:
            break
        num, name, _ = get_yoga(cursor)
        y_start = find_yoga_start(cursor)
        y_end = find_yoga_end(cursor)
        intervals.append(
            {
                "number": num,
                "name": name,
                "start_dt": y_start,
                "end_dt": y_end,
            }
        )
        if y_end >= scope_end:
            break
        cursor = y_end + timedelta(seconds=90)
    return intervals


def _nakshatra_period_windows(
    nak_index: int,
    nak_start: datetime,
    nak_end: datetime,
    offsets: list[int],
    scope_start: datetime,
    scope_end: datetime,
    sunrise_dt: datetime,
    timezone_name: str,
) -> list[dict[str, Any]]:
    duration_s = (nak_end - nak_start).total_seconds()
    period_s = duration_s * PERIOD_GHATIS / 60.0
    windows: list[dict[str, Any]] = []
    for offset in offsets:
        start = _add_seconds(nak_start, duration_s * offset / 60.0)
        end = _add_seconds(start, period_s)
        seg = _clip_segment(start, end, scope_start, scope_end, sunrise_dt, timezone_name)
        if seg:
            windows.append(seg)
    return windows


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
        seg = _clip_segment(cursor, end_dt, sunrise_dt, next_sunrise_dt, sunrise_dt, timezone_name)
        if seg:
            spans.append(seg)
        cursor = end_dt + timedelta(seconds=90)
    return spans


def _count_nakshatras_with_abhijit(sun_index: int, moon_index: int) -> int:
    try:
        start_i = _ABHIJIT_ORDER.index(sun_index)
        end_i = _ABHIJIT_ORDER.index(moon_index)
    except ValueError:
        return 0
    total = len(_ABHIJIT_ORDER)
    if start_i <= end_i:
        count = (end_i - start_i + 1) % total
        return total if count == 0 else count
    return total - start_i + end_i + 1


def _overlap_windows(
    moon_intervals: list[dict[str, Any]],
    sun_intervals: list[dict[str, Any]],
    predicate,
    scope_start: datetime,
    scope_end: datetime,
    sunrise_dt: datetime,
    timezone_name: str,
) -> list[dict[str, Any]]:
    windows: list[dict[str, Any]] = []
    for moon in moon_intervals:
        for sun in sun_intervals:
            start = max(moon["start_dt"], sun["start_dt"])
            end = min(moon["end_dt"], sun["end_dt"])
            if start >= end:
                continue
            if not predicate(moon, sun):
                continue
            seg = _clip_segment(start, end, scope_start, scope_end, sunrise_dt, timezone_name)
            if seg:
                windows.append(seg)
    return windows


def build_extended_muhurta_timings(
    *,
    sunrise_utc: datetime,
    sunset_utc: datetime,
    next_sunrise_utc: datetime,
    vaara_index: int,
    weekday_py: int,
    timezone_name: str,
    tithi_info: dict[str, Any],
) -> dict[str, Any]:
    """Return auspicious_timings + inauspicious_timings lists for the panchanga day."""
    scope_start = sunrise_utc
    scope_end = next_sunrise_utc
    day_s = (sunset_utc - sunrise_utc).total_seconds()
    night_s = (next_sunrise_utc - sunset_utc).total_seconds()
    day_part = day_s / 15.0
    night_part = night_s / 15.0
    night_ghati_s = night_s / 30.0
    sandhya_s = SANDHYA_NIGHT_GHATIKAS * night_ghati_s

    auspicious: list[dict[str, Any]] = []
    inauspicious: list[dict[str, Any]] = []

    moon_intervals = _collect_nakshatra_intervals(scope_start, scope_end)
    sun_intervals = _collect_sun_nakshatra_intervals(scope_start, scope_end)

    # Amrit Kalam & Varjyam (all nakshatra windows overlapping the day).
    amrit_segments: list[dict[str, Any]] = []
    varjyam_segments: list[dict[str, Any]] = []
    for nak in moon_intervals:
        idx = nak["index"] % 27
        amrita_offs, varjyam_offs = _NAKSHATRA_AMRITA_VARJYAM[idx]
        amrit_segments.extend(
            _nakshatra_period_windows(
                idx,
                nak["start_dt"],
                nak["end_dt"],
                amrita_offs,
                scope_start,
                scope_end,
                sunrise_utc,
                timezone_name,
            )
        )
        varjyam_segments.extend(
            _nakshatra_period_windows(
                idx,
                nak["start_dt"],
                nak["end_dt"],
                varjyam_offs,
                scope_start,
                scope_end,
                sunrise_utc,
                timezone_name,
            )
        )
    if amrit_segments:
        auspicious.append(
            _timing_entry("amrit_kalam", "Amrit Kalam", "अमृत काल", amrit_segments, is_auspicious=True)
        )
    if varjyam_segments:
        inauspicious.append(
            _timing_entry("varjyam", "Varjyam", "वर्ज्यम्", varjyam_segments, is_auspicious=False)
        )

    # Sarvartha Siddhi Yoga.
    sarvartha_rules = _SARVARTHA_SIDDHI.get(vaara_index % 7, [])
    sarvartha_segments: list[dict[str, Any]] = []
    for nak in moon_intervals:
        if nak["index"] not in sarvartha_rules:
            continue
        seg = _clip_segment(
            nak["start_dt"], nak["end_dt"], scope_start, scope_end, sunrise_utc, timezone_name
        )
        if seg:
            sarvartha_segments.append(seg)
    if sarvartha_segments:
        auspicious.append(
            _timing_entry(
                "sarvartha_siddhi",
                "Sarvartha Siddhi Yoga",
                "सर्वार्थ सिद्धि योग",
                sarvartha_segments,
                is_auspicious=True,
            )
        )

    # Vijaya Muhurta — 11th daytime muhurta.
    vij_start = _add_seconds(sunrise_utc, 10 * day_part)
    vij_end = _add_seconds(vij_start, day_part)
    auspicious.append(
        _timing_entry(
            "vijaya_muhurta",
            "Vijaya Muhurta",
            "विजय मुहूर्त",
            [_segment(vij_start, vij_end, sunrise_utc, scope_end, timezone_name)],
            is_auspicious=True,
        )
    )

    # Godhuli — first night-ghati after sunset.
    godh_start = sunset_utc
    godh_end = _add_seconds(sunset_utc, night_s / 30.0)
    auspicious.append(
        _timing_entry(
            "godhuli_muhurta",
            "Godhuli Muhurta",
            "गोधूलि मुहूर्त",
            [_segment(godh_start, godh_end, sunrise_utc, scope_end, timezone_name)],
            is_auspicious=True,
        )
    )

    # Sandhya — dynamic 3 night-ghati windows.
    pratah_start = _add_seconds(sunrise_utc, -sandhya_s)
    pratah_end = sunrise_utc
    sayahna_start = sunset_utc
    sayahna_end = _add_seconds(sunset_utc, sandhya_s)
    auspicious.append(
        _timing_entry(
            "pratah_sandhya",
            "Pratah Sandhya",
            "प्रातः सन्ध्या",
            [_segment(pratah_start, pratah_end, sunrise_utc, scope_end, timezone_name)],
            is_auspicious=True,
        )
    )
    auspicious.append(
        _timing_entry(
            "sayahna_sandhya",
            "Sayahna Sandhya",
            "सायं सन्ध्या",
            [_segment(sayahna_start, sayahna_end, sunrise_utc, scope_end, timezone_name)],
            is_auspicious=True,
        )
    )

    # Nishita — 8th night muhurta.
    nish_start = _add_seconds(sunset_utc, 7 * night_part)
    nish_end = _add_seconds(nish_start, night_part)
    auspicious.append(
        _timing_entry(
            "nishita_muhurta",
            "Nishita Muhurta",
            "निशिता मुहूर्त",
            [_segment(nish_start, nish_end, sunrise_utc, scope_end, timezone_name)],
            is_auspicious=True,
        )
    )

    # Brahma Muhurta — penultimate night muhurta before sunrise.
    brahma_start = _add_seconds(sunrise_utc, -2 * night_part)
    brahma_end = _add_seconds(sunrise_utc, -night_part)
    auspicious.append(
        _timing_entry(
            "brahma_muhurta",
            "Brahma Muhurta",
            "ब्रह्म मुहूर्त",
            [_segment(brahma_start, brahma_end, sunrise_utc, scope_end, timezone_name)],
            is_auspicious=True,
        )
    )

    # Dur Muhurtam.
    dur_segments: list[dict[str, Any]] = []
    for idx in _DUR_MUHURTA_INDEXES.get(vaara_index % 7, []):
        start, end = _muhurta_window(
            sunrise_utc, sunset_utc, next_sunrise_utc, idx, sunrise_utc, scope_end, timezone_name
        )
        seg = _clip_segment(start, end, scope_start, scope_end, sunrise_utc, timezone_name)
        if seg:
            dur_segments.append(seg)
    if dur_segments:
        inauspicious.append(
            _timing_entry("dur_muhurtam", "Dur Muhurtam", "दुर्मुहूर्तम्", dur_segments, is_auspicious=False)
        )

    # Bhadra (Vishti karana).
    bhadra_segments = _collect_vishti_spans(sunrise_utc, next_sunrise_utc, timezone_name)
    if bhadra_segments:
        inauspicious.append(
            _timing_entry("bhadra", "Bhadra", "भद्रा", bhadra_segments, is_auspicious=False)
        )

    # Ganda Moola.
    ganda_segments: list[dict[str, Any]] = []
    for nak in moon_intervals:
        if nak["index"] not in _GANDA_MOOLA_INDEXES:
            continue
        seg = _clip_segment(
            nak["start_dt"], nak["end_dt"], scope_start, scope_end, sunrise_utc, timezone_name
        )
        if seg:
            ganda_segments.append(seg)
    if ganda_segments:
        inauspicious.append(
            _timing_entry("ganda_moola", "Ganda Moola", "गण्ड मूल", ganda_segments, is_auspicious=False)
        )

    # Aadal & Vidaal yoga.
    def _aadal_pred(moon, sun):
        return _count_nakshatras_with_abhijit(sun["index"], moon["index"]) in _AADAL_COUNTS

    def _vidaal_pred(moon, sun):
        return _count_nakshatras_with_abhijit(sun["index"], moon["index"]) in _VIDAAL_COUNTS

    aadal_segments = _overlap_windows(
        moon_intervals, sun_intervals, _aadal_pred, scope_start, scope_end, sunrise_utc, timezone_name
    )
    vidaal_segments = _overlap_windows(
        moon_intervals, sun_intervals, _vidaal_pred, scope_start, scope_end, sunrise_utc, timezone_name
    )
    if aadal_segments:
        inauspicious.append(
            _timing_entry("aadal_yoga", "Aadal Yoga", "आडाल योग", aadal_segments, is_auspicious=False)
        )
    if vidaal_segments:
        inauspicious.append(
            _timing_entry("vidaal_yoga", "Vidaal Yoga", "विडाल योग", vidaal_segments, is_auspicious=False)
        )

    # Baana — decided by the Sun's degree within its sign (see _BAANA_DEGREE).
    baana_segments = _collect_baana_segments(
        scope_start, scope_end, sunrise_utc, timezone_name
    )
    if baana_segments:
        inauspicious.append(
            _timing_entry(
                "baana",
                "Baana",
                "बाण",
                baana_segments,
                is_auspicious=False,
            )
        )

    # Tithi doshas — malefic (bad) tithi span + Tithi Randhra (Panchang Shuddhi).
    tithi_intervals = _collect_tithi_intervals(scope_start, scope_end)
    bad_tithi_segments: list[dict[str, Any]] = []
    randhra_segments: list[dict[str, Any]] = []
    visha_tithi_segments: list[dict[str, Any]] = []
    for t in tithi_intervals:
        if _tithi_is_malefic(t["display"], t["paksha"], vaara_index):
            seg = _clip_segment(
                t["start_dt"], t["end_dt"], scope_start, scope_end, sunrise_utc, timezone_name
            )
            if seg:
                bad_tithi_segments.append(seg)
        ghatis = _TITHI_RANDHRA_GHATIS.get(t["display"])
        if ghatis:
            r_end = _add_seconds(t["start_dt"], ghatis * _GHATI_SECONDS)
            seg = _clip_segment(
                t["start_dt"], r_end, scope_start, scope_end, sunrise_utc, timezone_name
            )
            if seg:
                randhra_segments.append(seg)
        # Visha Ghati of the tithi — 4 ghatis of its true span from the offset.
        v_off = _TITHI_VISHA_GHATI.get(t["display"])
        if v_off is not None:
            t_dur = (t["end_dt"] - t["start_dt"]).total_seconds()
            v_start = _add_seconds(t["start_dt"], t_dur * v_off / 60.0)
            v_end = _add_seconds(v_start, t_dur * PERIOD_GHATIS / 60.0)
            seg = _clip_segment(
                v_start, v_end, scope_start, scope_end, sunrise_utc, timezone_name
            )
            if seg:
                visha_tithi_segments.append(seg)
    if bad_tithi_segments:
        inauspicious.append(
            _timing_entry("tithi", "Tithi", "तिथि", bad_tithi_segments, is_auspicious=False)
        )
    if randhra_segments:
        inauspicious.append(
            _timing_entry(
                "tithi_randhra", "Tithi Randhra", "तिथि रन्ध्र", randhra_segments, is_auspicious=False
            )
        )
    if visha_tithi_segments:
        inauspicious.append(
            _timing_entry(
                "visha_tithi", "Tithi Visha", "तिथि विष", visha_tithi_segments, is_auspicious=False
            )
        )

    # Visha Ghati of the Nitya Yoga — toxic opening ghatis of malefic yogas.
    visha_yoga_segments: list[dict[str, Any]] = []
    for y in _collect_yoga_intervals(scope_start, scope_end):
        if y["number"] not in _YOGA_VISHA_GHATIS:
            continue
        y_ghatis = _YOGA_VISHA_GHATIS[y["number"]]
        if y_ghatis is None:
            # Vyatipata — malefic for its whole span.
            y_end = y["end_dt"]
        else:
            y_dur = (y["end_dt"] - y["start_dt"]).total_seconds()
            y_end = _add_seconds(y["start_dt"], y_dur * y_ghatis / 60.0)
        seg = _clip_segment(
            y["start_dt"], y_end, scope_start, scope_end, sunrise_utc, timezone_name
        )
        if seg:
            visha_yoga_segments.append(seg)
    if visha_yoga_segments:
        inauspicious.append(
            _timing_entry(
                "visha_yoga", "Yoga Visha", "योग विष", visha_yoga_segments, is_auspicious=False
            )
        )

    return {
        "auspicious_timings": auspicious,
        "inauspicious_timings": inauspicious,
    }


def _legacy_window_entry(
    key: str,
    name_en: str,
    name_ne: str,
    block: dict[str, Any] | None,
    *,
    is_auspicious: bool,
) -> dict[str, Any] | None:
    if not block or not block.get("start_time"):
        return None
    seg = {
        "start_local_time_short": block["start_time"],
        "end_local_time_short": block.get("end_time"),
    }
    if block.get("start_local"):
        seg["start_time"] = block["start_local"]
    if block.get("end_local"):
        seg["end_time"] = block["end_local"]
    return _timing_entry(key, name_en, name_ne, [seg], is_auspicious=is_auspicious)


def enrich_muhurta_block(
    muhurta: dict[str, Any],
    *,
    sunrise_utc: datetime,
    sunset_utc: datetime,
    next_sunrise_utc: datetime,
    vaara_index: int,
    weekday_py: int,
    timezone_name: str,
    tithi_info: dict[str, Any],
) -> dict[str, Any]:
    """Attach full auspicious/inauspicious timing tables to the base muhurta block."""
    extended = build_extended_muhurta_timings(
        sunrise_utc=sunrise_utc,
        sunset_utc=sunset_utc,
        next_sunrise_utc=next_sunrise_utc,
        vaara_index=vaara_index,
        weekday_py=weekday_py,
        timezone_name=timezone_name,
        tithi_info=tithi_info,
    )
    auspicious = list(extended["auspicious_timings"])
    inauspicious = list(extended["inauspicious_timings"])

    abhijit_entry = _legacy_window_entry(
        "abhijit",
        "Abhijit Muhurta",
        "अभिजित् मुहूर्त",
        muhurta.get("abhijit"),
        is_auspicious=True,
    )
    if abhijit_entry:
        auspicious.insert(2, abhijit_entry)

    for entry in (
        _legacy_window_entry(
            "rahu_kalam", "Rahu Kaal", "राहु काल", muhurta.get("rahu_kalam"), is_auspicious=False
        ),
        _legacy_window_entry(
            "yamaganda", "Yamaganda", "यमगण्ड", muhurta.get("yamaganda"), is_auspicious=False
        ),
        _legacy_window_entry(
            "gulika", "Gulika Kaal", "गुलिक काल", muhurta.get("gulika"), is_auspicious=False
        ),
    ):
        if entry:
            inauspicious.insert(0, entry)

    muhurta["auspicious_timings"] = auspicious
    muhurta["inauspicious_timings"] = inauspicious
    return muhurta
