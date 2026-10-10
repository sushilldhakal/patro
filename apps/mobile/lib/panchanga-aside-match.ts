import type { CalendarDay, PanchangaDay } from "@/lib/api";

function civilIsoDay(iso: string): string {
  return iso.split("T")[0]!;
}

export function panchangaMatchesAside(
  p: PanchangaDay | undefined,
  asideAdDate: string,
  ctx: { year: number; month: number; isAdCalendar: boolean },
  contextDay: CalendarDay | null,
): boolean {
  if (!p) return false;
  const v = p.date_parts?.vikram;
  if (!ctx.isAdCalendar && contextDay && v?.year && v.month && v.day) {
    return v.year === ctx.year && v.month === ctx.month && v.day === contextDay.day;
  }
  const ad = civilIsoDay(asideAdDate);
  if (p.date_ad && civilIsoDay(p.date_ad) === ad) return true;
  if (p.panchanga_date_ad && civilIsoDay(p.panchanga_date_ad) === ad) return true;
  if (!ctx.isAdCalendar && contextDay && p.bs_date && typeof p.bs_date === "object") {
    return (
      p.bs_date.year === ctx.year &&
      p.bs_date.month === ctx.month &&
      p.bs_date.day === contextDay.day
    );
  }
  if (
    !ctx.isAdCalendar &&
    contextDay &&
    v?.year === ctx.year &&
    v.month === ctx.month &&
    v.day === contextDay.day
  ) {
    return true;
  }
  return false;
}
