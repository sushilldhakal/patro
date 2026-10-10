import type {
  CalendarDay,
  CalendarDayDetail,
  GocharIngressEvent,
  LagnaSpan,
  PlanetInfo,
} from "@/lib/api";
import {
  dmsInRashiToDegreeCells,
  formatSolarCorrectionDisplay,
  formatTimeShort,
  formatVedicPatroTime,
  longitudeToDegreeCells,
  rashiNeFromNumber,
  toNepaliDigits,
} from "@/lib/panchanga-format";
import { formatRashiByNumber, resolveRashiDisplay, rashiNumberFromName } from "@/lib/rashi-i18n";

export const RASHI_COLUMNS_NE = [
  "मेष", "वृष", "मिथुन", "कर्कट", "सिंह", "कन्या",
  "तुला", "वृश्चिक", "धनु", "मकर", "कुम्भ", "मीन",
] as const;

export const RASHI_COLUMNS_EN = [
  "Mesha", "Vrishabha", "Mithuna", "Karka", "Simha", "Kanya",
  "Tula", "Vrishchika", "Dhanu", "Makara", "Kumbha", "Meena",
] as const;

const GRAHA_EN_BY_KEY: Record<string, string> = {
  sun: "Sun", moon: "Moon", mars: "Mars", mercury: "Mercury", jupiter: "Jupiter",
  venus: "Venus", saturn: "Saturn", rahu: "Rahu", ketu: "Ketu",
};

export const PATRO_PLANET_KEYS = [
  "sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn", "rahu",
] as const;

export const PATRO_PLANET_NE: Record<(typeof PATRO_PLANET_KEYS)[number], string> = {
  sun: "सूर्य",
  moon: "चन्द्र",
  mars: "मंगल",
  mercury: "बुध",
  jupiter: "गुरु",
  venus: "शुक्र",
  saturn: "शनि",
  rahu: "राहु",
};

export type LagnaMatrixRow = {
  day: number;
  dateAd: string;
  weekdayNe?: string;
  weekdayEn?: string;
  sunrise?: string;
  /** Rashi number 1–12 → formatted patro clock */
  times: Record<number, string | undefined>;
};

export type GrahaSpashtaRow = {
  day: number;
  dateAd: string;
  weekdayNe?: string;
  weekdayEn?: string;
  planets: Partial<
    Record<(typeof PATRO_PLANET_KEYS)[number], { rashiNe: string; rashiEn?: string; coords: string; isRetrograde?: boolean; isCombust?: boolean }>
  >;
  deshaantar?: string;
  akshamsha?: string;
  belaantar?: string;
};

export type CalcNoteKind = "ingress" | "late_night" | "paksha_boundary" | "udayast" | "motion";

export type CalcNote = {
  day: number;
  dateAd: string;
  text: string;
  textEn?: string;
  kind: CalcNoteKind;
};

function panchangaOf(day: CalendarDay): CalendarDayDetail | undefined {
  return day.panchanga;
}

function lagnaSpansOf(day: CalendarDay): LagnaSpan[] {
  const p = panchangaOf(day);
  return p?.udaya_lagna?.length
    ? (p.udaya_lagna as LagnaSpan[])
    : p?.lagna_spans ?? [];
}

function planetDegreeCells(info: PlanetInfo): string {
  if (info.dms_in_rashi) {
    const fromDms = dmsInRashiToDegreeCells(info.dms_in_rashi);
    if (fromDms) return fromDms;
  }
  if (info.deg_in_rashi != null) {
    const rashiNum = planetRashiNum(info);
    if (rashiNum != null) {
      return longitudeToDegreeCells((rashiNum - 1) * 30 + info.deg_in_rashi);
    }
  }
  if (info.longitude != null) {
    return longitudeToDegreeCells(info.longitude);
  }
  return "—";
}

function planetRashiNe(info: PlanetInfo): string | undefined {
  if (info.rashi_ne) return info.rashi_ne;
  if (info.rashi_no != null) return rashiNeFromNumber(info.rashi_no);
  return info.rashi_name ?? info.rashi;
}

function planetRashiNum(info: PlanetInfo): number | undefined {
  if (info.rashi_no != null) return info.rashi_no;
  const raw = info.rashi as string | number | undefined;
  if (typeof raw === "number" && raw >= 1 && raw <= 12) return raw;
  if (typeof raw === "string") {
    const n = Number(raw);
    if (!Number.isNaN(n) && n >= 1 && n <= 12) return n;
  }
  return undefined;
}

function isLateNightPatroTime(timeShort: string, sunriseShort?: string): boolean {
  const t = formatTimeShort(timeShort);
  const s = formatTimeShort(sunriseShort);
  if (!t || !s) return false;
  const th = Number(t.split(":")[0]);
  const sh = Number(s.split(":")[0]);
  return !Number.isNaN(th) && !Number.isNaN(sh) && th < sh;
}

export function buildLagnaMatrix(days: CalendarDay[]): LagnaMatrixRow[] {
  return days.map((day) => {
    const spans = lagnaSpansOf(day);
    const times: Record<number, string | undefined> = {};
    for (const span of spans) {
      const num = span.number;
      if (num == null || num < 1 || num > 12) continue;
      const raw =
        span.start_local_time_short ??
        formatTimeShort(span.start_local_time) ??
        formatTimeShort(span.start_hours_clock);
      times[num] = formatVedicPatroTime(raw, day.sunrise);
    }
    return {
      day: day.day,
      dateAd: day.date_ad,
      weekdayNe: day.weekday_ne ?? day.weekday,
      weekdayEn: day.weekday_en ?? day.weekday,
      sunrise: day.sunrise ? (formatTimeShort(day.sunrise) ?? day.sunrise) : undefined,
      times,
    };
  });
}

