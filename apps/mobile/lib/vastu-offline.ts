/**
 * Offline fallback for `POST /vastu/sketch`.
 *
 * The server owns zone placement and the Āyādi check (engine/vedic/vastu/sketch.py)
 * and the app asks it first. This copy exists only so the Vastu planner still
 * works with no connection, which is the point of offline mode. It is the
 * original client implementation, unchanged; the server's golden test
 * (tests/test_vastu_sketch.py in the patro repo) is generated from this same
 * code, so the two agree. When the rules change, change the server and port
 * the change here.
 */
import type { VastuSketchRequest, VastuSketchResponse } from "@/lib/api";
import type { CardinalWall, VastuDirectionId } from "@vedic-patro/domain/vastu";
import {
  clampStoreys,
  type FloorPref,
  type HousePlan,
  type PlannedSpace,
  type SpaceAssignment as ServerAssignment,
  type VastuMode,
  type SpaceKind,
  type StoreyId,
} from "@/lib/vastu-plan";

type SpaceAssignment = PlannedSpace & {
  zone: VastuDirectionId;
  fit: "preferred" | "acceptable" | "shared";
  storey: StoreyId;
};

/** One answer from a classical source (or a reasoned modern adaptation of one), kept with the rule it justifies rather than in a separate table that can drift out of sync. */
type ZoneCitation = { source: string; note?: string };

type ZoneRule = {
  preferred: VastuDirectionId[];
  acceptable: VastuDirectionId[];
  avoid: VastuDirectionId[];
  /** Provenance trail — append as new answers come in; never overwrite a prior entry. */
  notes?: ZoneCitation[];
};

/** Viśvakarmā Prakāśa 16-zone mapping — preferred is the classical seat. */
const SPACE_ZONE_RULES: Record<SpaceKind, ZoneRule> = {
  puja: {
    preferred: ["northeast"],
    acceptable: ["east", "north"],
    avoid: ["south", "southwest", "southeast", "center"],
  },
  kitchen: {
    preferred: ["southeast"],
    acceptable: ["east", "south"],
    avoid: ["northeast", "center"],
  },
  living: {
    preferred: ["north"],
    acceptable: ["east", "northeast"],
    avoid: ["southwest"],
  },
  dining: {
    preferred: ["west"],
    acceptable: ["east"],
    avoid: ["northeast"],
  },
  kitchen_dining: {
    preferred: ["southeast"],
    acceptable: ["east", "south"],
    avoid: ["northeast", "center"],
    notes: [
      {
        source: "placeholder — pending source check",
        note: "Mirrors kitchen's seat (southeast/fire) rather than dining's (west): cooking is treated as the dominant classical concern until confirmed otherwise. Classical kitchen/dining separation is rooted in wood-fire smoke and ash; with modern gas/electric cooking that constraint doesn't apply, so combining is offered as an opt-in modern choice, not the default.",
      },
    ],
  },
  master_bedroom: {
    preferred: ["southwest"],
    acceptable: ["south", "west"],
    avoid: ["northeast"],
  },
  bedroom: {
    preferred: ["south", "northwest"],
    acceptable: ["west"],
    avoid: ["northeast", "southeast"],
  },
  toilet: {
    preferred: ["northwest", "south"],
    acceptable: ["west"],
    avoid: ["northeast", "southwest", "center", "east"],
  },
  bathroom: {
    preferred: ["east"],
    acceptable: ["north"],
    avoid: ["northeast", "southwest", "center"],
  },
  combined: {
    preferred: ["northwest", "south"],
    acceptable: ["west"],
    avoid: ["northeast", "southwest", "center", "east"],
  },
  study: {
    preferred: ["west"],
    acceptable: ["north", "east"],
    avoid: ["southwest"],
  },
  office: {
    preferred: ["north"],
    acceptable: ["west", "northwest"],
    avoid: ["southeast"],
  },
  store: {
    preferred: ["south"],
    acceptable: ["west"],
    avoid: ["northeast", "southwest"],
  },
  laundry: {
    preferred: ["northwest"],
    acceptable: ["west"],
    avoid: ["northeast"],
  },
  staircase: {
    preferred: ["south", "west"],
    acceptable: ["northwest"],
    avoid: ["northeast", "center", "southwest"],
  },
  garage: {
    preferred: ["northwest", "southeast"],
    acceptable: ["west"],
    avoid: ["northeast"],
  },
  guest: {
    preferred: ["northwest"],
    acceptable: ["west", "north"],
    avoid: ["southwest"],
  },
  family: {
    preferred: ["north"],
    acceptable: ["west", "northwest"],
    avoid: ["southeast"],
  },
  balcony: {
    preferred: ["north", "east", "northeast"],
    acceptable: ["west"],
    avoid: ["southwest"],
  },
  courtyard: {
    preferred: ["center", "northeast"],
    acceptable: ["north"],
    avoid: ["southwest"],
  },
  garden: {
    preferred: ["northeast", "north", "east"],
    acceptable: ["west"],
    avoid: ["southwest"],
  },
  servant: {
    preferred: ["northwest", "west"],
    acceptable: ["south"],
    avoid: ["northeast", "southwest"],
  },
  gym: {
    preferred: ["west", "south"],
    acceptable: ["northwest"],
    avoid: ["northeast"],
  },
  library: {
    preferred: ["north", "northeast", "west"],
    acceptable: ["east"],
    avoid: ["southeast"],
  },
};

