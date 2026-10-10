/**
 * Sāit (auspicious-date) category metadata and BS-year helpers.
 *
 * There are NO hardcoded sāit dates here. Every listing shown in the app —
 * home-page Sāit tab, the per-ceremony pages and the vivāha page — is computed
 * on demand from JPL (NASA's Jet Propulsion Laboratory) via the API (`/nepal/sait/...`). This file
 * only holds the category list and pure (computed) year helpers.
 */
import {
  BS_SUPPORTED_END_YEAR,
  BS_SUPPORTED_START_YEAR,
  getCurrentBs,
} from "@/lib/bs-calendar";

export type SaitCategoryId =
  | "vivah"
  | "bratabandha"
  | "griha-aarambha"
  | "griha-pravesh"
  | "byaparik-pratisthan"
  | "rudri-jurne"
  | "agni-jurne"
  | "annaprasan";

/** All BS years supported by the calendar (same range as month/year pickers). */
export const SAIT_YEARS = Array.from(
  { length: BS_SUPPORTED_END_YEAR - BS_SUPPORTED_START_YEAR + 1 },
  (_, i) => BS_SUPPORTED_START_YEAR + i,
);

export function clampSaitYear(year?: number): number {
  if (
    year != null &&
    year >= BS_SUPPORTED_START_YEAR &&
    year <= BS_SUPPORTED_END_YEAR
  ) {
    return year;
  }
  const { year: current } = getCurrentBs();
  if (current >= BS_SUPPORTED_START_YEAR && current <= BS_SUPPORTED_END_YEAR) {
    return current;
  }
  return BS_SUPPORTED_START_YEAR;
}

export const SAIT_CATEGORIES: { id: SaitCategoryId; label: string }[] = [
  { id: "vivah", label: "विवाह" },
  { id: "bratabandha", label: "ब्रतबन्ध" },
  { id: "griha-aarambha", label: "गृह आराम्भ" },
  { id: "griha-pravesh", label: "गृह प्रवेश" },
  { id: "byaparik-pratisthan", label: "व्यापारिक प्रतिष्ठान" },
  { id: "rudri-jurne", label: "रुद्री जुर्ने" },
  { id: "agni-jurne", label: "अग्नि जुर्ने" },
  { id: "annaprasan", label: "अन्नप्रासन" },
];

/**
 * Vās (residence) categories are decided by a deterministic day-level formula
 * (Śiva-vāsa / Agni-vāsa on the tithi + weekday), not a time-resolved lagna
 * window — so they have no per-day muhūrta detail. Everything else is a
 * lagna-based muhūrta category that the `/detail` endpoint can explain per day.
 */
export const VAS_SAIT_CATEGORIES: ReadonlySet<string> = new Set([
  "rudri-jurne",
  "agni-jurne",
]);

/** True for lagna-based ceremonies that expose per-day muhūrta detail. */
export function isMuhurtaSaitCategory(category: string): boolean {
  return !VAS_SAIT_CATEGORIES.has(category);
}
