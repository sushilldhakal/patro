/**
 * Graha asta (combustion) and vakri (retrograde) pages — grouping the year's
 * events by graha and turning each into display text.
 */
import type { AstaStamp, GrahaAstaPeriod, GrahaVakriEvent } from "@vedic-patro/api-client";
import { BS_MONTH_NAMES, BS_MONTHS_NE } from "@vedic-patro/domain/calendar/bs-calendar";
import { formatLocaleDigits, type Lang } from "@vedic-patro/domain/locale";
import { formatBsIsoDateNepali } from "@vedic-patro/domain/panchanga/panchanga-format";
import { parsePatroDayDateKey } from "@vedic-patro/domain/calendar/patro-day";

/** Column order on the asta page (the Moon's "tara asta" sits third). */
export const ASTA_ORDER = ["mercury", "venus", "moon", "mars", "jupiter", "saturn"] as const;
/** The grahas that turn retrograde. */
export const VAKRI_ORDER = ["mercury", "venus", "mars", "jupiter", "saturn"] as const;

/** Events grouped by graha in `order`, every graha present (empty when it has none); unknown grahas follow. */
export function groupByGraha<T extends { graha: string }>(order: readonly string[], items: readonly T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>(order.map((g) => [g, []]));
  for (const item of items) {
    if (!groups.has(item.graha)) groups.set(item.graha, []);
    groups.get(item.graha)!.push(item);
  }
  return groups;
}

/** `2083-04-12` (era day key) → `साउन १२` / `Shrawan 12`. */
export function eraDayLabel(eraDay: string, lang: Lang): string {
  try {
    const { month, day } = parsePatroDayDateKey(eraDay);
    const monthName = lang === "en" ? BS_MONTH_NAMES[month - 1] : BS_MONTHS_NE[month - 1];
    return `${monthName} ${formatLocaleDigits(day, lang)}`;
  } catch {
    return formatBsIsoDateNepali(eraDay, { lang, includeYear: false }) ?? eraDay;
  }
}

/** The date an asta stamp shows: the era day when the API sends one, else its BS/AD date. */
export function stampDate(stamp: AstaStamp, lang: Lang): string {
  const eraDay = stamp.date?.trim();
  if (eraDay) return eraDayLabel(eraDay, lang);
  return lang === "en" ? (stamp.date_ad ?? stamp.date_bs ?? "") : (stamp.date_bs ?? stamp.date_ad ?? "");
}

export type AstaStampView = {
  label: string;
  tone: "asta" | "udaya";
  /** Missing when the stamp falls outside the year; `outside` says so. */
  date?: string;
  time?: string;
  outside?: string;
};

export type AstaPeriodView = { stamps: AstaStampView[]; hemisphere: string; duration?: string };

export type VakriEventView = { retrograde: boolean; arrow: string; label: string; date: string; time: string };

type T = (key: string, values?: Record<string, unknown>) => string;

export function astaPeriodView(p: GrahaAstaPeriod, lang: Lang, t: T): AstaPeriodView {
  const digits = (v: string | number) => formatLocaleDigits(v, lang);
  const stamp = (s: AstaStamp | null, labelKey: string, tone: AstaStampView["tone"]): AstaStampView =>
    s
      ? { label: t(labelKey), tone, date: digits(stampDate(s, lang)), time: digits(s.time_short ?? "") }
      : { label: t(labelKey), tone, outside: t("graha_pages.asta.outside_year") };
  return {
    stamps: [stamp(p.start, "graha_pages.asta.asta_begins", "asta"), stamp(p.end, "graha_pages.asta.udaya_ends", "udaya")],
    hemisphere:
      p.hemisphere === "east" ? t("graha_pages.asta.east_morning") : p.hemisphere === "west" ? t("graha_pages.asta.west_evening") : "",
    duration: p.duration_days != null ? t("graha_pages.asta.duration_days", { count: digits(p.duration_days) }) : undefined,
  };
}

export function vakriEventView(ev: GrahaVakriEvent, lang: Lang, t: T): VakriEventView {
  const retrograde = ev.is_retrograde === true || ev.motion === "Vakri";
  const digits = (v: string | number) => formatLocaleDigits(v, lang);
  return {
    retrograde,
    arrow: retrograde ? "↺" : "→",
    label: t(retrograde ? "graha_pages.vakri.retrograde" : "graha_pages.vakri.direct"),
    date: digits(ev.entry_jd_date?.trim() || ev.entry_time_local?.slice(0, 10) || ""),
    time: digits(ev.entry_time_local_short ?? ""),
  };
}