/** Sleeping rooms claim a zone first; wet rooms are placed after so they do not pile up. */
const ASSIGN_ORDER: SpaceKind[] = [
  "puja",
  "kitchen",
  "master_bedroom",
  "living",
  "dining",
  "bedroom",
  "guest",
  "family",
  "study",
  "office",
  "combined",
  "bathroom",
  "toilet",
  "staircase",
  "store",
  "laundry",
  "garage",
  "courtyard",
  "garden",
  "balcony",
  "library",
  "gym",
  "servant",
];

const WET_KINDS = new Set<SpaceKind>(["toilet", "bathroom", "combined"]);

/** Comfortable room size — do not shrink below this to force every request onto the plan. */
type IdealSize = { minSide: number; minArea: number };

const IDEAL_SIZE: Record<SpaceKind, IdealSize> = {
  master_bedroom: { minSide: 2.9, minArea: 10.5 },
  bedroom: { minSide: 2.7, minArea: 9 },
  guest: { minSide: 2.7, minArea: 9 },
  living: { minSide: 2.9, minArea: 12 },
  family: { minSide: 2.8, minArea: 10 },
  dining: { minSide: 2.4, minArea: 7 },
  kitchen: { minSide: 2.4, minArea: 7 },
  kitchen_dining: { minSide: 2.9, minArea: 13 },
  puja: { minSide: 1.8, minArea: 3.5 },
  study: { minSide: 2.4, minArea: 6.5 },
  office: { minSide: 2.4, minArea: 7 },
  store: { minSide: 1.6, minArea: 3 },
  laundry: { minSide: 1.6, minArea: 3 },
  staircase: { minSide: 1.15, minArea: 2.8 },
  garage: { minSide: 2.8, minArea: 12 },
  balcony: { minSide: 1.2, minArea: 2.5 },
  courtyard: { minSide: 2, minArea: 6 },
  garden: { minSide: 2, minArea: 6 },
  servant: { minSide: 2.2, minArea: 6 },
  gym: { minSide: 2.6, minArea: 8 },
  library: { minSide: 2.4, minArea: 6.5 },
  toilet: { minSide: 1, minArea: 1.5 },
  bathroom: { minSide: 1.5, minArea: 2.8 },
  combined: { minSide: 1.5, minArea: 3 },
};

const STAIR_WIDTH_M = 1.25;

export type PlotSize = { width: number; height: number };

