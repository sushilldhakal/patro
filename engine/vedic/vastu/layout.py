"""Room placement — the core port of ``src/lib/house-plan/engine.ts``.

Same function boundaries, same order, same names (snake_cased) as the
source, so a future diff against ``engine.ts`` is easy to follow. Includes
this session's own connectivity fixes (``seal_circulation``/
``ensure_reachable``) and blob fix (``try_merge_into_neighbor``) — ported
as-shipped, not re-derived.
"""

from __future__ import annotations

from dataclasses import dataclass

from . import architecture as arch
from . import zone_rules
from .architecture import IDEAL_SIZE, box_fits, expand_planned_spaces, life_zone_of, resolve_storey
from .entrance import foyer_rect, toilet_forbidden
from .geometry import Rect, largest, overlap_area, shared_seg, split_by
from .rooms import HouseRequirement, PlannedSpace
from .types import BuildingLayer, CardinalWall, FloorConcept, HouseConcept, PlanConflict, PlannedDoor, PlannedRoom, StairShaft

STAIR_W = 1.25
STAIR_L = 2.5
NOTCH = 1.1
MERGE_EPS = 0.05

DOOR_W = 0.9
WET_DOOR_W = 0.75

ZoneId = str  # "nw" | "n" | "ne" | "w" | "e" | "sw" | "s" | "se"

ZONE_DIR: dict[ZoneId, str] = {
    "nw": "northwest", "n": "north", "ne": "northeast", "w": "west",
    "e": "east", "sw": "southwest", "s": "south", "se": "southeast",
}
CORNER_ZONES: tuple[ZoneId, ...] = ("nw", "ne", "sw", "se")


def facing_zone(facing: CardinalWall) -> ZoneId:
    return {"east": "e", "west": "w", "north": "n", "south": "s"}[facing]


@dataclass(frozen=True)
class Mandala:
    notch: float
    center: Rect
    cells: dict[ZoneId, Rect]


def mandala(width: float, height: float) -> Mandala:
    xs = [0, width / 3, 2 * width / 3, width]
    ys = [0, height / 3, 2 * height / 3, height]
    notch = min(NOTCH, xs[1] * 0.28, ys[1] * 0.28)
    center = Rect(xs[1], ys[1], xs[2] - xs[1], ys[2] - ys[1])
    cells = {
        "nw": Rect(xs[0], ys[0], xs[1] - xs[0], ys[1] - ys[0]),
        "n": Rect(xs[1], ys[0], xs[2] - xs[1], ys[1] - ys[0]),
        "ne": Rect(xs[2], ys[0], xs[3] - xs[2], ys[1] - ys[0]),
        "w": Rect(xs[0], ys[1], xs[1] - xs[0], ys[2] - ys[1]),
        "e": Rect(xs[2], ys[1], xs[3] - xs[2], ys[2] - ys[1]),
        "sw": Rect(xs[0], ys[2], xs[1] - xs[0], ys[3] - ys[2]),
        "s": Rect(xs[1], ys[2], xs[2] - xs[1], ys[3] - ys[2]),
        "se": Rect(xs[2], ys[2], xs[3] - xs[2], ys[3] - ys[2]),
    }
    return Mandala(notch, center, cells)


def notches(center: Rect, n: float) -> list[Rect]:
    return [
        Rect(center.x - n, center.y - n, n, n),
        Rect(center.x + center.w, center.y - n, n, n),
        Rect(center.x - n, center.y + center.h, n, n),
        Rect(center.x + center.w, center.y + center.h, n, n),
    ]


def _clip_t(t: float) -> float:
    return min(0.82, max(0.18, t))


def add_door(room: PlannedRoom, wall: str, t: float, connects_to: str, width: float = DOOR_W) -> PlannedDoor:
    door = PlannedDoor(
        id=f"door_{room.id}_{wall}_{len(room.doors)}",
        room_id=room.id,
        wall=wall,
        t=_clip_t(t),
        width=width,
        swing="in_right" if wall in ("n", "w") else "in_left",
        connects_to=connects_to,
    )
    room.doors.append(door)
    return door


def make_room(space: PlannedSpace, rect: Rect, storey: int, region: str) -> PlannedRoom:
    return PlannedRoom(
        id=f"{space.id}_f{storey}",
        kind=space.kind,
        index=space.index,
        floor=storey,
        rect=rect,
        life=life_zone_of(space.kind),
        vastu_region=region,
        doors=[],
        windows=[],
        adjacent_to=[],
    )


