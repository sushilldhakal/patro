import type { GocharGraha, GocharIngressEvent } from "@/lib/api";
import type { CalendarDay } from "@/lib/api";
import type { GrahaKey } from "@/lib/graha-details";
import { GRAHA_NAME } from "@/lib/graha-details";
import {
  adToBS,
  adMonthLabel,
  BS_MONTHS_NE,
  BS_MONTHS_SHORT,
} from "@/lib/bs-calendar";
import type { Era } from "@/lib/era";
import { signedPatroYearFromBrowse } from "@/lib/patro-year-axis";
import { formatBsIsoDateNepali } from "@/lib/panchanga-format";
import { formatPatroCivilDayLabel } from "@/lib/patro-headline-subtitle";
import { resolveRashiDisplay, toWesternRashi } from "@/lib/rashi-i18n";
import { civilIsoDatePart, civilIsoFromDate, parseCivilIsoToDate, canonicalCivilIso, formatBsDateKey } from "@/lib/patro-day";
import {
  ingressEventBsDayForMonth,
  ingressEventRowDateAd,
} from "@/lib/dainikKranti/ingress-day-match";

export type IngressFilter = "all" | "rashi" | "nakshatra" | "retrograde" | "asta";

export function grahaExalted(_key: GrahaKey, g: GocharGraha): boolean {
  return Boolean(g.is_exalted);
}

export function grahaNakshatraLine(
  g: GocharGraha,
  lang: "ne" | "en" | "hi",
  digits?: (v: number | string) => string,
): string {
  const nak =
    lang === "en"
      ? (g.nakshatra ?? g.nakshatra_ne)
      : (g.nakshatra_ne ?? g.nakshatra);
  if (!nak) return "—";
  if (g.pada == null) return nak;
  const p = lang === "en" ? String(g.pada) : (digits ?? String)(g.pada);
  return `${nak} · ${p}`;
}

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

