/**
 * The equation of time, drawn the way a sundial would plot it.
 *
 * Year runs **down** the page (बैशाख to बैशाख) and the offset runs across
 * — late to the left, early to the right. Two fills, not a line: the red lobe
 * is when a sundial lags a clock, the olive lobe when it leads. Zero the
 * eccentricity in the playground and one wave survives; zero the tilt and the
 * other does.
 *
 * Sampled from मेष सङ्क्रान्ति, because a बिक्रम month is 30° of the Sun's
 * travel rather than a fixed run of days — their unevenness is the same
 * eccentricity the curve is plotting.
 */

import { useMemo } from "react";

import { useTranslation } from "react-i18next";

import { useLocale } from "@/i18n/locale";
import { toNepaliDigits } from "@/lib/panchanga-format";
import { BS_MONTH_NAMES, BS_MONTHS_NE } from "@/lib/bs-calendar";
import {
  eotCurve,
  equationOfTime,
  euclideanModulo,
  meanAnomalyAt,
  solarMonthStarts,
  PERIHELION,
  VERNAL,
} from "@/lib/sky3d/day-mechanics";

const W = 336;
const H = 400;
const PAD = { l: 54, r: 10, t: 8, b: 28 };

const PI2 = Math.PI * 2;
const NOW = "#2888e4";
const GRID = "#1a4a7c";
const LATE = "hsla(3, 80%, 55%, 0.5)";
const EARLY = "hsla(60, 100%, 43%, 0.5)";

type Pt = { t: number; minutes: number };

function eotYearCurve(e: number, tilt: number): Pt[] {
  return eotCurve(e, tilt).map((p) => ({ t: p.day / 365, minutes: p.minutes }));
}

