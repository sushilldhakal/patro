"""Port of validate.ts's validateConcept() — door coverage, reachability,
privacy, stair-connects, kitchen-near-dining, wet-room access, toilet-zone.
"""

from __future__ import annotations

from . import architecture as arch
from .entrance import toilet_forbidden
from .geometry import Rect, shared_seg
from .types import FloorConcept, PlanConflict, PlannedRoom, ValidationReport


def _overlap_loose(a: Rect, b: Rect) -> bool:
    w = min(a.x + a.w, b.x + b.w) - max(a.x, b.x)
    h = min(a.y + a.h, b.y + b.h) - max(a.y, b.y)
    return w > 0.12 and h > 0.12


def _is_room(row: PlannedRoom) -> bool:
    """Matches layout.py's door_onto_open skip set (life in circulation,
    outdoor) — an outdoor-life room (garage, garden, courtyard, balcony)
    never gets a door of its own by design (building.py only walls an open
    room's edge against a closed room or the exterior), so requiring one
    here made every plan with a garage falsely warn "a room is missing a
    door" even when nothing was wrong."""
    return row.life not in ("circulation", "outdoor")


def _needs_reachability(row: PlannedRoom) -> bool:
    """Broader than `_is_room`: a circulation-life *fragment* (brahmasthan,
    hall, landing, foyer, verandah) is fine left dead if nothing connects
    it — decorative floor, not a room anyone asked for. But "living" is
    life="circulation" too (open-plan: no wall/door of its own) while still
    being a real, named, sized room someone explicitly requested — it must
    still be reachable via *some* real connection (a door, or open floor
    genuinely touching a reached room), even though it's exempt from
    `_is_room`'s "must have its own door" check just above. `kind in
    IDEAL_SIZE` is the same test layout.py's own place_foyer/ensure_reachable
    use to tell a real room apart from a decorative fragment."""
    return _is_room(row) or row.kind in arch.IDEAL_SIZE


def _neighbors(room: PlannedRoom, floor: FloorConcept) -> list[str]:
    out = [d.connects_to for d in room.doors]
    for other in floor.rooms:
        if other.id == room.id:
            continue
        if any(d.connects_to == room.id for d in other.doors):
            out.append(other.id)
        both_open = room.life in ("circulation", "outdoor") and other.life in ("circulation", "outdoor")
        # A real shared wall, not layout.py's looser `touches` (which also
        # counts a corner-only meeting point, with no actual opening in it)
        # — this check exists to certify a room reachable, so it must mean
        # an opening someone could really walk through, not a coincidence
        # of the mandala's own grid lines crossing at a point.
        if both_open and shared_seg(room.rect, other.rect):
            out.append(other.id)
        if (
            room.life != "circulation"
            and other.life in ("circulation", "outdoor")
            and (shared_seg(room.rect, other.rect) or _overlap_loose(room.rect, other.rect))
        ):
            out.append(other.id)
    return out


def validate_concept(floors: list[FloorConcept], leftover: list, storeys: int) -> ValidationReport:
    issues: list[PlanConflict] = []
    missing_door = [r for f in floors for r in f.rooms if _is_room(r) and not r.doors]
    if missing_door:
        issues.append(PlanConflict(id="doors", severity="warn", message_key="vastu.plan.valid.missing_door"))

    all_reachable = True
    for floor in floors:
        hall = next((r for r in floor.rooms if r.kind in ("hall", "foyer", "landing", "brahmasthan", "verandah")), None)
        if not hall:
            all_reachable = False
            issues.append(PlanConflict(id=f"reach-{floor.storey}", severity="warn", message_key="vastu.plan.valid.no_hall"))
            continue
        seen = {hall.id}
        q = [hall.id]
        by_id = {r.id: r for r in floor.rooms}
        while q:
            node = by_id.get(q.pop())
            if not node:
                continue
            for nxt in _neighbors(node, floor):
                if nxt in seen:
                    continue
                seen.add(nxt)
                q.append(nxt)
        for room in floor.rooms:
            if not _needs_reachability(room):
                continue
            if room.id not in seen:
                all_reachable = False
                issues.append(PlanConflict(id=f"iso-{room.id}", severity="warn", message_key="vastu.plan.valid.isolated"))

    private_through_private = False
    for floor in floors:
        for room in floor.rooms:
            if room.life != "private":
                continue
            if not room.doors:
                continue
            only_private = all(
                (next((r for r in floor.rooms if r.id == d.connects_to), None) or _NoRoom).life == "private"
                for d in room.doors
            )
            hits_hub = any(
                any(k in d.connects_to for k in ("hall", "center", "verandah", "foyer")) for d in room.doors
            )
            if only_private and not hits_hub:
                private_through_private = True
    if private_through_private:
        issues.append(PlanConflict(id="privacy", severity="warn", message_key="vastu.plan.valid.private_through"))

    has_stair_every_floor = all(any(r.kind == "staircase" for r in f.rooms) for f in floors)
    stair_connects = storeys == 1 or has_stair_every_floor or any(getattr(r, "kind", None) == "staircase" for r in leftover)
    if storeys > 1 and not has_stair_every_floor:
        issues.append(PlanConflict(id="stair", severity="warn", message_key="vastu.plan.valid.stair"))

    kitchen_near_dining = True
    for floor in floors:
        kitchen = next((r for r in floor.rooms if r.kind == "kitchen"), None)
        dining = next((r for r in floor.rooms if r.kind == "dining"), None)
        if kitchen and dining:
            touch = dining.id in kitchen.adjacent_to or kitchen.id in dining.adjacent_to
            via_hall = any(d.connects_to == e.connects_to for d in kitchen.doors for e in dining.doors)

            def on_open(room: PlannedRoom) -> bool:
                return any(
                    (a := next((r for r in floor.rooms if r.id == d.connects_to), None)) and a.life in ("circulation", "outdoor")
                    for d in room.doors
                )

            both_on_court = on_open(kitchen) and on_open(dining)
            kitchen_near_dining = touch or via_hall or both_on_court
            if not kitchen_near_dining:
                issues.append(PlanConflict(id="kit-din", severity="info", message_key="vastu.plan.valid.kitchen_dining"))

    wets = [r for f in floors for r in f.rooms if r.kind in arch.WET_KINDS]
    wet_ok = all(r.doors for r in wets)
    if wets and not wet_ok:
        issues.append(PlanConflict(id="wet-access", severity="info", message_key="vastu.plan.valid.wet_access"))

    bad_toilet = any(
        r.kind in ("toilet", "combined") and toilet_forbidden(r.vastu_region)
        for f in floors for r in f.rooms
    )
    if bad_toilet:
        issues.append(PlanConflict(id="toilet-zone", severity="warn", message_key="vastu.plan.valid.toilet_zone"))

    return ValidationReport(
        all_reachable=all_reachable,
        every_room_has_door=not missing_door,
        stair_connects=stair_connects,
        kitchen_near_dining=kitchen_near_dining,
        private_through_private=private_through_private,
        issues=issues,
    )


class _NoRoom:
    life = None
