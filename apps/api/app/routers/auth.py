"""Authentication endpoints: signup, login, refresh, logout, email verification,
and password reset.

Tokens
------
* access  — short-lived JWT (Authorization: Bearer). Stateless.
* refresh — opaque, high-entropy, stored hashed in `refresh_tokens`. Rotated on
            every refresh and revoked on logout. Works identically for web and
            future mobile clients.

The rules are ``engine.identity.accounts`` and the use cases
``services.identity.accounts``; this router verifies provider tokens, maps
account errors to status codes, and queues the emails a use case asks for.
"""

from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, HTTPException, status

from services.identity import emailer
from services.identity.apple_auth import AppleAuthError, verify_apple_identity_token
from services.identity.facebook_auth import FacebookAuthError, verify_facebook_access_token
from services.identity.google_auth import GoogleAuthError, verify_google_id_token
from app.security import CurrentUser, DbSession
from database.models import User
from database.schemas import (
    AppleAuthRequest,
    FacebookAuthRequest,
    ForgotPasswordRequest,
    GoogleAuthRequest,
    LoginRequest,
    MessageResponse,
    RefreshRequest,
    ResetPasswordRequest,
    SignupRequest,
    TokenPair,
    UserOut,
    VerifyEmailRequest,
)
from engine.identity.accounts import (
    AccountDisabled,
    AccountError,
    EmailAlreadyRegistered,
    InvalidCredentials,
    InvalidLink,
    InvalidSession,
    apple_account_email,
)
from services.identity import accounts
from services.identity.account_store import SqlAccountStore

router = APIRouter(prefix="/auth", tags=["auth"])

_STATUS: dict[type[AccountError], int] = {
    EmailAlreadyRegistered: status.HTTP_409_CONFLICT,
    InvalidCredentials: status.HTTP_401_UNAUTHORIZED,
    AccountDisabled: status.HTTP_403_FORBIDDEN,
    InvalidLink: status.HTTP_400_BAD_REQUEST,
    InvalidSession: status.HTTP_401_UNAUTHORIZED,
}


def _http(exc: AccountError) -> HTTPException:
    return HTTPException(status_code=_STATUS[type(exc)], detail=str(exc))


def _pair(tokens: accounts.IssuedTokens) -> TokenPair:
    return TokenPair(
        access_token=tokens.access_token, refresh_token=tokens.refresh_token, expires_in=tokens.expires_in,
    )


def _provider_error(exc: Exception) -> HTTPException:
    """503 when the provider simply isn't configured, 401 for a bad token."""
    not_configured = "not configured" in str(exc)
    return HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE if not_configured else status.HTTP_401_UNAUTHORIZED,
        detail=str(exc),
    )


# ─── Signup / login ────────────────────────────────────────────────────────────


@router.post("/signup", response_model=TokenPair, status_code=status.HTTP_201_CREATED)
def signup(body: SignupRequest, db: DbSession, background: BackgroundTasks) -> TokenPair:
    try:
        tokens, link = accounts.sign_up(SqlAccountStore(db), body.email, body.password)
    except AccountError as exc:
        raise _http(exc) from None
    background.add_task(emailer.send_verification_email, link.to, link.token)
    return _pair(tokens)


@router.post("/login", response_model=TokenPair)
def login(body: LoginRequest, db: DbSession) -> TokenPair:
    try:
        return _pair(accounts.sign_in(SqlAccountStore(db), body.email, body.password))
    except AccountError as exc:
        raise _http(exc) from None


@router.post("/google", response_model=TokenPair)
def google_auth(body: GoogleAuthRequest, db: DbSession) -> TokenPair:
    """Sign in (or sign up) with a Google ID token from the GIS button."""
    try:
        claims = verify_google_id_token(body.id_token)
    except GoogleAuthError as exc:
        raise _provider_error(exc) from exc
    try:
        return _pair(accounts.sign_in_verified_email(SqlAccountStore(db), claims["email"]))
    except AccountError as exc:
        raise _http(exc) from None


@router.post("/facebook", response_model=TokenPair)
def facebook_auth(body: FacebookAuthRequest, db: DbSession) -> TokenPair:
    """Sign in (or sign up) with a Facebook access token from the JS SDK."""
    try:
        profile = verify_facebook_access_token(body.access_token)
    except FacebookAuthError as exc:
        raise _provider_error(exc) from exc
    try:
        return _pair(accounts.sign_in_verified_email(SqlAccountStore(db), profile["email"]))
    except AccountError as exc:
        raise _http(exc) from None


@router.post("/apple", response_model=TokenPair)
def apple_auth(body: AppleAuthRequest, db: DbSession) -> TokenPair:
    """Sign in (or sign up) with a Sign in with Apple identity token."""
    try:
        claims = verify_apple_identity_token(body.identity_token)
    except AppleAuthError as exc:
        raise _provider_error(exc) from exc
    email = apple_account_email(claims, body.email)
    try:
        return _pair(accounts.sign_in_with_apple(SqlAccountStore(db), str(claims["sub"]), email))
    except AccountError as exc:
        raise _http(exc) from None


@router.post("/refresh", response_model=TokenPair)
def refresh(body: RefreshRequest, db: DbSession) -> TokenPair:
    try:
        return _pair(accounts.refresh_session(SqlAccountStore(db), body.refresh_token))
    except AccountError as exc:
        raise _http(exc) from None


@router.post("/logout", response_model=MessageResponse)
def logout(body: RefreshRequest, db: DbSession) -> MessageResponse:
    """Revoke the supplied refresh token. Access tokens expire on their own."""
    accounts.sign_out(SqlAccountStore(db), body.refresh_token)
    return MessageResponse(message="Logged out")


@router.get("/me", response_model=UserOut)
def me(user: CurrentUser) -> User:
    return user


@router.delete("/me", response_model=MessageResponse)
def delete_me(user: CurrentUser, db: DbSession) -> MessageResponse:
    """Permanently delete the signed-in account and all saved kundali profiles.

    Required by Apple App Store and Google Play for apps that create accounts.
    """
    accounts.delete_account(SqlAccountStore(db), user)
    return MessageResponse(message="Account deleted")


# ─── Email verification ────────────────────────────────────────────────────────


@router.post("/verify-email", response_model=MessageResponse)
def verify_email(body: VerifyEmailRequest, db: DbSession) -> MessageResponse:
    try:
        accounts.verify_email(SqlAccountStore(db), body.token)
    except AccountError as exc:
        raise _http(exc) from None
    return MessageResponse(message="Email verified")


@router.post("/resend-verification", response_model=MessageResponse)
def resend_verification(user: CurrentUser, db: DbSession, background: BackgroundTasks) -> MessageResponse:
    link = accounts.resend_verification(SqlAccountStore(db), user)
    if link is None:
        return MessageResponse(message="Already verified")
    background.add_task(emailer.send_verification_email, link.to, link.token)
    return MessageResponse(message="Verification email sent")


# ─── Password reset ────────────────────────────────────────────────────────────


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(
    body: ForgotPasswordRequest, db: DbSession, background: BackgroundTasks
) -> MessageResponse:
    link = accounts.request_password_reset(SqlAccountStore(db), body.email)
    # Always the same response, so which emails exist does not leak.
    if link is not None:
        background.add_task(emailer.send_password_reset_email, link.to, link.token)
    return MessageResponse(message="If that email exists, a reset link has been sent")


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(body: ResetPasswordRequest, db: DbSession) -> MessageResponse:
    try:
        accounts.reset_password(SqlAccountStore(db), body.token, body.password)
    except AccountError as exc:
        raise _http(exc) from None
    return MessageResponse(message="Password updated")
