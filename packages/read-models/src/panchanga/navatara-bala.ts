import type { NavataraRow } from "@vedic-patro/api-client";
import type { NavataraTone } from "@vedic-patro/domain/vocabulary";
import { NAVATARA_TYPES, computeNavataraNumber } from "@vedic-patro/domain/panchanga/navatara-bala";

export * from "@vedic-patro/domain/panchanga/navatara-bala";

export type { NavataraRow, NavataraTableBlock, NavataraTone } from "@vedic-patro/api-client";

/** Navatara tara/quality/tone for a janma rashi or nakshatra vs moon reference. */
export function computeNavataraMeta(
  moonIdx: number,
  targetIdx: number,
  cycleSize: number,
): Pick<NavataraRow, "tara" | "quality" | "tone" | "tara_num"> {
  const taraNum = computeNavataraNumber(moonIdx, targetIdx, cycleSize);
  const row = NAVATARA_TYPES.find((t) => t.id === taraNum) ?? NAVATARA_TYPES[0];
  return { tara: row.tara, quality: row.quality, tone: row.tone, tara_num: taraNum };
}
