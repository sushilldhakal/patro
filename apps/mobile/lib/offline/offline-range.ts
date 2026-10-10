import { BS_SUPPORTED_END_YEAR, BS_SUPPORTED_START_YEAR, getCurrentBs } from "@/lib/bs-calendar";

/** ~80 years total, centered on the BS year the app was opened in. */
export const OFFLINE_YEARS_BACK = 40;
export const OFFLINE_YEARS_FORWARD = 40;

export interface YearRange {
  startYear: number;
  endYear: number;
}

/** The BS year window installed automatically on first launch. */
export function computeDefaultInstallRange(): YearRange {
  const { year } = getCurrentBs();
  return {
    startYear: Math.max(BS_SUPPORTED_START_YEAR, year - OFFLINE_YEARS_BACK),
    endYear: Math.min(BS_SUPPORTED_END_YEAR, year + OFFLINE_YEARS_FORWARD),
  };
}

export function clampToSupportedBsRange(range: YearRange): YearRange {
  return {
    startYear: Math.max(BS_SUPPORTED_START_YEAR, Math.min(range.startYear, range.endYear)),
    endYear: Math.min(BS_SUPPORTED_END_YEAR, Math.max(range.startYear, range.endYear)),
  };
}
