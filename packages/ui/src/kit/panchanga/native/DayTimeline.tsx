import { useState, type ReactNode } from "react";
import { Platform, ScrollView, Text, View, useWindowDimensions, type LayoutChangeEvent, type TextStyle, type ViewStyle } from "react-native";
import Svg, { G, Line, Path, Rect, Text as SvgText } from "react-native-svg";
import { useColorScheme } from "nativewind";
import { choghadiyaName } from "@vedic-patro/domain/panchanga/choghadiya-display";
import { horaShortName } from "@vedic-patro/domain/panchanga/hora-short-name";
import { formatRashiDisplay } from "@vedic-patro/domain/panchanga/rashi-i18n";
import { cn } from "@vedic-patro/design-tokens/cn";
import { SUNRISE_ICON_PATH, SUNRISE_ICON_VIEWBOX } from "@vedic-patro/domain/astronomy/sunrise-icon-art";
import type { GrahaKey } from "@vedic-patro/domain/jyotish/graha-details";
import { formatDegreeInRashi, getPlanetsAnchorLabel } from "@vedic-patro/read-models/panchanga/panchanga-format";
import { dualTimeAtGhati, type TimelineRowData } from "@vedic-patro/domain/panchanga/day-timeline-data";
import { useLocale } from "@vedic-patro/i18n/react";
import type { CivilTimeline, PanchangaDay } from "@vedic-patro/api-client";
import { useDayTimeline } from "@vedic-patro/features/panchanga-drawing";
import { Box, Card, Icon, Pressable } from "@vedic-patro/ui";
import { alarmClockIcon } from "../icons";
import { brand, breakpoints, dark, fontFamily, illustration, light, neutral, withAlpha } from "@vedic-patro/design-tokens";
import { patroSecBand } from "@vedic-patro/design-tokens/classes/patro-classes";
import { panchangaPageClasses } from "@vedic-patro/design-tokens/classes/panchanga-page-classes";
import { GrahaPlanetIcon } from "./GrahaPlanetIcon";

type DayCycleMode = "Day-Night" | "Calendar Day";
const FONT = fontFamily.native.semibold;
const FONT_SM = fontFamily.native.medium;
const PAGE_HORIZONTAL_PADDING = 16;
const nepaliSvgTextCenter = { alignmentBaseline: "central" as const };
function nepaliTextStyle(): TextStyle {
  return { fontFamily: fontFamily.native.regular, ...(Platform.OS === "android" ? { includeFontPadding: true } : {}) };
}
function fillGridCell(rowWidth: number, cols: number, gap: number): ViewStyle {
  if (rowWidth <= 0) return { flexBasis: `${Math.floor(100 / cols) - 4}%`, flexGrow: 1, minWidth: 0 };
  const share = (rowWidth - gap * (cols - 1)) / cols;
  return { flexBasis: Math.max(0, Math.floor(share) - 1), flexGrow: 1, flexShrink: 1, minWidth: 0 };
}
function SunTimelineMarker({ x, y, variant, fill, width = 22 }: { x: number; y: number; variant: "rise" | "set"; fill: string; width?: number }) {
  const { w: vbW, h: vbH } = SUNRISE_ICON_VIEWBOX;
  const scale = width / vbW;
  const h = vbH * scale;
  const left = x - width / 2;
  const top = variant === "rise" ? y - h : y;
  return (
    <G transform={`translate(${left}, ${top}) scale(${scale})`}>
      <G transform={variant === "set" ? `rotate(180 ${vbW / 2} ${vbH / 2})` : undefined}>
        <Path d={SUNRISE_ICON_PATH} fill={fill} />
      </G>
    </G>
  );
}
const W = 1000;
/**
 * The width the scrolling chart is drawn at — its own coordinate width, so
 * the SVG renders 1:1 and every `fontSize` in here is screen pixels.
 *
 * This was `W * 1.25` once, meant as an enlargement. It never was one: the
 * Svg kept the viewBox's own height, and `meet` takes the smaller of the two
 * scales, so the drawing stayed 1000 px wide inside a 1250 px box and the
 * scroll ran on into 250 px of empty card.
 */
