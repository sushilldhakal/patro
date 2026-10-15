/**
 * The vastu plot planner, shared by the website's and the app's
 * `components/vastu/PlotPlanner.tsx`: the plot inputs (kept as strings so a
 * half-typed number stays editable) and their range check, the house
 * requirements, both saved under the `vp.vastu.*` keys, the server sketch, the
 * rooms that could not fit, one sketch per storey, the Āyādi and entrance
 * cards, and copy. Each app passes its storage (sync on the web, async on
 * device: the saved values then replace the defaults a frame later).
 */
import { useEffect, useMemo, useState } from "react";
import { CARDINAL_WALLS, type CardinalWall } from "@vedic-patro/domain/vastu";
import {
  DEFAULT_HOUSE_PLAN,
  FLOOR_SPACES,
  assignmentsOnStorey,
  clampStoreys,
  isExtraSpace,
  kindCounts,
  parseFloorPref,
  storeyPref,
  type HousePlan,
  type SpaceKind,
  type StoreyId,
} from "@vedic-patro/domain/vastu-plan";
import { parseDimension } from "@vedic-patro/domain/vastu-plot-input";
import { useLocale } from "@vedic-patro/i18n/react";
import { useVastuSketch, type VastuSketchOffline } from "./use-vastu-sketch";

export const VASTU_HOUSE_KEY = "vp.vastu.house";
export const VASTU_PLOT_KEY = "vp.vastu.plot";
const MIN_M = 3;
const MAX_M = 100;

/** Plot dimensions, kept as strings so a half-typed number stays editable. */
export interface PlotState {
  /** North–South, metres. */
  length: string;
  /** East–West, metres. */
  breadth: string;
  facing: CardinalWall;
}

export const DEFAULT_PLOT_STATE: PlotState = { length: "10", breadth: "15", facing: "east" };

/** Where the planner keeps its two inputs: `read` may answer now (web) or later (device). */
export type VastuPlannerStorage = {
  read: (key: string) => string | null | Promise<string | null>;
  write: (key: string, value: string) => void;
};

/**
 * `kitchen_dining` is the *combined* room, so it can never coexist with a
 * separate `kitchen` or `dining`. The separate rooms win: the only way to reach
 * that state is by turning `kitchen`/`dining` on, so honour the latest action.
 */
export function normalizeExtras(extras: SpaceKind[]): SpaceKind[] {
  if (!extras.includes("kitchen_dining")) return extras;
  if (!extras.includes("kitchen") && !extras.includes("dining")) return extras;
  return extras.filter((x) => x !== "kitchen_dining");
}

export function parseStoredHousePlan(raw: string | null): HousePlan {
  if (!raw) return DEFAULT_HOUSE_PLAN;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return DEFAULT_HOUSE_PLAN;
    const p = parsed as Partial<HousePlan>;
    const extras = Array.isArray(p.extras)
      ? normalizeExtras(p.extras.filter((id): id is SpaceKind => typeof id === "string" && isExtraSpace(id)))
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
  return { length: dimString((east + west) / 2), breadth: dimString((north + south) / 2) };
}

