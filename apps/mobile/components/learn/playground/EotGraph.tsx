/**
 * The equation of time, drawn the way a sundial would plot it.
 *
 * Year runs **down** the page (बैशाख to बैशाख) and the offset runs across
 * — late to the left, early to the right. Two fills, not a line: the red lobe
 * is when a sundial lags a clock, the olive lobe when it leads. Zero the
 * eccentricity in the playground and one wave survives; zero the tilt and the
 * other does.
 *
 * A straight port of the web app's `EotGraph`, drawn with `react-native-svg`
 * instead of DOM SVG. Sampled from मेष सङ्क्रान्ति so the month ticks are
 * बिक्रम months, not Gregorian ones.
 */

import { useMemo } from "react";
import { View } from "react-native";
import Svg, { Circle, G, Line, Path, Text as SvgText } from "react-native-svg";

import { Text } from "@/components/ui/Text";
import { useLocale } from "@/lib/i18n";
import { BS_MONTH_NAMES, BS_MONTHS_NE } from "@vedic-patro/domain/bs-calendar";
import { toNepaliDigits } from "@vedic-patro/domain/panchanga-format";
import { nepaliTextStyle } from "@/lib/nepali-text";
import {
  eotCurve,
  equationOfTime,
  euclideanModulo,
  meanAnomalyAt,
  solarMonthStarts,
  PERIHELION,
  VERNAL,
} from "@vedic-patro/domain/sky3d/day-mechanics";
import { type Pt, withZeroCrossings, formatDuration } from "@vedic-patro/domain/learn/eot-graph";

import { illustration, neutral, wheel, withAlpha } from "@vedic-patro/design-tokens";
const W = 336;
const H = 400;
const PAD = { l: 54, r: 10, t: 8, b: 28 };

const PI2 = Math.PI * 2;
const NOW = illustration.sky53;
const GRID = illustration.sky29;
const LATE = "hsla(3, 80%, 55%, 0.5)";
const EARLY = "hsla(60, 100%, 43%, 0.5)";
const INK = wheel.ink;

function eotYearCurve(e: number, tilt: number): Pt[] {
  return eotCurve(e, tilt).map((p) => ({ t: p.day / 365, minutes: p.minutes }));
}

function areaPath(
  pts: Pt[],
  x: (min: number) => number,
  y: (t: number) => number,
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
  const { t, lang } = useLocale();
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
  const y = (t: number) => plotT + t * (plotB - plotT);

  const latePath = useMemo(() => areaPath(curve, x, y, "late"), [curve, axisMin, axisMax]);
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
    <View className="w-full">
      <View className="mb-1.5 flex-row flex-wrap items-center justify-center gap-x-3 gap-y-1">
        {legend.map((item) => (
          <View key={item.label} className="flex-row items-center gap-1.5">
            <View
              className="rounded-md"
              style={{
                width: 10,
                height: 10,
                backgroundColor: item.color,
              }}
            />
            <Text
              className="text-caption"
              style={[nepaliTextStyle(10), { color: withAlpha(illustration.sky91b, 0.8) }]}
            >
              {item.label}
            </Text>
          </View>
        ))}
      </View>
      <View style={{ width: "100%", aspectRatio: W / H }}>
        <Svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          height="100%"
          accessibilityRole="image"
          accessibilityLabel={t("learn.study.eot.aria")}
        >
          {ticks.map((tick) => {
            const px = x(tick.minutes);
            const isZero = tick.sec === 0;
            return (
              <G key={tick.sec}>
                <Line
                  x1={px}
                  x2={px}
                  y1={plotT}
                  y2={plotB}
                  stroke={GRID}
                  strokeOpacity={isZero ? 0.85 : 0.45}
                  strokeWidth={isZero ? 1 : 0.6}
                />
                <SvgText
                  x={px}
                  y={H - 8}
                  textAnchor="middle"
                  fontSize={15}
                  fill={INK}
                  fillOpacity={0.55}
                >
                  {formatDuration(tick.sec, num)}
                </SvgText>
              </G>
            );
          })}

          {monthTicks.map((day, i) => {
            const t = day / 365;
            const py = y(t);
            const name = monthNames[i % 12];
            const active = i < 12 && i === currentMonth;
            return (
              <G key={`m-${i}`}>
                <Line
                  x1={plotL}
                  x2={plotR}
                  y1={py}
                  y2={py}
                  stroke={GRID}
                  strokeOpacity={i === 0 || i === 12 ? 0.7 : 0.45}
                  strokeWidth={i === 12 ? 1 : 0.6}
                />
                <SvgText
                  x={plotL - 6}
                  y={py + 3}
                  textAnchor="end"
                  fontSize={15}
                  fill={INK}
                  fillOpacity={active ? 0.95 : 0.5}
                  fontWeight={active ? "700" : "400"}
                >
                  {name}
                </SvgText>
              </G>
            );
          })}

          <Path d={latePath} fill={LATE} />
          <Path d={earlyPath} fill={EARLY} />

          <Line
            x1={plotL}
            x2={plotR}
            y1={y(markerT)}
            y2={y(markerT)}
            stroke={withAlpha(neutral.white, 0.4)}
            strokeWidth={1}
          />
          <Circle cx={x(markerMin)} cy={y(markerT)} r={5} fill={NOW} />
        </Svg>
      </View>
      <Text
        className="text-caption mt-1.5"
        style={[nepaliTextStyle(11), { color: withAlpha(neutral.white, 0.5) }]}
      >
        {t("learn.study.eot.caption")}
      </Text>
    </View>
  );
}

export default EotGraph;
