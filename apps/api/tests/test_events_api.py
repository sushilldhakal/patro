"""/events: owner scoping, validation, and the calendar invitation sent to invitees."""

from __future__ import annotations

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.routers import events as events_router
from app.security import get_current_user
from database.db import Base, get_db
from database.models import User
from services.identity import emailer

EVENT = {
    "title": "विवाह साइत",
    "starts_at": "2026-11-20T04:30:00+00:00",
    "ends_at": "2026-11-20T05:30:00+00:00",
    "timezone": "Asia/Kathmandu",
    "repeat": "yearly",
    "alerts": [0, 1440],
    "source_kind": "sait",
    "source_key": "vivaha",
    "invitees": ["Guest@Example.com"],
}


@pytest.fixture()
def setup(monkeypatch):
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, expire_on_commit=False)
    with Session() as seed:
        alice = User(email="alice@example.com", password_hash="x")
        bob = User(email="bob@example.com", password_hash="x")
        seed.add_all([alice, bob])
        seed.commit()
        ids = {"alice": alice.id, "bob": bob.id}

    app = FastAPI()
    app.include_router(events_router.router)
    current = {"user": "alice"}

    def _db():
        with Session() as session:
            yield session

    def _user():
        with Session() as session:
            return session.get(User, ids[current["user"]])

    app.dependency_overrides[get_db] = _db
    app.dependency_overrides[get_current_user] = _user
    sent: list[tuple[str, str, str, bool]] = []
    monkeypatch.setattr(
        emailer,
        "send_event_invite",
        lambda to, title, ics, organizer_name, cancelled=False: sent.append((to, title, ics, cancelled)),
    )
    return TestClient(app), current, sent


def test_create_sends_invitation_and_lists(setup):
    client, _, sent = setup
    res = client.post("/events", json=EVENT)
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["invitees"] == ["guest@example.com"]
    assert body["alerts"] == [0, 1440]
    assert len(sent) == 1
    to, title, ics, cancelled = sent[0]
    assert to == "guest@example.com" and not cancelled
    assert "METHOD:REQUEST" in ics and "RRULE:FREQ=YEARLY" in ics
    assert "DTSTART:20261120T043000Z" in ics and "TRIGGER:-PT1440M" in ics
    assert [e["id"] for e in client.get("/events").json()] == [body["id"]]


def test_other_users_cannot_see_or_edit(setup):
    client, current, _ = setup
    event_id = client.post("/events", json=EVENT).json()["id"]
    current["user"] = "bob"
    assert client.get("/events").json() == []
    assert client.put(f"/events/{event_id}", json=EVENT).status_code == 404
    assert client.delete(f"/events/{event_id}").status_code == 404


def test_removed_invitee_gets_a_cancellation(setup):
    client, _, sent = setup
    event_id = client.post("/events", json=EVENT).json()["id"]
    sent.clear()
    res = client.put(f"/events/{event_id}", json={**EVENT, "invitees": ["new@example.com"]})
    assert res.status_code == 200
    assert {(to, cancelled) for to, _, _, cancelled in sent} == {("new@example.com", False), ("guest@example.com", True)}


def test_rejects_end_before_start_and_bad_email(setup):
    client, _, _ = setup
    assert client.post("/events", json={**EVENT, "ends_at": "2026-11-20T03:00:00+00:00"}).status_code == 422
    assert client.post("/events", json={**EVENT, "invitees": ["not-an-email"]}).status_code == 422


def test_reminder_kind_priority_and_new_repeats(setup):
    client, _, sent = setup
    res = client.post(
        "/events",
        json={**EVENT, "kind": "reminder", "priority": 3, "repeat": "weekdays", "source_kind": "pushkara", "source_key": "makara"},
    )
    assert res.status_code == 201, res.text
    body = res.json()
    assert (body["kind"], body["priority"], body["repeat"]) == ("reminder", 3, "weekdays")
    assert "RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR" in sent[-1][2]
    res = client.post("/events", json={**EVENT, "repeat": "half_yearly"})
    assert res.status_code == 201 and "RRULE:FREQ=MONTHLY;INTERVAL=6" in sent[-1][2]
    # Old clients send neither field: an event with no priority.
    plain = client.post("/events", json=EVENT).json()
    assert (plain["kind"], plain["priority"]) == ("event", 0)
    assert client.post("/events", json={**EVENT, "kind": "task"}).status_code == 422
    assert client.post("/events", json={**EVENT, "priority": 7}).status_code == 422


def test_all_day_invitation_uses_the_events_own_day(setup):
    client, _, sent = setup
    # Midnight to 23:59 on 21 Nov in Melbourne is 20 Nov 13:00 → 21 Nov 12:59 UTC.
    res = client.post(
        "/events",
        json={**EVENT, "all_day": True, "timezone": "Australia/Melbourne", "starts_at": "2026-11-20T13:00:00+00:00", "ends_at": "2026-11-21T12:59:00+00:00"},
    )
    assert res.status_code == 201, res.text
    ics = sent[-1][2]
    assert "DTSTART;VALUE=DATE:20261121" in ics and "DTEND;VALUE=DATE:20261122" in ics
