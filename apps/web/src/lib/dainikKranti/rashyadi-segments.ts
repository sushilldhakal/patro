import type { CalendarDay, GocharIngressEvent, PlanetInfo } from "@/lib/api";
import {
  ingressEventBsDayForMonth,
  ingressEventRowDateAd,
  type IngressBrowseMonth,
} from "@/lib/dainikKranti/ingress-day-match";
import { rashiNumberFromName } from "@/lib/rashi-i18n";
import { toNepaliDigits } from "@/lib/panchanga-format";
import {
  GRAHA_KEY_TO_TRANSIT_ABBREV,
  RASHYADI_PLANET_KEYS,
  type RashyadiPlanetKey,
  type RashyadiPlanetRow,
  type RashyadiSegment,
  rashyadiFromPlanetInfo,
} from "./rashyadi";

const LUNAR_MONTH_INITIAL: Record<string, string> = {
  baisakh: "वै.",
  baishakh: "वै.",
  vaisakha: "वै.",
  vaishakha: "वै.",
  jestha: "ज्ये.",
  jyeshtha: "ज्ये.",
  jyestha: "ज्ये.",
  ashadh: "आषा.",
  ashadha: "आषा.",
  asar: "आषा.",
  shrawan: "श्रा.",
  shrawn: "श्रा.",
  shravan: "श्रा.",
  shravana: "श्रा.",
  bhadra: "भा.",
  bhadau: "भा.",
  bhadrapada: "भा.",
  ashwin: "आश्व.",
  ashwina: "आश्व.",
  aswin: "आश्व.",
  kartik: "का.",
  kartika: "का.",
  mangsir: "मार्ग.",
  margashir: "मार्ग.",
  margashirsha: "मार्ग.",
  margasirsa: "मार्ग.",
  poush: "पौ.",
  paush: "पौ.",
  pausha: "पौ.",
  push: "पौ.",
  magh: "माघ.",
  magha: "माघ.",
  falgun: "फा.",
  phalgun: "फा.",
  phalguna: "फा.",
  chaitra: "चै.",
  chait: "चै.",
  chaitya: "चै.",
};

export type PakshaSegmentInfo = { key: string; label: string };

export type RashyadiRangeTables = {
  start: RashyadiSegment | null;
  end: RashyadiSegment | null;
};

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

export function formatGapashaCode(
  bsDay: number,
  grahaKey: string,
  rashiNo: number,
): string | undefined {
  const abbrev = GRAHA_KEY_TO_TRANSIT_ABBREV[grahaKey];
  if (!abbrev) return undefined;
  return `${toNepaliDigits(bsDay)}${abbrev}${toNepaliDigits(rashiNo)}`;
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
