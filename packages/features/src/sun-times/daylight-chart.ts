/**
 * Year daylight chart for suryakranti: sunrise/sunset curves with the
 * daylight band between them, plus a day-length strip (sunset − sunrise)
 * and the four tropical hinges (ayana turns + equinoxes).
 */
import type { SunYearResponse } from "@vedic-patro/api-client";
import { formatClockNepali, isAyanaNorthMark, type AyanaMark } from "@vedic-patro/domain/panchanga/panchanga-format";
import { parseHHMM } from "@vedic-patro/domain/panchanga/time-format";
import { todayAdStringInTimezone } from "@vedic-patro/domain/calendar/zoned-time";
import { type Lang } from "@vedic-patro/i18n/runtime";
import { spanText } from "../common/now-hero";
import type { SunLayout } from "./model";

type T = (key: string, values?: Record<string, unknown>) => string;
type Digits = (v: string | number) => string;

export type SunDaylightChartPoint = {
  i: number;
  x: number;
  riseY: number;
  setY: number;
  lengthY: number;
  sunriseMin: number;
  sunsetMin: number;
  dayLengthMin: number;
  sunriseLabel: string;
  sunsetLabel: string;
  dayLengthLabel: string;
  /** "बैशाख ३" / "Baisakh 3". */
  dayLabel: string;
  dateAd: string;
};

/** One of the four tropical hinges on the year curve. */
export type SunSeasonMarkerKind = "uttarayana" | "dakshinayana" | "basanta_vishuv" | "sharad_vishuv";

export type SunSeasonMarker = {
  kind: SunSeasonMarkerKind;
  /** Short badge on the chart (उ / द / वसन्त / हेमन्त). */
  short: string;
  /** Full name for legend / tooltip. */
  label: string;
  /** What this hinge means in one line. */
  hint: string;
  dayLabel: string;
  dayLengthLabel: string;
  x: number;
  /** Dot on the day-length strip. */
  y: number;
  /** Label baseline above the main plot. */
  labelY: number;
};

export type SunDaylightChartView = {
  width: number;
  height: number;
  plot: { x: number; y: number; w: number; h: number };
  lengthPlot: { x: number; y: number; w: number; h: number };
  risePath: string;
  setPath: string;
  bandPath: string;
  lengthPath: string;
  lengthAreaPath: string;
  yTicks: { y: number; label: string }[];
  lengthTicks: { y: number; label: string }[];
  xTicks: { x: number; label: string }[];
  points: SunDaylightChartPoint[];
  /** उत्तरायण, दक्षिणायन, वसन्त विषुव, शरद् विषुव. */
  markers: SunSeasonMarker[];
  todayIndex: number | null;
  longest: { dayLabel: string; dayLengthLabel: string; sunriseLabel: string; sunsetLabel: string };
  shortest: { dayLabel: string; dayLengthLabel: string; sunriseLabel: string; sunsetLabel: string };
  spanLabel: string;
  title: string;
  subtitle: string;
  aria: string;
  riseLegend: string;
  setLegend: string;
  lengthLegend: string;
  longestLabel: string;
  shortestLabel: string;
  spanLegend: string;
  markersLegend: string;
  empty: boolean;
};

const W = 720;
const H = 368;
const PAD = { l: 52, r: 14, t: 28, b: 28 };
const GAP = 18;
const LENGTH_H = 72;
/**
 * Observed daylight at the true विषुव (Sun on the equator). Atmospheric
 * refraction + the solar disk make sunrise earlier and sunset later, so the
 * day is ~12 h 7 m — not 12 h 0 m. Cutting at 12 h 0 m pushed शरद् ~5 days late.
 */
const EQUINOX_DAYLIGHT_MIN = 12 * 60 + 7;

type Raw = {
  month: number;
  monthLabel: string;
  day: number;
  dateAd: string;
  sunriseMin: number;
  sunsetMin: number;
  /** True = उत्तरायण (northward), false = दक्षिणायन; undefined when the API omitted the mark. */
  ayanaNorth?: boolean;
};

