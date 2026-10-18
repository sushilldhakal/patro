"""Entrance placement, foyer geometry, and small architectural constants.

Ports ``src/lib/house-plan/classical.ts``. Two real changes on the source:

* the source's ``mainDoorPoint()`` picked a hardcoded pada (always 6, or 4
  for south) from a never-sourced ``DOOR_PADA`` table. Here it asks
  ``zone_rules.entrance_padas_for_wall()`` for the real, extracted best
  padas on the facing wall instead — see zone_rules.py's module docstring
  for why.
* the door is placed *inside the entrance hall's own mouth* when that hall
  is known (``main_door_point``'s ``hall`` argument). A main door has to
  open into circulation and lead on into the house; landing it on the bare
  pada let it come through whatever happened to sit on the facing wall,
  which on south- and west-facing plots was routinely a bedroom, a kitchen
  or a toilet.
"""

from __future__ import annotations

from dataclasses import dataclass

from . import spatial, zone_rules
from .geometry import Rect, Wall
from .types import CardinalWall

WALL_GAP = 0.076
DOOR_RATIO = 2
ENTRANCE_W = 1.05
RING_W = 0.9
#: Wall left either side of the opening, so the frame sits inside the hall
#: instead of half in the neighbouring room's wall.
DOOR_JAMB = 0.12
#: Entrance hall: how wide its mouth is opened up at the facing wall, and how
#: far it reaches in before handing over to the corridor spine. A bare
#: corridor run (``layout.CORRIDOR_W``) is narrower than the door leaf
#: itself, so the mouth is widened by taking a bite out of the ring cell
#: beside it — and every centimetre of that bite is floor some room doesn't
#: get, so the mouth is opened to exactly what the leaf needs and no more.
FOYER_W = ENTRANCE_W + 2 * DOOR_JAMB
FOYER_D = 1.35

WIN_NE_W = 1.45
WIN_SW_W = 0.75
WIN_NE_SILL = 0.85
WIN_SW_SILL = 1.45
WIN_NE_H = 1.35
WIN_SW_H = 0.7

_FACING_WALL: dict[CardinalWall, str] = {"north": "N", "east": "E", "south": "S", "west": "W"}


@dataclass(frozen=True)
class DoorPoint:
    x: float
    y: float
    t: float
    pada: str | None


def _pada_center_t(pada_index: int) -> float:
    """Position (0-1) of a pada's center along its wall — 8 padas per wall."""
    return (pada_index - 0.5) / 8


def _along_of_t(facing: CardinalWall, t: float, width: float, height: float) -> float:
    """Metres along the facing wall's own axis (x on north/south, y on
    east/west) for the wall fraction ``t``. Only the north wall is traversed
    with increasing x; the other three run the other way. Kept exactly as
    ``main_door_point`` always mapped them, so no pada moves."""
    if facing == "north":
        return width * t
    if facing == "south":
        return width * (1 - t)
    return height * (1 - t)


def _t_of_along(facing: CardinalWall, along: float, width: float, height: float) -> float:
    """Inverse of ``_along_of_t``."""
    if facing == "north":
        return along / width if width else 0.5
    if facing == "south":
        return 1 - (along / width if width else 0.5)
    return 1 - (along / height if height else 0.5)


def face_span(facing: CardinalWall, rect: Rect) -> tuple[float, float]:
    """``rect``'s footprint along the facing wall, as (low, high) metres on
    that wall's own axis."""
    if facing in ("north", "south"):
        return (rect.x, rect.x + rect.w)
    return (rect.y, rect.y + rect.h)


def entrance_width(span: float) -> float:
    """Opening width for a hall mouth ``span`` metres wide: the standard
    leaf, narrowed only when the hall genuinely can't take it. Cutting a
    1.05 m door into a 0.8 m mouth would put a quarter of the opening in the
    neighbouring room's wall on either side."""
    return min(ENTRANCE_W, max(0.6, span - 2 * DOOR_JAMB))


def entrance_padas(facing: CardinalWall, width: float, height: float) -> list[tuple[float, str]]:
    """The sourced best padas for the facing wall, best first, each as
    (metres along the wall, pada id)."""
    wall = _FACING_WALL[facing]
    out: list[tuple[float, str]] = []
    for pada_id in zone_rules.entrance_padas_for_wall(wall):
        pada = spatial.PADA32_BY_ID[pada_id]
        out.append((_along_of_t(facing, _pada_center_t(pada.index), width, height), pada_id))
    return out


def _pada_at(facing: CardinalWall, t: float) -> str | None:
    """The pada a door at wall fraction ``t`` actually stands in — so a door
    the hall pulled off its first-choice pada still reports where it really
    is, rather than the pada it was aiming for or no pada at all."""
    index = min(8, max(1, int(t * 8) + 1))
    pada = spatial.PADA32_BY_CODE.get(f"{_FACING_WALL[facing]}{index}")
    return pada.id if pada else None


def _door_at(facing: CardinalWall, along: float, width: float, height: float) -> DoorPoint:
    t = _t_of_along(facing, along, width, height)
    pada = _pada_at(facing, t)
    if facing == "east":
        return DoorPoint(width, along, t, pada)
    if facing == "west":
        return DoorPoint(0, along, t, pada)
    if facing == "north":
        return DoorPoint(along, 0, t, pada)
    return DoorPoint(along, height, t, pada)


def main_door_point(
    facing: CardinalWall, width: float, height: float, hall: Rect | None = None
) -> DoorPoint:
    """Door center on the facing wall.

    Without ``hall``, the wall's best-sourced pada — falling back to its
    midpoint only when the room index has no main_door data for that wall
    (never silently inventing a pada).

    With ``hall`` — the entrance hall's own footprint where it meets that
    wall — the whole opening is kept inside that mouth: the best-ranked
    sourced pada it fits in wins, and if none does, the top-ranked one
    slides to the nearest spot in the mouth where it does. Vastu ranks the
    padas on a wall; it does not ask for a front door opening into a
    bedroom, so where the two disagree the hall wins.
    """
    options = entrance_padas(facing, width, height)
    if hall is None:
        along = options[0][0] if options else _along_of_t(facing, 0.5, width, height)
        return _door_at(facing, along, width, height)

    lo, hi = face_span(facing, hall)
    half = entrance_width(hi - lo) / 2
    lo, hi = lo + half, max(lo + half, hi - half)
    for along, _pada_id in options:
        if lo - 1e-6 <= along <= hi + 1e-6:
            return _door_at(facing, along, width, height)
    want = options[0][0] if options else (lo + hi) / 2
    return _door_at(facing, min(hi, max(lo, want)), width, height)


def door_height(width: float) -> float:
    return width * DOOR_RATIO


def next_legal_count(n: int) -> int:
    """Even count that doesn't end in zero (avoid 10, 20...)."""
    t = max(2, n)
    if t % 2 == 1:
        t += 1
    if t % 10 == 0:
        t += 2
    return t


def is_solar_wall(wall: Wall) -> bool:
    return wall in ("n", "e")


def toilet_forbidden(region: str) -> bool:
    """Center is a structural exclusion (the mandala's own geometry). The
    rest comes from the real avoid-zone data for toilets, not a hardcoded pair."""
    if region == "center":
        return True
    costs = zone_rules.zone_costs_for_subject("toilet")
    return region in costs.avoid
