import { isDescendingEra, type Era } from "@/lib/era";

export function stepPatroBrowseYear(era: Era, year: number, direction: "prev" | "next"): number {
  const towardPast = direction === "prev";
  const delta = towardPast ? 1 : -1;
  const signed = isDescendingEra(era) ? delta : -delta;
  const next = year + signed;
  return next >= 1 ? next : year;
}

/**
 * Step one Vikram month in browse URL coordinates (`era` + positive `year`).
 * Descending eras (BBS, BC) increase the year number when moving to an earlier month.
 */
export function shiftPatroBrowseMonth(
  era: Era,
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  let m = month + delta;
  let y = year;
  const descending = isDescendingEra(era);
  while (m < 1) {
    m += 12;
    y += descending ? 1 : -1;
  }
  while (m > 12) {
    m -= 12;
    y += descending ? -1 : 1;
  }
  // BS 1 is preceded by BBS 1 on the signed axis (local grid padding).
  if (y === 0) y = delta < 0 ? -1 : 1;
  return { year: y, month: m };
}
