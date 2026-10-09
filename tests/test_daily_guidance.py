"""Daily guidance builder + the guidance/devices/reminders router (owner scoping)."""

from __future__ import annotations

from datetime import date

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.routers import guidance as guidance_router
from app.security import get_current_user
from database.db import Base, get_db
from database.models import Profile, User
from engine.astronomy.location import DEFAULT_LOCATION
from services.daily_guidance import GUIDANCE_VERSION, build_day_guidance, build_guidance_range


def test_day_guidance_shape_and_bilingual_parity():
    day = build_day_guidance(date(2026, 10, 10), DEFAULT_LOCATION)
    assert day["date"] == "2026-10-10"
    for field in ("do", "dont", "careful"):
        assert len(day[f"{field}_ne"]) == len(day[f"{field}_en"])
    assert day["do_ne"], "a day always has weekday guidance"
    kinds = {w["kind"] for w in day["windows"]}
    assert kinds <= {"shubh", "ashubh"}
    assert any(w["key"] == "rahu_kalam" for w in day["windows"])
    # Every window the panchanga page lists is reminder-able, not a fixed few.
    assert {"tithi", "varjyam", "dur_muhurtam", "pratah_sandhya"} <= {w["key"] for w in day["windows"]}
    for w in day["windows"]:
        assert len(w["start"]) == 5 and w["start"][2] == ":"


def test_guidance_is_deterministic():
    a = build_day_guidance(date(2026, 10, 10), DEFAULT_LOCATION)
    b = build_day_guidance(date(2026, 10, 10), DEFAULT_LOCATION)
    assert a == b


def test_range_is_capped_and_versioned():
    rng = build_guidance_range(date(2026, 10, 10), 500, DEFAULT_LOCATION)
    assert rng["version"] == GUIDANCE_VERSION
    assert len(rng["days"]) == 31
    assert rng["days"][1]["date"] == "2026-10-11"


@pytest.fixture()
def client():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, expire_on_commit=False)

    with Session() as seed:
        alice = User(email="alice@example.com", password_hash="x")
        bob = User(email="bob@example.com", password_hash="x")
        seed.add_all([alice, bob])
        seed.flush()
        profile = Profile(
            user_id=alice.id,
            full_name="Alice",
            latitude=27.7172,
            longitude=85.324,
            timezone="Asia/Kathmandu",
            birth_date="1990-05-12",
            birth_time="06:30",
            birth_era="ad",
        )
        seed.add(profile)
        seed.commit()
        ids = {"alice": alice.id, "bob": bob.id, "profile": profile.id}

    app = FastAPI()
    app.include_router(guidance_router.router)

    def _db():
        with Session() as session:
            yield session

    current = {"user": "alice"}

    def _user():
        with Session() as session:
            return session.get(User, ids[current["user"]])

    app.dependency_overrides[get_db] = _db
    app.dependency_overrides[get_current_user] = _user
    test_client = TestClient(app)
    test_client.ids = ids  # type: ignore[attr-defined]
    test_client.act_as = lambda who: current.update(user=who)  # type: ignore[attr-defined]
    return test_client


def test_guidance_endpoint_includes_personal_tone(client):
    res = client.get(f"/profiles/{client.ids['profile']}/daily-guidance?from=2026-10-10&days=2")
    assert res.status_code == 200
    body = res.json()
    assert len(body["days"]) == 2
    assert body["days"][0]["personal_tone"] in {"best", "good", "neutral", "bad", "worst"}


def test_guidance_is_owner_scoped(client):
    client.act_as("bob")
    res = client.get(f"/profiles/{client.ids['profile']}/daily-guidance?days=1")
    assert res.status_code == 404


def test_reminder_crud_and_scoping(client):
    body = {
        "profile_id": client.ids["profile"],
        "window_kind": "ashubh",
        "window_key": "rahu_kalam",
        "lead_minutes": 15,
        "weekdays": [1, 3, 3],
    }
    created = client.post("/reminders", json=body)
    assert created.status_code == 201
    rid = created.json()["id"]
    assert created.json()["weekdays"] == [1, 3]
    assert len(client.get("/reminders").json()) == 1

    client.act_as("bob")
    assert client.get("/reminders").json() == []
    assert client.delete(f"/reminders/{rid}").status_code == 404
    assert client.post("/reminders", json=body).status_code == 404  # alice's profile

    client.act_as("alice")
    assert client.put(f"/reminders/{rid}", json={**body, "weekdays": [9]}).status_code == 422
    assert client.delete(f"/reminders/{rid}").status_code == 204


def test_device_registration_is_idempotent(client):
    payload = {"push_token": "ExponentPushToken[abcdefghij]", "platform": "android"}
    first = client.post("/devices", json=payload).json()
    second = client.post("/devices", json={**payload, "locale": "ne"}).json()
    assert first["id"] == second["id"]
    client.act_as("bob")
    assert client.delete(f"/devices/{first['id']}").status_code == 404
