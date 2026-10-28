/**
 * The year at a glance for graha asta and vakri: one strip per graha across
 * the year with its asta (or vakri) stretches marked, a tick at today, and a
 * line saying whether it is in one now or when the next begins.
 */
import type { GrahaAstaPeriod, GrahaVakriEvent } from "@vedic-patro/api-client";
import { AD_MONTH_NAMES, AD_MONTH_NAMES_NE, BS_MONTH_NAMES, BS_MONTHS_NE } from "@vedic-patro/domain/calendar/bs-calendar";
import { isGregorianEra, type Era } from "@vedic-patro/domain/calendar/era";
import { formatLocaleDigits, type Lang } from "@vedic-patro/domain/locale";
import { eraDayLabel, stampDate } from "./model";

type T = (key: string, values?: Record<string, unknown>) => string;

const DAY_MS = 86_400_000;
const jdMs = (jd: number) => (jd - 2440587.5) * DAY_MS;

export type YearStripRow = {
  graha: string;
  name: string;
  /** Stretches as 0..1 of the year. */
  segments: { from: number; to: number }[];
  /** In one of the stretches today. */
  on: boolean;
  status: string;
};

export type YearOverview = {
  title: string;
  /** The twelve month names under the strips. */
  months: string[];
  /** Today as 0..1 of the year, when the year holds it. */
  today?: number;
  todayLabel: string;
  /** What a marked stretch means (`अस्त` / `वक्री`). */
  legend: string;
  rows: YearStripRow[];
};

type Range = { start: number; end: number };
type Stretch = { from: number; to: number; fromLabel: string };

function monthNames(era: Era | undefined, lang: Lang): string[] {
  if (era && isGregorianEra(era)) return [...(lang === "en" ? AD_MONTH_NAMES : AD_MONTH_NAMES_NE)];
  return [...(lang === "en" ? BS_MONTH_NAMES : BS_MONTHS_NE)];
}

function build(
  order: readonly string[],
  stretches: Map<string, Stretch[]>,
  range: Range,
  nowMs: number,
  lang: Lang,
  t: T,
  era: Era | undefined,
  keys: { title: string; legend: string; now: string; next: string; none: string },
): YearOverview {
  const span = range.end - range.start || 1;
  const frac = (ms: number) => Math.min(1, Math.max(0, (ms - range.start) / span));
  const digits = (v: string | number) => formatLocaleDigits(v, lang);
  const inYear = nowMs >= range.start && nowMs <= range.end;
  return {
    title: t(keys.title),
    months: monthNames(era, lang),
    today: inYear ? frac(nowMs) : undefined,
    todayLabel: t("graha_pages.overview.today"),
    legend: t(keys.legend),
    rows: order.map((graha) => {
      const list = stretches.get(graha) ?? [];
      const cur = list.find((s) => nowMs >= s.from && nowMs < s.to);
      const next = list.find((s) => s.from > nowMs);
      const status = cur
        ? t(keys.now, { count: digits(Math.max(1, Math.ceil((cur.to - nowMs) / DAY_MS))) })
        : next
          ? t(keys.next, { date: next.fromLabel })
          : t(keys.none);
      return {
        graha,
        name: t(`grahas.${graha}`, { defaultValue: graha }),
        segments: list.map((s) => ({ from: frac(s.from), to: frac(s.to) })).filter((s) => s.to > s.from),
        on: Boolean(cur),
        status,
      };
    }),
  };
}

export function astaOverview(
  order: readonly string[],
  periods: readonly GrahaAstaPeriod[],
  range: Range,
  lang: Lang,
  t: T,
  era?: Era,
  nowMs: number = Date.now(),
): YearOverview {
  const stretches = new Map<string, Stretch[]>();
  for (const p of periods) {
    const from = p.start ? Date.parse(p.start.iso) : range.start;
    const to = p.end ? Date.parse(p.end.iso) : range.end;
    const fromLabel = p.start ? formatLocaleDigits(stampDate(p.start, lang, era), lang) : "";
    const list = stretches.get(p.graha) ?? [];
    list.push({ from, to, fromLabel });
    stretches.set(p.graha, list);
  }
  return build(order, stretches, range, nowMs, lang, t, era, {
    title: "graha_pages.overview.asta_title",
    legend: "graha_pages.overview.asta_legend",
    now: "graha_pages.overview.asta_now",
    next: "graha_pages.overview.asta_next",
    none: "graha_pages.overview.asta_none",
  });
}

