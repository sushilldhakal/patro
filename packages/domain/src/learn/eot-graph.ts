import {
  eotCurve,
  equationOfTime,
  euclideanModulo,
  meanAnomalyAt,
  solarMonthStarts,
  PERIHELION,
  VERNAL,
} from "../sky3d/day-mechanics";

/** Shared by both drawings of the equation-of-time chart. */
export type Pt = { t: number; minutes: number };

export const EOT_W = 336;
export const EOT_H = 400;
const PAD = { l: 54, r: 10, t: 8, b: 28 };
const PI2 = Math.PI * 2;

/** Insert the exact zero-crossing so the late/early fills meet the axis cleanly. */
export function withZeroCrossings(pts: Pt[]): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < pts.length; i += 1) {
    const cur = pts[i]!;
    if (i > 0) {
      const prev = pts[i - 1]!;
      if (prev.minutes * cur.minutes < 0) {
        const u = prev.minutes / (prev.minutes - cur.minutes);
        out.push({ t: prev.t + u * (cur.t - prev.t), minutes: 0 });
      }
    }
    out.push(cur);
  }
  return out;
}

function yearCurve(e: number, tilt: number): Pt[] {
  return eotCurve(e, tilt).map((p) => ({ t: p.day / 365, minutes: p.minutes }));
}

function areaPath(pts: Pt[], x: (min: number) => number, y: (frac: number) => number, side: "late" | "early"): string {
  if (pts.length === 0) return "";
  const clamp = (m: number) => (side === "late" ? Math.min(m, 0) : Math.max(m, 0));
  const x0 = x(0);
  let d = `M ${x0.toFixed(1)} ${y(pts[0]!.t).toFixed(1)}`;
  for (const p of pts) d += ` L ${x(clamp(p.minutes)).toFixed(1)} ${y(p.t).toFixed(1)}`;
  d += ` L ${x0.toFixed(1)} ${y(pts[pts.length - 1]!.t).toFixed(1)} Z`;
  return d;
}

function durationTicks(peakMin: number): { minutes: number; sec: number }[] {
  const peakSec = peakMin * 60;
  const stepSec = peakSec > 480 ? 200 : peakSec > 240 ? 100 : 60;
  const axisSec = Math.max(stepSec * Math.ceil(peakSec / stepSec), stepSec);
  const out: { minutes: number; sec: number }[] = [];
  for (let s = -axisSec; s <= axisSec + 1e-6; s += stepSec) out.push({ minutes: s / 60, sec: s });
  return out;
}

export type EotGraphModel = {
  ticks: { sec: number; x: number; zero: boolean }[];
  months: { key: string; y: number; name: string | undefined; active: boolean; strong: boolean; edge: boolean }[];
  latePath: string;
  earlyPath: string;
  plotL: number;
  plotR: number;
  plotT: number;
  plotB: number;
  markerY: number;
  markerX: number;
};

/** One layout for both SVG drawings. `monthNames` is already in the reader's language. */
export function layoutEotGraph(
  eccentricity: number,
  tilt: number,
  dayOfYear: number,
  daysPerYear: number,
  monthNames: readonly string[],
): EotGraphModel {
  const curve = withZeroCrossings(yearCurve(eccentricity, tilt));
  const peak = Math.max(4, curve.reduce((a, p) => Math.max(a, Math.abs(p.minutes)), 0));
  const ticks = durationTicks(peak);
  const axisMin = ticks[0]?.minutes ?? -peak;
  const axisMax = ticks[ticks.length - 1]?.minutes ?? peak;
  const plotL = PAD.l;
  const plotR = EOT_W - PAD.r;
  const plotT = PAD.t;
  const plotB = EOT_H - PAD.b;
  const x = (min: number) => plotL + ((min - axisMin) / (axisMax - axisMin)) * (plotR - plotL);
  const y = (frac: number) => plotT + frac * (plotB - plotT);

  const markerT = euclideanModulo(dayOfYear / daysPerYear, 1);
  const markerMin = (equationOfTime(meanAnomalyAt(dayOfYear / daysPerYear), eccentricity, tilt, PERIHELION - VERNAL) * 24 * 60) / PI2;
  const monthStarts = solarMonthStarts(eccentricity);
  const day = markerT * 365;
  let currentMonth = 0;
  for (let i = 0; i < 12; i += 1) if (day >= monthStarts[i]!) currentMonth = i;

  return {
    ticks: ticks.map((tick) => ({ sec: tick.sec, x: x(tick.minutes), zero: tick.sec === 0 })),
    months: [...monthStarts, 365].map((start, i) => ({
      key: `m-${i}`,
      y: y(start / 365),
      name: monthNames[i % 12],
      active: i < 12 && i === currentMonth,
      strong: i === 12,
      edge: i === 0 || i === 12,
    })),
    latePath: areaPath(curve, x, y, "late"),
    earlyPath: areaPath(curve, x, y, "early"),
    plotL,
    plotR,
    plotT,
    plotB,
    markerY: y(markerT),
    markerX: x(markerMin),
  };
}

export function formatDuration(sec: number, num: (v: number | string) => string): string {
  if (Math.abs(sec) < 30) return `${num(0)}s`;
  const sign = sec < 0 ? "−" : "";
  const n = Math.abs(sec);
  const hours = Math.floor(n / 3600);
  const minutes = Math.floor((n - hours * 3600) / 60);
  if (hours !== 0) return `${sign}${num(hours)}h${minutes ? `${num(minutes)}m` : ""}`;
  return `${sign}${num(minutes)}m`;
}
