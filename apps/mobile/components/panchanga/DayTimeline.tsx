import { choghadiyaName } from "@vedic-patro/domain/choghadiya-display";
import { formatRashiDisplay } from "@vedic-patro/domain/rashi-i18n";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@vedic-patro/domain/utils";
import { patroSecBand } from "@/lib/patro-classes";
import { panchangaPageClasses } from "@vedic-patro/design-tokens/classes/panchanga-page-classes";
import { ScrollView, View, type LayoutChangeEvent } from "react-native"
import { Text } from "@/components/ui/Text"
import Svg, { G, Line, Path, Rect, Text as SvgText } from "react-native-svg";
import type { CivilTimeline, PanchangaDay } from "@/lib/api";
import type { DayCycleMode } from "@/components/panchanga/DayCycleToggle";
import { Card } from "@/components/ui/Card";
import { SkeletonPulse } from "@/components/ui/SkeletonPulse";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import { SunTimelineMarker } from "@/components/panchanga/SunriseSunsetIcon";
import { GrahaStatusBadges } from "@/components/graha/GrahaStatusBadges";
import type { GrahaKey } from "@vedic-patro/domain/graha-details";
import { useLocale } from "@/lib/i18n";
import { PAGE_HORIZONTAL_PADDING } from "@/lib/mobile-nav";
import { BREAKPOINTS, useBreakpoint } from "@/lib/responsive";
import {
  formatDegreeInRashi,
  getPlanetRows,
  getPlanetsAnchorLabel,
  getSunriseLagnaRow,
} from "@vedic-patro/domain/panchanga-format";
import {
  buildCivilTimelineData,
  buildDayTimelineData,
  dualTimeAtGhati,
  needleGhatiOnVedicChart,
  type TimelineRowData,
} from "@vedic-patro/domain/day-timeline-data";
import { minutesSinceMidnightInTimezone, resolveTimeZone } from "@vedic-patro/domain/zoned-time";
import { nepaliSvgTextCenter, nepaliTextStyle } from "@/lib/nepali-text";
import { NOTO_DEVANAGARI_CHART, NOTO_DEVANAGARI_CHART_SM } from "@/lib/fonts";
import { useTheme } from "@/lib/theme-context";

import { brand, illustration, neutral, withAlpha } from "@vedic-patro/design-tokens";
import { tFor } from "@vedic-patro/i18n/runtime";
const W = 1000;
/**
 * The width the scrolling chart is drawn at — its own coordinate width, so
 * the SVG renders 1:1.
 *
 * This used to be 767, borrowed from the web's `min-w-[768px]`. But the
 * viewBox is {@link W} = 1000 units wide, so drawing it into 767 px scaled
 * everything by 0.767 — and every `fontSize` in here is in *viewBox* units.
 * A band label asking for 10 landed on screen at 7.7 px, and the 9s at 6.9,
 * which is below anything a person can read Devanagari at. Web gets away
 * with it because 768 px there is a desktop column; on a phone the chart is
 * a horizontal scroll either way.
 *
 * Drawing at 1:1 made every number in here mean screen pixels; the 1.25
 * beyond that is a straight enlargement on top, because 1:1 still left the
 * band labels at 9-10 px. Scaling the whole viewBox rather than reaching in
 * and raising each `fontSize` is what keeps it safe: the cells grow with the
 * text, so a wider word cannot overflow a band it used to fit. It costs
 * horizontal scrolling, which this chart has either way.
 */
const MIN_CHART_WIDTH = Math.round(W * 1.25);
const X0 = 70;
const X1 = 994;
const RULER_H = 58;
const MOON_BAND_H = 20;
const SUN_H = 28;
const MOON_EMOJI_Y = RULER_H + 5;
const MOON_TIME_Y = RULER_H + 23;
const T0 = RULER_H + MOON_BAND_H + SUN_H + 6;
const TRACK = 58;
const BAND = 34;
const SUNLINE_Y = RULER_H + MOON_BAND_H + 8;
const MARKER_TIME_Y = SUNLINE_Y + 13;
const SUN_R = 6;
const GHATI_TICKS = Array.from({ length: 16 }, (_, i) => i * 4);

const FONT = NOTO_DEVANAGARI_CHART;
const FONT_SM = NOTO_DEVANAGARI_CHART_SM;

function isGrahaKey(key: string): key is GrahaKey {
  return (
    key === "sun" ||
    key === "moon" ||
    key === "mars" ||
    key === "mercury" ||
    key === "jupiter" ||
    key === "venus" ||
    key === "saturn" ||
    key === "rahu" ||
    key === "ketu"
  );
}
const SECTION_H_PAD = 16;
const PERIOD_CARD_GAP = 8;
const PLANET_CARD_GAP = 6;

