"""Compile rooms into a wall/hole/vertex graph — port of building.ts's compileLayer().

Vertex/wall dedup by key, door-hole placement from each room's own `doors`
list, a fallback pass for any closed room that still has none, the entrance
hole on the facing wall, and the whole window-placement section (solar-wall
bias, cross-building pairing, the even-not-a-multiple-of-ten window count).
"""

from __future__ import annotations

from .entrance import (
    ENTRANCE_W,
    WIN_NE_H,
    WIN_NE_SILL,
    WIN_NE_W,
    WIN_SW_H,
    WIN_SW_SILL,
    WIN_SW_W,
    door_height,
    is_solar_wall,
    main_door_point,
    next_legal_count,
)
from .geometry import Rect, Seg, edges, on_perimeter, segs_overlap, shared_seg
from .types import BHole, BuildingLayer, BVertex, BWall, CardinalWall, PlannedRoom

WALL_T = 0.18
DOOR_W = 0.9
WET_DOOR_W = 0.75
WIN_W = WIN_NE_W


def _key(x: float, y: float) -> str:
    return f"{round(x * 200)}_{round(y * 200)}"


def _facing_edge(facing: CardinalWall, width: float, height: float) -> Seg:
    if facing == "east":
        return Seg("e", width, 0, width, height)
    if facing == "west":
        return Seg("w", 0, 0, 0, height)
    if facing == "north":
        return Seg("n", 0, 0, width, 0)
    return Seg("s", 0, height, width, height)


def _point_on_edge(room: PlannedRoom, wall: str, t: float) -> tuple[float, float]:
    r = room.rect
    if wall == "n":
        return (r.x + t * r.w, r.y)
    if wall == "s":
        return (r.x + t * r.w, r.y + r.h)
    if wall == "e":
        return (r.x + r.w, r.y + t * r.h)
    return (r.x, r.y + t * r.h)


def _collinear_union(
    ax1: float, ay1: float, ax2: float, ay2: float, bx1: float, by1: float, bx2: float, by2: float
) -> tuple[float, float] | None:
    """Do segments A and B lie on the same axis-aligned line and touch or
    overlap? Returns the union's (min, max) along that axis, or None if
    they're not collinear or don't touch at all. Covers full containment
    (one wall fully inside another — a small room's edge lying inside a
    wider neighbor's) and partial overlap (two rooms' edges that only
    partly line up) the same way: both collapse to one wall."""
    a_horiz = abs(ay1 - ay2) < 1e-6
    b_horiz = abs(by1 - by2) < 1e-6
    if a_horiz != b_horiz:
        return None
    if a_horiz:
        if abs(ay1 - by1) > 1e-6:
            return None
        a0, a1 = min(ax1, ax2), max(ax1, ax2)
        b0, b1 = min(bx1, bx2), max(bx1, bx2)
    else:
        if abs(ax1 - bx1) > 1e-6:
            return None
        a0, a1 = min(ay1, ay2), max(ay1, ay2)
        b0, b1 = min(by1, by2), max(by1, by2)
    if min(a1, b1) - max(a0, b0) < -1e-6:
        return None  # collinear but not touching
    return (min(a0, b0), max(a1, b1))


