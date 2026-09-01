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


def compile_layer(width: float, height: float, facing: CardinalWall, rooms: list[PlannedRoom]) -> BuildingLayer:
    verts: dict[str, BVertex] = {}
    walls: list[BWall] = []
    wall_at: dict[str, BWall] = {}

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

    holes: list[BHole] = []
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

    for room in rooms:
        for door in room.doors:
            pt = _point_on_edge(room, door.wall, door.t)
            edge = next((e for e in edges(room.rect) if e.wall == door.wall), None)
            if not edge:
                continue
            w = wall(edge.x1, edge.y1, edge.x2, edge.y2, "exterior" if on_perimeter(edge, width, height) else "interior")
            add_hole(w, pt[0], pt[1], door.width, "door", room.id, door.connects_to)

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
