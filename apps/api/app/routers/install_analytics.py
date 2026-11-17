"""Anonymous install counting (``services.platform.install_analytics``).

Public, called by the mobile app with a random id it generated for itself::

    POST /v1/analytics/install/register    first launch
    POST /v1/analytics/install/heartbeat   every launch / return to the foreground
    POST /v1/analytics/install/ping        every minute while the app is on screen

Both do the same thing — register the install if it is new, otherwise refresh
``last_seen_at`` — so a lost first request is made good by the next one. The
event log (``first_open`` / ``app_open`` / ``app_update``) is derived on the
server; a client cannot write events of its own.

Admin, for ``X-Admin-Key`` (``ADMIN_API_KEY``) or a signed-in account listed in
``ADMIN_EMAILS`` (neither set → 404)::

    GET /v1/admin/analytics/installs/overview
    GET /v1/admin/analytics/installs/daily?days=30
    GET /v1/admin/analytics/installs/platforms
    GET /v1/admin/analytics/installs/live       open right now / last 15 / 60 min
"""

from __future__ import annotations

import hmac
import uuid
from typing import Annotated, Literal

import jwt
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, Response, status
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, field_validator

import config
from app.security import DbSession, _bearer, decode_access_token
from database.models import User
from services.platform import install_analytics, redis_cache

router = APIRouter(tags=["analytics"])

# One install reports at most this often; more is answered without touching the database.
_REPORT_EVERY_S = 60
# New and repeat reports from one address, per hour. A household behind one address is far below it.
_PER_ADDRESS_PER_HOUR = 120
# Live pings (one a minute per open app) touch only Redis, so the per-address allowance is larger.
_PINGS_PER_ADDRESS_PER_HOUR = 600
_PING_EVERY_S = 30


class InstallReport(BaseModel):
    installation_id: str = Field(..., min_length=36, max_length=36)
    platform: Literal["ios", "android"]
    app_version: str | None = Field(None, max_length=32)
    os_version: str | None = Field(None, max_length=32)
    # True when the app was just opened (cold start, or back after a while in the background).
    session_start: bool = False

    @field_validator("installation_id")
    @classmethod
    def _random_uuid(cls, value: str) -> str:
        return _uuid4(value)


class PresencePing(BaseModel):
    installation_id: str = Field(..., min_length=36, max_length=36)
    platform: Literal["ios", "android"]

    @field_validator("installation_id")
    @classmethod
    def _random_uuid(cls, value: str) -> str:
        return _uuid4(value)


def _uuid4(value: str) -> str:
    try:
        parsed = uuid.UUID(value)
    except ValueError as exc:
        raise ValueError("installation_id must be a UUID") from exc
    if parsed.version != 4:
        raise ValueError("installation_id must be a random (version 4) UUID")
    return str(parsed)


class InstallAck(BaseModel):
    ok: bool = True
    new: bool = False


def _address(request: Request) -> str:
    return (
        request.headers.get("cf-connecting-ip")
        or (request.headers.get("x-forwarded-for") or "").split(",")[0].strip()
        or (request.client.host if request.client else "unknown")
    )


def _optional_user_id(creds: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)]) -> str | None:
    """The signed-in account's id when a valid access token came with the report, else None."""
    if creds is None:
        return None
    try:
        payload = decode_access_token(creds.credentials)
        return payload["sub"] if payload.get("type") == "access" else None
    except (jwt.PyJWTError, KeyError, ValueError):
        return None


def _report(body: InstallReport, request: Request, db, user_id: str | None) -> InstallAck:
    # The address is used for this count only and is never stored.
    if not redis_cache.within_limit(f"install:{_address(request)}", _PER_ADDRESS_PER_HOUR, 3600):
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many requests")
    install_analytics.record_presence(body.installation_id, body.platform)
    # Counted before the repeat filter below: a quick background-and-back is still an open.
    if body.session_start and redis_cache.claim_once(f"install-session:{body.installation_id}", _REPORT_EVERY_S):
        install_analytics.record_session(db, body.platform)
    if not redis_cache.claim_once(f"install-seen:{body.installation_id}", _REPORT_EVERY_S):
        return InstallAck()
    result = install_analytics.record_seen(
        db,
        installation_id=body.installation_id,
        platform=body.platform,
        app_version=body.app_version,
        os_version=body.os_version,
        country_code=request.headers.get("cf-ipcountry"),
        user_id=user_id,
    )
    return InstallAck(new=result["new"])


UserId = Annotated[str | None, Depends(_optional_user_id)]


@router.post("/analytics/install/register", response_model=InstallAck)
def register_install(body: InstallReport, request: Request, db: DbSession, user_id: UserId):
    return _report(body, request, db, user_id)


@router.post("/analytics/install/heartbeat", response_model=InstallAck)
def install_heartbeat(body: InstallReport, request: Request, db: DbSession, user_id: UserId):
    return _report(body, request, db, user_id)


@router.post("/analytics/install/ping", response_model=InstallAck)
def install_ping(body: PresencePing, request: Request):
    """The app is on screen: counted in the live numbers for a couple of minutes. Nothing is stored."""
    if not redis_cache.within_limit(f"install-ping:{_address(request)}", _PINGS_PER_ADDRESS_PER_HOUR, 3600):
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many requests")
    if redis_cache.claim_once(f"install-ping:{body.installation_id}", _PING_EVERY_S):
        install_analytics.record_presence(body.installation_id, body.platform)
    return InstallAck()


def _admin(
    response: Response,
    db: DbSession,
    user_id: Annotated[str | None, Depends(_optional_user_id)],
    x_admin_key: Annotated[str | None, Header()] = None,
) -> None:
    """Let in the admin key, or a signed-in, verified account whose address is in ``ADMIN_EMAILS``."""
    key = config.admin_api_key()
    emails = config.admin_emails()
    if key is None and not emails:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
    # Never held by the browser, the CDN or the response cache.
    response.headers["Cache-Control"] = "no-store"
    if key and x_admin_key and hmac.compare_digest(x_admin_key.encode(), key.encode()):
        return
    user = db.get(User, user_id) if user_id else None
    if user is None or not user.is_active:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, "Not authenticated", headers={"Cache-Control": "no-store"}
        )
    if not user.is_verified or user.email.lower() not in emails:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not an admin", headers={"Cache-Control": "no-store"})


_admin_router = APIRouter(prefix="/admin/analytics/installs", dependencies=[Depends(_admin)])


@_admin_router.get("/overview")
def installs_overview(db: DbSession):
    return install_analytics.overview(db)


@_admin_router.get("/daily")
def installs_daily(db: DbSession, days: int = Query(30, ge=1, le=366)):
    return {"days": install_analytics.daily(db, days)}


@_admin_router.get("/platforms")
def installs_platforms(db: DbSession):
    return install_analytics.platforms(db)


@_admin_router.get("/live")
def installs_live():
    return install_analytics.live()


router.include_router(_admin_router)
