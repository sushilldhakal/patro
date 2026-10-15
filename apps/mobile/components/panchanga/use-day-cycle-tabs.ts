import { useDayCycleToggle } from "@vedic-patro/features/panchanga-drawing";
import type { PatroHeaderTab } from "@/components/patro-date/PatroHeaderTabs";
import type { DayCycleMode } from "./DayCycleToggle";

/** The day-night | calendar-day toggle as tabs for the date header. */
export function useDayCycleTabs(mode: DayCycleMode, onModeChange: (mode: DayCycleMode) => void): { tabs: PatroHeaderTab[]; label: string } {
  const toggle = useDayCycleToggle(mode);
  return {
    label: toggle.groupLabel,
    tabs: toggle.options.map((o) => ({ key: o.value, label: o.label, active: o.value === mode, onPress: () => onModeChange(o.value) })),
  };
}
