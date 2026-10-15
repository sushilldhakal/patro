import { NativeStringSelect } from "@/components/ui/NativeStringSelect";
import { useBreakpoint } from "@/lib/responsive";
import { localVastuSketch } from "@/lib/vastu-offline";
import { vastuStorage } from "@/lib/vastu-storage";
import { PlotPlanner as Shared } from "@vedic-patro/ui/kit/jyotish";
import { HouseRequirementsForm } from "./HouseRequirementsForm";
import { OwnerCompatibility } from "./OwnerCompatibility";

const MAX_SKETCH = 900;
const SKETCH_CHROME = 56;

export function PlotPlanner() {
  const { width, isTablet } = useBreakpoint();
  const sketchSize = Math.round(Math.min(MAX_SKETCH, Math.max(240, width - SKETCH_CHROME)) * (isTablet ? 0.9 : 1));
  return (
    <Shared
      storage={vastuStorage}
      offline={localVastuSketch}
      sketchSize={sketchSize}
      renderSelect={({ value, label, options, onChange }) => (
        <NativeStringSelect value={value} ariaLabel={label} options={options} onChange={onChange} />
      )}
      renderOwner={() => <OwnerCompatibility />}
      renderRequirements={(args) => <HouseRequirementsForm {...args} />}
    />
  );
}

export default PlotPlanner;
