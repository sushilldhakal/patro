"""SQLAlchemy store for saved profiles (implements engine.identity.profiles.ProfileRepository)."""

from __future__ import annotations

from typing import Any

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from database.models import Profile


class SqlProfileRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def get(self, profile_id: str) -> Profile | None:
        return self._db.get(Profile, profile_id)

    def list_for_owner(self, owner_id: str) -> list[Profile]:
        return list(
            self._db.scalars(
                select(Profile)
                .where(Profile.user_id == owner_id)
                .order_by(Profile.is_default.desc(), Profile.created_at)
            )
        )

    def owner_has_any(self, owner_id: str) -> bool:
        return self._db.scalar(select(Profile.id).where(Profile.user_id == owner_id).limit(1)) is not None

    def oldest_for_owner(self, owner_id: str) -> Profile | None:
        return self._db.scalar(
            select(Profile).where(Profile.user_id == owner_id).order_by(Profile.created_at).limit(1)
        )

    def add(self, owner_id: str, fields: dict[str, Any]) -> Profile:
        profile = Profile(user_id=owner_id, **fields)
        self._db.add(profile)
        self._db.flush()
        return profile

    def remove(self, profile: Profile) -> None:
        self._db.delete(profile)
        self._db.flush()

    def clear_other_defaults(self, owner_id: str, keep_id: str) -> None:
        self._db.execute(
            update(Profile)
            .where(Profile.user_id == owner_id, Profile.is_default.is_(True), Profile.id != keep_id)
            .values(is_default=False)
        )

    def commit(self, refresh: Profile | None = None) -> None:
        self._db.commit()
        if refresh is not None:
            self._db.refresh(refresh)
