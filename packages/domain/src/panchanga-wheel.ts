/** Shared by apps/web/src/components/panchanga/PanchangaWheel.tsx and apps/mobile/components/panchanga/PanchangaWheel.web.tsx (moved here from both, unchanged). */
import { BS_MONTHS_NE, BS_MONTH_NAMES } from "./bs-calendar";

export function bsMonthEnOf(ne: string): string {
  const i = BS_MONTHS_NE.indexOf(ne);
  return i >= 0 ? BS_MONTH_NAMES[i] : ne;
}
