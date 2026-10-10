import type { ComponentProps } from "react";
import type { Ionicons } from "@/components/icons/Ionicons";
import type { NavataraTone, RashifalDomainKey, RashifalPeriod } from "@/lib/api";
import type { AppLanguage } from "@/lib/i18n";
import { addCivilDays, parseCivilIsoToDate } from "@vedic-patro/domain/patro-day";
import { formatPatroCivilDayLabel } from "@vedic-patro/domain/patro-headline-subtitle";

export type RashifalDomainIcon = ComponentProps<typeof Ionicons>["name"];

export const RASHIFAL_DOMAIN_ICON: Record<RashifalDomainKey, RashifalDomainIcon> = {
  career: "briefcase-outline",
  finance: "cash-outline",
  health: "fitness-outline",
  love: "heart-outline",
  learning: "school-outline",
  travel: "airplane-outline",
};

export const RASHIFAL_PERIOD_ICON: Record<RashifalPeriod, RashifalDomainIcon> = {
  daily: "sunny-outline",
  weekly: "calendar-outline",
  monthly: "calendar-number-outline",
  yearly: "planet-outline",
};

const TONE_BAR: Record<NavataraTone, string> = {
  best: "bg-emerald-500",
  good: "bg-emerald-400/80",
  neutral: "bg-amber-400/80",
  bad: "bg-orange-500/80",
  worst: "bg-rose-500",
};

export function rashifalToneBar(tone: NavataraTone | undefined): string {
  return TONE_BAR[tone ?? "neutral"];
}

const TONE_TEXT: Record<NavataraTone, string> = {
  best: "text-emerald-600 dark:text-emerald-400",
  good: "text-emerald-600 dark:text-emerald-400",
  neutral: "text-amber-600 dark:text-amber-400",
  bad: "text-orange-600 dark:text-orange-400",
  worst: "text-rose-600 dark:text-rose-400",
};

export function rashifalToneText(tone: NavataraTone | undefined): string {
  return TONE_TEXT[tone ?? "neutral"];
}

const NE_DIGITS = "०१२३४५६७८९";

export function toNepaliDigits(value: number | string, lang?: AppLanguage): string {
  const text = String(value);
  if (lang !== "ne") return text;
  return text.replace(/\d/g, (d) => NE_DIGITS[Number(d)]);
}

export interface RashifalWindowSource {
  range_start_ad?: string;
  range_end_ad?: string;
  bs_year?: number;
  bs_month_name_ne?: string;
  bs_month_name_en?: string;
}

export function rashifalMonthLabel(
  source: RashifalWindowSource | undefined,
  lang: AppLanguage,
  digitFn: (n: number | string) => string,
): string {
  return rashifalRangeLabel(source, "monthly", lang, digitFn) ?? "";
}

export function rashifalRangeLabel(
  source: RashifalWindowSource | undefined,
  period: RashifalPeriod,
  lang: AppLanguage,
  digitFn: (n: number | string) => string,
): string | undefined {
  if (!source) return undefined;
  if (period === "weekly" && source.range_start_ad && source.range_end_ad) {
    const start = formatPatroCivilDayLabel(source.range_start_ad, lang, digitFn);
    const end = formatPatroCivilDayLabel(source.range_end_ad, lang, digitFn);
    return `${start} – ${end}`;
  }
  if (period === "monthly" && source.bs_year != null) {
    const monthName = lang === "ne" ? source.bs_month_name_ne : source.bs_month_name_en;
    return `${monthName ?? ""} ${digitFn(source.bs_year)}`.trim();
  }
  if (period === "yearly" && source.bs_year != null) {
    return lang === "ne" ? `वि.सं. ${digitFn(source.bs_year)}` : `BS ${digitFn(source.bs_year)}`;
  }
  return undefined;
}

export function rashifalStepDate(
  source: RashifalWindowSource | undefined,
  period: RashifalPeriod,
  currentDate: Date,
  direction: 1 | -1,
): Date {
  if (period === "daily" || !source?.range_start_ad || !source.range_end_ad) {
    return addCivilDays(currentDate, direction);
  }
  const boundaryIso = direction > 0 ? source.range_end_ad : source.range_start_ad;
  return addCivilDays(parseCivilIsoToDate(boundaryIso), direction);
}
