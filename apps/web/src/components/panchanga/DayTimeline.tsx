import { useEffect, useMemo, useState } from "react";
import type { CivilTimeline, PanchangaDay } from "@/lib/api";
import { GrahaStatusBadges } from "@/components/graha/GrahaStatusBadges";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import type { GrahaKey } from "@/lib/graha-details";
import {
  formatDegreeInRashi,
  getPlanetRows,
  getPlanetsAnchorLabel,
  getSunriseLagnaRow,
} from "@/lib/panchanga-format";
import { formatRashiDisplay, resolveRashiDisplay } from "@/lib/rashi-i18n";
import { minutesSinceMidnightInTimezone, resolveTimeZone } from "@/lib/zoned-time";
import {
  buildCivilTimelineData,
  buildDayTimelineData,
  dualTimeAtGhati,
  needleGhatiOnVedicChart,
  type TimelineRowData,
} from "./day-timeline-data";
import { choghadiyaName } from "@/lib/choghadiya-display";
import { useLocale, bilingualText } from "@/i18n/locale";
import { patroCard, patroMono, patroSecBand, patroSkel } from "@/lib/patro-classes";
import { cn } from "@/lib/utils";
import { CalendarMoonPhaseIcon } from "@/components/panchanga/CalendarMoonPhaseIcon";
import { tithiIndexFromPanchanga } from "@/lib/tithi-wheel-data";
import { SUNRISE_ICON_PATH, SUNRISE_ICON_VIEWBOX } from "@/lib/sunrise-icon-art";
import {
  pgTlAxis,
  pgTlEventTimeMoon,
  pgTlRowline,
  pgTlSunDisc,
  pgTlTick,
  pgTlVgridMajor,
  pgxArrow,
  pgxArrowBound,
  pgxGhati,
  pgxHour,
  pgxMoonline,
  pgxNightwash,
  pgxNowLine,
  pgxNowPill,
  pgxNowText,
  pgxPaksha,
  pgxScaleLabelDim,
  pgxSeg,
  pgxSegname,
  pgxSegnameBad,
  pgxSegnameGood,
  pgxSegnameCho,
  pgxSegnameSm,
  pgxSunhair,
  pgxSunline,
  pgxTimeLagna,
} from "@/lib/timeline-classes";

const GRAHA_KEYS = new Set<string>([
  "sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn", "rahu", "ketu",
]);

function isGrahaKey(key: string): key is GrahaKey {
  return GRAHA_KEYS.has(key);
}

const W = 1000;
/** Start of the ghati grid in viewBox units. Was 120 when the frozen label column
 *  was 85px wide; narrowed to 65px (−20px) so the chart begins 20px further left. */
const X0 = 100;
const X1 = 994;
const RULER_H = 58;
const MOON_BAND_H = 20;
const SUN_H = 28;
/** Moon events sit above the sun row, just under the घडी ruler. */
const MOON_EMOJI_Y = RULER_H + 5;
/** Keep a few px under the emoji so rise/set times don't collide with the icon. */
const MOON_TIME_Y = RULER_H + 23;
const T0 = RULER_H + MOON_BAND_H + SUN_H + 6;
const TRACK = 58;
const BAND = 34;
const SUNLINE_Y = RULER_H + MOON_BAND_H + 8;
const MARKER_TIME_Y = SUNLINE_Y + 13;
const SUN_R = 6;

const GHATI_TICKS = Array.from({ length: 16 }, (_, i) => i * 4);

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

function gx(g: number) {
  return X0 + (Math.max(0, Math.min(60, g)) / 60) * (X1 - X0);
}

function clampX(x: number, pad: number) {
  return Math.max(X0 + pad, Math.min(X1 - pad, x));
}

const MOON_ICON = 14;

function MoonMarkerIcon({ x, y, tithiIndex }: { x: number; y: number; tithiIndex: number }) {
  return (
    <foreignObject
      x={x - MOON_ICON / 2}
      y={y - MOON_ICON / 2}
      width={MOON_ICON}
      height={MOON_ICON}
      className="overflow-visible"
    >
      <CalendarMoonPhaseIcon tithiIndex={tithiIndex} className="size-3.5" />
    </foreignObject>
  );
}

interface ChartSegment {
  ne: string;
  en: string;
  fromG: number;
  toG: number;
  bad?: boolean;
  cut?: boolean;
  transitionLocal?: string;
  detailNe?: string;
  detailEn?: string;
  lane?: number;
  laneCount?: number;
}

/** Greedy interval partition: assign each segment the first lane free at its start. */
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

