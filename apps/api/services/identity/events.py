"""Events and reminders the user saves — one record, shaped like Apple Calendar's new-event form.

Invitees get a real calendar invitation by email: an iCalendar ``REQUEST`` (RFC 5545 / 5546),
which Gmail, Apple Mail and Outlook show with Add / Accept buttons. An update re-sends it
with a higher ``SEQUENCE``; a delete sends ``CANCEL``. Alerts are delivered on the device
(local notifications), so the server only stores them.
"""

from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone
from typing import Any
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import select
from sqlalchemy.orm import Session

from database.models import CalendarEvent, User
from services.identity import emailer
from services.identity.profile_store import SqlProfileRepository
from services.identity.profiles import get_profile

# Apple Calendar's list: weekdays are Monday–Friday and weekends Saturday–Sunday, as in iCalendar.
REPEATS = (
    "never",
    "daily",
    "weekdays",
    "weekends",
    "weekly",
    "fortnightly",
    "monthly",
    "quarterly",
    "half_yearly",
    "yearly",
)
KINDS = ("event", "reminder")
PRIORITIES = (0, 1, 2, 3)  # none, low, medium, high
MAX_ALERTS = 2
MAX_INVITEES = 20
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
_RRULE = {
    "daily": "FREQ=DAILY",
    "weekdays": "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
    "weekends": "FREQ=WEEKLY;BYDAY=SA,SU",
    "weekly": "FREQ=WEEKLY",
    "fortnightly": "FREQ=WEEKLY;INTERVAL=2",
    "monthly": "FREQ=MONTHLY",
    "quarterly": "FREQ=MONTHLY;INTERVAL=3",
    "half_yearly": "FREQ=MONTHLY;INTERVAL=6",
    "yearly": "FREQ=YEARLY",
}


class EventNotFound(LookupError):
    pass


class BadEvent(ValueError):
    pass


def _clean(fields: dict[str, Any]) -> dict[str, Any]:
    starts: datetime = fields["starts_at"]
    ends: datetime = fields.get("ends_at") or starts
    if starts.tzinfo is None or ends.tzinfo is None:
        raise BadEvent("Times must carry a timezone")
    if ends < starts:
        raise BadEvent("An event cannot end before it starts")
    repeat = fields.get("repeat") or "never"
    if repeat not in REPEATS:
        raise BadEvent(f"Unknown repeat: {repeat}")
    alerts = sorted({int(a) for a in fields.get("alerts") or [] if 0 <= int(a) <= 60 * 24 * 14})
    if len(alerts) > MAX_ALERTS:
        raise BadEvent("At most two alerts")
    invitees = []
    for raw in fields.get("invitees") or []:
        email = raw.strip().lower()
        if not EMAIL_RE.match(email):
            raise BadEvent(f"Not an email address: {raw}")
        if email not in invitees:
            invitees.append(email)
    if len(invitees) > MAX_INVITEES:
        raise BadEvent("Too many invitees")
    kind = fields.get("kind") or "event"
    if kind not in KINDS:
        raise BadEvent(f"Unknown kind: {kind}")
    priority = int(fields.get("priority") or 0)
    if priority not in PRIORITIES:
        raise BadEvent(f"Unknown priority: {priority}")
    title = (fields.get("title") or "").strip()
    if not title:
        raise BadEvent("A title is needed")
    return {
        "kind": kind,
        "priority": priority,
        "title": title[:200],
        "location": (fields.get("location") or "").strip()[:200] or None,
        "notes": (fields.get("notes") or "").strip() or None,
        "all_day": bool(fields.get("all_day")),
        "starts_at": starts.astimezone(timezone.utc),
        "ends_at": ends.astimezone(timezone.utc),
        "timezone": fields.get("timezone") or "Asia/Kathmandu",
        "repeat": repeat,
        "alerts": ",".join(str(a) for a in alerts),
        "source_kind": fields.get("source_kind"),
        "source_key": fields.get("source_key"),
        "invitees": ",".join(invitees),
        "profile_id": fields.get("profile_id"),
    }


def _owned(db: Session, owner_id: str, event_id: str) -> CalendarEvent:
    row = db.get(CalendarEvent, event_id)
    if row is None or row.user_id != owner_id:
        raise EventNotFound(event_id)
    return row


def list_events(db: Session, owner_id: str, since: datetime | None = None) -> list[CalendarEvent]:
    q = select(CalendarEvent).where(CalendarEvent.user_id == owner_id)
    if since is not None:
        # Repeating events started long ago still recur, so keep them.
        q = q.where((CalendarEvent.ends_at >= since) | (CalendarEvent.repeat != "never"))
    return list(db.scalars(q.order_by(CalendarEvent.starts_at)))


def create_event(db: Session, owner_id: str, fields: dict[str, Any]) -> CalendarEvent:
    clean = _clean(fields)
    if clean["profile_id"]:
        get_profile(SqlProfileRepository(db), owner_id, clean["profile_id"])
    row = CalendarEvent(user_id=owner_id, **clean)
    db.add(row)
    db.commit()
    db.refresh(row)
    _send_invites(db, row, sequence=0, previous=[])
    return row