function periodGridCols(width: number): number {
  if (width >= BREAKPOINTS.lg) return 5;
  if (width >= BREAKPOINTS.md) return 4;
  if (width >= 420) return 3;
  return 2;
}

function planetGridCols(width: number): number {
  if (width >= BREAKPOINTS.md) return 4;
  if (width >= 380) return 3;
  return 2;
}

function gridItemWidth(containerWidth: number, cols: number, gap: number, horizontalPad = SECTION_H_PAD): number {
  const inner = Math.max(0, containerWidth - horizontalPad * 2);
  return (inner - gap * (cols - 1)) / cols;
}

const TRACK_CLS: Record<string, string> = {
  तिथि: "tithi",
  नक्षत्र: "nak",
  योग: "yoga",
  करण: "karana",
  चौघडिया: "cho",
  होरा: "hora",
  लग्न: "lagna",
  अशुभ: "ashubha",
  शुभ: "shubha",
};

const C_BASE = {
  sun: illustration.orange53b,
  danger: illustration.red60,
  arrow: illustration.teal55,
  tithi: [withAlpha(illustration.amber78, 0.25), withAlpha(illustration.amber78, 0.14)],
  nak: [withAlpha(illustration.teal36, 0.25), withAlpha(illustration.teal36, 0.14)],
  yoga: [withAlpha(illustration.orange36, 0.25), withAlpha(illustration.orange36, 0.14)],
  karana: [withAlpha(illustration.sky31, 0.25), withAlpha(illustration.sky31, 0.14)],
  lagnaActive: withAlpha(illustration.teal36, 0.28),
  choGood: withAlpha(illustration.green40, 0.13),
  choBad: withAlpha(illustration.red57, 0.13),
  ashubha: withAlpha(illustration.red57, 0.22),
  shubha: withAlpha(illustration.green40, 0.22),
} as const;

function useTimelineColors() {
  const { colors, isDark } = useTheme();
  return {
    ...C_BASE,
    fg: colors.foreground,
    muted: colors.mutedForeground,
    axis: isDark ? withAlpha(neutral.white, 0.45) : withAlpha(brand.ink, 0.45),
    tick: isDark ? withAlpha(neutral.white, 0.4) : withAlpha(brand.ink, 0.35),
    night: isDark ? withAlpha(neutral.white, 0.06) : withAlpha(brand.blue, 0.06),
    sunLine: colors.border,
    moonLine: isDark ? withAlpha(neutral.white, 0.25) : withAlpha(brand.ink, 0.2),
    hair: withAlpha(illustration.orange53b, 0.55),
    grid: isDark ? withAlpha(neutral.white, 0.12) : withAlpha(brand.ink, 0.08),
    now: colors.danger,
    segStroke: isDark ? withAlpha(neutral.white, 0.1) : withAlpha(brand.ink, 0.08),
    lagna: [isDark ? withAlpha(neutral.white, 0.07) : withAlpha(brand.ink, 0.06), isDark ? withAlpha(neutral.white, 0.03) : withAlpha(brand.ink, 0.03)],
  };
}

interface ChartSegment {
  ne: string;
  en: string;
  fromG: number;
  toG: number;
  bad?: boolean;
  cut?: boolean;
  transitionLocal?: string;
  lane?: number;
  laneCount?: number;
}

function gx(g: number) {
  return X0 + (Math.max(0, Math.min(60, g)) / 60) * (X1 - X0);
}

function clampX(x: number, pad: number) {
  return Math.max(X0 + pad, Math.min(X1 - pad, x));
}

function assignLanes(segs: ChartSegment[]): ChartSegment[] {
  const laneEnds: number[] = [];
  for (const seg of segs) {
    let lane = laneEnds.findIndex((end) => seg.fromG >= end - 0.001);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(seg.toG);
    } else {
      laneEnds[lane] = seg.toG;
    }
    seg.lane = lane;
  }
  const laneCount = Math.max(1, laneEnds.length);
  for (const seg of segs) seg.laneCount = laneCount;
  return segs;
}

function segmentsFromRow(row: TimelineRowData): ChartSegment[] {
  let prev = 0;
  return row.items.map((it) => {
    const toG = it.endG != null ? Math.min(it.endG, 60) : 60;
    const seg: ChartSegment = {
      ne: it.name,
      en: it.nameEn ?? it.name,
      fromG: prev,
      toG,
      bad: it.bad,
      cut: it.endG != null && it.endG < 60,
      transitionLocal: it.transitionLocal,
    };
    prev = toG;
    return seg;
  });
}

