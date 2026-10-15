import { NativeStringSelect } from "@/components/ui/NativeStringSelect";
import type { HousePlan } from "@vedic-patro/domain/vastu-plan";
import { HouseRequirementsForm as Shared } from "@vedic-patro/ui/kit/jyotish";

export function HouseRequirementsForm({ plan, onChange }: { plan: HousePlan; onChange: (plan: HousePlan) => void }) {
  return (
    <Shared
      plan={plan}
      onChange={onChange}
      renderSelect={({ label, value, onChange: setValue, options }) => (
        <NativeStringSelect value={value} ariaLabel={label} options={options.map((option) => ({ value: option.id, label: option.label }))} onChange={setValue} />
      )}
    />
  );
}

export default HouseRequirementsForm;
