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
from .geometry import Rect, largest, overlap_area, shared_seg, split_by, touches
from .rooms import HouseRequirement, PlannedSpace
from .ring import EntranceHall, RingPlan, entrance_halls, ring_layout, ring_plan
from .solver import (
    SolveResult,
    brahmasthana_rect,
    corridor_bands,
    dir8_zone_of_point,
    disjoint_reserved,
    solve_layout,
)
from .types import BuildingLayer, CardinalWall, FloorConcept, HouseConcept, PlanConflict, PlannedDoor, PlannedRoom, StairShaft

STAIR_W = 1.25
STAIR_L = 2.5
MERGE_EPS = 0.05

DOOR_W = 0.9

ZoneId = str  # "nw" | "n" | "ne" | "w" | "e" | "sw" | "s" | "se"

ZONE_DIR: dict[ZoneId, str] = {
    "nw": "northwest", "n": "north", "ne": "northeast", "w": "west",
    "e": "east", "sw": "southwest", "s": "south", "se": "southeast",
}


def facing_zone(facing: CardinalWall) -> ZoneId:
    return {"east": "e", "west": "w", "north": "n", "south": "s"}[facing]


CORRIDOR_W = 0.85  # target connector width — comfortably walkable, but every zone now gives up this width (not just the 4 edge zones), so it's kept modest rather than a full ~1m hallway


@dataclass(frozen=True)
class Mandala:
    """The 9-zone (8 outer + centre) mandala, subdividing the plot the same
    way it always has — but now with a real alindra: a continuous gallery
    ringing the centre (Brahmasthān) that every one of the 8 zones shares a
    real wall with directly, not just the 4 that happen to sit on an axis
    through it. Classical treatises (Mayamata etc.) describe exactly this —
    galleries encircling the open central courtyard, not a hallway reaching
    only partway — and it's what makes the geometry actually robust: a
    corner zone with only *one* connecting wall (this file's earlier
    "spoke" design) can be landlocked by a single unlucky carve; a zone
    bordering a continuous ring on multiple sides can't be, because losing
    one connection still leaves others.

    Every zone gives up a thin strip (`CORRIDOR_W`, capped so it can't eat
    an unreasonable share of a small plot) off whichever inner edge faces
    the centre — the 4 edge zones (n/s/e/w) lose depth on one axis same as
    before; the 4 corner zones now do too, always along the same axis as
    their nearest N/S neighbour, which is what makes every strip land
    exactly edge-to-edge with its neighbours (verified directly) instead of
    only touching at a corner point — one continuous ring, not four
    separate dead-end spokes. `cells` needs no further carving — no corner
    notch, nothing to split before a room can claim it."""

    corridor: list[Rect]
    cells: dict[ZoneId, Rect]


def mandala(width: float, height: float) -> Mandala:
    x1, x2 = width / 3, 2 * width / 3
    y1, y2 = height / 3, 2 * height / 3
    center = Rect(x1, y1, x2 - x1, y2 - y1)
    cw = min(CORRIDOR_W, x1 * 0.3)
    ch = min(CORRIDOR_W, y1 * 0.3)

    corridor = [
        center,
        Rect(0, y1 - ch, width, ch),  # full-width band off N/NW/NE's inner edge
        Rect(0, y2, width, ch),  # full-width band off S/SW/SE's inner edge
        Rect(x1 - cw, y1, cw, y2 - y1),  # off W's inner edge — meets both bands above
        Rect(x2, y1, cw, y2 - y1),  # off E's inner edge — meets both bands above
    ]
    cells = {
        "nw": Rect(0, 0, x1, y1 - ch),
        "n": Rect(x1, 0, x2 - x1, y1 - ch),
        "ne": Rect(x2, 0, width - x2, y1 - ch),
        "w": Rect(0, y1, x1 - cw, y2 - y1),
        "e": Rect(x2 + cw, y1, width - x2 - cw, y2 - y1),
        "sw": Rect(0, y2 + ch, x1, height - y2 - ch),
        "s": Rect(x1, y2 + ch, x2 - x1, height - y2 - ch),
        "se": Rect(x2, y2 + ch, width - x2, height - y2 - ch),
    }
    return Mandala(corridor, cells)


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


def min_footprint(kind: str) -> tuple[float, float]:
    """(short, long) side lengths for a kind's minimum footprint — a toilet's
    real minimum isn't well captured by its own (small) min_side/min_area
    pair, so it keeps the same explicit override `wet_footprint` always
    used; every other kind derives its footprint from IDEAL_SIZE."""
    if kind == "toilet":
        return (1.0, 1.5)
    size = IDEAL_SIZE[kind]
    return (size.min_side, max(size.min_side, size.min_area / size.min_side))


