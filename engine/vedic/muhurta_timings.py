"""Extended daily muhurta timings — Amrit Kalam, Varjyam, Sandhya, yogas, Baana, etc.

Formulas follow published Panchang conventions (Muhurta Chintamani / Nārada Saṃhitā
style), aligned with common Drik/Kaalavidya outputs. Timed segments are computed on
the server; the frontend only renders API data.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from engine.astronomy.positions import get_karana, get_nakshatra
from engine.astronomy.timescale import resolve_observer_timezone
from engine.vedic.ghati_time import time_from_sunrise
from engine.vedic.rashi_spans import get_surya_nakshatra
from engine.vedic.element_boundaries import (
    find_karana_end,
    find_nakshatra_end,
    find_nakshatra_start,
    find_sun_nakshatra_end,
)

GHATIKA_SECONDS = 24 * 60
PERIOD_GHATIS = 4  # Amrit / Varjyam window = 4 ghatis of nakshatra duration
SANDHYA_NIGHT_GHATIKAS = 3.0

# Amrit / Varjyam offset in ghatis (0–60) for a 60-ghati nakshatra span — panchang-core table.
_NAKSHATRA_AMRITA_VARJYAM: list[tuple[list[int], list[int]]] = [
    ([42], [50]),   # Ashwini
    ([48], [24]),   # Bharani
    ([54], [30]),   # Krittika
    ([52], [40]),   # Rohini
    ([38], [14]),   # Mrigashira
    ([35], [21]),   # Ardra
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
    ([44], [21]),   # Mula
    ([48], [24]),   # Purva Ashadha
    ([44], [20]),   # Uttara Ashadha
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

# Sun→Sat seven baana types across equal daytime segments (North-Indian patro convention).
_BAANA_BY_WEEKDAY: list[list[str]] = [
    ["roga", "raja", "agni", "mrityu", "chora", "roga", "raja"],
    ["agni", "mrityu", "chora", "roga", "raja", "agni", "mrityu"],
    ["mrityu", "chora", "roga", "raja", "agni", "mrityu", "chora"],
    ["chora", "roga", "raja", "agni", "mrityu", "chora", "roga"],
    ["roga", "raja", "agni", "mrityu", "chora", "roga", "raja"],
    ["raja", "agni", "mrityu", "chora", "roga", "raja", "agni"],
    ["agni", "mrityu", "chora", "roga", "raja", "agni", "mrityu"],
]

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

    # Baana — seven equal daytime segments by weekday.
    baana_seq = _BAANA_BY_WEEKDAY[vaara_index % 7]
    day_seventh = day_s / 7.0
    baana_segments: list[dict[str, Any]] = []
    for i, key in enumerate(baana_seq):
        meta = _BAANA_META[key]
        b_start = _add_seconds(sunrise_utc, i * day_seventh)
        b_end = _add_seconds(sunrise_utc, (i + 1) * day_seventh)
        seg = _clip_segment(b_start, b_end, scope_start, scope_end, sunrise_utc, timezone_name)
        if seg:
            seg.update(
                {
                    "subtitle_en": meta["name_en"],
                    "subtitle_ne": meta["name_ne"],
                    "is_auspicious": meta["is_auspicious"],
                }
            )
            baana_segments.append(seg)
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
