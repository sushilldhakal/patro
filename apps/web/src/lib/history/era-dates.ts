import { PATRO_PBBS_ABBR_NE } from "@/lib/patro-year-axis";
import { toNepaliDigits } from "@/lib/panchanga-format";

/** Bikram Sambat epoch begins at Gregorian 57 BCE (वि.सं. १). */
export const BS_EPOCH_BCE = 57;

/** Oldest BCE year labeled BBSE in history / patro copy (deep antiquity). */
export const BBSE_BCE_MAX = 3000;

/** First BCE year counted as BBSE — strictly after the Vikram epoch year (57 BCE = BS 1, not BBSE). */
export const BBSE_BCE_MIN = 58;

/** वि.सं. is 57 years ahead of AD at year boundaries. */
export const BS_AD_OFFSET = 57;

/** BBSE year count for BCE dates before the वि.सं. epoch (bce ≥ {@link BBSE_BCE_MIN}). */
export function bceToBbse(bce: number): number {
  return bce - BS_EPOCH_BCE + 1;
}

/** BBSE labels at the supported BCE ends (BCE 3000 → 2944 BBSE, BCE 58 → 2 BBSE). */
export const BBSE_YEAR_AT_3000_BCE = BBSE_BCE_MAX - BS_EPOCH_BCE + 1;
export const BBSE_YEAR_AT_58_BCE = BBSE_BCE_MIN - BS_EPOCH_BCE + 1;

/** Inverse of {@link bceToBbse} — BCE year for a BBSE label. */
export function bbseToBce(bbse: number): number {
  return bbse + BS_EPOCH_BCE - 1;
}

export function isBbseBce(bce: number): boolean {
  return bce >= BBSE_BCE_MIN && bce <= BBSE_BCE_MAX;
}

export function isBbseYear(bbse: number): boolean {
  return bbse >= BBSE_YEAR_AT_58_BCE && bbse <= BBSE_YEAR_AT_3000_BCE;
}

/** BCE 57…1 → वि.सं. १…५७. */
export function bceToBs(bce: number): number {
  return BS_EPOCH_BCE - bce + 1;
}

export function adToBs(ad: number): number {
  return ad + BS_AD_OFFSET;
}

/** Before Bikram Sambat Era — वि.सं. युग अघि (पूर्व बिक्रम संवत्). */
export function formatBbse(bce: number): string {
  return `${PATRO_PBBS_ABBR_NE} ${toNepaliDigits(bceToBbse(bce))}`;
}

export function formatBsFromBce(bce: number): string {
  return `वि.सं. ${toNepaliDigits(bceToBs(bce))}`;
}

export function formatBsFromAd(ad: number): string {
  return `वि.सं. ${toNepaliDigits(adToBs(ad))}`;
}

/** BBSE for deep BCE; from 57 BCE downward use वि.सं. (BS 1…). */
export function formatFromBce(bce: number): string {
  if (bce >= BBSE_BCE_MIN) return formatBbse(bce);
  return formatBsFromBce(bce);
}

export function formatBbseRange(fromBce: number, toBce: number): string {
  return `${formatBbse(fromBce)} देखि ${formatBbse(toBce)}`;
}

/**
 * Panchang / solar-month label with BBSE year.
 * Use चैत्र, वैशाख, जेठ, etc. — never Gregorian month names with BBSE.
 */
export function formatBbseEvent(panchangLabel: string, bce: number): string {
  return `${panchangLabel}, ${formatBbse(bce)}`;
}

/** BBSE year with genitive panchang label, e.g. ६७२२ BBSE को चैत्र शुक्ल प्रतिपदा */
export function formatBbseYearEvent(bce: number, panchangLabel: string): string {
  return `${formatBbse(bce)} को ${panchangLabel}`;
}

export const HISTORY_ERA_NOTE = {
  bbse: "३००० ई.पू. देखि ५८ ई.पू. सम्म — वि.सं. १ (५७ ई.पू.) भन्दा अगाडि; पूर्व बिक्रम संवत् (पू.वि.सं.), वर्तमान वि.सं. होइन",
  bs: "बिक्रम संवत् — ५७ ई.पू. देखि (वि.सं. १) नेपाली पात्रो",
} as const;
