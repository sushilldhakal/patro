"""Relative day keys — time resolvers, not calendar labels."""

from __future__ import annotations

from datetime import datetime
from typing import Mapping
from zoneinfo import ZoneInfo

from engine.astronomy.jd_calendar import CivilDay, civil_day_add

RELATIVE_DAY_KEYS = frozenset({"today", "tomorrow", "now", "current"})


def normalize_day_key(key: str) -> str:
    return key.strip().lower()


def is_relative_day_key(key: str) -> bool:
    return normalize_day_key(key) in RELATIVE_DAY_KEYS


def path_relative_day_key(path: str) -> str | None:
    tail = path.rstrip("/").split("/")[-1].lower()
    if tail in RELATIVE_DAY_KEYS:
        return tail
    return None


def _as_int(raw: str | None) -> int | None:
    if raw is None or raw.strip() == "":
        return None
    try:
        return int(raw)
    except ValueError:
        return None


def _as_float(raw: str | None) -> float | None:
    if raw is None or raw.strip() == "":
        return None
    try:
        return float(raw)
    except ValueError:
        return None


def observer_timezone_from_params(params: Mapping[str, str]) -> str:
    from engine.astronomy.location import DEFAULT_LOCATION, resolve_location_from_query

    tz = (params.get("timezone") or params.get("tz") or "").strip() or None
    try:
        loc = resolve_location_from_query(
            lat=_as_float(params.get("lat")),
            lon=_as_float(params.get("lon")),
            timezone=tz,
            city=params.get("city"),
            city_id=_as_int(params.get("city_id")),
        )
        return loc.timezone
    except Exception:
        return DEFAULT_LOCATION.timezone


def today_jd_ut(params: Mapping[str, str]) -> float:
    tz_name = observer_timezone_from_params(params)
    today = datetime.now(ZoneInfo(tz_name)).date()
    return CivilDay.from_date(today).to_jd_ut()


def relative_day_jd_ut(key: str, params: Mapping[str, str]) -> float:
    norm = normalize_day_key(key)
    if norm in ("today", "now", "current"):
        return today_jd_ut(params)
    if norm == "tomorrow":
        return civil_day_add(today_jd_ut(params), 1)
    raise ValueError(f"unsupported relative day key: {key!r}")