function segFill(
  C: ReturnType<typeof useTimelineColors>,
  cls: string,
  alt?: boolean,
  active?: boolean,
  bad?: boolean,
): string {
  if (cls === "cho" || cls === "hora") return bad ? C.choBad : C.choGood;
  if (cls === "ashubha") return C.ashubha;
  if (cls === "shubha") return C.shubha;
  if (cls === "lagna" && active) return C.lagnaActive;
  const palette = C[cls as keyof typeof C_BASE];
  if (Array.isArray(palette)) return alt ? palette[1]! : palette[0]!;
  if (cls === "lagna") return alt ? C.lagna[1]! : C.lagna[0]!;
  return C.tithi[0];
}

type Props = {
  p?: PanchangaDay;
  loading?: boolean;
  dateAd: string;
  isToday?: boolean;
  timezone?: string;
  needleClock?: string;
  showNeedle?: boolean;
  /** Day boundary: "Day-Night" = sunrise→sunrise (default), "Calendar Day" =
   *  midnight→midnight. The toggle in the page header was wired to state that
   *  nothing downstream read, so switching it did nothing on native — the
   *  whole civil branch existed only in the `.web` timeline. */
  mode?: DayCycleMode;
  /** Civil (midnight→midnight) timeline — only used in Calendar Day mode. */
  civil?: CivilTimeline;
  civilLoading?: boolean;
};

function minutesOnVedicChart(
  queryInstantLocal: string | undefined,
  anchorDateAd: string,
  needleClock: string | undefined,
): number | null {
  if (needleClock) {
    const [hh, mm] = needleClock.split(":").map(Number);
    if (!Number.isNaN(hh) && !Number.isNaN(mm)) return hh * 60 + mm;
  }
  if (queryInstantLocal) {
    const [datePart, timePart] = queryInstantLocal.split(" ");
    if (!timePart) return null;
    const [hh, mm] = timePart.split(":").map(Number);
    if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
    const mins = hh * 60 + mm;
    if (datePart === anchorDateAd) return mins;
    return 24 * 60 + mins;
  }
  return null;
}

function SunHalfIcon({
  x,
  y,
  variant,
  C,
}: {
  x: number;
  y: number;
  variant: "rise" | "set";
  C: ReturnType<typeof useTimelineColors>;
}) {
  return <SunTimelineMarker x={x} y={y} variant={variant} fill={C.sun} width={SUN_R * 2 + 10} />;
}

function EventMarker({
  g,
  sunriseMin,
  kind,
  anchor,
  digits,
  C,
}: {
  g: number;
  sunriseMin: number;
  kind: "sunrise" | "sunset" | "moonrise" | "moonset" | "next-sunrise";
  anchor: "start" | "middle" | "end";
  digits: (v: string | number) => string;
  C: ReturnType<typeof useTimelineColors>;
}) {
  const { clock } = dualTimeAtGhati(g, sunriseMin);
  const x = gx(g);
  const isSun = kind === "sunrise" || kind === "sunset" || kind === "next-sunrise";
  const moonEmoji = kind === "moonset" ? "🌘" : "🌒";

  return (
    <G>
      {isSun ? (
        <SunHalfIcon x={x} y={SUNLINE_Y} variant={kind === "sunset" ? "set" : "rise"} C={C} />
      ) : (
        <SvgText x={x} y={MOON_EMOJI_Y} textAnchor="middle" fontSize={15}>
          {moonEmoji}
        </SvgText>
      )}
      <SvgText
        x={x}
        y={isSun ? MARKER_TIME_Y : MOON_TIME_Y}
        textAnchor={anchor}
        fill={isSun ? C.sun : C.muted}
        fontSize={15}
        fontFamily={FONT}
      >
        {digits(clock)}
      </SvgText>
    </G>
  );
}

function TransitionArrow({ x2, y, C }: { x2: number; y: number; C: ReturnType<typeof useTimelineColors> }) {
  const rowY = y + BAND;
  return (
    <G>
      <Line x1={x2 - 14} y1={rowY} x2={x2 - 5} y2={rowY} stroke={C.arrow} strokeWidth={1.6} />
      <Path d={`M ${x2 - 6} ${rowY - 3.6} L ${x2 - 1.5} ${rowY} L ${x2 - 6} ${rowY + 3.6} z`} fill={C.arrow} />
      <Line x1={x2 + 14} y1={rowY} x2={x2 + 5} y2={rowY} stroke={C.arrow} strokeWidth={1.6} />
      <Path d={`M ${x2 + 6} ${rowY - 3.6} L ${x2 + 1.5} ${rowY} L ${x2 + 6} ${rowY + 3.6} z`} fill={C.arrow} />
      <Line x1={x2} y1={rowY - 5} x2={x2} y2={rowY + 5} stroke={C.arrow} strokeWidth={1.3} />
    </G>
  );
}

