"""Nepal patro sunrise/sunset — गौरीशंकर meridian (८६° १५′) + देशान्तर.

Classical Nepali panchanga tables anchor civil time to Nepal Standard Time
(UTC+5:45 → 86.25° E) and adjust each place east/west of that meridian with
देशान्तर (4 minutes per degree). Rise/set are computed at the observer's
latitude on the *standard meridian*, then shifted by देशान्तर — not by running
a separate geometric search at each city's longitude with ad-hoc elevation.

A uniform reference horizon altitude (Kathmandu valley ~1400 m) keeps valley
patro times aligned with published sources while preserving correct east→west
ordering (e.g. Siraha east of the meridian rises before Kathmandu).
"""

from __future__ import annotations

from datetime import date, datetime, timedelta

from engine.astronomy.engine import EphemerisError, default_engine
from engine.astronomy.timescale import (
    DEFAULT_OBSERVER_TIMEZONE,
    is_nepal_observer,
    normalize_observer_timezone,
)

# Reference horizon for the national patro rise/set search (not per-city DEM).
NEPAL_PATRO_REFERENCE_ALTITUDE_M = 1400.0


def nepal_patro_solar_event(
    date_val: date,
    latitude: float,
    longitude: float,
    *,
    rise: bool,
    timezone_name: str | None = None,
) -> datetime:
    """Sunrise or sunset for a Nepal observer using meridian + देशान्तर."""
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
        latitude,
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
