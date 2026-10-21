"""Device and reminder use cases, against the SQLAlchemy session.

Rules live in ``engine.identity.reminders``; a reminder that names a profile
must name one of the user's own (``services.identity.profiles``).
"""

from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from database.models import Device, Reminder
from engine.identity.reminders import DeviceNotFound, ReminderNotFound, encode_weekdays, owned
from services.identity.profile_store import SqlProfileRepository
from services.identity.profiles import get_profile

REMINDER_FIELDS = ("profile_id", "window_kind", "window_key", "lead_minutes", "label", "enabled")


def register_device(db: Session, owner_id: str, fields: dict[str, Any]) -> Device:
    """Idempotent on the push token: re-registering moves it to the current user."""
    device = db.scalar(select(Device).where(Device.push_token == fields["push_token"]))
    if device is None:
        device = Device(user_id=owner_id, **fields)
        db.add(device)
    else:
        device.user_id = owner_id
        device.platform = fields["platform"]
        device.timezone = fields.get("timezone")
        device.locale = fields.get("locale")
    db.commit()
    db.refresh(device)
    return device


def unregister_device(db: Session, owner_id: str, device_id: str) -> None:
    device = owned(db.get(Device, device_id), owner_id, DeviceNotFound)
    db.delete(device)
    db.commit()


def list_reminders(db: Session, owner_id: str) -> list[Reminder]:
    return list(db.scalars(select(Reminder).where(Reminder.user_id == owner_id).order_by(Reminder.created_at)))


def _check_profile(db: Session, owner_id: str, profile_id: str | None) -> None:
    """Raises ``ProfileNotFound`` unless ``profile_id`` is the user's own (or None)."""
    if profile_id is not None:
        get_profile(SqlProfileRepository(db), owner_id, profile_id)


def create_reminder(db: Session, owner_id: str, fields: dict[str, Any]) -> Reminder:
    _check_profile(db, owner_id, fields.get("profile_id"))
    row = Reminder(
        user_id=owner_id,
        weekdays=encode_weekdays(fields.get("weekdays") or []),
        **{k: fields.get(k) for k in REMINDER_FIELDS},
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def update_reminder(db: Session, owner_id: str, reminder_id: str, fields: dict[str, Any]) -> Reminder:
    row = owned(db.get(Reminder, reminder_id), owner_id, ReminderNotFound)
    _check_profile(db, owner_id, fields.get("profile_id"))
    for key in REMINDER_FIELDS:
        setattr(row, key, fields.get(key))
    row.weekdays = encode_weekdays(fields.get("weekdays") or [])
    db.commit()
    db.refresh(row)
    return row


def delete_reminder(db: Session, owner_id: str, reminder_id: str) -> None:
    row = owned(db.get(Reminder, reminder_id), owner_id, ReminderNotFound)
    db.delete(row)
    db.commit()
