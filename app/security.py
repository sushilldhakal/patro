"""Password hashing, JWT issuance, and the authenticated-user dependency."""

from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Annotated, Any

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app import config
from app.db import get_db
from app.models import User

ALGORITHM = "HS256"
_bearer = HTTPBearer(auto_error=False)


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


def create_access_token(user: User) -> str:
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


# ─── Dependencies ──────────────────────────────────────────────────────────────


def get_current_user(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    if creds is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = decode_access_token(creds.credentials)
        if payload.get("type") != "access":
            raise ValueError("wrong token type")
        user_id = payload["sub"]
    except (jwt.PyJWTError, KeyError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
DbSession = Annotated[Session, Depends(get_db)]
