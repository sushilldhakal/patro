"""Find exact tithi start/end times via binary search."""

from datetime import date, datetime, timedelta, timezone
from typing import Optional

from engine.astronomy.positions import TITHI_SPAN, get_tithi_angle
from engine.vedic.tithi import calculate_tithi


def find_tithi_end(dt: datetime, max_iterations: int = 50, tolerance_seconds: int = 60) -> datetime:
    current_elongation = get_tithi_angle(dt)
    current_tithi = int(current_elongation / TITHI_SPAN)
    start_dt = dt
    end_dt = dt + timedelta(hours=30)
    tolerance = timedelta(seconds=tolerance_seconds)

    for _ in range(max_iterations):
        mid_dt = start_dt + (end_dt - start_dt) / 2
        mid_tithi = int(get_tithi_angle(mid_dt) / TITHI_SPAN)
        if end_dt - start_dt < tolerance:
            return end_dt
        if mid_tithi == current_tithi:
            start_dt = mid_dt
        else:
            end_dt = mid_dt
    return end_dt


def find_tithi_start(dt: datetime, max_iterations: int = 50, tolerance_seconds: int = 60) -> datetime:
    current_tithi = int(get_tithi_angle(dt) / TITHI_SPAN)
    start_dt = dt - timedelta(hours=30)
    end_dt = dt
    tolerance = timedelta(seconds=tolerance_seconds)

    for _ in range(max_iterations):
        mid_dt = start_dt + (end_dt - start_dt) / 2
        mid_tithi = int(get_tithi_angle(mid_dt) / TITHI_SPAN)
        if end_dt - start_dt < tolerance:
            return end_dt
        if mid_tithi == current_tithi:
            end_dt = mid_dt
        else:
            start_dt = mid_dt
    return end_dt


def find_next_tithi(
    target_tithi: int,
    target_paksha: str,
    after: datetime | None = None,
    within_days: int = 60,
) -> Optional[datetime]:
    if target_tithi < 1 or target_tithi > 15:
        raise ValueError("target_tithi must be in range 1..15")
    if target_paksha not in {"shukla", "krishna"}:
        raise ValueError("target_paksha must be 'shukla' or 'krishna'")

    if after is None:
        after = datetime.now(timezone.utc)
    elif isinstance(after, date) and not isinstance(after, datetime):
        after = datetime.combine(after, datetime.min.time()).replace(tzinfo=timezone.utc)
    elif isinstance(after, datetime) and after.tzinfo is None:
        after = after.replace(tzinfo=timezone.utc)

    target_absolute = target_tithi + 15 if target_paksha == "krishna" else target_tithi
    search_dt = after
    end_dt = after + timedelta(days=within_days)

    while search_dt < end_dt:
        info = calculate_tithi(search_dt)
        if info["number"] == target_absolute:
            return find_tithi_start(search_dt)
        search_dt += timedelta(hours=12)
    return None
