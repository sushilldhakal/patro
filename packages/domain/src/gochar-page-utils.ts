import { adToBS, BS_MONTHS_NE, BS_MONTHS_SHORT } from "./bs-calendar";
import type { Era } from "./era";
import { formatBsIsoDateNepali } from "./panchanga-format";
import { formatPatroCivilDayLabel } from "./patro-headline-subtitle";
import { civilIsoDatePart, civilIsoFromDate, parseCivilIsoToDate } from "./patro-day";

export type IngressFilter = "all" | "rashi" | "nakshatra" | "retrograde" | "asta";

export function addCivilDays(iso: string, days: number): string {
  const d = parseCivilIsoToDate(civilIsoDatePart(iso));
  d.setDate(d.getDate() + days);
  return civilIsoFromDate(d);
}

export function daysFromRef(entryIso: string, refIso: string): number {
  const a = parseCivilIsoToDate(civilIsoDatePart(entryIso));
  const b = parseCivilIsoToDate(civilIsoDatePart(refIso));
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

export function relativeDayLabel(
  rel: number,
  lang: "ne" | "en" | "hi",
  digits: (v: number | string) => string,
): string {
  if (rel === 0) return lang === "en" ? "Today" : "आज";
  if (rel === 1) return lang === "en" ? "Tomorrow" : "भोलि";
  if (rel === -1) return lang === "en" ? "Yesterday" : "हिजो";
  if (rel < 0) {
    if (lang === "en") return `${digits(-rel)} days ago`;
    return `${digits(-rel)} दिन अघि`;
  }
  if (lang === "en") return `In ${digits(rel)} days`;
  return `${digits(rel)} दिनमा`;
}

export function formatGocharPatroDate(
  iso: string,
  lang: "ne" | "en" | "hi",
  opts?: { includeYear?: boolean },
): string {
  const part = civilIsoDatePart(iso);
  if (lang === "en") {
    return formatPatroCivilDayLabel(part, lang, String);
  }
  const bs = adToBS(parseCivilIsoToDate(part));
  const bsIso = `${bs.year}-${String(bs.month).padStart(2, "0")}-${String(bs.day).padStart(2, "0")}`;
  return (
    formatBsIsoDateNepali(bsIso, { lang, includeYear: opts?.includeYear ?? true }) ??
    formatPatroCivilDayLabel(part, lang, (v) => String(v))
  );
}

/** Ingress list date chip — BS month + day when UI is Nepali. */
export function formatGocharIngressChip(
  iso: string,
  lang: "ne" | "en" | "hi",
  digits: (v: number | string) => string,
): { day: string; month: string } {
  const part = civilIsoDatePart(iso);
  if (lang === "en") {
    const bs = adToBS(parseCivilIsoToDate(part));
    return {
      day: String(bs.day),
      month: BS_MONTHS_SHORT[bs.month - 1]?.toUpperCase() ?? "",
    };
  }
  const bs = adToBS(parseCivilIsoToDate(part));
  return {
    day: digits(bs.day),
    month: BS_MONTHS_NE[bs.month - 1] ?? "",
  };
}

/** @deprecated Use {@link formatGocharPatroDate}. */
export function formatShortCivilDate(iso: string, lang: "ne" | "en" | "hi"): string {
  return formatGocharPatroDate(iso, lang, { includeYear: true });
}

/** Civil AD range covering one browse month (BS/BBS or Gregorian). */
export function ingressBrowseMonthAdRange(
  era: Era,
  browseYear: number,
  browseMonth: number,
): { from: string; to: string } | null {
  if (era === "ad" || era === "bc") {
    const from = civilIsoFromDate(new Date(browseYear, browseMonth - 1, 1));
    const lastDay = new Date(browseYear, browseMonth, 0).getDate();
    const to = civilIsoFromDate(new Date(browseYear, browseMonth - 1, lastDay));
    return { from, to };
  }
  return null;
}

/** Era query param for `/nepal/gochar/ingress` (matches Dainik Kranti). */
export function ingressGocharFetchEra(patroEra: Era): Era {
  if (patroEra === "ad" || patroEra === "bc" || patroEra === "bbs") return patroEra;
  return "bs";
}