def wet_footprint(kind: str) -> tuple[float, float]:
    """(short, long) side lengths."""
    if kind == "toilet":
        return (1.0, 1.5)
    size = IDEAL_SIZE[kind]
    return (size.min_side, max(size.min_side, size.min_area / size.min_side))


def pin_toilet(cell: Rect, w: float, h: float, zone: ZoneId, avoid: list[Rect] | None = None) -> Rect:
    avoid = avoid or []
    tw, th = min(w, cell.w), min(h, cell.h)
    spots = [
        Rect(cell.x + cell.w - tw, cell.y + cell.h - th, tw, th),
        Rect(cell.x, cell.y + cell.h - th, tw, th),
        Rect(cell.x + cell.w - tw, cell.y, tw, th),
        Rect(cell.x, cell.y, tw, th),
    ]
    clear = next((s for s in spots if all(overlap_area(s, a) < 0.08 for a in avoid)), None)
    if clear:
        return clear
    if zone in ("nw", "w", "s", "e"):
        return Rect(cell.x, cell.y + cell.h - th, tw, th)
    return spots[0]


def attach_toilet(host: PlannedRoom, wet: PlannedSpace, storey: int, rooms: list[PlannedRoom]) -> PlannedRoom | None:
    if toilet_forbidden(host.vastu_region):
        return None
    if host.vastu_region not in ("south", "northwest", "west"):
        return None
    r = host.rect
    short, long = wet_footprint(wet.kind)
    host_min = IDEAL_SIZE[host.kind].min_side
    upright = r.h >= long and r.w - short >= host_min
    tw, th = (short, long) if upright else (long, short)
    if r.w < tw + host_min and r.h < th + host_min:
        return None
    west = host.vastu_region in ("south", "northwest")
    south = host.vastu_region in ("south", "northwest", "west")
    bath = Rect(
        r.x if west else r.x + r.w - tw,
        r.y + r.h - th if south else r.y,
        tw, th,
    )
    pieces = split_by(r, bath, min_side=0.02)
    remain = largest(pieces)
    if not remain or not box_fits(remain.w, remain.h, IDEAL_SIZE[host.kind]):
        return None
    add_leftovers(rooms, pieces, remain, host.id, storey, False, min_side=0.02)
    host.rect = remain
    room = make_room(wet, bath, storey, host.vastu_region)
    add_door(room, "e" if west else "w", 0.55, host.id, WET_DOOR_W)
    return room


def wet_rect_in_cell(cell: Rect, kind: str, zone: ZoneId, avoid: list[Rect] | None = None) -> Rect:
    short, long = wet_footprint(kind)
    horizontal = cell.w >= long and cell.h >= short and cell.h < long
    tw = long if horizontal else min(cell.w, max(short, long if horizontal else short))
    th = short if horizontal else min(cell.h, long)
    if not box_fits(tw, th, IDEAL_SIZE[kind]):
        return cell
    return pin_toilet(cell, tw, th, zone, avoid)


def is_wet(kind: str) -> bool:
    return kind in ("toilet", "bathroom", "combined")