def is_wet(kind: str) -> bool:
    return kind in ("toilet", "bathroom", "combined")


def extra_rect_candidates(donor_rect: Rect, extra_kind: str) -> list[Rect]:
    """Candidate placements for `extra_kind`'s footprint in `donor_rect`'s
    bottom-right corner — same corner convention `attach_toilet`'s own `bath`
    rect uses — most space-efficient first. The caller still has to
    `split_by`/`box_fits`-check each candidate's donor remainder, same as
    `attach_toilet` does for its ensuite carve; this only proposes "where."

    Tried in order:
    1-2. A snug corner cut sized to the new room's own minimum, in both
       orientations — wastes the least donor area, so it's tried first.
    3-4. A full-width or full-height strip — needed when the donor is too
       narrow in one axis for *any* corner cut to leave it a valid
       remainder (a strip is the only shape that still leaves the donor a
       full-length piece along that axis)."""
    r = donor_rect
    short, long = min_footprint(extra_kind)
    extra_ideal = IDEAL_SIZE[extra_kind]
    out: list[Rect] = []
    seen: set[tuple[float, float]] = set()

    def add(tw: float, th: float) -> None:
        tw, th = min(tw, r.w), min(th, r.h)
        key = (round(tw, 3), round(th, 3))
        if tw <= 0 or th <= 0 or key in seen:
            return
        seen.add(key)
        out.append(Rect(r.x + r.w - tw, r.y + r.h - th, tw, th))

    add(short, long)
    add(long, short)
    if r.w > 0:
        add(r.w, max(extra_ideal.min_side, extra_ideal.min_area / r.w))
    if r.h > 0:
        add(max(extra_ideal.min_side, extra_ideal.min_area / r.h), r.h)
    return [c for c in out if box_fits(c.w, c.h, extra_ideal)]


def place_foyer(
    rooms: list[PlannedRoom], foyer: Rect, storey: int, facing: CardinalWall
) -> tuple[PlannedRoom | None, list[PlannedSpace]]:
    """Carve the entrance foyer's footprint out of whatever it lands on,
    returning the foyer room plus any rooms that had to be dropped entirely
    because they couldn't be carved down to their own minimum (e.g. the
    foyer's target sits in the *middle* of a room's span rather than
    flush with an edge, splitting it into two pieces neither big enough on
    its own). A room that can't be carved down is *removed*, not left at
    its original size (silently overlapping the foyer) and not allowed to
    block the foyer for the whole floor either — the earlier shape of this
    function aborted the entire foyer placement the moment *any* one hit
    failed, which meant no foyer at all and the main entrance falling back
    to whatever room happened to touch the facing wall instead (routinely a
    bedroom) — worse than dropping the one room that didn't fit."""
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
        if not is_wet(r.kind)
        # A named, sized room (IDEAL_SIZE has an entry for it) still needs
        # the strict box_fits carve below even when its `life` reads as
        # circulation/outdoor for wall/door purposes — "living" (open-plan,
        # but still a real room with its own minimum size) is exactly this
        # case: excluding every circulation/outdoor room here used to also
        # exclude it, so its rect never got trimmed for the foyer and ended
        # up overlapping it outright. Only the truly generic open-floor
        # pieces (brahmasthan, hall, landing, foyer, verandah — none of
        # which carry their own IDEAL_SIZE) still skip to the looser loop
        # below.
        and (r.life not in ("circulation", "outdoor") or r.kind in IDEAL_SIZE)
        and overlap_area(r.rect, foyer) >= 0.15
    ]
    carved: list[tuple[PlannedRoom, Rect, list[Rect]]] = []
    for hit in hits:
        pieces = split_by(hit.rect, foyer, min_side=0.02)
        remain = largest(pieces)
        if not remain or not box_fits(remain.w, remain.h, IDEAL_SIZE[hit.kind]):
            rooms.remove(hit)
            dropped.append(PlannedSpace(id=hit.id, kind=hit.kind, index=hit.index))
            add_leftovers(rooms, pieces, None, hit.id, storey, False, min_side=0.02)
            continue
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
    """The foyer is life="circulation" (open) itself, so if it already
    shares a real wall with another open/circulation fragment (the corridor,
    a leftover carve scrap, the courtyard) the two are already one walkable
    open floor — exactly the rule every other open-to-open pair in this file
    follows (see the main placement loop's own `if room.life in
    ("circulation", "outdoor"): continue` before it calls `door_onto_open`
    on anything else). This used to call `door_onto_open` unconditionally,
    which doors the foyer onto the *biggest* open neighbor regardless of
    whether that connection already existed for free — producing a real,
    rendered interior door immediately next to the actual entrance for no
    reason (a leftover carve fragment right behind the foyer routinely
    triggered this). Only a foyer boxed in by nothing but closed rooms
    genuinely needs a door, which is what the host fallback below is for."""
    open_rooms = [r for r in rooms if r.id != foyer_room.id and r.life in ("circulation", "outdoor")]
    if any(shared_seg(foyer_room.rect, o.rect) for o in open_rooms):
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
            if touches(opens[i].rect, opens[j].rect):
                union(opens[i].id, opens[j].id)

    clusters: dict[str, list[PlannedRoom]] = {}
    for r in opens:
        clusters.setdefault(find(r.id), []).append(r)

    # A cluster already has a way in not only when one of its own pieces
    # holds an outgoing door, but also when some *other* room already doors
    # *into* it — door_onto_open or carve_extra_room routinely give a real
    # room its one door straight to a cluster this loop hasn't looked at
    # yet. Checking only outgoing doors (the cluster's own `r.doors`) missed
    # that half entirely: a cluster puja/store/combined already opened onto
    # still read as "no way in" and got handed a second, redundant entrance
    # into the very room that already had one.
    with_a_door_touching = {d.connects_to for r in rooms for d in r.doors} | {r.id for r in rooms if r.doors}

    for cluster in clusters.values():
        if any(r.id in with_a_door_touching for r in cluster):
            continue  # this cluster already has a way in somewhere
        # A leftover sliver too thin to be a real, walked-through space
        # (this session's own add_leftovers calls register scraps down to
        # 0.02m) doesn't need a door of its own — it's dead structural
        # space, not a room, and doesn't owe its host a second doorway.
        if sum(r.rect.w * r.rect.h for r in cluster) < 0.3:
            continue
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
            # A real shared wall only — NOT `touches`'s corner-only case.
            # `touches` is right for seal_circulation's "does this cluster
            # already have a way in" question (a redundant extra door is
            # merely wasteful), but wrong here: a mere corner touch has no
            # actual opening in it, so treating it as walkable let this BFS
            # (and validate.py's own reachability check, which mirrors it)
            # wrongly certify a room reachable through a connection nobody
            # could actually walk through, which then stopped
            # ensure_reachable's bridging from ever firing to fix it for
            # real.
            elif is_open(cur) and is_open(r) and shared_seg(cur.rect, r.rect):
                seen.add(r.id)
                queue.append(r.id)
    return seen


