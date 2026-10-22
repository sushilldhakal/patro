"""Accounts — who may sign in, and the one-time links and sessions they hold.

An account is found by its email (stored lower-case) or, for Sign in with
Apple, by Apple's stable subject. A provider that has verified the email
(Google, Facebook, Apple) may create the account or claim an unverified one.
A disabled account never gets a session. Sessions are refresh tokens: each is
used once (rotated on refresh) and all of them end when the password is reset.
Email links (verify, reset) are single-use and expire.

The rules here know nothing of HTTP or SQL: errors are domain errors the
router maps to status codes, and storage is the :class:`AccountStore` port.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Protocol

VERIFY_TTL = timedelta(hours=24)
RESET_TTL = timedelta(hours=1)


class AccountError(Exception):
    """A request the account rules refuse; ``str()`` is the message shown."""


class EmailAlreadyRegistered(AccountError):
    def __init__(self) -> None:
        super().__init__("Email already registered")


class InvalidCredentials(AccountError):
    def __init__(self) -> None:
        super().__init__("Invalid email or password")


class AccountDisabled(AccountError):
    def __init__(self) -> None:
        super().__init__("Account disabled")


class InvalidLink(AccountError):
    """An email link that is unknown, used, expired — or whose account is gone."""

    def __init__(self, message: str = "Invalid or expired link") -> None:
        super().__init__(message)


class InvalidSession(AccountError):
    """A refresh token that is unknown, rotated, revoked or expired."""

    def __init__(self, message: str = "Invalid or expired refresh token") -> None:
        super().__init__(message)


class Account(Protocol):
    id: str
    email: str
    password_hash: str
    is_active: bool
    is_verified: bool
    apple_user_id: str | None


class OneTimeToken(Protocol):
    id: str
    user_id: str
    revoked_at: Any
    used_at: Any
    replaced_by_id: str | None

    @property
    def is_valid(self) -> bool: ...


class AccountStore(Protocol):
    """Where accounts, sessions and email links are kept. Writes are staged until ``commit``."""

    def by_email(self, email: str) -> Account | None: ...

    def by_apple_subject(self, subject: str) -> Account | None: ...

    def get(self, account_id: str) -> Account | None: ...

    def add_account(self, *, email: str, password_hash: str, is_verified: bool = False,
                    apple_user_id: str | None = None) -> Account: ...

    def remove_account(self, account: Account) -> None: ...

    def add_session(self, account_id: str, token_hash: str, expires_at: datetime) -> OneTimeToken: ...

    def session_by_id(self, session_id: str) -> OneTimeToken | None: ...

    def session(self, token_hash: str) -> OneTimeToken | None: ...

    def live_sessions(self, account_id: str) -> list[OneTimeToken]: ...

    def add_email_link(self, account_id: str, kind: str, token_hash: str, expires_at: datetime) -> None: ...

    def email_link(self, token_hash: str, kind: str) -> OneTimeToken | None: ...

    def commit(self, refresh: Account | None = None) -> None: ...


def normalize_email(email: str) -> str:
    return email.lower()


def apple_account_email(claims: dict[str, Any], fallback: str | None) -> str:
    """The email Apple vouched for, the one the client sent, or a private
    address derived from Apple's subject — Apple shares the email only once."""
    email = claims.get("email") or fallback
    if isinstance(email, str) and email.strip():
        return email.strip().lower()
    return f"apple.{claims['sub']}@users.vedicpatro.com"


def require_active(account: Account) -> Account:
    if not account.is_active:
        raise AccountDisabled
    return account