function boxFits(w: number, h: number, size: IdealSize): boolean {
  return Math.min(w, h) + 0.02 >= size.minSide && w * h + 0.02 >= size.minArea;
}

function zoneMeters(plot: PlotSize): { w: number; h: number } {
  return { w: plot.width / 3, h: plot.height / 3 };
}

function afterStair(w: number, h: number): { w: number; h: number } {
  if (w >= h) return { w: w - STAIR_WIDTH_M, h };
  return { w, h: h - STAIR_WIDTH_M };
}

function ensuiteBoxes(
  w: number,
  h: number,
  host: SpaceKind,
  wet: SpaceKind,
): { main: { w: number; h: number }; wet: { w: number; h: number } } | null {
  const wetSide = IDEAL_SIZE[wet].minSide;
  const wetLong = wet === "toilet" ? 1.5 : Math.max(wetSide, IDEAL_SIZE[wet].minArea / wetSide);
  const long = Math.max(w, h);
  const short = Math.min(w, h);
  if (long - wetSide < IDEAL_SIZE[host].minSide) return null;
  if (short + 0.02 < wetLong && wet === "toilet") return null;
  const mainLong = long - wetSide;
  const main = w >= h ? { w: mainLong, h: short } : { w: short, h: mainLong };
  const bath = w >= h ? { w: wetSide, h: short } : { w: short, h: wetSide };
  if (!boxFits(main.w, main.h, IDEAL_SIZE[host]) || !boxFits(bath.w, bath.h, IDEAL_SIZE[wet])) return null;
  return { main, wet: bath };
}

/** Typical default storey when the user leaves a room on “any”. */
const DEFAULT_STOREY: Record<SpaceKind, StoreyId> = {
  puja: 0,
  kitchen: 0,
  living: 0,
  dining: 0,
  kitchen_dining: 0,
  garage: 0,
  store: 0,
  laundry: 0,
  courtyard: 0,
  garden: 0,
  servant: 0,
  staircase: 0,
  master_bedroom: 1,
  bedroom: 1,
  toilet: 1,
  bathroom: 1,
  combined: 1,
  study: 1,
  office: 1,
  family: 1,
  guest: 1,
  balcony: 1,
  gym: 2,
  library: 2,
};

function resolveStorey(space: PlannedSpace, plan: HousePlan): StoreyId {
  const max = (clampStoreys(plan.storeys) - 1) as StoreyId;
  const pref = plan.floors[space.kind];
  let level: StoreyId = 0;
  if (pref === "ground") level = 0;
  else if (pref === "first") level = 1;
  else if (pref === "third") level = 2;
  else {
    level = DEFAULT_STOREY[space.kind] ?? 0;
    if (space.kind === "bedroom" && (space.index ?? 1) >= 3) level = 2;
    if (
      (space.kind === "toilet" || space.kind === "bathroom" || space.kind === "combined") &&
      (space.index ?? 1) >= 2
    ) {
      level = Math.min(((space.index ?? 1) - 1) as StoreyId, 2) as StoreyId;
    }
  }
  if (space.kind === "garage" || space.kind === "garden" || space.kind === "courtyard") {
    return 0;
  }
  return Math.min(level, max) as StoreyId;
}

function expandPlannedSpaces(plan: HousePlan): PlannedSpace[] {
  const out: PlannedSpace[] = [];
  const beds = clampCount(plan.bedrooms, 1, 5);
  const master = Math.min(Math.max(plan.masterBedroom, 1), beds);
  for (let i = 1; i <= beds; i++) {
    out.push({
      id: i === master ? `master_${i}` : `bedroom_${i}`,
      kind: i === master ? "master_bedroom" : "bedroom",
      index: i,
    });
  }
  pushCounted(out, "toilet", clampCount(plan.toilets, 1, 5));
  pushCounted(out, "bathroom", clampCount(plan.bathrooms, 1, 5));
  pushCounted(out, "combined", clampCount(plan.combined, 0, 5));
  for (const kind of plan.extras) {
    if (kind === "bedroom" || kind === "master_bedroom" || kind === "toilet" || kind === "bathroom" || kind === "combined") {
      continue;
    }
    out.push({ id: kind, kind });
  }
  return out;
}

