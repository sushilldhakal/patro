import { isDescendingBrowseEra, type PatroBrowseEra } from "@/lib/patro-era";

export function stepPatroBrowseYear(
  era: PatroBrowseEra,
  year: number,
  direction: "prev" | "next",
): number {
  const towardPast = direction === "prev";
  const delta = towardPast ? 1 : -1;
  const signed = isDescendingBrowseEra(era) ? delta : -delta;
  const next = year + signed;
  return next >= 1 ? next : year;
}

export function shiftPatroBrowseMonth(
  era: PatroBrowseEra,
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  let m = month + delta;
  let y = year;
  const descending = isDescendingBrowseEra(era);
  while (m < 1) {
    m += 12;
    y += descending ? 1 : -1;
  }
  while (m > 12) {
    m -= 12;
    y += descending ? -1 : 1;
  }
  if (y === 0) y = delta < 0 ? 1 : 1;
  return { year: Math.max(1, y), month: m };
}
