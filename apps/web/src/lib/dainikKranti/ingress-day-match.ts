import type { CalendarDay, GocharIngressEvent } from "@/lib/api";
import { canonicalCivilIso } from "@/lib/patro-day";
import { parsePatroDayDateKey } from "@/lib/patro-day";

export type IngressBrowseMonth = { year: number; month: number };

function dayJdUt(day: CalendarDay): number | undefined {
  return day.panchanga?.jd_ut;
}

function bsDayFromJdDateKey(
  key: string | undefined,
  browseYear: number,
  browseMonth: number,
): number | undefined {
  if (!key) return undefined;
  try {
    const { year, month, day } = parsePatroDayDateKey(key);
    if (year === browseYear && month === browseMonth) return day;
  } catch {
    return undefined;
  }
  return undefined;
}

function bsDayFromVedicJd(
  vedicJd: number | undefined,
  allDays: CalendarDay[],
): number | undefined {
  if (vedicJd == null || !Number.isFinite(vedicJd)) return undefined;
  for (const d of allDays) {
    const jd = dayJdUt(d);
    if (jd != null && Math.abs(jd - vedicJd) < 1e-6) return d.day;
  }
  return undefined;
}

/** BS गते for an ingress event in the browsed Vikram month. */
export function ingressEventBsDayForMonth(
  ev: GocharIngressEvent,
  browseYear: number,
  browseMonth: number,
  allDays: CalendarDay[],
): number | undefined {
  const fromKey = bsDayFromJdDateKey(
    ev.entry_vedic_jd_date ?? ev.entry_jd_date,
    browseYear,
    browseMonth,
  );
  if (fromKey != null) return fromKey;

  const fromJd = bsDayFromVedicJd(ev.entry_vedic_jd ?? ev.entry_jd, allDays);
  if (fromJd != null) return fromJd;

  const rowAd = ingressEventRowDateAd(ev, allDays, browseYear, browseMonth);
  if (!rowAd) return undefined;
  return allDays.find((d) => canonicalCivilIso(d.date_ad) === canonicalCivilIso(rowAd))?.day;
}

/** Calendar row `date_ad` for sunrise-relative clocks and table keys. */
export function ingressEventRowDateAd(
  ev: GocharIngressEvent,
  allDays: CalendarDay[],
  browseYear?: number,
  browseMonth?: number,
): string | undefined {
  if (browseYear != null && browseMonth != null) {
    const bsDay = bsDayFromJdDateKey(
      ev.entry_vedic_jd_date ?? ev.entry_jd_date,
      browseYear,
      browseMonth,
    );
    if (bsDay != null) {
      const row = allDays.find((d) => d.day === bsDay);
      if (row?.date_ad) return row.date_ad;
    }
  }

  const civil = ev.entry_vedic_date_ad ?? ev.entry_date_ad;
  if (civil) {
    const canon = canonicalCivilIso(civil);
    const hit = allDays.find((d) => canonicalCivilIso(d.date_ad) === canon);
    if (hit) return hit.date_ad;
    if (ev.entry_date_ad) {
      const c2 = canonicalCivilIso(ev.entry_date_ad);
      const hit2 = allDays.find((d) => canonicalCivilIso(d.date_ad) === c2);
      if (hit2) return hit2.date_ad;
    }
    return civil;
  }
  return undefined;
}
