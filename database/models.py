"""ORM models for users, sessions/tokens, and saved kundali profiles."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    LargeBinary,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.db import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _as_aware(dt: datetime) -> datetime:
    """Treat a DB value as UTC if it came back naive (e.g. from SQLite)."""
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    profiles: Mapped[list["Profile"]] = relationship(
        back_populates="user", cascade="all, delete-orphan", order_by="Profile.created_at"
    )
    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    email_tokens: Mapped[list["EmailToken"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class RefreshToken(Base):
    """A hashed refresh token. Rotated on each /auth/refresh; revoked on logout."""

    __tablename__ = "refresh_tokens"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user: Mapped[User] = relationship(back_populates="refresh_tokens")

    @property
    def is_valid(self) -> bool:
        if self.revoked_at is not None:
            return False
        return _as_aware(self.expires_at) > _now()


class EmailToken(Base):
    """One-time token for email verification or password reset (hashed at rest)."""

    __tablename__ = "email_tokens"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    kind: Mapped[str] = mapped_column(String(20), nullable=False)  # "verify" | "reset"
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user: Mapped[User] = relationship(back_populates="email_tokens")

    @property
    def is_valid(self) -> bool:
        if self.used_at is not None:
            return False
        return _as_aware(self.expires_at) > _now()


class Profile(Base):
    """A saved person/kundali profile. A user may save several (self + family)."""

    __tablename__ = "profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )

    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    gender: Mapped[str | None] = mapped_column(String(16), nullable=True)

    country: Mapped[str | None] = mapped_column(String(80), nullable=True)
    city: Mapped[str | None] = mapped_column(String(120), nullable=True)
    location_label: Mapped[str | None] = mapped_column(String(200), nullable=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    timezone: Mapped[str | None] = mapped_column(String(64), nullable=True)

    # Birth moment for kundali (stored as ISO strings to stay calendar-agnostic).
    birth_date: Mapped[str | None] = mapped_column(String(32), nullable=True)
    birth_time: Mapped[str | None] = mapped_column(String(16), nullable=True)
    birth_era: Mapped[str | None] = mapped_column(String(4), nullable=True)  # "bs" | "ad"

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=_now, nullable=False
    )

    user: Mapped[User] = relationship(back_populates="profiles")


Index("ix_email_tokens_user_kind", EmailToken.user_id, EmailToken.kind)


class SaitCache(Base):
    """Persisted computed auspicious-date (साइत) / muhūrta listings.

    A whole BS year for a fixed location + category is deterministic given the
    engine version, so the first request computes it once and every later
    request — from any server instance — reads it back. Postgres (shared,
    persistent, concurrent) is used in production; a serverless filesystem
    cache would not survive cold starts or be shared across instances.
    """

    __tablename__ = "sait_cache"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    bs_year: Mapped[int] = mapped_column(Integer, nullable=False)
    category: Mapped[str] = mapped_column(String(48), nullable=False)
    location_key: Mapped[str] = mapped_column(String(80), nullable=False)
    engine_version: Mapped[str] = mapped_column(String(16), nullable=False)
    # Serialized {"months": {...}, "source": "computed", ...} payload.
    payload: Mapped[str] = mapped_column(Text, nullable=False)
    computed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=_now, nullable=False
    )

    __table_args__ = (
        UniqueConstraint(
            "bs_year", "category", "location_key", name="uq_sait_cache_key"
        ),
    )


class BlobCache(Base):
    """Shared key→bytes cache for computed panchāṅga payloads (year / month / day).

    The panchāṅga year, month grid and single-day responses are deterministic
    gzip-JSON blobs keyed by a versioned string (year/month/location/variant).
    On ephemeral hosts a filesystem cache does not survive a cold start, so the
    first request after every restart pays the ~30 s year build. Persisting the
    same blobs here (shared Postgres) lets any instance read them back instantly.
    The versioned key embeds CACHE_PAYLOAD_VERSION, so a payload-shape bump
    orphans stale rows automatically (they are simply never read again).
    """

    __tablename__ = "blob_cache"

    cache_key: Mapped[str] = mapped_column(String(255), primary_key=True)
    data: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=_now, nullable=False
    )
