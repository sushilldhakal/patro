"""CRUD for saved kundali profiles. Every route is scoped to the current user."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from database.models import Profile
from database.schemas import ProfileCreate, ProfileOut, ProfileUpdate
from app.security import CurrentUser, DbSession
from engine.identity.profiles import ProfileNotFound
from services.identity import profiles as use_cases
from services.identity.profile_store import SqlProfileRepository

router = APIRouter(prefix="/profiles", tags=["profiles"])


def profile_not_found() -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")


@router.get("", response_model=list[ProfileOut])
def list_profiles(user: CurrentUser, db: DbSession) -> list[Profile]:
    return use_cases.list_profiles(SqlProfileRepository(db), user.id)


@router.post("", response_model=ProfileOut, status_code=status.HTTP_201_CREATED)
def create_profile(body: ProfileCreate, user: CurrentUser, db: DbSession) -> Profile:
    return use_cases.create_profile(SqlProfileRepository(db), user.id, body.model_dump())


@router.get("/{profile_id}", response_model=ProfileOut)
def get_profile(profile_id: str, user: CurrentUser, db: DbSession) -> Profile:
    try:
        return use_cases.get_profile(SqlProfileRepository(db), user.id, profile_id)
    except ProfileNotFound:
        raise profile_not_found() from None


@router.patch("/{profile_id}", response_model=ProfileOut)
def update_profile(
    profile_id: str, body: ProfileUpdate, user: CurrentUser, db: DbSession
) -> Profile:
    try:
        return use_cases.update_profile(
            SqlProfileRepository(db), user.id, profile_id, body.model_dump(exclude_unset=True)
        )
    except ProfileNotFound:
        raise profile_not_found() from None


@router.delete("/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_profile(profile_id: str, user: CurrentUser, db: DbSession) -> None:
    try:
        use_cases.delete_profile(SqlProfileRepository(db), user.id, profile_id)
    except ProfileNotFound:
        raise profile_not_found() from None
