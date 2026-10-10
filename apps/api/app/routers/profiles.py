"""CRUD for saved kundali profiles. Every route is scoped to the current user."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select, update

from database.models import Profile
from database.schemas import ProfileCreate, ProfileOut, ProfileUpdate
from app.security import CurrentUser, DbSession

router = APIRouter(prefix="/profiles", tags=["profiles"])


def _clear_other_defaults(db, user_id: str, keep_id: str | None) -> None:
    stmt = update(Profile).where(Profile.user_id == user_id, Profile.is_default.is_(True))
    if keep_id is not None:
        stmt = stmt.where(Profile.id != keep_id)
    db.execute(stmt.values(is_default=False))


def _get_owned(db, user: CurrentUser, profile_id: str) -> Profile:
    profile = db.get(Profile, profile_id)
    if profile is None or profile.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    return profile


@router.get("", response_model=list[ProfileOut])
def list_profiles(user: CurrentUser, db: DbSession) -> list[Profile]:
    return list(
        db.scalars(
            select(Profile)
            .where(Profile.user_id == user.id)
            .order_by(Profile.is_default.desc(), Profile.created_at)
        )
    )


@router.post("", response_model=ProfileOut, status_code=status.HTTP_201_CREATED)
def create_profile(body: ProfileCreate, user: CurrentUser, db: DbSession) -> Profile:
    # First profile becomes the default automatically.
    has_any = db.scalar(select(Profile.id).where(Profile.user_id == user.id).limit(1))
    make_default = body.is_default or has_any is None

    profile = Profile(user_id=user.id, **body.model_dump())
    profile.is_default = make_default
    db.add(profile)
    db.flush()
    if make_default:
        _clear_other_defaults(db, user.id, keep_id=profile.id)
    db.commit()
    db.refresh(profile)
    return profile


@router.get("/{profile_id}", response_model=ProfileOut)
def get_profile(profile_id: str, user: CurrentUser, db: DbSession) -> Profile:
    return _get_owned(db, user, profile_id)


@router.patch("/{profile_id}", response_model=ProfileOut)
def update_profile(
    profile_id: str, body: ProfileUpdate, user: CurrentUser, db: DbSession
) -> Profile:
    profile = _get_owned(db, user, profile_id)
    data = body.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(profile, field, value)
    if data.get("is_default"):
        _clear_other_defaults(db, user.id, keep_id=profile.id)
    db.commit()
    db.refresh(profile)
    return profile


@router.delete("/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_profile(profile_id: str, user: CurrentUser, db: DbSession) -> None:
    profile = _get_owned(db, user, profile_id)
    was_default = profile.is_default
    db.delete(profile)
    db.flush()
    if was_default:
        # Promote the oldest remaining profile to default.
        next_default = db.scalar(
            select(Profile).where(Profile.user_id == user.id).order_by(Profile.created_at).limit(1)
        )
        if next_default is not None:
            next_default.is_default = True
    db.commit()
