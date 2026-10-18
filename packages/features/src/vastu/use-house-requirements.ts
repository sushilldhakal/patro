/**
 * The house requirements form, shared by the website's and the app's
 * `components/vastu/HouseRequirementsForm.tsx`: every select (with its
 * options), the essential and optional space chips, the combined
 * kitchen+dining switch, the per-storey floor choices, and copy. The form is
 * controlled — the planner owns the plan.
 */
import {
  ESSENTIAL_SPACES,
  FLOOR_SPACES,
  OPTIONAL_SPACES,
  clampStoreys,
  type FloorPref,
  type HousePlan,
  type SpaceKind,
  type VastuMode,
} from "@vedic-patro/domain/vastu/vastu-plan";
import { useLocale } from "@vedic-patro/i18n/react";
import { normalizeExtras } from "./use-plot-planner";

export type HouseFieldOption = { id: string; label: string };
export type HouseField = {
  id: string;
  label: string;
  value: string;
  options: HouseFieldOption[];
  onChange: (value: string) => void;
};
export type HouseSpaceChip = { id: SpaceKind; label: string; on: boolean; toggle: () => void };

export function useHouseRequirements({ plan, onChange }: { plan: HousePlan; onChange: (plan: HousePlan) => void }) {
  const { t, digits } = useLocale();

  function commit(next: HousePlan) {
    const masterBedroom = Math.min(next.masterBedroom, next.bedrooms);
    onChange({ ...next, masterBedroom, extras: normalizeExtras(next.extras) });
  }

  function toggleExtra(id: SpaceKind) {
    const adding = !plan.extras.includes(id);
    const extras = adding ? [...plan.extras, id] : plan.extras.filter((x) => x !== id);
    // A staircase with nothing to climb to is never actually built, so
    // checking it on a single storey bumps storeys rather than silently no-op.
    const storeys = adding && id === "staircase" && plan.storeys === 1 ? 2 : plan.storeys;
    commit({ ...plan, extras, storeys });
  }

  // kitchen_dining is mutually exclusive with separate kitchen+dining — one
  // dedicated switch swaps between the two.
  const combineKitchenDining = plan.extras.includes("kitchen_dining");
  function toggleKitchenDining() {
    const extras: SpaceKind[] = combineKitchenDining
      ? [...plan.extras.filter((x) => x !== "kitchen_dining"), "kitchen", "dining"]
      : [...plan.extras.filter((x) => x !== "kitchen" && x !== "dining"), "kitchen_dining"];
    commit({ ...plan, extras });
  }

  const counts = (min: number, max: number): HouseFieldOption[] =>
    Array.from({ length: max - min + 1 }, (_, i) => {
      const n = min + i;
      return { id: String(n), label: digits(n) };
    });

  const storeys = clampStoreys(plan.storeys);
  const floorChoices: FloorPref[] =
    storeys >= 3 ? ["any", "ground", "first", "third"] : storeys === 2 ? ["any", "ground", "first"] : ["any", "ground"];
  const floorSpaces = FLOOR_SPACES.filter((id) => id === "master_bedroom" || plan.extras.includes(id));

  const fields: HouseField[] = [
    {
      id: "plan-bedrooms",
      label: t("vastu.plan.bedrooms"),
      value: String(plan.bedrooms),
      options: counts(1, 5),
      onChange: (v) => commit({ ...plan, bedrooms: Number(v) }),
    },
    {
      id: "plan-master",
      label: t("vastu.plan.master_bedroom"),
      value: String(plan.masterBedroom),
      options: Array.from({ length: plan.bedrooms }, (_, i) => ({
        id: String(i + 1),
        label: t("vastu.plan.bedroom_n", { n: digits(i + 1) }),
      })),
      onChange: (v) => commit({ ...plan, masterBedroom: Number(v) }),
    },
    {
      id: "plan-toilets",
      label: t("vastu.plan.toilets"),
      value: String(plan.toilets),
      options: counts(1, 5),
      onChange: (v) => commit({ ...plan, toilets: Number(v) }),
    },
    {
      id: "plan-bathrooms",
      label: t("vastu.plan.bathrooms"),
      value: String(plan.bathrooms),
      options: counts(1, 5),
      onChange: (v) => commit({ ...plan, bathrooms: Number(v) }),
    },
    {
      id: "plan-combined",
      label: t("vastu.plan.combined"),
      value: String(plan.combined),
      options: counts(0, 5),
      onChange: (v) => commit({ ...plan, combined: Number(v) }),
    },
    {
      id: "plan-mode",
      label: t("vastu.plan.mode_label"),
      value: plan.mode,
      options: (["flexible", "strict"] as VastuMode[]).map((mode) => ({ id: mode, label: t(`vastu.plan.mode.${mode}`) })),
      onChange: (v) => commit({ ...plan, mode: v as VastuMode }),
    },
    {
      id: "plan-storeys",
      label: t("vastu.plan.storeys"),
      value: String(storeys),
      options: [1, 2, 3].map((n) => ({ id: String(n), label: t(`vastu.plan.storeys_${n}`) })),
      onChange: (v) => commit({ ...plan, storeys: clampStoreys(Number(v)) }),
    },
  ];

  const chip = (id: SpaceKind): HouseSpaceChip => ({
    id,
    label: t(`vastu.plan.space.${id}`),
    on: plan.extras.includes(id),
    toggle: () => toggleExtra(id),
  });

  const floorFields: HouseField[] =
    storeys > 1
      ? floorSpaces.map((id) => {
          const value = plan.floors?.[id] ?? "any";
          return {
            id: `plan-floor-${id}`,
            label: `${t(`vastu.plan.space.${id}`)} · ${t("vastu.plan.floor_heading")}`,
            value: floorChoices.includes(value) ? value : "any",
            options: floorChoices.map((floor) => ({ id: floor, label: t(`vastu.plan.floor.${floor}`) })),
            onChange: (v: string) => commit({ ...plan, floors: { ...plan.floors, [id]: v as FloorPref } }),
          };
        })
      : [];

  return {
    fields,
    essential: ESSENTIAL_SPACES.map(chip),
    optional: OPTIONAL_SPACES.map(chip),
    combine: {
      checked: combineKitchenDining,
      toggle: toggleKitchenDining,
      title: t("vastu.plan.combine_kitchen_dining"),
      note: t("vastu.plan.combine_kitchen_dining_note"),
    },
    floorFields,
    copy: {
      heading: t("vastu.plan.requirements_heading"),
      blurb: t("vastu.plan.requirements_blurb"),
      essential: t("vastu.plan.essential"),
      optional: t("vastu.plan.optional"),
    },
  };
}