const MIN_CHART_WIDTH = W;
/** `py-3 pl-1 pr-2` around the chart. */
const CHART_H_INSET = 12;
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
/** Sunset glyph hangs below the horizon, so its clock sits just above the icon. */
const SUNSET_TIME_Y = SUNLINE_Y - 7;
const SUN_R = 6;
const GHATI_TICKS = Array.from({ length: 16 }, (_, i) => i * 4);


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

/** Narrowest a card still reads at: label + "05:12 – 06:48" / name + position + नक्षत्र. */
const PERIOD_CARD_MIN = 132;
const PLANET_CARD_MIN = 128;
const MAX_GRID_COLS = 8;

/** As many cards as fit the row — iPad portrait and landscape both take more than a fixed tier. */
function gridColsThatFit(inner: number, minCell: number, gap: number): number {
  return Math.min(MAX_GRID_COLS, Math.floor((inner + gap) / (minCell + gap)));
}

function periodGridCols(width: number, inner: number): number {
  const tier = width >= breakpoints.lg ? 5 : width >= breakpoints.md ? 4 : width >= 420 ? 3 : 2;
  return Math.max(tier, gridColsThatFit(inner, PERIOD_CARD_MIN, PERIOD_CARD_GAP));
}

function planetGridCols(width: number, inner: number): number {
  const tier = width >= breakpoints.md ? 4 : width >= 380 ? 3 : 2;
  return Math.max(tier, gridColsThatFit(inner, PLANET_CARD_MIN, PLANET_CARD_GAP));
}

const TRACK_CLS: Record<string, string> = {
  Tithi: "tithi",
  Nakshatra: "nak",
  Yoga: "yoga",
  Karana: "karana",
  Choghadiya: "cho",
  Hora: "hora",
  Lagna: "lagna",
  Inauspicious: "ashubha",
  Auspicious: "shubha",
};

/** Rough width of a band label at fontSize 15, in viewBox units (Devanagari runs ~7.5 per code unit). */
function labelWidth(text: string): number {
  return text.length * 7.5;
}

/**
 * A band's label at `fontSize`, or null when even the bare name would spill
 * past its band. An unfitted name ran over its neighbour's, and two Devanagari
 * runs drawn through each other read as gibberish.
 */
function fitBandLabel(mainName: string, paksha: string, bandWidth: number, fontSize: number): string | null {
  const fits = (text: string) => (labelWidth(text) * fontSize) / 15 <= bandWidth - 4;
  const full = paksha ? `${mainName} · ${paksha}` : mainName;
  if (fits(full)) return full;
  if (fits(mainName)) return mainName;
  return null;
}

/** The full name when it fits the band, else its short form. */
function fitHoraName(name: string, bandWidth: number): string {
  if (labelWidth(name) <= bandWidth - 4) return name;
  return horaShortName(name);
}

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
  const isDark = useColorScheme().colorScheme === "dark";
  const colors = isDark ? dark : light;
  return {
    ...C_BASE,
    fg: colors.foreground,
    muted: colors.mutedForeground,
    card: colors.card,
    axis: isDark ? withAlpha(neutral.white, 0.45) : withAlpha(brand.ink, 0.45),
    tick: isDark ? withAlpha(neutral.white, 0.4) : withAlpha(brand.ink, 0.35),
    night: isDark ? withAlpha(neutral.white, 0.08) : withAlpha(brand.blue, 0.1),
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
  onModeChange?: (mode: DayCycleMode) => void;
  showToggle?: boolean;
  chartOnly?: boolean;
  /** Civil (midnight→midnight) timeline — only used in Calendar Day mode. */
  civil?: CivilTimeline;
  renderStatus?: (mark: { planetKey: string; isRetrograde?: boolean; isCombust?: boolean; size?: number }) => ReactNode;
  civilLoading?: boolean;
  /** Adds an alarm button to each शुभ / अशुभ period card; the app opens its reminder sheet. */
  onRemind?: (period: TimelinePeriod) => void;
  remindLabel?: string;
};

