import type { HousePlan } from "@vedic-patro/domain/vastu-plan";
import { useHouseRequirements, type HouseSpaceChip } from "@vedic-patro/features/vastu";
import { cn } from "@vedic-patro/domain/utils";
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

function SpaceChips({ chips }: { chips: HouseSpaceChip[] }) {
  return (
    <div className={vastuClasses.chipRow}>
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          aria-pressed={chip.on}
          onClick={chip.toggle}
          className={cn(
            vastuClasses.spaceChip,
            vastuClasses.spaceChipText,
            chip.on
              ? cn(vastuClasses.spaceChipOn, vastuClasses.spaceChipTextOn)
              : cn(vastuClasses.spaceChipOff, vastuClasses.spaceChipTextOff, "hover:text-foreground"),
          )}
        >
          {chip.label}
        </button>
      ))}
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
  const v = useHouseRequirements({ plan, onChange });

  return (
    <div className="space-y-4">
      <div>
        <h3 className={vastuClasses.requirementsHeading}>{v.copy.heading}</h3>
        <p className={vastuClasses.requirementsBlurb}>{v.copy.blurb}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {v.fields.map((f) => (
          <Field key={f.id} {...f} />
        ))}
      </div>

      <div>
        <p className={vastuClasses.groupLabel}>{v.copy.essential}</p>
        <SpaceChips chips={v.essential} />

        <label className={cn(vastuClasses.checkboxRow, "text-xs")}>
          <input type="checkbox" className="mt-0.5" checked={v.combine.checked} onChange={v.combine.toggle} />
          <span>
            <span className={cn(vastuClasses.checkboxTitle, "block")}>{v.combine.title}</span>
            <span className={cn(vastuClasses.checkboxNote, "block")}>{v.combine.note}</span>
          </span>
        </label>

        <p className={cn(vastuClasses.groupLabel, "mt-3")}>{v.copy.optional}</p>
        <SpaceChips chips={v.optional} />
      </div>

      {v.floorFields.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {v.floorFields.map((f) => (
            <Field key={f.id} {...f} />
          ))}
        </div>
      )}
    </div>
  );
}

export default HouseRequirementsForm;