def ensure_reachable(rooms: list[PlannedRoom], root_id: str) -> None:
    """BFS from the entrance; anything still unreached gets bridged in, one
    bridge at a time, rechecking reachability before picking the next one —
    bridging a single connection routinely brings its whole stranded
    cluster along for free (every real room that already doors into it),
    so a later "stuck" room in the same batch often stops needing its own
    bridge at all once an earlier one lands; bridging every originally-stuck
    room in one blind pass (this function's own earlier shape) missed that
    and hung a redundant, unearned second door on rooms an earlier bridge
    had already reconnected.

    Two disconnected pockets of open/circulation space (the true mandala
    centre and some other leftover-fragment cluster elsewhere in the house,
    say) routinely still share a real wall (`shared_seg`, not just
    `touches`'s corner-only case) even though neither's own cluster union
    caught it. Bridging exactly that open-to-open wall reconnects both
    pockets — and with them every real room already doored into either one
    — without touching any of those real rooms at all, so it's tried before
    ever falling back to landing a bridge door on a real (private/service)
    room, which does mean a second door that room hasn't earned the way an
    ensuite or balcony has."""

    def is_open(r: PlannedRoom) -> bool:
        return r.life in ("circulation", "outdoor")

    by_id = {r.id: r for r in rooms}
    if root_id not in by_id:
        return
    for _ in range(len(rooms) * 2):
        seen = _reachable_from(rooms, by_id, root_id)
        stuck = [r for r in rooms if r.id not in seen]
        if not stuck:
            return
        reached_opens = [r for r in rooms if r.id in seen and is_open(r)]
        bridge = next(
            (
                (room, neighbor)
                for room in stuck
                if is_open(room)
                for neighbor in reached_opens
                if shared_seg(room.rect, neighbor.rect)
            ),
            None,
        )
        if not bridge:
            bridge = next(
                (
                    (room, neighbor)
                    for room in stuck
                    # A stuck circulation *fragment* with no reachable open
                    # neighbor (the branch above) is exempt from needing a
                    # door at all — it's decorative floor, not a room anyone
                    # asked for, so it's left dead rather than forcing a real
                    # (private/service) room into an unearned second door
                    # just to rescue a scrap nobody needs to walk through.
                    # But "living" is exactly this same life="circulation"
                    # (open-plan, no wall/door of its own) while still being
                    # a real, named, sized room someone explicitly asked
                    # for — kind in IDEAL_SIZE tells the two apart, matching
                    # place_foyer's own carve-eligibility check. Skipping it
                    # here left living permanently sealed with no way in at
                    # all whenever it didn't happen to touch open floor.
                    if room.life != "circulation" or room.kind in IDEAL_SIZE
                    for neighbor in rooms
                    if neighbor.id in seen and shared_seg(room.rect, neighbor.rect)
                ),
                None,
            )
        if not bridge:
            return
        room, neighbor = bridge
        seg = shared_seg(room.rect, neighbor.rect)
        add_door(room, seg.wall, 0.5, neighbor.id)


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