function pushCounted(out: PlannedSpace[], kind: SpaceKind, n: number) {
  for (let i = 1; i <= n; i++) {
    out.push({ id: `${kind}_${i}`, kind, index: i });
  }
}

function clampCount(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.round(n)));
}

const ALL_ZONES: VastuDirectionId[] = [
  "northeast",
  "east",
  "southeast",
  "south",
  "southwest",
  "west",
  "northwest",
  "north",
  "center",
];

const HOST_KINDS = new Set<SpaceKind>([
  "master_bedroom",
  "bedroom",
  "guest",
  "living",
  "dining",
  "family",
]);

function occupantsOf(zone: VastuDirectionId, placed: SpaceAssignment[]): SpaceKind[] {
  return placed.filter((row) => row.zone === zone).map((row) => row.kind);
}

function isPrimary(kind: SpaceKind): boolean {
  return kind !== "staircase" && !WET_KINDS.has(kind);
}

/** A zone is one ninth of the plot, which on any normal plot is enough floor
 * for two ordinary rooms side by side — a study beside an office, a store
 * beside a laundry. Capped at two because past that the "zone" stops meaning
 * anything and the sketch turns into a list. */
const MAX_PRIMARIES_PER_ZONE = 2;

/** Do these rooms fit side by side in a `w` x `h` zone at their minimum
 * sizes? Cut across the zone's longer side (so every strip keeps the full
 * short dimension) and give each room the length it needs for both its
 * minimum side and its minimum area. */
function primariesFit(w: number, h: number, kinds: SpaceKind[]): boolean {
  if (kinds.length === 0) return true;
  if (kinds.length === 1) return boxFits(w, h, IDEAL_SIZE[kinds[0]!]);
  const long = Math.max(w, h);
  const cross = Math.min(w, h);
  const needs = kinds.map((k) =>
    Math.max(IDEAL_SIZE[k].minSide, IDEAL_SIZE[k].minArea / cross),
  );
  if (needs.reduce((a, b) => a + b, 0) > long + 0.02) return false;
  return kinds.every((k, i) => boxFits(needs[i]!, cross, IDEAL_SIZE[k]));
}

function canShare(zone: VastuDirectionId, space: PlannedSpace, placed: SpaceAssignment[]): boolean {
  const rule = SPACE_ZONE_RULES[space.kind];
  if (rule.avoid.includes(zone)) return false;
  if (zone === "center") return space.kind === "courtyard";
  const here = occupantsOf(zone, placed);
  const primaries = here.filter(isPrimary);
  const wets = here.filter((k) => WET_KINDS.has(k));
  if (WET_KINDS.has(space.kind)) {
    if (wets.length > 0) return false;
    if (primaries.length > 1) return false;
    if (primaries.length === 1 && !HOST_KINDS.has(primaries[0]!)) return false;
    return true;
  }
  // A second primary is allowed, but not on top of a wet room: the wet room
  // is already sharing this zone with its host, and three ways is a split
  // `roomFitsZone` has no honest way to size.
  if (primaries.length === 0) return wets.length <= 1;
  if (primaries.length < MAX_PRIMARIES_PER_ZONE) return wets.length === 0;
  return false;
}

