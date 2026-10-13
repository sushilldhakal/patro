import { getLocalStorageItem } from "@/lib/browser";
import {
  DEFAULT_HOUSE_PLAN,
  FLOOR_SPACES,
  clampStoreys,
  isExtraSpace,
  parseFloorPref,
  type HousePlan,
  type SpaceKind,
} from "@vedic-patro/domain/vastu-plan";

const PLAN_KEY = "vp.vastu.house";

/**
 * `kitchen_dining` is the *combined* room, so it can never coexist with a
 * separate `kitchen` or `dining` — asking for both makes the engine dutifully
 * build a kitchen, a dining room AND a kitchen+dining room (three cooking/
 * eating spaces nobody asked for). The dedicated checkbox always swapped
 * correctly, but the Essential-spaces "Kitchen"/"Dining room" buttons went
 * through `toggleExtra`, which just appended — so turning either back on
 * while combined was ticked produced exactly that. Enforced here, at the one
 * place every extras change passes through, rather than per toggle.
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

export function readPlan(): HousePlan {
  const raw = getLocalStorageItem(PLAN_KEY);
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
        const parsed = parseFloorPref(p.floors[key]);
        if (parsed) floors[key] = parsed;
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
