/** Shared by apps/web/src/pages/EclipsePage.tsx and apps/mobile/components/graha/GrahaEventCards.tsx (moved here from both, unchanged). */
import type { EclipseEvent } from "@vedic-patro/api-client";

export function renderedEclipseDate(ev: EclipseEvent): string {
  const label = ev.date_jd_date?.trim();
  if (label) return label;
  return ev.date_bs ?? ev.date_ad ?? "";
}
