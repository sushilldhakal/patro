"""Credentials: password hashes, opaque tokens and JWT access tokens.

Infrastructure for the Identity context — the account use cases and the
request dependency (``app.security``) both use it.
"""

from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
import jwt

import config

ALGORITHM = "HS256"


# ─── Passwords ─────────────────────────────────────────────────────────────────


def hash_password(password: str) -> str:
    # bcrypt truncates at 72 bytes; encode then hash.
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


# ─── Opaque tokens (refresh / email) ───────────────────────────────────────────


def generate_opaque_token() -> str:
    """A high-entropy URL-safe token handed to the client."""
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    """Deterministic SHA-256 used to store refresh/email tokens at rest."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


# ─── JWT access tokens ─────────────────────────────────────────────────────────


def create_access_token(user: Any) -> str:
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": user.id,
        "email": user.email,
        "type": "access",
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=config.access_token_ttl_minutes())).timestamp()),
    }
    return jwt.encode(payload, config.jwt_secret(), algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any]:
    return jwt.decode(token, config.jwt_secret(), algorithms=[ALGORITHM])
