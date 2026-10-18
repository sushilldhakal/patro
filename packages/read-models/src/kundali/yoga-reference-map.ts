import type { KundaliYoga } from "@vedic-patro/api-client";
import { ENGINE_KEY_TO_REF_ID } from "@vedic-patro/domain/kundali/yoga-reference-map";

export * from "@vedic-patro/domain/kundali/yoga-reference-map";

/** 162-reference ids that are formed in the chart (hidden from the reference catalog). */
export function buildPresentYogaRefIds(yogas: readonly KundaliYoga[]): Set<string> {
  const ids = new Set<string>();
  for (const y of yogas) {
    const refId = ENGINE_KEY_TO_REF_ID[y.key];
    if (y.present && refId) ids.add(refId);
  }
  return ids;
}
