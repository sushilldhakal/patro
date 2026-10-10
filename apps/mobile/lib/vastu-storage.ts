/**
 * Persistence for the वास्तु planner's two inputs — the plot and the house
 * requirements.
 *
 * The web app reads both synchronously out of `localStorage` inside
 * `useState` initialisers (`readPlot`/`readPlan` in `PlotPlanner.tsx` and
 * `HouseRequirementsForm.tsx`). `expo-secure-store` is async, so the parsing
 * lives here instead and `PlotPlanner` hydrates from it on mount: the same
 * keys, the same defaults, the same tolerance for junk in storage — only the
 * read is deferred by a frame.
 *
 * Keys match the web app's (`vp.vastu.*`) so a value written by the web build
 * is still recognisable when the two ever share a store.
 */

import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { CARDINAL_WALLS, type CardinalWall } from "@vedic-patro/domain/vastu";
import {
  DEFAULT_HOUSE_PLAN,
  FLOOR_SPACES,
  clampStoreys,
  isExtraSpace,
  parseFloorPref,
  type HousePlan,
  type SpaceKind,
} from "@/lib/vastu-plan";

export const HOUSE_KEY = "vp.vastu.house";
export const PLOT_KEY = "vp.vastu.plot";

/** Plot dimensions, kept as strings so a half-typed number stays editable. */
export interface PlotState {
  /** North–South, metres. */
  length: string;
  /** East–West, metres. */
  breadth: string;
  facing: CardinalWall;
}

export const DEFAULT_PLOT_STATE: PlotState = {
  length: "10",
  breadth: "15",
  facing: "east",
};

async function readRaw(key: string): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      if (typeof localStorage === "undefined") return null;
      return localStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function writeRaw(key: string, value: string): Promise<void> {
  try {
    if (Platform.OS === "web") {
      localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  } catch {
    // ignore persistence errors
  }
}

/**
 * `kitchen_dining` is the *combined* room, so it can never coexist with a
 * separate `kitchen` or `dining` — asking for both makes the engine dutifully
 * build a kitchen, a dining room AND a kitchen+dining room (three cooking/
 * eating spaces nobody asked for). Enforced at the one place every extras
 * change passes through rather than per toggle.
 *
 * The separate rooms win: the only way to reach the invalid state is by
 * turning `kitchen`/`dining` on, so honouring that most recent action is
 * what the person actually asked for (and matches DEFAULT_HOUSE_PLAN, where
 * combining is the opt-in, not the default).
 */
export function normalizeExtras(extras: SpaceKind[]): SpaceKind[] {
  if (!extras.includes("kitchen_dining")) return extras;
  if (!extras.includes("kitchen") && !extras.includes("dining")) return extras;
  return extras.filter((x) => x !== "kitchen_dining");
}

function parseHousePlan(raw: string | null): HousePlan {
  if (!raw) return DEFAULT_HOUSE_PLAN;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return DEFAULT_HOUSE_PLAN;
    const p = parsed as Partial<HousePlan>;
    const extras = Array.isArray(p.extras)
      ? normalizeExtras(
          p.extras.filter((id): id is SpaceKind => typeof id === "string" && isExtraSpace(id)),
        )
      : DEFAULT_HOUSE_PLAN.extras;
    const floors: HousePlan["floors"] = {};
    if (p.floors && typeof p.floors === "object") {
      for (const key of FLOOR_SPACES) {
        const pref = parseFloorPref(p.floors[key]);
        if (pref) floors[key] = pref;
      }
    }
    return {
      bedrooms: Number(p.bedrooms) || DEFAULT_HOUSE_PLAN.bedrooms,
      toilets: Number(p.toilets) || DEFAULT_HOUSE_PLAN.toilets,
      bathrooms: Number(p.bathrooms) || DEFAULT_HOUSE_PLAN.bathrooms,
      combined: Number.isFinite(Number(p.combined)) ? Number(p.combined) : DEFAULT_HOUSE_PLAN.combined,
      masterBedroom: Number(p.masterBedroom) || DEFAULT_HOUSE_PLAN.masterBedroom,
      extras,
      mode: p.mode === "strict" ? "strict" : "flexible",
      storeys: clampStoreys(Number(p.storeys) || DEFAULT_HOUSE_PLAN.storeys),
      floors,
    };
  } catch {
    return DEFAULT_HOUSE_PLAN;
  }
}

function dimString(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/** Earlier builds stored four wall lengths; average them into one box. */
function fromLegacyWalls(p: Record<string, unknown>): Pick<PlotState, "length" | "breadth"> | null {
  const num = (key: string) => {
    const v = p[key];
    if (typeof v !== "string" && typeof v !== "number") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const north = num("north");
  const south = num("south");
  const east = num("east");
  const west = num("west");
  if (north == null || south == null || east == null || west == null) return null;
  return {
    length: dimString((east + west) / 2),
    breadth: dimString((north + south) / 2),
  };
}

function parsePlotState(raw: string | null): PlotState {
  if (!raw) return DEFAULT_PLOT_STATE;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return DEFAULT_PLOT_STATE;
    const p = parsed as Record<string, unknown>;
    const facing = CARDINAL_WALLS.includes(p.facing as CardinalWall)
      ? (p.facing as CardinalWall)
      : DEFAULT_PLOT_STATE.facing;
    if (typeof p.length === "string" && typeof p.breadth === "string") {
      return { length: p.length, breadth: p.breadth, facing };
    }
    const legacy = fromLegacyWalls(p);
    if (legacy) return { ...legacy, facing };
    return DEFAULT_PLOT_STATE;
  } catch {
    return DEFAULT_PLOT_STATE;
  }
}

export async function readStoredHousePlan(): Promise<HousePlan> {
  return parseHousePlan(await readRaw(HOUSE_KEY));
}

export async function readStoredPlot(): Promise<PlotState> {
  return parsePlotState(await readRaw(PLOT_KEY));
}

export function writeStoredHousePlan(plan: HousePlan): void {
  void writeRaw(HOUSE_KEY, JSON.stringify(plan));
}

export function writeStoredPlot(plot: PlotState): void {
  void writeRaw(PLOT_KEY, JSON.stringify(plot));
}