def place_foyer(
    rooms: list[PlannedRoom], foyer: Rect, storey: int, facing: CardinalWall
) -> tuple[PlannedRoom | None, list[PlannedSpace]]:
    """Carve the entrance foyer's footprint out of whatever it lands on,
    returning the foyer room (or None if a real room in its way can't be
    carved down to its own minimum — see the `hits` loop below) plus any
    wet rooms that had to be dropped entirely for the same reason. A wet
    room that can't be carved down to its own minimum is *removed*, not
    left at its original size: leaving it in place would silently overlap
    the foyer instead of reporting a real placement conflict."""
    dropped: list[PlannedSpace] = []
    for room in list(rooms):
        if not is_wet(room.kind) or overlap_area(room.rect, foyer) < 0.08:
            continue
        pieces = split_by(room.rect, foyer, min_side=0.02)
        keep = largest([p for p in pieces if box_fits(p.w, p.h, IDEAL_SIZE[room.kind])])
        if keep:
            add_leftovers(rooms, pieces, keep, room.id, storey, False, min_side=0.02)
            room.rect = keep
        else:
            rooms.remove(room)
            dropped.append(PlannedSpace(id=room.id, kind=room.kind, index=room.index))
            add_leftovers(rooms, pieces, None, room.id, storey, False, min_side=0.02)

    hits = [
        r for r in rooms
        if not is_wet(r.kind) and r.life not in ("circulation", "outdoor") and overlap_area(r.rect, foyer) >= 0.15
    ]
    carved: list[tuple[PlannedRoom, Rect, list[Rect]]] = []
    for hit in hits:
        pieces = split_by(hit.rect, foyer, min_side=0.02)
        remain = largest(pieces)
        if not remain or not box_fits(remain.w, remain.h, IDEAL_SIZE[hit.kind]):
            return None, dropped
        carved.append((hit, remain, pieces))
    for room, remain, pieces in carved:
        add_leftovers(rooms, pieces, remain, room.id, storey, False, min_side=0.02)
        room.rect = remain

    for room in list(rooms):
        if room.kind != "brahmasthan":
            continue
        if overlap_area(room.rect, foyer) < 0.15:
            continue
        # min_side=0.02, not the usual 0.9: a fragment too thin to be its own
        # sensible room is still real floor area, and dropping it here (as
        # this used to, at the default 0.9 threshold) either leaves an
        # unwalled-off gap next to the foyer or, if it was this room's only
        # surviving piece, deletes the room's entire remaining area outright.
        pieces = split_by(room.rect, foyer, min_side=0.02)
        keep = largest(pieces)
        if not keep:
            rooms.remove(room)
            continue
        room.rect = keep
        add_leftovers(rooms, pieces, keep, room.id, storey, room.life == "outdoor", min_side=0.02)

    foyer_room = PlannedRoom(
        id=f"foyer_{storey}" if storey == 0 else f"landing_{storey}",
        kind="foyer" if storey == 0 else "landing",
        floor=storey,
        rect=foyer,
        life="circulation",
        vastu_region=ZONE_DIR[facing_zone(facing)],
        doors=[], windows=[], adjacent_to=[],
    )
    rooms.append(foyer_room)
    return foyer_room, dropped


def connect_foyer(foyer_room: PlannedRoom, rooms: list[PlannedRoom]) -> None:
    open_rooms = [r for r in rooms if r.id != foyer_room.id and r.life in ("circulation", "outdoor")]
    door_onto_open(foyer_room, open_rooms)
    if foyer_room.doors:
        return
    hosts = sorted(
        (
            r for r in rooms
            if not is_wet(r.kind) and r.life not in ("circulation", "outdoor") and shared_seg(r.rect, foyer_room.rect)
        ),
        key=lambda s: 0 if s.kind in ("dining", "living") else 1,
    )
    if not hosts:
        return
    host = hosts[0]
    dx = host.rect.x + host.rect.w / 2 - (foyer_room.rect.x + foyer_room.rect.w / 2)
    dy = host.rect.y + host.rect.h / 2 - (foyer_room.rect.y + foyer_room.rect.h / 2)
    if abs(dx) > abs(dy):
        wall = "e" if dx > 0 else "w"
    else:
        wall = "s" if dy > 0 else "n"
    add_door(foyer_room, wall, 0.5, host.id)


def pick_zone(kind: str, free: list[ZoneId], mode: str, fits) -> tuple[ZoneId, bool] | None:
    preferred = [d for d in zone_rules.allowed_regions(kind, "strict") if any(ZONE_DIR[z] == d for z in free)]
    acceptable = [d for d in zone_rules.allowed_regions(kind, mode) if d not in preferred]

    def rank(ids: list[str]) -> list[ZoneId]:
        candidates = [z for z in free if ZONE_DIR[z] in ids and fits(z)]
        return sorted(candidates, key=lambda z: zone_rules.vastu_cost(kind, ZONE_DIR[z], mode)[0])

    best = rank(preferred)
    if best:
        return (best[0], False)
    nxt = rank(acceptable)
    if nxt:
        return (nxt[0], mode == "strict")
    return None


def door_onto_open(room: PlannedRoom, open_rooms: list[PlannedRoom]) -> None:
    """Door a room onto whichever open space it shares the longest wall
    with, biggest first — area (not id) tells a real hub apart from a
    carve's small leftover sliver."""
    if room.doors:
        return
    ranked = sorted(open_rooms, key=lambda s: -(s.rect.w * s.rect.h))
    for space in ranked:
        seg = shared_seg(room.rect, space.rect)
        if seg:
            add_door(room, seg.wall, 0.5, space.id)
            return