function clockLabel(min: number, lang: Lang, digits: Digits): string {
  const h = Math.floor(min / 60) % 24;
  const m = Math.round(min % 60);
  const short = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  const localized = lang === "en" ? short : (formatClockNepali(short, lang) ?? short);
  return digits(localized);
}

function parseDateAd(dateAd: string): Date {
  const [y, m, day] = dateAd.split("-").map(Number);
  return new Date(y!, m! - 1, day!);
}

function collect(
  data: SunYearResponse | undefined,
  year: number,
  gregorian: boolean,
  layout: SunLayout,
): Raw[] {
  const out: Raw[] = [];
  for (const block of data?.months ?? []) {
    for (const d of block.calendar) {
      const sunriseMin = parseHHMM(d.sunrise);
      const sunsetMin = parseHHMM(d.sunset);
      if (sunriseMin == null || sunsetMin == null || sunsetMin <= sunriseMin) continue;
      const ayanaNorth = d.ayana_mark ? isAyanaNorthMark(d.ayana_mark as AyanaMark) : undefined;
      if (gregorian) {
        if (!d.date_ad) continue;
        const ad = parseDateAd(d.date_ad);
        if (ad.getFullYear() !== year) continue;
        const month = ad.getMonth() + 1;
        out.push({
          month,
          monthLabel: layout.monthLabels[month - 1] ?? String(month),
          day: ad.getDate(),
          dateAd: d.date_ad,
          sunriseMin,
          sunsetMin,
          ayanaNorth,
        });
        continue;
      }
      out.push({
        month: block.month_bs,
        monthLabel: layout.monthLabels[block.month_bs - 1] ?? block.month_name_ne ?? block.month_name,
        day: d.day,
        dateAd: d.date_ad,
        sunriseMin,
        sunsetMin,
        ayanaNorth,
      });
    }
  }
  return out;
}

function adMonth(dateAd: string): number {
  const m = Number(dateAd.split("-")[1]);
  return Number.isFinite(m) ? m : 0;
}

/** Four tropical hinges from ayana flips + day≈night crossings. */
function buildSeasonMarkers(args: {
  raw: Raw[];
  points: SunDaylightChartPoint[];
  lengths: number[];
  labelY: number;
  t: T;
}): SunSeasonMarker[] {
  const { raw, points, lengths, labelY, t } = args;
  const byKind = new Map<SunSeasonMarkerKind, SunSeasonMarker>();

  const put = (kind: SunSeasonMarkerKind, idx: number) => {
    const p = points[idx];
    if (!p || byKind.has(kind)) return;
    byKind.set(kind, {
      kind,
      short: t(`sun_times.chart_marker_${kind}_short`),
      label: t(`sun_times.chart_marker_${kind}`),
      hint: t(`sun_times.chart_marker_${kind}_hint`),
      dayLabel: p.dayLabel,
      dayLengthLabel: p.dayLengthLabel,
      x: p.x,
      y: p.lengthY,
      labelY,
    });
  };

  // अयन turns: the first day the sunrise ayana mark flips.
  for (let i = 1; i < raw.length; i++) {
    const prev = raw[i - 1]!.ayanaNorth;
    const next = raw[i]!.ayanaNorth;
    if (prev == null || next == null || prev === next) continue;
    put(next ? "uttarayana" : "dakshinayana", i);
  }

  // Fallback solstices when the year has no ayana marks: Dec ≈ उत्तरायण, Jun ≈ दक्षिणायन.
  if (!byKind.has("uttarayana") || !byKind.has("dakshinayana")) {
    let winterIdx = 0;
    let summerIdx = 0;
    let winterScore = Infinity;
    let summerScore = Infinity;
    for (let i = 0; i < raw.length; i++) {
      const m = adMonth(raw[i]!.dateAd);
      const len = lengths[i]!;
      // Prefer late December for winter, mid-June for summer; break ties by extreme day length.
      if (m === 12 || m === 1) {
        const score = len + (m === 1 ? 30 : 0);
        if (score < winterScore) {
          winterScore = score;
          winterIdx = i;
        }
      }
      if (m === 6 || m === 7) {
        const score = -len + (m === 7 ? 30 : 0);
        if (score < summerScore) {
          summerScore = score;
          summerIdx = i;
        }
      }
    }
    if (!byKind.has("uttarayana")) put("uttarayana", winterIdx);
    if (!byKind.has("dakshinayana")) put("dakshinayana", summerIdx);
  }

  // विषुव: day closest to ~12 h 7 m in the spring / autumn windows (not 12 h 0 m —
  // that cut is several days off the real equator crossing).
  let springIdx = -1;
  let autumnIdx = -1;
  let springBest = Infinity;
  let autumnBest = Infinity;
  for (let i = 0; i < raw.length; i++) {
    const month = adMonth(raw[i]!.dateAd);
    const dist = Math.abs(lengths[i]! - EQUINOX_DAYLIGHT_MIN);
    if ((month === 3 || month === 4) && dist < springBest) {
      springBest = dist;
      springIdx = i;
    }
    if ((month === 9 || month === 10) && dist < autumnBest) {
      autumnBest = dist;
      autumnIdx = i;
    }
  }
  // Wider windows if a polar / edge year skipped Mar/Apr or Sep/Oct.
  if (springIdx < 0 || autumnIdx < 0) {
    for (let i = 0; i < raw.length; i++) {
      const month = adMonth(raw[i]!.dateAd);
      const dist = Math.abs(lengths[i]! - EQUINOX_DAYLIGHT_MIN);
      if (springIdx < 0 && month >= 2 && month <= 5 && dist < springBest) {
        springBest = dist;
        springIdx = i;
      }
      if (autumnIdx < 0 && month >= 8 && month <= 11 && dist < autumnBest) {
        autumnBest = dist;
        autumnIdx = i;
      }
    }
  }
  if (springIdx >= 0) put("basanta_vishuv", springIdx);
  if (autumnIdx >= 0) put("sharad_vishuv", autumnIdx);

  const order: SunSeasonMarkerKind[] = ["uttarayana", "basanta_vishuv", "dakshinayana", "sharad_vishuv"];
  return order.map((k) => byKind.get(k)).filter((m): m is SunSeasonMarker => !!m);
}

