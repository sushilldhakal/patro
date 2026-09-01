"""Placement costs derived from the real, extracted ``vastu_room_index`` —
not a second hardcoded table.

The web client's ``prefs.ts``/``classical.ts`` had a ``SPACE_ZONE_RULES``
table and a hardcoded ``DOOR_PADA`` (always pada 6, or 4 for south) that
predate Phase 1's extraction and were never sourced. Porting them faithfully
would recreate exactly the drifting second rule table Phase 1 exists to
avoid. This module derives the same *shape* of answer (preferred/acceptable/
avoid dir8 zones per subject; a ranked entrance pada per wall) from the
already-extracted, cross-referenced ``data/vastu_room_index.json`` instead —
see ``services/vastu_rules_db.py``.

A subject with no room-index entry gets an all-acceptable result — "no
verified rule available", never an invented default (user's own instruction).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from services import vastu_rules_db as db

from . import spatial

Mode = Literal["strict", "balanced", "flexible"]

_DIR8_ORDER = ("north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest")


def _bearing_of(zone_ref: str) -> float | None:
    granularity, _, zone_id = zone_ref.partition(":")
    if granularity == "dir8":
        d = spatial.DIRECTION8_BY_ID.get(zone_id)
        return d.bearing if d else None
    if granularity == "dir16":
        d = spatial.DIRECTION16_BY_ID.get(zone_id)
        return d.bearing if d else None
    if granularity == "pada32":
        p = spatial.PADA32_BY_ID.get(zone_id)
        return p.bearing if p else None
    # inner4 deliberately excluded — describes a relationship to the shared
    # Brahmasthan, not a placement zone for an outer mandala room.
    return None


def dir8_for_zone_ref(zone_ref: str) -> str | None:
    """Which of the 8 outer mandala octants a finer zone ref falls in, by bearing."""
    bearing = _bearing_of(zone_ref)
    if bearing is None:
        return None
    idx = round(bearing / 45) % 8
    return _DIR8_ORDER[idx]


@dataclass(frozen=True)
class ZoneCosts:
    preferred: frozenset[str]
    acceptable: frozenset[str]
    avoid: frozenset[str]
    has_data: bool


def zone_costs_for_subject(subject: str) -> ZoneCosts:
    mappings = db.get_by_subject(subject)
    if not mappings:
        return ZoneCosts(frozenset(), frozenset(_DIR8_ORDER), frozenset(), has_data=False)

    best: set[str] = set()
    avoid: set[str] = set()
    for m in mappings:
        zone = dir8_for_zone_ref(m["zone"])
        if zone is None:
            continue
        (best if m["polarity"] == "best" else avoid).add(zone)
    avoid -= best  # a best mention anywhere in the octant wins over an avoid mention elsewhere in it
    acceptable = set(_DIR8_ORDER) - best - avoid
    return ZoneCosts(frozenset(best), frozenset(acceptable), frozenset(avoid), has_data=True)


def vastu_cost(subject: str, dir8_zone: str, mode: Mode) -> tuple[float, bool]:
    """(cost, relaxed) — lower is better. Same shape as the old vastuCost(), new source.
    "center" is never assigned to any room (mandala's own geometry, not sourced content)."""
    if dir8_zone == "center":
        return (200.0, True)
    costs = zone_costs_for_subject(subject)
    if dir8_zone in costs.preferred:
        return (0.0, False)
    if dir8_zone in costs.acceptable:
        return (80.0, True) if mode == "strict" else (2.0, False)
    if dir8_zone in costs.avoid:
        return (200.0, True)
    return (80.0, True) if mode == "strict" else (5.0, False)


def allowed_regions(subject: str, mode: Mode) -> list[str]:
    """Strict uses preferred zones only; balanced/flexible may also use acceptable."""
    costs = zone_costs_for_subject(subject)
    zones = list(costs.preferred) if mode == "strict" else [*costs.preferred, *costs.acceptable]
    return [z for z in zones if z != "center"]


def entrance_padas_for_wall(wall: Literal["N", "E", "S", "W"]) -> list[str]:
    """Pada ids on `wall` that main_door's room-index data marks best, ranked
    by pada index (closest to the wall's first corner first) — replaces the
    hardcoded DOOR_PADA table."""
    mappings = db.get_by_subject("main_door")
    candidates: list[tuple[int, str]] = []
    for m in mappings:
        if m["polarity"] != "best":
            continue
        granularity, _, zone_id = m["zone"].partition(":")
        if granularity != "pada32":
            continue
        pada = spatial.PADA32_BY_ID.get(zone_id)
        if pada and pada.wall == wall:
            candidates.append((pada.index, pada.id))
    candidates.sort()
    return [pid for _, pid in candidates]
