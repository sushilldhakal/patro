import { useTranslation } from "react-i18next";
import { getLocalStorageItem } from "@/lib/browser";
import { useLocale } from "@/i18n/locale";
import {
  DEFAULT_HOUSE_PLAN,
  ESSENTIAL_SPACES,
  FLOOR_SPACES,
  OPTIONAL_SPACES,
  clampStoreys,
  isExtraSpace,
  parseFloorPref,
  type FloorPref,
  type HousePlan,
  type SpaceKind,
  type VastuMode,
} from "@/lib/vastu-plan";
import { cn } from "@/lib/utils";

const PLAN_KEY = "vp.vastu.house";

const selectClass =
  "h-9 w-full min-w-0 rounded-lg border border-border bg-card px-2 text-sm text-foreground cursor-pointer";

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
function normalizeExtras(extras: SpaceKind[]): SpaceKind[] {
  if (!extras.includes("kitchen_dining")) return extras;
  if (!extras.includes("kitchen") && !extras.includes("dining")) return extras;
  return extras.filter((x) => x !== "kitchen_dining");
}

function readPlan(): HousePlan {
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

function Field({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { id: string; label: string }[];
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1 block text-xs font-semibold text-muted-foreground">
        {label}
      </label>
      <select
        id={id}
        className={selectClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function HouseRequirementsForm({
  plan,
  onChange,
}: {
  plan: HousePlan;
  onChange: (plan: HousePlan) => void;
}) {
  const { t } = useTranslation();
  const { digits } = useLocale();

  function commit(next: HousePlan) {
    const masterBedroom = Math.min(next.masterBedroom, next.bedrooms);
    onChange({ ...next, masterBedroom, extras: normalizeExtras(next.extras) });
  }

  function toggleExtra(id: SpaceKind) {
    const adding = !plan.extras.includes(id);
    const extras = adding ? [...plan.extras, id] : plan.extras.filter((x) => x !== id);
    // A staircase with nothing to climb to is never actually built — see engine.ts's
    // wantStair. Checking it while on a single storey must bump storeys, not silently
    // no-op.
    const storeys = adding && id === "staircase" && plan.storeys === 1 ? 2 : plan.storeys;
    commit({ ...plan, extras, storeys });
  }

  // kitchen_dining is mutually exclusive with separate kitchen+dining — one dedicated
  // checkbox swaps between the two rather than living alongside them as a third,
  // independently-toggleable extra.
  const combineKitchenDining = plan.extras.includes("kitchen_dining");
  function toggleKitchenDining() {
    const extras: SpaceKind[] = combineKitchenDining
      ? [...plan.extras.filter((x) => x !== "kitchen_dining"), "kitchen", "dining"]
      : [...plan.extras.filter((x) => x !== "kitchen" && x !== "dining"), "kitchen_dining"];
    commit({ ...plan, extras });
  }

  const counts = (min: number, max: number) =>
    Array.from({ length: max - min + 1 }, (_, i) => {
      const n = min + i;
      return { id: String(n), label: digits(n) };
    });

  const storeys = clampStoreys(plan.storeys);
  const floorChoices: FloorPref[] =
    storeys >= 3 ? ["any", "ground", "first", "third"] : storeys === 2 ? ["any", "ground", "first"] : ["any", "ground"];
  const floorFields = FLOOR_SPACES.filter((id) => id === "master_bedroom" || plan.extras.includes(id));

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{t("vastu.plan.requirements_heading")}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{t("vastu.plan.requirements_blurb")}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Field
          id="plan-bedrooms"
          label={t("vastu.plan.bedrooms")}
          value={String(plan.bedrooms)}
          options={counts(1, 5)}
          onChange={(v) => commit({ ...plan, bedrooms: Number(v) })}
        />
        <Field
          id="plan-master"
          label={t("vastu.plan.master_bedroom")}
          value={String(plan.masterBedroom)}
          options={Array.from({ length: plan.bedrooms }, (_, i) => ({
            id: String(i + 1),
            label: t("vastu.plan.bedroom_n", { n: digits(i + 1) }),
          }))}
          onChange={(v) => commit({ ...plan, masterBedroom: Number(v) })}
        />
        <Field
          id="plan-toilets"
          label={t("vastu.plan.toilets")}
          value={String(plan.toilets)}
          options={counts(1, 5)}
          onChange={(v) => commit({ ...plan, toilets: Number(v) })}
        />
        <Field
          id="plan-bathrooms"
          label={t("vastu.plan.bathrooms")}
          value={String(plan.bathrooms)}
          options={counts(1, 5)}
          onChange={(v) => commit({ ...plan, bathrooms: Number(v) })}
        />
        <Field
          id="plan-combined"
          label={t("vastu.plan.combined")}
          value={String(plan.combined)}
          options={counts(0, 5)}
          onChange={(v) => commit({ ...plan, combined: Number(v) })}
        />
        <Field
          id="plan-mode"
          label={t("vastu.plan.mode_label")}
          value={plan.mode}
          options={(["flexible", "strict"] as VastuMode[]).map((mode) => ({
            id: mode,
            label: t(`vastu.plan.mode.${mode}`),
          }))}
          onChange={(v) => commit({ ...plan, mode: v as VastuMode })}
        />
        <Field
          id="plan-storeys"
          label={t("vastu.plan.storeys")}
          value={String(storeys)}
          options={[1, 2, 3].map((n) => ({
            id: String(n),
            label: t(`vastu.plan.storeys_${n}`),
          }))}
          onChange={(v) => commit({ ...plan, storeys: clampStoreys(Number(v)) })}
        />
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-muted-foreground">{t("vastu.plan.essential")}</p>
        <div className="flex flex-wrap gap-1.5">
          {ESSENTIAL_SPACES.map((id) => {
            const on = plan.extras.includes(id);
            return (
              <button
                key={id}
                type="button"
                aria-pressed={on}
                onClick={() => toggleExtra(id)}
                className={cn(
                  "rounded-md border px-2 py-1 text-xs font-semibold",
                  on
                    ? "border-transparent bg-secondary text-secondary-foreground"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {t(`vastu.plan.space.${id}`)}
              </button>
            );
          })}
        </div>

        <label className="mt-3 flex items-start gap-2 rounded-lg border border-border p-2.5 text-xs">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={combineKitchenDining}
            onChange={toggleKitchenDining}
          />
          <span>
            <span className="block font-semibold text-foreground">{t("vastu.plan.combine_kitchen_dining")}</span>
            <span className="mt-0.5 block text-muted-foreground">{t("vastu.plan.combine_kitchen_dining_note")}</span>
          </span>
        </label>

        <p className="mb-2 mt-3 text-xs font-semibold text-muted-foreground">{t("vastu.plan.optional")}</p>
        <div className="flex flex-wrap gap-1.5">
          {OPTIONAL_SPACES.map((id) => {
            const on = plan.extras.includes(id);
            return (
              <button
                key={id}
                type="button"
                aria-pressed={on}
                onClick={() => toggleExtra(id)}
                className={cn(
                  "rounded-md border px-2 py-1 text-xs font-semibold",
                  on
                    ? "border-transparent bg-secondary text-secondary-foreground"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {t(`vastu.plan.space.${id}`)}
              </button>
            );
          })}
        </div>
      </div>

      {storeys > 1 && floorFields.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {floorFields.map((id) => {
            const value = plan.floors?.[id] ?? "any";
            const safe = floorChoices.includes(value) ? value : "any";
            return (
              <Field
                key={id}
                id={`plan-floor-${id}`}
                label={`${t(`vastu.plan.space.${id}`)} · ${t("vastu.plan.floor_heading")}`}
                value={safe}
                options={floorChoices.map((floor) => ({
                  id: floor,
                  label: t(`vastu.plan.floor.${floor}`),
                }))}
                onChange={(v) => commit({ ...plan, floors: { ...plan.floors, [id]: v as FloorPref } })}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export { readPlan };

export default HouseRequirementsForm;
