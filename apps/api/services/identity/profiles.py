"""Profile use cases: one function per thing a user can do with their saved profiles.

The rules live in ``engine.identity.profiles``; this module only sequences them
against a ``ProfileRepository``.
"""

from __future__ import annotations

from typing import Any

from engine.identity.profiles import (
    P,
    ProfileRepository,
    is_default_on_create,
    owned,
    takes_over_default,
)


def list_profiles(repo: ProfileRepository[P], owner_id: str) -> list[P]:
    return repo.list_for_owner(owner_id)


def get_profile(repo: ProfileRepository[P], owner_id: str, profile_id: str) -> P:
    return owned(repo.get(profile_id), owner_id)


def create_profile(repo: ProfileRepository[P], owner_id: str, fields: dict[str, Any]) -> P:
    make_default = is_default_on_create(bool(fields.get("is_default")), repo.owner_has_any(owner_id))
    profile = repo.add(owner_id, {**fields, "is_default": make_default})
    if make_default:
        repo.clear_other_defaults(owner_id, keep_id=profile.id)
    repo.commit(refresh=profile)
    return profile


def update_profile(
    repo: ProfileRepository[P], owner_id: str, profile_id: str, changes: dict[str, Any]
) -> P:
    profile = get_profile(repo, owner_id, profile_id)
    for field, value in changes.items():
        setattr(profile, field, value)
    if takes_over_default(changes):
        repo.clear_other_defaults(owner_id, keep_id=profile.id)
    repo.commit(refresh=profile)
    return profile


def delete_profile(repo: ProfileRepository[P], owner_id: str, profile_id: str) -> None:
    profile = get_profile(repo, owner_id, profile_id)
    was_default = profile.is_default
    repo.remove(profile)
    if was_default:
        successor = repo.oldest_for_owner(owner_id)
        if successor is not None:
            successor.is_default = True
    repo.commit()