#: A remainder of a split strip narrower than this is not worth leaving as its
#: own scrap of floor — better to leave the whole strip alone than to trade one
#: dead passage for a thinner one. Matches ``shared_seg``'s own minimum useful
#: wall length, below which two rects don't even count as touching.
_MIN_REMAINDER = 0.45


def _reclaim_priority(room: PlannedRoom, merged: Rect) -> tuple[int, float]:
    """Rank the rooms willing to swallow a dead corridor strip: whoever ends
    up smallest *relative to its own preferred size* takes it.

    Deliberately not ``_growth_priority``, which refuses any merge that
    pushes a room past `preferred` — right for a leftover mandala cell
    (better left as open floor than stuffed into an already-generous room),
    wrong here. A corridor strip nobody can walk into is not open floor: it
    is a walled-off gap between two rooms, and leaving it costs the plan
    both the area and a pair of pointless walls. On a plot with room to
    spare every ring room is already past `preferred`, so deferring to that
    gate would simply never reclaim anything.
    """
    area = merged.w * merged.h
    tiers = arch.ROOM_SIZE_TIERS.get(room.kind)
    if tiers is None or tiers.preferred.area <= 0:
        return (1, area)
    return (0, area / tiers.preferred.area)


def _strip_slices(strip: Rect, room: Rect) -> tuple[Rect, list[Rect], Rect] | None:
    """How much of ``strip`` the room next to it can take, and what is left.

    Returns ``(take, remainder, merged)``: the slice of the strip lying
    exactly against ``room``'s own face, whatever of the strip that leaves
    over, and the rectangle ``room`` becomes. ``None`` if this room can't
    take a square bite at all.

    Slicing matters because a strip spans a whole maṇḍala *cell*, while a
    cell is routinely shared by two rooms — the north cell holding a puja
    and a bedroom leaves the strip below it 6 m wide with no single room
    matching its width. Handing each room the piece under its own face
    clears the strip; insisting one room take all of it would leave the
    whole thing dead. The remainder goes back as open floor and is offered
    to the room on its far side on the next pass.
    """
    for horizontal in (True, False):
        if horizontal:
            flush = (
                abs(room.y + room.h - strip.y) < MERGE_EPS
                or abs(strip.y + strip.h - room.y) < MERGE_EPS
            )
            lo, hi, rlo, rhi = strip.x, strip.x + strip.w, room.x, room.x + room.w
        else:
            flush = (
                abs(room.x + room.w - strip.x) < MERGE_EPS
                or abs(strip.x + strip.w - room.x) < MERGE_EPS
            )
            lo, hi, rlo, rhi = strip.y, strip.y + strip.h, room.y, room.y + room.h
        if not flush:
            continue
        # The room may not stick out past the strip: the bite has to be the
        # room's own full face, or the merged rect stops being a rectangle.
        if rlo < lo - MERGE_EPS or rhi > hi + MERGE_EPS:
            continue
        lo2, hi2 = max(lo, rlo), min(hi, rhi)
        if hi2 - lo2 < _MIN_REMAINDER:
            continue
        cuts = [(lo, lo2), (hi2, hi)]
        if any(0 < b - a < _MIN_REMAINDER for a, b in cuts):
            continue
        if horizontal:
            take = Rect(lo2, strip.y, hi2 - lo2, strip.h)
            rest = [Rect(a, strip.y, b - a, strip.h) for a, b in cuts if b - a >= _MIN_REMAINDER]
            merged = Rect(room.x, min(room.y, strip.y), room.w, room.h + strip.h)
        else:
            take = Rect(strip.x, lo2, strip.w, hi2 - lo2)
            rest = [Rect(strip.x, a, strip.w, b - a) for a, b in cuts if b - a >= _MIN_REMAINDER]
            merged = Rect(min(room.x, strip.x), room.y, room.w + strip.w, room.h)
        return take, rest, merged
    return None


def _is_open(room: PlannedRoom) -> bool:
    return room.life in ("circulation", "outdoor")


