"""Profile use cases against an in-memory ProfileRepository — no database."""

from __future__ import annotations

from dataclasses import dataclass, field
from itertools import count

import pytest

from engine.identity.profiles import ProfileNotFound
from services.identity import profiles as use_cases

_ids = count(1)


@dataclass
class _Profile:
    user_id: str
    full_name: str
    is_default: bool = False
    id: str = field(default_factory=lambda: f"p{next(_ids)}")
    created: int = field(default_factory=lambda: next(_ids))


class _MemoryRepo:
    def __init__(self) -> None:
        self.rows: list[_Profile] = []
        self.commits = 0

    def get(self, profile_id):
        return next((p for p in self.rows if p.id == profile_id), None)

    def list_for_owner(self, owner_id):
        mine = [p for p in self.rows if p.user_id == owner_id]
        return sorted(mine, key=lambda p: (not p.is_default, p.created))

    def owner_has_any(self, owner_id):
        return any(p.user_id == owner_id for p in self.rows)

    def oldest_for_owner(self, owner_id):
        mine = [p for p in self.rows if p.user_id == owner_id]
        return min(mine, key=lambda p: p.created, default=None)

    def add(self, owner_id, fields):
        profile = _Profile(user_id=owner_id, **fields)
        self.rows.append(profile)
        return profile

    def remove(self, profile):
        self.rows.remove(profile)

    def clear_other_defaults(self, owner_id, keep_id):
        for p in self.rows:
            if p.user_id == owner_id and p.id != keep_id:
                p.is_default = False

    def commit(self, refresh=None):
        self.commits += 1


def _defaults(repo, owner="u1"):
    return [p.full_name for p in repo.list_for_owner(owner) if p.is_default]


def test_default_moves_with_create_update_and_delete():
    repo = _MemoryRepo()
    a = use_cases.create_profile(repo, "u1", {"full_name": "A", "is_default": False})
    b = use_cases.create_profile(repo, "u1", {"full_name": "B", "is_default": False})
    assert _defaults(repo) == ["A"]
    use_cases.update_profile(repo, "u1", b.id, {"is_default": True})
    assert _defaults(repo) == ["B"]
    use_cases.delete_profile(repo, "u1", b.id)
    assert _defaults(repo) == ["A"]
    assert repo.commits == 4
    assert a.is_default


def test_another_owner_cannot_reach_a_profile():
    repo = _MemoryRepo()
    a = use_cases.create_profile(repo, "u1", {"full_name": "A", "is_default": False})
    for call in (
        lambda: use_cases.get_profile(repo, "u2", a.id),
        lambda: use_cases.update_profile(repo, "u2", a.id, {"full_name": "x"}),
        lambda: use_cases.delete_profile(repo, "u2", a.id),
    ):
        with pytest.raises(ProfileNotFound):
            call()
    assert a.full_name == "A" and repo.rows == [a]
