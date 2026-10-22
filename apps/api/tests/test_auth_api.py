"""/auth: the account flows, pinned at the HTTP boundary.

Written against the router before its rules moved into
``engine.identity.accounts`` / ``services.identity.accounts``, so the move is
checked by behaviour, not by reading the diff. The OAuth verifiers and the
emailer are stubbed; everything else (hashing, tokens, the database) is real.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select, update
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.routers import auth as auth_router
from database.db import Base, get_db
from database.models import EmailToken, RefreshToken, User


@pytest.fixture()
def env(monkeypatch):
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, expire_on_commit=False)

    sent: list[tuple[str, str, str]] = []
    monkeypatch.setattr(auth_router.emailer, "send_verification_email", lambda to, tok: sent.append(("verify", to, tok)))
    monkeypatch.setattr(auth_router.emailer, "send_password_reset_email", lambda to, tok: sent.append(("reset", to, tok)))

    app = FastAPI()
    app.include_router(auth_router.router)

    def _db():
        with Session() as session:
            yield session

    app.dependency_overrides[get_db] = _db
    client = TestClient(app)
    client.Session = Session  # type: ignore[attr-defined]
    client.sent = sent  # type: ignore[attr-defined]
    return client


def _signup(client, email="Alice@Example.com", password="correct horse 1"):
    return client.post("/auth/signup", json={"email": email, "password": password})


def _bearer(pair: dict) -> dict:
    return {"Authorization": f"Bearer {pair['access_token']}"}


def test_signup_issues_tokens_and_a_verification_email(env):
    res = _signup(env)
    assert res.status_code == 201
    pair = res.json()
    assert {"access_token", "refresh_token", "expires_in"} <= pair.keys()
    me = env.get("/auth/me", headers=_bearer(pair)).json()
    assert me["email"] == "alice@example.com" and me["is_verified"] is False
    assert [(k, to) for k, to, _ in env.sent] == [("verify", "alice@example.com")]


def test_signup_twice_is_a_conflict(env):
    _signup(env)
    res = _signup(env, email="ALICE@example.com")
    assert res.status_code == 409 and res.json()["detail"] == "Email already registered"


def test_login_checks_the_password_and_the_account(env):
    _signup(env)
    assert env.post("/auth/login", json={"email": "alice@example.com", "password": "correct horse 1"}).status_code == 200
    bad = env.post("/auth/login", json={"email": "alice@example.com", "password": "wrong password"})
    assert bad.status_code == 401 and bad.json()["detail"] == "Invalid email or password"
    assert env.post("/auth/login", json={"email": "nobody@example.com", "password": "whatever1"}).status_code == 401
    with env.Session() as s:
        s.execute(update(User).values(is_active=False))
        s.commit()
    disabled = env.post("/auth/login", json={"email": "alice@example.com", "password": "correct horse 1"})
    assert disabled.status_code == 403 and disabled.json()["detail"] == "Account disabled"


def _refresh(env, token):
    return env.post("/auth/refresh", json={"refresh_token": token})


def test_refresh_rotates_and_the_old_token_stops_working(env):
    pair = _signup(env).json()
    rotated = _refresh(env, pair["refresh_token"])
    assert rotated.status_code == 200
    assert rotated.json()["refresh_token"] != pair["refresh_token"]
    # Once the new token has been used, the old one is dead.
    assert _refresh(env, rotated.json()["refresh_token"]).status_code == 200
    reused = _refresh(env, pair["refresh_token"])
    assert reused.status_code == 401 and reused.json()["detail"] == "Invalid or expired refresh token"
    assert _refresh(env, "made-up").status_code == 401


def test_a_lost_refresh_response_does_not_sign_the_reader_out(env):
    """The phone sent its token, the server rotated, the reply never arrived."""
    pair = _signup(env).json()
    lost = _refresh(env, pair["refresh_token"]).json()["refresh_token"]
    retried = _refresh(env, pair["refresh_token"])
    assert retried.status_code == 200
    # The reply the phone never saw is retired; the retried one carries on.
    assert _refresh(env, lost).status_code == 401
    assert _refresh(env, retried.json()["refresh_token"]).status_code == 200
    # And the original token cannot be replayed a second time.
    assert _refresh(env, pair["refresh_token"]).status_code == 401


def test_logout_revokes_the_refresh_token(env):
    pair = _signup(env).json()
    assert env.post("/auth/logout", json={"refresh_token": pair["refresh_token"]}).json() == {"message": "Logged out"}
    assert env.post("/auth/refresh", json={"refresh_token": pair["refresh_token"]}).status_code == 401
    # Logging out an unknown token is still a polite success.
    assert env.post("/auth/logout", json={"refresh_token": "made-up"}).status_code == 200


def test_signing_out_after_a_rotation_leaves_no_way_back_in(env):
    pair = _signup(env).json()
    current = _refresh(env, pair["refresh_token"]).json()["refresh_token"]
    env.post("/auth/logout", json={"refresh_token": current})
    assert _refresh(env, pair["refresh_token"]).status_code == 401
    assert _refresh(env, current).status_code == 401


def test_verify_email_once(env):
    pair = _signup(env).json()
    token = env.sent[-1][2]
    assert env.post("/auth/verify-email", json={"token": token}).json() == {"message": "Email verified"}
    assert env.get("/auth/me", headers=_bearer(pair)).json()["is_verified"] is True
    again = env.post("/auth/verify-email", json={"token": token})
    assert again.status_code == 400 and again.json()["detail"] == "Invalid or expired link"


def test_resend_verification(env):
    pair = _signup(env).json()
    assert env.post("/auth/resend-verification", headers=_bearer(pair)).json() == {"message": "Verification email sent"}
    assert len(env.sent) == 2
    env.post("/auth/verify-email", json={"token": env.sent[-1][2]})
    assert env.post("/auth/resend-verification", headers=_bearer(pair)).json() == {"message": "Already verified"}


def test_forgot_and_reset_password(env):
    pair = _signup(env).json()
    message = {"message": "If that email exists, a reset link has been sent"}
    assert env.post("/auth/forgot-password", json={"email": "nobody@example.com"}).json() == message
    assert len(env.sent) == 1  # no mail for an unknown address
    assert env.post("/auth/forgot-password", json={"email": "ALICE@example.com"}).json() == message
    kind, _, token = env.sent[-1]
    assert kind == "reset"

    res = env.post("/auth/reset-password", json={"token": token, "password": "new password 2"})
    assert res.json() == {"message": "Password updated"}
    # Every session ends; the new password works and the old one does not.
    assert env.post("/auth/refresh", json={"refresh_token": pair["refresh_token"]}).status_code == 401
    assert env.post("/auth/login", json={"email": "alice@example.com", "password": "new password 2"}).status_code == 200
    assert env.post("/auth/login", json={"email": "alice@example.com", "password": "correct horse 1"}).status_code == 401
    reused = env.post("/auth/reset-password", json={"token": token, "password": "another pass 3"})
    assert reused.status_code == 400 and reused.json()["detail"] == "Invalid or expired link"


def test_an_expired_reset_link_is_refused(env):
    _signup(env)
    env.post("/auth/forgot-password", json={"email": "alice@example.com"})
    token = env.sent[-1][2]
    with env.Session() as s:
        s.execute(update(EmailToken).values(expires_at=datetime.now(timezone.utc) - timedelta(minutes=1)))
        s.commit()
    res = env.post("/auth/reset-password", json={"token": token, "password": "new password 2"})
    assert res.status_code == 400


def test_delete_me_removes_the_account(env):
    pair = _signup(env).json()
    assert env.delete("/auth/me", headers=_bearer(pair)).json() == {"message": "Account deleted"}
    with env.Session() as s:
        assert s.scalar(select(User)) is None
    assert env.get("/auth/me", headers=_bearer(pair)).status_code == 401


def test_google_and_facebook_find_or_create_a_verified_user(env, monkeypatch):
    _signup(env, email="bob@example.com")
    monkeypatch.setattr(auth_router, "verify_google_id_token", lambda token: {"email": "Bob@Example.com"})
    monkeypatch.setattr(auth_router, "verify_facebook_access_token", lambda token: {"email": "carol@example.com"})

    bob = env.post("/auth/google", json={"id_token": "x" * 20}).json()
    assert env.get("/auth/me", headers=_bearer(bob)).json() == {
        **env.get("/auth/me", headers=_bearer(bob)).json(), "email": "bob@example.com", "is_verified": True,
    }
    carol = env.post("/auth/facebook", json={"access_token": "x" * 20}).json()
    assert env.get("/auth/me", headers=_bearer(carol)).json()["email"] == "carol@example.com"
    with env.Session() as s:
        assert len(list(s.scalars(select(User)))) == 2


def test_oauth_errors_map_to_503_when_unconfigured_and_401_otherwise(env, monkeypatch):
    def unconfigured(token):
        raise auth_router.GoogleAuthError("Google sign-in is not configured")

    def rejected(token):
        raise auth_router.GoogleAuthError("bad token")

    monkeypatch.setattr(auth_router, "verify_google_id_token", unconfigured)
    assert env.post("/auth/google", json={"id_token": "x" * 20}).status_code == 503
    monkeypatch.setattr(auth_router, "verify_google_id_token", rejected)
    assert env.post("/auth/google", json={"id_token": "x" * 20}).status_code == 401


def test_apple_links_by_subject_then_by_email(env, monkeypatch):
    _signup(env, email="dana@example.com")
    monkeypatch.setattr(auth_router, "verify_apple_identity_token", lambda token: {"sub": "apple-1", "email": "Dana@Example.com"})
    first = env.post("/auth/apple", json={"identity_token": "x" * 20}).json()
    # Later Apple tokens may omit the email: the subject alone finds the account.
    monkeypatch.setattr(auth_router, "verify_apple_identity_token", lambda token: {"sub": "apple-1"})
    again = env.post("/auth/apple", json={"identity_token": "x" * 20}).json()
    me1 = env.get("/auth/me", headers=_bearer(first)).json()
    me2 = env.get("/auth/me", headers=_bearer(again)).json()
    assert me1["id"] == me2["id"] and me1["email"] == "dana@example.com"

    # A new subject with no email gets a private relay-style address.
    monkeypatch.setattr(auth_router, "verify_apple_identity_token", lambda token: {"sub": "apple-2"})
    fresh = env.post("/auth/apple", json={"identity_token": "x" * 20}).json()
    assert env.get("/auth/me", headers=_bearer(fresh)).json()["email"] == "apple.apple-2@users.vedicpatro.com"
    with env.Session() as s:
        assert s.scalar(select(User).where(User.apple_user_id == "apple-2")) is not None
        assert len(list(s.scalars(select(RefreshToken)))) >= 3