def _open_cluster(pieces: list[tuple[str, Rect]], root_id: str) -> set[str]:
    """Ids of the open pieces walkable from ``root_id`` — open floor meeting
    open floor along a real wall needs no door, so this *is* the house's
    circulation network."""
    by_id = dict(pieces)
    if root_id not in by_id:
        return set()
    seen = {root_id}
    queue = [root_id]
    while queue:
        cur = by_id[queue.pop()]
        for pid, rect in pieces:
            if pid not in seen and shared_seg(cur, rect):
                seen.add(pid)
                queue.append(pid)
    return seen


def _stranded(closed: list[tuple[str, Rect]], opens: list[tuple[str, Rect]]) -> int:
    """Closed rooms touching no open floor — nothing for ``door_onto_open``
    to hang a door on, i.e. rooms with no way in."""
    return sum(1 for _, rect in closed if not any(shared_seg(rect, o) for _, o in opens))


def _open_along_long_side(strip: Rect, rooms: list[PlannedRoom]) -> bool:
    """Does open floor run alongside this strip, rather than just meeting it
    end-on?

    A strip's two *long* sides are what make it a passage or not. Open floor
    along one of them means the strip is simply part of that floor — the
    plan draws no wall between two open pieces, so a 0.9 m link between the
    living room and the Brahmasthāna reads as one continuous space, not as a
    corridor. Open floor only at the *ends* is the opposite case: that is a
    passage between two rooms, which is worth keeping only if somebody walks
    through it.

    This is also what puts the two vertical runs permanently out of reach —
    each borders the Brahmasthāna down its whole inner side by construction
    (``ring_plan``), so no reclaim can ever nibble at the house's spine.
    """
    horizontal = strip.w >= strip.h
    eps = 0.04
    for room in rooms:
        if not _is_open(room):
            continue
        r = room.rect
        if r is strip:
            continue
        if horizontal:
            flush = abs(r.y + r.h - strip.y) < eps or abs(strip.y + strip.h - r.y) < eps
            span = min(r.x + r.w, strip.x + strip.w) - max(r.x, strip.x)
        else:
            flush = abs(r.x + r.w - strip.x) < eps or abs(strip.x + strip.w - r.x) < eps
            span = min(r.y + r.h, strip.y + strip.h) - max(r.y, strip.y)
        if flush and span > 0.45:
            return True
    return False


def _door_targets(rooms: list[PlannedRoom]) -> set[str]:
    """Which open pieces the plan is about to hang its doors on.

    Mirrors ``door_onto_open``'s own rule exactly — each closed room takes
    the *biggest* open space it shares a wall with — so it answers the only
    question that matters here: is this strip a passage somebody actually
    walks in through, or floor with a wall on both sides and no door onto
    either? Every ring cell borders a full-height vertical run and nothing
    else of that size, so the runs come back live and stay off-limits;
    a horizontal band whose rooms all face a run comes back unused.

    Recomputed after every reclaim, since growing one room changes what its
    neighbours touch.
    """
    ranked = sorted(
        (r for r in rooms if _is_open(r)), key=lambda s: -(s.rect.w * s.rect.h)
    )
    chosen: set[str] = set()
    for room in rooms:
        if _is_open(room):
            continue
        for space in ranked:
            if shared_seg(room.rect, space.rect):
                chosen.add(space.id)
                break
    return chosen


def _network_no_worse(
    rooms: list[PlannedRoom], dropped: PlannedRoom, host: PlannedRoom,
    merged: Rect, rest: list[Rect], center_id: str,
) -> bool:
    """Would the house still work with ``dropped``'s claimed slice gone and
    ``host`` grown into it? Two things have to survive the trade:

    * every open piece that could reach the Brahmasthāna still can;
    * no closed room loses its last open neighbour.

    Both are judged as "no *worse* than before", never as absolutes. A plan
    handed to this pass can already contain an open sliver connected to
    nothing (the 5 cm scraps left beside a snapped stair shaft do exactly
    that) or a room touching no open floor; measuring against a perfect
    house instead of the actual one would let a single pre-existing sliver
    anywhere on the floor veto every reclaim on that floor.
    """
    opens_now = [(r.id, r.rect) for r in rooms if _is_open(r)]
    closed_now = [(r.id, r.rect) for r in rooms if not _is_open(r)]

    opens_after = [(r.id, r.rect) for r in rooms if _is_open(r) and r.id != dropped.id]
    opens_after += [(f"{dropped.id}~{i}", rect) for i, rect in enumerate(rest)]
    closed_after = [
        (r.id, merged if r.id == host.id else r.rect)
        for r in rooms if not _is_open(r) and r.id != dropped.id
    ]

    was = _open_cluster(opens_now, center_id) - {dropped.id}
    now = _open_cluster(opens_after, center_id)
    if was - now:
        return False
    return _stranded(closed_after, opens_after) <= _stranded(closed_now, opens_now)


