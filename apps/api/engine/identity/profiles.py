"""Saved birth profiles — the rules, and the store they need.

All of one user's profiles form one consistency boundary. While any exist,
exactly one is the default: the first one saved becomes it, a profile saved or
edited as the default takes it over, and deleting the default hands it to the
oldest one left. A profile is visible only to its owner; to anyone else it does
not exist, which is why a foreign id and an unknown id fail the same way.
"""

from __future__ import annotations

from typing import Any, Protocol, TypeVar


class ProfileNotFound(LookupError):
    """No profile with that id belongs to this user."""


class SavedProfile(Protocol):
    id: str
    user_id: str
    is_default: bool


P = TypeVar("P", bound=SavedProfile)


class ProfileRepository(Protocol[P]):
    """Where one user's profiles are kept. Writes are staged until ``commit``."""

    def get(self, profile_id: str) -> P | None: ...

    def list_for_owner(self, owner_id: str) -> list[P]:
        """The default first, then oldest first."""
        ...

    def owner_has_any(self, owner_id: str) -> bool: ...

    def oldest_for_owner(self, owner_id: str) -> P | None: ...

    def add(self, owner_id: str, fields: dict[str, Any]) -> P:
        """Stage a new profile; its ``id`` is assigned on return."""
        ...

    def remove(self, profile: P) -> None: ...

    def clear_other_defaults(self, owner_id: str, keep_id: str) -> None: ...

    def commit(self, refresh: P | None = None) -> None: ...


def owned(profile: P | None, owner_id: str) -> P:
    if profile is None or profile.user_id != owner_id:
        raise ProfileNotFound
    return profile


def is_default_on_create(requested: bool, owner_has_profiles: bool) -> bool:
    """The first profile a user saves is their default whether they asked or not."""
    return requested or not owner_has_profiles


def takes_over_default(changes: dict[str, Any]) -> bool:
    return bool(changes.get("is_default"))
