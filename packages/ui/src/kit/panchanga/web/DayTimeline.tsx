import type { ReactNode } from "react";
import type { CivilTimeline, PanchangaDay } from "@vedic-patro/api-client";
import { GrahaPlanetIcon } from "./GrahaPlanetIcon";
import type { GrahaKey } from "@vedic-patro/domain/graha-details";
import {
  formatDegreeInRashi,
  getPlanetsAnchorLabel,
} from "@vedic-patro/domain/panchanga-format";
import { formatRashiDisplay, resolveRashiDisplay } from "@vedic-patro/domain/rashi-i18n";
import {
  dualTimeAtGhati,
} from "@vedic-patro/domain/day-timeline-data";
import { choghadiyaName } from "@vedic-patro/domain/choghadiya-display";
import { useLocale } from "@vedic-patro/i18n/react";
import { bilingualText } from "@vedic-patro/domain/locale";
import { patroCard, patroMono, patroSecBand, patroSkel } from "@vedic-patro/design-tokens/classes/patro-classes";
import { cn } from "@vedic-patro/domain/utils";
import { panchangaPageClasses } from "@vedic-patro/design-tokens/classes/panchanga-page-classes";
import { CalendarMoonPhaseIcon } from "./CalendarMoonPhaseIcon";
import { tithiIndexFromPanchanga } from "@vedic-patro/domain/tithi-wheel-data";
import { SUNRISE_ICON_PATH, SUNRISE_ICON_VIEWBOX } from "@vedic-patro/domain/sunrise-icon-art";
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
} from "@vedic-patro/design-tokens/classes/timeline-classes";
import { type ChartSegment, assignLanes, segmentsFromRow } from "@vedic-patro/domain/day-timeline-layout";

import { useDayCycleToggle, useDayTimeline } from "@vedic-patro/features/panchanga-drawing";
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
/** Sunset glyph hangs below the horizon, so its clock sits just above the icon. */
const SUNSET_TIME_Y = SUNLINE_Y - 7;
const SUN_R = 6;

