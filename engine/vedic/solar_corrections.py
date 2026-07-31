"""Belaantar (equation of time) and Deshaantar (longitude correction) — Surya Panchanga style."""

from __future__ import annotations

from datetime import date, datetime, time, timezone
from typing import Any, Literal

from engine.astronomy.engine import default_engine
from engine.astronomy.ut_instant import as_julian_day
from engine.astronomy.timescale import is_nepal_observer, nepal_timezone_era, resolve_observer_timezone

SignKind = Literal["dhan", "rin"]


def standard_meridian_longitude(
    timezone_name: str,
    *,
    on_date: date | None = None,
    lat: float | None = None,
    lon: float | None = None,
    country: str | None = None,
) -> float:
    """Degrees east for the zone's mean solar meridian (UTC offset × 15°)."""
    tz = resolve_observer_timezone(
        timezone_name, lat=lat, lon=lon, country=country,
    )
    # The datetime is only a probe for the zone's UTC offset. A pre-1 CE civil day
    # (``CivilDay``, not a ``date``) has no tz database coverage anyway, so fall
    # back to the same fixed CE reference ``ut_instant`` uses for its offset
    # lookups rather than trying to build an unrepresentable datetime.
    probe_day = on_date if isinstance(on_date, date) else date(2020, 6, 15)
    probe = datetime.combine(probe_day, time(12, 0), tzinfo=tz)
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
    Equation of time for patro tables: mean solar time minus apparent solar time.

    Opposite sign from Swiss Ephemeris ``time_equ`` (apparent − mean).
    July (sun slow) → positive e.g. +6:34; October (sun fast) → negative.
    Positive (धन) / negative (ऋण) are reference values only — listed rise/set
    do not apply belaantar (only deshaantar).
    """
    utc = at.astimezone(timezone.utc)
    jd = as_julian_day(utc)
    e_days = default_engine.equation_of_time(jd)
    patro_min = -(e_days * 24.0 * 60.0)
    return {
        **_split_minutes_signed(patro_min),
        "name_ne": "बेलान्तर",
        "name_en": "Belaantar (equation of time)",
    }


def compute_deshaantar(
    local_longitude: float,
    standard_meridian_longitude: float,
) -> dict[str, Any]:
    """
    Longitude correction from the Gaurishankar / zone meridian (patro table sign).

    (local_longitude − standard_meridian) × 4 minutes per degree.
    West of the meridian → negative (e.g. Kathmandu ≈ −3:42).
    East of the meridian → positive. Listed rise/set apply −minutes_total internally.
    """
    delta_min = (local_longitude - standard_meridian_longitude) * 4.0
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
    lat: float | None = None,
    country: str | None = None,
) -> dict[str, Any]:
    """Daily Belaantar + Deshaantar for patro tables and advanced calculations."""
    tz = resolve_observer_timezone(
        timezone_name, lat=lat, lon=local_longitude, country=country,
    )
    anchor = at or datetime.combine(target, time(6, 0), tzinfo=tz)
    meridian = standard_meridian_longitude(
        timezone_name,
        on_date=target,
        lat=lat,
        lon=local_longitude,
        country=country,
    )
    belaantar = compute_belaantar(anchor)
    deshaantar = compute_deshaantar(local_longitude, meridian)

    return {
        "belaantar": belaantar,
        "deshaantar": deshaantar,
        "standard_meridian_longitude": meridian,
        "computed_at_local": anchor.astimezone(tz).isoformat(),
        "sunrise_includes_corrections": True,
        "timezone_era": nepal_timezone_era(target)
        if is_nepal_observer(lat, local_longitude, country=country)
        else None,
        "ishtakaal_note_ne": (
            "सूचीबद्ध सूर्योदय/अस्तमा देशान्तर (गौरीशंकर ८६° १५′ केन्द्र) समायोजित छ — "
            "इष्टकाल गणनामा पुनः देशान्तर थप्नु पर्दैन। बेलान्तर सन्दर्भका लागि मात्र देखाइएको हो।"
        ),
        "ishtakaal_note_en": (
            "Listed sunrise/sunset already include Deshaantar from the Gaurishankar "
            "meridian (86°15′ E); do not apply Deshaantar again for Ishtakaal. "
            "Belaantar is shown for reference only."
        ),
    }