function roundDown(min: number, step: number) {
  return Math.floor(min / step) * step;
}
function roundUp(min: number, step: number) {
  return Math.ceil(min / step) * step;
}

function linePath(xs: number[], ys: number[]): string {
  if (xs.length === 0) return "";
  let d = `M ${xs[0]!.toFixed(2)} ${ys[0]!.toFixed(2)}`;
  for (let i = 1; i < xs.length; i++) d += ` L ${xs[i]!.toFixed(2)} ${ys[i]!.toFixed(2)}`;
  return d;
}

function bandPath(xs: number[], riseYs: number[], setYs: number[]): string {
  if (xs.length === 0) return "";
  let d = `M ${xs[0]!.toFixed(2)} ${riseYs[0]!.toFixed(2)}`;
  for (let i = 1; i < xs.length; i++) d += ` L ${xs[i]!.toFixed(2)} ${riseYs[i]!.toFixed(2)}`;
  for (let i = xs.length - 1; i >= 0; i--) d += ` L ${xs[i]!.toFixed(2)} ${setYs[i]!.toFixed(2)}`;
  return `${d} Z`;
}

function areaUnder(xs: number[], ys: number[], baselineY: number): string {
  if (xs.length === 0) return "";
  let d = `M ${xs[0]!.toFixed(2)} ${baselineY.toFixed(2)} L ${xs[0]!.toFixed(2)} ${ys[0]!.toFixed(2)}`;
  for (let i = 1; i < xs.length; i++) d += ` L ${xs[i]!.toFixed(2)} ${ys[i]!.toFixed(2)}`;
  d += ` L ${xs[xs.length - 1]!.toFixed(2)} ${baselineY.toFixed(2)} Z`;
  return d;
}

