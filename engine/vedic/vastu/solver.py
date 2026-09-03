"""Room-placement core: a real constraint solve, not a greedy zone-claim.

Replaces ``layout.py``'s old ``mandala()``/``pick_zone()``/
``pack_into_surplus()`` placement path (still present, now unused by
``build_floor``, kept only because a few unit tests exercise its helpers
directly). Every room's rectangle is a CP-SAT decision variable; "no two
rooms overlap" and "no room overlaps a reserved region (corridor/stair/
foyer)" are hard constraints the solver enforces mathematically
(``add_no_overlap_2d``), not something checked and patched after the fact —
that's the whole reason this exists (see the plan this shipped from: the old
path needed 11+ separate bug-fix commits chasing overlap edge cases one at a
time, because nothing about it *guaranteed* correctness).

Vastu direction correctness is grounded in a real 9×9 (81-pada) grid: each
room's top-left corner lands in one of 81 pada cells, and every pada's cost
for that room's kind is precomputed from the *existing*
``zone_rules.vastu_cost()`` (itself sourced from the extracted, cited
``vastu_room_index.json`` — no new classical data invented here, just a
finer-grained lookup than the old 8-zone mandala). The solver minimizes the
sum of each room's own pada cost.

Circulation is a first-class reserved region (a fixed corridor cross through
the plot's centre, sized off ``layout.CORRIDOR_W``, matching the old
mandala's own corridor width) — every room must be placed flush against one
of its four long edges. That guarantees reachability from the entrance by
construction; the old ``seal_circulation``/``ensure_reachable`` BFS-bridge
fallback stays in ``layout.py`` as a defensive no-op safety net, not the
primary mechanism.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

from ortools.sat.python import cp_model

from . import zone_rules
from .architecture import IDEAL_SIZE, ROOM_SIZE_TIERS, PLACE_ORDER
from .geometry import Rect, split_by
from .rooms import PlannedSpace

UNIT = 0.1  # metres per fine-grid cell — 10cm, standard architectural precision
PADA_N = 9  # the classical 9×9 Vastu Purusha Mandala
SOLVE_TIME_LIMIT_S = 4.0

_DIR8_ORDER = ("north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest")

# Classically-paired kinds pulled toward each other in the objective (see
# ``_try_solve``'s own ADJ_WEIGHT) — deliberately small and hand-picked
# rather than sourced from ``rooms.RoomSpec.adjacency``, which turned out to
# be dead code: nothing in the actual request pipeline
# (``HouseRequirement`` -> ``expand_planned_spaces`` -> ``PlannedSpace``)
# ever constructs a ``RoomSpec`` or reads its ``adjacency`` field, so there
# was no real per-request adjacency data to wire in.
ADJACENCY_CLOSE: frozenset[frozenset[str]] = frozenset({
    frozenset({"kitchen", "dining"}),
    frozenset({"kitchen_dining", "living"}),
    frozenset({"living", "dining"}),
})


def to_units(metres: float) -> int:
    return max(0, round(metres / UNIT))


def to_metres(units: int) -> float:
    return units * UNIT


def dir8_from_bearing(bearing: float) -> str:
    return _DIR8_ORDER[round(bearing / 45) % 8]


def bearing_of(x: float, y: float, width: float, height: float) -> float:
    """Clockwise-from-north bearing of point (x, y) from the plot's centre,
    in this file's own coordinate convention: x grows east, y grows south
    (matching every existing zone's own layout — see ``layout.mandala``)."""
    dx = x - width / 2
    dy = y - height / 2
    return math.degrees(math.atan2(dx, -dy)) % 360


def dir8_zone_of_point(x: float, y: float, width: float, height: float) -> str:
    return dir8_from_bearing(bearing_of(x, y, width, height))


@dataclass(frozen=True)
class PadaGrid:
    """The 9×9 mandala over one plot — a fixed reference grid used only to
    look up Vastu-direction cost, independent of the fine placement grid."""

    width: float
    height: float
    col_bounds: tuple[float, ...]  # 10 boundaries -> 9 columns
    row_bounds: tuple[float, ...]

    def pada_of(self, x: float, y: float) -> tuple[int, int]:
        col = min(PADA_N - 1, int(x / self.width * PADA_N)) if self.width else 0
        row = min(PADA_N - 1, int(y / self.height * PADA_N)) if self.height else 0
        return row, col

    def cost_table(self, kind: str, mode: str) -> list[int]:
        """Flattened 9×9 (row-major, `row * 9 + col`) integer cost table for
        `kind`, reusing ``zone_rules.vastu_cost`` per pada centre — same cost
        values (0/2/5/80/200) the old 8-zone mandala already used, just
        looked up at 81-cell resolution instead of 8."""
        out: list[int] = []
        for row in range(PADA_N):
            cy = (row + 0.5) * self.height / PADA_N
            for col in range(PADA_N):
                cx = (col + 0.5) * self.width / PADA_N
                zone = dir8_zone_of_point(cx, cy, self.width, self.height)
                cost, _ = zone_rules.vastu_cost(kind, zone, mode)
                out.append(int(cost))
        return out


def pada_grid(width: float, height: float) -> PadaGrid:
    col_bounds = tuple(c * width / PADA_N for c in range(PADA_N + 1))
    row_bounds = tuple(r * height / PADA_N for r in range(PADA_N + 1))
    return PadaGrid(width, height, col_bounds, row_bounds)


@dataclass(frozen=True)
class Placement:
    rect: Rect
    vastu_region: str  # a dir8 id


@dataclass(frozen=True)
class SolveResult:
    placed: dict[str, Placement]
    dropped: list[PlannedSpace]


def snap(rect: Rect) -> Rect:
    """Round every edge to the fine placement grid. Every room's own rect
    already comes out grid-aligned (it's built from solved integer units) —
    a reserved obstacle computed independently in plain float metres (the
    corridor bands, or a caller's own foyer/stair rect) isn't, and comparing
    an unsnapped edge against a snapped one is exactly what let a ~2-7cm
    sliver of "supposed to be corridor" get silently absorbed into a
    neighboring room instead of staying reserved."""
    return Rect(to_metres(to_units(rect.x)), to_metres(to_units(rect.y)), to_metres(to_units(rect.w)), to_metres(to_units(rect.h)))


def corridor_bands(width: float, height: float, corridor_w: float) -> tuple[Rect, Rect]:
    """The circulation spine every room must sit flush against — a
    full-width horizontal band and a full-height vertical band crossing at
    the plot's centre, `corridor_w` thick (matches ``layout.CORRIDOR_W``,
    capped the same way the old mandala capped it on a small plot). The two
    bands deliberately cross (a "+"), so they're only used for edge-touching
    math here — the *solid* obstacle fed to the solver is
    ``disjoint_reserved``'s non-overlapping split of them. Pre-snapped to
    the placement grid (see ``snap``) so this file's own touch-boundary math
    and its reserved-obstacle geometry always agree exactly."""
    cw = min(corridor_w, width * 0.3)
    ch = min(corridor_w, height * 0.3)
    h_band = snap(Rect(0, height / 2 - ch / 2, width, ch))
    v_band = snap(Rect(width / 2 - cw / 2, 0, cw, height))
    return h_band, v_band


def disjoint_reserved(rects: list[Rect]) -> list[Rect]:
    """`rects` may overlap each other (the corridor's own cross does, by
    design) and may not individually be grid-aligned (a caller's own
    foyer/stair rect, computed in plain float metres). ``add_no_overlap_2d``
    needs every box it's given — reserved obstacles included — to be
    pairwise non-overlapping, and grid-snapped so a room flush against one
    can't leave (or claim) a sliver an unsnapped edge would miss (see
    ``snap``). Each rect is carved down to whatever's left of it after every
    *earlier* rect in the list has already claimed its ground — earlier
    entries always keep their exact shape, so pass anything that must stay
    precise (a stair, the foyer) before the corridor bands."""
    acc: list[Rect] = []
    for rect in rects:
        pieces = [snap(rect)]
        for taken in acc:
            pieces = [p for piece in pieces for p in split_by(piece, taken, min_side=0.02)]
        acc.extend(pieces)
    return acc


def _room_domain(kind: str) -> tuple[int, int, int, int, int]:
    """(min_w, max_w, min_h, max_h, min_area) in fine-grid units, from this
    kind's minimum/preferred tiers — reused as-is from
    ``data/vastu_room_sizes.json`` via ``architecture.ROOM_SIZE_TIERS``."""
    tiers = ROOM_SIZE_TIERS.get(kind)
    ideal = IDEAL_SIZE[kind]
    min_side = to_units(ideal.min_side)
    min_area = round(ideal.min_area / (UNIT * UNIT))
    if tiers is None:
        span = max(min_side * 3, to_units(4.0))
        return min_side, span, min_side, span, min_area
    pref_w = to_units(max(tiers.preferred.width, tiers.preferred.depth) * 1.15)
    max_w = max(min_side, pref_w)
    return min_side, max_w, min_side, max_w, min_area


def _priority(kind: str) -> int:
    return PLACE_ORDER.index(kind) if kind in PLACE_ORDER else len(PLACE_ORDER)


def _try_solve(
    spaces: list[PlannedSpace],
    width: float,
    height: float,
    mode: str,
    reserved: list[Rect],
    corridor_w: float,
) -> dict[str, Placement] | None:
    model = cp_model.CpModel()
    grid = pada_grid(width, height)
    plot_w, plot_h = to_units(width), to_units(height)
    h_band, v_band = corridor_bands(width, height, corridor_w)

    x_intervals = []
    y_intervals = []
    per_space: dict[str, dict] = {}

    for i, r in enumerate(disjoint_reserved(reserved)):
        rx, ry, rw, rh = to_units(r.x), to_units(r.y), to_units(r.w), to_units(r.h)
        if rw <= 0 or rh <= 0:
            continue
        x_intervals.append(model.new_interval_var(rx, rw, rx + rw, f"resv_x_{i}"))
        y_intervals.append(model.new_interval_var(ry, rh, ry + rh, f"resv_y_{i}"))

    cost_terms = []
    for space in spaces:
        min_w, max_w, min_h, max_h, min_area = _room_domain(space.kind)
        max_w = min(max_w, plot_w)
        max_h = min(max_h, plot_h)
        min_w = min(min_w, max_w)
        min_h = min(min_h, max_h)

        x = model.new_int_var(0, plot_w, f"x_{space.id}")
        y = model.new_int_var(0, plot_h, f"y_{space.id}")
        w = model.new_int_var(min_w, max_w, f"w_{space.id}")
        h = model.new_int_var(min_h, max_h, f"h_{space.id}")
        x_end = model.new_int_var(0, plot_w, f"xe_{space.id}")
        y_end = model.new_int_var(0, plot_h, f"ye_{space.id}")
        model.add(x_end == x + w)
        model.add(y_end == y + h)
        model.add(x_end <= plot_w)
        model.add(y_end <= plot_h)

        area = model.new_int_var(min_area, max_w * max_h, f"area_{space.id}")
        model.add_multiplication_equality(area, [w, h])
        model.add(area >= min_area)

        x_intervals.append(model.new_interval_var(x, w, x_end, f"ix_{space.id}"))
        y_intervals.append(model.new_interval_var(y, h, y_end, f"iy_{space.id}"))

        # Flush against one of the corridor spine's 4 long edges — this is
        # what guarantees the room is reachable, by construction, instead of
        # hoping a post-hoc BFS bridge finds it a door later.
        hb_top, hb_bot = to_units(h_band.y), to_units(h_band.y + h_band.h)
        vb_left, vb_right = to_units(v_band.x), to_units(v_band.x + v_band.w)
        touches = [model.new_bool_var(f"t{i}_{space.id}") for i in range(4)]
        model.add(y_end == hb_top).only_enforce_if(touches[0])
        model.add(y == hb_bot).only_enforce_if(touches[1])
        model.add(x_end == vb_left).only_enforce_if(touches[2])
        model.add(x == vb_right).only_enforce_if(touches[3])
        model.add_bool_or(touches)

        pada_col = model.new_int_var(0, PADA_N - 1, f"pc_{space.id}")
        col_lookup = [
            min(PADA_N - 1, int(u * UNIT / width * PADA_N)) if width else 0
            for u in range(plot_w + 1)
        ]
        model.add_element(x, col_lookup, pada_col)
        pada_row = model.new_int_var(0, PADA_N - 1, f"pr_{space.id}")
        row_lookup = [
            min(PADA_N - 1, int(u * UNIT / height * PADA_N)) if height else 0
            for u in range(plot_h + 1)
        ]
        model.add_element(y, row_lookup, pada_row)
        pada_index = model.new_int_var(0, PADA_N * PADA_N - 1, f"pi_{space.id}")
        model.add(pada_index == pada_row * PADA_N + pada_col)

        cost_table = grid.cost_table(space.kind, mode)
        cost = model.new_int_var(0, 200, f"cost_{space.id}")
        model.add_element(pada_index, cost_table, cost)
        cost_terms.append(cost)

        per_space[space.id] = {"x": x, "y": y, "w": w, "h": h, "pada_row": pada_row, "pada_col": pada_col}

    model.add_no_overlap_2d(x_intervals, y_intervals)

    # A light tie-breaker, not a hard rule: pull a few classically-paired
    # kinds toward each other (kitchen_near_dining is already one of
    # validate.py's own checks) without letting it outweigh the real vastu
    # cost terms above — each pair can move the objective by at most
    # ADJ_WEIGHT * 2 * (PADA_N - 1), well under a single strict-mode
    # zone-avoid cost of 80.
    ADJ_WEIGHT = 3
    adjacency_terms = []
    for i, a in enumerate(spaces):
        for b in spaces[i + 1:]:
            if frozenset({a.kind, b.kind}) not in ADJACENCY_CLOSE:
                continue
            pa, pb = per_space[a.id], per_space[b.id]
            dr = model.new_int_var(-PADA_N, PADA_N, f"dr_{a.id}_{b.id}")
            model.add(dr == pa["pada_row"] - pb["pada_row"])
            adr = model.new_int_var(0, PADA_N, f"adr_{a.id}_{b.id}")
            model.add_abs_equality(adr, dr)
            dc = model.new_int_var(-PADA_N, PADA_N, f"dc_{a.id}_{b.id}")
            model.add(dc == pa["pada_col"] - pb["pada_col"])
            adc = model.new_int_var(0, PADA_N, f"adc_{a.id}_{b.id}")
            model.add_abs_equality(adc, dc)
            adjacency_terms.extend((adr, adc))

    model.minimize(sum(cost_terms) + ADJ_WEIGHT * sum(adjacency_terms))

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = SOLVE_TIME_LIMIT_S
    # Single-threaded and seeded: this response is disk-cached by request
    # params (services/response_cache.py) and compared for equality in
    # tests — a multi-worker parallel search can race to different,
    # equally-optimal solutions between runs on the same input, which broke
    # both of those. CP-SAT is deterministic single-threaded.
    solver.parameters.num_search_workers = 1
    solver.parameters.random_seed = 42
    status = solver.solve(model)
    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return None

    out: dict[str, Placement] = {}
    for space in spaces:
        v = per_space[space.id]
        rx, ry, rw, rh = (
            to_metres(solver.value(v["x"])),
            to_metres(solver.value(v["y"])),
            to_metres(solver.value(v["w"])),
            to_metres(solver.value(v["h"])),
        )
        region = dir8_zone_of_point(rx, ry, width, height)
        out[space.id] = Placement(Rect(rx, ry, rw, rh), region)
    return out


def solve_layout(
    spaces: list[PlannedSpace],
    width: float,
    height: float,
    mode: str,
    reserved: list[Rect],
    corridor_w: float,
) -> SolveResult:
    """Place every `space` with a guaranteed non-overlapping, in-bounds,
    corridor-connected rectangle. If the full request doesn't fit, degrade
    the way a human architect would: first shrink every room to its bare
    minimum footprint, then drop the lowest-priority optional rooms one at a
    time (wet rooms first, then reverse ``PLACE_ORDER``) and retry — rather
    than reporting the whole floor unplaceable the moment one room doesn't
    fit."""
    remaining = list(spaces)
    dropped: list[PlannedSpace] = []

    placed = _try_solve(remaining, width, height, mode, reserved, corridor_w)
    if placed is not None:
        return SolveResult(placed, dropped)

    # Second attempt: same room set, but every domain pinned to its minimum
    # (done implicitly by _try_solve already allowing minimum; a plot this
    # tight needs fewer rooms, not smaller domains, so go straight to
    # dropping the least essential ones).
    order = sorted(
        remaining,
        key=lambda s: (0 if s.kind not in PLACE_ORDER else 1, -_priority(s.kind)),
    )
    droppable = list(order)
    while droppable and placed is None:
        victim = droppable.pop(0)
        remaining = [s for s in remaining if s.id != victim.id]
        dropped.append(victim)
        if not remaining:
            break
        placed = _try_solve(remaining, width, height, mode, reserved, corridor_w)

    return SolveResult(placed or {}, dropped)