/** A शुभ / अशुभ window as the period cards list it. */
export type TimelinePeriod = { kind: "shubh" | "ashubh"; key?: string; ne: string; en: string; time: string };

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
        y={kind === "sunset" ? SUNSET_TIME_Y : isSun ? MARKER_TIME_Y : MOON_TIME_Y}
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
  renderStatus,
  onRemind,
  remindLabel,
}: Props) {
  const { pick, digits, lang } = useLocale();
  const { width: windowWidth } = useWindowDimensions();
  const [containerWidth, setContainerWidth] = useState(0);
  const C = useTimelineColors();
  const tl = useDayTimeline({ p, dateAd, isToday, timezone, needleClock, showNeedle, loading, mode, civil, civilLoading });
  const { isCivil, data, planets, busy, nowG, nowLabel, copy } = tl;

  if (busy || !data) {
    return (
      <Card className="w-full overflow-hidden p-0">
        <View className={cn("flex-row", patroSecBand)}>
          <Text className={cn(panchangaPageClasses.dayCycle.bandTitle, "text-foreground")} style={nepaliTextStyle()}>{copy.title}</Text>
          <Text className={cn(panchangaPageClasses.dayCycle.bandSubtitleNative, "text-muted-foreground")} style={nepaliTextStyle()}>
            {copy.subtitle}
          </Text>
        </View>
        <Box className="mx-3 my-3 h-[320px] animate-pulse rounded-lg bg-muted/40" />
      </Card>
    );
  }

  const tracks = data.rows
    .filter((row) => row.kind !== "graha")
    .map((row) => {
      const cls = TRACK_CLS[row.en] ?? "tithi";
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
    })
    /* A row with nothing in it (योग, when its spans are missing) drew as an unlabeled empty bar. */
    .filter((tr) => tr.segs.length > 0);

  const H = T0 + tracks.length * TRACK + 6;
  /** Web: `w-full min-w-[768px]` — at least 767px, grow to fill the card column. */
  const measuredWidth = containerWidth || windowWidth - PAGE_HORIZONTAL_PADDING * 2;
  const chartWidth = Math.max(MIN_CHART_WIDTH, measuredWidth - CHART_H_INSET);
  /* Scroll only when the drawing is wider than the card: wide enough, it stretches to fit. */
  const scrollChart = measuredWidth - CHART_H_INSET < MIN_CHART_WIDTH;
  const sectionInner = Math.max(0, measuredWidth - SECTION_H_PAD * 2);
  const periodCols = periodGridCols(measuredWidth, sectionInner);
  const periodCell = fillGridCell(sectionInner, periodCols, PERIOD_CARD_GAP);
  const planetCols = planetGridCols(measuredWidth, sectionInner);
  const planetCell = fillGridCell(sectionInner, planetCols, PLANET_CARD_GAP);
  const tLabel = (g: number) => dualTimeAtGhati(g, data.sunriseMin).clock;


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
        {copy.hour}
      </SvgText>
      {/* घडी counts from sunrise, so it means nothing on a midnight-anchored
          chart — web drops the row there and so does this. */}
      {!isCivil && (
        <SvgText x={X0 - 10} y={47} fill={C.muted} fontSize={15} fontFamily={FONT} textAnchor="end" opacity={0.75}>
          {copy.ghati}
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
              const bandLabel = fitBandLabel(mainName, narrow ? "" : paksha, w, narrow ? 9 : 10);
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
                        {tr.cls === "hora" ? fitHoraName(segText, w) : segText}
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
                  ) : bandLabel ? (
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
                      {bandLabel}
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

  /* Row names and the hour/ghati captions, drawn again in a fixed column over the left
     edge while the chart scrolls sideways — the website's sticky first column. */
  const labelColumn = (
    <>
      <Rect x={0} y={0} width={X0} height={H} fill={C.card} />
      <SvgText x={X0 - 10} y={isCivil ? 34 : 20} fill={C.muted} fontSize={15} fontFamily={FONT} textAnchor="end">
        {copy.hour}
      </SvgText>
      {!isCivil && (
        <SvgText x={X0 - 10} y={47} fill={C.muted} fontSize={15} fontFamily={FONT} textAnchor="end" opacity={0.75}>
          {copy.ghati}
        </SvgText>
      )}
      {tracks.map((tr, ti) => (
        <SvgText
          key={tr.key}
          x={8}
          y={trackY(ti) + BAND / 2 + 4}
          fill={C.fg}
          fontSize={15}
          fontFamily={FONT}
          fontWeight="700"
          {...nepaliSvgTextCenter}
        >
          {tr.ne}
        </SvgText>
      ))}
      <Line x1={X0 - 0.5} y1={T0 - 4} x2={X0 - 0.5} y2={H - 4} stroke={C.sunLine} strokeWidth={1} />
    </>
  );
  /* Same transform as the chart's Svg (uniform `meet` scale), so the column lines up. */
  const labelScale = MIN_CHART_WIDTH / W;

  return (
    <View
      className="w-full"
      onLayout={(e: LayoutChangeEvent) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0) setContainerWidth(w);
      }}
    >
    <Card className="w-full overflow-hidden p-0">
      <View className={cn("flex-row", patroSecBand)}>
        <Text className={cn(panchangaPageClasses.dayCycle.bandTitle, "text-foreground")} style={nepaliTextStyle()}>{copy.title}</Text>
        <Text className={cn(panchangaPageClasses.dayCycle.bandSubtitleNative, "text-muted-foreground")} style={nepaliTextStyle()}>
          {copy.subtitle}
        </Text>
        <View className={panchangaPageClasses.dayCycle.bandLegend}>
          <LegendDot color={withAlpha(illustration.green40, 0.55)} label={copy.good} />
          <LegendDot color={withAlpha(illustration.red57, 0.55)} label={copy.bad} />
          {/* The chart's own night fill, darker: white on a light card was invisible. */}
          <LegendDot color={withAlpha(brand.blue, 0.35)} label={copy.night} />
        </View>
      </View>

      <View className="w-full">
        {scrollChart ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator
            /* Not nestedScrollEnabled: on Android that made this horizontal chart keep a
               vertical drag that started on it, so the page would not scroll there. */
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
        ) : null}
        {scrollChart ? (
          /* The chart runs past the right edge: say it scrolls. */
          <View pointerEvents="none" className="absolute bottom-1 right-2 rounded-full px-2 py-0.5" style={{ backgroundColor: withAlpha(C.card, 0.9) }}>
            <Text className={cn(panchangaPageClasses.dayCycle.legendLabel, "text-muted-foreground")}>{copy.scrollHint} →</Text>
          </View>
        ) : null}
        {scrollChart ? (
          <View
            pointerEvents="none"
            className="absolute bottom-0 left-0 top-0 overflow-hidden py-3 pl-1"
            style={{ width: X0 * labelScale + 4, backgroundColor: C.card }}
          >
            <Svg
              width={MIN_CHART_WIDTH}
              height={H}
              viewBox={`0 0 ${W} ${H}`}
              preserveAspectRatio="xMinYMid meet"
            >
              {labelColumn}
            </Svg>
          </View>
        ) : (
          <View className="w-full py-3 pl-1 pr-2">
            {/* Grown uniformly, not stretched: `none` widened every glyph with the card. */}
            <Svg
              width={chartWidth}
              height={(H * chartWidth) / W}
              viewBox={`0 0 ${W} ${H}`}
              preserveAspectRatio="xMinYMid meet"
            >
              {chartContent}
            </Svg>
          </View>
        )}
      </View>

      {data.ashubhaAll.length > 0 && (
        <PeriodCards
          tone="danger"
          title={copy.inauspicious}
          cellStyle={periodCell}
          remindLabel={remindLabel}
          items={data.ashubhaAll.map((a, i) => {
            const time = `${tLabel(a.startG)} – ${tLabel(a.endG)}`;
            return {
              n: digits(i + 1),
              label: pick(a.detailNe, a.detailEn),
              time,
              onRemind: onRemind ? () => onRemind({ kind: "ashubh", key: a.key, ne: a.detailNe, en: a.detailEn, time }) : undefined,
            };
          })}
        />
      )}

      {data.shubha.length > 0 && (
        <PeriodCards
          tone="success"
          title={copy.auspicious}
          cellStyle={periodCell}
          remindLabel={remindLabel}
          items={data.shubha.map((s, i) => {
            const time = `${tLabel(s.startG)} – ${tLabel(s.endG)}`;
            return {
              n: digits(i + 1),
              label: pick(s.name, s.nameEn),
              time,
              onRemind: onRemind ? () => onRemind({ kind: "shubh", key: s.key, ne: s.name, en: s.nameEn, time }) : undefined,
            };
          })}
        />
      )}

      {p && planets.length > 0 ? (
        <View className="gap-2 border-t border-border px-4 py-3">
          <View className="gap-0.5">
            <Text className="text-sm font-bold text-foreground">{copy.planets}</Text>
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
                    style={planetCell}
                  >
                    {/* Name on its own line: sharing a row with the position let a long
                        position squeeze the name to zero width on narrow cards. */}
                    <View className="flex-row flex-wrap items-center gap-1">
                      {isGrahaKey(planetKey) ? (
                        <GrahaPlanetIcon graha={planetKey} size={18} />
                      ) : null}
                      <Text
                        className="shrink-0 text-sm font-bold leading-tight text-foreground"
                        numberOfLines={1}
                        style={nepaliTextStyle()}
                      >
                        {labelL}
                      </Text>
{renderStatus?.({ planetKey, isRetrograde, isCombust, size: 13 })}
                    </View>
                    <Text className="font-mono text-sm leading-tight tabular-nums text-foreground" numberOfLines={1}>
                      {coordText}
                    </Text>
                    {(nakWithPada || lordText) && (
                      <View className="flex-row items-baseline justify-between gap-1.5">
                        <Text className="text-sm min-w-0 flex-1 text-foreground" numberOfLines={1} style={nepaliTextStyle()}>
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
    </View>
  );
}

function PeriodCards({
  tone,
  title,
  items,
  cellStyle,
  remindLabel,
}: {
  tone: "danger" | "success";
  title: string;
  items: { n: string; label: string; time: string; onRemind?: () => void }[];
  cellStyle: ViewStyle;
  remindLabel?: string;
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
            style={[cellStyle, { borderColor, backgroundColor }]}
          >
            <View className={cn("flex-row", panchangaPageClasses.dayCycle.periodHead)}>
              <View
                className={panchangaPageClasses.dayCycle.periodBadge}
                style={{ backgroundColor: accent }}
              >
                <Text className={panchangaPageClasses.dayCycle.periodBadgeText}>{it.n}</Text>
              </View>
              <Text className={cn("flex-1 text-foreground", panchangaPageClasses.dayCycle.periodLabel)} style={nepaliTextStyle()}>
                {it.label}
              </Text>
              {it.onRemind ? (
                <Pressable
                  label={remindLabel ?? it.label}
                  onPress={it.onRemind}
                  className="-my-1 -mr-1 size-8 shrink-0 items-center justify-center rounded-full"
                >
                  <Icon node={alarmClockIcon} size="sm" tone={tone === "danger" ? "destructive" : "success"} />
                </Pressable>
              ) : null}
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
