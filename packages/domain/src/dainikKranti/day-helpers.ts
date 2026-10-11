/** Shared by apps/web/src/pages/DainikKranti.tsx and apps/mobile/app/(tabs)/dainikkranti.tsx (moved here from both, unchanged). */
import type { CalendarDay } from "@vedic-patro/api-client";

export type Phase = "krishna" | "shukla";

export function defaultMobilePaksha(days: CalendarDay[], todayAd: string): Phase {
  const today = days.find((d) => d.date_ad === todayAd);
  const phase = today ? phaseOf(today) : undefined;
  return phase === "krishna" || phase === "shukla" ? phase : "shukla";
}

/** Insert the rāśi before the trailing "मा" — "कृत्तिका १ मा" → "कृत्तिका १ वृषमा". */
export function embedRashi(labelNe: string, rashiNe?: string): string {
  if (!rashiNe) return labelNe;
  const out = labelNe.replace(/\s*मा\s*$/u, ` ${rashiNe}मा`);
  return out === labelNe ? `${labelNe} ${rashiNe}` : out;
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

/** Lunar (chāndra) month names in Sanskrit-Nepali, keyed by the API's English name. */
export const LUNAR_MONTH_NE: Record<string, string> = {
  baisakh: "वैशाख", baishakh: "वैशाख", vaisakha: "वैशाख", vaishakha: "वैशाख",
  jestha: "ज्येष्ठ", jyeshtha: "ज्येष्ठ", jyestha: "ज्येष्ठ",
  ashadh: "आषाढ", ashadha: "आषाढ", asar: "आषाढ",
  shrawan: "श्रावण", shrawn: "श्रावण", shravan: "श्रावण", shravana: "श्रावण",
  bhadra: "भाद्रपद", bhadau: "भाद्रपद", bhadrapada: "भाद्रपद",
  ashwin: "आश्विन", ashwina: "आश्विन", aswin: "आश्विन",
  kartik: "कार्तिक", kartika: "कार्तिक",
  mangsir: "मार्गशीर्ष", margashir: "मार्गशीर्ष", margashirsha: "मार्गशीर्ष", margasirsa: "मार्गशीर्ष",
  poush: "पौष", paush: "पौष", pausha: "पौष", push: "पौष",
  magh: "माघ", magha: "माघ",
  falgun: "फाल्गुन", phalgun: "फाल्गुन", phalguna: "फाल्गुन",
  chaitra: "चैत्र", chait: "चैत्र", chaitya: "चैत्र",
};

export function lunarMonthNe(en?: string, isEn = false): string | undefined {
  if (!en) return undefined;
  if (isEn) return en.charAt(0).toUpperCase() + en.slice(1);
  const key = en.toLowerCase().replace(/[^a-z]/g, "");
  return LUNAR_MONTH_NE[key] ?? en;
}

export type PakshaSegment = { key: string; label: string };

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

/** Day-of-week index from an AD date string (0 = Sunday … 6 = Saturday). */
export function dowOf(dateAd: string): number {
  const d = new Date(`${dateAd}T00:00:00`);
  return Number.isNaN(d.getTime()) ? -1 : d.getDay();
}
