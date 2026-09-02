"""Architectural planning data — sizing, floor assignment, placement order.

Faithful port of the *non-Vastu-content* tables in the web client's
``src/lib/vastu-plan.ts`` (``IDEAL_SIZE``, ``DEFAULT_STOREY``, ``boxFits``,
``expandPlannedSpaces``, ``resolveStorey``, ``clampStoreys``) and
``src/lib/house-plan/engine.ts``'s ``PLACE_ORDER``/``prefs.ts``'s
``HOST_KINDS``. This is category C from the user's own spec ("architectural
planning rules") — comfortable room sizes and assignment order, not a
classical claim.

``IDEAL_SIZE`` (the placement gate's minimum) and ``ROOM_SIZE_TIERS``
(minimum/comfortable/preferred, the latter two used only by layout.py's
leftover-space growth, never to reject a placement) are both sourced from
``data/vastu_room_sizes.json`` via ``services.vastu_room_sizes_db`` — one
table, not two drifting copies. ``IDEAL_SIZE``'s numbers are unchanged from
the original hardcoded port (see that JSON's own ``_comment`` for how its
``minimum`` tier was derived from the old ``min_side``/``min_area`` pairs).
"""

from __future__ import annotations

from dataclasses import dataclass

from services import vastu_room_sizes_db as sizes_db

from .rooms import HouseRequirement, PlannedSpace

WET_KINDS = frozenset({"toilet", "bathroom", "combined"})
# Only the master bedroom gets an ensuite — a regular bedroom or guest room
# doesn't automatically pick one up just because it's a private room with
# surplus space (user's own instruction: "only give attach toilet shower
# to मुख्य शयनकक्ष not all of them").
HOST_KINDS = frozenset({"master_bedroom"})

STAIR_WIDTH_M = 1.25


@dataclass(frozen=True)
class IdealSize:
    min_side: float
    min_area: float


ROOM_SIZE_TIERS: dict[str, sizes_db.RoomSizeTiers] = sizes_db.all_tiers()

IDEAL_SIZE: dict[str, IdealSize] = {
    kind: IdealSize(min_side=tiers.minimum.width, min_area=tiers.minimum.area)
    for kind, tiers in ROOM_SIZE_TIERS.items()
}

# Rooms placed first claim the best available zone; wet rooms go after so
# they don't crowd out primary living spaces (engine.ts:48-68).
PLACE_ORDER: list[str] = [
    "puja", "kitchen", "kitchen_dining", "master_bedroom", "living", "dining",
    "bedroom", "guest", "family", "study", "office", "store", "laundry",
    "garage", "garden", "balcony", "library", "gym", "servant",
]

# Typical default storey when the requirement leaves a kind on "any" (vastu-plan.ts:336-361).
_DEFAULT_STOREY: dict[str, int] = {
    "puja": 0, "kitchen": 0, "living": 0, "dining": 0, "kitchen_dining": 0,
    "garage": 0, "store": 0, "laundry": 0, "courtyard": 0, "garden": 0,
    "servant": 0, "staircase": 0,
    "master_bedroom": 1, "bedroom": 1, "toilet": 1, "bathroom": 1, "combined": 1,
    "study": 1, "office": 1, "family": 1, "guest": 1, "balcony": 1,
    "gym": 2, "library": 2,
}

_EXTRA_KINDS = frozenset(
    {
        "living", "kitchen", "dining", "puja", "study", "office", "store", "laundry",
        "staircase", "garage",  # essential
        "guest", "family", "balcony", "courtyard", "garden", "servant", "gym", "library",  # optional
        "kitchen_dining",
    }
)


# "living" belongs here, not in _SEMI_KINDS: an open-plan living room reads
# as part of the house's circulation, not a closed room off it — no wall
# where it meets the hall/Brahmasthan, no door either (building.py's
# compile_layer only walls an open room's edge against a *closed* room or
# the exterior, matching how it already treats brahmasthan/hall/foyer).
_CIRCULATION_KINDS = frozenset({"hall", "foyer", "landing", "brahmasthan", "verandah", "living"})
_OUTDOOR_KINDS = frozenset({"garden", "courtyard", "balcony", "garage"})
_SERVICE_EXTRA = frozenset({"kitchen", "kitchen_dining", "store", "laundry"})
_PRIVATE_KINDS = frozenset({"master_bedroom", "bedroom", "guest"})
_SEMI_KINDS = frozenset({"dining", "family", "study", "puja", "office", "library"})


