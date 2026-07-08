"""Nepal patro sunrise/sunset — गौरीशंकर meridian (८६° १५′) + देशान्तर.

Classical Nepali panchanga tables (देशान्तर) correct civil clock from the
Nepal Standard meridian (UTC+5:45 → 86.25° E) at **4 minutes per degree of
longitude**. Latitude is *not* mixed into that gap — otherwise झापा → कञ्चनपुर
(~7.9°) would show ~23 minutes instead of the classical ~31.5 minutes.

Rise/set are therefore computed once at a fixed national reference latitude
on the standard meridian (with the valley horizon dip), then shifted only by
देशान्तर for the observer's longitude.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta

from engine.astronomy.engine import EphemerisError, default_engine
from engine.astronomy.timescale import (
    DEFAULT_OBSERVER_TIMEZONE,
    is_nepal_observer,
    normalize_observer_timezone,
)

# गौरीशंकर / NPT mean meridian in today's Asia/Kathmandu offset.
# Reference observer for national tables (Kathmandu valley).
NEPAL_PATRO_REFERENCE_LATITUDE = 27.7172
NEPAL_PATRO_REFERENCE_ALTITUDE_M = 1400.0


def nepal_patro_solar_event(
    date_val: date,
    latitude: float,
    longitude: float,
    *,
    rise: bool,
    timezone_name: str | None = None,
) -> datetime:
    """Sunrise or sunset for a Nepal observer using meridian + देशान्तर only.

    ``latitude`` is accepted for API symmetry / Nepal-bounds checks; the
    geometric search always uses ``NEPAL_PATRO_REFERENCE_LATITUDE`` so times
    differ across Nepal by longitude (देशान्तर) alone.
    """
    from engine.vedic.solar_corrections import compute_deshaantar, standard_meridian_longitude

    tz_name = normalize_observer_timezone(
        timezone_name or DEFAULT_OBSERVER_TIMEZONE,
        lat=latitude,
        lon=longitude,
    )
    meridian = standard_meridian_longitude(
        tz_name,
        on_date=date_val,
        lat=latitude,
        lon=longitude,
    )
    engine_fn = default_engine.rise if rise else default_engine.set
    base = engine_fn(
        date_val,
        "sun",
        NEPAL_PATRO_REFERENCE_LATITUDE,
        meridian,
        NEPAL_PATRO_REFERENCE_ALTITUDE_M,
        timezone_name=tz_name,
    )
    if base is None:
        label = "Sunrise" if rise else "Sunset"
        raise EphemerisError(f"{label} calculation failed for {date_val}")
    deshaantar = compute_deshaantar(longitude, meridian)
    return base + timedelta(minutes=deshaantar["minutes_total"])


def should_use_nepal_patro_sun(
    latitude: float,
    longitude: float,
    *,
    altitude: float | None,
    country: str | None = None,
) -> bool:
    """Nepal patro path when using default altitude (caller did not override)."""
    return altitude is None and is_nepal_observer(latitude, longitude, country=country)