def absorb_dead_corridors(rooms: list[PlannedRoom], center_id: str, storey: int) -> None:
    """Fold every corridor segment the house does not actually walk through
    back into the room beside it.

    ``ring_plan`` cuts circulation as a wall-to-wall "#" — two vertical runs
    and two horizontal ones — because the geometry cannot know in advance
    which of them the front door and the rooms will end up using. In
    practice they rarely all get used: each ring cell borders a *vertical*
    run down its whole side, so that is where ``door_onto_open`` puts every
    door, and the horizontal runs are left as ``CORRIDOR_W`` strips lying
    between two rooms with no door onto either — a passage nobody can enter,
    drawn as dead floor with a wall on each side. That is what put a gap
    between a store and the bedroom under it, and between a bedroom and the
    study under it, on a plan where neither room opened onto the gap.

    So: hand a strip's floor to the rooms beside it whenever doing so leaves
    the circulation network no worse off (``_network_no_worse``). One bite
    at a time, re-testing after each — absorbing one changes who touches
    what, and two strips can each look redundant on their own while the
    network still needs one of them.

    What survives is a strip something genuinely depends on: a wet room's or
    the stair's only route to a door, since neither can be grown into. The
    Brahmasthāna is never a candidate — it is the root the network is
    measured from, and the treatises' one un-buildable square besides.
    """
    for _ in range(len(rooms) * 2):
        strips = sorted(
            (r for r in rooms if r.kind == "brahmasthan" and r.id != center_id),
            key=lambda r: r.rect.w * r.rect.h,
        )
        if not _absorb_one(rooms, strips, center_id, storey):
            return


def _absorb_one(
    rooms: list[PlannedRoom], strips: list[PlannedRoom], center_id: str, storey: int,
) -> bool:
    """One reclaim: the best-ranked room that can take a square bite out of
    some strip without cutting the house's circulation takes it. Returns
    whether anything moved."""
    live = _door_targets(rooms)
    for strip in strips:
        if strip.id in live or _open_along_long_side(strip.rect, rooms):
            continue
        options = []
        for room in rooms:
            if not is_merge_target(room):
                continue
            sliced = _strip_slices(strip.rect, room.rect)
            if sliced is None:
                continue
            take, rest, merged = sliced
            options.append((_reclaim_priority(room, merged), room, take, rest, merged))
        options.sort(key=lambda o: o[0])
        for _, room, take, rest, merged in options:
            if not _network_no_worse(rooms, strip, room, merged, rest, center_id):
                continue
            room.rect = merged
            rooms.remove(strip)
            for i, rect in enumerate(rest):
                rooms.append(PlannedRoom(
                    id=f"{strip.id}_part{i}", kind=strip.kind, floor=storey, rect=rect,
                    life=strip.life, vastu_region=strip.vastu_region,
                    doors=[], windows=[], adjacent_to=[],
                ))
            return True
    return False



