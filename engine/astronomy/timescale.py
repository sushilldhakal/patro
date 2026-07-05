"""Observer timezone helpers for sunrise/tithi calculations."""

from datetime import date, datetime, time, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

# Nepal's *current* civil offset — kept only as a label/reference; do not use
# for date arithmetic. Nepal was UTC+5:30 before 1986-01-01 (per IANA tzdata),
# so a fixed +5:45 offset silently mis-times every pre-1986 instant by 15
# minutes. NEPAL_TZ below is the historically-aware zone that gets this right
# for any date, while still resolving to +5:45 for modern dates.
NEPAL_UTC_OFFSET_HOURS = 5
NEPAL_UTC_OFFSET_MINUTES = 45
NEPAL_TZ = ZoneInfo("Asia/Kathmandu")
DEFAULT_OBSERVER_TIMEZONE = "Asia/Kathmandu"


def to_nepal_time(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(NEPAL_TZ)


def to_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=NEPAL_TZ)
    return dt.astimezone(timezone.utc)


def resolve_observer_timezone(timezone_name: str | None = None):
    if not timezone_name or timezone_name == DEFAULT_OBSERVER_TIMEZONE:
        return NEPAL_TZ
    try:
        return ZoneInfo(timezone_name)
    except ZoneInfoNotFoundError as exc:
        raise ValueError(f"Unknown observer timezone: {timezone_name}") from exc


def nepal_midnight(date_val: date) -> datetime:
    return datetime.combine(date_val, time(0, 0, 0), tzinfo=NEPAL_TZ)
