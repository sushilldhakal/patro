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
from .entrance import FOYER_D, FOYER_W, entrance_padas, face_span
from .geometry import Rect, overlap_area
from .rooms import PlannedSpace
from .solver import UNIT, Placement, SolveResult, snap
from .types import CardinalWall

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

    # Snap the *cut lines* once and build every rect off the same numbers.
    # Rounding each rect on its own — cells, corridor runs and the centre
    # each snapped independently, as this used to — leaves slivers of dead
    # floor between them where two roundings disagree: the west run ended at
    # 4.6 m while the Brahmasthāna began at 4.7 m, and layout.py duly folded
    # that 0.1 x 5 m strip into the centre, growing the sacred ninth past
    # its own scriptural proportion. Shared cut lines tile the plot exactly:
    # no sliver, no overlap, on any plot size.
    def cut(v: float) -> float:
        return round(v / UNIT) * UNIT

    xs = (0.0, cut(x0 - d), cut(x0), cut(x1), cut(x1 + d), width)
    ys = (0.0, cut(y0 - d), cut(y0), cut(y1), cut(y1 + d), height)

    def box(i: int, j: int, k: int, m: int) -> Rect:
        return Rect(xs[i], ys[j], xs[k] - xs[i], ys[m] - ys[j])

    cells = {
        "northwest": box(0, 0, 1, 1),
        "north": box(2, 0, 3, 1),
        "northeast": box(4, 0, 5, 1),
        "west": box(0, 2, 1, 3),
        "east": box(4, 2, 5, 3),
        "southwest": box(0, 4, 1, 5),
        "south": box(2, 4, 3, 5),
        "southeast": box(4, 4, 5, 5),
    }
    corridors = (
        box(1, 0, 2, 5),  # west run, wall to wall
        box(3, 0, 4, 5),  # east run
        Rect(0.0, ys[1], width, ys[2] - ys[1]),  # north run, wall to wall
        Rect(0.0, ys[3], width, ys[4] - ys[3]),  # south run
    )
    return RingPlan(cells=cells, corridors=corridors, brahmasthana=box(2, 2, 3, 3))


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
    """Every room gets its own minimum first; only what is left over is
    shared out in proportion to how much floor each would ideally like.

    Sharing the *whole* span in proportion to `_want_area` — what this did
    before — starves whichever room wants least, however much floor there
    is. A puja sharing a 4.2 x 4.7 m cell with a study got a 1.5 m strip,
    under its own 1.8 m minimum, so the split was refused and the study
    reported unplaceable: 10 m² of minimums turned away from a 19.7 m² cell.
    Taking the minimums off the top first means a cell is only ever refused
    when it genuinely cannot hold the rooms.

    Cut positions are snapped once and shared between neighbouring strips,
    rather than snapping each strip's own rect — two independently rounded
    rects either overlap or leave a sliver of dead floor between them.
    """
    span = cell.w if along_w else cell.h
    cross = cell.h if along_w else cell.w
    start = cell.x if along_w else cell.y

    # What each room needs off the top: enough of the span to clear both its
    # minimum side and its minimum area, plus one grid step so snapping the
    # cut can't shave it back under.
    floors: list[float] = []
    for kind in kinds:
        ideal = IDEAL_SIZE[kind]
        if cross + EPS < ideal.min_side:
            return None  # too narrow across to seat this room at any length
        floors.append(max(ideal.min_side, ideal.min_area / cross) + UNIT)
    surplus = span - sum(floors)
    if surplus < -EPS:
        return None

    weights = [_want_area(k) for k in kinds]
    total = sum(weights)

    cuts = [start]
    acc = 0.0
    for floor, w in zip(floors[:-1], weights[:-1]):
        acc += floor + surplus * (w / total)
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


#: For the four edge cells, the axis a shared cell MUST be cut along if every
#: strip is still to reach the outer wall. An edge cell owns one piece of the
#: perimeter — the north cell's is the top wall, the east cell's is the right
#: wall — so the cuts have to run *across* that wall, not parallel to it: cut
#: the east cell down its width and the inner strip touches no outside wall
#: at all and can never be given a window (`building.py` only puts windows in
#: perimeter walls). The four corner cells own a piece of two walls, so either
#: axis leaves every strip on one of them, and they keep the free choice.
_PERIMETER_AXIS: dict[str, bool] = {"north": True, "south": True, "east": False, "west": False}


