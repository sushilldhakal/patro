"""Pydantic request/response models for the Vastu house-planning API."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class BilingualText(BaseModel):
    ne: str
    en: str


class MatchedPhrase(BaseModel):
    en: str
    ne: str | None = None


# ── Zones ────────────────────────────────────────────────────────────────

class VastuZoneOut(BaseModel):
    zoneRef: str
    granularity: Literal["dir8", "dir16", "pada32", "inner4"]
    id: str
    name: BilingualText | None = None
    deity: BilingualText | None = None
    importance: BilingualText | None = None
    best: BilingualText
    avoid: BilingualText
    sources: list[str]
    verificationStatus: str


# ── Room mappings (detailed / audit form) ───────────────────────────────────

class VastuRoomMappingOut(BaseModel):
    subject: str
    subjectType: Literal["room", "opening", "feature"]
    zone: str
    polarity: Literal["best", "avoid"]
    matchedPhrase: MatchedPhrase
    zoneNote: str | None = None


# ── Canonical consumer-facing shape (confirmed with the product owner) ─────

class RoomZonesOut(BaseModel):
    subject: str
    best_zones: list[str]
    avoid_zones: list[str]


class VastuRoomsResponse(BaseModel):
    rule_version: str
    rooms: list[RoomZonesOut]


# ── Requirement input (Phase 1: validated + zones reported, not placed) ────

class SiteInput(BaseModel):
    plot_width: float = Field(gt=0)
    plot_depth: float = Field(gt=0)
    unit: Literal["m", "ft"] = "ft"
    # Which wall the entrance sits on — drives the whole mandala orientation
    # (layout.SiteInput.facing). Separate from north_bearing (true-north
    # rotation, for a future phase) and entrance_preference (a finer future
    # within-wall preference, not yet read by the placement engine).
    facing: Literal["north", "east", "south", "west"] = "east"
    north_bearing: float = Field(default=0.0, ge=0, lt=360)
    entrance_preference: str | None = None
    floors: int = Field(default=1, ge=1, le=3)


class RoomRequirementInput(BaseModel):
    subject: str
    count: int = Field(default=1, ge=1, le=5)


class HouseRequirementInput(BaseModel):
    bedrooms: int = Field(default=3, ge=1, le=5)
    master_bedroom_index: int = Field(default=1, ge=1, le=5)
    toilets: int = Field(default=1, ge=1, le=5)
    bathrooms: int = Field(default=0, ge=0, le=5)
    combined_toilet_bath: int = Field(default=0, ge=0, le=5)
    extras: list[str] = Field(default_factory=lambda: ["living", "kitchen", "dining", "puja"])
    mode: Literal["strict", "balanced", "flexible"] = "flexible"
    storeys: int = Field(default=1, ge=1, le=3)
    floors: dict[str, Literal["ground", "first", "third", "any"]] = Field(default_factory=dict)


class VastuAnalyzeRequest(BaseModel):
    site: SiteInput
    requirement: HouseRequirementInput


class RequirementIssue(BaseModel):
    severity: Literal["info", "warn", "error"]
    message: str


class VastuAnalyzeResponse(BaseModel):
    rule_version: str
    rooms: list[RoomZonesOut]
    issues: list[RequirementIssue] = Field(default_factory=list)


# ── POST /vastu/house-plan — the real deliverable (section 23) ─────────────

class PlannedDoorOut(BaseModel):
    id: str
    room_id: str
    wall: Literal["n", "e", "s", "w"]
    t: float
    width: float
    swing: Literal["in_left", "in_right"]
    connects_to: str


class PlannedWindowOut(BaseModel):
    id: str
    room_id: str
    wall: Literal["n", "e", "s", "w"]
    t: float
    width: float
    type: Literal["full", "high", "vent"]


class PlannedRoomOut(BaseModel):
    id: str
    kind: str
    floor: int
    x: float
    y: float
    w: float
    h: float
    life: str
    vastu_region: str
    index: int | None = None
    doors: list[PlannedDoorOut] = Field(default_factory=list)
    windows: list[PlannedWindowOut] = Field(default_factory=list)
    adjacent_to: list[str] = Field(default_factory=list)


class BVertexOut(BaseModel):
    id: str
    x: float
    y: float


class BWallOut(BaseModel):
    id: str
    a: str
    b: str
    thickness: float
    role: Literal["exterior", "interior"]


class BHoleOut(BaseModel):
    id: str
    wall_id: str
    offset: float
    width: float
    type: Literal["door", "window", "entrance"]
    swing: Literal["left", "right"]
    from_: str = Field(alias="from")
    to: str
    height: float | None = None
    sill: float | None = None

    model_config = {"populate_by_name": True}


class BuildingLayerOut(BaseModel):
    vertices: list[BVertexOut]
    walls: list[BWallOut]
    holes: list[BHoleOut]


class FloorConceptOut(BaseModel):
    storey: int
    rooms: list[PlannedRoomOut]
    layer: BuildingLayerOut


class StairShaftOut(BaseModel):
    id: str
    x: float
    y: float
    w: float
    h: float
    rise: Literal["n", "e", "s", "w"]
    floors: list[int]
    host_id: str | None = None


class PlanConflictOut(BaseModel):
    id: str
    severity: Literal["info", "warn"]
    message_key: str


class ValidationReportOut(BaseModel):
    all_reachable: bool
    every_room_has_door: bool
    stair_connects: bool
    kitchen_near_dining: bool
    private_through_private: bool
    issues: list[PlanConflictOut] = Field(default_factory=list)


class LeftoverSpaceOut(BaseModel):
    id: str
    kind: str
    index: int | None = None


class ScoreOut(BaseModel):
    score: float
    vastu_score: float
    planning_score: float
    circulation_score: float
    satisfied_rules: list[str] = Field(default_factory=list)
    relaxed_rules: list[str] = Field(default_factory=list)
    conflicts: list[str] = Field(default_factory=list)


class VastuHousePlanRequest(BaseModel):
    site: SiteInput
    requirement: HouseRequirementInput


class VastuHousePlanResponse(BaseModel):
    rule_version: str
    plot: SiteInput
    width: float
    height: float
    facing: Literal["north", "east", "south", "west"]
    mode: str
    floors: list[FloorConceptOut]
    stair: StairShaftOut | None = None
    leftover: list[LeftoverSpaceOut] = Field(default_factory=list)
    validation: ValidationReportOut
    vastu_relaxed: list[PlanConflictOut] = Field(default_factory=list)
    score: ScoreOut