def seal_circulation(rooms: list[PlannedRoom]) -> None:
    """Every *connected cluster* of open space needs at least one way in
    from whatever real room it borders — not one door per fragment. Two
    open/circulation pieces sharing a wall are already walkable between
    (open-to-open, no door needed — same rule validate.py's own reachability
    check uses), so dooring every leftover notch/gap into its nearest real
    room independently just surrounds that room with redundant openings
    (a big room bordering three small leftover slivers would get three
    doors for what is really one connected hallway)."""
    hosts = [r for r in rooms if r.life not in ("circulation", "outdoor")]
    opens = [r for r in rooms if r.life in ("circulation", "outdoor")]

    parent = {r.id: r.id for r in opens}

    def find(x: str) -> str:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a: str, b: str) -> None:
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[ra] = rb

    for i in range(len(opens)):
        for j in range(i + 1, len(opens)):
            if shared_seg(opens[i].rect, opens[j].rect):
                union(opens[i].id, opens[j].id)

    clusters: dict[str, list[PlannedRoom]] = {}
    for r in opens:
        clusters.setdefault(find(r.id), []).append(r)

    for cluster in clusters.values():
        if any(r.doors for r in cluster):
            continue  # this cluster already has a way in somewhere
        # The biggest piece reads as the real hall/passage, not a decorative
        # sliver — give it the door.
        space = max(cluster, key=lambda r: r.rect.w * r.rect.h)
        for host in hosts:
            seg = shared_seg(space.rect, host.rect)
            if seg:
                add_door(space, seg.wall, 0.5, host.id)
                break


def _reachable_from(rooms: list[PlannedRoom], by_id: dict[str, PlannedRoom], root_id: str) -> set[str]:
    def is_open(r: PlannedRoom) -> bool:
        return r.life in ("circulation", "outdoor")

    seen = {root_id}
    queue = [root_id]
    while queue:
        cur = by_id.get(queue.pop())
        if not cur:
            continue
        for d in cur.doors:
            if d.connects_to != "outside" and d.connects_to not in seen:
                seen.add(d.connects_to)
                queue.append(d.connects_to)
        for r in rooms:
            if r.id in seen:
                continue
            if any(d.connects_to == cur.id for d in r.doors):
                seen.add(r.id)
                queue.append(r.id)
            elif is_open(cur) and is_open(r) and shared_seg(cur.rect, r.rect):
                seen.add(r.id)
                queue.append(r.id)
    return seen


def ensure_reachable(rooms: list[PlannedRoom], root_id: str) -> None:
    """BFS from the entrance; anything still unreached gets one more door —
    even a second one on an already-doored room — to whichever
    already-reachable neighbor it borders. Repeats: bridging one room can
    bring its whole stranded cluster in behind it."""
    by_id = {r.id: r for r in rooms}
    if root_id not in by_id:
        return
    for _ in range(len(rooms)):
        seen = _reachable_from(rooms, by_id, root_id)
        stuck = [r for r in rooms if r.id not in seen]
        if not stuck:
            return
        bridged = False
        for room in stuck:
            neighbor = next((r for r in rooms if r.id in seen and shared_seg(room.rect, r.rect)), None)
            if not neighbor:
                continue
            seg = shared_seg(room.rect, neighbor.rect)
            add_door(room, seg.wall, 0.5, neighbor.id)
            bridged = True
        if not bridged:
            return


def usable_cell(cell: Rect, cuts: list[Rect]) -> tuple[Rect, list[Rect]]:
    """The mandala's corner notches are a deliberate decorative cut, so the
    piece they clip off a neighboring zone's cell is never made part of
    that zone's own room. Returns (the largest remaining piece, every
    smaller piece cut off in the process) — callers that are only probing
    a candidate zone's size can ignore the second element, but whichever
    call actually finalizes a zone must register those smaller pieces as
    open space (see `claim_cell`), or they end up as real, unwalled-off
    gaps that no room accounts for."""
    pieces = [cell]
    for cut in cuts:
        pieces = [p for piece in pieces for p in split_by(piece, cut, min_side=0.02)]
    kept = largest(pieces) or cell
    return kept, [p for p in pieces if p is not kept]


