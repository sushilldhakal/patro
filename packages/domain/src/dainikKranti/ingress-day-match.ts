import { parsePatroDayDateKey } from "../patro-day";

export type IngressBrowseMonth = { year: number; month: number };

export function bsDayFromJdDateKey(
  key: string | undefined,
  browseYear: number,
  browseMonth: number,
): number | undefined {
  if (!key) return undefined;
  try {
    const { year, month, day } = parsePatroDayDateKey(key);
    if (year === browseYear && month === browseMonth) return day;
  } catch {
    return undefined;
  }
  return undefined;
}
