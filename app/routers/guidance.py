"""Daily guidance, device registration and reminder rules — all owner-scoped."""

from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Literal

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select

from api.deps import LocationDep
from app.security import CurrentUser, DbSession
from database.models import Device, Profile, Reminder
from services.daily_guidance import MAX_DAYS, build_guidance_range

router = APIRouter(tags=["guidance"])


def _owned_profile(db, user, profile_id: str) -> Profile:
    profile = db.get(Profile, profile_id)
    if profile is None or profile.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    return profile


def _natal_for(profile: Profile):
    """The profile's natal chart, or None when it has no usable birth moment."""
    from app.instant_resolver import birth_instant_from_query
    from engine.vedic.rashifal_personal import build_natal_chart

    if not (profile.birth_date and profile.latitude is not None and profile.longitude is not None):
        return None
    try:
        year, month, day = (int(part) for part in profile.birth_date.split("-")[:3])
        instant = birth_instant_from_query(
            birth_tz=profile.timezone or "Asia/Kathmandu",
            birth_era=profile.birth_era or "bs",
            birth_year=year,
            birth_month=month,
            birth_day=day,
            birth_clock=profile.birth_time or "12:00",
            lat=profile.latitude,
            lon=profile.longitude,
        )
        return build_natal_chart(instant, lat=profile.latitude, lon=profile.longitude)
    except (ValueError, TypeError):
        return None


@router.get("/profiles/{profile_id}/daily-guidance")
def daily_guidance(
    profile_id: str,
    location: LocationDep,
    user: CurrentUser,
    db: DbSession,
    start: date | None = Query(None, alias="from", description="First day (default today, UTC)"),
    days: int = Query(14, ge=1, le=MAX_DAYS),
):
    """Do / don't / be-careful text and शुभ/अशुभ windows for the next ``days`` days.

    Personal tone is added when the profile has a birth moment and place.
    ``location`` is where the person is *now* (windows are read from there).
    """
    profile = _owned_profile(db, user, profile_id)
    first = start or datetime.now(timezone.utc).date()
    payload = build_guidance_range(first, days, location, _natal_for(profile))
    payload["profile_id"] = profile.id
    return payload


# ─── Devices ───────────────────────────────────────────────────────────────────


class DeviceIn(BaseModel):
    push_token: str = Field(min_length=10, max_length=255)
    platform: Literal["ios", "android"]
    timezone: str | None = Field(None, max_length=64)
    locale: str | None = Field(None, max_length=16)


class DeviceOut(DeviceIn):
    id: str

    model_config = {"from_attributes": True}


@router.post("/devices", response_model=DeviceOut)
def register_device(body: DeviceIn, user: CurrentUser, db: DbSession) -> Device:
    """Idempotent on the push token: re-registering moves it to the current user."""
    device = db.scalar(select(Device).where(Device.push_token == body.push_token))
    if device is None:
        device = Device(user_id=user.id, **body.model_dump())
        db.add(device)
    else:
        device.user_id = user.id
        device.platform = body.platform
        device.timezone = body.timezone
        device.locale = body.locale
    db.commit()
    db.refresh(device)
    return device


@router.delete("/devices/{device_id}", status_code=status.HTTP_204_NO_CONTENT)
def unregister_device(device_id: str, user: CurrentUser, db: DbSession) -> None:
    device = db.get(Device, device_id)
    if device is None or device.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
    db.delete(device)
    db.commit()


# ─── Reminder rules ────────────────────────────────────────────────────────────


class ReminderIn(BaseModel):
    profile_id: str | None = None
    window_kind: Literal["shubh", "ashubh"]
    window_key: str = Field(min_length=1, max_length=48)
    lead_minutes: int = Field(10, ge=0, le=180)
    weekdays: list[int] = Field(default_factory=list)
    label: str | None = Field(None, max_length=120)
    enabled: bool = True


class ReminderOut(BaseModel):
    id: str
    profile_id: str | None
    window_kind: Literal["shubh", "ashubh"]
    window_key: str
    lead_minutes: int
    weekdays: list[int]
    label: str | None
    enabled: bool


def _to_out(row: Reminder) -> ReminderOut:
    return ReminderOut(
        id=row.id,
        profile_id=row.profile_id,
        window_kind=row.window_kind,  # type: ignore[arg-type]
        window_key=row.window_key,
        lead_minutes=row.lead_minutes,
        weekdays=[int(d) for d in row.weekdays.split(",") if d != ""],
        label=row.label,
        enabled=row.enabled,
    )


def _clean_weekdays(days: list[int]) -> str:
    if any(d < 0 or d > 6 for d in days):
        raise HTTPException(status_code=422, detail="weekdays must be 0 (Sunday) to 6")
    return ",".join(str(d) for d in sorted(set(days)))


def _check_profile(db, user, profile_id: str | None) -> None:
    if profile_id is not None:
        _owned_profile(db, user, profile_id)


def _owned_reminder(db, user, reminder_id: str) -> Reminder:
    row = db.get(Reminder, reminder_id)
    if row is None or row.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reminder not found")
    return row


@router.get("/reminders", response_model=list[ReminderOut])
def list_reminders(user: CurrentUser, db: DbSession) -> list[ReminderOut]:
    rows = db.scalars(
        select(Reminder).where(Reminder.user_id == user.id).order_by(Reminder.created_at)
    )
    return [_to_out(r) for r in rows]


@router.post("/reminders", response_model=ReminderOut, status_code=status.HTTP_201_CREATED)
def create_reminder(body: ReminderIn, user: CurrentUser, db: DbSession) -> ReminderOut:
    _check_profile(db, user, body.profile_id)
    row = Reminder(
        user_id=user.id,
        profile_id=body.profile_id,
        window_kind=body.window_kind,
        window_key=body.window_key,
        lead_minutes=body.lead_minutes,
        weekdays=_clean_weekdays(body.weekdays),
        label=body.label,
        enabled=body.enabled,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _to_out(row)


@router.put("/reminders/{reminder_id}", response_model=ReminderOut)
def update_reminder(
    reminder_id: str, body: ReminderIn, user: CurrentUser, db: DbSession
) -> ReminderOut:
    row = _owned_reminder(db, user, reminder_id)
    _check_profile(db, user, body.profile_id)
    row.profile_id = body.profile_id
    row.window_kind = body.window_kind
    row.window_key = body.window_key
    row.lead_minutes = body.lead_minutes
    row.weekdays = _clean_weekdays(body.weekdays)
    row.label = body.label
    row.enabled = body.enabled
    db.commit()
    db.refresh(row)
    return _to_out(row)


@router.delete("/reminders/{reminder_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_reminder(reminder_id: str, user: CurrentUser, db: DbSession) -> None:
    row = _owned_reminder(db, user, reminder_id)
    db.delete(row)
    db.commit()
