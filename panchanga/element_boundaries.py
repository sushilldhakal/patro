"""End times for tithi, nakshatra, yoga, and karana."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Callable

from core.positions import (
    KARANA_NAMES,
    KARANA_SPAN,
    NAKSHATRA_NAMES,
    NAKSHATRA_SPAN,
    YOGA_NAMES,
    YOGA_SPAN,
    get_karana,
    get_nakshatra,
    get_tithi_angle,
    get_yoga,
)
from panchanga.tithi import calculate_tithi
from panchanga.tithi_boundaries import find_tithi_end, find_tithi_start


def _find_span_start(
    dt: datetime,
    get_index: Callable[[datetime], int],
    *,
    max_hours: float = 30,
    tolerance_seconds: int = 60,
) -> datetime:
    current = get_index(dt)
    start_dt = dt - timedelta(hours=max_hours)
    end_dt = dt
    tolerance = timedelta(seconds=tolerance_seconds)

    for _ in range(50):
        if end_dt - start_dt < tolerance:
            return end_dt
        mid_dt = start_dt + (end_dt - start_dt) / 2
        if get_index(mid_dt) == current:
            end_dt = mid_dt
        else:
            start_dt = mid_dt
    return end_dt


def find_nakshatra_start(dt: datetime) -> datetime:
    return _find_span_start(dt, lambda moment: get_nakshatra(moment)[0])


def find_yoga_start(dt: datetime) -> datetime:
    return _find_span_start(dt, lambda moment: get_yoga(moment)[0])


def find_karana_start(dt: datetime) -> datetime:
    return _find_span_start(dt, lambda moment: get_karana(moment)[0] - 1)


def _find_span_end(
    dt: datetime,
    get_index: Callable[[datetime], int],
    span: float,
    get_value: Callable[[datetime], float],
    *,
    max_hours: float = 30,
    tolerance_seconds: int = 60,
) -> datetime:
    current = get_index(dt)
    start_dt = dt
    end_dt = dt + timedelta(hours=max_hours)
    tolerance = timedelta(seconds=tolerance_seconds)

    for _ in range(50):
        if end_dt - start_dt < tolerance:
            return end_dt
        mid_dt = start_dt + (end_dt - start_dt) / 2
        if get_index(mid_dt) == current:
            start_dt = mid_dt
        else:
            end_dt = mid_dt
    return end_dt


def _next_cyclic(current: int, size: int) -> int:
    return 1 if current >= size else current + 1


def _enrich_next_anga(
    block: dict,
    sunrise_dt: datetime,
    find_end_fn: Callable[[datetime], datetime],
    cycle_size: int,
    names: list[str],
    names_ne: list[str],
) -> dict:
    """Attach end_* to block['next'] and a third anga on block['next']['next'] when needed."""
    from panchanga.ghati_time import time_from_sunrise as _tfs

    if "end_time" not in block or "next" not in block:
        return block

    current_end = datetime.fromisoformat(block["end_time"].replace("Z", "+00:00"))
    next_end_dt = find_end_fn(current_end + timedelta(seconds=90))
    next_end_info = _tfs(next_end_dt, sunrise_dt)
    block["next"].update(
        {
            "end_time": next_end_dt.isoformat(),
            "end_ghati_clock": next_end_info["ghati_clock"],
            "end_hours_clock": next_end_info["hours_clock"],
            "end_local_time": next_end_info["local_time"],
        }
    )

    seconds_in_day = 60 * 24 * 60
    if next_end_info["seconds_from_sunrise"] >= seconds_in_day:
        return block

    third_num = _next_cyclic(block["next"]["number"], cycle_size)
    third_end_dt = find_end_fn(next_end_dt + timedelta(seconds=90))
    third_end_info = _tfs(third_end_dt, sunrise_dt)
    block["next"]["next"] = {
        "number": third_num,
        "name": names[third_num - 1],
        "name_ne": names_ne[third_num - 1],
        "end_time": third_end_dt.isoformat(),
        "end_ghati_clock": third_end_info["ghati_clock"],
        "end_hours_clock": third_end_info["hours_clock"],
        "end_local_time": third_end_info["local_time"],
    }
    return block


def find_nakshatra_end(dt: datetime) -> datetime:
    def get_index(moment: datetime) -> int:
        return get_nakshatra(moment)[0]

    def get_value(moment: datetime) -> float:
        from core.swiss_eph import get_moon_longitude

        return get_moon_longitude(moment)

    return _find_span_end(dt, get_index, NAKSHATRA_SPAN, get_value)


def find_yoga_end(dt: datetime) -> datetime:
    def get_index(moment: datetime) -> int:
        return get_yoga(moment)[0]

    def get_value(moment: datetime) -> float:
        from core.swiss_eph import get_sun_moon_positions

        sun_long, moon_long = get_sun_moon_positions(moment)
        return (sun_long + moon_long) % 360

    return _find_span_end(dt, get_index, YOGA_SPAN, get_value)


def find_karana_end(dt: datetime) -> datetime:
    def get_index(moment: datetime) -> int:
        return get_karana(moment)[0] - 1

    return _find_span_end(dt, get_index, KARANA_SPAN, get_tithi_angle)


def _element_with_span(
    sunrise_dt: datetime,
    *,
    number: int,
    name: str,
    name_ne: str,
    start_dt: datetime,
    end_dt: datetime,
    next_number: int,
    next_name: str,
    next_name_ne: str,
    progress: float | None = None,
) -> dict:
    from panchanga.ghati_time import time_from_sunrise

    start_info = time_from_sunrise(start_dt, sunrise_dt)
    end_info = time_from_sunrise(end_dt, sunrise_dt)
    block = {
        "number": number,
        "name": name,
        "name_ne": name_ne,
        "progress": progress,
        "start_time": start_dt.isoformat(),
        "start_ghati_clock": start_info["ghati_clock"],
        "start_hours_clock": start_info["hours_clock"],
        "start_local_time": start_info["local_time"],
        "end_time": end_dt.isoformat(),
        "end_ghati_clock": end_info["ghati_clock"],
        "end_hours_clock": end_info["hours_clock"],
        "end_local_time": end_info["local_time"],
        "next": {
            "number": next_number,
            "name": next_name,
            "name_ne": next_name_ne,
        },
    }
    return block


def build_tithi_block(dt: datetime, sunrise_dt: datetime, tithi_info: dict) -> dict:
    from panchanga.names_ne import TITHI_NAMES_NE

    start_dt = find_tithi_start(dt)
    end_dt = find_tithi_end(dt)
    next_info = calculate_tithi(end_dt + timedelta(seconds=90))
    next_display = next_info["display_number"]
    if next_display == 15:
        next_name = "Purnima" if next_info["paksha"] == "shukla" else "Amavasya"
        next_name_ne = "पूर्णिमा" if next_info["paksha"] == "shukla" else "औंसी"
    else:
        next_name = next_info["name"]
        next_name_ne = TITHI_NAMES_NE[next_display - 1]

    display = tithi_info["display_number"]
    name_ne = (
        "पूर्णिमा"
        if display == 15 and tithi_info["paksha"] == "shukla"
        else "औंसी"
        if display == 15
        else TITHI_NAMES_NE[display - 1]
    )

    return _element_with_span(
        sunrise_dt,
        number=tithi_info["number"],
        name=tithi_info["name"],
        name_ne=name_ne,
        start_dt=start_dt,
        end_dt=end_dt,
        next_number=next_info["number"],
        next_name=next_name,
        next_name_ne=next_name_ne,
        progress=tithi_info["progress"],
    )


def build_nakshatra_block(dt: datetime, sunrise_dt: datetime) -> dict:
    from panchanga.names_ne import NAKSHATRA_NAMES_NE

    number, name, progress = get_nakshatra(dt)
    start_dt = find_nakshatra_start(dt)
    end_dt = find_nakshatra_end(dt)
    next_num = _next_cyclic(number, 27)
    block = _element_with_span(
        sunrise_dt,
        number=number,
        name=name,
        name_ne=NAKSHATRA_NAMES_NE[number - 1],
        start_dt=start_dt,
        end_dt=end_dt,
        next_number=next_num,
        next_name=NAKSHATRA_NAMES[next_num - 1],
        next_name_ne=NAKSHATRA_NAMES_NE[next_num - 1],
        progress=round(progress, 4),
    )
    return _enrich_next_anga(
        block,
        sunrise_dt,
        find_nakshatra_end,
        27,
        NAKSHATRA_NAMES,
        NAKSHATRA_NAMES_NE,
    )


def build_yoga_block(dt: datetime, sunrise_dt: datetime) -> dict:
    from panchanga.names_ne import YOGA_NAMES_NE

    number, name, progress = get_yoga(dt)
    start_dt = find_yoga_start(dt)
    end_dt = find_yoga_end(dt)
    next_num = _next_cyclic(number, 27)
    block = _element_with_span(
        sunrise_dt,
        number=number,
        name=name,
        name_ne=YOGA_NAMES_NE[number - 1],
        start_dt=start_dt,
        end_dt=end_dt,
        next_number=next_num,
        next_name=YOGA_NAMES[next_num - 1],
        next_name_ne=YOGA_NAMES_NE[next_num - 1],
        progress=round(progress, 4),
    )
    return _enrich_next_anga(
        block,
        sunrise_dt,
        find_yoga_end,
        27,
        YOGA_NAMES,
        YOGA_NAMES_NE,
    )


def _karana_name_ne(name: str) -> str:
    from panchanga.names_ne import KARANA_NAMES_NE

    mapping = dict(zip(KARANA_NAMES, KARANA_NAMES_NE))
    return mapping.get(name, name)


def build_karana_block(dt: datetime, sunrise_dt: datetime) -> dict:
    number, name = get_karana(dt)
    start_dt = find_karana_start(dt)
    end_dt = find_karana_end(dt)
    next_num, next_name = get_karana(end_dt + timedelta(seconds=90))
    block = _element_with_span(
        sunrise_dt,
        number=number,
        name=name,
        name_ne=_karana_name_ne(name),
        start_dt=start_dt,
        end_dt=end_dt,
        next_number=next_num,
        next_name=next_name,
        next_name_ne=_karana_name_ne(next_name),
    )

    next_end_dt = find_karana_end(end_dt + timedelta(seconds=90))
    next_end_info = time_from_sunrise(next_end_dt, sunrise_dt)
    block["next"]["end_time"] = next_end_dt.isoformat()
    block["next"]["end_ghati_clock"] = next_end_info["ghati_clock"]
    block["next"]["end_hours_clock"] = next_end_info["hours_clock"]
    block["next"]["end_local_time"] = next_end_info["local_time"]
    return block


def time_from_sunrise(end_dt: datetime, sunrise_dt: datetime) -> dict:
    from panchanga.ghati_time import time_from_sunrise as _tfs

    return _tfs(end_dt, sunrise_dt)
