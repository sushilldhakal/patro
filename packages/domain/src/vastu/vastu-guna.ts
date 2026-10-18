/** Shared by apps/web/src/pages/Vastu.tsx and apps/mobile/app/(tabs)/vastu.tsx (moved here from both, unchanged). */
import type { VastuGunaId } from "./vastu";

export function gunaTone(guna: VastuGunaId): "sattva" | "tamas" | "tint" {
  if (guna === "sattva") return "sattva";
  if (guna === "tamas") return "tamas";
  return "tint";
}
