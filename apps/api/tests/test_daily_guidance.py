"""Daily guidance builder + the guidance/devices/reminders router (owner scoping)."""

from __future__ import annotations

from datetime import date, datetime, time, timedelta
from types import SimpleNamespace

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
from services.jyotish.daily_guidance import GUIDANCE_VERSION, build_day_guidance, build_guidance_range


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


def _born():
    return SimpleNamespace(
        birth_date="1990-05-12",
        birth_time="06:30",
        birth_era="ad",
        latitude=27.7,
        longitude=85.3167,
        timezone="Asia/Kathmandu",
    )


def test_personal_block_follows_the_moon_and_the_sunrise_dasha():
    from engine.astronomy.moon import moon_service
    from engine.astronomy.rashi import rashi_service
    from engine.astronomy.sun import calculate_sunrise
    from engine.astronomy.timescale import resolve_observer_timezone
    from engine.astronomy.ut_instant import as_julian_day
    from engine.jyotish.rashifal_personal import dasha_block
    from engine.panchanga.angas import NAKSHATRA_SPAN
    from services.jyotish.daily_guidance import build_day_guidance, natal_chart_for_profile

    location = DEFAULT_LOCATION
    natal = natal_chart_for_profile(_born())
    assert natal is not None
    bare = build_day_guidance(date(2026, 11, 1), location, None)
    assert "personal" not in bare

    tz = resolve_observer_timezone(location.timezone)
    janma_rashi = natal.moon_sign
    janma_nak = natal.chart.moon_nak[0]
    saw_split = False
    saw_ashtama = False
    saw_tenth = False
    saw_twelfth = False
    for offset in range(30):
        greg = date(2026, 11, 1) + timedelta(days=offset)
        day = build_day_guidance(greg, location, natal)
        personal = day["personal"]
        segments = personal["segments"]
        assert segments, greg
        sunrise = calculate_sunrise(greg, location.lat, location.lon, timezone_name=location.timezone)
        dasha = dasha_block(natal, sunrise)
        assert personal["dasha"]["maha"]["lord"] == dasha["mahadasha"]["lord"]
        assert personal["dasha"]["antar"]["lord"] == dasha["antardasha"]["lord"]
        for who in ("maha", "antar"):
            row = personal["dasha"][who]
            if row["lord"] in ("rahu", "ketu"):
                assert row["vakri"] is False
        assert personal["janma_rashi"]["number"] == janma_rashi + 1
        assert personal["janma_nakshatra"]["number"] == janma_nak + 1

        def _min(hhmm: str) -> int:
            hour, minute = (int(part) for part in hhmm.split(":"))
            return hour * 60 + minute

        assert segments[0]["start"] < "12:00"
        for left, right in zip(segments, segments[1:]):
            assert left["end"] == right["start"]
        if len(segments) > 1:
            saw_split = True
            boundary = _min(segments[1]["start"])
            before = datetime.combine(greg, time.min, tzinfo=tz) + timedelta(minutes=boundary - 2)
            after = datetime.combine(greg, time.min, tzinfo=tz) + timedelta(minutes=boundary + 2)
            before_rashi = rashi_service.chandra(as_julian_day(before)).number
            after_rashi = rashi_service.chandra(as_julian_day(after)).number
            before_nak = int(moon_service.longitude(as_julian_day(before)) / NAKSHATRA_SPAN) % 27
            after_nak = int(moon_service.longitude(as_julian_day(after)) / NAKSHATRA_SPAN) % 27
            assert before_rashi != after_rashi or before_nak != after_nak
        for seg in segments:
            start = _min(seg["start"])
            end = _min(seg["end"])
            assert end > start
            probe = datetime.combine(greg, time.min, tzinfo=tz) + timedelta(minutes=start + 1)
            moon = rashi_service.chandra(as_julian_day(probe))
            house = (int(moon.number) - 1 - janma_rashi) % 12 + 1
            assert seg["chandra"]["house"] == house
            if house == 8:
                assert seg["chandra"]["state"] == "ashtama"
                saw_ashtama = True
            elif house in {1, 3, 6, 7, 10, 11}:
                assert seg["chandra"]["state"] == "good"
            else:
                assert seg["chandra"]["state"] == "weak"
            if greg == date(2026, 11, 2) and house == 10:
                saw_tenth = True
            if greg == date(2026, 11, 7) and house == 12:
                saw_twelfth = True
            nak = int(moon_service.longitude(as_julian_day(probe)) / NAKSHATRA_SPAN) % 27
            assert seg["tara"]["num"] == ((nak - janma_nak) % 27) % 9 + 1
            assert seg["tara"]["state"] == {1: "caution", 3: "bad", 5: "bad", 7: "bad"}.get(seg["tara"]["num"], "good")
    assert saw_split
    assert saw_ashtama
    assert saw_tenth
    assert saw_twelfth


def test_profile_day_carries_its_own_reading():
    """The day's dialog reads the profile's own rashifal: the paragraph, six life areas, the dasha and
    the transits, the same scoring that sets the tone."""
    from services.jyotish.daily_guidance import build_day_guidance, natal_chart_for_profile
    from services.jyotish.rashifal_api import personal_rashifal_for_gregorian

    natal = natal_chart_for_profile(_born())
    greg = date(2026, 11, 11)
    day = build_day_guidance(greg, DEFAULT_LOCATION, natal)
    reading = day["reading"]
    personal = personal_rashifal_for_gregorian(natal, greg, DEFAULT_LOCATION, period="daily")
    assert reading["percent"] == personal["percent"]
    assert reading["prediction_ne"] and reading["prediction_en"]
    assert [d["key"] for d in reading["domains"]] == [d["key"] for d in personal["domains"]]
    assert reading["dasha"]["maha"]["lord"] and reading["dasha"]["antar"]["lord"]
    assert {g["graha"] for g in reading["gochar"]} >= {"sun", "moon", "jupiter", "saturn"}
    assert "reading" not in build_day_guidance(greg, DEFAULT_LOCATION, None)


def test_chandra_houses_are_the_classical_set():
    from services.jyotish.daily_guidance import _chandra_state

    good = {1, 3, 6, 7, 10, 11}
    weak = {2, 4, 5, 9, 12}
    for house in range(1, 13):
        got_house, state = _chandra_state(house - 1, 0)
        assert got_house == house
        if house == 8:
            assert state == "ashtama"
        elif house in good:
            assert state == "good"
        else:
            assert house in weak
            assert state == "weak"


def test_profile_without_birth_has_no_personal_block():
    from services.jyotish.daily_guidance import natal_chart_for_profile

    bare = SimpleNamespace(
        birth_date=None, birth_time=None, birth_era=None, latitude=None, longitude=None, timezone=None
    )
    assert natal_chart_for_profile(bare) is None


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