def _split_cell(cell: Rect, kinds: list[str], zone: str | None = None) -> list[Rect] | None:
    """Share one cell between rooms. Returns None if a resulting strip is too
    small for its room — the caller then sheds a room and retries, rather
    than handing back a 1.2 m² "bedroom".

    On a corner cell both axes are tried, longer side first: splitting only
    the long way looks natural but fails cases the short way handles easily
    — a 4.2x3.8 m cell cut the long way gives two 2.1 m-wide strips, too
    narrow for any bedroom, while cutting it the short way seats a bedroom
    and a toilet comfortably. An edge cell has no such freedom: only
    `_PERIMETER_AXIS` keeps every strip on the outer wall, so the other axis
    is not tried at all. A room with no outside wall is a worse answer than
    a room this cell couldn't seat — the caller can still place it elsewhere.
    """
    if not kinds:
        return []
    if len(kinds) == 1:
        return [cell] if _fits(cell, kinds[0]) else None
    forced = _PERIMETER_AXIS.get(zone) if zone else None
    if forced is not None:
        return _split_along(cell, kinds, forced)
    first = cell.w >= cell.h
    return _split_along(cell, kinds, first) or _split_along(cell, kinds, not first)


@dataclass(frozen=True)
class EntranceHall:
    """The open floor the main door opens into.

    The corridor "#" already reaches all four outer walls, so one of its runs
    always meets the facing wall head-on — that run is the hallway the door
    leads into. Its mouth alone is not enough, though: a run is
    ``layout.CORRIDOR_W`` wide, narrower than the door leaf itself, so the
    mouth is widened to a real lobby (``FOYER_W`` x ``FOYER_D``) by taking a
    bite out of the ring cell beside it. ``blocked`` is that bite, per zone,
    which ``ring_layout`` takes as ``reserved`` — the point being that the
    main door's own area is spoken for *before* a single room is placed, so
    no room can ever end up behind the front door.
    """

    run: Rect
    lobby: Rect
    blocked: tuple[tuple[str, Rect], ...]


def face_runs(plan: RingPlan, facing: CardinalWall) -> tuple[Rect, Rect]:
    """The two corridor runs that meet the facing wall head-on. A run
    parallel to that wall only grazes it at its far end; the perpendicular
    pair is what you actually walk in along."""
    west, east, north, south = plan.corridors
    return (west, east) if facing in ("north", "south") else (north, south)


def _clip(cell: Rect, cut: Rect) -> Rect | None:
    x0, y0 = max(cell.x, cut.x), max(cell.y, cut.y)
    x1 = min(cell.x + cell.w, cut.x + cut.w)
    y1 = min(cell.y + cell.h, cut.y + cut.h)
    if x1 - x0 <= EPS or y1 - y0 <= EPS:
        return None
    return Rect(x0, y0, x1 - x0, y1 - y0)


def entrance_halls(
    plan: RingPlan,
    facing: CardinalWall,
    width: float,
    height: float,
    want_w: float = FOYER_W,
    depth: float = FOYER_D,
) -> tuple[EntranceHall, ...]:
    """Both ways to open the mouth up — widened low along the wall, widened
    high — best-pada side first.

    Of the two runs reaching the facing wall, the one nearer the wall's
    best-sourced entrance pada is used, so the door still sits as close to
    its classical cell as a door that actually opens into the house can.
    Which *side* the widening's bite comes out of is a different question:
    it decides whether the ring cell next to it keeps the depth a master
    bedroom needs, and the geometry alone can't tell — a cell that looks
    generous may be the only one a big room still fits in. So both are
    offered and the caller lays the floor out with each, keeping whichever
    costs fewer rooms (see ``layout.build_floor``).
    """
    along_max = width if facing in ("north", "south") else height
    padas = entrance_padas(facing, width, height)
    want_along = padas[0][0] if padas else along_max / 2

    run = min(face_runs(plan, facing), key=lambda r: abs(sum(face_span(facing, r)) / 2 - want_along))
    lo, hi = face_span(facing, run)
    grow = max(0.0, min(want_w, along_max) - (hi - lo))

    # Never deeper than the outer band it is cut from: past that the lobby
    # would be reaching into the corridor cross-band it already opens onto.
    band = {
        "north": plan.cells["north"].h, "south": plan.cells["south"].h,
        "west": plan.cells["west"].w, "east": plan.cells["east"].w,
    }[facing]
    d = max(UNIT, min(depth, band))

    out: list[EntranceHall] = []
    seen: set[tuple[float, float, float, float]] = set()
    for low in (want_along < (lo + hi) / 2, want_along >= (lo + hi) / 2):
        lo2 = max(0.0, lo - grow) if low else lo
        hi2 = hi if low else min(along_max, hi + grow)
        # A side with no plot left hands its share back to the other.
        short = grow - ((lo - lo2) + (hi2 - hi))
        if short > 1e-9:
            lo2, hi2 = max(0.0, lo2 - short), min(along_max, hi2 + short)
        hall = _hall_at(plan, facing, width, height, lo2, hi2, d, run)
        key = (hall.lobby.x, hall.lobby.y, hall.lobby.w, hall.lobby.h)
        if key not in seen:
            seen.add(key)
            out.append(hall)
    return tuple(out)