def build_floor(storey: int, program: list[PlannedSpace], site, mode: str, stair: StairShaft | None, want_court: bool) -> tuple[list[PlannedRoom], list[PlannedSpace], list[PlanConflict]]:
    """Room placement is a real CP-SAT solve (``solver.solve_layout``), not a
    greedy zone-claim — every room's rectangle is a decision variable, no
    overlap is a hard constraint the solver enforces mathematically, and
    every room must sit flush against the corridor spine (see
    ``solver.corridor_bands``), which is what guarantees reachability by
    construction instead of the old post-hoc BFS-bridge patch. This
    function is now a thin orchestrator around that: reserve the fixed
    stair/foyer/corridor footprints, hand everything else to the solver,
    then run the same downstream door/window/reachability passes as before
    on whatever it returns — those don't care how a room's rect was
    decided.
    """
    grid = mandala(site.width, site.height)  # still needed by _region_of_shaft below
    rooms: list[PlannedRoom] = []
    relaxed: list[PlanConflict] = []
    leftover: list[PlannedSpace] = []

    center_id = f"center_{storey}"
    # The main door's own ground is claimed before anything else on the
    # floor: `entrance_halls` widens the mouth of whichever corridor run
    # reaches the facing wall into a real lobby, and every room is placed
    # around it. A room can no longer end up behind the front door, and the
    # door itself is cut into that lobby rather than into whatever happened
    # to sit on the facing wall (routinely a bedroom, a kitchen or a toilet
    # on south- and west-facing plots).
    plan = ring_plan(site.width, site.height, CORRIDOR_W)
    halls = entrance_halls(plan, site.facing, site.width, site.height)

    to_place: list[PlannedSpace] = []
    for space in program:
        if space.kind in ("staircase", "courtyard"):
            continue
        if space.kind == "combined" and mode == "strict":
            leftover.append(space)
            relaxed.append(PlanConflict(id=f"sep-{space.id}", severity="info", message_key="vastu.plan.valid.wet_separate"))
            continue
        to_place.append(space)

    # Rooms go round the edge, Brahmasthāna in the middle (see ring.py). The
    # stair shaft has to keep the same footprint on every storey, so its cell
    # is spoken for before the rest of that cell is shared out.
    # Widening the door's mouth costs one ring cell a strip of floor either
    # way; which side pays can decide whether a room still fits at all, and
    # the geometry can't tell in advance. Lay the ring out both ways and
    # keep the one that places more rooms — the pada-preferred side comes
    # first, so it wins any tie.
    best: tuple[int, SolveResult, RingPlan, EntranceHall] | None = None
    for hall in halls:
        held: dict[str, list[Rect]] = {}
        for zone, bite in hall.blocked:
            held.setdefault(zone, []).append(bite)
        if stair:
            held.setdefault(_ring_zone_of(stair.rect, site.width, site.height), []).append(stair.rect)
        attempt, attempt_ring = ring_layout(
            to_place, site.width, site.height, mode, CORRIDOR_W,
            reserved=held, keep_clear=hall.lobby,
        )
        if best is None or len(attempt.dropped) < best[0]:
            best = (len(attempt.dropped), attempt, attempt_ring, hall)
    _, result, ring, entry_hall = best
    brahma = ring.brahmasthana

    # `center_id` is the Brahmasthāna — the maṇḍala's true centre, exactly the
    # central 3x3 padas (9/81 = 11.11%), unobstructed on every storey. It is
    # walkable circulation, the hub every room's door opens onto, but nothing
    # is ever built in it: it simply isn't one of the cells rooms can occupy.
    #
    # Added *before* the corridor runs on purpose: validate.py roots its
    # reachability BFS at the first "brahmasthan"-kind room it finds, while
    # ensure_reachable repairs doors from `center_id`. Pointing those two at
    # different roots gets rooms reported isolated that are genuinely fine.
    rooms.append(open_piece(center_id, brahma, storey, want_court))
    # Corridors are carved around the Brahmasthāna, the stair and every room
    # actually placed — a room granted a whole side band (ring._claim_span)
    # absorbs the run inside that band, and the rest of that wall-to-wall run
    # survives to keep the network connected.
    hard = [
        brahma,
        *([stair.rect] if stair else []),
        entry_hall.lobby,
        *(p.rect for p in result.placed.values()),
    ]
    for i, rect in enumerate(disjoint_reserved([*hard, *ring.corridors])[len(hard):]):
        rooms.append(open_piece(f"corridor{i}_{storey}", rect, storey, want_court))
    # The lobby is its own named piece of that same open floor — it shares a
    # wall with the run it was widened from, so it is already walkable
    # through to the Brahmasthāna with no door needed.
    boxed_foyer = PlannedRoom(
        id=f"foyer_{storey}" if storey == 0 else f"landing_{storey}",
        kind="foyer" if storey == 0 else "landing",
        floor=storey,
        rect=entry_hall.lobby,
        life="circulation",
        vastu_region=dir8_zone_of_point(
            entry_hall.lobby.x + entry_hall.lobby.w / 2,
            entry_hall.lobby.y + entry_hall.lobby.h / 2,
            site.width,
            site.height,
        ),
        doors=[], windows=[], adjacent_to=[],
    )
    rooms.append(boxed_foyer)
    for space in to_place:
        placement = result.placed.get(space.id)
        if placement is None:
            continue
        room = make_room(space, placement.rect, storey, placement.vastu_region)
        if zone_rules.vastu_cost(space.kind, placement.vastu_region, mode)[1]:
            relaxed.append(PlanConflict(id=f"relax-{room.id}", severity="info", message_key="vastu.plan.valid.vastu_relaxed"))
        rooms.append(room)
    leftover.extend(result.dropped)

    if stair:
        rooms.append(PlannedRoom(
            id=f"stair_{storey}", kind="staircase", floor=storey, rect=stair.rect,
            life="vertical", vastu_region=_region_of_shaft(stair.rect, grid),
            doors=[], windows=[], adjacent_to=[center_id],
        ))

    # The solver places exactly the requested rooms plus the reserved
    # obstacles — unlike the old zone-claiming design it doesn't itself tile
    # every last scrap of the plot, so real gaps can be left between rooms.
    # Reclaim them the same way the old leftover-cell handling always did:
    # fold each scrap into a willing neighbor first, otherwise register it
    # as its own open piece — every m² ends up belonging to some room, and
    # anything that would otherwise float with no real neighbor (a room or
    # the staircase with a gap, not just a missing door, between it and the
    # corridor) gets one to actually share a wall with.
    scraps = [Rect(0, 0, site.width, site.height)]
    for rect in (r.rect for r in rooms):
        scraps = [p for piece in scraps for p in split_by(piece, rect, min_side=0.02)]
    for i, scrap in enumerate(scraps):
        if not want_court and try_merge_into_neighbor(rooms, scrap, center_id):
            continue
        rooms.append(open_piece(f"fill{i}_{storey}", scrap, storey, want_court))

    # Every rect is final now except for the corridor runs nobody uses — run
    # the reclaim *before* doors are placed so `door_onto_open` and
    # `seal_circulation` below decide against the geometry that ships, not
    # against strips that are about to disappear. Skipped for a courtyard
    # house for the same reason every other merge is (`want_court`): there
    # the open floor is the point, not leftover space to be tidied away.
    if not want_court:
        absorb_dead_corridors(rooms, center_id, storey)

    open_rooms = [r for r in rooms if r.life in ("circulation", "outdoor")]
    if boxed_foyer:
        connect_foyer(boxed_foyer, rooms)
    for room in rooms:
        if room.life in ("circulation", "outdoor"):
            continue
        door_onto_open(room, open_rooms)
    seal_circulation(rooms)
    ensure_reachable(rooms, boxed_foyer.id if boxed_foyer else center_id)

    # open_piece() stamps every open/circulation fragment "center" up front
    # (it doesn't know its own final rect's real position relative to the
    # site) — true only for the one piece that keeps the id `center_id`,
    # the actual Brahmasthan at the crossing of the corridor spine. Every
    # other "brahmasthan"-kind fragment (a leftover carve scrap, a corridor
    # segment off to one side, a scrap folded in from claim_cell) is real
    # open floor somewhere else in the house, not the sacred centre, and
    # mislabeling it "center" is what let a large merged scrap in, say, the
    # southeast outrank the true centre by area and get rendered as
    # "ब्रह्मस्थान" in its place. Recompute each one's real compass zone
    # from its own rect now that every rect is final.
    for room in rooms:
        if room.kind in ("brahmasthan", "foyer") and room.id != center_id:
            cx = room.rect.x + room.rect.w / 2
            cy = room.rect.y + room.rect.h / 2
            room.vastu_region = dir8_zone_of_point(cx, cy, site.width, site.height)

    for i in range(len(rooms)):
        for j in range(i + 1, len(rooms)):
            if shared_seg(rooms[i].rect, rooms[j].rect):
                rooms[i].adjacent_to.append(rooms[j].id)
                rooms[j].adjacent_to.append(rooms[i].id)

    return rooms, leftover, relaxed