export function ingressEventDateAd(ev: GocharIngressEvent): string | undefined {
  return (
    ev.entry_vedic_date_ad ??
    ev.entry_date_ad ??
    (ev.entry_time_local ? civilIsoDatePart(ev.entry_time_local.split("T")[0] ?? ev.entry_time_local) : undefined)
  );
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

/** True when the ingress entry falls in the browsed Vikram or Gregorian month. */
export function ingressEventInBrowseMonth(
  era: Era,
  browseYear: number,
  browseMonth: number,
  ev: GocharIngressEvent,
): boolean {
  const ad = ingressEventDateAd(ev);
  if (!ad) return false;
  const d = parseCivilIsoToDate(civilIsoDatePart(ad));
  if (era === "ad" || era === "bc") {
    return d.getFullYear() === browseYear && d.getMonth() + 1 === browseMonth;
  }
  const bs = adToBS(d);
  const signedBrowse = signedPatroYearFromBrowse(era, browseYear);
  return bs.month === browseMonth && bs.year === signedBrowse;
}

export type GocharIngressRow = {
  event: GocharIngressEvent;
  /** Patro calendar row — vedic sunrise day. */
  rowDateAd: string;
  bsDay: number;
  monthChip: { month: string; day: string };
};

/** Era query param for `/nepal/gochar/ingress` (matches Dainik Kranti). */
export function ingressGocharFetchEra(patroEra: Era): Era {
  if (patroEra === "ad" || patroEra === "bc" || patroEra === "bbs") return patroEra;
  return "bs";
}

/** `from`/`to` keys for ingress API — BS date keys when browsing Vikram months. */
export function ingressFetchRangeForBrowseMonth(
  patroEra: Era,
  browseYear: number,
  browseMonth: number,
  allDays: CalendarDay[],
): { from: string; to: string } | null {
  const isGregorian = patroEra === "ad" || patroEra === "bc";
  const inMonth = allDays.filter((d) => !d.outsideMonth);
  const first = inMonth[0] ?? allDays[0];
  const last = inMonth[inMonth.length - 1] ?? allDays[allDays.length - 1];
  if (isGregorian) {
    if (first?.date_ad && last?.date_ad) {
      return {
        from: canonicalCivilIso(first.date_ad),
        to: canonicalCivilIso(last.date_ad),
      };
    }
    return ingressBrowseMonthAdRange(patroEra, browseYear, browseMonth);
  }
  if (!first || !last) return null;
  return {
    from: formatBsDateKey(browseYear, browseMonth, first.day),
    to: formatBsDateKey(browseYear, browseMonth, last.day),
  };
}

/**
 * Map API ingress events onto patro month rows (vedic गते), same as Dainik Kranti tables.
 * Default: only events on or after `refDateAd` (आगामी from the selected day).
 */
export function buildGocharIngressMonthList(
  events: GocharIngressEvent[],
  patroEra: Era,
  browseYear: number,
  browseMonth: number,
  allDays: CalendarDay[],
  refDateAd: string,
  lang: "ne" | "en" | "hi",
  digits: (v: number | string) => string,
  opts?: { upcomingOnly?: boolean },
): GocharIngressRow[] {
  const upcomingOnly = opts?.upcomingOnly !== false;
  const refCanon = canonicalCivilIso(refDateAd);
  const isGregorian = patroEra === "ad" || patroEra === "bc";
  const monthChipMonth = isGregorian
    ? adMonthLabel(browseMonth, lang === "en" ? "en" : "ne")
    : lang === "en"
      ? (BS_MONTHS_SHORT[browseMonth - 1]?.toUpperCase() ?? "")
      : (BS_MONTHS_NE[browseMonth - 1] ?? "");

  const rows: GocharIngressRow[] = [];
  for (const event of events) {
    const bsDay = ingressEventBsDayForMonth(event, browseYear, browseMonth, allDays);
    if (bsDay == null) continue;
    const rowDateAd = ingressEventRowDateAd(event, allDays, browseYear, browseMonth);
    if (!rowDateAd) continue;
    if (upcomingOnly && canonicalCivilIso(rowDateAd) < refCanon) continue;

    const row = allDays.find(
      (d) => canonicalCivilIso(d.date_ad) === canonicalCivilIso(rowDateAd),
    );
    const displayDay = isGregorian ? (row?.day ?? bsDay) : bsDay;

    rows.push({
      event,
      rowDateAd,
      bsDay: displayDay,
      monthChip: {
        month: monthChipMonth,
        day: lang === "en" ? String(displayDay) : digits(displayDay),
      },
    });
  }

  rows.sort((a, b) => {
    if (a.bsDay !== b.bsDay) return a.bsDay - b.bsDay;
    const ta = a.event.entry_time_utc ?? a.event.entry_time_local ?? "";
    const tb = b.event.entry_time_utc ?? b.event.entry_time_local ?? "";
    return ta.localeCompare(tb);
  });
  return rows;
}

export function ingressGrahaLabel(ev: GocharIngressEvent, lang: "ne" | "en" | "hi"): string {
  const key = ev.graha as GrahaKey;
  return lang === "en"
    ? GRAHA_NAME[key]?.en ?? ev.graha
    : ev.graha_ne || GRAHA_NAME[key]?.ne || ev.graha;
}

/** Event line without graha name — shown under the graha title in lists. */
export function ingressEventDetail(ev: GocharIngressEvent, lang: "ne" | "en" | "hi"): string {
  if (ev.level === "udayast") {
    if (lang === "en") {
      return ev.event === "asta" ? "Heliacal set (combust)" : "Heliacal rise";
    }
    return ev.label_ne ?? (ev.event === "asta" ? "अस्त" : "उदय");
  }

  if (ev.level === "motion") {
    const retro = ev.is_retrograde ?? ev.motion_ne === "वक्र";
    if (lang === "en") return retro ? "Turns retrograde" : "Turns direct";
    return ev.label_ne ?? (retro ? "वक्री" : "मार्गी");
  }

  if (ev.level === "rashi" || ev.to_rashi) {
    const to = resolveRashiDisplay(ev.to_rashi_ne, ev.to_rashi, lang);
    if (lang === "en") {
      return `Enters ${toWesternRashi(ev.to_rashi) ?? ev.to_rashi ?? "—"}`;
    }
    return `${to ?? "—"} मा प्रवेश`;
  }

  const toNak = lang === "en" ? ev.to_nakshatra?.replace(/_/g, " ") : ev.to_nakshatra_ne;
  if (lang === "en") {
    return `Enters ${toNak ?? "nakshatra"}`;
  }
  if (ev.label_ne?.trim()) return ev.label_ne.trim();
  if (ev.to_pada_ne) return ev.to_pada_ne;
  if (toNak && ev.to_pada != null) {
    return `${toNak} ${ev.to_pada} मा`;
  }
  return toNak ? `${toNak} मा` : "—";
}

export function ingressTitle(
  ev: GocharIngressEvent,
  lang: "ne" | "en" | "hi",
): { primary: string; secondary?: string } {
  const name = ingressGrahaLabel(ev, lang);
  const detail = ingressEventDetail(ev, lang);

  if (ev.level === "rashi" || ev.to_rashi) {
    const from = resolveRashiDisplay(ev.from_rashi_ne, ev.from_rashi, lang);
    const to = resolveRashiDisplay(ev.to_rashi_ne, ev.to_rashi, lang);
    if (lang === "en") {
      return {
        primary: `${name} ${detail}`,
        secondary: from && to ? `From ${from} → ${to}` : undefined,
      };
    }
    return {
      primary: `${name} · ${detail}`,
      secondary: from && to ? `${from} → ${to}` : undefined,
    };
  }

  if (ev.level === "udayast" || ev.level === "motion") {
    return {
      primary: `${name} · ${detail}`,
    };
  }

  if (lang === "en") {
    return {
      primary: `${name} ${detail}`,
      secondary: ev.from_rashi_ne || ev.from_rashi ? undefined : ev.label_ne ?? undefined,
    };
  }
  return {
    primary: `${name} · ${detail}`,
    secondary:
      ev.from_rashi_ne && ev.to_rashi_ne
        ? `${ev.from_rashi_ne} → ${ev.to_rashi_ne}`
        : undefined,
  };
}

export function filterIngressEvents(
  events: GocharIngressEvent[],
  filter: IngressFilter,
): GocharIngressEvent[] {
  if (filter === "all") return events;
  if (filter === "asta") {
    return events.filter((e) => e.level === "udayast" && e.event === "asta");
  }
  if (filter === "retrograde") {
    return events.filter((e) => e.level === "motion");
  }
  if (filter === "rashi") return events.filter((e) => e.level === "rashi");
  return events.filter((e) => e.level === "nakshatra" || e.level === "pada");
}

export function countIngressByFilter(events: GocharIngressEvent[]): Record<IngressFilter, number> {
  return {
    all: events.length,
    rashi: filterIngressEvents(events, "rashi").length,
    nakshatra: filterIngressEvents(events, "nakshatra").length,
    retrograde: filterIngressEvents(events, "retrograde").length,
    asta: filterIngressEvents(events, "asta").length,
  };
}

export function motionLabel(g: GocharGraha, lang: "ne" | "en" | "hi"): string {
  if (g.is_retrograde) return lang === "en" ? "℞ Retrograde" : "℞ वक्री";
  if (lang === "en") return g.motion === "Vakri" ? "Retrograde" : "Direct";
  return g.motion === "Vakri" ? "वक्री" : "मार्गी";
}

export function speedTone(g: GocharGraha, lang: "ne" | "en" | "hi"): string {
  const spd = Math.abs(g.speed_deg_day ?? 0);
  if (spd < 0.05) return lang === "en" ? "Slow" : "मन्द";
  if (spd > 1.2) return lang === "en" ? "Fast" : "तीव्र";
  return lang === "en" ? "Moderate" : "मध्यम";
}
