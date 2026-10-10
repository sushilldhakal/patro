/**
 * Signed patro year on one axis (URL / pickers when `era=bs`):
 *
 * - **1 … 3000** → Vikram **BS**
 * - **−1 … −13201** → **BBS** (Before Bikram Sambat), display as BBS `|year|`
 * - **0** → invalid
 *
 * BS 1 ≈ 57 BCE. BBS 6722 ≈ tradition / Surya Siddhanta deep anchor (~6778 BCE).
 *
 * Swiss Ephemeris (typical install): usable Sun/Moon roughly **3001 BCE–3003 CE**
 * (Moshier JD band). Deeper than ~**BBS 2600** (`PATRO_SANKRANTI_SIGNED_MIN`) may
 * not build sankranti months until extra `.se1` files are installed.
 * Full server panchanga (tithi/nakshatra) for BBS when sankranti grid works (~≥ PATRO_SANKRANTI_SIGNED_MIN)
 * and for BS ≥ 1 on CE civil dates.
 */

import type { Era } from "@/lib/era";

/**
 * Bootstrap until `GET /meta/capabilities` arrives. Functions below read the
 * live copy (`getPatroLimits`); do not treat these constants as the host's
 * installed ephemeris window.
 */
export const PATRO_SIGNED_YEAR_MIN = -13202;
export const PATRO_SIGNED_YEAR_MAX = 17248;
export const PATRO_EPHEMERIS_SIGNED_MIN = -13201;
export const PATRO_EPHEMERIS_SIGNED_MAX = 17247;
export const PATRO_SANKRANTI_SIGNED_MIN = PATRO_EPHEMERIS_SIGNED_MIN;
export const PATRO_PANCHANGA_SIGNED_MIN = PATRO_EPHEMERIS_SIGNED_MIN;
export const BS_FESTIVAL_STACK_MIN_YEAR = 60;
export const BBS_URL_YEAR_MIN = 1;
export const BBS_URL_YEAR_MAX = -PATRO_EPHEMERIS_SIGNED_MIN;
export const PATRO_AD_BROWSE_YEAR_MIN = 1;
export const PATRO_AD_BROWSE_YEAR_MAX = 17191;
export const PATRO_BC_BROWSE_YEAR_MIN = 1;
export const PATRO_BC_BROWSE_YEAR_MAX = BBS_URL_YEAR_MAX;

export type PatroLiveLimits = {
  signedYearMin: number;
  signedYearMax: number;
  ephemerisSignedMin: number;
  ephemerisSignedMax: number;
  adBrowseYearMin: number;
  adBrowseYearMax: number;
  bcBrowseYearMin: number;
  bcBrowseYearMax: number;
  bbsUrlYearMax: number;
  festivalStackMinYear: number;
};

let live: PatroLiveLimits = {
  signedYearMin: PATRO_SIGNED_YEAR_MIN,
  signedYearMax: PATRO_SIGNED_YEAR_MAX,
  ephemerisSignedMin: PATRO_EPHEMERIS_SIGNED_MIN,
  ephemerisSignedMax: PATRO_EPHEMERIS_SIGNED_MAX,
  adBrowseYearMin: PATRO_AD_BROWSE_YEAR_MIN,
  adBrowseYearMax: PATRO_AD_BROWSE_YEAR_MAX,
  bcBrowseYearMin: PATRO_BC_BROWSE_YEAR_MIN,
  bcBrowseYearMax: PATRO_BC_BROWSE_YEAR_MAX,
  bbsUrlYearMax: BBS_URL_YEAR_MAX,
  festivalStackMinYear: BS_FESTIVAL_STACK_MIN_YEAR,
};

export function getPatroLimits(): PatroLiveLimits {
  return live;
}

/** Apply host-owned bounds from `/meta/capabilities` or a month `limits` block. */
export function applyPatroApiLimits(c: {
  signed_year_min?: number;
  signed_year_max?: number;
  ephemeris_signed_min?: number;
  ephemeris_signed_max?: number;
  ad_year_min?: number;
  ad_year_max?: number;
  bc_year_min?: number;
  bc_year_max?: number;
  bbs_url_year_max?: number;
  festival_stack_min_year?: number;
}): void {
  live = {
    signedYearMin: c.signed_year_min ?? live.signedYearMin,
    signedYearMax: c.signed_year_max ?? live.signedYearMax,
    ephemerisSignedMin: c.ephemeris_signed_min ?? live.ephemerisSignedMin,
    ephemerisSignedMax: c.ephemeris_signed_max ?? live.ephemerisSignedMax,
    adBrowseYearMin: c.ad_year_min ?? live.adBrowseYearMin,
    adBrowseYearMax: c.ad_year_max ?? live.adBrowseYearMax,
    bcBrowseYearMin: c.bc_year_min ?? live.bcBrowseYearMin,
    bcBrowseYearMax: c.bc_year_max ?? live.bcBrowseYearMax,
    bbsUrlYearMax: c.bbs_url_year_max ?? live.bbsUrlYearMax,
    festivalStackMinYear: c.festival_stack_min_year ?? live.festivalStackMinYear,
  };
}

export function validatePatroSignedYear(year: number): void {
  const { signedYearMin, signedYearMax } = live;
  if (year === 0 || year < signedYearMin || year > signedYearMax) {
    throw new Error(
      `Patro year must be ${signedYearMin}..-1 or 1..${signedYearMax} (0 invalid)`,
    );
  }
}