export function parseStoredPlot(raw: string | null): PlotState {
  if (!raw) return DEFAULT_PLOT_STATE;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return DEFAULT_PLOT_STATE;
    const p = parsed as Record<string, unknown>;
    const facing = CARDINAL_WALLS.includes(p.facing as CardinalWall) ? (p.facing as CardinalWall) : DEFAULT_PLOT_STATE.facing;
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

function readNow<T>(value: string | null | Promise<string | null>, parse: (raw: string | null) => T, fallback: T): T {
  return value instanceof Promise ? fallback : parse(value);
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

export type AyadiRow = { key: string; label: string; value: string; strong?: boolean };

export function usePlotPlanner({ storage, offline }: { storage: VastuPlannerStorage; offline?: VastuSketchOffline }) {
  const { t, digits } = useLocale();
  const [plot, setPlot] = useState<PlotState>(() => readNow(storage.read(VASTU_PLOT_KEY), parseStoredPlot, DEFAULT_PLOT_STATE));
  const [house, setHouse] = useState<HousePlan>(() =>
    readNow(storage.read(VASTU_HOUSE_KEY), parseStoredHousePlan, DEFAULT_HOUSE_PLAN),
  );

  // Async storage: the saved values replace the defaults once it answers.
  useEffect(() => {
    let cancelled = false;
    const plotRaw = storage.read(VASTU_PLOT_KEY);
    const houseRaw = storage.read(VASTU_HOUSE_KEY);
    if (plotRaw instanceof Promise) void plotRaw.then((raw) => !cancelled && setPlot(parseStoredPlot(raw)));
    if (houseRaw instanceof Promise) void houseRaw.then((raw) => !cancelled && setHouse(parseStoredHousePlan(raw)));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- read once, on mount
  }, []);

  function updateHouse(next: HousePlan) {
    setHouse(next);
    storage.write(VASTU_HOUSE_KEY, JSON.stringify(next));
  }

  function update(next: Partial<PlotState>) {
    setPlot((prev) => {
      const merged = { ...prev, ...next };
      storage.write(VASTU_PLOT_KEY, JSON.stringify(merged));
      return merged;
    });
  }

  const storeys = clampStoreys(house.storeys);
  const parsed = { length: parseDimension(plot.length), breadth: parseDimension(plot.breadth) };
  const errors = {
    length: parsed.length === null || parsed.length < MIN_M || parsed.length > MAX_M,
    breadth: parsed.breadth === null || parsed.breadth < MIN_M || parsed.breadth > MAX_M,
  };
  const lengthM = clamp(parsed.length ?? Number(DEFAULT_PLOT_STATE.length), MIN_M, MAX_M);
  const breadthM = clamp(parsed.breadth ?? Number(DEFAULT_PLOT_STATE.breadth), MIN_M, MAX_M);
  const footprint = useMemo(() => ({ width: breadthM, height: lengthM }), [breadthM, lengthM]);

  // Zone placement, the Āyādi check and the entrance corner all come from the
  // server (POST /vastu/sketch); the apps only lay out what it returns.
  const sketchQuery = useVastuSketch({ widthM: breadthM, depthM: lengthM, facing: plot.facing }, house, { offline });
  const sketch = sketchQuery.data;
  const assignments = sketch?.assignments ?? [];
  const leftover = sketch?.leftover ?? [];
  const counts = kindCounts(leftover);
  const ayadi = sketch?.ayadi ?? null;
  const preferredCorner = sketch?.entrance.preferred_corner;

  const cannotFit = leftover.length
    ? {
        heading: t("vastu.plan.cannot_fit_heading"),
        blurb: t("vastu.plan.cannot_fit_blurb"),
        items: leftover.map((row) => {
          const many = (counts.get(row.kind) ?? 0) > 1 && row.kind !== "staircase";
          const name =
            many && row.index != null
              ? t(`vastu.plan.space.${row.kind}_n`, { n: digits(row.index) })
              : t(`vastu.plan.space.${row.kind}`);
          return { id: row.id, name };
        }),
      }
    : null;

  const storeyRows = Array.from({ length: storeys }, (_, i) => i as StoreyId).map((storey) => ({
    storey,
    title: storeys > 1 ? t(`vastu.plan.floor.${storeyPref(storey)}`) : null,
    assignments: assignmentsOnStorey(assignments, storey),
  }));

  const metres = (m: number, hasta: number) =>
    `${digits(m.toFixed(1))} ${t("vastu.plot.unit_m")} · ${digits(hasta.toFixed(1))} ${t("vastu.plot.unit_hasta")}`;

  const ayadiCard = ayadi
    ? {
        heading: t("vastu.plot.ayadi_heading"),
        rows: [
          { key: "length", label: t("vastu.plot.footprint_length_label"), value: metres(footprint.height, ayadi.length_hasta) },
          { key: "width", label: t("vastu.plot.footprint_width_label"), value: metres(footprint.width, ayadi.width_hasta) },
          { key: "remainder", label: t("vastu.plot.ayadi_remainder_label"), value: digits(ayadi.remainder), strong: true },
        ] as AyadiRow[],
        auspicious: ayadi.auspicious,
        verdict: t(ayadi.auspicious ? "vastu.plot.ayadi_auspicious" : "vastu.plot.ayadi_inauspicious"),
        suggestion:
          ayadi.suggested_hasta !== null && ayadi.suggested_meters !== null
            ? t("vastu.plot.ayadi_suggestion", {
                hasta: digits(ayadi.suggested_hasta),
                meters: digits(ayadi.suggested_meters.toFixed(1)),
              })
            : null,
        disclaimer: t("vastu.plot.ayadi_disclaimer"),
      }
    : null;

  const entranceCard = ayadi
    ? {
        heading: t("vastu.plot.entrance_heading"),
        note: t("vastu.plot.entrance_note", {
          wall: t(`vastu.dir.${plot.facing}.name`),
          corner: t(`vastu.dir.${preferredCorner}.name`),
        }),
        disclaimer: t("vastu.plot.entrance_disclaimer"),
      }
    : null;

  return {
    plot,
    update,
    errors,
    house,
    updateHouse,
    footprint,
    facingOptions: CARDINAL_WALLS.map((wall) => ({ value: wall, label: t(`vastu.dir.${wall}.name`) })),
    storeys: storeyRows,
    cannotFit,
    ayadiCard,
    entranceCard,
    copy: {
      heading: t("vastu.plot.heading"),
      blurb: t("vastu.plot.blurb"),
      lengthLabel: t("vastu.plot.length_label"),
      breadthLabel: t("vastu.plot.breadth_label"),
      facingLabel: t("vastu.plot.facing_label"),
      rangeError: errors.length || errors.breadth ? t("vastu.plot.range_error", { min: digits(MIN_M), max: digits(MAX_M) }) : null,
      layoutHeading: t("vastu.plan.layout_heading"),
      layoutBlurb: t("vastu.plan.layout_blurb"),
      sketchStatus: sketch ? null : sketchQuery.isError ? t("vastu.plan.sketch_error") : t("vastu.plan.sketch_loading"),
      disclaimer: t("vastu.sketch.disclaimer"),
      bufferNote: t("vastu.plot.buffer_note"),
      marmaNote: t("vastu.plot.marma_note"),
    },
  };
}