export function DayTimeline({
  p,
  loading = false,
  dateAd,
  isToday = false,
  timezone,
  needleClock,
  showNeedle = true,
  mode = "Day-Night",
  civil,
  civilLoading = false,
}: Props) {
  const { t, pick, digits, lang } = useLocale();
  const { width: windowWidth } = useBreakpoint();
  const [containerWidth, setContainerWidth] = useState(0);
  const C = useTimelineColors();
  const isCivil = mode === "Calendar Day";
  const data = useMemo(() => {
    if (isCivil) return civil ? buildCivilTimelineData(civil, p) : null;
    return p ? buildDayTimelineData(p) : null;
  }, [isCivil, civil, p, dateAd]);
  const planets = useMemo(() => {
    if (!p) return [];
    const rows = getPlanetRows(p);
    const lagna = getSunriseLagnaRow(p);
    return lagna ? [lagna, ...rows] : rows;
  }, [p]);
  const timeZone = resolveTimeZone(p?.location?.timezone, timezone);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!isToday) return;
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, [isToday]);

  const busy = loading || (isCivil ? civilLoading || !civil : !p) || !data;

  if (busy) {
    return (
      <Card className="w-full overflow-hidden p-0">
        <View className={cn("flex-row", patroSecBand)}>
          <Text className={cn(panchangaPageClasses.dayCycle.bandTitle, "text-foreground")}>{t("panchanga.day_cycle.title")}</Text>
          <Text className={cn(panchangaPageClasses.dayCycle.bandSubtitle, "text-muted-foreground")}>
            {isCivil
              ? t("ui.panchanga.full_panchanga_timeline_midnight_to_midnight")
              : t("ui.panchanga.full_panchanga_timeline_sunrise_to_sunrise")}
          </Text>
        </View>
        <SkeletonPulse className="mx-3 my-3 h-[320px] rounded-lg bg-muted/40" />
      </Card>
    );
  }

  const tracks = data.rows
    .filter((row) => row.kind !== "graha")
    .map((row) => {
      const cls = TRACK_CLS[row.label] ?? "tithi";
      const segs: ChartSegment[] =
        row.kind === "choghadiya"
          ? data.choghadiya.map((c) => ({
              ne: c.name,
              en: choghadiyaName(c.name, "en"),
              fromG: c.startG,
              toG: c.endG,
              bad: c.bad,
            }))
          : row.kind === "hora"
            ? data.hora.map((h) => ({
                ne: h.name,
                en: h.nameEn,
                fromG: h.startG,
                toG: h.endG,
                bad: h.bad,
              }))
            : row.kind === "ashubha"
              ? assignLanes(
                  data.ashubha.map((a) => ({
                    ne: a.name,
                    en: a.nameEn,
                    fromG: a.startG,
                    toG: a.endG,
                    bad: true,
                    detailNe: a.detailNe,
                    detailEn: a.detailEn,
                  })),
                )
              : row.kind === "shubha"
                ? assignLanes(
                    data.shubha.map((s) => ({
                      ne: s.name,
                      en: s.nameEn,
                      fromG: s.startG,
                      toG: s.endG,
                      detailNe: s.name,
                      detailEn: s.nameEn,
                    })),
                  )
              : segmentsFromRow(row);
      return { key: row.label, ne: row.label, en: row.en, cls, segs };
    });

  const H = T0 + tracks.length * TRACK + 6;
  /** Web: `w-full min-w-[768px]` — at least 767px, grow to fill the card column. */
  const measuredWidth = containerWidth || windowWidth - PAGE_HORIZONTAL_PADDING * 2;
  const chartWidth = Math.max(MIN_CHART_WIDTH, measuredWidth);
  const scrollChart = measuredWidth < MIN_CHART_WIDTH;
  const periodCols = periodGridCols(measuredWidth);
  const periodCardW = gridItemWidth(measuredWidth, periodCols, PERIOD_CARD_GAP);
  const planetCols = planetGridCols(measuredWidth);
  const planetCardW = gridItemWidth(measuredWidth, planetCols, PLANET_CARD_GAP);
  const tLabel = (g: number) => dualTimeAtGhati(g, data.sunriseMin).clock;

  let nowG: number | null = null;
  let nowLabel = t("panchanga.day_cycle.now");
  const anchorAd = p?.panchanga_date_ad ?? p?.date_ad ?? dateAd;
  const chartMins = minutesOnVedicChart(p?.query_instant_local, anchorAd ?? "", needleClock);

  if (showNeedle && needleClock && chartMins != null) {
    nowG = needleGhatiOnVedicChart(chartMins, data.sunriseMin);
    if (nowG != null) nowLabel = pick(tFor(undefined, "ui.panchanga.x_c068f043", { v0: digits(needleClock) }), digits(needleClock));
  } else if (showNeedle && isToday) {
    nowG = needleGhatiOnVedicChart(minutesSinceMidnightInTimezone(now, timeZone), data.sunriseMin);
  } else if (showNeedle && chartMins != null) {
    nowG = needleGhatiOnVedicChart(chartMins, data.sunriseMin);
    if (nowG != null) nowLabel = t("panchanga.day_cycle.chosen_time");
  }

  const trackY = (i: number) => T0 + i * TRACK;
  /* Midnight→midnight puts the night at both ends and sunrise/sunset inside
     the frame, instead of a single night band running off the right. */
  const nightBands = (data.nightBands ?? [[data.dayG, 60]]) as Array<[number, number]>;
  const sunriseG = isCivil ? (data.sunriseG ?? 0) : 0;
  const sunsetG = isCivil ? (data.sunsetG ?? data.dayG) : data.dayG;
  const hairlineGs = isCivil ? [sunriseG, sunsetG] : [0, data.dayG, 60];

  const chartContent = (
    <>
      {nightBands.map(([a, b], i) => (
        <Rect key={`night-${i}`} x={gx(a)} y={RULER_H - 8} width={Math.max(0, gx(b) - gx(a))} height={H - RULER_H + 2} fill={C.night} />
      ))}

      <SvgText x={X0 - 10} y={isCivil ? 34 : 20} fill={C.muted} fontSize={15} fontFamily={FONT} textAnchor="end">
        {t("panchanga.hour_aria")}
      </SvgText>
      {/* घडी counts from sunrise, so it means nothing on a midnight-anchored
          chart — web drops the row there and so does this. */}
      {!isCivil && (
        <SvgText x={X0 - 10} y={47} fill={C.muted} fontSize={15} fontFamily={FONT} textAnchor="end" opacity={0.75}>
          {t("panchanga.day_cycle.ghati")}
        </SvgText>
      )}
      <Line x1={X0} y1={30} x2={X1} y2={30} stroke={C.axis} strokeWidth={1.2} />

      {data.civilHourTicks.map(({ hour, g }) => (
        <G key={`h-${hour}-${g}`}>
          <Line x1={gx(g)} y1={30} x2={gx(g)} y2={24} stroke={C.tick} strokeWidth={1} />
          <SvgText x={gx(g)} y={18} fill={C.fg} fontSize={15} fontFamily={FONT} textAnchor="middle">
            {digits(hour)}
          </SvgText>
        </G>
      ))}

      {!isCivil && GHATI_TICKS.map((g) => (
        <G key={`g-${g}`}>
          <Line x1={gx(g)} y1={30} x2={gx(g)} y2={36} stroke={C.tick} strokeWidth={1} />
          <SvgText x={gx(g)} y={48} fill={C.muted} fontSize={15} fontFamily={FONT_SM} textAnchor="middle">
            {digits(g)}
          </SvgText>
        </G>
      ))}

      <Line x1={X0} y1={SUNLINE_Y} x2={X1} y2={SUNLINE_Y} stroke={C.sunLine} strokeWidth={1} />
      <Line x1={X0} y1={T0 - 1} x2={X1} y2={T0 - 1} stroke={C.moonLine} strokeWidth={1} strokeDasharray="3,5" opacity={0.7} />

      <EventMarker g={sunriseG} sunriseMin={data.sunriseMin} kind="sunrise" anchor={isCivil ? "middle" : "start"} digits={digits} C={C} />
      <EventMarker g={sunsetG} sunriseMin={data.sunriseMin} kind="sunset" anchor="middle" digits={digits} C={C} />
      {data.moonsetG != null && (
        <EventMarker g={data.moonsetG} sunriseMin={data.sunriseMin} kind="moonset" anchor="middle" digits={digits} C={C} />
      )}
      {data.moonriseG != null && (
        <EventMarker g={data.moonriseG} sunriseMin={data.sunriseMin} kind="moonrise" anchor="middle" digits={digits} C={C} />
      )}
      {!isCivil && (
        <EventMarker g={60} sunriseMin={data.sunriseMin} kind="next-sunrise" anchor="end" digits={digits} C={C} />
      )}

      {hairlineGs.map((g) => (
        <Line key={`hair-${g}`} x1={gx(g)} y1={T0} x2={gx(g)} y2={H - 4} stroke={C.hair} strokeWidth={1} strokeDasharray="2,4" opacity={0.55} />
      ))}

      {tracks.map((tr, ti) => {
        const y = trackY(ti);
        return (
          <G key={tr.key}>
            <SvgText
              x={8}
              y={y + BAND / 2 + 4}
              fill={C.fg}
              fontSize={15}
              fontFamily={FONT}
              fontWeight="700"
              {...nepaliSvgTextCenter}
            >
              {tr.ne}
            </SvgText>
            <Line x1={X0} y1={y + BAND} x2={X1} y2={y + BAND} stroke={C.sunLine} strokeWidth={0.8} opacity={0.35} />

            {tr.segs.map((s, si) => {
              const x = gx(s.fromG);
              const x2 = gx(s.toG);
              const w = x2 - x;
              const isActiveLagna = tr.cls === "lagna" && nowG != null && nowG >= s.fromG && nowG < s.toG;
              const fill = segFill(C, tr.cls, si % 2 === 1 && tr.cls !== "cho" && tr.cls !== "hora", isActiveLagna, s.bad);
              const midX = clampX((x + x2) / 2, 26);
              const narrow = w < 64;
              const segText = pick(s.ne, s.en);
              const [mainName, paksha] = segText.includes(", ")
                ? [segText.split(", ")[0]!, segText.split(", ").slice(1).join(", ")]
                : [segText, ""];
              const laneCount = tr.cls === "ashubha" || tr.cls === "shubha" ? Math.max(1, s.laneCount ?? 1) : 1;
              const laneGap = laneCount > 1 ? 1.5 : 0;
              const laneH = BAND / laneCount;
              const bandY = tr.cls === "ashubha" || tr.cls === "shubha" ? y + (s.lane ?? 0) * laneH : y;
              const bandH = tr.cls === "ashubha" || tr.cls === "shubha" ? laneH - laneGap : BAND;
              const labelY = bandY + bandH / 2 + 4;

              return (
                <G key={si}>
                  <Rect
                    x={x + 1}
                    y={bandY}
                    width={Math.max(0, w - 2)}
                    height={bandH}
                    rx={4}
                    fill={fill}
                    stroke={C.segStroke}
                    strokeWidth={1}
                  />
                  {tr.cls === "cho" || tr.cls === "hora" ? (
                    w > 20 ? (
                      <SvgText
                        x={(x + x2) / 2}
                        y={y + BAND / 2 + 4}
                        fill={s.bad ? C.danger : C.fg}
                        fontSize={15}
                        fontFamily={FONT}
                        textAnchor="middle"
                        {...nepaliSvgTextCenter}
                      >
                        {segText}
                      </SvgText>
                    ) : null
                  ) : tr.cls === "ashubha" || tr.cls === "shubha" ? (
                    w >= 9 ? (
                      <SvgText
                        x={clampX((x + x2) / 2, 8)}
                        y={labelY}
                        fill={tr.cls === "shubha" ? illustration.green40 : C.danger}
                        fontSize={15}
                        fontFamily={FONT}
                        textAnchor="middle"
                        {...nepaliSvgTextCenter}
                      >
                        {digits(si + 1)}
                      </SvgText>
                    ) : null
                  ) : w >= 20 ? (
                    <SvgText
                      x={midX}
                      y={labelY}
                      fill={C.fg}
                      fontSize={narrow ? 9 : 10}
                      fontFamily={FONT}
                      textAnchor="middle"
                      {...nepaliSvgTextCenter}
                    >
                      {/* One string, not two children. `SvgText` anchors every
                          child run at the same x, so a name and its पक्ष
                          handed over separately were both centred on `midX`
                          and drawn on top of each other — "पूर्णिमा" and
                          "· शुक्ल पक्ष" overlapping into an unreadable
                          smear. Joining them first makes it one run. */}
                      {`${mainName}${!narrow && paksha ? ` · ${paksha}` : ""}`}
                    </SvgText>
                  ) : null}
                </G>
              );
            })}
          </G>
        );
      })}

      {data.civilHourTicks.map(({ hour, g }) => (
        <Line key={`grid-${hour}-${g}`} x1={gx(g)} y1={T0} x2={gx(g)} y2={H - 4} stroke={C.grid} strokeWidth={1} strokeDasharray="3,4" />
      ))}

      {tracks.map((tr, ti) => {
        const y = trackY(ti);
        if (tr.cls === "cho" || tr.cls === "hora") return null;
        return (
          <G key={`${tr.key}-cuts`}>
            {tr.segs.map((s, si) => {
              if (!s.cut || s.toG >= 59.97) return null;
              const x2 = gx(s.toG);
              const time =
                tr.cls === "lagna" && s.transitionLocal ? digits(s.transitionLocal) : tLabel(s.toG);
              const prevTime = si > 0 && tr.segs[si - 1]?.cut ? tLabel(tr.segs[si - 1]!.toG) : null;
              if (prevTime === time) return null;
              return (
                <G key={`cut-${si}`}>
                  <TransitionArrow x2={x2} y={y} C={C} />
                  <SvgText x={clampX(x2, 22)} y={y + BAND + 16} fill={C.fg} fontSize={15} fontFamily={FONT_SM} textAnchor="middle" opacity={tr.cls === "lagna" ? 0.9 : 1}>
                    {time}
                  </SvgText>
                </G>
              );
            })}
          </G>
        );
      })}

      {nowG != null && nowG >= 0 && nowG <= 60 && (
        <G>
          <Line x1={gx(nowG)} y1={RULER_H - 6} x2={gx(nowG)} y2={H - 4} stroke={C.now} strokeWidth={1.4} />
          <Rect x={clampX(gx(nowG), 30) - 48} y={RULER_H - 22} width={100} height={17} rx={9} fill={C.now} />
          <SvgText x={clampX(gx(nowG), 30)} y={RULER_H - 10} fill={neutral.white} fontSize={15} fontFamily={FONT} textAnchor="middle">
            {nowLabel} {tLabel(nowG)}
          </SvgText>
        </G>
      )}
    </>
  );

  return (
    <Card
      className="w-full overflow-hidden p-0"
      onLayout={(e: LayoutChangeEvent) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0) setContainerWidth(w);
      }}
    >
      <View className={cn("flex-row", patroSecBand)}>
        <Text className={cn(panchangaPageClasses.dayCycle.bandTitle, "text-foreground")}>{t("panchanga.day_cycle.title")}</Text>
        <Text className={cn(panchangaPageClasses.dayCycle.bandSubtitle, "text-muted-foreground")}>
          {isCivil
              ? t("ui.panchanga.full_panchanga_timeline_midnight_to_midnight")
              : t("ui.panchanga.full_panchanga_timeline_sunrise_to_sunrise")}
        </Text>
        <View className={panchangaPageClasses.dayCycle.bandLegend}>
          <LegendDot color={withAlpha(illustration.green40, 0.55)} label={t("panchanga.day_cycle.good")} />
          <LegendDot color={withAlpha(illustration.red57, 0.55)} label={t("panchanga.day_cycle.bad")} />
          <LegendDot color={withAlpha(neutral.white, 0.2)} label={t("panchanga.day_cycle.night")} />
        </View>
      </View>

      <View className="w-full">
        {scrollChart ? (
          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator
            style={{ width: "100%" }}
            contentContainerStyle={{ width: MIN_CHART_WIDTH, minWidth: MIN_CHART_WIDTH }}
            className="py-3 pl-1 pr-2"
          >
            <Svg
              width={MIN_CHART_WIDTH}
              height={H}
              viewBox={`0 0 ${W} ${H}`}
              preserveAspectRatio="xMinYMid meet"
            >
              {chartContent}
            </Svg>
          </ScrollView>
        ) : (
          <View className="w-full py-3 pl-1 pr-2">
            <Svg
              width={chartWidth}
              height={H}
              viewBox={`0 0 ${W} ${H}`}
              preserveAspectRatio="none"
            >
              {chartContent}
            </Svg>
          </View>
        )}
      </View>

      {data.ashubhaAll.length > 0 && (
        <PeriodCards
          tone="danger"
          title={t("panchanga.day_cycle.inauspicious_periods")}
          cardWidth={periodCardW}
          items={data.ashubhaAll.map((a, i) => ({
            n: digits(i + 1),
            label: pick(a.detailNe, a.detailEn),
            time: `${tLabel(a.startG)} – ${tLabel(a.endG)}`,
          }))}
        />
      )}

      {data.shubha.length > 0 && (
        <PeriodCards
          tone="success"
          title={t("panchanga.day_cycle.auspicious_periods")}
          cardWidth={periodCardW}
          items={data.shubha.map((s, i) => ({
            n: digits(i + 1),
            label: pick(s.name, s.nameEn),
            time: `${tLabel(s.startG)} – ${tLabel(s.endG)}`,
          }))}
        />
      )}

      {p && planets.length > 0 ? (
        <View className="gap-2 border-t border-border px-4 py-3">
          <View className="gap-0.5">
            <Text className="text-sm font-bold text-foreground">{t("panchanga.day_cycle.planets")}</Text>
            <Text className="text-sm text-muted-foreground">{getPlanetsAnchorLabel(p, lang)}</Text>
          </View>
          <View className="flex-row flex-wrap" style={{ gap: PLANET_CARD_GAP }}>
            {planets.map(
              ({
                key: planetKey,
                label,
                labelEn,
                rashiNe,
                rashiEn,
                coords,
                siderealLongitude,
                nakshatraNe,
                nakshatraEn,
                pada,
                nakshatraLordNe,
                nakshatraLordEn,
                nakshatraSubLordNe,
                nakshatraSubLordEn,
                isRetrograde,
                isCombust,
              }) => {
                const labelL = pick(label, labelEn);
                const isLagna = planetKey === "lagna";
                const rashiL = pick(
                  rashiNe ?? "—",
                  rashiEn ?? (rashiNe ? formatRashiDisplay(rashiNe, undefined, "en") : undefined) ?? rashiNe ?? "—",
                );
                const coordText =
                  siderealLongitude != null
                    ? formatDegreeInRashi(siderealLongitude, rashiL)
                    : coords;
                const nakName =
                  nakshatraNe || nakshatraEn
                    ? pick(nakshatraNe ?? nakshatraEn ?? "", nakshatraEn ?? nakshatraNe ?? "")
                    : undefined;
                const nakWithPada =
                  nakName && pada != null ? `${nakName} (${digits(pada)})` : nakName ?? undefined;
                const lordL =
                  nakshatraLordNe || nakshatraLordEn
                    ? pick(
                        nakshatraLordNe ?? nakshatraLordEn ?? "",
                        nakshatraLordEn ?? nakshatraLordNe ?? "",
                      )
                    : undefined;
                const subLordL =
                  nakshatraSubLordNe || nakshatraSubLordEn
                    ? pick(
                        nakshatraSubLordNe ?? nakshatraSubLordEn ?? "",
                        nakshatraSubLordEn ?? nakshatraSubLordNe ?? "",
                      )
                    : undefined;
                const lordText = lordL ? (subLordL ? `${lordL}/${subLordL}` : lordL) : undefined;

                return (
                  <View
                    key={planetKey}
                    className={cn(
                      "gap-0.5 rounded-lg border border-border/60 px-2 py-1.5",
                      isLagna ? "bg-secondary/12" : "bg-foreground/5",
                    )}
                    style={{ width: planetCardW }}
                  >
                    <View className="flex-row flex-wrap items-center gap-x-1.5 gap-y-0.5">
                      <View className="min-w-0 flex-1 flex-row flex-wrap items-center gap-1">
                        {isGrahaKey(planetKey) ? (
                          <GrahaPlanetIcon graha={planetKey} size={18} />
                        ) : null}
                        <Text
                          className="shrink-0 text-sm font-bold leading-tight text-foreground"
                          numberOfLines={1}
                          style={nepaliTextStyle(14)}
                        >
                          {labelL}
                        </Text>
                        <GrahaStatusBadges
                          planetKey={planetKey}
                          isRetrograde={isRetrograde}
                          isCombust={isCombust}
                          size={13}
                        />
                      </View>
                      <Text className="min-w-0 font-mono text-sm leading-tight tabular-nums text-foreground" numberOfLines={1}>
                        {coordText}
                      </Text>
                    </View>
                    {(nakWithPada || lordText) && (
                      <View className="flex-row items-baseline justify-between gap-1.5">
                        <Text className="text-sm min-w-0 flex-1 text-foreground" numberOfLines={1} style={nepaliTextStyle(14)}>
                          {nakWithPada}
                        </Text>
                        {lordText ? (
                          <Text className="text-sm shrink-0 font-semibold text-secondary" numberOfLines={1}>
                            {lordText}
                          </Text>
                        ) : null}
                      </View>
                    )}
                  </View>
                );
              },
            )}
          </View>
        </View>
      ) : null}
    </Card>
  );
}