function roomFitsZone(
  zone: VastuDirectionId,
  space: PlannedSpace,
  placed: SpaceAssignment[],
  plot: PlotSize | undefined,
): boolean {
  if (!plot) return true;
  let { w, h } = zoneMeters(plot);
  const here = occupantsOf(zone, placed);
  if (here.includes("staircase") && space.kind !== "staircase") {
    ({ w, h } = afterStair(w, h));
  }
  const host = here.find(isPrimary);
  const wet = here.find((k) => WET_KINDS.has(k));
  if (WET_KINDS.has(space.kind) && host) {
    return ensuiteBoxes(w, h, host, space.kind) != null;
  }
  if (isPrimary(space.kind) && wet) {
    return ensuiteBoxes(w, h, space.kind, wet) != null;
  }
  if (space.kind === "staircase") {
    return boxFits(STAIR_WIDTH_M, Math.max(w, h), IDEAL_SIZE.staircase);
  }
  const primaries = here.filter(isPrimary);
  if (isPrimary(space.kind) && primaries.length > 0) {
    return primariesFit(w, h, [...primaries, space.kind]);
  }
  return boxFits(w, h, IDEAL_SIZE[space.kind]);
}

function pickZone(
  space: PlannedSpace,
  placed: SpaceAssignment[],
  mode: VastuMode,
  plot: PlotSize | undefined,
): VastuDirectionId | null {
  const rule = SPACE_ZONE_RULES[space.kind];
  const ok = (z: VastuDirectionId) => canShare(z, space, placed) && roomFitsZone(z, space, placed, plot);
  const pools = [
    rule.preferred.filter(ok),
    mode === "flexible" ? rule.acceptable.filter(ok) : [],
    ALL_ZONES.filter((z) => z !== "center" && ok(z)),
  ];
  for (const pool of pools) {
    if (pool.length === 0) continue;
    let best = pool[0]!;
    let bestLoad = Infinity;
    for (const zone of pool) {
      const n = occupantsOf(zone, placed).length;
      if (n < bestLoad) {
        best = zone;
        bestLoad = n;
      }
    }
    return best;
  }
  return null;
}

function assignZones(
  spaces: PlannedSpace[],
  plan: HousePlan,
  storey: StoreyId,
  plot: PlotSize | undefined,
  initial: SpaceAssignment[] = [],
): { placed: SpaceAssignment[]; overflow: PlannedSpace[] } {
  const ordered = [...spaces].sort(
    (a, b) => ASSIGN_ORDER.indexOf(a.kind) - ASSIGN_ORDER.indexOf(b.kind),
  );
  const placed: SpaceAssignment[] = [...initial];
  const overflow: PlannedSpace[] = [];

  for (const space of ordered) {
    const zone = pickZone(space, placed, plan.mode, plot);
    if (!zone) {
      overflow.push(space);
      continue;
    }
    const rule = SPACE_ZONE_RULES[space.kind];
    const n = occupantsOf(zone, placed).length;
    const fit: SpaceAssignment["fit"] =
      n > 0 ? "shared" : rule.preferred.includes(zone) ? "preferred" : "acceptable";
    placed.push({ ...space, zone, fit, storey });
  }
  return { placed, overflow };
}

/**
 * Place each requested space into a zone. Prefers an empty preferred cell;
 * under flexible mode it may share a zone rather than sit in an avoid zone.
 * Rooms are split across storeys first so each floor is assigned on its own.
 */
function assignVastuSpaces(
  plan: HousePlan,
  plot?: PlotSize,
): {
  assignments: SpaceAssignment[];
  leftover: PlannedSpace[];
} {
  const asked = clampStoreys(plan.storeys);
  const buckets: PlannedSpace[][] = [[], [], []];
  let stair: PlannedSpace | null = null;

  for (const space of expandPlannedSpaces(plan)) {
    if (space.kind === "staircase") {
      stair = space;
      continue;
    }
    buckets[resolveStorey(space, plan)]!.push(space);
  }

  const stairZone = SPACE_ZONE_RULES.staircase.preferred[0] ?? "southwest";
  const assignments: SpaceAssignment[] = [];
  let leftover: PlannedSpace[] = [];

  for (let i = 0; i < asked; i++) {
    const storey = i as StoreyId;
    const batch = [...leftover, ...(buckets[storey] ?? [])];
    const seed: SpaceAssignment[] = stair
      ? [{ ...stair, id: `${stair.id}_${storey}`, zone: stairZone, fit: "preferred", storey }]
      : [];
    const result = assignZones(batch, plan, storey, plot, seed);
    assignments.push(...result.placed);
    leftover = result.overflow;
  }
  return { assignments, leftover };
}


