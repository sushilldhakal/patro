import { VASTU_PADAS, type CardinalWall, type VastuDirectionId, type VastuPada } from "./vastu";
import type { PlotSize, SpaceAssignment } from "./vastu-plan";

/**
 * The classical courtyard house, as a fixed template — no solver.
 *
 * A plain 3x3 of rooms is not what the treatises describe and not what a
 * Vastu plan looks like: the centre is an open court (Brahmasthāna), a
 * covered gallery (ālindra) rings it on all four sides so every room is
 * reached without crossing the court, and the rooms occupy the band outside
 * that gallery. Mayamata 26:15 for the galleries, Samarāṅgaṇa Sūtradhāra
 * 13:22 for the court staying open to the sky.
 *
 * Everything here is arithmetic on the plot's own dimensions. Rooms land in
 * the compass zone `assignVastuSpaces` already gave them and share that
 * zone's block in proportion to how much floor each kind wants. Nothing is
 * optimised, nothing can fail, and the same plot always draws the same plan.
 */

export type Rect = { x: number; y: number; w: number; h: number };

export type TemplateRoom = SpaceAssignment & { rect: Rect };

export type HouseTemplate = {
  /** The plot itself, metres, origin at the north-west corner. */
  plot: Rect;
  /** Brahmasthāna — the open court, exactly the central ninth. */
  court: Rect;
  /** Outer edge of the walkway ring; the ring is this minus `court`. */
  alindraOuter: Rect;
  /** The eight zone blocks outside the walkway, whether or not they hold rooms. */
  blocks: { zone: VastuDirectionId; rect: Rect }[];
  rooms: TemplateRoom[];
  /** Where the main door sits on the facing wall, and the pada it stands in. */
  door: { x: number; y: number; wall: CardinalWall; pada: VastuPada };
};

/** Gallery width. Wide enough to walk, never so wide it eats the rooms. */
function alindraWidth(plot: PlotSize): number {
  return Math.max(0.75, Math.min(1.35, Math.min(plot.width, plot.height) / 10));
}

/**
 * Cut lines along one axis: room band, gallery, court, gallery, room band.
 * The court keeps its exact third whatever the gallery costs, since that
 * proportion is scriptural rather than a design preference.
 */
function cuts(total: number, alindra: number): [number, number, number, number] {
  const court = total / 3;
  // On a very small plot the gallery would leave no room band at all; give
  // the band a floor and let the gallery take what's left.
  const band = Math.max(total * 0.12, (total - court) / 2 - alindra);
  const gallery = Math.max(0.3, (total - court) / 2 - band);
  return [band, band + gallery, band + gallery + court, total - band];
}

/** Share a block between its rooms, cut across the block's longer side so
 * every room keeps the full short dimension (and, on an outer block, its
 * piece of the exterior wall). Proportional to each kind's ideal area, with
 * a floor so a toilet beside a bedroom is still drawn as a room. */
function shareBlock(rect: Rect, minAreas: number[]): Rect[] {
  if (minAreas.length <= 1) return [rect];
  const alongW = rect.w >= rect.h;
  const span = alongW ? rect.w : rect.h;
  const weights = minAreas.map((a) => Math.max(a, 1));
  const total = weights.reduce((a, b) => a + b, 0);
  // Floor first, then share the surplus by weight — clamping each share and
  // rescaling afterwards (the obvious way) just shrinks the floor back out
  // again, which drew a toilet as an 0.8 m slot beside a bedroom.
  const floor = span / (minAreas.length * 2.5);
  const surplus = span - floor * minAreas.length;
  const out: Rect[] = [];
  let at = alongW ? rect.x : rect.y;
  for (const w of weights) {
    const len = floor + (surplus * w) / total;
    out.push(
      alongW ? { x: at, y: rect.y, w: len, h: rect.h } : { x: rect.x, y: at, w: rect.w, h: len },
    );
    at += len;
  }
  return out;
}

/** Where a ray leaving the plot's centre on `bearing` (0 = north, clockwise)
 * crosses the plot's own outline — how a pada on the wheel becomes a point on
 * a wall without assuming which way each wall's padas are numbered. */
function edgePoint(bearing: number, plot: PlotSize): { x: number; y: number } {
  const rad = ((bearing - 90) * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  const hw = plot.width / 2;
  const hh = plot.height / 2;
  const t = Math.min(
    Math.abs(dx) < 1e-9 ? Infinity : hw / Math.abs(dx),
    Math.abs(dy) < 1e-9 ? Infinity : hh / Math.abs(dy),
  );
  return { x: hw + dx * t, y: hh + dy * t };
}

const WALL_OF: Record<CardinalWall, VastuPada["wall"]> = {
  north: "N",
  east: "E",
  south: "S",
  west: "W",
};

const STATUS_RANK: Record<VastuPada["status"], number> = { good: 0, ok: 1, mixed: 2, bad: 3 };

/** The door pada: the best-omened one on the facing wall, ties going to the
 * one nearest that wall's middle so the entry isn't jammed into a corner. */
function doorPada(facing: CardinalWall): VastuPada {
  const wall = WALL_OF[facing];
  const onWall = VASTU_PADAS.filter((p) => p.wall === wall);
  return [...onWall].sort(
    (a, b) =>
      STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
      Math.abs(a.index - 4.5) - Math.abs(b.index - 4.5),
  )[0]!;
}

export function houseTemplate(
  plot: PlotSize,
  facing: CardinalWall,
  assignments: SpaceAssignment[],
): HouseTemplate {
  const a = alindraWidth(plot);
  const [bx, gx, cx, ex] = cuts(plot.width, a);
  const [by, gy, cy, ey] = cuts(plot.height, a);

  const court: Rect = { x: gx, y: gy, w: cx - gx, h: cy - gy };
  const alindraOuter: Rect = { x: bx, y: by, w: ex - bx, h: ey - by };

  const blocks: { zone: VastuDirectionId; rect: Rect }[] = [
    { zone: "northwest", rect: { x: 0, y: 0, w: bx, h: by } },
    { zone: "north", rect: { x: bx, y: 0, w: ex - bx, h: by } },
    { zone: "northeast", rect: { x: ex, y: 0, w: plot.width - ex, h: by } },
    { zone: "west", rect: { x: 0, y: by, w: bx, h: ey - by } },
    { zone: "east", rect: { x: ex, y: by, w: plot.width - ex, h: ey - by } },
    { zone: "southwest", rect: { x: 0, y: ey, w: bx, h: plot.height - ey } },
    { zone: "south", rect: { x: bx, y: ey, w: ex - bx, h: plot.height - ey } },
    { zone: "southeast", rect: { x: ex, y: ey, w: plot.width - ex, h: plot.height - ey } },
  ];

  const rooms: TemplateRoom[] = [];
  for (const block of blocks) {
    // Centre-zone rooms (only a requested courtyard ever lands there) are
    // drawn as the court itself, not as a room in the band.
    const here = assignments.filter((row) => row.zone === block.zone);
    if (here.length === 0) continue;
    const pieces = shareBlock(
      block.rect,
      here.map((row) => row.min_area),
    );
    here.forEach((row, i) => rooms.push({ ...row, rect: pieces[i]! }));
  }

  const pada = doorPada(facing);
  const at = edgePoint(pada.bearing, plot);

  return { plot: { x: 0, y: 0, w: plot.width, h: plot.height }, court, alindraOuter, blocks, rooms, door: { ...at, wall: facing, pada } };
}