interface Props {
  p?: PanchangaDay;
  dateAd?: string;
  isToday?: boolean;
  timezone?: string;
  /** HH:MM — show needle at this clock on the vedic day chart (ephemeris mode). */
  needleClock?: string;
  /** When false, hide the time needle until the user picks a time. */
  showNeedle?: boolean;
  /** First load only — inline placeholder, not the full-page loader. */
  loading?: boolean;
  /** Day boundary: "Day-Night" = sunrise→sunrise (default), "Calendar Day" = midnight→midnight. */
  mode?: DayCycleMode;
  onModeChange?: (mode: DayCycleMode) => void;
  /** Hide the in-chart mode toggle when a page-level tab already drives it. */
  showToggle?: boolean;
  /** Civil (midnight→midnight) timeline — only used in Calendar Day mode. */
  civil?: CivilTimeline;
  civilLoading?: boolean;
  /** Render only the horizontal chart — skip the अशुभ/शुभ period cards and the
   *  planets grid below it. Used by the OG share-image preview. */
  chartOnly?: boolean;
}

export type DayCycleMode = "Day-Night" | "Calendar Day";

export function DayCycleToggle({
  mode,
  onModeChange,
  size = "sm",
}: {
  mode: DayCycleMode;
  onModeChange?: (mode: DayCycleMode) => void;
  /** "sm" = compact chart toolbar toggle; "md" = prominent page-level tab. */
  size?: "sm" | "md";
}) {
  const { lang } = useLocale();
  const options: Array<{ value: DayCycleMode; ne: string; en: string }> = [
    { value: "Day-Night", ne: "अहोरात्र", en: "Day-Night" },
    { value: "Calendar Day", ne: "दिन-रात", en: "Calendar Day" },
  ];
  // Under 768px there isn't room for both; mirror the language / calendar
  // toggles — show only the *inactive* mode as a single button that switches
  // to it on tap (and then flips to show the other one).
  const inactive = options.find((o) => o.value !== mode) ?? options[0]!;
  const padCls = size === "md" ? "px-3.5 py-1.5 text-sm" : "px-2 py-0.5 text-sm";
  const roundCls = size === "md" ? "rounded-lg" : "rounded-md";
  return (
    <>
      {/* Mobile (<768px): single "switch to …" toggle. */}
      <button
        type="button"
        onClick={() => onModeChange?.(inactive.value)}
        aria-label={bilingualText(lang, `${inactive.ne} मा बदल्नुहोस्`, `Switch to ${bilingualText(lang, inactive.ne, inactive.en)}`)}
        className={cn(
          "inline-flex items-center justify-center border border-border bg-card font-semibold transition-colors hover:bg-surface-hover md:hidden",
          padCls,
          roundCls,
        )}
      >
        {bilingualText(lang, inactive.ne, inactive.en)}
      </button>

      {/* Desktop (≥768px): full segmented control. */}
      <div
        className={cn(
          "hidden overflow-hidden rounded-md border border-border md:inline-flex",
          size === "md" && "rounded-lg",
        )}
        role="radiogroup"
        aria-label={bilingualText(lang, "दिन सीमा", "Day boundary")}
      >
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={mode === o.value}
            onClick={() => onModeChange?.(o.value)}
            className={cn(
              "font-semibold transition-colors !py-1 h-7",
              padCls,
              mode === o.value
                ? "bg-primary text-primary-foreground"
                : "bg-card hover:bg-surface-hover",
            )}
          >
            {bilingualText(lang, o.ne, o.en)}
          </button>
        ))}
      </div>
    </>
  );
}

function DayTimelineBand({
  mode,
  onModeChange,
  showToggle = true,
}: {
  mode: DayCycleMode;
  onModeChange?: (mode: DayCycleMode) => void;
  showToggle?: boolean;
}) {
  const { lang } = useLocale();
  const subtitle =
    mode === "Calendar Day"
      ? bilingualText(lang, "पूर्ण पञ्चाङ्ग रेखा · मध्यरातदेखि मध्यरात", "Full panchanga timeline · midnight to midnight")
      : bilingualText(lang, "पूर्ण पञ्चाङ्ग रेखा · सूर्योदयदेखि सूर्योदय", "Full panchanga timeline · sunrise to sunrise");
  return (
    <div className={patroSecBand}>
      <h2 className={cn("m-0", "text-sm", "font-bold")}>{bilingualText(lang, "दिन-चक्र", "Day cycle")}</h2>
      <span className="text-sm text-base uppercase tracking-wider">
        {subtitle}
      </span>
      <span className="ml-auto inline-flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-sm text-base normal-case tracking-normal">
        <span className="inline-flex items-center gap-1.5">
          <i className="inline-block h-2.5 w-2.5 rounded-[3px] bg-success/34 not-italic" />
          {bilingualText(lang, "शुभ", "Good")}
          <i className="inline-block h-2.5 w-2.5 rounded-[3px] bg-danger/30 not-italic" />
          {bilingualText(lang, "अशुभ", "Bad")}
          <i className="inline-block h-2.5 w-2.5 rounded-[3px] bg-secondary/22 not-italic" />
          {bilingualText(lang, "रात", "Night")}
        </span>
        {showToggle && <DayCycleToggle mode={mode} onModeChange={onModeChange} />}
      </span>
    </div>
  );
}