def open_piece(id_: str, rect: Rect, storey: int, want_court: bool) -> PlannedRoom:
    return PlannedRoom(
        id=id_, kind="brahmasthan", floor=storey, rect=rect,
        life="outdoor" if want_court else "circulation", vastu_region="center",
        doors=[], windows=[], adjacent_to=[],
    )


def split_leftovers(pieces: list[Rect], keep: Rect | None, min_side: float = 0.9) -> list[Rect]:
    return [p for p in pieces if p is not keep and p.w >= min_side and p.h >= min_side]


def add_leftovers(
    rooms: list[PlannedRoom], pieces: list[Rect], keep: Rect | None, id_prefix: str, storey: int,
    want_court: bool, min_side: float = 0.9,
) -> None:
    """A carve's smaller remainder pieces — try folding each into a
    neighbor first (same rule and same courtyard exception as the
    free-zone loop's own leftover handling), so a carve doesn't scatter
    small, separately-labeled open fragments through the plan when one of
    them could cleanly extend an adjacent room or the hall instead.

    `min_side` defaults to the size below which a piece isn't worth its own
    room (matches `split_leftovers`'s own prior default exactly, so every
    existing caller is unaffected). `claim_cell` passes a much smaller
    value: a notch-clipped piece too thin to be a sensible room is still
    real floor area, and dropping it silently leaves an unwalled-off gap
    that no room accounts for — better a thin sliver of open floor than an
    unexplained hole between two walls."""
    center_id = f"center_{storey}"
    for i, rect in enumerate(split_leftovers(pieces, keep, min_side)):
        if not want_court and try_merge_into_neighbor(rooms, rect, center_id):
            continue
        rooms.append(open_piece(f"{id_prefix}_gap{i}_{storey}", rect, storey, want_court))


def is_merge_target(room: PlannedRoom) -> bool:
    return room.life not in ("circulation", "outdoor", "vertical") and room.kind not in arch.WET_KINDS


def forms_rectangle_with(r: Rect, cell: Rect) -> bool:
    same_height = abs(r.h - cell.h) < MERGE_EPS and abs(r.y - cell.y) < MERGE_EPS
    same_width = abs(r.w - cell.w) < MERGE_EPS and abs(r.x - cell.x) < MERGE_EPS
    touches_left = abs(r.x - (cell.x + cell.w)) < MERGE_EPS
    touches_right = abs(cell.x - (r.x + r.w)) < MERGE_EPS
    touches_top = abs(r.y - (cell.y + cell.h)) < MERGE_EPS
    touches_bottom = abs(cell.y - (r.y + r.h)) < MERGE_EPS
    return (same_height and (touches_left or touches_right)) or (same_width and (touches_top or touches_bottom))


def _merged_rect(r: Rect, cell: Rect) -> Rect:
    """The rect ``r`` would become after absorbing ``cell`` — matching
    whichever branch of ``forms_rectangle_with`` actually accepted this
    pair. A bare height comparison can't tell direction apart: the mandala
    divides both axes into exact thirds, so every cell shares the same
    height *and* the same width regardless of row/column — same-height
    alone is true even for a cell stacked above/below (different y), which
    would silently merge in the wrong direction and grow the rect into
    unrelated territory."""
    same_row = abs(r.h - cell.h) < MERGE_EPS and abs(r.y - cell.y) < MERGE_EPS
    if same_row:
        return Rect(min(r.x, cell.x), r.y, r.w + cell.w, r.h)
    return Rect(r.x, min(r.y, cell.y), r.w, r.h + cell.h)


def merge_rect_into(room: PlannedRoom, cell: Rect) -> None:
    room.rect = _merged_rect(room.rect, cell)


# Small slack so a merge landing a hair past `preferred` (mandala cells
# rarely divide evenly) isn't refused over a rounding difference.
_GROWTH_SLACK = 0.05


def _growth_priority(room: PlannedRoom, cell: Rect) -> tuple[int, float] | None:
    """Should a leftover mandala cell grow ``room``, and how eagerly?

    A merge that would push the room's area past its `preferred` tier is
    refused outright (returns None) — past that point the cell is better
    left as its own open/circulation space than folded into an already-
    generous room (see data/vastu_room_sizes.json's `_comment`). Among
    rooms willing to take the cell, one still below its `comfortable` tier
    is preferred over one already comfortable-or-above; ties (including
    every room whose kind carries no tier data at all — e.g. the mandala's
    own centre) fall back to the original "biggest room wins" heuristic.
    """
    merged = _merged_rect(room.rect, cell)
    merged_area = merged.w * merged.h
    tiers = arch.ROOM_SIZE_TIERS.get(room.kind)
    if tiers is not None and merged_area > tiers.preferred.area + _GROWTH_SLACK:
        return None
    below_comfortable = tiers is not None and room.rect.w * room.rect.h < tiers.comfortable.area
    return (0 if below_comfortable else 1, -merged_area)