/** Vakri stretches run from a retrograde station to the next direct one (or the year's edge). */
export function vakriOverview(
  order: readonly string[],
  events: readonly GrahaVakriEvent[],
  range: Range,
  lang: Lang,
  t: T,
  era?: Era,
  nowMs: number = Date.now(),
): YearOverview {
  const stretches = new Map<string, Stretch[]>();
  const byGraha = new Map<string, GrahaVakriEvent[]>();
  for (const ev of events) byGraha.set(ev.graha, [...(byGraha.get(ev.graha) ?? []), ev]);
  const at = (ev: GrahaVakriEvent) => {
    const utc = (ev as { entry_time_utc?: string }).entry_time_utc;
    return utc ? Date.parse(utc) : ev.entry_jd != null ? jdMs(ev.entry_jd) : NaN;
  };
  for (const [graha, list] of byGraha) {
    const sorted = [...list].sort((a, b) => at(a) - at(b));
    const out: Stretch[] = [];
    let open: { from: number; label: string } | null = null;
    sorted.forEach((ev, i) => {
      const retro = ev.is_retrograde === true || ev.motion === "Vakri";
      if (retro) {
        const label = ev.entry_jd_date ? formatLocaleDigits(eraDayLabel(ev.entry_jd_date, lang, era), lang) : "";
        open = { from: at(ev), label };
      } else {
        // A direct station with nothing open: retrograde since before the year began.
        const from: number = open ? open.from : i === 0 ? range.start : NaN;
        if (Number.isFinite(from)) out.push({ from, to: at(ev), fromLabel: open?.label ?? "" });
        open = null;
      }
    });
    if (open) out.push({ from: (open as { from: number }).from, to: range.end, fromLabel: (open as { label: string }).label });
    stretches.set(graha, out);
  }
  return build(order, stretches, range, nowMs, lang, t, era, {
    title: "graha_pages.overview.vakri_title",
    legend: "graha_pages.overview.vakri_legend",
    now: "graha_pages.overview.vakri_now",
    next: "graha_pages.overview.vakri_next",
    none: "graha_pages.overview.vakri_none",
  });
}

/** The year's span from the payload: its Julian-day range, else its Gregorian dates. */
export function yearRange(data: { range_start_jd?: number; range_end_jd?: number; gregorian_range?: { start: string; end: string } } | undefined): Range | null {
  if (!data) return null;
  if (data.range_start_jd != null && data.range_end_jd != null) return { start: jdMs(data.range_start_jd), end: jdMs(data.range_end_jd + 1) };
  if (data.gregorian_range) return { start: Date.parse(`${data.gregorian_range.start}T00:00:00Z`), end: Date.parse(`${data.gregorian_range.end}T23:59:59Z`) };
  return null;
}

/** Each eclipse as a short mark on the year (a day wide, so it shows). */
export function eclipseOverview(
  graha: "sun" | "moon",
  events: readonly { max_utc?: string | null; date_jd?: number | null; date_jd_date?: string | null }[],
  range: Range,
  lang: Lang,
  t: T,
  era?: Era,
  nowMs: number = Date.now(),
): YearOverview {
  const stretches: Stretch[] = events
    .map((ev) => {
      const at = ev.max_utc ? Date.parse(ev.max_utc) : ev.date_jd != null ? jdMs(ev.date_jd) : NaN;
      const fromLabel = ev.date_jd_date ? formatLocaleDigits(eraDayLabel(ev.date_jd_date, lang, era), lang) : "";
      return { from: at - DAY_MS / 2, to: at + DAY_MS / 2, fromLabel };
    })
    .filter((s) => Number.isFinite(s.from));
  return build([graha], new Map([[graha, stretches]]), range, nowMs, lang, t, era, {
    title: "graha_pages.overview.eclipse_title",
    legend: "graha_pages.overview.eclipse_legend",
    now: "graha_pages.overview.eclipse_now",
    next: "graha_pages.overview.eclipse_next",
    none: "graha_pages.overview.eclipse_none",
  });
}
