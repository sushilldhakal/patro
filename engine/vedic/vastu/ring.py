"""Mandala ring placement — rooms around the edge, Brahmasthāna in the middle.

Replaces the free-form CP-SAT rectangle packing (``solver.solve_layout``) for
room placement. That solver minimised a *sum* of per-room Vastu costs over an
unstructured packing, so it satisfied "touch the corridor" and "touch an outer
wall" in whatever contorted arrangement scored lowest — which is how a kitchen
ended up on the west wall and bedrooms in avoid-zones.

This follows the maṇḍala's own structure instead. The 9x9 grid collapses to a
3x3 of zones: eight peripheral cells around the centre. Rooms fill the eight
cells; the centre ninth is the Brahmasthāna. Three properties then hold *by
construction* rather than by constraint:

* every room touches an outer wall (each of the 8 cells owns a piece of the
  perimeter), so every room can be given a window;
* nothing is ever built in the Brahmasthāna (it simply isn't a cell rooms can
  occupy);
* each room sits in a named compass zone, so Vastu placement is a direct
  assignment (kitchen -> southeast, master -> southwest) instead of a cost the
  optimiser can trade away.

Corridor geometry — why the runs reach the outer walls
-----------------------------------------------------
In a plain 3x3 grid the four *corner* cells touch the centre only at a single
point, never along an edge, so a corner room would have no way in. The runs
are therefore full-length (a "#", not a "+"): two vertical runs spanning the
full height and two horizontal runs spanning the full width, laid just outside
the central ninth. That leaves the Brahmasthāna exactly 1/9 and untouched,
gives all eight cells a full-length corridor edge, and brings circulation out
to all four outer walls so the main door can reach it from any facing.

The Brahmasthāna is part of that walkable network — the treatises forbid
*building* in it (columns, walls, beams, cooking fires, toilets, drains), not
walking through it, and the central open court is the classical precedent.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

from . import zone_rules
from .architecture import IDEAL_SIZE, PLACE_ORDER, ROOM_SIZE_TIERS
from .geometry import Rect
from .rooms import PlannedSpace
from .solver import UNIT, Placement, SolveResult, snap

# The eight peripheral cells, in compass order.
RING_ZONES: tuple[str, ...] = (
    "northwest", "north", "northeast", "east", "southeast", "south", "southwest", "west",
)

EPS = 0.02


@dataclass(frozen=True)
class RingPlan:
    """One floor's ring geometry: where rooms may go, and what stays open."""

    cells: dict[str, Rect]
    corridors: tuple[Rect, ...]
    brahmasthana: Rect


def ring_plan(width: float, height: float, corridor_w: float) -> RingPlan:
    """Cut the plot into 8 room cells + the central ninth + the corridor "#".

    ``corridor_w`` is taken out of the ring cells, never out of the centre:
    the Brahmasthāna keeps its exact ``width/3 x height/3`` regardless, since
    its size is a scriptural proportion rather than a design preference.
    """
    x0, x1 = width / 3.0, 2.0 * width / 3.0
    y0, y1 = height / 3.0, 2.0 * height / 3.0
    # Never let the corridor eat a cell whole on a very small plot.
    d = max(0.6, min(corridor_w, x0 * 0.5, y0 * 0.5))

    left_w, top_h = x0 - d, y0 - d
    right_x, bot_y = x1 + d, y1 + d
    right_w, bot_h = width - right_x, height - bot_y
    mid_w, mid_h = x1 - x0, y1 - y0

    cells = {
        "northwest": Rect(0.0, 0.0, left_w, top_h),
        "north": Rect(x0, 0.0, mid_w, top_h),
        "northeast": Rect(right_x, 0.0, right_w, top_h),
        "west": Rect(0.0, y0, left_w, mid_h),
        "east": Rect(right_x, y0, right_w, mid_h),
        "southwest": Rect(0.0, bot_y, left_w, bot_h),
        "south": Rect(x0, bot_y, mid_w, bot_h),
        "southeast": Rect(right_x, bot_y, right_w, bot_h),
    }
    corridors = (
        Rect(x0 - d, 0.0, d, height),   # west run, wall to wall
        Rect(x1, 0.0, d, height),       # east run
        Rect(0.0, y0 - d, width, d),    # north run
        Rect(0.0, y1, width, d),        # south run
    )
    return RingPlan(
        cells={z: snap(r) for z, r in cells.items()},
        corridors=tuple(snap(r) for r in corridors),
        brahmasthana=snap(Rect(x0, y0, mid_w, mid_h)),
    )


