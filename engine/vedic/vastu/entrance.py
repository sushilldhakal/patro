"""Entrance placement, foyer geometry, and small architectural constants.

Ports ``src/lib/house-plan/classical.ts``. The one real change: the source's
``mainDoorPoint()`` picked a hardcoded pada (always 6, or 4 for south) from a
never-sourced ``DOOR_PADA`` table. Here it asks ``zone_rules.
entrance_padas_for_wall()`` for the real, extracted best padas on the facing
wall instead — see zone_rules.py's module docstring for why.
"""

from __future__ import annotations

from dataclasses import dataclass

from . import spatial, zone_rules
from .geometry import Rect, Wall
from .types import CardinalWall

WALL_GAP = 0.076
DOOR_RATIO = 2
ENTRANCE_W = 1.05
RING_W = 0.9
FOYER_W = 1.4

WIN_NE_W = 1.45
WIN_SW_W = 0.75
WIN_NE_SILL = 0.85
WIN_SW_SILL = 1.45
WIN_NE_H = 1.35
WIN_SW_H = 0.7

_FACING_WALL: dict[CardinalWall, str] = {"north": "N", "east": "E", "south": "S", "west": "W"}


@dataclass(frozen=True)
class DoorPoint:
    x: float
    y: float
    t: float
    pada: str | None


def _pada_center_t(pada_index: int) -> float:
    """Position (0-1) of a pada's center along its wall — 8 padas per wall."""
    return (pada_index - 0.5) / 8


def main_door_point(facing: CardinalWall, width: float, height: float) -> DoorPoint:
    """Door center on the facing wall, at the real best-sourced pada — falls
    back to the wall's midpoint only if the room index has no main_door data
    for that wall (never silently invents a pada)."""
    wall = _FACING_WALL[facing]
    candidates = zone_rules.entrance_padas_for_wall(wall)
    if candidates:
        pada = spatial.PADA32_BY_ID[candidates[0]]
        t = _pada_center_t(pada.index)
        pada_id = pada.id
    else:
        t = 0.5
        pada_id = None
    if facing == "east":
        return DoorPoint(width, height * (1 - t), t, pada_id)
    if facing == "west":
        return DoorPoint(0, height * (1 - t), t, pada_id)
    if facing == "north":
        return DoorPoint(width * t, 0, t, pada_id)
    return DoorPoint(width * (1 - t), height, t, pada_id)


def foyer_rect(facing: CardinalWall, width: float, height: float, depth: float) -> Rect:
    door = main_door_point(facing, width, height)
    along = max(FOYER_W, min(width, height) / 9 + 0.85)
    xs = [0, width / 3, 2 * width / 3, width]
    ys = [0, height / 3, 2 * height / 3, height]
    if facing == "west":
        cell = Rect(xs[0], ys[1], xs[1] - xs[0], ys[2] - ys[1])
    elif facing == "east":
        cell = Rect(xs[2], ys[1], xs[3] - xs[2], ys[2] - ys[1])
    elif facing == "north":
        cell = Rect(xs[1], ys[0], xs[2] - xs[1], ys[1] - ys[0])
    else:
        cell = Rect(xs[1], ys[2], xs[2] - xs[1], ys[3] - ys[2])

    if facing in ("east", "west"):
        y = min(cell.y + cell.h - along, max(cell.y, door.y - along / 2))
        if facing == "east":
            return Rect(cell.x + cell.w - min(depth, cell.w * 0.4), y, min(depth, cell.w * 0.4), along)
        return Rect(cell.x, y, min(depth, cell.w * 0.4), along)

    x = min(cell.x + cell.w - along, max(cell.x, door.x - along / 2))
    if facing == "north":
        return Rect(x, cell.y, along, min(depth, cell.h * 0.4))
    return Rect(x, cell.y + cell.h - min(depth, cell.h * 0.4), along, min(depth, cell.h * 0.4))


def door_height(width: float) -> float:
    return width * DOOR_RATIO


def next_legal_count(n: int) -> int:
    """Even count that doesn't end in zero (avoid 10, 20...)."""
    t = max(2, n)
    if t % 2 == 1:
        t += 1
    if t % 10 == 0:
        t += 2
    return t


def is_solar_wall(wall: Wall) -> bool:
    return wall in ("n", "e")


def toilet_forbidden(region: str) -> bool:
    """Center is a structural exclusion (the mandala's own geometry). The
    rest comes from the real avoid-zone data for toilets, not a hardcoded pair."""
    if region == "center":
        return True
    costs = zone_rules.zone_costs_for_subject("toilet")
    return region in costs.avoid