def try_merge_into_neighbor(rooms: list[PlannedRoom], cell: Rect, center_id: str) -> bool:
    """First choice: fold into an adjacent real room, picked by
    ``_growth_priority``. Second choice (for edge zones, which are never
    notch-trimmed): grow the true centre — architecturally normal when
    there's less program to fill the zones around it, unlike a scatter of
    same-colored orphan cells. If every willing candidate is already at its
    preferred size, the cell stays unmerged and becomes its own open piece."""
    candidates = [
        (room, priority)
        for room in rooms
        if is_merge_target(room) and forms_rectangle_with(room.rect, cell)
        and (priority := _growth_priority(room, cell)) is not None
    ]
    best = min(candidates, key=lambda rp: rp[1])[0] if candidates else None
    if not best:
        center = next((r for r in rooms if r.id == center_id), None)
        if center and forms_rectangle_with(center.rect, cell) and _growth_priority(center, cell) is not None:
            best = center
    if not best:
        return False
    merge_rect_into(best, cell)
    return True


def build_floor(storey: int, program: list[PlannedSpace], site, mode: str, stair: StairShaft | None, want_court: bool) -> tuple[list[PlannedRoom], list[PlannedSpace], list[PlanConflict]]:
    grid = mandala(site.width, site.height)
    rooms: list[PlannedRoom] = []
    relaxed: list[PlanConflict] = []
    leftover: list[PlannedSpace] = []
    corner_cuts = notches(grid.center, grid.notch)

    center_id = f"center_{storey}"
    rooms.append(open_piece(center_id, grid.center, storey, want_court))
    for i, rect in enumerate(corner_cuts):
        rooms.append(open_piece(f"center_notch_{i}_{storey}", rect, storey, want_court))

    foyer = foyer_rect(site.facing, site.width, site.height, 1.35)
    free: list[ZoneId] = list(grid.cells.keys())
    majors = sorted(
        (s for s in program if s.kind not in arch.WET_KINDS and s.kind not in ("staircase", "courtyard")),
        key=lambda s: arch.PLACE_ORDER.index(s.kind) if s.kind in arch.PLACE_ORDER else len(arch.PLACE_ORDER),
    )
    wets = [s for s in program if s.kind in arch.WET_KINDS]
    used_hosts: set[str] = set()

    def cell_cuts(zone: ZoneId) -> list[Rect]:
        """Every rect this zone's usable area must exclude before anything
        gets placed in it — corner notches, plus the staircase's own
        footprint if this is its zone. Reserving the stair here, before any
        room or wet-area claims the zone, is what stops it from ever being
        handed a cell that overlaps the stair in the first place (rather
        than discovering the overlap only after the fact)."""
        cuts = [corner_cuts[CORNER_ZONES.index(zone)]] if zone in CORNER_ZONES else []
        if stair and zone == stair.host_id:
            cuts = [*cuts, stair.rect]
        return cuts

    def cell_rect(zone: ZoneId) -> Rect:
        kept, _ = usable_cell(grid.cells[zone], cell_cuts(zone))
        return kept

    def claim_cell(zone: ZoneId) -> Rect:
        """Finalize `zone`: same rect as cell_rect, but also registers
        whatever a corner-notch cut left over in it as open space. Call
        this once, only for a zone that's actually being claimed — not
        from a `fits`-style probe of a candidate that might not be picked."""
        kept, leftovers = usable_cell(grid.cells[zone], cell_cuts(zone))
        add_leftovers(rooms, leftovers, None, f"notch_{zone}", storey, want_court, min_side=0.02)
        return kept

    for space in majors:
        picked = pick_zone(space.kind, free, mode, lambda z: box_fits(cell_rect(z).w, cell_rect(z).h, IDEAL_SIZE[space.kind]))
        if not picked:
            leftover.append(space)
            continue
        zone, relaxed_flag = picked
        rect = claim_cell(zone)
        free.remove(zone)
        room = make_room(space, rect, storey, ZONE_DIR[zone])
        if relaxed_flag or zone_rules.vastu_cost(space.kind, ZONE_DIR[zone], mode)[1]:
            relaxed.append(PlanConflict(id=f"relax-{room.id}", severity="info", message_key="vastu.plan.valid.vastu_relaxed"))
        rooms.append(room)

    def place_wet_in_cell(wet: PlannedSpace) -> bool:
        def fits(z: ZoneId) -> bool:
            box = wet_rect_in_cell(cell_rect(z), wet.kind, z, [foyer])
            return not toilet_forbidden(ZONE_DIR[z]) and box_fits(box.w, box.h, IDEAL_SIZE[wet.kind])

        picked = pick_zone(wet.kind, free, mode, fits)
        if not picked or toilet_forbidden(ZONE_DIR[picked[0]]):
            return False
        zone = picked[0]
        cell = claim_cell(zone)
        rect = wet_rect_in_cell(cell, wet.kind, zone, [foyer])
        free.remove(zone)
        rooms.append(make_room(wet, rect, storey, ZONE_DIR[zone]))
        # min_side=0.02: a leftover strip around the wet room is still real
        # floor area even when it's too thin to be its own sensible room
        # (and a piece that's a hair under 0.9 only from float rounding —
        # e.g. a computed width of 0.8999999999999999 — used to be dropped
        # here outright at the old 0.9 threshold).
        add_leftovers(rooms, split_by(cell, rect, min_side=0.02), None, f"center_{zone}", storey, want_court, min_side=0.02)
        return True

    attach_later: list[PlannedSpace] = []
    for wet in wets:
        if wet.kind == "combined" and mode == "strict":
            leftover.append(wet)
            relaxed.append(PlanConflict(id=f"sep-{wet.id}", severity="info", message_key="vastu.plan.valid.wet_separate"))
            continue
        if wet.kind in ("toilet", "combined"):
            attach_later.append(wet)
            continue
        if not place_wet_in_cell(wet):
            leftover.append(wet)

    if stair:
        # The stair's own zone (cell_cuts, above) already excludes its
        # footprint from every cell computed for that zone, so nothing
        # placed through the normal zone-claiming path (majors, wet areas,
        # the free-zone loop below) can land on top of it — the stair is
        # reserved before any of that runs, not carved out after the fact.
        # This search is a defensive fallback only, for a room that somehow
        # still overlaps it (e.g. geometry this session hasn't anticipated).
        host_room = next(
            (r for r in rooms if r.life != "circulation" and r.kind not in ("staircase", "brahmasthan")
             and (_rect_contains(r.rect, stair.rect) or overlap_area(r.rect, stair.rect) > 0.4)),
            None,
        )
        if host_room:
            pieces = split_by(host_room.rect, stair.rect, min_side=0.02)
            remain = largest(pieces)
            if remain and box_fits(remain.w, remain.h, IDEAL_SIZE[host_room.kind]):
                add_leftovers(rooms, pieces, remain, host_room.id, storey, False, min_side=0.02)
                host_room.rect = remain
            else:
                # Shrinking this room to make way for the staircase would
                # take it below its own minimum — keeping it at full size
                # would silently overlap the stair instead. Drop it (it
                # comes back as an unplaced/leftover space) and reclaim
                # whatever's left of its footprint as open circulation
                # rather than losing it outright.
                rooms.remove(host_room)
                leftover.append(PlannedSpace(id=host_room.id, kind=host_room.kind, index=host_room.index))
                add_leftovers(rooms, pieces, None, host_room.id, storey, False, min_side=0.02)
        rooms.append(PlannedRoom(
            id=f"stair_{storey}", kind="staircase", floor=storey, rect=stair.rect,
            life="vertical", vastu_region=_region_of_shaft(stair.rect, grid),
            doors=[], windows=[], adjacent_to=[center_id],
        ))

    for zid in list(free):
        rect = claim_cell(zid)
        if rect.w < 0.9 or rect.h < 0.9:
            continue
        # Every zone this loop touches gets a final fate right here (merged
        # into a neighbor, or turned into its own open-piece room) — it must
        # come out of `free`, or a later fallback (e.g. the attach-later
        # toilet placement) can still see it as available and drop a room
        # into the original small mandala cell, which the merge may have
        # since absorbed into a much larger neighboring rect.
        free.remove(zid)
        if not want_court and try_merge_into_neighbor(rooms, rect, center_id):
            continue
        rooms.append(open_piece(f"center_{zid}_{storey}", rect, storey, want_court))

    boxed_foyer, foyer_dropped = place_foyer(rooms, foyer, storey, site.facing)
    leftover.extend(foyer_dropped)

    for wet in attach_later:
        done = False
        for host in rooms:
            if host.kind not in arch.HOST_KINDS or host.id in used_hosts:
                continue
            attached = attach_toilet(host, wet, storey, rooms)
            if attached:
                used_hosts.add(host.id)
                rooms.append(attached)
                done = True
                break
        if done:
            continue
        if not place_wet_in_cell(wet):
            leftover.append(wet)

    open_rooms = [r for r in rooms if r.life in ("circulation", "outdoor")]
    if boxed_foyer:
        connect_foyer(boxed_foyer, rooms)
    for room in rooms:
        if room.life in ("circulation", "outdoor"):
            continue
        door_onto_open(room, open_rooms)
    seal_circulation(rooms)
    ensure_reachable(rooms, boxed_foyer.id if boxed_foyer else center_id)

    for i in range(len(rooms)):
        for j in range(i + 1, len(rooms)):
            if shared_seg(rooms[i].rect, rooms[j].rect):
                rooms[i].adjacent_to.append(rooms[j].id)
                rooms[j].adjacent_to.append(rooms[i].id)

    return rooms, leftover, relaxed


