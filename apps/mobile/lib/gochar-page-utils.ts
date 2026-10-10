/**
 * Gochar page helpers — mirrors the web `gochar-page-utils.ts`, trimmed to the
 * pieces the mobile screen needs and wired to mobile's BS calendar helpers.
 */

import type { GocharGraha, GocharIngressEvent } from "@/lib/api";
import { adToBS, BS_MONTH_NAMES, BS_MONTHS_NE } from "@/lib/bs-calendar";
import { GRAHA_NAME, type GrahaKey } from "@/lib/graha-details";
import { toNepaliDigits } from "@/lib/panchanga-format";
import { parseCivilIsoToDate } from "@/lib/patro-day";
import { resolveRashiDisplay, toWesternRashi } from "@/lib/rashi-i18n";

export type IngressFilter = "all" | "rashi" | "nakshatra" | "retrograde" | "asta";

type Lang = "ne" | "en";

function datePart(iso: string): string {
  return iso.includes("T") ? (iso.split("T")[0] ?? iso) : iso.slice(0, 10);
}

export function grahaExalted(_key: GrahaKey, g: GocharGraha): boolean {
  return Boolean(g.is_exalted);
}

export function grahaNakshatraLine(
  g: GocharGraha,
  lang: Lang,
  digits?: (v: number | string) => string,
): string {
  const nak =
    lang === "en" ? (g.nakshatra ?? g.nakshatra_ne) : (g.nakshatra_ne ?? g.nakshatra);
  if (!nak) return "—";
  if (g.pada == null) return nak;
  const p = lang === "en" ? String(g.pada) : (digits ?? String)(g.pada);
  return `${nak} · ${p}`;
}

export function daysFromRef(entryIso: string, refIso: string): number {
  const a = parseCivilIsoToDate(datePart(entryIso));
  const b = parseCivilIsoToDate(datePart(refIso));
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

export function relativeDayLabel(
  rel: number,
  lang: Lang,
  digits: (v: number | string) => string,
): string {
  if (rel === 0) return lang === "en" ? "Today" : "आज";
  if (rel === 1) return lang === "en" ? "Tomorrow" : "भोलि";
  if (rel === -1) return lang === "en" ? "Yesterday" : "हिजो";
  if (rel < 0) {
    return lang === "en" ? `${digits(-rel)} days ago` : `${digits(-rel)} दिन अघि`;
  }
  return lang === "en" ? `In ${digits(rel)} days` : `${digits(rel)} दिनमा`;
}

/** `१२ साउन २०८३` in Nepali, `12 Aug 2026` in English. */
export function formatGocharPatroDate(iso: string, lang: Lang): string {
  const part = datePart(iso);
  const d = parseCivilIsoToDate(part);
  if (lang === "en") {
    return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
  }
  const bs = adToBS(d);
  return `${toNepaliDigits(bs.day)} ${BS_MONTHS_NE[bs.month - 1] ?? ""} ${toNepaliDigits(bs.year)}`;
}

/** Ingress list date chip — BS month + day. */
export function formatGocharIngressChip(
  iso: string,
  lang: Lang,
  digits: (v: number | string) => string,
): { day: string; month: string } {
  const bs = adToBS(parseCivilIsoToDate(datePart(iso)));
  if (lang === "en") {
    return {
      day: String(bs.day),
      month: (BS_MONTH_NAMES[bs.month - 1] ?? "").slice(0, 3).toUpperCase(),
    };
  }
  return { day: digits(bs.day), month: BS_MONTHS_NE[bs.month - 1] ?? "" };
}

export function ingressEventDateAd(ev: GocharIngressEvent): string | undefined {
  return (
    ev.entry_vedic_date_ad ??
    ev.entry_date_ad ??
    (ev.entry_time_local ? datePart(ev.entry_time_local) : undefined)
  );
}

export function ingressGrahaLabel(ev: GocharIngressEvent, lang: Lang): string {
  const key = ev.graha as GrahaKey;
  return lang === "en"
    ? (GRAHA_NAME[key]?.en ?? ev.graha)
    : ev.graha_ne || GRAHA_NAME[key]?.ne || ev.graha;
}

/** Event line without graha name — shown under the graha title in lists. */
export function ingressEventDetail(ev: GocharIngressEvent, lang: Lang): string {
  if (ev.level === "udayast") {
    if (lang === "en") return ev.event === "asta" ? "Heliacal set (combust)" : "Heliacal rise";
    return ev.label_ne ?? (ev.event === "asta" ? "अस्त" : "उदय");
  }

  if (ev.level === "motion") {
    const retro = ev.motion_ne === "वक्र";
    if (lang === "en") return retro ? "Turns retrograde" : "Turns direct";
    return ev.label_ne ?? (retro ? "वक्री" : "मार्गी");
  }

  if (ev.level === "rashi" || ev.to_rashi) {
    if (lang === "en") return `Enters ${toWesternRashi(ev.to_rashi) ?? ev.to_rashi ?? "—"}`;
    return `${resolveRashiDisplay(ev.to_rashi_ne, ev.to_rashi, lang) ?? "—"} मा प्रवेश`;
  }

  const toNak = lang === "en" ? ev.to_nakshatra?.replace(/_/g, " ") : ev.to_nakshatra_ne;
  if (lang === "en") return `Enters ${toNak ?? "nakshatra"}`;
  if (ev.label_ne?.trim()) return ev.label_ne.trim();
  if (ev.to_pada_ne) return ev.to_pada_ne;
  if (toNak && ev.to_pada != null) return `${toNak} ${ev.to_pada} मा`;
  return toNak ? `${toNak} मा` : "—";
}

export function filterIngressEvents(
  events: GocharIngressEvent[],
  filter: IngressFilter,
): GocharIngressEvent[] {
  if (filter === "all") return events;
  if (filter === "asta") return events.filter((e) => e.level === "udayast" && e.event === "asta");
  if (filter === "retrograde") return events.filter((e) => e.level === "motion");
  if (filter === "rashi") return events.filter((e) => e.level === "rashi");
  return events.filter((e) => e.level === "nakshatra" || e.level === "pada");
}

export function countIngressByFilter(
  events: GocharIngressEvent[],
): Record<IngressFilter, number> {
  return {
    all: events.length,
    rashi: filterIngressEvents(events, "rashi").length,
    nakshatra: filterIngressEvents(events, "nakshatra").length,
    retrograde: filterIngressEvents(events, "retrograde").length,
    asta: filterIngressEvents(events, "asta").length,
  };
}

export function motionLabel(g: GocharGraha, lang: Lang): string {
  if (g.is_retrograde) return lang === "en" ? "℞ Retrograde" : "℞ वक्री";
  if (lang === "en") return g.motion === "Vakri" ? "Retrograde" : "Direct";
  return g.motion === "Vakri" ? "वक्री" : "मार्गी";
}

export function speedTone(g: GocharGraha, lang: Lang): string {
  const spd = Math.abs(g.speed_deg_day ?? 0);
  if (spd < 0.05) return lang === "en" ? "Slow" : "मन्द";
  if (spd > 1.2) return lang === "en" ? "Fast" : "तीव्र";
  return lang === "en" ? "Moderate" : "मध्यम";
}
