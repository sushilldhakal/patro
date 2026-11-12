/**
 * Year daylight chart for suryakranti: sunrise/sunset curves with the
 * daylight band between them, plus a day-length strip (sunset − sunrise).
 */
import type { SunYearResponse } from "@vedic-patro/api-client";
import { formatClockNepali } from "@vedic-patro/domain/panchanga/panchanga-format";
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
  empty: boolean;
};

const W = 720;
const H = 340;
const PAD = { l: 52, r: 14, t: 14, b: 28 };
const GAP = 18;
const LENGTH_H = 72;

type Raw = {
  month: number;
  monthLabel: string;
  day: number;
  dateAd: string;
  sunriseMin: number;
  sunsetMin: number;
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
      });
    }
  }
  return out;
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
    };
  }

  const plotH = H - PAD.t - PAD.b - LENGTH_H - GAP;
  const plot = { x: PAD.l, y: PAD.t, w: W - PAD.l - PAD.r, h: plotH };
  const lengthPlot = { x: PAD.l, y: PAD.t + plotH + GAP, w: plot.w, h: LENGTH_H };

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
  for (let m = clockLo; m <= clockHi; m += 60) {
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
    xTicks.push({ x: xs[i]!, label: label.length > 6 ? label.slice(0, 3) : label });
  }

  const todayAd = todayAdStringInTimezone(new Date(), timeZone);
  const todayIndex = points.findIndex((p) => p.dateAd === todayAd);
  const spanMin = longest.dayLengthMin - shortest.dayLengthMin;

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