export function buildGrahaSpashtaMatrix(days: CalendarDay[]): GrahaSpashtaRow[] {
  return days.map((day) => {
    const p = panchangaOf(day);
    const planets: GrahaSpashtaRow["planets"] = {};
    const rawPlanets = p?.planets;
    if (rawPlanets) {
      for (const key of PATRO_PLANET_KEYS) {
        const info = rawPlanets[key];
        if (!info || typeof info === "string") continue;
        const rashiNeRaw = planetRashiNe(info);
        if (!rashiNeRaw) continue;
        const rashiNe = resolveRashiDisplay(rashiNeRaw, info.rashi as string | undefined, "ne") ?? rashiNeRaw;
        planets[key] = {
          rashiNe,
          rashiEn:
            resolveRashiDisplay(rashiNeRaw, info.rashi as string | undefined, "en") ??
            formatRashiByNumber(rashiNumberFromName(rashiNeRaw), "en") ??
            rashiNe,
          coords: planetDegreeCells(info),
          isRetrograde: info.is_retrograde ?? info.retrograde ?? false,
          isCombust: info.is_combust ?? false,
        };
      }
    }
    const sc = p?.solar_corrections;
    const deshaantar = formatSolarCorrectionDisplay(sc?.deshaantar);
    const akshamsha = formatSolarCorrectionDisplay(sc?.akshamsha);
    const belaantar = formatSolarCorrectionDisplay(sc?.belaantar);
    return {
      day: day.day,
      dateAd: day.date_ad,
      weekdayNe: day.weekday_ne ?? day.weekday,
      weekdayEn: day.weekday_en ?? day.weekday,
      planets,
      deshaantar,
      akshamsha,
      belaantar,
    };
  });
}

export function buildCalcNotes(
  days: CalendarDay[],
  ingressEvents: GocharIngressEvent[] = [],
  headerByDate: Record<string, string> = {},
): CalcNote[] {
  const notes: CalcNote[] = [];

  for (const [dateAd, label] of Object.entries(headerByDate)) {
    const day = days.find((d) => d.date_ad === dateAd);
    if (!day) continue;
    notes.push({
      day: day.day,
      dateAd,
      text: `पक्ष परिवर्तन — ${label}`,
      textEn: `Paksha change — ${label}`,
      kind: "paksha_boundary",
    });
  }

  for (const day of days) {
    for (const span of lagnaSpansOf(day)) {
      const raw =
        span.start_local_time_short ??
        formatTimeShort(span.start_local_time) ??
        formatTimeShort(span.start_hours_clock);
      if (!raw || !isLateNightPatroTime(raw, day.sunrise)) continue;
      const rashiNe = span.name_ne ?? rashiNeFromNumber(span.number);
      const rashiEn = span.name ??
        (span.number ? RASHI_COLUMNS_EN[span.number - 1] : undefined);
      const clock = formatVedicPatroTime(raw, day.sunrise);
      notes.push({
        day: day.day,
        dateAd: day.date_ad,
        text: `${rashiNe ?? "लग्न"} आरम्भ ${clock} बजे (२४:०० पछिको समय)`,
        textEn: `${rashiEn ?? "Lagna"} starts at ${clock} (post-24:00)`,
        kind: "late_night",
      });
    }
  }

  for (const ev of ingressEvents) {
    const dateKey = ev.entry_vedic_date_ad ?? ev.entry_date_ad;
    if (!dateKey) continue;
    const day = days.find((d) => d.date_ad === dateKey);
    if (!day) continue;
    const timeRaw = ev.entry_time_local_short ?? ev.entry_time_local?.split(" ")[1];
    const timeNe = timeRaw
      ? formatVedicPatroTime(timeRaw, day.sunrise) ?? toNepaliDigits(timeRaw)
      : undefined;
    const grahaNe = ev.graha_ne ?? ev.graha;
    const grahaEn = GRAHA_EN_BY_KEY[ev.graha?.toLowerCase()] ?? ev.graha ?? grahaNe;
    const timeSuffixNe = timeNe ? ` (${timeNe} बजे)` : "";
    const timeSuffixEn = timeNe ? ` (${timeNe})` : "";

    if (ev.level === "udayast" || ev.level === "motion") {
      const label = ev.label_ne ?? (ev.level === "motion" ? "गति परिवर्तन" : "उदयास्त");
      const labelEn = ev.label_ne ?? (ev.level === "motion" ? "Motion change" : "Rise/Set");
      notes.push({
        day: day.day,
        dateAd: dateKey,
        text: `${grahaNe} — ${label}${timeSuffixNe}`,
        textEn: `${grahaEn} — ${labelEn}${timeSuffixEn}`,
        kind: ev.level === "motion" ? "motion" : "udayast",
      });
      continue;
    }

    const label = ev.label_ne ?? `${ev.to_nakshatra_ne ?? ""} ${ev.to_pada_ne ?? ""}`.trim();
    const labelEn = `${ev.to_nakshatra ?? ev.to_rashi ?? ""}${ev.to_pada ? ` pada ${ev.to_pada}` : ""}`.trim() || label;
    notes.push({
      day: day.day,
      dateAd: dateKey,
      text: `${grahaNe} — ${label}${timeSuffixNe}`,
      textEn: `${grahaEn} — ${labelEn}${timeSuffixEn}`,
      kind: "ingress",
    });
  }

  notes.sort((a, b) => a.day - b.day || a.dateAd.localeCompare(b.dateAd));
  const seen = new Set<string>();
  return notes.filter((n) => {
    const key = `${n.dateAd}|${n.text}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
