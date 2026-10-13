/** Panchak patro — turning the year's panchak windows into card text. */
import type { Lang } from "@vedic-patro/domain/locale";
import { formatLocaleDigits } from "@vedic-patro/domain/locale";
import { PANCHAK_VARIETIES, panchakVarietyFromStartAd } from "@vedic-patro/domain/panchak/panchak-types";
import type { PanchakPeriod } from "@vedic-patro/domain/panchak/panchak-patro-data";
import { formatBsMonthDayPatro } from "@vedic-patro/domain/panchanga-format";

/** `2026-10-20` → `Oct 20, 2026` / the Nepali locale's short date. */
export function fmtAdShort(iso: string, lang: Lang): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString(lang === "en" ? "en-US" : "ne-NP", { day: "numeric", month: "short", year: "numeric" });
}

/** What may not be done during panchak (catalogue keys). */
export const PANCHAK_PROHIBITED = ["south_travel", "roof", "bed", "fuel", "last_rites"] as const;

export type PanchakBoundaryView = { label: string; bs: string; ad: string };
export type PanchakCardView = { key: string; title: string; variety?: string; start: PanchakBoundaryView; end: PanchakBoundaryView; duration: string };

type T = (key: string, values?: Record<string, unknown>) => string;

export function panchakCardView(period: PanchakPeriod, index: number, lang: Lang, t: T): PanchakCardView {
  const en = lang === "en";
  const digits = (v: string | number) => formatLocaleDigits(v, lang);
  const variety = panchakVarietyFromStartAd(period.start.ad);
  const boundary = (b: PanchakPeriod["start"], labelKey: string): PanchakBoundaryView => ({
    label: t(labelKey),
    bs: `${digits(formatBsMonthDayPatro(b.bsYear, b.bsMonth, b.bsDay))}, ${en ? b.timeEn : b.timeNe}`,
    ad: fmtAdShort(b.ad, lang),
  });
  return {
    key: `${period.start.ad}-${period.end.ad}`,
    title: t("panchak.period_label", { n: digits(index + 1) }),
    variety: variety ? (en ? variety.labelEn : variety.labelNe) : undefined,
    start: boundary(period.start, "panchak.start_date"),
    end: boundary(period.end, "panchak.end_date"),
    duration: en ? period.durationEn : period.durationNe,
  };
}

/** The five panchak varieties with their notes, for the "types" list. */
export function panchakVarieties(lang: Lang): { id: string; name: string; note: string }[] {
  const en = lang === "en";
  return PANCHAK_VARIETIES.map((v) => ({ id: v.id, name: en ? v.labelEn : v.labelNe, note: en ? v.noteEn : v.noteNe }));
}