def _region_of_shaft(rect: Rect, grid: Mandala) -> str:
    cx, cy = rect.x + rect.w / 2, rect.y + rect.h / 2
    for zid, z in grid.cells.items():
        if z.x <= cx <= z.x + z.w and z.y <= cy <= z.y + z.h:
            return ZONE_DIR[zid]
    return "south"


def _ring_zone_of(rect: Rect, width: float, height: float) -> str:
    """Which of the eight ring cells a rect's centre falls in."""
    plan = ring_plan(width, height, CORRIDOR_W)
    cx, cy = rect.x + rect.w / 2, rect.y + rect.h / 2
    best, best_d = "south", float("inf")
    for zone, cell in plan.cells.items():
        if cell.x <= cx <= cell.x + cell.w and cell.y <= cy <= cell.y + cell.h:
            return zone
        d = (cx - (cell.x + cell.w / 2)) ** 2 + (cy - (cell.y + cell.h / 2)) ** 2
        if d < best_d:
            best, best_d = zone, d
    return best


def stair_on_site(site, want: bool) -> StairShaft | None:
    """The shaft is pinned inside a *ring cell*, not a raw mandala third, so
    it can never sit on a corridor run or in the Brahmasthāna — it has to hold
    the identical footprint on every storey, so it is placed once here and the
    rest of its cell is shared out around it (see ring_layout's `reserved`)."""
    if not want:
        return None
    face = facing_zone(site.facing)
    zone = "west" if face == "s" else "south"
    cell = ring_plan(site.width, site.height, CORRIDOR_W).cells[zone]
    w = min(STAIR_W, cell.w * 0.5)
    l = min(STAIR_L, cell.h)
    if zone == "south":
        rect = Rect(cell.x + cell.w - w, cell.y, w, l)
    else:
        rect = Rect(cell.x + cell.w - w, cell.y + cell.h - l, w, l)
    return StairShaft(id="stair_shaft", rect=rect, rise="n", floors=[0, 1, 2], host_id=zone)


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