function PeriodCards({
  tone,
  title,
  items,
  cardWidth,
}: {
  tone: "danger" | "success";
  title: string;
  items: { n: string; label: string; time: string }[];
  cardWidth: number;
}) {
  const accent = tone === "danger" ? illustration.red60 : illustration.green40;
  const borderColor = tone === "danger" ? withAlpha(illustration.red57, 0.28) : withAlpha(illustration.green40, 0.28);
  const backgroundColor = tone === "danger" ? withAlpha(illustration.red57, 0.07) : withAlpha(illustration.green40, 0.07);

  return (
    <View className={panchangaPageClasses.dayCycle.periodGroup}>
      <Text className={panchangaPageClasses.dayCycle.periodTitle} style={{ color: accent }}>
        {title}
      </Text>
      <View className="flex-row flex-wrap" style={{ gap: PERIOD_CARD_GAP }}>
        {items.map((it, i) => (
          <View
            key={`${it.time}-${i}`}
            className={panchangaPageClasses.dayCycle.periodCard}
            style={{ width: cardWidth, borderColor, backgroundColor }}
          >
            <View className={cn("flex-row", panchangaPageClasses.dayCycle.periodHead)}>
              <View
                className={panchangaPageClasses.dayCycle.periodBadge}
                style={{ backgroundColor: accent }}
              >
                <Text className={panchangaPageClasses.dayCycle.periodBadgeText}>{it.n}</Text>
              </View>
              <Text className={cn("flex-1 text-foreground", panchangaPageClasses.dayCycle.periodLabel)} style={nepaliTextStyle(14)}>
                {it.label}
              </Text>
            </View>
            <Text className={cn(panchangaPageClasses.dayCycle.periodTime, "text-foreground")}>{it.time}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View className={cn("flex-row", panchangaPageClasses.dayCycle.legendItem)}>
      <View className={panchangaPageClasses.dayCycle.legendSwatch} style={{ backgroundColor: color }} />
      <Text className={cn(panchangaPageClasses.dayCycle.legendLabel, "text-muted-foreground")}>{label}</Text>
    </View>
  );
}
