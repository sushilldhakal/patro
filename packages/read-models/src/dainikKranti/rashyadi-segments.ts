import type { CalendarDay, GocharIngressEvent, PlanetInfo } from "@vedic-patro/api-client";
import { ingressEventBsDayForMonth, ingressEventRowDateAd, type IngressBrowseMonth } from "./ingress-day-match";
import { rashiNumberFromName } from "@vedic-patro/domain/rashi-i18n";
import { RASHYADI_PLANET_KEYS, type RashyadiPlanetKey, type RashyadiPlanetRow, type RashyadiSegment, rashyadiFromPlanetInfo } from "./rashyadi";
import { LUNAR_MONTH_INITIAL, type PakshaSegmentInfo, type RashyadiRangeTables, formatGapashaCode } from "@vedic-patro/domain/dainikKranti/rashyadi-segments";

export * from "@vedic-patro/domain/dainikKranti/rashyadi-segments";

function isMoonIngress(ev: GocharIngressEvent): boolean {
  const g = (ev.graha ?? "").toLowerCase();
  if (g === "moon" || g === "chandra") return true;
  const ne = ev.graha_ne ?? "";
  return ne.includes("चन्द्र") || ne.includes("चंद्र");
}

function ingressDayInRange(
  ev: GocharIngressEvent,
  rangeDays: CalendarDay[],
  allDays: CalendarDay[],
  browse?: IngressBrowseMonth,
): CalendarDay | undefined {
  if (browse) {
    const bsDay = ingressEventBsDayForMonth(
      ev,
      browse.year,
      browse.month,
      allDays,
    );
    if (bsDay == null) return undefined;
    return rangeDays.find((d) => d.day === bsDay);
  }
  const dateAd = ingressEventRowDateAd(ev, allDays);
  if (!dateAd) return undefined;
  return rangeDays.find((d) => d.date_ad === dateAd);
}

function rashiNoFromIngress(ev: GocharIngressEvent): number | undefined {
  return (
    rashiNumberFromName(ev.to_rashi) ??
    rashiNumberFromName(ev.to_rashi_ne)
  );
}

function moonRashiAtDay(day: CalendarDay): string | undefined {
  const det = day.panchanga;
  return (
    det?.chandra_rashi_ne ??
    (typeof det?.chandra_rashi === "string" ? det.chandra_rashi : undefined) ??
    (det?.chandra_rashi as { name_ne?: string } | undefined)?.name_ne
  );
}

function planetsAtDay(day: CalendarDay): Partial<Record<RashyadiPlanetKey, RashyadiPlanetRow>> {
  const raw = day.panchanga?.planets;
  if (!raw) return {};

  const out: Partial<Record<RashyadiPlanetKey, RashyadiPlanetRow>> = {};
  for (const key of RASHYADI_PLANET_KEYS) {
    const info = raw[key];
    if (!info || typeof info === "string") continue;
    const row = rashyadiFromPlanetInfo(info as PlanetInfo);
    if (row) out[key] = row;
  }
  return out;
}

function collectTransitCodes(
  rangeDays: CalendarDay[],
  allDays: CalendarDay[],
  ingressEvents: GocharIngressEvent[],
  browse?: IngressBrowseMonth,
): string[] {
  const codes: string[] = [];

  for (const ev of ingressEvents) {
    if (ev.level !== "rashi" || isMoonIngress(ev)) continue;
    const day = ingressDayInRange(ev, rangeDays, allDays, browse);
    const rNo = rashiNoFromIngress(ev);
    if (!day || !rNo) continue;
    const code = formatGapashaCode(day.day, ev.graha, rNo);
    if (code && !codes.includes(code)) codes.push(code);
  }

  return codes;
}

export function lunarMonthInitialLabel(day: CalendarDay): string {
  const lc = day.panchanga?.lunar_calendar;
  const layer = lc?.purnimant ?? lc?.amanta ?? day.panchanga?.lunar_month;
  const key = (layer?.name ?? "").toLowerCase().replace(/[^a-z]/g, "");
  return LUNAR_MONTH_INITIAL[key] ?? "श्रा.";
}

function buildSegment(
  day: CalendarDay,
  anchor: "start" | "end",
  labelNe: string,
  versionNe: string,
  pakshaDayCount: number,
  transitCodes: string[],
): RashyadiSegment {
  return {
    id: `${anchor}-${day.date_ad}`,
    anchor,
    versionNe,
    labelNe,
    anchorDateAd: day.date_ad,
    bsDay: day.day,
    pakshaDayCount,
    monthInitialLabel: lunarMonthInitialLabel(day),
    moonRashiNe: moonRashiAtDay(day),
    transitCodes,
    planets: planetsAtDay(day),
  };
}

/**
 * देखाइएको अवधिका लागि अधिकतम दुई तालिका — आरम्भ र समाप्ति मिति मात्र।
 */
export function buildRashyadiRangeTables(
  days: CalendarDay[],
  allDays: CalendarDay[],
  ingressEvents: GocharIngressEvent[],
  pakshaSegmentOf: (day: CalendarDay) => PakshaSegmentInfo,
  browse?: IngressBrowseMonth,
): RashyadiRangeTables {
  if (days.length === 0) {
    return { start: null, end: null };
  }

  const firstDay = days[0]!;
  const lastDay = days[days.length - 1]!;
  const transitCodes = collectTransitCodes(days, allDays, ingressEvents, browse);
  const pakshaDayCount = days.length;
  const versionNe = pakshaSegmentOf(firstDay).label;

  const start = buildSegment(
    firstDay,
    "start",
    "आरम्भ",
    versionNe,
    pakshaDayCount,
    transitCodes,
  );

  if (lastDay.date_ad === firstDay.date_ad) {
    return { start, end: null };
  }

  const endVersion =
    pakshaSegmentOf(lastDay).label !== versionNe
      ? `${versionNe} → ${pakshaSegmentOf(lastDay).label}`
      : versionNe;

  const end = buildSegment(
    lastDay,
    "end",
    "समाप्त",
    endVersion,
    pakshaDayCount,
    transitCodes,
  );

  return { start, end };
}
