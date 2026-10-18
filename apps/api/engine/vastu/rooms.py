"""Room requirement and room-spec models — shape only, no placement logic.

Ports the *shape* of the web client's ``src/lib/vastu-plan.ts`` (``SpaceKind``,
``IDEAL_SIZE``, ``HousePlan``) to Python. Phase 1 has no geometry solver, so
``RoomSpec`` carries constraints a later phase's placement engine will read,
not anything computed here.

``ROOM_SUBJECT_IDS`` is the canonical room vocabulary — it matches the
subjects that actually appear in the extracted ``data/vastu_room_index.json``
(built by ``dhakal-patro/scripts/extract-vastu-content.mjs`` from the
product's existing, cross-referenced zone-use content), not an invented list.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

VastuMode = Literal["strict", "balanced", "flexible"]
PrivacyLevel = Literal["public", "semi", "private", "service"]
AdjacencyStrength = Literal["required", "preferred", "neutral", "discouraged", "prohibited"]

# Matches the `room` subject_type entries produced by the extraction/tagging
# pipeline — see scripts/extract-vastu-content.mjs's VOCAB table (web repo).
ROOM_SUBJECT_IDS: tuple[str, ...] = (
    "master_bedroom", "bedroom", "guest", "childrens_room", "living", "dining",
    "study", "puja", "kitchen", "toilet", "bathroom", "staircase", "garage",
    "garden", "store", "laundry", "office", "gym", "dressing_room", "guard_room",
    "first_aid_room",
)

# subject_type="opening" and "feature" — the non-room mentions this content
# actually makes (a main door orientation, a water tank, a safe, etc.).
OPENING_SUBJECT_IDS: tuple[str, ...] = ("main_door", "window")
FEATURE_SUBJECT_IDS: tuple[str, ...] = (
    "water_tank_underground", "water_tank_overhead", "safe_locker", "septic",
    "waste_dump", "electrical", "courtyard", "balcony", "rcc_pillar", "heavy_load",
)


@dataclass(frozen=True)
class AreaConstraint:
    min_area: float | None = None
    preferred_area: float | None = None
    min_side: float | None = None


@dataclass(frozen=True)
class RoomSpec:
    id: str
    subject: str  # a ROOM_SUBJECT_IDS entry — the Vastu subject this room maps to
    floor: int = 0
    index: int | None = None  # 1-based, when several of the same subject exist
    area: AreaConstraint = field(default_factory=AreaConstraint)
    privacy_level: PrivacyLevel = "public"
    requires_exterior_wall: bool = False
    requires_window: bool = False
    requires_ventilation: bool = False
    adjacency: dict[str, AdjacencyStrength] = field(default_factory=dict)


@dataclass(frozen=True)
class HouseRequirement:
    bedrooms: int = 3
    master_bedroom_index: int = 1
    toilets: int = 1
    bathrooms: int = 0
    combined_toilet_bath: int = 0
    extras: tuple[str, ...] = ("living", "kitchen", "dining", "puja")
    mode: VastuMode = "flexible"
    storeys: int = 1
    # Per-kind floor override ("ground"/"first"/"third"/"any"), e.g. {"puja": "ground"}.
    # Ports vastu-plan.ts's HousePlan.floors — read by architecture.resolve_storey().
    floors: dict[str, str] = field(default_factory=dict)

    def room_subjects(self) -> list[str]:
        """Flat list of every room subject this requirement asks for (unordered, no sizing/placement)."""
        out: list[str] = []
        for i in range(1, self.bedrooms + 1):
            out.append("master_bedroom" if i == self.master_bedroom_index else "bedroom")
        out.extend(["toilet"] * self.toilets)
        out.extend(["bathroom"] * self.bathrooms)
        out.extend(["combined"] * self.combined_toilet_bath)
        out.extend(e for e in self.extras if e not in {"bedroom", "master_bedroom", "toilet", "bathroom", "combined"})
        return out


@dataclass(frozen=True)
class PlannedSpace:
    """One space the requirement asks for, with enough identity to resolve
    its storey and give it a stable room id — ports vastu-plan.ts's
    ``PlannedSpace`` (``{id, kind, index}``)."""

    id: str
    kind: str
    index: int | None = None