const GHATI_TICKS = Array.from({ length: 16 }, (_, i) => i * 4);

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
  renderStatus?: (mark: { planetKey: string; isRetrograde?: boolean; isCombust?: boolean; size?: number }) => ReactNode;
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
  const { options, inactive, switchLabel, groupLabel } = useDayCycleToggle(mode);
  const padCls = size === "md" ? "px-3.5 py-1.5 text-sm" : "px-2 py-0.5 text-sm";
  const roundCls = size === "md" ? panchangaPageClasses.dayCycle.toggleRadiusMd : panchangaPageClasses.dayCycle.toggleRadiusSm;
  return (
    <>
      {/* Mobile (<768px): single "switch to …" toggle. */}
      <button
        type="button"
        onClick={() => onModeChange?.(inactive.value)}
        aria-label={switchLabel}
        className={cn(
          "inline-flex items-center justify-center transition-colors hover:bg-surface-hover md:hidden",
          panchangaPageClasses.dayCycle.toggleSingle,
          panchangaPageClasses.dayCycle.toggleLabel,
          padCls,
          roundCls,
        )}
      >
        {inactive.label}
      </button>

      {/* Desktop (≥768px): full segmented control. */}
      <div
        className={cn(
          "hidden md:inline-flex",
          panchangaPageClasses.dayCycle.toggleGroup,
          size === "md" ? panchangaPageClasses.dayCycle.toggleRadiusMd : panchangaPageClasses.dayCycle.toggleRadiusSm,
        )}
        role="radiogroup"
        aria-label={groupLabel}
      >
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={mode === o.value}
            onClick={() => onModeChange?.(o.value)}
            className={cn(
              panchangaPageClasses.dayCycle.toggleLabel,
              "transition-colors !py-1 h-7",
              padCls,
              mode === o.value
                ? panchangaPageClasses.dayCycle.toggleActive
                : cn(panchangaPageClasses.dayCycle.toggleIdle, "hover:bg-surface-hover"),
            )}
          >
            {o.label}
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
  const { copy } = useDayTimeline({ mode });
  const subtitle = copy.subtitle;
  return (
    <div className={patroSecBand}>
      <h2 className={panchangaPageClasses.dayCycle.bandTitle}>{copy.title}</h2>
      <span className={panchangaPageClasses.dayCycle.bandSubtitle}>
        {subtitle}
      </span>
      <span className={cn("inline-flex", panchangaPageClasses.dayCycle.bandLegend, "normal-case tracking-normal")}>
        <span className={cn("inline-flex", panchangaPageClasses.dayCycle.legendItem)}>
          <i className={cn("inline-block", panchangaPageClasses.dayCycle.legendSwatch, "bg-success/34 not-italic")} />
          {copy.good}
          <i className={cn("inline-block", panchangaPageClasses.dayCycle.legendSwatch, "bg-danger/30 not-italic")} />
          {copy.bad}
          <i className={cn("inline-block", panchangaPageClasses.dayCycle.legendSwatch, "bg-secondary/22 not-italic")} />
          {copy.night}
        </span>
        {showToggle && <DayCycleToggle mode={mode} onModeChange={onModeChange} />}
      </span>
    </div>
  );
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
  renderStatus,
}: Props) {
  const { digits, lang } = useLocale();
  const tl = useDayTimeline({ p, dateAd, isToday, timezone, needleClock, showNeedle, loading, mode, civil, civilLoading });
  const { isCivil, data, planets, busy, nowG, nowLabel, copy } = tl;
  const tithiIdx = p ? tithiIndexFromPanchanga(p) : null;
  if (busy || !data) {
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
      const cls = TRACK_CLS[row.en] ?? "tithi";
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
          aria-label={copy.chartAria}
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
            {copy.hour}
          </text>
          {!isCivil && (
            <text x={X0 - 10} y={47} className={pgxScaleLabelDim(true)} textAnchor="end">
              {copy.ghati}
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
              className="absolute right-1.5 -translate-y-1/2 whitespace-nowrap text-xs font-bold leading-none text-foreground [font-family:var(--pn-font)] sm:text-xs lg:text-sm"
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
          title={copy.inauspicious}
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
          title={copy.auspicious}
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
            <span className="text-sm font-bold leading-tight">{copy.planets}</span>
            <span className="min-w-0 text-sm leading-snug break-words [overflow-wrap:anywhere]">
              {getPlanetsAnchorLabel(p, lang)}
            </span>
          </div>
          <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
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
                  lordText && `${copy.lordSub} ${lordText}`,
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
                      {renderStatus?.({ planetKey, isRetrograde, isCombust, size: 13 })}
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
                          title={copy.lordSubTitle}
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
    <div className={cn("flex flex-col", panchangaPageClasses.dayCycle.periodGroup)}>
      <span className={panchangaPageClasses.dayCycle.periodTitle} style={{ color: accent }}>
        {title}
      </span>
      <ol className="grid grid-cols-2 gap-2 xs:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {items.map((it, i) => (
          <li
            key={`${it.time}-${i}`}
            className={cn("flex flex-col", panchangaPageClasses.dayCycle.periodCard)}
            style={{
              borderColor: `color-mix(in srgb, ${accent} 28%, transparent)`,
              background: `color-mix(in srgb, ${accent} 7%, transparent)`,
            }}
          >
            <div className={cn("flex", panchangaPageClasses.dayCycle.periodHead)}>
              <span
                className={cn("inline-flex", panchangaPageClasses.dayCycle.periodBadge, panchangaPageClasses.dayCycle.periodBadgeText)}
                style={{ background: accent }}
              >
                {it.n}
              </span>
              <span className={cn(panchangaPageClasses.dayCycle.periodLabel, "break-words [overflow-wrap:anywhere] [font-family:var(--pn-font)]")}>
                {it.label}
              </span>
            </div>
            <span className={cn("mt-auto", panchangaPageClasses.dayCycle.periodTime, "[font-family:var(--pn-font)]")}>
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
        y={kind === "sunset" ? SUNSET_TIME_Y : isSun ? MARKER_TIME_Y : MOON_TIME_Y}
        textAnchor={anchor}
        className={pgTlEventTimeMoon(!isSun)}
      >
        {clock}
      </text>
    </g>
  );
}