def _rect_contains(outer: Rect, inner: Rect) -> bool:
    return (
        inner.x >= outer.x - 0.05 and inner.y >= outer.y - 0.05
        and inner.x + inner.w <= outer.x + outer.w + 0.05
        and inner.y + inner.h <= outer.y + outer.h + 0.05
    )


def _region_of_shaft(rect: Rect, grid: Mandala) -> str:
    cx, cy = rect.x + rect.w / 2, rect.y + rect.h / 2
    for zid, z in grid.cells.items():
        if z.x <= cx <= z.x + z.w and z.y <= cy <= z.y + z.h:
            return ZONE_DIR[zid]
    return "south"


def stair_on_site(site, want: bool) -> StairShaft | None:
    if not want:
        return None
    grid = mandala(site.width, site.height)
    face = facing_zone(site.facing)
    zid: ZoneId = "w" if face == "s" else "s"
    cell = grid.cells[zid]
    w = min(STAIR_W, cell.w * 0.36)
    l = min(STAIR_L, cell.h)
    if zid == "s":
        rect = Rect(cell.x + cell.w - w, cell.y, w, l)
    else:
        rect = Rect(cell.x + cell.w - w, cell.y + cell.h - l, w, l)
    return StairShaft(id="stair_shaft", rect=rect, rise="n", floors=[0, 1, 2], host_id=zid)


