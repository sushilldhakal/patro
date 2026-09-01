"""Site/plot model — pure geometry input, no Vāstu rules here.

Matches the shape the user specified: a plot need not be north-facing, and
the whole Vāstu coordinate system rotates with the site's actual north
orientation (``Site.orientation.north``, a bearing in degrees).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

Unit = Literal["m", "ft"]
PlotShape = Literal["rectangle", "trapezoid", "irregular"]
RoadSide = Literal["north", "east", "south", "west", "northeast", "northwest", "southeast", "southwest"]


@dataclass(frozen=True)
class Plot:
    width: float
    depth: float
    unit: Unit = "ft"
    shape: PlotShape = "rectangle"


@dataclass(frozen=True)
class Orientation:
    """Bearing (degrees, 0=true north) that the site's own "north" wall actually points.

    Not every plot is north-facing — the whole Vāstu spatial model (see
    ``spatial.py``) is defined relative to this bearing, not assumed to be 0.
    """

    north: float = 0.0


@dataclass(frozen=True)
class Road:
    side: RoadSide
    width: float | None = None


@dataclass(frozen=True)
class Setback:
    side: RoadSide
    distance: float


@dataclass(frozen=True)
class Site:
    plot: Plot
    orientation: Orientation = field(default_factory=Orientation)
    roads: tuple[Road, ...] = ()
    setbacks: tuple[Setback, ...] = ()
    entrance_preference: RoadSide | None = None
    floors: int = 1

    def area(self) -> float:
        return self.plot.width * self.plot.depth