function minutesOnVedicChart(
  queryInstantLocal: string | undefined,
  anchorDateAd: string,
  needleClock: string | undefined
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

export function DayTimeline({
  p,
  dateAd,
  isToday = false,
  timezone,
  needleClock,
  showNeedle = true,
  loading = false,
  mode = "Day-Night",
  onModeChange,
  showToggle = true,
  civil,
  civilLoading = false,
  chartOnly = false,
}: Props) {
  const { digits, lang } = useLocale();
  const isCivil = mode === "Calendar Day";
  const data = useMemo(() => {
    if (isCivil) return civil ? buildCivilTimelineData(civil, p) : null;
    return p ? buildDayTimelineData(p) : null;
  }, [isCivil, civil, p]);
  const planets = useMemo(() => {
    if (!p) return [];
    const rows = getPlanetRows(p);
    const lagna = getSunriseLagnaRow(p);
    return lagna ? [lagna, ...rows] : rows;
  }, [p]);
  const timeZone = resolveTimeZone(p?.location?.timezone, timezone);
  const tithiIdx = p ? tithiIndexFromPanchanga(p) : null;

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!isToday) return;
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, [isToday]);

  const busy = loading || (isCivil ? civilLoading || !civil : !p) || !data;
  if (busy) {
    return (
      <div className={cn(patroCard, "w-full")} aria-busy={busy}>
        <DayTimelineBand mode={mode} onModeChange={onModeChange} showToggle={showToggle} />
        <div className={cn("w-full", "max-w-full", "overflow-hidden", "px-0", "pt-3", "pb-1")}>
          <div className={cn(patroSkel, "w-full")} style={{ minHeight: 320 }} />
        </div>
      </div>
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
              cut: false,
            }))
          : row.kind === "hora"
            ? data.hora.map((h) => ({
                ne: h.name,
                en: h.nameEn,
                fromG: h.startG,
                toG: h.endG,
                bad: h.bad,
                cut: false,
              }))
            : row.kind === "ashubha"
              ? assignLanes(
                  data.ashubha.map((a) => ({
                    ne: a.name,
                    en: a.nameEn,
                    fromG: a.startG,
                    toG: a.endG,
                    bad: true,
                    cut: false,
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
                      cut: false,
                      detailNe: s.name,
                      detailEn: s.nameEn,
                    })),
                  )
                : segmentsFromRow(row);
      return { key: row.label, ne: row.label, en: row.en, cls, segs };
    });

  // Laned rows (अशुभ / शुभ) can stack several overlapping windows into vertical
  // lanes; give them extra height so the number badges stay legible instead of
  // colliding inside the fixed band. Other rows keep the standard band height.
  const LANE_MIN = 15;
  const ROW_GAP = TRACK - BAND;
  const rowBands = tracks.map((tr) =>
    tr.cls === "ashubha" || tr.cls === "shubha"
      ? Math.max(BAND, Math.max(1, tr.segs[0]?.laneCount ?? 1) * LANE_MIN)
      : BAND,
  );
  const rowTops: number[] = [];
  {
    let acc = T0;
    for (let i = 0; i < tracks.length; i += 1) {
      rowTops.push(acc);
      acc += rowBands[i]! + ROW_GAP;
    }
  }
  const lastIdx = tracks.length - 1;
  const H = (rowTops[lastIdx] ?? T0) + (rowBands[lastIdx] ?? BAND) + 6;
  const trackY = (i: number) => rowTops[i] ?? T0;
  const rowBandAt = (i: number) => rowBands[i] ?? BAND;
  const tLabel = (g: number) => dualTimeAtGhati(g, data.sunriseMin).clock;

  let nowG: number | null = null;
  let nowLabel = bilingualText(lang, "अहिले", "Now");
  const anchorAd = p?.panchanga_date_ad ?? p?.date_ad ?? dateAd;
  const chartMins = minutesOnVedicChart(p?.query_instant_local, anchorAd ?? "", needleClock);

  if (isCivil) {
    // Civil axis: position = minutes-from-midnight / 24 (no sunrise offset).
    let mins: number | null = null;
    if (showNeedle && needleClock) {
      const [hh, mm] = needleClock.split(":").map(Number);
      if (!Number.isNaN(hh) && !Number.isNaN(mm)) {
        mins = hh * 60 + mm;
        // The pill already prints the clock via tLabel(nowG); keep the label
        // empty so a chosen time reads "१६:२३", not "१६:२३ बजे १६:२३".
        nowLabel = "";
      }
    } else if (showNeedle && isToday) {
      mins = minutesSinceMidnightInTimezone(now, timeZone);
    } else if (showNeedle && chartMins != null) {
      mins = chartMins % (24 * 60);
      nowLabel = bilingualText(lang, "छानिएको समय", "Chosen time");
    }
    if (mins != null) nowG = Math.max(0, Math.min(60, mins / 24));
  } else if (showNeedle && needleClock && chartMins != null) {
    // The needle overlays a marker on the civil date's udaya (sunrise-to-sunrise)
    // day so it stays aligned with the wheel. Priority: an explicitly chosen
    // clock pins the needle; otherwise on today it tracks the live current time
    // ("अहिले"); otherwise it falls back to the ephemeris query instant.
    nowG = needleGhatiOnVedicChart(chartMins, data.sunriseMin);
    if (nowG != null) {
      // Label stays empty; tLabel(nowG) in the pill prints the chosen clock,
      // so this avoids the doubled "१६:२३ बजे १६:२३".
      nowLabel = "";
    }
  } else if (showNeedle && isToday) {
    const minsNow = minutesSinceMidnightInTimezone(now, timeZone);
    nowG = needleGhatiOnVedicChart(minsNow, data.sunriseMin);
  } else if (showNeedle && chartMins != null) {
    nowG = needleGhatiOnVedicChart(chartMins, data.sunriseMin);
    if (nowG != null) {
      nowLabel = bilingualText(lang, "छानिएको समय", "Chosen time");
    }
  }

  const nightBands = data.nightBands ?? [[data.dayG, 60]];
  const sunriseG = isCivil ? data.sunriseG ?? 0 : 0;
  const sunsetG = isCivil ? data.sunsetG ?? data.dayG : data.dayG;
  const hairlineGs = isCivil ? [sunriseG, sunsetG] : [0, data.dayG, 60];

  return (
    <div className={cn(patroCard, "w-full")}>
      <DayTimelineBand mode={mode} onModeChange={onModeChange} showToggle={showToggle} />

      <div className="relative">
        <div className={cn("w-full", "max-w-full", "overflow-x-auto", "overscroll-x-contain", "px-0", "pt-3", "pb-1")}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className={cn("block", "h-auto", "w-full", "min-w-[768px]")}
          preserveAspectRatio="xMinYMid meet"
          role="img"
          aria-label={bilingualText(lang, "पूर्ण दिन पञ्चाङ्ग चित्र", "Full panchanga day chart")}
        >
          {nightBands.map(([a, b], i) => (
            <rect
              key={`night-${i}`}
              x={gx(a)}
              y={RULER_H - 8}
              width={Math.max(0, gx(b) - gx(a))}
              height={H - RULER_H + 2}
              className={pgxNightwash}
            />
          ))}

          <text x={X0 - 10} y={isCivil ? 34 : 20} className={pgxScaleLabelDim()} textAnchor="end">
            {bilingualText(lang, "घण्टा", "Hour")}
          </text>
          {!isCivil && (
            <text x={X0 - 10} y={47} className={pgxScaleLabelDim(true)} textAnchor="end">
              {bilingualText(lang, "घडी", "Ghati")}
            </text>
          )}
          <line x1={X0} y1={30} x2={X1} y2={30} className={pgTlAxis} />
          {data.civilHourTicks.map(({ hour, g }) => (
            <g key={`h-${hour}-${g}`}>
              <line x1={gx(g)} y1={30} x2={gx(g)} y2={24} className={pgTlTick} />
              <text x={gx(g)} y={18} className={pgxHour} textAnchor="middle">
                {digits(hour)}
              </text>
            </g>
          ))}
          {!isCivil &&
            GHATI_TICKS.map((g) => (
              <g key={`g-${g}`}>
                <line x1={gx(g)} y1={30} x2={gx(g)} y2={36} className={pgTlTick} />
                <text x={gx(g)} y={48} className={pgxGhati} textAnchor="middle">
                  {digits(g)}
                </text>
              </g>
            ))}

          <line x1={X0} y1={SUNLINE_Y} x2={X1} y2={SUNLINE_Y} className={pgxSunline} />
          <line x1={X0} y1={T0 - 1} x2={X1} y2={T0 - 1} className={pgxMoonline} />
          <EventMarker g={sunriseG} sunriseMin={data.sunriseMin} kind="sunrise" anchor={isCivil ? "middle" : "start"} />
          <EventMarker g={sunsetG} sunriseMin={data.sunriseMin} kind="sunset" anchor="middle" />
          {data.moonsetG != null && (
            <EventMarker
              g={data.moonsetG}
              sunriseMin={data.sunriseMin}
              kind="moonset"
              anchor="middle"
              tithiIndex={tithiIdx}
            />
          )}
          {data.moonriseG != null && (
            <EventMarker
              g={data.moonriseG}
              sunriseMin={data.sunriseMin}
              kind="moonrise"
              anchor="middle"
              tithiIndex={tithiIdx}
            />
          )}
          {!isCivil && (
            <EventMarker g={60} sunriseMin={data.sunriseMin} kind="next-sunrise" anchor="end" />
          )}

          {hairlineGs.map((g) => (
            <line
              key={`hair-${g}`}
              x1={gx(g)}
              y1={T0}
              x2={gx(g)}
              y2={H - 4}
              className={pgxSunhair}
            />
          ))}

          {tracks.map((tr, ti) => {
            const y = trackY(ti);
            const rowBand = rowBandAt(ti);
            return (
              <g key={tr.key}>
                <line
                  x1={X0}
                  y1={y + rowBand}
                  x2={X1}
                  y2={y + rowBand}
                  className={pgTlRowline(ti)}
                />

                {tr.segs.map((s, si) => {
                  const x = gx(s.fromG);
                  const x2 = gx(s.toG);
                  const w = x2 - x;
                  const isActiveLagna =
                    tr.cls === "lagna" &&
                    nowG != null &&
                    nowG >= s.fromG &&
                    nowG < s.toG;
                  const segCls = pgxSeg(tr.cls, {
                    alt: tr.cls !== "cho" && tr.cls !== "hora" && si % 2 === 1,
                    active: isActiveLagna,
                    bad: s.bad,
                  });
                  const midX = clampX((x + x2) / 2, 26);
                  const narrow = w < 64;
                  const segText = bilingualText(lang, s.ne, s.en);
                  const [mainName, paksha] = segText.includes(", ")
                    ? [segText.split(", ")[0]!, segText.split(", ").slice(1).join(", ")]
                    : [segText, ""];

                  // Overlapping अशुभ / शुभ windows are split into vertical lanes
                  // so their number badges never sit on top of one another.
                  const laned = tr.cls === "ashubha" || tr.cls === "shubha";
                  const laneCount = laned ? Math.max(1, s.laneCount ?? 1) : 1;
                  const laneGap = laneCount > 1 ? 1.5 : 0;
                  const laneH = rowBand / laneCount;
                  const bandY = laned ? y + (s.lane ?? 0) * laneH : y;
                  const bandH = laned ? laneH - laneGap : rowBand;

                  const clipId = `pgx-clip-${ti}-${si}`;
                  const labelY = bandY + bandH / 2 + Math.min(4, bandH / 3);

                  return (
                    <g key={si}>
                      <defs>
                        <clipPath id={clipId}>
                          <rect
                            x={x + 1}
                            y={bandY}
                            width={Math.max(0, w - 2)}
                            height={bandH}
                            rx={4}
                          />
                        </clipPath>
                      </defs>
                      <rect
                        x={x + 1}
                        y={bandY}
                        width={Math.max(0, w - 2)}
                        height={bandH}
                        rx={4}
                        className={segCls}
                      >
                        <title>{`${bilingualText(lang, tr.ne, tr.en)}: ${s.detailNe ? bilingualText(lang, s.detailNe, s.detailEn ?? s.detailNe) : segText} · ${tLabel(s.fromG)} – ${tLabel(s.toG)}`}</title>
                      </rect>
                      {tr.cls === "cho" || tr.cls === "hora" ? (
                        w > 20 && (
                          <text
                            x={(x + x2) / 2}
                            y={y + rowBand / 2 + 4}
                            className={pgxSegnameCho(s.bad)}
                            textAnchor="middle"
                          >
                            {segText}
                          </text>
                        )
                      ) : tr.cls === "ashubha" || tr.cls === "shubha" ? (
                        w >= 9 && (
                          <text
                            x={clampX((x + x2) / 2, 8)}
                            y={labelY}
                            className={tr.cls === "shubha" ? pgxSegnameGood : pgxSegnameBad}
                            textAnchor="middle"
                          >
                            {digits(si + 1)}
                          </text>
                        )
                      ) : (
                        w >= 20 && (
                          <>
                            {tr.cls === "tithi" && si === 0 && tithiIdx != null && w >= 30 ? (
                              <MoonMarkerIcon
                                x={x + MOON_ICON / 2 + 2}
                                y={labelY}
                                tithiIndex={tithiIdx}
                              />
                            ) : null}
                            <text
                              x={midX + (tr.cls === "tithi" && si === 0 && tithiIdx != null && w >= 30 ? 8 : 0)}
                              y={labelY}
                              className={narrow ? cn(pgxSegname, pgxSegnameSm) : pgxSegname}
                              textAnchor="middle"
                              clipPath={`url(#${clipId})`}
                            >
                              {mainName}
                              {!narrow && paksha ? (
                                <tspan className={pgxPaksha}>{` · ${paksha}`}</tspan>
                              ) : null}
                            </text>
                          </>
                        )
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}

          {data.civilHourTicks.map(({ hour, g }) => (
            <line
              key={`hour-grid-${hour}-${g}`}
              x1={gx(g)}
              y1={T0 -100}
              x2={gx(g)}
              y2={H - 26}
              className={pgTlVgridMajor}
            />
          ))}

          {tracks.map((tr, ti) => {
            const y = trackY(ti);
            if (tr.cls === "cho" || tr.cls === "hora") return null;
            return (
              <g key={`${tr.key}-cuts`}>
                {tr.segs.map((s, si) => {
                  if (!s.cut || s.toG >= 59.97) return null;
                  const x2 = gx(s.toG);
                  const time =
                    tr.cls === "lagna" && s.transitionLocal
                      ? digits(s.transitionLocal)
                      : tLabel(s.toG);
                  const prevTime =
                    si > 0 && tr.segs[si - 1]?.cut
                      ? tLabel(tr.segs[si - 1]!.toG)
                      : null;
                  if (prevTime === time) return null;
                  return (
                    <g key={`cut-${si}`}>
                      <TransitionArrow x2={x2} y={y} />
                      <text
                        x={clampX(x2, 22)}
                        y={y + BAND + 16}
                        className={pgxTimeLagna(tr.cls === "lagna")}
                        textAnchor="middle"
                      >
                        {time}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}

          {nowG != null && nowG >= 0 && nowG <= 60 && (
            <g>
              <line x1={gx(nowG)} y1={RULER_H - 6} x2={gx(nowG)} y2={H - 4} className={pgxNowLine} />
              <rect
                x={clampX(gx(nowG), 30) - 48}
                y={RULER_H - 22}
                width={100}
                height={17}
                rx={9}
                className={pgxNowPill}
              />
              <text x={clampX(gx(nowG), 30)} y={RULER_H - 10} textAnchor="middle" className={pgxNowText}>
                {[nowLabel, tLabel(nowG)].filter(Boolean).join(" ")}
              </text>
            </g>
          )}
        </svg>
        </div>

        {/* Frozen row-label column: stays put while the chart scrolls sideways
            so each line stays identifiable. Transparent above the tracks so the
            घण्टा/घडी scale keeps scrolling; only the track rows get an opaque
            backing. Positioned by % of the SVG height, so it tracks the chart's
            scaling on every screen size. */}
            
        <div
          aria-hidden
          className="pointer-events-none absolute left-1 top-3 bottom-1 z-10 w-[65px] lg:w-[104px]"
        >
          <div
            className="absolute inset-x-0 bottom-0 border-r border-border bg-card shadow-[3px_0_6px_-3px_color-mix(in_srgb,var(--foreground)_28%,transparent)]"
            style={{ top: `${(T0 / H) * 100}%` }}
          />
          {tracks.map((tr, ti) => (
            <span
              key={tr.key}
              className="absolute right-1.5 -translate-y-1/2 whitespace-nowrap text-[11px] font-bold leading-none text-foreground [font-family:var(--pn-font)] sm:text-xs lg:text-sm"
              style={{ top: `${((trackY(ti) + rowBandAt(ti) / 2) / H) * 100}%` }}
            >
              {bilingualText(lang, tr.ne, tr.en ?? tr.ne)}
            </span>
          ))}
        </div>
      </div>

      {!chartOnly && data.ashubhaAll.length > 0 && (
        <PeriodCards
          tone="danger"
          title={bilingualText(lang, "अशुभ समय", "Inauspicious periods")}
          items={data.ashubhaAll.map((a, i) => ({
            n: digits(i + 1),
            label: bilingualText(lang, a.detailNe, a.detailEn),
            time: `${tLabel(a.startG)} – ${tLabel(a.endG)}`,
          }))}
        />
      )}

      {!chartOnly && data.shubha.length > 0 && (
        <PeriodCards
          tone="success"
          title={bilingualText(lang, "शुभ समय", "Auspicious periods")}
          items={data.shubha.map((s, i) => ({
            n: digits(i + 1),
            label: bilingualText(lang, s.name, s.nameEn),
            time: `${tLabel(s.startG)} – ${tLabel(s.endG)}`,
          }))}
        />
      )}

      {!chartOnly && p && planets.length > 0 && (
        <div className={cn("flex flex-col gap-2.5 border-t border-border px-4 py-3 pb-3.5")}>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-sm font-bold leading-tight">{bilingualText(lang, "ग्रह", "Planets")}</span>
            <span className="min-w-0 text-sm leading-snug break-words [overflow-wrap:anywhere]">
              {getPlanetsAnchorLabel(p, lang)}
            </span>
          </div>
          <div className="grid grid-cols-2 min-[380px]:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
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
              const labelL = bilingualText(lang, label, labelEn);
              const isLagna = planetKey === "lagna";
              // English readers get the western sign (Leo), not the Sanskrit
              // romanization the API sends in `rashiEn` (Simha).
              const rashiL =
                formatRashiDisplay(rashiNe, rashiEn, lang) ??
                resolveRashiDisplay(rashiNe, rashiEn, lang) ??
                "—";
              // `07° सिंह 10′ 28″` when the longitude is known, else the |-cells fallback.
              const coordText =
                siderealLongitude != null
                  ? formatDegreeInRashi(siderealLongitude, rashiL)
                  : coords;
              const nakName = bilingualText(lang, nakshatraNe, nakshatraEn ?? nakshatraNe);
              const nakWithPada =
                nakName && pada != null ? `${nakName} (${digits(pada)})` : nakName ?? undefined;
              const lordL = bilingualText(lang, nakshatraLordNe, nakshatraLordEn ?? nakshatraLordNe);
              const subLordL = bilingualText(lang, nakshatraSubLordNe, nakshatraSubLordEn ?? nakshatraSubLordNe);
              const lordText = lordL
                ? subLordL
                  ? `${lordL}/${subLordL}`
                  : lordL
                : undefined;
              return (
              <div
                key={planetKey}
                className={cn(
                  "flex w-full min-w-0 flex-col gap-0.5 rounded-lg px-2 py-1.5 shadow-[0_0_0_1px_color-mix(in_srgb,var(--foreground)_10%,transparent)]",
                  isLagna ? "bg-secondary/12" : "bg-foreground/4",
                )}
                title={[
                  labelL,
                  coordText,
                  nakWithPada,
                  lordText && `${bilingualText(lang, "नक्षत्रेश / उप", "Lord / Sub")} ${lordText}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                    <span className="flex items-center gap-1 text-sm font-bold leading-tight">
                      {isGrahaKey(planetKey) ? (
                        <GrahaPlanetIcon graha={planetKey} size={18} className="-my-0.5" />
                      ) : null}
                      {labelL}
                      <GrahaStatusBadges
                        planetKey={planetKey}
                        isRetrograde={isRetrograde}
                        isCombust={isCombust}
                        size={13}
                      />
                    </span>
                    <span
                      className={cn(
                        patroMono,
                        "min-w-0 text-sm tabular-nums leading-tight break-all [overflow-wrap:anywhere]",
                      )}
                    >
                      {coordText}
                    </span>
                  </div>
                  {(nakWithPada || lordText) && (
                    <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-sm leading-tight">
                      {nakWithPada ? (
                        <span className="min-w-0 break-words [overflow-wrap:anywhere]">{nakWithPada}</span>
                      ) : null}
                      {lordText ? (
                        <span
                          className="min-w-0 break-words font-semibold text-secondary [overflow-wrap:anywhere]"
                          title={bilingualText(lang, "नक्षत्रेश / उप स्वामी", "Nakshatra lord / sub-lord")}
                        >
                          {lordText}
                        </span>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * शुभ / अशुभ periods rendered as a responsive card grid: number badge + name on
 * top, the time range pinned to the bottom so every card lines up regardless of
 * name length. `tone` swaps the danger/success accent.
 */
function PeriodCards({
  tone,
  title,
  items,
}: {
  tone: "danger" | "success";
  title: string;
  items: { n: string; label: string; time: string }[];
}) {
  const accent = tone === "danger" ? "var(--color-danger)" : "var(--color-success)";
  return (
    <div className="flex flex-col gap-2 border-t border-border px-4 py-3">
      <span className="text-sm font-bold leading-tight" style={{ color: accent }}>
        {title}
      </span>
      <ol className="grid grid-cols-2 gap-2 min-[420px]:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {items.map((it, i) => (
          <li
            key={`${it.time}-${i}`}
            className="flex min-w-0 flex-col gap-1.5 rounded-lg border px-2.5 py-2"
            style={{
              borderColor: `color-mix(in srgb, ${accent} 28%, transparent)`,
              background: `color-mix(in srgb, ${accent} 7%, transparent)`,
            }}
          >
            <div className="flex min-w-0 items-start gap-1.5">
              <span
                className="mt-px inline-flex h-[17px] min-w-[17px] shrink-0 items-center justify-center rounded-full px-1 text-sm font-bold text-white"
                style={{ background: accent }}
              >
                {it.n}
              </span>
              <span className="min-w-0 text-sm font-semibold leading-snug break-words [overflow-wrap:anywhere] [font-family:var(--pn-font)]">
                {it.label}
              </span>
            </div>
            <span className="mt-auto text-sm font-semibold tabular-nums [font-family:var(--pn-font)]">
              {it.time}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** ↔ marker on the row horizontal line at a segment boundary. */
function TransitionArrow({ x2, y }: { x2: number; y: number }) {
  const rowY = y + BAND;

  return (
    <g className={pgxArrow}>
      <line x1={x2 - 14} y1={rowY} x2={x2 - 5} y2={rowY} />
      <path d={`M ${x2 - 6} ${rowY - 3.6} L ${x2 - 1.5} ${rowY} L ${x2 - 6} ${rowY + 3.6} z`} />
      <line x1={x2 + 14} y1={rowY} x2={x2 + 5} y2={rowY} />
      <path d={`M ${x2 + 6} ${rowY - 3.6} L ${x2 + 1.5} ${rowY} L ${x2 + 6} ${rowY + 3.6} z`} />
      <line className={pgxArrowBound} x1={x2} y1={rowY - 5} x2={x2} y2={rowY + 5} />
    </g>
  );
}

function SunHalfIcon({ x, y, variant }: { x: number; y: number; variant: "rise" | "set" }) {
  const { w: vbW, h: vbH } = SUNRISE_ICON_VIEWBOX;
  const width = SUN_R * 2 + 10;
  const scale = width / vbW;
  const h = vbH * scale;
  const left = x - width / 2;
  const top = variant === "rise" ? y - h : y;
  const cx = vbW / 2;
  const cy = vbH / 2;
  const inner = variant === "set" ? `rotate(180 ${cx} ${cy})` : undefined;

  return (
    <g aria-hidden transform={`translate(${left}, ${top}) scale(${scale})`}>
      <g transform={inner}>
        <path d={SUNRISE_ICON_PATH} className={pgTlSunDisc} />
      </g>
    </g>
  );
}

function EventMarker({
  g,
  sunriseMin,
  kind,
  anchor,
  tithiIndex,
}: {
  g: number;
  sunriseMin: number;
  kind: "sunrise" | "sunset" | "moonrise" | "moonset" | "next-sunrise";
  anchor: "start" | "middle" | "end";
  tithiIndex?: number | null;
}) {
  const { clock } = dualTimeAtGhati(g, sunriseMin);
  const x = gx(g);
  const labelX = anchor === "start" ? x : anchor === "end" ? x : x;
  const isSun = kind === "sunrise" || kind === "sunset" || kind === "next-sunrise";
  const sunVariant = kind === "sunset" ? "set" : "rise";

  return (
    <g>
      {isSun ? (
        <SunHalfIcon x={x} y={SUNLINE_Y} variant={sunVariant} />
      ) : tithiIndex != null ? (
        <MoonMarkerIcon x={x} y={MOON_EMOJI_Y} tithiIndex={tithiIndex} />
      ) : null}
      <text
        x={labelX}
        y={isSun ? MARKER_TIME_Y : MOON_TIME_Y}
        textAnchor={anchor}
        className={pgTlEventTimeMoon(!isSun)}
      >
        {clock}
      </text>
    </g>
  );
}
