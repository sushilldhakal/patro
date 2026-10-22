"""Account use cases: one function per thing a person can do with their account.

The rules live in ``engine.identity.accounts``; this module sequences them
against an ``AccountStore`` and the credential primitives. It sends no email:
a use case that creates a link returns it, and the router queues the message.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

import config
from engine.identity.accounts import (
    RESET_TTL,
    VERIFY_TTL,
    Account,
    AccountStore,
    EmailAlreadyRegistered,
    InvalidCredentials,
    InvalidLink,
    InvalidSession,
    normalize_email,
    require_active,
)
from services.identity.credentials import (
    create_access_token,
    generate_opaque_token,
    hash_password,
    hash_token,
    verify_password,
)


@dataclass(frozen=True)
class IssuedTokens:
    access_token: str
    refresh_token: str
    expires_in: int


@dataclass(frozen=True)
class EmailLink:
    """A link to mail: the recipient and the raw (unhashed) token."""

    to: str
    token: str


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _start_session(store: AccountStore, account: Account, rotated_from=None) -> IssuedTokens:
    """An access JWT and a fresh persisted refresh token (linked from the one it replaces)."""
    raw_refresh = generate_opaque_token()
    created = store.add_session(account.id, hash_token(raw_refresh), _now() + timedelta(days=config.refresh_token_ttl_days()))
    if rotated_from is not None:
        rotated_from.replaced_by_id = created.id
    store.commit()
    return IssuedTokens(
        access_token=create_access_token(account),
        refresh_token=raw_refresh,
        expires_in=config.access_token_ttl_minutes() * 60,
    )


def _new_link(store: AccountStore, account: Account, kind: str, ttl: timedelta) -> EmailLink:
    raw = generate_opaque_token()
    store.add_email_link(account.id, kind, hash_token(raw), _now() + ttl)
    store.commit()
    return EmailLink(to=account.email, token=raw)


# ─── Signup / sign-in ─────────────────────────────────────────────────────────


def sign_up(store: AccountStore, email: str, password: str) -> tuple[IssuedTokens, EmailLink]:
    """A new account, signed in, with the verification link to mail."""
    email = normalize_email(email)
    if store.by_email(email) is not None:
        raise EmailAlreadyRegistered
    account = store.add_account(email=email, password_hash=hash_password(password))
    store.commit(refresh=account)
    link = _new_link(store, account, "verify", VERIFY_TTL)
    return _start_session(store, account), link


def sign_in(store: AccountStore, email: str, password: str) -> IssuedTokens:
    account = store.by_email(normalize_email(email))
    if account is None or not verify_password(password, account.password_hash):
        raise InvalidCredentials
    return _start_session(store, require_active(account))


def sign_in_verified_email(store: AccountStore, email: str) -> IssuedTokens:
    """Google / Facebook: the provider vouched for the email, so the account is
    created verified, or an existing one becomes verified."""
    email = normalize_email(email)
    account = store.by_email(email)
    if account is None:
        account = store.add_account(email=email, password_hash=hash_password(generate_opaque_token()), is_verified=True)
        store.commit(refresh=account)
    elif not account.is_verified:
        account.is_verified = True
        store.commit()
    return _start_session(store, require_active(account))


def sign_in_with_apple(store: AccountStore, subject: str, email: str) -> IssuedTokens:
    """Apple: the subject is the identity; the email links a pre-existing account once."""
    account = store.by_apple_subject(subject)
    if account is None:
        account = store.by_email(email)
        if account is None:
            account = store.add_account(
                email=email,
                password_hash=hash_password(generate_opaque_token()),
                is_verified=True,
                apple_user_id=subject,
            )
            store.commit(refresh=account)
        else:
            account.apple_user_id = subject
            account.is_verified = True
            store.commit()
    elif not account.is_verified:
        account.is_verified = True
        store.commit()
    return _start_session(store, require_active(account))


# ─── Sessions ──────────────────────────────────────────────────────────────────


def _as_aware(value: datetime) -> datetime:
    """SQLite hands back naive datetimes; they were stored as UTC."""
    return value if value.tzinfo is not None else value.replace(tzinfo=timezone.utc)


def _lost_rotation_successor(store: AccountStore, stored):
    """The token ``stored`` was rotated into, when the client never received it.

    A phone can lose the /auth/refresh response (suspended, offline) after the
    server rotated: it still holds the old token, and rejecting it would sign the
    reader out for nothing. The old token is accepted again only while its
    successor has never been used — once the client refreshes with the new
    token, or signs out, the old one is dead for good.
    """
    if stored.replaced_by_id is None or _as_aware(stored.expires_at) <= _now():
        return None
    successor = store.session_by_id(stored.replaced_by_id)
    if successor is None or not successor.is_valid or successor.replaced_by_id is not None:
        return None
    return successor


def refresh_session(store: AccountStore, raw_refresh: str) -> IssuedTokens:
    """Rotate: the used refresh token is revoked and a new pair issued."""
    stored = store.session(hash_token(raw_refresh))
    if stored is None:
        raise InvalidSession
    if stored.is_valid:
        stored.revoked_at = _now()
    else:
        successor = _lost_rotation_successor(store, stored)
        if successor is None:
            raise InvalidSession
        # The reply the client never got is retired for good (no link onward);
        # the old token now points at the fresh pair instead.
        successor.revoked_at = _now()
    store.commit()
    account = store.get(stored.user_id)
    if account is None or not account.is_active:
        raise InvalidSession("User not found")
    return _start_session(store, account, stored)


def sign_out(store: AccountStore, raw_refresh: str) -> None:
    """Revoke the refresh token if it is live; an unknown one is not an error."""
    stored = store.session(hash_token(raw_refresh))
    if stored is not None and stored.revoked_at is None:
        stored.revoked_at = _now()
        store.commit()


def delete_account(store: AccountStore, account: Account) -> None:
    store.remove_account(account)
    store.commit()


# ─── Email links ───────────────────────────────────────────────────────────────


def _redeem(store: AccountStore, raw: str, kind: str):
    stored = store.email_link(hash_token(raw), kind)
    if stored is None or not stored.is_valid:
        raise InvalidLink
    account = store.get(stored.user_id)
    if account is None:
        raise InvalidLink("User not found")
    return stored, account


def verify_email(store: AccountStore, raw: str) -> None:
    stored, account = _redeem(store, raw, "verify")
    account.is_verified = True
    stored.used_at = _now()
    store.commit()


def resend_verification(store: AccountStore, account: Account) -> EmailLink | None:
    """A fresh verification link, or ``None`` when the email is already verified."""
    if account.is_verified:
        return None
    return _new_link(store, account, "verify", VERIFY_TTL)


def request_password_reset(store: AccountStore, email: str) -> EmailLink | None:
    """A reset link for an active account; ``None`` otherwise — the caller
    answers the same either way, so which emails exist does not leak."""
    account = store.by_email(normalize_email(email))
    if account is None or not account.is_active:
        return None
    return _new_link(store, account, "reset", RESET_TTL)


def reset_password(store: AccountStore, raw: str, new_password: str) -> None:
    """Set the new password and end every session the account had."""
    stored, account = _redeem(store, raw, "reset")
    account.password_hash = hash_password(new_password)
    stored.used_at = _now()
    for session in store.live_sessions(account.id):
        session.revoked_at = _now()
    store.commit()