def life_zone_of(kind: str) -> str:
    """Ports prefs.ts's lifeZoneOf — an architectural categorization (public/
    semi/private/service/vertical/outdoor/circulation), not Vastu content."""
    if kind in _CIRCULATION_KINDS:
        return "circulation"
    if kind == "staircase":
        return "vertical"
    if kind in _OUTDOOR_KINDS:
        return "outdoor"
    if kind in _SERVICE_EXTRA or kind in WET_KINDS:
        return "service"
    if kind in _PRIVATE_KINDS:
        return "private"
    if kind in _SEMI_KINDS:
        return "semi"
    return "public"


def box_fits(w: float, h: float, size: IdealSize) -> bool:
    return min(w, h) + 0.02 >= size.min_side and w * h + 0.02 >= size.min_area


def clamp_storeys(n: int) -> int:
    if n >= 3:
        return 3
    if n == 2:
        return 2
    return 1


def _clamp_count(n: int, lo: int, hi: int) -> int:
    return min(hi, max(lo, round(n)))


def is_extra_space(kind: str) -> bool:
    return kind in _EXTRA_KINDS


def expand_planned_spaces(req: HouseRequirement) -> list[PlannedSpace]:
    """HouseRequirement (counts) -> flat list of individual spaces to place. Ports vastu-plan.ts:411-432."""
    out: list[PlannedSpace] = []
    beds = _clamp_count(req.bedrooms, 1, 5)
    master = min(max(req.master_bedroom_index, 1), beds)
    for i in range(1, beds + 1):
        out.append(PlannedSpace(id=f"master_{i}" if i == master else f"bedroom_{i}", kind="master_bedroom" if i == master else "bedroom", index=i))
    # A "combined" room is one physical toilet+bathroom, not a fixture on
    # top of the separate toilet/bathroom counts — asking for 2 toilets,
    # 1 bathroom, 1 combined means one of those 2 toilets *is* the combined
    # room (and so is the 1 bathroom), for 2 wet rooms total (1 toilet +
    # 1 combined), not 4 (2 toilets + 1 bathroom + 1 combined as if
    # unrelated). Each combined room absorbs one slot from *both* counts,
    # since it satisfies both needs in the one room; either can bottom out
    # at 0 (a request of 1 toilet + 1 combined has no separate toilet left
    # at all — the combined room already covers it).
    combined_n = _clamp_count(req.combined_toilet_bath, 0, 5)
    toilets_n = max(0, _clamp_count(req.toilets, 1, 5) - combined_n)
    bathrooms_n = max(0, _clamp_count(req.bathrooms, 0, 5) - combined_n)
    for i in range(1, toilets_n + 1):
        out.append(PlannedSpace(id=f"toilet_{i}", kind="toilet", index=i))
    for i in range(1, bathrooms_n + 1):
        out.append(PlannedSpace(id=f"bathroom_{i}", kind="bathroom", index=i))
    for i in range(1, combined_n + 1):
        out.append(PlannedSpace(id=f"combined_{i}", kind="combined", index=i))
    counted_kinds = {"bedroom", "master_bedroom", "toilet", "bathroom", "combined"}
    for kind in req.extras:
        if kind in counted_kinds:
            continue
        out.append(PlannedSpace(id=kind, kind=kind))
    return out


def resolve_storey(space: PlannedSpace, req: HouseRequirement) -> int:
    """Which storey (0-indexed) a space lands on. Ports vastu-plan.ts:379-400."""
    max_storey = clamp_storeys(req.storeys) - 1
    pref = req.floors.get(space.kind)
    if pref == "ground":
        level = 0
    elif pref == "first":
        level = 1
    elif pref == "third":
        level = 2
    else:
        level = _DEFAULT_STOREY.get(space.kind, 0)
        if space.kind == "bedroom" and (space.index or 1) >= 3:
            level = 2
        if space.kind in ("toilet", "bathroom", "combined") and (space.index or 1) >= 2:
            level = min((space.index or 1) - 1, 2)
    if space.kind in ("garage", "garden", "courtyard"):
        return 0
    return min(level, max_storey)
