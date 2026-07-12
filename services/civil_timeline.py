"""Civil-day (midnight → midnight) panchanga timeline.

The default daily payload is anchored at sunrise and covers one *vedic* day
(sunrise → next sunrise). A civil day (00:00 → 24:00) overlaps two vedic days:
the pre-sunrise night belongs to the previous day's payload. This module
stitches the previous + current daily states and re-projects every timeline
band (choghadiya, hora, tithi/nakshatra/yoga/karana, lagna, sun/moon markers)
onto a single midnight-anchored axis measured in **minutes from local midnight**
(0 … 1440).

Nothing here recomputes astronomy — it reuses the already-cached
``get_daily_panchanga`` for both days, so results stay consistent with the
sunrise view.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any

from engine.astronomy.location import DEFAULT_LOCATION, ObserverLocation
from engine.astronomy.timescale import resolve_observer_timezone
from engine.vedic.daily import get_daily_panchanga

DAY_MIN = 1440.0


def _hhmm_to_min(short: str | None) -> float | None:
    """"HH:MM" (local wall clock) → minutes from that day's midnight."""
    if not short:
        return None
    parts = short.strip().split(":")
    if len(parts) < 2:
        return None
    try:
        return int(parts[0]) * 60 + int(parts[1])
    except ValueError:
        return None


def _ghati_clock_to_ghati(clock: str | None) -> float | None:
    """"H:M:S" ghati-from-sunrise → ghati (0–60), matching the frontend parser."""
    if not clock:
        return None
    parts = clock.split(":")
    try:
        gh = float(parts[0])
        pa = float(parts[1]) if len(parts) > 1 else 0.0
    except (ValueError, IndexError):
        return None
    return gh + pa / 60.0


def _iso_to_civil_min(iso: str | None, tz, midnight: datetime) -> float | None:
    """Absolute ISO instant → minutes from the civil day's local midnight."""
    if not iso:
        return None
    dt = datetime.fromisoformat(iso.replace("Z", "+00:00")).astimezone(tz)
    return (dt - midnight).total_seconds() / 60.0


def _clip(start: float, end: float, lo: float, hi: float) -> tuple[float, float] | None:
    """Clamp [start, end] to [lo, hi]; drop if it collapses."""
    s = max(start, lo)
    e = min(end, hi)
    if e - s <= 0.05:
        return None
    return s, e


def _project_ghati_segments(
    segments: list[dict[str, Any]],
    sunrise_min: float,
    day_offset: float,
    lo: float,
    hi: float,
    fields: dict[str, str],
) -> list[dict[str, Any]]:
    """Project sunrise-anchored ghati segments (start_g/end_g) onto civil minutes.

    ``day_offset`` shifts the previous day's minutes back by 1440 so both days
    share the current midnight origin. Only the slice inside [lo, hi] survives.
    """
    out: list[dict[str, Any]] = []
    for seg in segments:
        s = sunrise_min + float(seg["start_g"]) * 24.0 - day_offset
        e = sunrise_min + float(seg["end_g"]) * 24.0 - day_offset
        clipped = _clip(s, e, lo, hi)
        if not clipped:
            continue
        item = {"start_min": round(clipped[0], 2), "end_min": round(clipped[1], 2)}
        for out_key, src_key in fields.items():
            item[out_key] = seg.get(src_key)
        out.append(item)
    return out


def _anga_chain(block: dict[str, Any] | None) -> list[tuple[str | None, str | None, str | None, str | None]]:
    """(name_ne, name, start_iso, end_iso) intervals from an anga block + its next chain."""
    if not block:
        return []
    chain: list[tuple[str | None, str | None, str | None, str | None]] = []
    start = block.get("start_time")
    end = block.get("end_time")
    if not block.get("name") and not block.get("name_ne"):
        return []
    chain.append((block.get("name_ne"), block.get("name"), start, end))
    nxt = block.get("next") or {}
    if nxt.get("name") or nxt.get("name_ne"):
        chain.append((nxt.get("name_ne"), nxt.get("name"), end, nxt.get("end_time")))
        third = nxt.get("next") or {}
        if third.get("name") or third.get("name_ne"):
            chain.append(
                (third.get("name_ne"), third.get("name"), nxt.get("end_time"), third.get("end_time"))
            )
    return chain


def _row_segments(
    prev_block: dict[str, Any] | None,
    cur_block: dict[str, Any] | None,
    tz,
    midnight: datetime,
) -> list[dict[str, Any]]:
    """Ordered {name_ne, name, end_min} anga sequence across the civil day."""
    intervals: list[tuple[float, float, str | None, str | None]] = []
    for chain in (_anga_chain(prev_block), _anga_chain(cur_block)):
        for name_ne, name, s_iso, e_iso in chain:
            s = _iso_to_civil_min(s_iso, tz, midnight)
            e = _iso_to_civil_min(e_iso, tz, midnight)
            if s is None:
                s = -1e9
            if e is None:
                e = 1e9
            if e > 0 and s < DAY_MIN:
                intervals.append((s, e, name_ne, name))

    intervals.sort(key=lambda iv: iv[0])
    result: list[dict[str, Any]] = []
    t = 0.0
    for s, e, name_ne, name in intervals:
        if e <= t + 0.05:
            continue
        end_min = min(e, DAY_MIN)
        if result and result[-1]["name_ne"] == name_ne:
            result[-1]["end_min"] = round(end_min, 2)
        else:
            result.append({"name_ne": name_ne, "name": name, "end_min": round(end_min, 2)})
        t = end_min
        if t >= DAY_MIN:
            break
    return result


