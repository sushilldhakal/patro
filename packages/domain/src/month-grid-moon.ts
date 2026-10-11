/** Shared by apps/web/src/components/panchanga/PanchangaMonthGrid.tsx and apps/mobile/components/home/PanchangaMonthGrid.tsx (moved here from both, unchanged). */
import type { CalendarDay } from "@vedic-patro/api-client";

export type PakshaPhase = "shukla" | "krishna";

export function getPakshaPhase(day: CalendarDay): PakshaPhase | undefined {
  if (day.paksha === "shukla" || day.paksha_ne?.includes("शुक्ल")) return "shukla";
  if (day.paksha === "krishna" || day.paksha_ne?.includes("कृष्ण")) return "krishna";
  return undefined;
}

export function moonPhaseTitle(phase: PakshaPhase | undefined, isEn: boolean): string | undefined {
  if (phase === "shukla") return isEn ? "Shukla paksha (waxing moon)" : "शुक्ल पक्ष";
  if (phase === "krishna") return isEn ? "Krishna paksha (waning moon)" : "कृष्ण पक्ष";
  return undefined;
}
