import type { CalendarDay } from "@vedic-patro/api-client";
import { type PakshaSegment, type Phase, lunarMonthNe } from "@vedic-patro/domain/dainikKranti/day-helpers";

export * from "@vedic-patro/domain/dainikKranti/day-helpers";

export function defaultMobilePaksha(days: CalendarDay[], todayAd: string): Phase {
  const today = days.find((d) => d.date_ad === todayAd);
  const phase = today ? phaseOf(today) : undefined;
  return phase === "krishna" || phase === "shukla" ? phase : "shukla";
}

export function phaseOf(day: CalendarDay): Phase | undefined {
  if (day.paksha === "shukla" || day.paksha_ne?.includes("शुक्ल")) return "shukla";
  if (day.paksha === "krishna" || day.paksha_ne?.includes("कृष्ण")) return "krishna";
  return undefined;
}

export function pakshaShort(day: CalendarDay, isEn = false): string {
  const p = phaseOf(day);
  if (isEn) return p === "shukla" ? "Shukla" : p === "krishna" ? "Krishna" : "";
  return p === "shukla" ? "शुक्ल" : p === "krishna" ? "कृष्ण" : "";
}

/**
 * Lunar-paksha label for a day, e.g. "अधिक ज्येष्ठ शुक्लपक्ष" / "शुद्ध ज्येष्ठ कृष्णपक्ष".
 * Prefers the pūrṇimānta layer (`lunar_calendar.purnimant`) — the reckoning Nepali
 * patro uses — and falls back to amānta or the flat `lunar_month`.
 */
export function pakshaSegmentOf(day: CalendarDay, adhikMonthEn?: string, isEn = false): PakshaSegment {
  const lc = day.panchanga?.lunar_calendar;
  const layer = lc?.purnimant ?? lc?.amanta ?? day.panchanga?.lunar_month;
  const lunarEn = layer?.name;
  const lunar = lunarMonthNe(lunarEn, isEn) ?? lunarEn ?? "";
  const isAdhik = layer?.is_adhik === true || layer?.type === "adhik";
  const adhikName = lc?.adhik_maas?.name ?? adhikMonthEn;
  const isShuddha =
    !isAdhik &&
    Boolean(adhikName) &&
    Boolean(lunarEn) &&
    lunarEn!.toLowerCase() === adhikName!.toLowerCase();
  const prefix = isAdhik ? (isEn ? "Adhik " : "अधिक ") : isShuddha ? (isEn ? "Shuddha " : "शुद्ध ") : "";
  const phase = phaseOf(day);
  const phaseLabel = isEn
    ? phase === "shukla" ? "Shukla" : phase === "krishna" ? "Krishna" : ""
    : phase === "shukla" ? "शुक्ल" : phase === "krishna" ? "कृष्ण" : "";
  const pakshaWord = isEn ? (phaseLabel ? " Paksha" : "") : "पक्ष";
  return {
    key: `${prefix}${lunar}|${phase ?? ""}`,
    label: `${prefix}${lunar} ${phaseLabel}${pakshaWord}`.trim(),
  };
}

export function weekdayLabel(day: CalendarDay, isEn: boolean): string {
  if (isEn) return day.weekday_en ?? day.weekday ?? day.weekday_ne ?? "—";
  return day.weekday_ne ?? day.weekday ?? "—";
}