def _hall_at(
    plan: RingPlan, facing: CardinalWall, width: float, height: float,
    lo: float, hi: float, depth: float, run: Rect,
) -> EntranceHall:
    span = hi - lo
    if facing == "north":
        lobby = Rect(lo, 0.0, span, depth)
    elif facing == "south":
        lobby = Rect(lo, height - depth, span, depth)
    elif facing == "west":
        lobby = Rect(0.0, lo, depth, span)
    else:
        lobby = Rect(width - depth, lo, depth, span)
    lobby = snap(lobby)
    blocked = tuple(
        (zone, bite) for zone, cell in plan.cells.items() if (bite := _clip(cell, lobby))
    )
    return EntranceHall(run=run, lobby=lobby, blocked=blocked)


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
    reserved: dict[str, list[Rect]] | None = None,
    keep_clear: Rect | None = None,
) -> tuple[SolveResult, RingPlan]:
    """Assign every space to a compass cell, then share each cell out.

    `reserved` maps a zone id to the rects already taken inside that cell —
    the stair shaft (which has to land on the same footprint on every
    storey) and the entrance lobby (see `entrance_halls`). Each is carved off
    before the cell is shared, and what's left is what rooms may claim.

    `keep_clear` is floor no *side band* may swallow: a band claim
    (`_claim_span`) takes the bounding box of two cells, corridor run and
    all, so without this the entrance hall could be absorbed whole by one
    oversized room and the main door would once again open into it.
    """
    plan = ring_plan(width, height, corridor_w)
    taken = reserved or {}

    # What each cell has left once the stair and the entrance lobby have
    # taken their bite — capacity *and* shape, since a cell can be reduced
    # to a strip too narrow for a room its raw thirds would have fitted.
    usable: dict[str, Rect | None] = {}
    free: dict[str, float] = {}
    for zone, cell in plan.cells.items():
        room_for: Rect | None = cell
        for cut in taken.get(zone, ()):
            if room_for is None:
                break
            room_for = _remainder(room_for, cut)
        usable[zone] = room_for
        free[zone] = room_for.w * room_for.h if room_for else 0.0

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
            cell = usable[zone]
            if cell is None or min(cell.w, cell.h) + EPS < IDEAL_SIZE[space.kind].min_side:
                continue
            if free[zone] + EPS < need:
                continue
            # A cell nothing has claimed yet beats one already shared, even
            # when the shared one has a hair more floor left: `free` counts
            # only the *minimums* booked into a cell, so a cell holding a
            # room can read as emptier than a wholly untouched one and win by
            # centimetres. That is how a 16 m² corner cell stayed empty while
            # two other cells each took a second room and squeezed both.
            key = (_zone_rank(space.kind, zone, mode), 1 if buckets[zone] else 0, -free[zone])
            if best_key is None or key < best_key:
                best, best_key = zone, key
        if best is None:
            # Too big for any one cell — try a side band before giving up.
            span = _claim_span(space, plan, free, taken, mode, keep_clear)
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
        cell = usable[zone]
        members = sorted(members, key=lambda s: _priority(s.kind))
        while members:
            rects = _split_cell(cell, [s.kind for s in members], zone) if cell is not None else None
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
    taken: dict[str, list[Rect]],
    mode: str,
    keep_clear: Rect | None = None,
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
        # A band spans the corridor run between its two cells, so it can
        # cover the entrance hall even though neither cell was reserved.
        if keep_clear is not None and overlap_area(rect, keep_clear) > EPS:
            continue
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
