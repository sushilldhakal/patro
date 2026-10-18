"""Zone assignment for the Vastu plot sketch, plus the Āyādi width check.

This is the logic the web and mobile clients used to run locally
(``vastu-plan.ts`` ``assignVastuSpaces`` and ``vastu.ts`` ``ayadiRemainder``).
It lives here so there is one implementation: the clients send the plot and the
house requirements and draw whatever comes back.

Distinct from ``layout.plan_house``: that is the full floor-plan solver behind
``POST /vastu/house-plan``. This is the lighter "which compass zone does each
room sit in" pass that drives the courtyard sketch, and it works on the
client's own rule table (``sketch_rules``) so the sketch reads the same as it
always has. Both consume rule data from the server now; they just are not the
same algorithm.

Plot sizes are metres throughout.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Literal, Optional

from .sketch_rules import (
    ALL_ZONES,
    ASSIGN_ORDER,
    DEFAULT_STOREY,
    ENTRANCE_PREFERRED_CORNER,
    HOST_KINDS,
    IDEAL_SIZE,
    SPACE_ZONE_RULES,
    STAIR_WIDTH_M,
    WET_KINDS,
)

Mode = Literal["strict", "flexible"]

# A zone is one ninth of the plot, which on any normal plot is enough floor for
# two ordinary rooms side by side. Capped at two because past that the "zone"
# stops meaning anything and the sketch turns into a list.
MAX_PRIMARIES_PER_ZONE = 2

HASTA_METERS = 0.4572


# ── Data ────────────────────────────────────────────────────────────────────


@dataclass(frozen=True)
class PlannedSpace:
    id: str
    kind: str
    index: Optional[int] = None


@dataclass(frozen=True)
class SpaceAssignment:
    id: str
    kind: str
    zone: str
    fit: Literal["preferred", "acceptable", "shared"]
    storey: int
    index: Optional[int] = None

    @property
    def space(self) -> PlannedSpace:
        return PlannedSpace(self.id, self.kind, self.index)


@dataclass(frozen=True)
class HousePlan:
    bedrooms: int = 3
    toilets: int = 2
    bathrooms: int = 1
    combined: int = 1
    master_bedroom: int = 1
    extras: tuple[str, ...] = ("living", "kitchen", "dining", "puja")
    mode: Mode = "flexible"
    storeys: int = 1
    floors: dict[str, str] = field(default_factory=dict)


@dataclass(frozen=True)
class PlotSize:
    width: float
    height: float


# ── Helpers ─────────────────────────────────────────────────────────────────


def _js_round(x: float) -> int:
    """``Math.round``: halves go up, unlike Python's banker's rounding."""
    return math.floor(x + 0.5)


def clamp_storeys(n: float) -> int:
    if n >= 3:
        return 3
    if n == 2:
        return 2
    return 1


def _clamp_count(n: float, lo: int, hi: int) -> int:
    if not math.isfinite(n):
        return lo
    return min(hi, max(lo, _js_round(n)))


def _is_primary(kind: str) -> bool:
    return kind != "staircase" and kind not in WET_KINDS


def box_fits(w: float, h: float, size: dict) -> bool:
    return min(w, h) + 0.02 >= size["minSide"] and w * h + 0.02 >= size["minArea"]


def _zone_meters(plot: PlotSize) -> tuple[float, float]:
    return plot.width / 3, plot.height / 3


def _after_stair(w: float, h: float) -> tuple[float, float]:
    if w >= h:
        return w - STAIR_WIDTH_M, h
    return w, h - STAIR_WIDTH_M


def _ensuite_boxes(w: float, h: float, host: str, wet: str) -> bool:
    """Can ``host`` and an attached ``wet`` room share a ``w`` x ``h`` zone?"""
    wet_size = IDEAL_SIZE[wet]
    wet_side = wet_size["minSide"]
    wet_long = 1.5 if wet == "toilet" else max(wet_side, wet_size["minArea"] / wet_side)
    long_ = max(w, h)
    short = min(w, h)
    host_size = IDEAL_SIZE[host]
    if long_ - wet_side < host_size["minSide"]:
        return False
    if short + 0.02 < wet_long and wet == "toilet":
        return False
    main_long = long_ - wet_side
    main = (main_long, short) if w >= h else (short, main_long)
    bath = (wet_side, short) if w >= h else (short, wet_side)
    return box_fits(*main, host_size) and box_fits(*bath, wet_size)


def _primaries_fit(w: float, h: float, kinds: list[str]) -> bool:
    if not kinds:
        return True
    if len(kinds) == 1:
        return box_fits(w, h, IDEAL_SIZE[kinds[0]])
    long_ = max(w, h)
    cross = min(w, h)
    needs = [max(IDEAL_SIZE[k]["minSide"], IDEAL_SIZE[k]["minArea"] / cross) for k in kinds]
    if sum(needs) > long_ + 0.02:
        return False
    return all(box_fits(needs[i], cross, IDEAL_SIZE[k]) for i, k in enumerate(kinds))


# ── Storey / space expansion ────────────────────────────────────────────────


def resolve_storey(space: PlannedSpace, plan: HousePlan) -> int:
    top = clamp_storeys(plan.storeys) - 1
    pref = plan.floors.get(space.kind)
    if pref == "ground":
        level = 0
    elif pref == "first":
        level = 1
    elif pref == "third":
        level = 2
    else:
        level = DEFAULT_STOREY.get(space.kind, 0)
        idx = space.index if space.index is not None else 1
        if space.kind == "bedroom" and idx >= 3:
            level = 2
        if space.kind in ("toilet", "bathroom", "combined") and idx >= 2:
            level = min(idx - 1, 2)
    if space.kind in ("garage", "garden", "courtyard"):
        return 0
    return min(level, top)


def _push_counted(out: list[PlannedSpace], kind: str, n: int) -> None:
    for i in range(1, n + 1):
        out.append(PlannedSpace(f"{kind}_{i}", kind, i))


def expand_planned_spaces(plan: HousePlan) -> list[PlannedSpace]:
    out: list[PlannedSpace] = []
    beds = _clamp_count(plan.bedrooms, 1, 5)
    master = min(max(plan.master_bedroom, 1), beds)
    for i in range(1, beds + 1):
        if i == master:
            out.append(PlannedSpace(f"master_{i}", "master_bedroom", i))
        else:
            out.append(PlannedSpace(f"bedroom_{i}", "bedroom", i))
    _push_counted(out, "toilet", _clamp_count(plan.toilets, 1, 5))
    _push_counted(out, "bathroom", _clamp_count(plan.bathrooms, 1, 5))
    _push_counted(out, "combined", _clamp_count(plan.combined, 0, 5))
    for kind in plan.extras:
        if kind in ("bedroom", "master_bedroom", "toilet", "bathroom", "combined"):
            continue
        out.append(PlannedSpace(kind, kind))
    return out


# ── Zone assignment ─────────────────────────────────────────────────────────


def _occupants_of(zone: str, placed: list[SpaceAssignment]) -> list[str]:
    return [row.kind for row in placed if row.zone == zone]


def _can_share(zone: str, space: PlannedSpace, placed: list[SpaceAssignment]) -> bool:
    rule = SPACE_ZONE_RULES[space.kind]
    if zone in rule["avoid"]:
        return False
    if zone == "center":
        return space.kind == "courtyard"
    here = _occupants_of(zone, placed)
    primaries = [k for k in here if _is_primary(k)]
    wets = [k for k in here if k in WET_KINDS]
    if space.kind in WET_KINDS:
        if wets:
            return False
        if len(primaries) > 1:
            return False
        if len(primaries) == 1 and primaries[0] not in HOST_KINDS:
            return False
        return True
    # A second primary is allowed, but not on top of a wet room: the wet room is
    # already sharing this zone with its host, and three ways is a split
    # _room_fits_zone has no honest way to size.
    if not primaries:
        return len(wets) <= 1
    if len(primaries) < MAX_PRIMARIES_PER_ZONE:
        return not wets
    return False


def _room_fits_zone(
    zone: str,
    space: PlannedSpace,
    placed: list[SpaceAssignment],
    plot: Optional[PlotSize],
) -> bool:
    if plot is None:
        return True
    w, h = _zone_meters(plot)
    here = _occupants_of(zone, placed)
    if "staircase" in here and space.kind != "staircase":
        w, h = _after_stair(w, h)
    host = next((k for k in here if _is_primary(k)), None)
    wet = next((k for k in here if k in WET_KINDS), None)
    if space.kind in WET_KINDS and host:
        return _ensuite_boxes(w, h, host, space.kind)
    if _is_primary(space.kind) and wet:
        return _ensuite_boxes(w, h, space.kind, wet)
    if space.kind == "staircase":
        return box_fits(STAIR_WIDTH_M, max(w, h), IDEAL_SIZE["staircase"])
    primaries = [k for k in here if _is_primary(k)]
    if _is_primary(space.kind) and primaries:
        return _primaries_fit(w, h, [*primaries, space.kind])
    return box_fits(w, h, IDEAL_SIZE[space.kind])


def _pick_zone(
    space: PlannedSpace,
    placed: list[SpaceAssignment],
    mode: Mode,
    plot: Optional[PlotSize],
) -> Optional[str]:
    rule = SPACE_ZONE_RULES[space.kind]

    def ok(z: str) -> bool:
        return _can_share(z, space, placed) and _room_fits_zone(z, space, placed, plot)

    pools = [
        [z for z in rule["preferred"] if ok(z)],
        [z for z in rule["acceptable"] if ok(z)] if mode == "flexible" else [],
        [z for z in ALL_ZONES if z != "center" and ok(z)],
    ]
    for pool in pools:
        if not pool:
            continue
        best = pool[0]
        best_load = math.inf
        for zone in pool:
            n = len(_occupants_of(zone, placed))
            if n < best_load:
                best = zone
                best_load = n
        return best
    return None


def _assign_zones(
    spaces: list[PlannedSpace],
    plan: HousePlan,
    storey: int,
    plot: Optional[PlotSize],
    initial: list[SpaceAssignment],
) -> tuple[list[SpaceAssignment], list[PlannedSpace]]:
    def order(space: PlannedSpace) -> int:
        try:
            return ASSIGN_ORDER.index(space.kind)
        except ValueError:
            return -1  # unlisted kinds sort first, as Array.indexOf's -1 did

    ordered = sorted(spaces, key=order)  # stable, like the JS sort it replaces
    placed = list(initial)
    overflow: list[PlannedSpace] = []

    for space in ordered:
        zone = _pick_zone(space, placed, plan.mode, plot)
        if zone is None:
            overflow.append(space)
            continue
        rule = SPACE_ZONE_RULES[space.kind]
        n = len(_occupants_of(zone, placed))
        if n > 0:
            fit = "shared"
        elif zone in rule["preferred"]:
            fit = "preferred"
        else:
            fit = "acceptable"
        placed.append(SpaceAssignment(space.id, space.kind, zone, fit, storey, space.index))
    return placed, overflow


def assign_vastu_spaces(
    plan: HousePlan, plot: Optional[PlotSize] = None
) -> tuple[list[SpaceAssignment], list[PlannedSpace]]:
    """Place each requested space into a compass zone.

    Prefers an empty preferred cell; under flexible mode it may share a zone
    rather than sit in an avoid zone. Rooms are split across storeys first so
    each floor is assigned on its own.
    """
    asked = clamp_storeys(plan.storeys)
    buckets: list[list[PlannedSpace]] = [[], [], []]
    stair: Optional[PlannedSpace] = None

    for space in expand_planned_spaces(plan):
        if space.kind == "staircase":
            stair = space
            continue
        buckets[resolve_storey(space, plan)].append(space)

    stair_zone = (SPACE_ZONE_RULES["staircase"]["preferred"] or ["southwest"])[0]
    assignments: list[SpaceAssignment] = []
    leftover: list[PlannedSpace] = []

    for storey in range(asked):
        batch = [*leftover, *buckets[storey]]
        seed = (
            [SpaceAssignment(f"{stair.id}_{storey}", stair.kind, stair_zone, "preferred", storey, stair.index)]
            if stair
            else []
        )
        placed, leftover = _assign_zones(batch, plan, storey, plot, seed)
        assignments.extend(placed)
    return assignments, leftover


# ── Āyādi + entrance ────────────────────────────────────────────────────────


def meters_to_hasta(meters: float) -> float:
    return meters / HASTA_METERS


def ayadi_remainder(width_hasta: float) -> int:
    """Simplified Āyādi "income" check on a wall length in whole hasta.

    With ``(hasta * 8) % 12`` only 0, 4 and 8 can occur (8 and 12 share a factor
    of 4), so the auspicious test is "non-zero", not "odd".
    """
    hasta = _js_round(width_hasta)
    return ((hasta * 8) % 12 + 12) % 12


def ayadi_auspicious(remainder: int) -> bool:
    return remainder != 0


def nearest_auspicious_width_hasta(width_hasta: float) -> int:
    base = _js_round(width_hasta)
    for delta in range(1, 7):
        if ayadi_auspicious(ayadi_remainder(base - delta)):
            return base - delta
        if ayadi_auspicious(ayadi_remainder(base + delta)):
            return base + delta
    return base


def ayadi_for_plot(plot: PlotSize) -> dict:
    length_hasta = meters_to_hasta(plot.height)
    width_hasta = meters_to_hasta(plot.width)
    remainder = ayadi_remainder(width_hasta)
    auspicious = ayadi_auspicious(remainder)
    suggested = None if auspicious else nearest_auspicious_width_hasta(width_hasta)
    return {
        "length_hasta": length_hasta,
        "width_hasta": width_hasta,
        "remainder": remainder,
        "auspicious": auspicious,
        "suggested_hasta": suggested,
        "suggested_meters": None if suggested is None else suggested * HASTA_METERS,
    }


def entrance_corner(facing: str) -> str:
    return ENTRANCE_PREFERRED_CORNER[facing]


# ── Top-level builder ───────────────────────────────────────────────────────


def build_sketch(plan: HousePlan, plot: PlotSize, facing: str) -> dict:
    assignments, leftover = assign_vastu_spaces(plan, plot)
    return {
        "storeys": clamp_storeys(plan.storeys),
        "assignments": [
            {
                "id": a.id,
                "kind": a.kind,
                "index": a.index,
                "zone": a.zone,
                "fit": a.fit,
                "storey": a.storey,
                "min_area": IDEAL_SIZE[a.kind]["minArea"],
            }
            for a in assignments
        ],
        "leftover": [{"id": s.id, "kind": s.kind, "index": s.index} for s in leftover],
        "ayadi": ayadi_for_plot(plot),
        "entrance": {"facing": facing, "preferred_corner": entrance_corner(facing)},
    }
