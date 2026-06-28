"""Authentication endpoints: signup, login, refresh, logout, email verification,
and password reset.

Tokens
------
* access  — short-lived JWT (Authorization: Bearer). Stateless.
* refresh — opaque, high-entropy, stored hashed in `refresh_tokens`. Rotated on
            every refresh and revoked on logout. Works identically for web and
            future mobile clients.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, HTTPException, status
from sqlalchemy import select

from app import config, emailer
from app.models import EmailToken, RefreshToken, User
from app.schemas import (
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    RefreshRequest,
    ResetPasswordRequest,
    SignupRequest,
    TokenPair,
    UserOut,
    VerifyEmailRequest,
)
from app.security import (
    CurrentUser,
    DbSession,
    create_access_token,
    generate_opaque_token,
    hash_password,
    hash_token,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])

VERIFY_TTL = timedelta(hours=24)
RESET_TTL = timedelta(hours=1)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _issue_tokens(db, user: User) -> TokenPair:
    """Create an access JWT and a fresh persisted refresh token."""
    raw_refresh = generate_opaque_token()
    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=hash_token(raw_refresh),
            expires_at=_now() + timedelta(days=config.refresh_token_ttl_days()),
        )
    )
    db.commit()
    return TokenPair(
        access_token=create_access_token(user),
        refresh_token=raw_refresh,
        expires_in=config.access_token_ttl_minutes() * 60,
    )


def _create_email_token(db, user: User, kind: str, ttl: timedelta) -> str:
    raw = generate_opaque_token()
    db.add(
        EmailToken(
            user_id=user.id,
            kind=kind,
            token_hash=hash_token(raw),
            expires_at=_now() + ttl,
        )
    )
    db.commit()
    return raw


# ─── Signup / login ────────────────────────────────────────────────────────────


@router.post("/signup", response_model=TokenPair, status_code=status.HTTP_201_CREATED)
def signup(body: SignupRequest, db: DbSession, background: BackgroundTasks) -> TokenPair:
    email = body.email.lower()
    existing = db.scalar(select(User).where(User.email == email))
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(email=email, password_hash=hash_password(body.password))
    db.add(user)
    db.commit()
    db.refresh(user)

    token = _create_email_token(db, user, "verify", VERIFY_TTL)
    background.add_task(emailer.send_verification_email, user.email, token)

    return _issue_tokens(db, user)


@router.post("/login", response_model=TokenPair)
def login(body: LoginRequest, db: DbSession) -> TokenPair:
    user = db.scalar(select(User).where(User.email == body.email.lower()))
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password"
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")
    return _issue_tokens(db, user)


@router.post("/refresh", response_model=TokenPair)
def refresh(body: RefreshRequest, db: DbSession) -> TokenPair:
    token_hash = hash_token(body.refresh_token)
    stored = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
    if stored is None or not stored.is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token"
        )
    # Rotate: revoke the used token, issue a new pair.
    stored.revoked_at = _now()
    db.commit()
    user = db.get(User, stored.user_id)
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return _issue_tokens(db, user)


@router.post("/logout", response_model=MessageResponse)
def logout(body: RefreshRequest, db: DbSession) -> MessageResponse:
    """Revoke the supplied refresh token. Access tokens expire on their own."""
    stored = db.scalar(
        select(RefreshToken).where(RefreshToken.token_hash == hash_token(body.refresh_token))
    )
    if stored is not None and stored.revoked_at is None:
        stored.revoked_at = _now()
        db.commit()
    return MessageResponse(message="Logged out")


@router.get("/me", response_model=UserOut)
def me(user: CurrentUser) -> User:
    return user


# ─── Email verification ────────────────────────────────────────────────────────


@router.post("/verify-email", response_model=MessageResponse)
def verify_email(body: VerifyEmailRequest, db: DbSession) -> MessageResponse:
    stored = db.scalar(
        select(EmailToken).where(
            EmailToken.token_hash == hash_token(body.token), EmailToken.kind == "verify"
        )
    )
    if stored is None or not stored.is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired link")
    user = db.get(User, stored.user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not found")
    user.is_verified = True
    stored.used_at = _now()
    db.commit()
    return MessageResponse(message="Email verified")


@router.post("/resend-verification", response_model=MessageResponse)
def resend_verification(user: CurrentUser, db: DbSession, background: BackgroundTasks) -> MessageResponse:
    if user.is_verified:
        return MessageResponse(message="Already verified")
    token = _create_email_token(db, user, "verify", VERIFY_TTL)
    background.add_task(emailer.send_verification_email, user.email, token)
    return MessageResponse(message="Verification email sent")


# ─── Password reset ────────────────────────────────────────────────────────────


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(
    body: ForgotPasswordRequest, db: DbSession, background: BackgroundTasks
) -> MessageResponse:
    user = db.scalar(select(User).where(User.email == body.email.lower()))
    # Always return the same response to avoid leaking which emails exist.
    if user is not None and user.is_active:
        token = _create_email_token(db, user, "reset", RESET_TTL)
        background.add_task(emailer.send_password_reset_email, user.email, token)
    return MessageResponse(message="If that email exists, a reset link has been sent")


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(body: ResetPasswordRequest, db: DbSession) -> MessageResponse:
    stored = db.scalar(
        select(EmailToken).where(
            EmailToken.token_hash == hash_token(body.token), EmailToken.kind == "reset"
        )
    )
    if stored is None or not stored.is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired link")
    user = db.get(User, stored.user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not found")

    user.password_hash = hash_password(body.password)
    stored.used_at = _now()
    # Revoke all refresh tokens so existing sessions can't continue after a reset.
    for rt in db.scalars(
        select(RefreshToken).where(
            RefreshToken.user_id == user.id, RefreshToken.revoked_at.is_(None)
        )
    ):
        rt.revoked_at = _now()
    db.commit()
    return MessageResponse(message="Password updated")
