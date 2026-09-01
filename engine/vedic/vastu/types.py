"""Mutable runtime types for the placement/building pipeline.

Ports ``src/lib/house-plan/types.ts``. ``PlannedRoom``/``PlannedDoor`` are
plain mutable dataclasses (not frozen) because the algorithm reassigns
``room.rect`` wholesale during carving — matching the TS objects' own
mutability, not accidental. ``eq=False`` on the mutable types keeps equality
at identity (matches JS reference semantics — `.indexOf`, `Set` membership,
etc. throughout the source all compare by reference, never by value).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

from .geometry import Rect, Wall

Life = Literal["public", "semi", "private", "service", "vertical", "outdoor", "circulation"]
CardinalWall = Literal["north", "east", "south", "west"]


@dataclass(eq=False)
class PlannedDoor:
    id: str
    room_id: str
    wall: Wall
    t: float  # 0-1 along the wall from north/west
    width: float
    swing: Literal["in_left", "in_right"]
    connects_to: str


@dataclass(eq=False)
class PlannedWindow:
    id: str
    room_id: str
    wall: Wall
    t: float
    width: float
    type: Literal["full", "high", "vent"]


@dataclass(eq=False)
class PlannedRoom:
    id: str
    kind: str  # a SpaceKind or CircKind ("hall"/"foyer"/"landing"/"brahmasthan"/"verandah")
    floor: int
    rect: Rect
    life: Life
    vastu_region: str  # a dir8 id, or "center"
    index: int | None = None
    doors: list[PlannedDoor] = field(default_factory=list)
    windows: list[PlannedWindow] = field(default_factory=list)
    adjacent_to: list[str] = field(default_factory=list)


@dataclass(eq=False)
class StairShaft:
    id: str
    rect: Rect
    rise: Wall
    floors: list[int]
    host_id: str | None = None


@dataclass(eq=False)
class PlanConflict:
    id: str
    severity: Literal["info", "warn"]
    message_key: str


@dataclass(eq=False)
class ValidationReport:
    all_reachable: bool
    every_room_has_door: bool
    stair_connects: bool
    kitchen_near_dining: bool
    private_through_private: bool
    issues: list[PlanConflict] = field(default_factory=list)


@dataclass(eq=False)
class BVertex:
    id: str
    x: float
    y: float


@dataclass(eq=False)
class BWall:
    id: str
    a: str
    b: str
    thickness: float
    role: Literal["exterior", "interior"]


@dataclass(eq=False)
class BHole:
    id: str
    wall_id: str
    offset: float  # 0-1 along a->b, center of the opening
    width: float
    type: Literal["door", "window", "entrance"]
    swing: Literal["left", "right"]
    from_: str
    to: str
    height: float | None = None
    sill: float | None = None


@dataclass(eq=False)
class BuildingLayer:
    vertices: list[BVertex] = field(default_factory=list)
    walls: list[BWall] = field(default_factory=list)
    holes: list[BHole] = field(default_factory=list)


@dataclass(eq=False)
class FloorConcept:
    storey: int
    rooms: list[PlannedRoom]
    layer: BuildingLayer


@dataclass(eq=False)
class HouseConcept:
    width: float
    height: float
    facing: CardinalWall
    mode: str
    floors: list[FloorConcept]
    leftover: list  # list[PlannedSpace] that couldn't be placed
    stair: StairShaft | None
    validation: ValidationReport
    vastu_relaxed: list[PlanConflict]


@dataclass(frozen=True)
class SiteInput:
    width: float
    height: float
    facing: CardinalWall
