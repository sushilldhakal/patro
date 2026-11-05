"""The user's events and reminders — one record for both (``services.identity.events``)."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, HTTPException, Query, Response, status
from pydantic import BaseModel, Field

from app.security import CurrentUser, DbSession
from database.models import CalendarEvent
from engine.identity.profiles import ProfileNotFound
from services.identity import events

router = APIRouter(tags=["events"])


class EventIn(BaseModel):
    kind: str = "event"
    priority: int = Field(0, ge=0, le=3)
    title: str = Field(..., min_length=1, max_length=200)
    location: str | None = Field(None, max_length=200)
    notes: str | None = Field(None, max_length=4000)
    all_day: bool = False
    starts_at: datetime
    ends_at: datetime | None = None
    timezone: str = Field("Asia/Kathmandu", max_length=64)
    repeat: str = "never"
    alerts: list[int] = Field(default_factory=list, max_length=2)
    source_kind: str | None = Field(None, max_length=16)
    source_key: str | None = Field(None, max_length=64)
    invitees: list[str] = Field(default_factory=list, max_length=20)
    profile_id: str | None = None


class EventOut(EventIn):
    id: str
    created_at: datetime
    updated_at: datetime


def _to_out(row: CalendarEvent) -> EventOut:
    return EventOut(
        id=row.id,
        kind=row.kind,
        priority=row.priority,
        title=row.title,
        location=row.location,
        notes=row.notes,
        all_day=row.all_day,
        starts_at=events.as_utc(row.starts_at),
        ends_at=events.as_utc(row.ends_at),
        timezone=row.timezone,
        repeat=row.repeat,
        alerts=[int(a) for a in row.alerts.split(",") if a],
        source_kind=row.source_kind,
        source_key=row.source_key,
        invitees=[e for e in row.invitees.split(",") if e],
        profile_id=row.profile_id,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _run(fn, *args):
    try:
        return fn(*args)
    except events.EventNotFound as err:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Event not found") from err
    except events.BadEvent as err:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(err)) from err
    except ProfileNotFound as err:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Profile not found") from err


@router.get("/events", response_model=list[EventOut])
def list_events(user: CurrentUser, db: DbSession, since: datetime | None = Query(None)) -> list[EventOut]:
    return [_to_out(r) for r in events.list_events(db, user.id, since)]


@router.post("/events", response_model=EventOut, status_code=status.HTTP_201_CREATED)
def create_event(body: EventIn, user: CurrentUser, db: DbSession) -> EventOut:
    return _to_out(_run(events.create_event, db, user.id, body.model_dump()))


@router.put("/events/{event_id}", response_model=EventOut)
def update_event(event_id: str, body: EventIn, user: CurrentUser, db: DbSession) -> EventOut:
    return _to_out(_run(events.update_event, db, user.id, event_id, body.model_dump()))


@router.delete("/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(event_id: str, user: CurrentUser, db: DbSession) -> None:
    _run(events.delete_event, db, user.id, event_id)


class FeedOut(BaseModel):
    """The private subscription link's secret; the client puts it on its API base: ``/calendar/<token>.ics``."""

    token: str
    path: str


def _feed_out(token: str) -> FeedOut:
    return FeedOut(token=token, path=f"/calendar/{token}.ics")


@router.get("/events/feed", response_model=FeedOut)
def get_feed(user: CurrentUser, db: DbSession) -> FeedOut:
    """The owner's private link for Google / Apple Calendar (made on first ask)."""
    return _feed_out(events.feed_token(db, user.id))


@router.post("/events/feed/reset", response_model=FeedOut)
def reset_feed(user: CurrentUser, db: DbSession) -> FeedOut:
    """A new link; calendars subscribed to the old one stop getting updates."""
    return _feed_out(events.feed_token(db, user.id, reset=True))


@router.get("/calendar/{token}.ics", include_in_schema=False)
def calendar_feed(token: str, db: DbSession) -> Response:
    """The subscribed calendar itself. No sign-in: the token in the link is the key."""
    owner = events.feed_owner(db, token)
    if owner is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Calendar not found")
    return Response(
        events.build_feed(db, owner),
        media_type="text/calendar; charset=utf-8",
        headers={
            "Content-Disposition": 'inline; filename="vedic-patro.ics"',
            # Personal: never in a shared cache.
            "Cache-Control": "private, max-age=900",
        },
    )