def compile_layer(width: float, height: float, facing: CardinalWall, rooms: list[PlannedRoom]) -> BuildingLayer:
    verts: dict[str, BVertex] = {}
    walls: list[BWall] = []
    wall_at: dict[str, BWall] = {}
    holes: list[BHole] = []

    def vertex(x: float, y: float) -> BVertex:
        vid = f"v_{_key(x, y)}"
        hit = verts.get(vid)
        if hit:
            return hit
        v = BVertex(vid, x, y)
        verts[vid] = v
        return v

    def wall(x1: float, y1: float, x2: float, y2: float, role: str) -> BWall:
        a, b = vertex(x1, y1), vertex(x2, y2)
        if a.id == b.id:
            return BWall(id=f"w_{a.id}", a=a.id, b=b.id, thickness=WALL_T, role=role)
        wid = f"w_{a.id}_{b.id}" if a.id < b.id else f"w_{b.id}_{a.id}"
        hit = wall_at.get(wid)
        if hit:
            if role == "exterior":
                hit.role = "exterior"
            return hit

        # Two (or more) rooms of different widths sharing a boundary line
        # produce collinear-but-different (or only partly overlapping)
        # edges — without this, they'd become separate overlapping wall
        # objects (and, before doors are deduped elsewhere, duplicate door
        # arcs at the same spot). Find every existing wall this new segment
        # is collinear with and touches, and collapse them all — plus the
        # new segment — into one. A wall that already has a door/window on
        # it can't be resized (its hole offsets are fractions of its
        # current length), so those are left alone; if one of them already
        # covers the requested span outright, it's reused as-is.
        mergeable: list[BWall] = []
        for existing in walls:
            ea, eb = verts[existing.a], verts[existing.b]
            if _collinear_union(ea.x, ea.y, eb.x, eb.y, x1, y1, x2, y2) is None:
                continue
            if any(h.wall_id == existing.id for h in holes):
                horiz = abs(ea.y - eb.y) < 1e-6
                espan = (min(ea.x, eb.x), max(ea.x, eb.x)) if horiz else (min(ea.y, eb.y), max(ea.y, eb.y))
                nspan = (min(x1, x2), max(x1, x2)) if horiz else (min(y1, y2), max(y1, y2))
                if espan[0] <= nspan[0] + 1e-6 and espan[1] >= nspan[1] - 1e-6:
                    if role == "exterior":
                        existing.role = "exterior"
                    wall_at[wid] = existing
                    return existing
                continue  # can't merge into it — fall through, may create a separate wall
            mergeable.append(existing)

        if mergeable:
            horiz = abs(verts[mergeable[0].a].y - verts[mergeable[0].b].y) < 1e-6
            fixed = verts[mergeable[0].a].y if horiz else verts[mergeable[0].a].x
            lo, hi = (min(x1, x2), max(x1, x2)) if horiz else (min(y1, y2), max(y1, y2))
            exterior = role == "exterior"
            for existing in mergeable:
                ea, eb = verts[existing.a], verts[existing.b]
                espan = (min(ea.x, eb.x), max(ea.x, eb.x)) if horiz else (min(ea.y, eb.y), max(ea.y, eb.y))
                lo, hi = min(lo, espan[0]), max(hi, espan[1])
                exterior = exterior or existing.role == "exterior"
                old_wid = f"w_{ea.id}_{eb.id}" if ea.id < eb.id else f"w_{eb.id}_{ea.id}"
                wall_at.pop(old_wid, None)

            survivor = mergeable[0]
            for other in mergeable[1:]:
                walls.remove(other)
            new_a = vertex(lo, fixed) if horiz else vertex(fixed, lo)
            new_b = vertex(hi, fixed) if horiz else vertex(fixed, hi)
            survivor.a, survivor.b = new_a.id, new_b.id
            survivor.role = "exterior" if exterior else "interior"
            new_wid = f"w_{new_a.id}_{new_b.id}" if new_a.id < new_b.id else f"w_{new_b.id}_{new_a.id}"
            wall_at[new_wid] = survivor
            return survivor

        w = BWall(id=wid, a=a.id, b=b.id, thickness=WALL_T, role=role)
        wall_at[wid] = w
        walls.append(w)
        return w

    closed = [r for r in rooms if r.life not in ("circulation", "outdoor")]
    open_rooms = [r for r in rooms if r.life in ("circulation", "outdoor")]

    wall(0, 0, width, 0, "exterior")
    wall(width, 0, width, height, "exterior")
    wall(0, height, width, height, "exterior")
    wall(0, 0, 0, height, "exterior")

    for room in closed:
        for e in edges(room.rect):
            role = "exterior" if on_perimeter(e, width, height) else "interior"
            wall(e.x1, e.y1, e.x2, e.y2, role)

    # An open/circulation room's edge against another open room isn't a
    # real wall (open floor is contiguous — that's the whole basis of the
    # open-to-open reachability rule) and must stay unregistered. But an
    # open room's edge against a closed room (or the exterior) IS a real
    # wall, and — same reasoning as the closed-room loop above — needs to
    # exist *before* any door/window holes are placed, or a later door on
    # this same boundary can't find (and merge into) it, leaving a
    # duplicate, unmerged wall segment behind.
    for room in open_rooms:
        closed_walls = {seg.wall for other in closed if (seg := shared_seg(room.rect, other.rect))}
        for e in edges(room.rect):
            on_perim = on_perimeter(e, width, height)
            if not on_perim and e.wall not in closed_walls:
                continue
            wall(e.x1, e.y1, e.x2, e.y2, "exterior" if on_perim else "interior")

    hole_n = 0

    def add_hole(w: BWall, at_x: float, at_y: float, width_m: float, type_: str, from_: str, to: str, height: float | None = None, sill: float | None = None) -> bool:
        nonlocal hole_n
        va, vb = verts[w.a], verts[w.b]
        length = ((vb.x - va.x) ** 2 + (vb.y - va.y) ** 2) ** 0.5
        if length < 0.4:
            return False
        t = ((at_x - va.x) * (vb.x - va.x) + (at_y - va.y) * (vb.y - va.y)) / (length * length)
        offset = min(0.82, max(0.18, t))
        used = width_m / length
        if used > 0.85:
            return False
        if any(h.wall_id == w.id and abs(h.offset - offset) < 0.12 for h in holes):
            return False
        holes.append(BHole(
            id=f"h_{hole_n}", wall_id=w.id, offset=offset, width=width_m, type=type_,
            swing="left" if type_ == "window" else ("right" if offset > 0.5 else "left"),
            from_=from_, to=to,
            height=height if height is not None else (None if type_ == "window" else door_height(width_m)),
            sill=sill,
        ))
        hole_n += 1
        return True

    # A room pair can end up with two independently-created PlannedDoors
    # (A's own door to B, and B's own door back to A) — same doorway,
    # counted twice. Keep the first, skip the rest, so the compiled layer
    # never shows two doors for one relationship.
    door_pairs_done: set[frozenset[str]] = set()
    for room in rooms:
        for door in room.doors:
            pair = frozenset((room.id, door.connects_to))
            if pair in door_pairs_done:
                continue
            pt = _point_on_edge(room, door.wall, door.t)
            edge = next((e for e in edges(room.rect) if e.wall == door.wall), None)
            if not edge:
                continue
            w = wall(edge.x1, edge.y1, edge.x2, edge.y2, "exterior" if on_perimeter(edge, width, height) else "interior")
            if add_hole(w, pt[0], pt[1], door.width, "door", room.id, door.connects_to):
                door_pairs_done.add(pair)

    for room in closed:
        if room.doors:
            continue
        for space in open_rooms:
            seg = shared_seg(room.rect, space.rect)
            if not seg:
                continue
            w = wall(seg.x1, seg.y1, seg.x2, seg.y2, "interior")
            add_hole(w, (seg.x1 + seg.x2) / 2, (seg.y1 + seg.y2) / 2, DOOR_W, "door", room.id, space.id)
            break

    face = _facing_edge(facing, width, height)
    door = main_door_point(facing, width, height)

    def door_on_edge(e: Seg) -> bool:
        pad = 0.12
        if abs(e.x1 - e.x2) < 0.06:
            return abs(door.x - e.x1) < 0.08 and min(e.y1, e.y2) - pad <= door.y <= max(e.y1, e.y2) + pad
        return abs(door.y - e.y1) < 0.08 and min(e.x1, e.x2) - pad <= door.x <= max(e.x1, e.x2) + pad

    on_face = [r for r in closed if any(segs_overlap(e, face) > 0.4 and door_on_edge(e) for e in edges(r.rect))]
    entry = next((r for r in rooms if r.kind == "foyer"), None)
    if not entry and on_face:
        def dist(r: PlannedRoom) -> float:
            return ((r.rect.x + r.rect.w / 2 - door.x) ** 2 + (r.rect.y + r.rect.h / 2 - door.y) ** 2) ** 0.5
        entry = sorted(on_face, key=dist)[0]
    if entry:
        for e in edges(entry.rect):
            if segs_overlap(e, face) < 0.4:
                continue
            w = wall(e.x1, e.y1, e.x2, e.y2, "exterior")
            add_hole(w, door.x, door.y, ENTRANCE_W, "entrance", entry.id, "outside")

    win_candidates: list[tuple[str, Seg, PlannedRoom]] = []
    for room in closed:
        if room.kind in ("staircase", "toilet"):
            continue
        for e in edges(room.rect):
            if not on_perimeter(e, width, height):
                continue
            if entry and segs_overlap(e, face) > 0.5:
                continue
            along = ((e.x2 - e.x1) ** 2 + (e.y2 - e.y1) ** 2) ** 0.5
            if along < 1.2:
                continue
            win_candidates.append((e.wall, e, room))

    def place_window(c: tuple[str, Seg, PlannedRoom], t: float, force: bool = False) -> bool:
        wall_id, edge, room = c
        solar = is_solar_wall(wall_id)
        if not solar and not force and sum(1 for x in win_candidates if x[0] == wall_id) > 2:
            return False
        along = ((edge.x2 - edge.x1) ** 2 + (edge.y2 - edge.y1) ** 2) ** 0.5
        width_m = min(WIN_NE_W if solar else WIN_SW_W, along * (0.42 if solar else 0.28))
        if width_m < 0.55:
            return False
        at_x = edge.x1 + (edge.x2 - edge.x1) * t
        at_y = edge.y1 + (edge.y2 - edge.y1) * t
        w = wall(edge.x1, edge.y1, edge.x2, edge.y2, "exterior")
        return add_hole(w, at_x, at_y, width_m, "window", room.id, "outside",
                         height=WIN_NE_H if solar else WIN_SW_H, sill=WIN_NE_SILL if solar else WIN_SW_SILL)

    for c in [x for x in win_candidates if is_solar_wall(x[0])]:
        place_window(c, 0.5)
        along = ((c[1].x2 - c[1].x1) ** 2 + (c[1].y2 - c[1].y1) ** 2) ** 0.5
        if along > 3.6:
            place_window(c, 0.28)
    thermal = [x for x in win_candidates if not is_solar_wall(x[0])]
    for c in thermal[: (len(thermal) + 1) // 2]:
        place_window(c, 0.55)

    def windows() -> list[BHole]:
        return [h for h in holes if h.type == "window"]

    for hole in list(windows()):
        src = next((w for w in walls if w.id == hole.wall_id), None)
        if not src:
            continue
        a, b = verts[src.a], verts[src.b]
        mid_x = a.x + (b.x - a.x) * hole.offset
        mid_y = a.y + (b.y - a.y) * hole.offset
        vertical = abs(a.x - b.x) < 0.06

        def matches(c: tuple[str, Seg, PlannedRoom]) -> bool:
            wall_id, edge, _ = c
            if vertical:
                return (
                    wall_id in ("e", "w")
                    and abs(edge.y1 + (edge.y2 - edge.y1) * 0.5 - mid_y) < 1.2
                    and wall_id != ("w" if a.x < width / 2 else "e")
                )
            return (
                wall_id in ("n", "s")
                and abs(edge.x1 + (edge.x2 - edge.x1) * 0.5 - mid_x) < 1.2
                and wall_id != ("n" if a.y < height / 2 else "s")
            )

        pair = next((c for c in win_candidates if matches(c)), None)
        if pair:
            place_window(pair, 0.5, force=True)

    win_count = len(windows())
    want_win = next_legal_count(win_count)
    for c in win_candidates:
        if win_count >= want_win:
            break
        if place_window(c, 0.72, force=True):
            win_count += 1

    return BuildingLayer(vertices=list(verts.values()), walls=walls, holes=holes)
