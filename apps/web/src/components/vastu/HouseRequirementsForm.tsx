import { useTranslation } from "react-i18next";
import { useLocale } from "@/i18n/locale";
import {
  ESSENTIAL_SPACES,
  FLOOR_SPACES,
  OPTIONAL_SPACES,
  clampStoreys,
  type FloorPref,
  type HousePlan,
  type SpaceKind,
  type VastuMode,
} from "@vedic-patro/domain/vastu-plan";
import { cn } from "@vedic-patro/domain/utils";
import { normalizeExtras } from "./house-plan-storage";
import { vastuClasses } from "@vedic-patro/design-tokens/classes/vastu-classes";

const selectClass = cn(vastuClasses.selectControl, "w-full cursor-pointer");

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
      <label htmlFor={id} className={cn(vastuClasses.fieldLabel, "block")}>
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
        <h3 className={vastuClasses.requirementsHeading}>{t("vastu.plan.requirements_heading")}</h3>
        <p className={vastuClasses.requirementsBlurb}>{t("vastu.plan.requirements_blurb")}</p>
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
        <p className={vastuClasses.groupLabel}>{t("vastu.plan.essential")}</p>
        <div className={vastuClasses.chipRow}>
          {ESSENTIAL_SPACES.map((id) => {
            const on = plan.extras.includes(id);
            return (
              <button
                key={id}
                type="button"
                aria-pressed={on}
                onClick={() => toggleExtra(id)}
                className={cn(
                  vastuClasses.spaceChip,
                  vastuClasses.spaceChipText,
                  on
                    ? cn(vastuClasses.spaceChipOn, vastuClasses.spaceChipTextOn)
                    : cn(vastuClasses.spaceChipOff, vastuClasses.spaceChipTextOff, "hover:text-foreground"),
                )}
              >
                {t(`vastu.plan.space.${id}`)}
              </button>
            );
          })}
        </div>

        <label className={cn(vastuClasses.checkboxRow, "text-xs")}>
          <input
            type="checkbox"
            className="mt-0.5"
            checked={combineKitchenDining}
            onChange={toggleKitchenDining}
          />
          <span>
            <span className={cn(vastuClasses.checkboxTitle, "block")}>{t("vastu.plan.combine_kitchen_dining")}</span>
            <span className={cn(vastuClasses.checkboxNote, "block")}>{t("vastu.plan.combine_kitchen_dining_note")}</span>
          </span>
        </label>

        <p className={cn(vastuClasses.groupLabel, "mt-3")}>{t("vastu.plan.optional")}</p>
        <div className={vastuClasses.chipRow}>
          {OPTIONAL_SPACES.map((id) => {
            const on = plan.extras.includes(id);
            return (
              <button
                key={id}
                type="button"
                aria-pressed={on}
                onClick={() => toggleExtra(id)}
                className={cn(
                  vastuClasses.spaceChip,
                  vastuClasses.spaceChipText,
                  on
                    ? cn(vastuClasses.spaceChipOn, vastuClasses.spaceChipTextOn)
                    : cn(vastuClasses.spaceChipOff, vastuClasses.spaceChipTextOff, "hover:text-foreground"),
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

export default HouseRequirementsForm;