export function isBbsSigned(signed: number): boolean {
  return signed <= -1;
}

export function isBsSigned(signed: number): boolean {
  return signed >= 1;
}

export function bbsFromSigned(signed: number): number {
  if (signed >= 0) throw new Error("bbsFromSigned expects signed <= -1");
  return -signed;
}

export function signedFromBbs(bbs: number): number {
  if (bbs < 1) throw new Error("bbs must be >= 1");
  return -bbs;
}

export function clampPatroSignedYear(year: number): number {
  if (year === 0) return year < 0 ? -1 : 1;
  return Math.min(Math.max(year, live.signedYearMin), live.signedYearMax);
}

/** Step by one on the signed axis (skips invalid year 0). */
export function stepPatroSignedYear(year: number, delta: -1 | 1): number {
  let next = year + delta;
  if (next === 0) next = delta > 0 ? 1 : -1;
  return clampPatroSignedYear(next);
}

/** Both ends matter: the axis reaches BS 17055; extended ephemeris reaches BS 16799. */
export function patroYearWithinEphemeris(signed: number): boolean {
  return (
    signed !== 0 &&
    signed >= live.ephemerisSignedMin &&
    signed <= live.ephemerisSignedMax
  );
}

/** Browse URL year → signed axis (`era=bbs&year=N` → `−N`). */
export function signedPatroYearFromBrowse(era: Era, browseYear: number): number {
  if (era === "bbs") return signedFromBbs(browseYear);
  return browseYear;
}

/** Ephemeris window check for positive browse URL years. */
export function patroBrowseYearWithinEphemeris(era: Era, browseYear: number): boolean {
  if (era === "ad") {
    return browseYear >= live.adBrowseYearMin && browseYear <= live.adBrowseYearMax;
  }
  if (era === "bc") {
    return browseYear >= live.bcBrowseYearMin && browseYear <= live.bcBrowseYearMax;
  }
  return patroYearWithinEphemeris(signedPatroYearFromBrowse(era, browseYear));
}

/** Max positive year in the year picker for the active browse era. */
export function maxBrowseYearForEra(era: Era): number | undefined {
  if (era === "bs") return live.ephemerisSignedMax;
  if (era === "bbs") return live.bbsUrlYearMax;
  if (era === "ad") return live.adBrowseYearMax;
  if (era === "bc") return live.bcBrowseYearMax;
  return undefined;
}

/** Whether `year` is allowed while `era` is selected (picker + URL, no era flip). */
export function isValidBrowseYear(era: Era, year: number): boolean {
  if (!Number.isFinite(year) || year < 1) return false;
  if (era === "bs") return year <= live.ephemerisSignedMax;
  if (era === "bbs") return year <= live.bbsUrlYearMax;
  if (era === "ad") return year <= live.adBrowseYearMax;
  if (era === "bc") return year <= live.bcBrowseYearMax;
  return true;
}

export function patroYearSupportsSankrantiGrid(signed: number): boolean {
  return patroYearWithinEphemeris(signed);
}

export function patroYearSupportsPanchanga(signed: number): boolean {
  return patroYearWithinEphemeris(signed);
}

/** Nepali / English abbreviations for negative signed years (पूर्व बिक्रम संवत्). */
export const PATRO_PBBS_ABBR_NE = "पू.वि.सं.";
export const PATRO_PBBS_ABBR_EN = "BBS";

/** UI chip: `BBS 6722` / `BS 2082` / `पू.वि.सं. ६७२२` / `वि.सं. २०८२`. */
export function formatSignedPatroYear(
  signed: number,
  lang: string,
  digits: (n: number | string) => string = String,
): string {
  validatePatroSignedYear(signed);
  const isEn = lang.slice(0, 2) === "en";
  if (isBbsSigned(signed)) {
    const n = bbsFromSigned(signed);
    const abbr = isEn ? PATRO_PBBS_ABBR_EN : PATRO_PBBS_ABBR_NE;
    return `${abbr} ${digits(n)}`;
  }
  return isEn ? `BS ${digits(signed)}` : `वि.सं. ${digits(signed)}`;
}


/** Positive browse-year label for URL era (`era` carries BC/BBS semantics). */
export function formatBrowsePatroYear(
  era: Era,
  year: number,
  lang: string,
  digits: (n: number | string) => string = String,
): string {
  if (!Number.isFinite(year) || year < 1) {
    throw new Error("browse year must be a positive integer");
  }
  const isEn = lang.slice(0, 2) === "en";
  if (era === "ad") return digits(year);
  if (era === "bc") {
    return isEn ? `${digits(year)} BC` : `${digits(year)} ई.पू.`;
  }
  if (era === "bbs") {
    const abbr = isEn ? PATRO_PBBS_ABBR_EN : PATRO_PBBS_ABBR_NE;
    return `${abbr} ${digits(year)}`;
  }
  return isEn ? `BS ${digits(year)}` : `वि.सं. ${digits(year)}`;
}

/** Year dropdown row — digits only; era lives in the page header and era toggle. */
export function formatBrowsePatroYearPicker(
  year: number,
  digits: (n: number | string) => string = String,
): string {
  if (!Number.isFinite(year) || year < 1) {
    return digits("—");
  }
  return digits(year);
}