def build_concept(req: HouseRequirement, site) -> HouseConcept:
    from .building import compile_layer
    from .validate import validate_concept

    storeys = arch.clamp_storeys(req.storeys)
    mode = req.mode
    all_spaces = expand_planned_spaces(req)
    want_stair = storeys > 1
    stair = stair_on_site(site, want_stair)
    want_court = any(s.kind == "courtyard" for s in all_spaces)

    buckets: list[list[PlannedSpace]] = [[], [], []]
    for space in all_spaces:
        if space.kind == "staircase":
            continue
        buckets[resolve_storey(space, req)].append(space)

    floors: list[FloorConcept] = []
    leftover: list[PlannedSpace] = []
    vastu_relaxed: list[PlanConflict] = []
    overflow: list[PlannedSpace] = []

    for i in range(storeys):
        batch = [*overflow, *buckets[i]]
        overflow = []
        rooms, floor_leftover, relaxed = build_floor(i, batch, site, mode, stair, want_court)
        floors.append(FloorConcept(storey=i, rooms=rooms, layer=compile_layer(site.width, site.height, site.facing, rooms)))
        vastu_relaxed.extend(relaxed)
        overflow = floor_leftover
    leftover.extend(overflow)

    return HouseConcept(
        width=site.width, height=site.height, facing=site.facing, mode=mode,
        floors=floors, leftover=leftover, stair=stair,
        validation=validate_concept(floors, leftover, storeys),
        vastu_relaxed=vastu_relaxed,
    )


def plan_house(req: HouseRequirement, site) -> HouseConcept:
    return build_concept(req, site)