const EMPTY: SunDaylightChartView = {
  width: W,
  height: H,
  plot: { x: PAD.l, y: PAD.t, w: W - PAD.l - PAD.r, h: 1 },
  lengthPlot: { x: PAD.l, y: PAD.t, w: W - PAD.l - PAD.r, h: 1 },
  risePath: "",
  setPath: "",
  bandPath: "",
  lengthPath: "",
  lengthAreaPath: "",
  yTicks: [],
  lengthTicks: [],
  xTicks: [],
  points: [],
  markers: [],
  todayIndex: null,
  longest: { dayLabel: "", dayLengthLabel: "", sunriseLabel: "", sunsetLabel: "" },
  shortest: { dayLabel: "", dayLengthLabel: "", sunriseLabel: "", sunsetLabel: "" },
  spanLabel: "",
  title: "",
  subtitle: "",
  aria: "",
  riseLegend: "",
  setLegend: "",
  lengthLegend: "",
  longestLabel: "",
  shortestLabel: "",
  spanLegend: "",
  markersLegend: "",
  empty: true,
};

/** Build the year daylight chart, or an empty shell when there is no usable data. */
export function buildSunDaylightChart(args: {
  data: SunYearResponse | undefined;
  year: number;
  gregorian: boolean;
  layout: SunLayout;
  lang: Lang;
  t: T;
  digits: Digits;
  timeZone: string;
}): SunDaylightChartView {
  const { data, year, gregorian, layout, lang, t, digits, timeZone } = args;
  const raw = collect(data, year, gregorian, layout);
  if (raw.length < 2) {
    return {
      ...EMPTY,
      title: t("sun_times.chart_title"),
      subtitle: t("sun_times.chart_subtitle"),
      aria: t("sun_times.chart_aria", { year: digits(year) }),
      riseLegend: t("sun_times.col_sunrise"),
      setLegend: t("sun_times.col_sunset"),
      lengthLegend: t("sun_times.chart_day_length"),
      longestLabel: t("sun_times.chart_longest"),
      shortestLabel: t("sun_times.chart_shortest"),
      spanLegend: t("sun_times.chart_span"),
      markersLegend: t("sun_times.chart_markers"),
    };
  }

  const plotH = H - PAD.t - PAD.b - LENGTH_H - GAP;
  const plot = { x: PAD.l, y: PAD.t, w: W - PAD.l - PAD.r, h: plotH };
  const lengthPlot = { x: PAD.l, y: PAD.t + plotH + GAP, w: plot.w, h: LENGTH_H };
  const markerLabelY = Math.max(11, PAD.t - 10);

  const riseMins = raw.map((p) => p.sunriseMin);
  const setMins = raw.map((p) => p.sunsetMin);
  const lengths = raw.map((p) => p.sunsetMin - p.sunriseMin);
  const clockLo = roundDown(Math.min(...riseMins) - 15, 30);
  const clockHi = roundUp(Math.max(...setMins) + 15, 30);
  const lenLo = roundDown(Math.min(...lengths) - 10, 15);
  const lenHi = roundUp(Math.max(...lengths) + 10, 15);

  const n = raw.length;
  const xAt = (i: number) => plot.x + (i / Math.max(1, n - 1)) * plot.w;
  const yClock = (min: number) => plot.y + ((min - clockLo) / Math.max(1, clockHi - clockLo)) * plot.h;
  const yLen = (min: number) => lengthPlot.y + lengthPlot.h - ((min - lenLo) / Math.max(1, lenHi - lenLo)) * lengthPlot.h;

  const xs = raw.map((_, i) => xAt(i));
  const riseYs = riseMins.map(yClock);
  const setYs = setMins.map(yClock);
  const lengthYs = lengths.map(yLen);

  const points: SunDaylightChartPoint[] = raw.map((p, i) => {
    const dayLengthMin = p.sunsetMin - p.sunriseMin;
    return {
      i,
      x: xs[i]!,
      riseY: riseYs[i]!,
      setY: setYs[i]!,
      lengthY: lengthYs[i]!,
      sunriseMin: p.sunriseMin,
      sunsetMin: p.sunsetMin,
      dayLengthMin,
      sunriseLabel: clockLabel(p.sunriseMin, lang, digits),
      sunsetLabel: clockLabel(p.sunsetMin, lang, digits),
      dayLengthLabel: spanText(dayLengthMin * 60_000, t, digits),
      dayLabel: `${p.monthLabel} ${digits(p.day)}`,
      dateAd: p.dateAd,
    };
  });

  let longest = points[0]!;
  let shortest = points[0]!;
  for (const p of points) {
    if (p.dayLengthMin > longest.dayLengthMin) longest = p;
    if (p.dayLengthMin < shortest.dayLengthMin) shortest = p;
  }

  const yTicks: { y: number; label: string }[] = [];
  const clockSpan = clockHi - clockLo;
  const clockStep = clockSpan > 12 * 60 ? 180 : clockSpan > 8 * 60 ? 120 : 60;
  const tickStart = roundUp(clockLo, clockStep);
  for (let m = tickStart; m <= clockHi; m += clockStep) {
    yTicks.push({ y: yClock(m), label: clockLabel(m, lang, digits) });
  }
  const lengthTicks: { y: number; label: string }[] = [];
  const lenStep = lenHi - lenLo > 180 ? 60 : 30;
  for (let m = lenLo; m <= lenHi; m += lenStep) {
    lengthTicks.push({ y: yLen(m), label: spanText(m * 60_000, t, digits) });
  }

  const xTicks: { x: number; label: string }[] = [];
  let lastMonth = -1;
  for (let i = 0; i < raw.length; i++) {
    const month = raw[i]!.month;
    if (month === lastMonth) continue;
    lastMonth = month;
    const label = layout.monthLabels[month - 1] ?? String(month);
    xTicks.push({ x: xs[i]!, label: label.length > 7 ? label.slice(0, 4) : label });
  }

  const todayAd = todayAdStringInTimezone(new Date(), timeZone);
  const todayIndex = points.findIndex((p) => p.dateAd === todayAd);
  const spanMin = longest.dayLengthMin - shortest.dayLengthMin;
  const markers = buildSeasonMarkers({ raw, points, lengths, labelY: markerLabelY, t });

  return {
    width: W,
    height: H,
    plot,
    lengthPlot,
    risePath: linePath(xs, riseYs),
    setPath: linePath(xs, setYs),
    bandPath: bandPath(xs, riseYs, setYs),
    lengthPath: linePath(xs, lengthYs),
    lengthAreaPath: areaUnder(xs, lengthYs, lengthPlot.y + lengthPlot.h),
    yTicks,
    lengthTicks,
    xTicks,
    points,
    markers,
    todayIndex: todayIndex >= 0 ? todayIndex : null,
    longest: {
      dayLabel: longest.dayLabel,
      dayLengthLabel: longest.dayLengthLabel,
      sunriseLabel: longest.sunriseLabel,
      sunsetLabel: longest.sunsetLabel,
    },
    shortest: {
      dayLabel: shortest.dayLabel,
      dayLengthLabel: shortest.dayLengthLabel,
      sunriseLabel: shortest.sunriseLabel,
      sunsetLabel: shortest.sunsetLabel,
    },
    spanLabel: spanText(Math.max(1, spanMin) * 60_000, t, digits),
    title: t("sun_times.chart_title"),
    subtitle: t("sun_times.chart_subtitle"),
    aria: t("sun_times.chart_aria", { year: digits(year) }),
    riseLegend: t("sun_times.col_sunrise"),
    setLegend: t("sun_times.col_sunset"),
    lengthLegend: t("sun_times.chart_day_length"),
    longestLabel: t("sun_times.chart_longest"),
    shortestLabel: t("sun_times.chart_shortest"),
    spanLegend: t("sun_times.chart_span"),
    markersLegend: t("sun_times.chart_markers"),
    empty: false,
  };
}

/** Nearest sample by x in chart coordinates. */
export function nearestDaylightPoint(chart: SunDaylightChartView, x: number): SunDaylightChartPoint | null {
  if (chart.points.length === 0) return null;
  let best = chart.points[0]!;
  let bestDist = Math.abs(best.x - x);
  for (const p of chart.points) {
    const d = Math.abs(p.x - x);
    if (d < bestDist) {
      best = p;
      bestDist = d;
    }
  }
  return best;
}
