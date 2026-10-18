"""/profiles CRUD: owner scoping and the one-default-per-user rule."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, update
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.routers import profiles as profiles_router
from app.security import get_current_user
from database.db import Base, get_db
from database.models import Profile, User

T0 = datetime(2026, 1, 1, tzinfo=timezone.utc)


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
        seed.commit()
        ids = {"alice": alice.id, "bob": bob.id}

    app = FastAPI()
    app.include_router(profiles_router.router)

    def _db():
        with Session() as session:
            yield session

    current = {"user": "alice"}

    def _user():
        with Session() as session:
            return session.get(User, ids[current["user"]])

    def _age(profile_id: str, minutes: int) -> None:
        """created_at has 1 s resolution in SQLite; pin it so ordering is decided."""
        with Session() as session:
            session.execute(
                update(Profile)
                .where(Profile.id == profile_id)
                .values(created_at=T0 + timedelta(minutes=minutes))
            )
            session.commit()

    app.dependency_overrides[get_db] = _db
    app.dependency_overrides[get_current_user] = _user
    test_client = TestClient(app)
    test_client.ids = ids  # type: ignore[attr-defined]
    test_client.act_as = lambda who: current.update(user=who)  # type: ignore[attr-defined]
    test_client.age = _age  # type: ignore[attr-defined]
    return test_client


def _create(client, name: str, **extra) -> dict:
    res = client.post("/profiles", json={"full_name": name, **extra})
    assert res.status_code == 201, res.text
    return res.json()


def _defaults(client) -> list[str]:
    return [p["full_name"] for p in client.get("/profiles").json() if p["is_default"]]


def test_first_profile_becomes_default(client):
    first = _create(client, "Self")
    assert first["is_default"] is True
    second = _create(client, "Mother")
    assert second["is_default"] is False
    assert _defaults(client) == ["Self"]


def test_creating_a_default_clears_the_others(client):
    _create(client, "Self")
    _create(client, "Mother", is_default=True)
    assert _defaults(client) == ["Mother"]


def test_patching_is_default_clears_the_others(client):
    _create(client, "Self")
    mother = _create(client, "Mother")
    res = client.patch(f"/profiles/{mother['id']}", json={"is_default": True})
    assert res.status_code == 200 and res.json()["is_default"] is True
    assert _defaults(client) == ["Mother"]


def test_patch_updates_only_sent_fields(client):
    me = _create(client, "Self", city="Kathmandu", notes="n")
    res = client.patch(f"/profiles/{me['id']}", json={"city": "Pokhara"})
    body = res.json()
    assert (body["city"], body["notes"], body["full_name"]) == ("Pokhara", "n", "Self")


def test_list_puts_the_default_first_then_oldest(client):
    a = _create(client, "A")
    b = _create(client, "B")
    c = _create(client, "C", is_default=True)
    client.age(a["id"], 1)
    client.age(b["id"], 2)
    client.age(c["id"], 3)
    assert [p["full_name"] for p in client.get("/profiles").json()] == ["C", "A", "B"]


def test_deleting_the_default_promotes_the_oldest_remaining(client):
    a = _create(client, "A")
    b = _create(client, "B")
    c = _create(client, "C")
    client.age(a["id"], 1)
    client.age(c["id"], 2)
    client.age(b["id"], 3)
    assert client.delete(f"/profiles/{a['id']}").status_code == 204
    assert _defaults(client) == ["C"]


def test_deleting_the_last_profile_leaves_none(client):
    a = _create(client, "A")
    assert client.delete(f"/profiles/{a['id']}").status_code == 204
    assert client.get("/profiles").json() == []


def test_deleting_a_non_default_keeps_the_default(client):
    _create(client, "A")
    b = _create(client, "B")
    client.delete(f"/profiles/{b['id']}")
    assert _defaults(client) == ["A"]


def test_another_users_profile_is_not_found(client):
    mine = _create(client, "Self")
    client.act_as("bob")
    for method in ("get", "patch", "delete"):
        kwargs = {"json": {"city": "x"}} if method == "patch" else {}
        res = getattr(client, method)(f"/profiles/{mine['id']}", **kwargs)
        assert res.status_code == 404, method
        assert res.json() == {"detail": "Profile not found"}
    assert client.get("/profiles").json() == []
    client.act_as("alice")
    assert client.get(f"/profiles/{mine['id']}").json()["city"] is None


def test_unknown_profile_is_not_found(client):
    assert client.get("/profiles/nope").status_code == 404


def test_users_have_independent_defaults(client):
    _create(client, "Alice self")
    client.act_as("bob")
    bob_self = _create(client, "Bob self")
    assert bob_self["is_default"] is True
    client.act_as("alice")
    assert _defaults(client) == ["Alice self"]
