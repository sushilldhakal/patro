import type { PatroApiLimits } from "@/lib/api";
import { applyPatroApiLimits } from "@/lib/patro-browse-years";
import {
  applyMonthLimits as applySharedMonthLimits,
  usePatroCapabilities as useSharedPatroCapabilities,
} from "@vedic-patro/features/patro-date";

/** Capabilities query (shared hook); the app's apply also records the offline-download span. */
export function usePatroCapabilities() {
  return useSharedPatroCapabilities(applyPatroApiLimits);
}

export function applyMonthLimits(limits?: PatroApiLimits | null) {
  applySharedMonthLimits(limits, applyPatroApiLimits);
}
