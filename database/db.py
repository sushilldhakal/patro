"""Database engine and session management for the auth/profile layer.

Uses synchronous SQLAlchemy 2.0 to match the existing sync FastAPI endpoints.
The engine is created lazily so the panchanga API keeps working even when
DATABASE_URL is unset (auth routes are simply not registered in that case).
"""

from __future__ import annotations

from collections.abc import Iterator
from functools import lru_cache

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

import config


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""


@lru_cache(maxsize=1)
def get_engine() -> Engine:
    url = config.database_url()
    if not url:
        raise RuntimeError("DATABASE_URL is not configured")
    # pool_pre_ping avoids stale connections after the DB restarts.
    return create_engine(url, pool_pre_ping=True, future=True)


@lru_cache(maxsize=1)
def _session_factory() -> sessionmaker[Session]:
    return sessionmaker(bind=get_engine(), autoflush=False, expire_on_commit=False)


def init_db() -> None:
    """Create tables if they don't exist. Safe to call on every startup."""
    # Import models so they register on Base.metadata before create_all.
    from database import models  # noqa: F401

    Base.metadata.create_all(bind=get_engine())


def get_db() -> Iterator[Session]:
    """FastAPI dependency that yields a session and always closes it."""
    session = _session_factory()()
    try:
        yield session
    finally:
        session.close()
