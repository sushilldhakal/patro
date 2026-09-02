"""Pure rectangle geometry — no Vastu semantics, no FastAPI.

Faithful port of the web client's rect-math primitives, consolidated from
two TS files that had no Vastu content of their own:
``src/lib/house-plan/classical.ts`` (``splitBy``/``largest``) and
``src/lib/house-plan/building.ts`` (``sharedSeg``/``edges``/``onPerimeter``/
``segsOverlap``), plus ``engine.ts``'s own ``overlapArea``/``contains``.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

Wall = Literal["n", "e", "s", "w"]


@dataclass(frozen=True)
class Rect:
    x: float
    y: float
    w: float
    h: float


@dataclass(frozen=True)
class Seg:
    wall: Wall
    x1: float
    y1: float
    x2: float
    y2: float


def split_by(outer: Rect, cut: Rect, min_side: float = 0.85) -> list[Rect]:
    """Carve `cut` out of `outer`, returning the remaining piece(s) — up to 4
    strips (left/right/top/bottom of the cut), each kept only if >= `min_side`
    on both sides. Ports classical.ts:96-108 exactly, including its epsilons
    (the default `min_side=0.85` is that port's own threshold — untouched,
    so every existing caller keeps its exact prior behavior). A caller that
    needs every scrap of area accounted for (nothing thrown away, however
    thin) rather than only pieces large enough to be a sensible standalone
    room passes a smaller `min_side` explicitly — see `usable_cell`."""
    ix = max(outer.x, cut.x)
    iy = max(outer.y, cut.y)
    ir = min(outer.x + outer.w, cut.x + cut.w)
    ib = min(outer.y + outer.h, cut.y + cut.h)
    if ir <= ix + 0.02 or ib <= iy + 0.02:
        return [outer]
    out: list[Rect] = []
    if ix - outer.x >= min_side:
        out.append(Rect(outer.x, outer.y, ix - outer.x, outer.h))
    if outer.x + outer.w - ir >= min_side:
        out.append(Rect(ir, outer.y, outer.x + outer.w - ir, outer.h))
    if iy - outer.y >= min_side:
        out.append(Rect(ix, outer.y, ir - ix, iy - outer.y))
    if outer.y + outer.h - ib >= min_side:
        out.append(Rect(ix, ib, ir - ix, outer.y + outer.h - ib))
    return [r for r in out if r.w >= min_side and r.h >= min_side]


def largest(rects: list[Rect]) -> Rect | None:
    if not rects:
        return None
    return max(rects, key=lambda r: r.w * r.h)


def overlap_area(a: Rect, b: Rect) -> float:
    w = min(a.x + a.w, b.x + b.w) - max(a.x, b.x)
    h = min(a.y + a.h, b.y + b.h) - max(a.y, b.y)
    return w * h if w > 0 and h > 0 else 0.0


def contains(outer: Rect, inner: Rect) -> bool:
    return (
        inner.x >= outer.x - 0.05
        and inner.y >= outer.y - 0.05
        and inner.x + inner.w <= outer.x + outer.w + 0.05
        and inner.y + inner.h <= outer.y + outer.h + 0.05
    )


def shared_seg(a: Rect, b: Rect) -> Seg | None:
    """The wall segment where `a` and `b` touch flush, if any (length > 0.45).
    Ports building.ts:30-53, wall label from `b`'s perspective on x-touches
    and `a`'s perspective on y-touches, matching the source exactly."""
    eps = 0.04
    if abs(a.x + a.w - b.x) < eps:
        lo, hi = max(a.y, b.y), min(a.y + a.h, b.y + b.h)
        if hi - lo > 0.45:
            return Seg("e", b.x, lo, b.x, hi)
    if abs(b.x + b.w - a.x) < eps:
        lo, hi = max(a.y, b.y), min(a.y + a.h, b.y + b.h)
        if hi - lo > 0.45:
            return Seg("w", a.x, lo, a.x, hi)
    if abs(a.y + a.h - b.y) < eps:
        lo, hi = max(a.x, b.x), min(a.x + a.w, b.x + b.w)
        if hi - lo > 0.45:
            return Seg("s", lo, b.y, hi, b.y)
    if abs(b.y + b.h - a.y) < eps:
        lo, hi = max(a.x, b.x), min(a.x + a.w, b.x + b.w)
        if hi - lo > 0.45:
            return Seg("n", lo, a.y, hi, a.y)
    return None


def edges(rect: Rect) -> list[Seg]:
    return [
        Seg("n", rect.x, rect.y, rect.x + rect.w, rect.y),
        Seg("e", rect.x + rect.w, rect.y, rect.x + rect.w, rect.y + rect.h),
        Seg("s", rect.x, rect.y + rect.h, rect.x + rect.w, rect.y + rect.h),
        Seg("w", rect.x, rect.y, rect.x, rect.y + rect.h),
    ]


def on_perimeter(seg: Seg, width: float, height: float) -> bool:
    eps = 0.06

    def on_v(x: float) -> bool:
        return abs(x) < eps or abs(x - width) < eps

    def on_h(y: float) -> bool:
        return abs(y) < eps or abs(y - height) < eps

    if abs(seg.x1 - seg.x2) < eps:
        return on_v(seg.x1)
    return on_h(seg.y1)


def _overlap1(a0: float, a1: float, b0: float, b1: float) -> float:
    return max(0.0, min(a1, b1) - max(a0, b0))


def segs_overlap(a: Seg, b: Seg) -> float:
    eps = 0.06
    if abs(a.x1 - a.x2) < eps and abs(b.x1 - b.x2) < eps and abs(a.x1 - b.x1) < eps:
        return _overlap1(min(a.y1, a.y2), max(a.y1, a.y2), min(b.y1, b.y2), max(b.y1, b.y2))
    if abs(a.y1 - a.y2) < eps and abs(b.y1 - b.y2) < eps and abs(a.y1 - b.y1) < eps:
        return _overlap1(min(a.x1, a.x2), max(a.x1, a.x2), min(b.x1, b.x2), max(b.x1, b.x2))
    return 0.0
