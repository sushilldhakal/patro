"""Observer timezone helpers for sunrise/tithi calculations.

Nepal civil time (IANA ``Asia/Kathmandu``) has three historical eras:

| Era | Civil dates | Offset | Notes |
|-----|-------------|--------|-------|
| KMT | ≤ 1919-12-31 | UTC+05:41:16 | Kathmandu mean solar time |
| IST | 1920-01-01 … 1985-12-31 | UTC+05:30 | Indian Standard Time |
| NPT | ≥ 1986-01-01 | UTC+05:45 | Nepal Standard Time |

All Nepal-based observer locations must resolve through ``Asia/Kathmandu`` so
tzdata picks the correct offset for the *instant* being calculated — never a
fixed +05:45 for every year.
"""

from __future__ import annotations

from datetime import date, datetime, time, timezone
from typing import Any
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

NEPAL_UTC_OFFSET_HOURS = 5
NEPAL_UTC_OFFSET_MINUTES = 45
NEPAL_TZ = ZoneInfo("Asia/Kathmandu")
DEFAULT_OBSERVER_TIMEZONE = "Asia/Kathmandu"

# Nepal bounding box (GeoNames / survey approx.) — used when country is unknown.
NEPAL_LAT_MIN = 26.35
NEPAL_LAT_MAX = 30.45
NEPAL_LON_MIN = 80.05
NEPAL_LON_MAX = 88.20

NEPAL_IST_END = date(1985, 12, 31)
NEPAL_NPT_START = date(1986, 1, 1)
NEPAL_KMT_END = date(1919, 12, 31)
NEPAL_IST_START = date(1920, 1, 1)

KMT_OFFSET_SECONDS = 5 * 3600 + 41 * 60 + 16  # 20476
IST_OFFSET_SECONDS = 5 * 3600 + 30 * 60       # 19800
NPT_OFFSET_SECONDS = 5 * 3600 + 45 * 60       # 20700


def is_nepal_observer(
    lat: float | None,
    lon: float | None,
    *,
    country: str | None = None,
) -> bool:
    """True when the observer should use Nepal's historical civil timezone."""
    if country and country.upper() == "NP":
        return True
    if lat is None or lon is None:
        return False
    return (
        NEPAL_LAT_MIN <= lat <= NEPAL_LAT_MAX
        and NEPAL_LON_MIN <= lon <= NEPAL_LON_MAX
    )


def normalize_observer_timezone(
    timezone_name: str | None,
    *,
    lat: float | None = None,
    lon: float | None = None,
    country: str | None = None,
) -> str:
    """Map Nepal observers to ``Asia/Kathmandu`` regardless of the stored label."""
    if is_nepal_observer(lat, lon, country=country):
        return DEFAULT_OBSERVER_TIMEZONE
    return timezone_name or DEFAULT_OBSERVER_TIMEZONE


def resolve_observer_timezone(
    timezone_name: str | None = None,
    *,
    lat: float | None = None,
    lon: float | None = None,
    country: str | None = None,
):
    """Historically-aware zone for the observer (Nepal → IANA Asia/Kathmandu)."""
    name = normalize_observer_timezone(
        timezone_name, lat=lat, lon=lon, country=country,
    )
    if name == DEFAULT_OBSERVER_TIMEZONE:
        return NEPAL_TZ
    try:
        return ZoneInfo(name)
    except ZoneInfoNotFoundError as exc:
        raise ValueError(f"Unknown observer timezone: {name}") from exc


def nepal_timezone_era(on_date: date) -> dict[str, Any]:
    """Describe which Nepal civil-time era applies on a calendar day."""
    if on_date <= NEPAL_KMT_END:
        return {
            "key": "kmt",
            "name_en": "Kathmandu Mean Time",
            "name_ne": "काठमाडौं औसत सूर्य समय",
            "utc_offset": "+05:41:16",
            "utc_offset_seconds": KMT_OFFSET_SECONDS,
        }
    if on_date <= NEPAL_IST_END:
        return {
            "key": "ist",
            "name_en": "Indian Standard Time",
            "name_ne": "भारतीय मानक समय",
            "utc_offset": "+05:30",
            "utc_offset_seconds": IST_OFFSET_SECONDS,
        }
    return {
        "key": "npt",
        "name_en": "Nepal Standard Time",
        "name_ne": "नेपाल मानक समय",
        "utc_offset": "+05:45",
        "utc_offset_seconds": NPT_OFFSET_SECONDS,
    }


def observer_utc_offset_seconds(
    dt: datetime,
    timezone_name: str | None = None,
    *,
    lat: float | None = None,
    lon: float | None = None,
    country: str | None = None,
) -> int:
    """UTC offset in seconds for *dt* under the resolved observer zone."""
    tz = resolve_observer_timezone(
        timezone_name, lat=lat, lon=lon, country=country,
    )
    local = dt.astimezone(tz) if dt.tzinfo else dt.replace(tzinfo=tz)
    off = local.utcoffset()
    if off is None:
        raise ValueError("timezone has no UTC offset")
    return int(off.total_seconds())


def to_nepal_time(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(NEPAL_TZ)


def to_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=NEPAL_TZ)
    return dt.astimezone(timezone.utc)


def nepal_midnight(date_val: date) -> datetime:
    return datetime.combine(date_val, time(0, 0, 0), tzinfo=NEPAL_TZ)
