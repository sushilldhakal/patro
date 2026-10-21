"""Daily guidance, device registration and reminder rules — all owner-scoped."""

from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Literal

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

from api.deps import LocationDep
from app.security import CurrentUser, DbSession
from database.models import Device, Profile, Reminder
from engine.identity.profiles import ProfileNotFound
from engine.identity.reminders import BadWeekdays, DeviceNotFound, ReminderNotFound, decode_weekdays
from services.identity import reminders
from app.routers.profiles import profile_not_found
from services.identity.profile_store import SqlProfileRepository
from services.identity.profiles import get_profile
from services.jyotish.daily_guidance import MAX_DAYS, build_guidance_range, natal_chart_for_profile

router = APIRouter(tags=["guidance"])


def _owned_profile(db, user, profile_id: str) -> Profile:
    try:
        return get_profile(SqlProfileRepository(db), user.id, profile_id)
    except ProfileNotFound:
        raise profile_not_found() from None


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
    payload = build_guidance_range(first, days, location, natal_chart_for_profile(profile))
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
    return reminders.register_device(db, user.id, body.model_dump())


@router.delete("/devices/{device_id}", status_code=status.HTTP_204_NO_CONTENT)
def unregister_device(device_id: str, user: CurrentUser, db: DbSession) -> None:
    try:
        reminders.unregister_device(db, user.id, device_id)
    except DeviceNotFound as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from None


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
        weekdays=decode_weekdays(row.weekdays),
        label=row.label,
        enabled=row.enabled,
    )


def _rules_to_http(call, *args):
    """Run a reminder use case, mapping its rule errors to status codes."""
    try:
        return call(*args)
    except ProfileNotFound:
        raise profile_not_found() from None
    except ReminderNotFound as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from None
    except BadWeekdays as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from None


@router.get("/reminders", response_model=list[ReminderOut])
def list_reminders(user: CurrentUser, db: DbSession) -> list[ReminderOut]:
    return [_to_out(r) for r in reminders.list_reminders(db, user.id)]


@router.post("/reminders", response_model=ReminderOut, status_code=status.HTTP_201_CREATED)
def create_reminder(body: ReminderIn, user: CurrentUser, db: DbSession) -> ReminderOut:
    return _to_out(_rules_to_http(reminders.create_reminder, db, user.id, body.model_dump()))


@router.put("/reminders/{reminder_id}", response_model=ReminderOut)
def update_reminder(
    reminder_id: str, body: ReminderIn, user: CurrentUser, db: DbSession
) -> ReminderOut:
    return _to_out(_rules_to_http(reminders.update_reminder, db, user.id, reminder_id, body.model_dump()))


@router.delete("/reminders/{reminder_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_reminder(reminder_id: str, user: CurrentUser, db: DbSession) -> None:
    _rules_to_http(reminders.delete_reminder, db, user.id, reminder_id)