/**
 * Which corner of each wall is generally preferred for an entrance —
 * the lighter, water/air corners over the heavy south-west one. A rough,
 * commonly-cited heuristic, not a substitute for a site-specific reading.
 */
const ENTRANCE_PREFERRED_CORNER: Record<CardinalWall, VastuDirectionId> = {
  north: "northeast",
  east: "northeast",
  south: "southeast",
  west: "northwest",
};


/** 1 hasta (cubit), the traditional unit these calculations are done in. */
const HASTA_METERS = 0.4572;

function metersToHasta(meters: number): number {
  return meters / HASTA_METERS;
}

/**
 * Simplified Āyādi "income" check: whether a wall's length (in whole hasta)
 * lands on an auspicious remainder. Traditional sources compute several
 * vargas (income, expenditure, star, etc.) with named remainder categories;
 * this keeps just one widely-cited piece — a "zero income" width is
 * inauspicious — as an approximation, not full shastra.
 *
 * Note: with this formula `(hasta * 8) % 12` only ever lands on 0, 4 or 8
 * (8 and 12 share a factor of 4), so "odd remainder" can never happen —
 * the auspicious check below is "non-zero", not "odd".
 */
function ayadiRemainder(widthHasta: number): number {
  const hasta = Math.round(widthHasta);
  return ((hasta * 8) % 12 + 12) % 12;
}

function ayadiAuspicious(remainder: number): boolean {
  return remainder !== 0;
}

/** Nearest whole-hasta width (either direction) with non-zero remainder. */
function nearestAuspiciousWidthHasta(widthHasta: number): number {
  const base = Math.round(widthHasta);
  for (let delta = 1; delta <= 6; delta++) {
    if (ayadiAuspicious(ayadiRemainder(base - delta))) return base - delta;
    if (ayadiAuspicious(ayadiRemainder(base + delta))) return base + delta;
  }
  return base;
}


export function localVastuSketch(request: VastuSketchRequest): VastuSketchResponse {
  const p = request.plan;
  const plan: HousePlan = {
    bedrooms: p.bedrooms,
    toilets: p.toilets,
    bathrooms: p.bathrooms,
    combined: p.combined,
    masterBedroom: p.master_bedroom,
    extras: p.extras as SpaceKind[],
    mode: p.mode,
    storeys: clampStoreys(p.storeys),
    floors: p.floors as Partial<Record<SpaceKind, FloorPref>>,
  };
  const plot: PlotSize = { width: request.plot_width, height: request.plot_depth };
  const { assignments, leftover } = assignVastuSpaces(plan, plot);

  const lengthHasta = metersToHasta(plot.height);
  const widthHasta = metersToHasta(plot.width);
  const remainder = ayadiRemainder(widthHasta);
  const auspicious = ayadiAuspicious(remainder);
  const suggestedHasta = auspicious ? null : nearestAuspiciousWidthHasta(widthHasta);

  return {
    storeys: clampStoreys(plan.storeys),
    assignments: assignments.map(
      (a): ServerAssignment => ({ ...a, min_area: IDEAL_SIZE[a.kind].minArea }),
    ),
    leftover,
    ayadi: {
      length_hasta: lengthHasta,
      width_hasta: widthHasta,
      remainder,
      auspicious,
      suggested_hasta: suggestedHasta,
      suggested_meters: suggestedHasta === null ? null : suggestedHasta * HASTA_METERS,
    },
    entrance: {
      facing: request.facing,
      preferred_corner: ENTRANCE_PREFERRED_CORNER[request.facing as CardinalWall],
    },
  };
}
