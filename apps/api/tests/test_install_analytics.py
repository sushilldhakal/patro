"""Anonymous install counting: /analytics/install/* and the admin read-outs."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.routers import install_analytics as router_module
from database.db import Base, get_db
from database.models import AppInstallation, AppInstallationEvent, User
from services.platform import install_analytics, redis_cache

ADMIN = {"X-Admin-Key": "let-me-in"}
NOW = datetime(2026, 11, 16, 12, 0, tzinfo=timezone.utc)


def _report(**over):
    return {"installation_id": str(uuid.uuid4()), "platform": "ios", "app_version": "1.2.2", "os_version": "27.0", **over}


@pytest.fixture()
def setup(monkeypatch):
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, expire_on_commit=False)
    app = FastAPI()
    app.include_router(router_module.router)

    def _db():
        with Session() as session:
            yield session

    app.dependency_overrides[get_db] = _db
    monkeypatch.setenv("ADMIN_API_KEY", "let-me-in")
    # No Redis in tests: nothing throttled unless a test says so.
    monkeypatch.setattr(redis_cache, "claim_once", lambda name, ttl: True)
    monkeypatch.setattr(redis_cache, "within_limit", lambda name, limit, window: True)
    # An in-memory stand-in for the Redis presence set.
    presence: dict[str, float] = {}
    monkeypatch.setattr(
        redis_cache, "presence_touch", lambda name, member, now, keep: presence.__setitem__(member, now) or True
    )
    monkeypatch.setattr(
        redis_cache, "presence_members", lambda name, since: [m for m, t in presence.items() if t >= since]
    )
    return TestClient(app), Session


def test_register_then_heartbeat_is_one_install(setup):
    client, Session = setup
    body = _report()
    assert client.post("/analytics/install/register", json=body, headers={"CF-IPCountry": "np"}).json() == {
        "ok": True,
        "new": True,
    }
    assert client.post("/analytics/install/heartbeat", json=body).json() == {"ok": True, "new": False}
    with Session() as db:
        rows = db.execute(select(AppInstallation)).scalars().all()
        events = db.execute(select(AppInstallationEvent.event_type)).scalars().all()
    assert len(rows) == 1 and rows[0].country_code == "NP" and rows[0].user_id is None
    assert events == ["first_open"]  # a second report the same day adds nothing


def test_heartbeat_alone_registers(setup):
    client, _ = setup
    assert client.post("/analytics/install/heartbeat", json=_report(platform="android")).json()["new"] is True
    assert client.get("/admin/analytics/installs/overview", headers=ADMIN).json()["android"] == 1


@pytest.mark.parametrize(
    "bad",
    [
        {"installation_id": "not-a-uuid-not-a-uuid-not-a-uuid-123"},
        {"installation_id": str(uuid.uuid1())},
        {"platform": "web"},
        {"app_version": "x" * 33},
    ],
)
def test_rejects_bad_reports(setup, bad):
    client, _ = setup
    assert client.post("/analytics/install/heartbeat", json=_report(**bad)).status_code == 422


def test_throttled_report_writes_nothing(setup, monkeypatch):
    client, Session = setup
    monkeypatch.setattr(redis_cache, "claim_once", lambda name, ttl: False)
    assert client.post("/analytics/install/heartbeat", json=_report()).json() == {"ok": True, "new": False}
    with Session() as db:
        assert db.execute(select(AppInstallation)).first() is None


def test_address_limit(setup, monkeypatch):
    client, _ = setup
    monkeypatch.setattr(redis_cache, "within_limit", lambda name, limit, window: False)
    assert client.post("/analytics/install/heartbeat", json=_report()).status_code == 429


def test_admin_needs_the_key(setup, monkeypatch):
    client, _ = setup
    assert client.get("/admin/analytics/installs/overview").status_code == 401
    denied = client.get("/admin/analytics/installs/overview", headers={"X-Admin-Key": "wrong"})
    assert denied.status_code == 401 and denied.headers["cache-control"] == "no-store"
    ok = client.get("/admin/analytics/installs/overview", headers=ADMIN)
    assert ok.status_code == 200 and ok.headers["cache-control"] == "no-store"
    monkeypatch.delenv("ADMIN_API_KEY")
    assert client.get("/admin/analytics/installs/overview", headers=ADMIN).status_code == 404


def test_events_and_read_outs(setup):
    _, Session = setup
    a, b, c = (str(uuid.uuid4()) for _ in range(3))

    def seen(db, iid, when, platform="ios", version="1.2.2"):
        return install_analytics.record_seen(
            db, installation_id=iid, platform=platform, app_version=version, country_code="NP", now=when
        )["events"]

    with Session() as db:
        assert seen(db, a, NOW - timedelta(days=40)) == ["first_open"]
        assert seen(db, b, NOW - timedelta(days=3), "android") == ["first_open"]
        assert seen(db, b, NOW - timedelta(days=3, hours=-1), "android") == []
        assert seen(db, b, NOW - timedelta(hours=2), "android", "1.2.3") == ["app_update", "app_open"]
        assert seen(db, c, NOW - timedelta(hours=1)) == ["first_open"]

        view = install_analytics.overview(db, NOW)
        assert {k: view[k] for k in ("total_installations", "active_24h", "active_7d", "active_30d")} == {
            "total_installations": 3,
            "active_24h": 2,
            "active_7d": 2,
            "active_30d": 2,
        }
        assert (view["ios"], view["android"], view["new_today"], view["signed_in"]) == (2, 1, 1, 0)

        days = install_analytics.daily(db, 7, NOW)
        assert len(days) == 7 and days[-1] == {
            "date": "2026-11-16",
            "new_installations": 1,
            "active_installations": 2,
            "app_updates": 1,
            "sessions": 0,
        }
        assert days[3]["new_installations"] == 1  # b, three days ago

        split = install_analytics.platforms(db, NOW)
        assert split["platforms"][0] == {"value": "ios", "installations": 2, "active_30d": 1}
        assert {v["value"] for v in split["app_versions"]} == {"1.2.2", "1.2.3"}
        assert split["countries"] == [{"value": "NP", "installations": 3, "active_30d": 2}]


def test_admin_by_signed_in_email(setup, monkeypatch):
    client, Session = setup
    monkeypatch.delenv("ADMIN_API_KEY")
    monkeypatch.setenv("ADMIN_EMAILS", "Boss@Example.com, other@example.com")
    with Session() as db:
        users = {
            "boss": User(email="boss@example.com", password_hash="x", is_verified=True),
            "unverified": User(email="other@example.com", password_hash="x", is_verified=False),
            "guest": User(email="guest@example.com", password_hash="x", is_verified=True),
        }
        db.add_all(users.values())
        db.commit()
        ids = {name: user.id for name, user in users.items()}

    def as_user(name):
        client.app.dependency_overrides[router_module._optional_user_id] = lambda: ids.get(name)
        return client.get("/admin/analytics/installs/overview").status_code

    assert as_user("boss") == 200
    assert as_user("unverified") == 403
    assert as_user("guest") == 403
    assert as_user("nobody") == 401


def test_sessions_live_and_lapsed(setup, monkeypatch):
    client, Session = setup
    ios, android = _report(), _report(platform="android")
    client.post("/analytics/install/register", json={**ios, "session_start": True})
    client.post("/analytics/install/heartbeat", json={**ios, "session_start": True})
    client.post("/analytics/install/heartbeat", json={**ios})  # back without a new session
    client.post("/analytics/install/register", json={**android, "session_start": True})
    assert client.post("/analytics/install/ping", json={"installation_id": ios["installation_id"], "platform": "ios"}).json()["ok"]

    view = client.get("/admin/analytics/installs/overview", headers=ADMIN).json()
    assert view["sessions_today"] == 3 and view["sessions_7d"] == 3
    assert view["sessions_per_active_today"] == 1.5 and view["dau_mau"] == 1.0
    assert view["lapsed_30d"] == 0 and view["new_7d"] == 2
    assert view["retention"]["d1"] == {"rate": None, "retained": 0, "cohort": 0}
    assert client.get("/admin/analytics/installs/daily?days=1", headers=ADMIN).json()["days"][-1]["sessions"] == 3

    live = client.get("/admin/analytics/installs/live", headers=ADMIN).json()
    assert live["online_now"] == {"total": 2, "ios": 1, "android": 1}
    assert live["last_60m"]["total"] == 2

    monkeypatch.setattr(redis_cache, "presence_members", lambda name, since: None)
    assert client.get("/admin/analytics/installs/live", headers=ADMIN).json()["online_now"] is None
    assert client.get("/admin/analytics/installs/live").status_code == 401


def test_retention_and_lapsed(setup):
    _, Session = setup
    with Session() as db:
        kept, gone, old = (str(uuid.uuid4()) for _ in range(3))
        start = NOW - timedelta(days=10)
        for iid in (kept, gone):
            install_analytics.record_seen(db, installation_id=iid, platform="ios", now=start)
        install_analytics.record_seen(db, installation_id=kept, platform="ios", now=start + timedelta(days=1))
        install_analytics.record_seen(db, installation_id=kept, platform="ios", now=start + timedelta(days=7))
        install_analytics.record_seen(db, installation_id=old, platform="android", now=NOW - timedelta(days=45))
        view = install_analytics.overview(db, NOW)
        # The 45-day-old install belongs to the day-1 and day-7 cohorts too, and never came back.
        assert view["retention"]["d1"] == {"rate": 1 / 3, "retained": 1, "cohort": 3}
        assert view["retention"]["d7"] == {"rate": 1 / 3, "retained": 1, "cohort": 3}
        assert view["retention"]["d30"]["cohort"] == 1  # only the 45-day-old install has had 30 days
        assert view["lapsed_30d"] == 1


def test_ping_validation(setup):
    client, _ = setup
    assert client.post("/analytics/install/ping", json={"installation_id": "x" * 36, "platform": "ios"}).status_code == 422
    assert client.post("/analytics/install/ping", json={"installation_id": str(uuid.uuid4()), "platform": "web"}).status_code == 422