def _lagna_segments(
    prev_spans: list[dict[str, Any]] | None,
    cur_spans: list[dict[str, Any]] | None,
    sr_prev: float | None,
    sr_cur: float | None,
) -> list[dict[str, Any]]:
    """Lagna spans projected via their ghati clocks onto the civil axis."""
    out: list[dict[str, Any]] = []

    def project(spans: list[dict[str, Any]] | None, sunrise_min: float | None, offset: float, lo: float, hi: float):
        if not spans or sunrise_min is None:
            return
        for span in spans:
            gs = _ghati_clock_to_ghati(span.get("start_ghati_clock"))
            ge = _ghati_clock_to_ghati(span.get("end_ghati_clock"))
            if gs is None or ge is None:
                continue
            s = sunrise_min + gs * 24.0 - offset
            e = sunrise_min + ge * 24.0 - offset
            clipped = _clip(s, e, lo, hi)
            if not clipped:
                continue
            out.append(
                {
                    "name_ne": span.get("name_ne"),
                    "name": span.get("name"),
                    "start_min": round(clipped[0], 2),
                    "end_min": round(clipped[1], 2),
                }
            )

    if sr_cur is not None:
        project(prev_spans, sr_prev, DAY_MIN, 0.0, sr_cur)
        project(cur_spans, sr_cur, 0.0, sr_cur, DAY_MIN)
    out.sort(key=lambda s: s["start_min"])
    return out


def build_civil_timeline(
    greg: date,
    location: ObserverLocation = DEFAULT_LOCATION,
) -> dict[str, Any]:
    """Midnight→midnight timeline for ``greg`` at ``location`` (minutes from midnight)."""
    tz = resolve_observer_timezone(location.timezone)
    midnight = datetime(greg.year, greg.month, greg.day, tzinfo=tz)

    cur = get_daily_panchanga(greg, location)
    prev = get_daily_panchanga(greg - timedelta(days=1), location)

    sr_cur = _hhmm_to_min(cur["sunrise"].get("local_time_short"))
    ss_cur = _hhmm_to_min(cur["sunset"].get("local_time_short"))
    sr_prev = _hhmm_to_min(prev["sunrise"].get("local_time_short"))
    if sr_cur is None:
        sr_cur = 0.0

    cho_fields = {"name_ne": "name_ne", "bad": "bad"}
    choghadiya = _project_ghati_segments(
        prev.get("choghadiya") or [], sr_prev or 0.0, DAY_MIN, 0.0, sr_cur, cho_fields
    ) + _project_ghati_segments(
        cur.get("choghadiya") or [], sr_cur, 0.0, sr_cur, DAY_MIN, cho_fields
    )

    hora_fields = {"planet_ne": "planet_ne", "planet_en": "planet_en", "bad": "bad"}
    hora = _project_ghati_segments(
        prev.get("hora") or [], sr_prev or 0.0, DAY_MIN, 0.0, sr_cur, hora_fields
    ) + _project_ghati_segments(
        cur.get("hora") or [], sr_cur, 0.0, sr_cur, DAY_MIN, hora_fields
    )

    def clip_marker(minutes: float | None) -> float | None:
        if minutes is None or minutes < 0 or minutes > DAY_MIN:
            return None
        return round(minutes, 2)

    moonrise_min = clip_marker(_hhmm_to_min((cur.get("moonrise") or {}).get("local_time_short")))
    moonset_min = clip_marker(_hhmm_to_min((cur.get("moonset") or {}).get("local_time_short")))

    return {
        "anchor": "civil",
        "date_ad": greg.isoformat(),
        "sunrise_min": round(sr_cur, 2),
        "sunset_min": round(ss_cur, 2) if ss_cur is not None else None,
        "moonrise_min": moonrise_min,
        "moonset_min": moonset_min,
        "weekday_ne": (cur.get("vaara") or {}).get("name_ne"),
        "weekday_en": (cur.get("vaara") or {}).get("name_english"),
        "rows": {
            "tithi": _row_segments(prev.get("tithi"), cur.get("tithi"), tz, midnight),
            "nakshatra": _row_segments(prev.get("nakshatra"), cur.get("nakshatra"), tz, midnight),
            "yoga": _row_segments(prev.get("yoga"), cur.get("yoga"), tz, midnight),
            "karana": _row_segments(prev.get("karana"), cur.get("karana"), tz, midnight),
        },
        "paksha_ne": (cur.get("paksha") or {}).get("label_ne"),
        "choghadiya": choghadiya,
        "hora": hora,
        "lagna": _lagna_segments(
            prev.get("lagna_spans"), cur.get("lagna_spans"), sr_prev, sr_cur
        ),
        "planets": cur.get("planets"),
        "planets_anchor": cur.get("planets_anchor"),
    }
