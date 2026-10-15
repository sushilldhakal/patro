import { getLocalStorageItem, setLocalStorageItem } from "@/lib/browser";
import type { VastuPlannerStorage } from "@vedic-patro/features/vastu";
import { PlotPlanner as Shared } from "@vedic-patro/ui/kit/jyotish";
import { HouseRequirementsForm } from "./HouseRequirementsForm";
import { OwnerCompatibility } from "./OwnerCompatibility";

const STORAGE: VastuPlannerStorage = { read: getLocalStorageItem, write: setLocalStorageItem };

export function PlotPlanner() {
  return (
    <Shared
      storage={STORAGE}
      renderOwner={() => <OwnerCompatibility />}
      renderRequirements={(args) => <HouseRequirementsForm {...args} />}
    />
  );
}

export default PlotPlanner;