/** Insert the exact zero-crossing so the late/early fills meet the axis cleanly. */
function withZeroCrossings(pts: Pt[]): Pt[] {
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

function areaPath(
  pts: Pt[],
  x: (min: number) => number,
  y: (frac: number) => number,
  side: "late" | "early",
): string {
  if (pts.length === 0) return "";
  const clamp = (m: number) => (side === "late" ? Math.min(m, 0) : Math.max(m, 0));
  const x0 = x(0);
  let d = `M ${x0.toFixed(1)} ${y(pts[0]!.t).toFixed(1)}`;
  for (const p of pts) {
    d += ` L ${x(clamp(p.minutes)).toFixed(1)} ${y(p.t).toFixed(1)}`;
  }
  d += ` L ${x0.toFixed(1)} ${y(pts[pts.length - 1]!.t).toFixed(1)} Z`;
  return d;
}

/** Chart.js-style duration ticks, in minutes, labelled like `-16m` / `0s`. */
function durationTicks(peakMin: number): { minutes: number; sec: number }[] {
  const peakSec = peakMin * 60;
  const stepSec = peakSec > 480 ? 200 : peakSec > 240 ? 100 : 60;
  const axisSec = Math.max(stepSec * Math.ceil(peakSec / stepSec), stepSec);
  const out: { minutes: number; sec: number }[] = [];
  for (let s = -axisSec; s <= axisSec + 1e-6; s += stepSec) {
    out.push({ minutes: s / 60, sec: s });
  }
  return out;
}

function formatDuration(sec: number, num: (v: number | string) => string): string {
  if (Math.abs(sec) < 30) return `${num(0)}s`;
  const sign = sec < 0 ? "−" : "";
  const n = Math.abs(sec);
  const hours = Math.floor(n / 3600);
  const minutes = Math.floor((n - hours * 3600) / 60);
  if (hours !== 0) return `${sign}${num(hours)}h${minutes ? `${num(minutes)}m` : ""}`;
  return `${sign}${num(minutes)}m`;
}

export interface EotGraphProps {
  eccentricity: number;
  /** Axial tilt in radians. */
  tilt: number;
  /** Day of the year currently on screen, for the marker. */
  dayOfYear: number;
  /** Total days in the sim's year, so the marker maps onto the 365-day curve. */
  daysPerYear: number;
}

export function EotGraph({ eccentricity, tilt, dayOfYear, daysPerYear }: EotGraphProps) {
  const { t } = useTranslation();
  const { lang } = useLocale();
  const ne = lang !== "en";
  const num = (v: number | string) => (ne ? toNepaliDigits(String(v)) : String(v));

  const curve = useMemo(
    () => withZeroCrossings(eotYearCurve(eccentricity, tilt)),
    [eccentricity, tilt],
  );

  const peak = useMemo(() => {
    const m = curve.reduce((a, p) => Math.max(a, Math.abs(p.minutes)), 0);
    return Math.max(4, m);
  }, [curve]);

  const ticks = useMemo(() => durationTicks(peak), [peak]);
  const axisMin = ticks[0]?.minutes ?? -peak;
  const axisMax = ticks[ticks.length - 1]?.minutes ?? peak;

  const plotL = PAD.l;
  const plotR = W - PAD.r;
  const plotT = PAD.t;
  const plotB = H - PAD.b;
  const x = (min: number) => plotL + ((min - axisMin) / (axisMax - axisMin)) * (plotR - plotL);
  const y = (frac: number) => plotT + frac * (plotB - plotT);

  // `x`/`y` are plain closures rebuilt every render; `axisMin`/`axisMax` (and the
  // plot-box constants they close over) are the values that actually change them,
  // so those are listed instead of the functions themselves.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const latePath = useMemo(() => areaPath(curve, x, y, "late"), [curve, axisMin, axisMax]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const earlyPath = useMemo(() => areaPath(curve, x, y, "early"), [curve, axisMin, axisMax]);

  const markerM = meanAnomalyAt(dayOfYear / daysPerYear);
  const markerT = euclideanModulo(dayOfYear / daysPerYear, 1);
  const markerMin =
    (equationOfTime(markerM, eccentricity, tilt, PERIHELION - VERNAL) * 24 * 60) / PI2;

  const monthStarts = useMemo(() => solarMonthStarts(eccentricity), [eccentricity]);
  const monthTicks = useMemo(() => [...monthStarts, 365], [monthStarts]);
  const monthNames = ne ? BS_MONTHS_NE : ([...BS_MONTH_NAMES] as string[]);
  const currentMonth = useMemo(() => {
    const day = markerT * 365;
    let idx = 0;
    for (let i = 0; i < 12; i += 1) if (day >= monthStarts[i]!) idx = i;
    return idx;
  }, [markerT, monthStarts]);

  const legend = [
    { color: NOW, label: t("panchanga.day_cycle.now") },
    { color: LATE, label: t("learn.study.eot.sundial_late") },
    { color: EARLY, label: t("learn.study.eot.sundial_early") },
  ];

  return (
    <figure className="m-0 w-full">
      <ul className="mb-1.5 flex list-none flex-wrap items-center justify-center gap-x-3 gap-y-1 p-0 text-[10px] text-white/80">
        {legend.map((item) => (
          <li key={item.label} className="inline-flex items-center gap-1.5">
            <span className="size-2.5 shrink-0 rounded-[2px]" style={{ background: item.color }} />
            {item.label}
          </li>
        ))}
      </ul>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full"
        role="img"
        aria-label={t("learn.study.eot.aria")}
      >
        {/* vertical grid + minute labels */}
        {ticks.map((tick) => {
          const px = x(tick.minutes);
          const isZero = tick.sec === 0;
          return (
            <g key={tick.sec}>
              <line
                x1={px}
                x2={px}
                y1={plotT}
                y2={plotB}
                stroke={GRID}
                strokeOpacity={isZero ? 0.85 : 0.45}
                strokeWidth={isZero ? 1 : 0.6}
              />
              <text
                x={px}
                y={H - 8}
                textAnchor="middle"
                className="fill-current font-num text-[8px] tabular-nums opacity-55"
              >
                {formatDuration(tick.sec, num)}
              </text>
            </g>
          );
        })}

        {/* month grid + labels */}
        {monthTicks.map((day, i) => {
          const py = y(day / 365);
          const name = monthNames[i % 12];
          const active = i < 12 && i === currentMonth;
          return (
            <g key={`m-${i}`}>
              <line
                x1={plotL}
                x2={plotR}
                y1={py}
                y2={py}
                stroke={GRID}
                strokeOpacity={i === 0 || i === 12 ? 0.7 : 0.45}
                strokeWidth={i === 12 ? 1 : 0.6}
              />
              <text
                x={plotL - 6}
                y={py + 3}
                textAnchor="end"
                className="fill-current text-[8px]"
                style={{ opacity: active ? 0.95 : 0.5 }}
                fontWeight={active ? 700 : 400}
              >
                {name}
              </text>
            </g>
          );
        })}

        <path d={latePath} fill={LATE} />
        <path d={earlyPath} fill={EARLY} />

        {/* where the sim is now */}
        <line
          x1={plotL}
          x2={plotR}
          y1={y(markerT)}
          y2={y(markerT)}
          stroke="rgba(255,255,255,0.4)"
          strokeWidth={1}
        />
        <circle cx={x(markerMin)} cy={y(markerT)} r={5} fill={NOW} />
      </svg>
      <figcaption className="mt-1.5 text-[11px] leading-snug text-white/45">
        {t("learn.study.eot.caption")}
      </figcaption>
    </figure>
  );
}

export default EotGraph;