def _fits(rect: Rect, kind: str) -> bool:
    ideal = IDEAL_SIZE[kind]
    return min(rect.w, rect.h) + EPS >= ideal.min_side and rect.w * rect.h + EPS >= ideal.min_area


def _want_area(kind: str) -> float:
    """Preferred footprint, falling back to the placement minimum — used only
    to share a cell out proportionally, never to reject a room."""
    tiers = ROOM_SIZE_TIERS.get(kind)
    if tiers is None:
        return IDEAL_SIZE[kind].min_area
    return max(tiers.preferred.width * tiers.preferred.depth, IDEAL_SIZE[kind].min_area)


def _priority(kind: str) -> int:
    return PLACE_ORDER.index(kind) if kind in PLACE_ORDER else len(PLACE_ORDER)


def _snap_in(rect: Rect) -> Rect:
    """Snap to the placement grid *inward* — the result is always contained by
    `rect`. ``solver.snap`` rounds each edge to nearest, which grows a rect by
    up to half a grid cell; doing that to a piece carved around the stair grew
    it 5cm back over the stair it was carved to avoid."""
    x = math.ceil(round(rect.x / UNIT, 6)) * UNIT
    y = math.ceil(round(rect.y / UNIT, 6)) * UNIT
    x2 = math.floor(round((rect.x + rect.w) / UNIT, 6)) * UNIT
    y2 = math.floor(round((rect.y + rect.h) / UNIT, 6)) * UNIT
    return Rect(x, y, max(0.0, x2 - x), max(0.0, y2 - y))


def _split_along(cell: Rect, kinds: list[str], along_w: bool) -> list[Rect] | None:
    """Cut positions are snapped once and shared between neighbouring strips,
    rather than snapping each strip's own rect — two independently rounded
    rects either overlap or leave a sliver of dead floor between them."""
    weights = [_want_area(k) for k in kinds]
    total = sum(weights)
    span = cell.w if along_w else cell.h
    start = cell.x if along_w else cell.y

    cuts = [start]
    acc = 0.0
    for w in weights[:-1]:
        acc += span * (w / total)
        cuts.append(round((start + acc) / UNIT) * UNIT)
    cuts.append(start + span)

    out: list[Rect] = []
    for i, kind in enumerate(kinds):
        lo, hi = cuts[i], cuts[i + 1]
        piece = (
            Rect(lo, cell.y, hi - lo, cell.h) if along_w else Rect(cell.x, lo, cell.w, hi - lo)
        )
        if not _fits(piece, kind):
            return None
        out.append(piece)
    return out


def _split_cell(cell: Rect, kinds: list[str]) -> list[Rect] | None:
    """Share one cell between rooms, in proportion to each room's preferred
    area. Returns None if any resulting strip is too small for its room — the
    caller then sheds a room and retries, rather than handing back a 1.2 m²
    "bedroom".

    Both axes are tried, longer side first. Splitting only the long way looks
    natural but fails cases the short way handles easily: a 4.2x3.8 m cell cut
    the long way gives two 2.1 m-wide strips, too narrow for any bedroom,
    while cutting it the short way seats a bedroom and a toilet comfortably.
    """
    if not kinds:
        return []
    if len(kinds) == 1:
        return [cell] if _fits(cell, kinds[0]) else None
    first = cell.w >= cell.h
    return _split_along(cell, kinds, first) or _split_along(cell, kinds, not first)


def _zone_rank(kind: str, zone: str, mode: str) -> float:
    cost, _relaxed = zone_rules.vastu_cost(kind, zone, mode)
    return float(cost)


# A room too big for any single cell may take a *side band* — a corner cell
# plus the middle cell next to it, absorbing the corridor segment that runs
# between them. The rest of that run survives (it spans wall to wall, so the
# far end still reaches the ring), which is why this cannot orphan the
# circulation network. Without this a 9x8m plot has no cell big enough for a
# master bedroom at all, and the ring would simply drop it.
_SPANS: tuple[tuple[str, tuple[str, str]], ...] = (
    ("north", ("northwest", "north")),
    ("north", ("north", "northeast")),
    ("south", ("southwest", "south")),
    ("south", ("south", "southeast")),
    ("west", ("northwest", "west")),
    ("west", ("west", "southwest")),
    ("east", ("northeast", "east")),
    ("east", ("east", "southeast")),
)


def _union(cells: dict[str, Rect], zones: tuple[str, ...]) -> Rect:
    rs = [cells[z] for z in zones]
    x0, y0 = min(r.x for r in rs), min(r.y for r in rs)
    x1 = max(r.x + r.w for r in rs)
    y1 = max(r.y + r.h for r in rs)
    return Rect(x0, y0, x1 - x0, y1 - y0)


