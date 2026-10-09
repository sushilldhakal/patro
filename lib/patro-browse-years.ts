import type { PatroBrowseEra } from "@/lib/patro-era";

/** @deprecated use {@link PatroBrowseEra} */
export type MonthBrowseEra = PatroBrowseEra;

/** Bootstrap until `GET /meta/capabilities` arrives. */
export const PATRO_BS_BROWSE_YEAR_MAX = 17247;
export const PATRO_BBS_BROWSE_YEAR_MAX = 13201;
export const PATRO_AD_BROWSE_YEAR_MAX = 17191;
export const PATRO_BC_BROWSE_YEAR_MAX = 13201;

/** Bootstrap until `GET /meta/capabilities` brings `offline_max_span_years`. */
export const OFFLINE_MAX_SPAN_BOOTSTRAP = 90;

let live = {
  offlineMaxSpan: OFFLINE_MAX_SPAN_BOOTSTRAP,
  bsMax: PATRO_BS_BROWSE_YEAR_MAX,
  bbsMax: PATRO_BBS_BROWSE_YEAR_MAX,
  adMax: PATRO_AD_BROWSE_YEAR_MAX,
  bcMax: PATRO_BC_BROWSE_YEAR_MAX,
};

/** Apply host-owned bounds from `/meta/capabilities` or a month `limits` block. */
export function applyPatroApiLimits(c: {
  ephemeris_signed_max?: number;
  bbs_url_year_max?: number;
  ad_year_max?: number;
  bc_year_max?: number;
  offline_max_span_years?: number;
}): void {
  live = {
    offlineMaxSpan: c.offline_max_span_years ?? live.offlineMaxSpan,
    bsMax: c.ephemeris_signed_max ?? live.bsMax,
    bbsMax: c.bbs_url_year_max ?? live.bbsMax,
    adMax: c.ad_year_max ?? live.adMax,
    bcMax: c.bc_year_max ?? live.bcMax,
  };
}

/** Widest BS-year window the host allows for an offline download. */
export function maxOfflineSpanYears(): number {
  return live.offlineMaxSpan;
}

const NATIVE_SELECT_YEAR_RADIUS = 100;

export function maxBrowseYearForEra(era: PatroBrowseEra): number {
  switch (era) {
    case "bbs":
      return live.bbsMax;
    case "ad":
      return live.adMax;
    case "bc":
      return live.bcMax;
    default:
      return live.bsMax;
  }
}

export function isValidBrowseYear(era: PatroBrowseEra, year: number): boolean {
  return Number.isFinite(year) && year >= 1 && year <= maxBrowseYearForEra(era);
}

export function clampBrowseYear(era: PatroBrowseEra, year: number): number {
  const max = maxBrowseYearForEra(era);
  return Math.min(Math.max(1, Math.trunc(year)), max);
}

export { togglePatroBrowseEra as toggleBrowseEra } from "@/lib/patro-era";
export { toggleBrowseEraForLang } from "@/lib/patro-era";

/** Windowed year list for pickers (~201 years around selection). */
export function windowedBrowseYears(
  era: PatroBrowseEra,
  currentYear: number,
  radius = NATIVE_SELECT_YEAR_RADIUS,
): number[] {
  const max = maxBrowseYearForEra(era);
  const y = clampBrowseYear(era, currentYear);
  const start = Math.max(1, y - radius);
  const end = Math.min(max, y + radius);
  const out: number[] = [];
  for (let i = start; i <= end; i += 1) out.push(i);
  return out;
}

export function browseYearSelectOptions(
  era: PatroBrowseEra,
  currentYear: number,
  digits: (n: number) => string,
): { value: number; label: string }[] {
  return windowedBrowseYears(era, currentYear).map((y) => ({
    value: y,
    label: digits(y),
  }));
}
