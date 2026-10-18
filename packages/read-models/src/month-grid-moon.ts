import type { CalendarDay } from "@vedic-patro/api-client";
import type { PakshaPhase } from "@vedic-patro/domain/month-grid-moon";

export * from "@vedic-patro/domain/month-grid-moon";

export function getPakshaPhase(day: CalendarDay): PakshaPhase | undefined {
  if (day.paksha === "shukla" || day.paksha_ne?.includes("शुक्ल")) return "shukla";
  if (day.paksha === "krishna" || day.paksha_ne?.includes("कृष्ण")) return "krishna";
  return undefined;
}