def update_event(db: Session, owner_id: str, event_id: str, fields: dict[str, Any]) -> CalendarEvent:
    row = _owned(db, owner_id, event_id)
    previous = [e for e in row.invitees.split(",") if e]
    clean = _clean(fields)
    if clean["profile_id"]:
        get_profile(SqlProfileRepository(db), owner_id, clean["profile_id"])
    for key, value in clean.items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    sequence = int(datetime.now(timezone.utc).timestamp())  # always higher than the last send
    _send_invites(db, row, sequence=sequence, previous=previous)
    return row


def delete_event(db: Session, owner_id: str, event_id: str) -> None:
    row = _owned(db, owner_id, event_id)
    invitees = [e for e in row.invitees.split(",") if e]
    if invitees:
        organizer = db.get(User, owner_id)
        ics = build_ics(row, organizer, method="CANCEL", sequence=int(datetime.now(timezone.utc).timestamp()))
        for email in invitees:
            emailer.send_event_invite(email, row.title, ics, organizer_name=_name(organizer), cancelled=True)
    db.delete(row)
    db.commit()


def _name(user: User | None) -> str:
    if user is None:
        return "Vedic Patro"
    return (getattr(user, "display_name", None) or getattr(user, "name", None) or user.email or "Vedic Patro").strip()


def _send_invites(db: Session, row: CalendarEvent, *, sequence: int, previous: list[str]) -> None:
    invitees = [e for e in row.invitees.split(",") if e]
    organizer = db.get(User, row.user_id)
    if invitees:
        ics = build_ics(row, organizer, method="REQUEST", sequence=sequence)
        for email in invitees:
            emailer.send_event_invite(email, row.title, ics, organizer_name=_name(organizer))
    removed = [e for e in previous if e not in invitees]
    if removed:
        ics = build_ics(row, organizer, method="CANCEL", sequence=sequence)
        for email in removed:
            emailer.send_event_invite(email, row.title, ics, organizer_name=_name(organizer), cancelled=True)


def as_utc(value: datetime) -> datetime:
    """Stored times are UTC; SQLite hands them back without the zone."""
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


def _ics_text(value: str) -> str:
    return value.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")


def _fold(line: str) -> str:
    """RFC 5545 lines are at most 75 octets; longer ones continue after CRLF + space."""
    out, cur = [], ""
    for ch in line:
        if len((cur + ch).encode("utf-8")) > 74:
            out.append(cur)
            cur = " " + ch
        else:
            cur += ch
    out.append(cur)
    return "\r\n".join(out)


def build_ics(row: CalendarEvent, organizer: User | None, *, method: str, sequence: int) -> str:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    if row.all_day:
        # The day in the event's own zone (local midnight is the day before in UTC east of
        # Greenwich), and DTEND is exclusive: the day after the last one.
        try:
            zone = ZoneInfo(row.timezone)
        except (ZoneInfoNotFoundError, ValueError):
            zone = timezone.utc
        first = as_utc(row.starts_at).astimezone(zone).date()
        last = max(first, as_utc(row.ends_at).astimezone(zone).date())
        start = f"DTSTART;VALUE=DATE:{first.strftime('%Y%m%d')}"
        end = f"DTEND;VALUE=DATE:{(last + timedelta(days=1)).strftime('%Y%m%d')}"
    else:
        start = f"DTSTART:{as_utc(row.starts_at).strftime('%Y%m%dT%H%M%SZ')}"
        end = f"DTEND:{as_utc(row.ends_at).strftime('%Y%m%dT%H%M%SZ')}"
    org_email = organizer.email if organizer and organizer.email else "noreply@vedicpatro.com"
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Vedic Patro//Events//EN",
        "CALSCALE:GREGORIAN",
        f"METHOD:{method}",
        "BEGIN:VEVENT",
        f"UID:{row.id}@vedicpatro.com",
        f"DTSTAMP:{stamp}",
        f"SEQUENCE:{sequence}",
        start,
        end,
        f"SUMMARY:{_ics_text(row.title)}",
        f"ORGANIZER;CN={_ics_text(_name(organizer))}:mailto:{org_email}",
    ]
    if row.location:
        lines.append(f"LOCATION:{_ics_text(row.location)}")
    if row.notes:
        lines.append(f"DESCRIPTION:{_ics_text(row.notes)}")
    if row.repeat in _RRULE:
        lines.append(f"RRULE:{_RRULE[row.repeat]}")
    for email in [e for e in row.invitees.split(",") if e]:
        lines.append(f"ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:{email}")
    lines.append(f"STATUS:{'CANCELLED' if method == 'CANCEL' else 'CONFIRMED'}")
    for minutes in [int(a) for a in row.alerts.split(",") if a]:
        lines += ["BEGIN:VALARM", "ACTION:DISPLAY", f"DESCRIPTION:{_ics_text(row.title)}", f"TRIGGER:-PT{minutes}M", "END:VALARM"]
    lines += ["END:VEVENT", "END:VCALENDAR"]
    return "\r\n".join(_fold(line) for line in lines) + "\r\n"
