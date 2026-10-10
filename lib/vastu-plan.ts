import type { VastuDirectionId } from "@/shared/vastu";

export type VastuMode = "strict" | "flexible";
/** Ground, first, and the top (third) storey of a 3-level house. */
export type FloorPref = "any" | "ground" | "first" | "third";
export type StoreyId = 0 | 1 | 2;

export const STOREY_PREFS: FloorPref[] = ["ground", "first", "third"];

export type SpaceKind =
  | "master_bedroom"
  | "bedroom"
  | "toilet"
  | "bathroom"
  | "combined"
  | "living"
  | "kitchen"
  | "dining"
  | "kitchen_dining"
  | "puja"
  | "study"
  | "office"
  | "store"
  | "laundry"
  | "staircase"
  | "garage"
  | "guest"
  | "family"
  | "balcony"
  | "courtyard"
  | "garden"
  | "servant"
  | "gym"
  | "library";

export const ESSENTIAL_SPACES: SpaceKind[] = [
  "living",
  "kitchen",
  "dining",
  "puja",
  "study",
  "office",
  "store",
  "laundry",
  "staircase",
  "garage",
];

export const OPTIONAL_SPACES: SpaceKind[] = [
  "guest",
  "family",
  "balcony",
  "courtyard",
  "garden",
  "servant",
  "gym",
  "library",
];

export const FLOOR_SPACES: SpaceKind[] = ["puja", "kitchen", "living", "master_bedroom"];

export type PlotSize = { width: number; height: number };

export type PlannedSpace = {
  id: string;
  kind: SpaceKind;
  /** 1-based index when there are several of the same kind. */
  index?: number;
};

/** One placed room, as the server's `/vastu/sketch` returns it. */
export type SpaceAssignment = PlannedSpace & {
  zone: VastuDirectionId;
  fit: "preferred" | "acceptable" | "shared";
  storey: StoreyId;
  /** Floor area (m²) the room wants at minimum — the sketch sizes rooms sharing a zone by it. */
  min_area: number;
};

export type HousePlan = {
  bedrooms: number;
  toilets: number;
  bathrooms: number;
  combined: number;
  masterBedroom: number;
  extras: SpaceKind[];
  mode: VastuMode;
  storeys: 1 | 2 | 3;
  floors: Partial<Record<SpaceKind, FloorPref>>;
};

export const DEFAULT_HOUSE_PLAN: HousePlan = {
  bedrooms: 3,
  toilets: 2,
  bathrooms: 1,
  combined: 1,
  masterBedroom: 1,
  extras: ["living", "kitchen", "dining", "puja"],
  mode: "flexible",
  storeys: 1,
  floors: {},
};

export function clampStoreys(n: number): 1 | 2 | 3 {
  if (n >= 3) return 3;
  if (n === 2) return 2;
  return 1;
}

export function parseFloorPref(value: unknown): FloorPref | null {
  if (value === "ground" || value === "first" || value === "third" || value === "any") return value;
  if (value === "upper") return "third";
  return null;
}

export function storeyPref(id: StoreyId): FloorPref {
  return STOREY_PREFS[id] ?? "ground";
}

// kitchen_dining isn't in ESSENTIAL_SPACES/OPTIONAL_SPACES — those drive independent
// toggle buttons, but kitchen_dining is mutually exclusive with kitchen+dining and gets
// its own dedicated checkbox in HouseRequirementsForm instead.
const EXTRA_KINDS = new Set<SpaceKind>([...ESSENTIAL_SPACES, ...OPTIONAL_SPACES, "kitchen_dining"]);

export function isExtraSpace(id: string): id is SpaceKind {
  return EXTRA_KINDS.has(id as SpaceKind);
}

export function assignmentsOnStorey(
  assignments: SpaceAssignment[],
  storey: StoreyId,
): SpaceAssignment[] {
  return assignments.filter((row) => row.storey === storey);
}

export function kindCounts(assignments: PlannedSpace[]): Map<SpaceKind, number> {
  const map = new Map<SpaceKind, number>();
  for (const row of assignments) {
    map.set(row.kind, (map.get(row.kind) ?? 0) + 1);
  }
  return map;
}

export function assignmentsByZone(
  assignments: SpaceAssignment[],
): Partial<Record<VastuDirectionId, SpaceAssignment[]>> {
  const map: Partial<Record<VastuDirectionId, SpaceAssignment[]>> = {};
  for (const row of assignments) {
    (map[row.zone] ??= []).push(row);
  }
  return map;
}