def ring_layout(
    spaces: list[PlannedSpace],
    width: float,
    height: float,
    mode: str,
    corridor_w: float,
    reserved: dict[str, Rect] | None = None,
) -> tuple[SolveResult, RingPlan]:
    """Assign every space to a compass cell, then share each cell out.

    `reserved` maps a zone id to a rect already taken inside that cell (the
    stair shaft, which has to land on the same footprint on every storey) —
    that area is carved off before the cell is shared.
    """
    plan = ring_plan(width, height, corridor_w)
    taken = reserved or {}

    # Cell capacity, minus anything already spoken for in it.
    free: dict[str, float] = {}
    for zone, cell in plan.cells.items():
        gone = taken[zone].w * taken[zone].h if zone in taken else 0.0
        free[zone] = cell.w * cell.h - gone

    # Rooms claim zones in placement order, so a puja or kitchen takes its
    # classical seat before a store room can sit in it. Ties break toward the
    # emptier cell, which keeps one zone from swallowing half the house.
    buckets: dict[str, list[PlannedSpace]] = {z: [] for z in RING_ZONES}
    spans: dict[str, Placement] = {}
    dropped: list[PlannedSpace] = []
    for space in sorted(spaces, key=lambda s: _priority(s.kind)):
        need = IDEAL_SIZE[space.kind].min_area
        best: str | None = None
        best_key: tuple[float, float] | None = None
        for zone in RING_ZONES:
            cell = plan.cells[zone]
            if min(cell.w, cell.h) + EPS < IDEAL_SIZE[space.kind].min_side:
                continue
            if free[zone] + EPS < need:
                continue
            key = (_zone_rank(space.kind, zone, mode), -free[zone])
            if best_key is None or key < best_key:
                best, best_key = zone, key
        if best is None:
            # Too big for any one cell — try a side band before giving up.
            span = _claim_span(space, plan, free, taken, mode)
            if span is not None:
                zone, rect, used_zones = span
                spans[space.id] = Placement(rect, zone)
                for z in used_zones:
                    free[z] = 0.0
                continue
            dropped.append(space)
            continue
        buckets[best].append(space)
        free[best] -= need

    # Share each cell out. If the split doesn't work, shed the least important
    # room in that cell and try again — same degrade-gracefully contract the
    # CP-SAT path had.
    placed: dict[str, Placement] = dict(spans)
    for zone, members in buckets.items():
        cell = plan.cells[zone]
        if zone in taken:
            cell = _remainder(cell, taken[zone])
        members = sorted(members, key=lambda s: _priority(s.kind))
        while members:
            rects = _split_cell(cell, [s.kind for s in members]) if cell is not None else None
            if rects is not None:
                for space, rect in zip(members, rects):
                    placed[space.id] = Placement(rect, zone)
                break
            dropped.append(members.pop())
    return SolveResult(placed, dropped), plan


def _claim_span(
    space: PlannedSpace,
    plan: RingPlan,
    free: dict[str, float],
    taken: dict[str, Rect],
    mode: str,
) -> tuple[str, Rect, tuple[str, str]] | None:
    """Give `space` a whole side band, if both its cells are still untouched
    and the band is genuinely big enough. Cheapest Vastu zone wins."""
    best: tuple[str, Rect, tuple[str, str]] | None = None
    best_rank = float("inf")
    for zone, zones in _SPANS:
        if any(z in taken for z in zones):
            continue
        # Only claim cells nothing has been booked into yet.
        if any(free[z] + EPS < plan.cells[z].w * plan.cells[z].h for z in zones):
            continue
        rect = _union(plan.cells, zones)
        if not _fits(rect, space.kind):
            continue
        rank = _zone_rank(space.kind, zone, mode)
        if rank < best_rank:
            best, best_rank = (zone, rect, zones), rank
    return best


def _remainder(cell: Rect, cut: Rect) -> Rect | None:
    """The largest full-width/full-height strip of `cell` left after `cut`.
    Kept rectangular on purpose: an L-shaped remainder is not a room."""
    left = Rect(cell.x, cell.y, cut.x - cell.x, cell.h)
    right = Rect(cut.x + cut.w, cell.y, cell.x + cell.w - (cut.x + cut.w), cell.h)
    top = Rect(cell.x, cell.y, cell.w, cut.y - cell.y)
    bottom = Rect(cell.x, cut.y + cut.h, cell.w, cell.y + cell.h - (cut.y + cut.h))
    best: Rect | None = None
    for piece in (left, right, top, bottom):
        if piece.w <= EPS or piece.h <= EPS:
            continue
        if best is None or piece.w * piece.h > best.w * best.h:
            best = piece
    return _snap_in(best) if best else None
