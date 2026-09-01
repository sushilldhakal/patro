"""Room-size planning tiers for the Vastu house-plan engine.

Source of truth: ``data/vastu_room_sizes.json`` — see that file's own
``_comment`` for how its ``minimum`` tier relates to the placement engine's
previous hardcoded sizes, and how ``comfortable``/``preferred`` are meant to
be used (growth only, never to reject a placement). This is small, static
reference data read once and cached in memory — unlike ``vastu_rules_db.py``
there's no SQLite seed step, just a JSON load.
"""

from __future__ import annotations

import json
import threading
from dataclasses import dataclass
from functools import lru_cache
from typing import Any

from engine.astronomy.paths import vastu_room_sizes_source_path

_lock = threading.Lock()
_cache: dict[str, Any] | None = None


@dataclass(frozen=True)
class SizeXY:
    width: float
    depth: float

    @property
    def area(self) -> float:
        return self.width * self.depth


@dataclass(frozen=True)
class RoomSizeTiers:
    minimum: SizeXY
    comfortable: SizeXY
    preferred: SizeXY


def _load() -> dict[str, Any]:
    global _cache
    if _cache is not None:
        return _cache
    with _lock:
        if _cache is not None:
            return _cache
        path = vastu_room_sizes_source_path()
        if not path.is_file():
            raise FileNotFoundError(f"Vastu room-sizes source missing: {path}. Commit it and redeploy.")
        with open(path, encoding="utf-8") as fh:
            _cache = json.load(fh)
        return _cache


@lru_cache(maxsize=1)
def all_tiers() -> dict[str, RoomSizeTiers]:
    data = _load()
    return {
        kind: RoomSizeTiers(
            minimum=SizeXY(**t["minimum"]),
            comfortable=SizeXY(**t["comfortable"]),
            preferred=SizeXY(**t["preferred"]),
        )
        for kind, t in data["sizes"].items()
    }


def tiers_for(kind: str) -> RoomSizeTiers | None:
    return all_tiers().get(kind)


def rule_version() -> str:
    return str(_load().get("version", "unknown"))
