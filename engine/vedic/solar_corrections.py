"""Belaantar (equation of time) and Deshaantar (longitude correction) — Surya Panchanga style."""

from __future__ import annotations

from datetime import date, datetime, time, timezone
from typing import Any, Literal

from engine.astronomy.swiss_eph import _ensure_initialized, get_julian_day, init_ephemeris
from engine.astronomy.engine import default_engine
from engine.astronomy.timescale import resolve_observer_timezone

SignKind = Literal["dhan", "rin"]


def standard_meridian_longitude(timezone_name: str, *, on_date: date | None = None) -> float:
    """Degrees east for the zone's mean solar meridian (UTC offset × 15°)."""
    tz = resolve_observer_timezone(timezone_name)
    probe = datetime.combine(on_date or date(2020, 6, 15), time(12, 0), tzinfo=tz)
    offset = tz.utcoffset(probe)
    if offset is None:
        raise ValueError(f"Timezone {timezone_name!r} has no UTC offset")
    return (offset.total_seconds() / 3600.0) * 15.0


def _split_minutes_signed(total_minutes: float) -> dict[str, Any]:
    sign: SignKind = "dhan" if total_minutes >= 0 else "rin"
    abs_min = abs(total_minutes)
    minutes = int(abs_min)
    seconds = int(round((abs_min - minutes) * 60))
    if seconds >= 60:
        seconds -= 60
        minutes += 1
    prefix = "+" if sign == "dhan" else "-"
    return {
        "minutes_total": round(total_minutes, 6),
        "minutes": minutes,
        "seconds": seconds,
        "sign": sign,
        "sign_ne": "धन" if sign == "dhan" else "ऋण",
        "apply": "add" if sign == "dhan" else "subtract",
        "label_en": f"{prefix}{minutes}m {seconds:02d}s",
        "label_ne": f"{prefix}{minutes} मि {seconds:02d} से",
    }


def compute_belaantar(at: datetime) -> dict[str, Any]:
    """
    Equation of time: apparent solar time minus mean solar time.

    Surya Panchanga: positive (धन) → add; negative (ऋण) → subtract when
  correcting mean solar time toward apparent (true) solar time.
    """
    init_ephemeris()
    _ensure_initialized()
    utc = at.astimezone(timezone.utc)
    jd = get_julian_day(utc)
    # apparent − mean solar time, in days
    e_days = default_engine.equation_of_time(jd)
    return {
        **_split_minutes_signed(e_days * 24.0 * 60.0),
        "name_ne": "बेलान्तर",
        "name_en": "Belaantar (equation of time)",
    }


def compute_deshaantar(
    local_longitude: float,
    standard_meridian_longitude: float,
) -> dict[str, Any]:
    """
    Longitude correction from the zone meridian.

    (standard_meridian − local_longitude) × 4 minutes per degree.
    Positive (धन) → add; negative (ऋण) → subtract (Surya convention).
    """
    delta_min = (standard_meridian_longitude - local_longitude) * 4.0
    return {
        **_split_minutes_signed(delta_min),
        "name_ne": "देशान्तर",
        "name_en": "Deshaantar (longitude correction)",
        "local_longitude": round(local_longitude, 6),
        "standard_meridian_longitude": round(standard_meridian_longitude, 6),
    }


def build_solar_corrections(
    target: date,
    *,
    local_longitude: float,
    timezone_name: str,
    at: datetime | None = None,
) -> dict[str, Any]:
    """Daily Belaantar + Deshaantar for patro tables and advanced calculations."""
    tz = resolve_observer_timezone(timezone_name)
    anchor = at or datetime.combine(target, time(6, 0), tzinfo=tz)
    meridian = standard_meridian_longitude(timezone_name, on_date=target)
    belaantar = compute_belaantar(anchor)
    deshaantar = compute_deshaantar(local_longitude, meridian)

    return {
        "belaantar": belaantar,
        "deshaantar": deshaantar,
        "standard_meridian_longitude": meridian,
        "computed_at_local": anchor.astimezone(tz).isoformat(),
        "sunrise_includes_corrections": True,
        "ishtakaal_note_ne": (
            "सूचीबद्ध सूर्योदयमा बेलान्तर र देशान्तर पहिल्यै समायोजित छन् — "
            "इष्टकाल गणनामा पुनः बेलान्तर थप्नु/pर्नु पर्दैन।"
        ),
        "ishtakaal_note_en": (
            "Listed sunrise/sunset already include Belaantar and Deshaantar; "
            "do not apply them again when computing Ishtakaal from the printed time."
        ),
    }
