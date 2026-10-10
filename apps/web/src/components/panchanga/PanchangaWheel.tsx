import { useTranslation } from "react-i18next";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  FastForward,
  Fullscreen,
  Minimize2,
  Pause,
  Play,
  Rewind,
  RotateCcw,
} from "lucide-react";
import type { PanchangaDay } from "@/lib/api";
import { fetchPanchangaAtTimeForDay, fetchPanchangaAtTimeJd, panchangaKeys } from "@/lib/api";
import type { PatroDayFetchState } from "@/lib/patro-day-url";
import { getPanchangaDetail } from "@/lib/panchanga-format";
import { minutesSinceMidnightInTimezone, resolveTimeZone } from "@/lib/zoned-time";
import { parseClockParts } from "./use-panchanga-mode";
import {
  buildWheelDetail,
  buildWheelMarkers,
  buildWheelMarkersAtTime,
  buildWheelMarkersFromDetail,
  DEFAULT_WHEEL_TWEAKS,
  gClock,
  scrubGToAtTimeQuery,
  getWheelRashis,
  type WheelDetail,
} from "@/lib/wheel-data";
import { NAKSHATRA_ICONS } from "@/lib/nakshatra-icons";
import { WheelChart, type WheelHover } from "./WheelChart";
import { PlanetSelectMenu } from "./PlanetSelectMenu";
import { useLocale, bilingualText } from "@/i18n/locale";
import { patroSkel, patroWheelShell } from "@/lib/patro-classes";
import {
  wheelDock,
  wheelDockGrp,
  wheelDockLabel,
  wheelDockSep,
  wheelDockTimeGrp,
  wheelDockTodayBtn,
  wheelDockVal,
  wheelExpandedShell,
  wheelHead,
  wheelHeadEyebrow,
  wheelHeadSub,
  wheelHeadTitle,
  wheelIconBtn,
  wheelLegend,
  wheelLegendDot,
  wheelLegendRow,
  wheelScrub,
  wheelStage,
  wheelStageExpanded,
  wheelSvgWrap,
  wheelTip,
  wheelTipKind,
  wheelTipRow,
  wheelTipSym,
  wheelTipTitle,
  wheelYearScrubBtnActive,
  wheelYearScrubSpeed,
  wheelPlayRateBadge,
} from "@/lib/wheel-classes";
import { cn } from "@/lib/utils";
import { BS_MONTHS_NE, BS_MONTH_NAMES } from "@/lib/bs-calendar";
import { NAK_LORD_EN } from "@/lib/wheel-locale";
import type { Era } from "@/lib/era";
import type { LocationParams } from "@/lib/api";
import { BsDateTimePicker } from "@/components/panchanga/BsDateTimePicker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function bsMonthEnOf(ne: string): string {
  const i = BS_MONTHS_NE.indexOf(ne);
  return i >= 0 ? BS_MONTH_NAMES[i] : ne;
}

const wheelDockIcon = "h-3.5 w-3.5 max-[480px]:h-3 max-[480px]:w-3";

function gFromClock(clock: string, sunriseMin: number): number {
  const { hour, minute } = parseClockParts(clock);
  let g = (hour * 60 + minute - sunriseMin) / 24;
  if (g < 0) g += 60;
  return Math.max(0, Math.min(60, g));
}
const wheelCornerBtn =
  "flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(143,191,193,0.32)] bg-[rgba(11,20,22,0.96)] text-[var(--w-ink)] shadow-[0_8px_20px_rgba(0,0,0,0.4)] transition-colors hover:border-[var(--w-accent)] max-[480px]:h-8 max-[480px]:w-8";

export type YearWheelCalendarPick = {
  era: Era;
  year: number;
  month: number;
  day: number;
  yearOptions: number[];
  todayAd?: string;
  clock: string;
  locationParams?: LocationParams;
  onCommit: (era: Era, year: number, month: number, day: number, clock: string) => void;
  onEraChange?: (era: Era) => void;
  /** Month grid calendar — Vikram (bs/bbs) by default; ad for Gregorian browse. */
  gridEra?: "bs" | "bbs" | "ad";
};

export type YearWheelScrub = {
  /** Global day index across the whole range (single year ⇒ 1..365). */
  day: number;
  /** Total days across the whole range. */
  totalDays: number;
  /** Autoplay direction: -1 backward, 0 paused, 1 forward. */
  direction: -1 | 0 | 1;
  /** Autoplay speed multiplier while playing: 1 | 2 | 4 | 8. */
  speed: number;
  /** e.g. "2 weeks / 1 sec" while autoplay is running. */
  playbackRateLabel?: string;
  /** Full-screen date + time jump dialog. */
  calendarPick?: YearWheelCalendarPick;
  /** Play/step forward — repeated presses ramp 1×→2×→4×→8×. */
  onForward: () => void;
  /** Play/step backward — repeated presses ramp 1×→2×→4×→8×. */
  onBackward: () => void;
  /** Stop playback (resets speed). */
  onPause: () => void;
  /** Receives the global day index; the page maps it back to (year, day). */
  onDayChange: (day: number) => void;
  /** Jump straight to a day-in-year (1-based) within the active year; pauses playback. */
  onJumpDay: (dayInYear: number) => void;
  onScrubStart: () => void;
  onScrubEnd: () => void;
  /** Multi-year range context — shows the active year + day-in-year label. */
  yearLabel?: string;
  dayInYear?: number;
  daysInYear?: number;
};

/** Year-view playback controls (rewind / play-pause / fast-forward) for the dock. */
function WheelYearPlayback({ scrub }: { scrub: YearWheelScrub }) {
  const { t } = useTranslation();
  const { lang, digits } = useLocale();
  const { direction, speed, onForward, onBackward, onPause } = scrub;
  const num = (n: number) => digits(n);
  const playing = direction !== 0;
  const speedTitle = (base: string) => (playing ? `${base} · ${num(speed)}×` : base);

  return (
    <div className={cn(wheelDockGrp, "shrink-0")}>
      {/* Rewind — press repeatedly to accelerate backward (2×/4×/8×). */}
      <button
        type="button"
        className={cn(wheelIconBtn, direction === -1 && wheelYearScrubBtnActive)}
        onClick={onBackward}
        aria-label={bilingualText(lang, "पछाडि", "Rewind")}
        aria-pressed={direction === -1}
        title={speedTitle(bilingualText(lang, "पछाडि चलाउनुहोस्", "Play backward"))}
      >
        <Rewind className={wheelDockIcon} strokeWidth={2} aria-hidden />
      </button>
      {/* Center: play forward when paused, pause when playing. */}
      <button
        type="button"
        className={wheelIconBtn}
        onClick={playing ? onPause : onForward}
        aria-label={playing ? t("panchanga_year.pause") : t("panchanga_year.play")}
        title={playing ? t("panchanga_year.pause") : t("panchanga_year.play_title")}
      >
        {playing ? (
          <Pause className={wheelDockIcon} strokeWidth={2} aria-hidden />
        ) : (
          <Play className={cn(wheelDockIcon, "translate-x-[1px]")} strokeWidth={2} aria-hidden />
        )}
      </button>
      {/* Fast-forward — press repeatedly to accelerate forward (2×/4×/8×). */}
      <button
        type="button"
        className={cn(wheelIconBtn, direction === 1 && wheelYearScrubBtnActive)}
        onClick={onForward}
        aria-label={bilingualText(lang, "अगाडि", "Fast forward")}
        aria-pressed={direction === 1}
        title={speedTitle(bilingualText(lang, "अगाडि चलाउनुहोस्", "Play forward"))}
      >
        <FastForward className={wheelDockIcon} strokeWidth={2} aria-hidden />
      </button>
      <span className={cn(wheelYearScrubSpeed, !playing && "opacity-0")} aria-hidden={!playing}>
        {num(speed)}×
      </span>
    </div>
  );
}

function WheelHead({
  eyebrow,
  title,
  sub,
  playRate,
  className,
}: {
  eyebrow: React.ReactNode;
  title: React.ReactNode;
  sub: React.ReactNode;
  playRate?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(wheelHead, "top-4", className)}>
      <div className={wheelHeadEyebrow}>{eyebrow}</div>
      <div className={wheelHeadTitle}>{title}</div>
      <div className={wheelHeadSub}>{sub}</div>
      {playRate ? <div className={wheelPlayRateBadge}>{playRate}</div> : null}
    </div>
  );
}

interface Props {
  p?: PanchangaDay;
  bsYear: number;
  bsMonthNe: string;
  bsDay: number;
  isToday?: boolean;
  timezone?: string;
  locationLabel?: string;
  /** First load only — inline placeholder, not the full-page loader. */
  loading?: boolean;
  /** When true, only fetch at-time after the user moves the wheel time slider. */
  atTimeScrubOnly?: boolean;
  /** दिन-रात mode: anchor the time scrubber/clock/now-needle to 00:00 (midnight)
   * instead of sunrise, so the wheel's time axis matches the दिन-रात framing. */
  civil?: boolean;
  /** Year view: vertical day scrub + autoplay on the right inside the wheel. */
  yearScrub?: YearWheelScrub;
  /** Date + time jump dialog from the wheel dock (day page, or year page via yearScrub). */
  calendarPick?: YearWheelCalendarPick;
  /** When set with {@link yearScrub}, the needle follows this clock instead of the wheel time slider. */
  clock?: string;
  /** When set, wheel scrub uses calendar at-time (BBS/BC) instead of raw `jd`. */
  atTimeDayState?: PatroDayFetchState;
}

function PanchangaWheelSkeleton({
  bsYear,
  bsMonthNe,
  bsDay,
  locationLabel,
}: Pick<Props, "bsYear" | "bsMonthNe" | "bsDay" | "locationLabel">) {
  const { lang, digits } = useLocale();
  const num = (n: number | string) => digits(n);
  const locLabel = locationLabel ?? bilingualText(lang, "काठमाडौं", "Kathmandu");

  return (
    <div className={cn("pn-wheel", patroWheelShell)} aria-busy="true">
      <div className={wheelStage}>
        <WheelHead
          eyebrow={bilingualText(lang, "पञ्चाङ्ग चक्र", "Nepali Patro · Panchanga Wheel")}
          title={
            <>
              {bilingualText(lang, "ग्रह–नक्षत्र · तिथि–करण चक्र", "Graha–Nakshatra · Tithi–Karana wheel")}{" "}
              <span className="yr">{num(bsYear)}</span>
            </>
          }
          sub={
            <>
              {bilingualText(lang, bsMonthNe, bsMonthEnOf(bsMonthNe))} {num(bsDay)} · {locLabel}
            </>
          }
        />
        <div className={cn(patroSkel, wheelSvgWrap)} style={{ minHeight: 420, margin: "0 auto" }} />
      </div>
    </div>
  );
}

type WheelBodyProps = Omit<Props, "loading" | "p"> & { p: PanchangaDay };

function PanchangaWheelBody({
  p,
  bsYear,
  bsMonthNe,
  bsDay,
  isToday,
  timezone,
  locationLabel,
  atTimeScrubOnly = false,
  civil = false,
  yearScrub,
  calendarPick,
  clock,
  atTimeDayState,
}: WheelBodyProps & { atTimeScrubOnly?: boolean; civil?: boolean; yearScrub?: YearWheelScrub; clock?: string }) {
  const activeCalendar = calendarPick ?? yearScrub?.calendarPick;
  // दिन-रात re-anchors the time scrubber to midnight: sunriseMin drives every
  // g↔clock / now-needle / scrub-datetime calc, so overriding it to 0 makes the
  // wheel's time axis run 00:00 → 24:00 instead of sunrise → sunrise.
  const det: WheelDetail = useMemo(() => {
    const d = buildWheelDetail(p);
    return civil ? { ...d, sunriseMin: 0 } : d;
  }, [p, civil]);
  const tz = resolveTimeZone(p?.location?.timezone, timezone);
  const [now, setNow] = useState(() => new Date());

  const [spin, setSpin] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [hover, setHover] = useState<WheelHover | null>(null);
  const [lineTarget, setLineTarget] = useState(1);
  const [tip, setTip] = useState({ x: 0, y: 0 });
  const [scrubPinned, setScrubPinned] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const setExpandedMode = useCallback((next: boolean) => {
    setExpanded(next);
  }, []);

  const toggleExpanded = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setExpandedMode(!expanded);
    },
    [expanded, setExpandedMode],
  );

  const handleZoom = useCallback((z: number) => {
    const next = Math.max(0.55, Math.min(14, z));
    setZoom(next);
    if (next <= 1) setPan({ x: 0, y: 0 });
  }, []);

  const handlePan = useCallback((x: number, y: number) => setPan({ x, y }), []);

  const handleLeave = useCallback(() => setHover(null), []);

  const nowG = useMemo(() => {
    const mins = minutesSinceMidnightInTimezone(now, tz, true);
    let g = (mins - det.sunriseMin) / 24;
    if (g < 0) g += 60;
    return Math.max(0, Math.min(60, g));
  }, [now, det.sunriseMin, tz]);

  const rangeMode = Boolean(yearScrub);
  const clockG = useMemo(() => {
    if (!clock) return null;
    return gFromClock(clock, det.sunriseMin);
  }, [clock, det.sunriseMin]);
  const pendingJumpClockRef = useRef<string | null>(null);

  const [scrubG, setScrubG] = useState(() => (isToday ? nowG : 0));
  const [debouncedScrubG, setDebouncedScrubG] = useState(scrubG);
  const markerG = rangeMode ? (clockG ?? 0) : scrubG;

  useEffect(() => {
    const id = setTimeout(() => setDebouncedScrubG(scrubG), 400);
    return () => clearTimeout(id);
  }, [scrubG]);

  const locationParams = useMemo(
    () =>
      p.location?.city_id != null
        ? { city_id: p.location.city_id as number }
        : p.location?.lat != null && p.location?.lon != null
          ? {
              lat: p.location.lat as number,
              lon: p.location.lon as number,
              timezone: p.location.timezone,
            }
          : undefined,
    [p.location]
  );

  const anchorJd = p.jd_ut;
  const scrubAtTime = useMemo(
    () =>
      anchorJd != null
        ? scrubGToAtTimeQuery(anchorJd, debouncedScrubG, det.sunriseMin)
        : null,
    [anchorJd, debouncedScrubG, det.sunriseMin],
  );

  /** HH:MM:00 for at-time API — from JD scrub math or g↔clock when JD is missing. */
  const scrubClockQuery = useMemo(() => {
    if (scrubAtTime) return scrubAtTime.clock;
    const short = gClock(debouncedScrubG, det.sunriseMin);
    return short.includes(":") && short.split(":").length === 2 ? `${short}:00` : short;
  }, [scrubAtTime, debouncedScrubG, det.sunriseMin]);

  const scrubbing =
    !rangeMode &&
    (scrubPinned || Math.abs(scrubG - (isToday && !scrubPinned ? nowG : 0)) > 0.05);

  const canFetchAtTime = scrubAtTime != null || atTimeDayState != null;
  const needsAtTime =
    canFetchAtTime && !rangeMode && (scrubbing || (isToday && !atTimeScrubOnly));
  // JD + day-offset wins over calendar-day+clock. After midnight the clock
  // wraps to 00:00–sunrise on the *next* civil day; asking at-time for that
  // clock on today's y/m/d snaps the moon back to this morning's sunrise.
  const useJdAtTime = scrubAtTime != null;

  const scrubQ = useQuery({
    queryKey:
      !needsAtTime
        ? (["panchanga", "at-time", "idle"] as const)
        : useJdAtTime
          ? panchangaKeys.atTime(scrubAtTime.jd, scrubAtTime.clock, locationParams)
          : atTimeDayState != null
            ? panchangaKeys.atTimeDay(atTimeDayState, scrubClockQuery, locationParams)
            : (["panchanga", "at-time", "idle"] as const),
    queryFn: () => {
      if (useJdAtTime) {
        return fetchPanchangaAtTimeJd(scrubAtTime.jd, scrubAtTime.clock, locationParams);
      }
      if (atTimeDayState != null) {
        return fetchPanchangaAtTimeForDay(atTimeDayState, scrubClockQuery, locationParams, {
          resolvedJdUt: anchorJd ?? undefined,
        });
      }
      throw new Error("at-time fetch requires jd or atTimeDayState");
    },
    staleTime: 1000 * 60,
    placeholderData: keepPreviousData,
    enabled: needsAtTime,
  });

  /**
   * Exact-moment `/panchanga/at-time` is only trustworthy when the query is
   * driving the view AND the payload matches the slider's settled time.
   *
   * The fetch key follows `debouncedScrubG` (400ms), so while the user is
   * still dragging `isPlaceholderData` stays false and the last snapshot
   * would pin the moon in place. Mid-drag we drop it and extrapolate from
   * sunrise so planets follow `scrubG` immediately. Same guard also covers
   * keepPreviousData leftovers when the day changes under year-view autoplay.
   */
  const scrubAheadOfQuery = Math.abs(scrubG - debouncedScrubG) > 0.02;
  const atTimeData =
    needsAtTime && !scrubAheadOfQuery && !scrubQ.isPlaceholderData
      ? scrubQ.data
      : undefined;

  const markers = useMemo(() => {
    if (atTimeData) return buildWheelMarkersAtTime(atTimeData);
    /* Year playback steps a day at a time. Each payload already has that day's
       sunrise graha longitudes. Feeding `markerG` (from the page clock) through
       `moonLonAtG` then extrapolates another half-day of motion on top — and
       when the clock later snaps to the new sunrise, the moon jumps back. At
       2×/4×/8× that reads as planets circling, then reversing. Use the day's
       own snapshot so they only ever advance along the orbit. */
    if (rangeMode) return buildWheelMarkersFromDetail(det);
    return buildWheelMarkers(p, det, markerG);
  }, [atTimeData, p, det, markerG, rangeMode]);

  const handleScrubChange = useCallback((g: number) => {
    setScrubG(g);
    setScrubPinned(true);
  }, []);

  // Commit an edited "HH:MM" clock value → convert to a g-offset from sunrise
  // (mirrors the nowG math) and pin the wheel to that moment of the same day.
  const openYearCalendar = useCallback(() => {
    yearScrub?.onPause();
    setCalendarOpen(true);
  }, [yearScrub]);

  const commitCalendarJump = useCallback(
    (nextEra: Era, y: number, m: number, d: number, nextClock: string) => {
      pendingJumpClockRef.current = nextClock;
      setScrubPinned(true);
      setScrubG(gFromClock(nextClock, det.sunriseMin));
      activeCalendar?.onCommit(nextEra, y, m, d, nextClock);
    },
    [activeCalendar, det.sunriseMin],
  );

  const snapToNow = useCallback(() => {
    setScrubPinned(false);
    setSpin(0);
    setPan({ x: 0, y: 0 });
    handleZoom(1);
    setScrubG(nowG);
  }, [nowG, handleZoom]);

  const resetToSunrise = useCallback(() => {
    setScrubPinned(true);
    setSpin(0);
    setPan({ x: 0, y: 0 });
    handleZoom(1);
    setScrubG(0);
  }, [handleZoom]);

  useEffect(() => {
    if (!isToday) return;
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [isToday]);

  const dayKey = p.panchanga_date_ad ?? p.date_ad;
  const [trackedDayKey, setTrackedDayKey] = useState(dayKey);
  if (dayKey !== trackedDayKey) {
    setTrackedDayKey(dayKey);
    setSpin(0);
    const jumpClock = pendingJumpClockRef.current;
    pendingJumpClockRef.current = null;
    if (jumpClock) {
      setScrubPinned(true);
      setScrubG(gFromClock(jumpClock, det.sunriseMin));
    } else {
      setScrubPinned(false);
      setScrubG(isToday ? nowG : 0);
    }
  }

  useEffect(() => {
    if (scrubPinned || !isToday) return;
    // Live-follow the clock hand when the user has not pinned a custom time.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setScrubG(nowG);
  }, [nowG, isToday, scrubPinned]);

  useEffect(() => {
    if (!expanded) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpandedMode(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [expanded, setExpandedMode]);

  const { lang, digits } = useLocale();
  const stageRef = useRef<HTMLDivElement>(null);
  const num = (n: number | string) => digits(n);
  const scrubClock = rangeMode && clock ? clock.slice(0, 5) : gClock(scrubG, det.sunriseMin);
  const scrubTithi = atTimeData
    ? (getPanchangaDetail(atTimeData)?.tithi as { name_ne?: string; name?: string } | undefined) ??
      (atTimeData.tithi as { name_ne?: string; name?: string } | undefined)
    : undefined;
  const tithiNe = scrubTithi?.name_ne ?? det.tithi2[0]?.ne ?? "—";
  const tithiEn = scrubTithi?.name ?? det.tithi2[0]?.en ?? tithiNe;
  const locLabel = locationLabel ?? p.location?.name ?? bilingualText(lang, "काठमाडौं", "Kathmandu");

  const onStageMove = (e: React.MouseEvent) => {
    const r = stageRef.current?.getBoundingClientRect();
    if (!r) return;
    setTip({ x: e.clientX - r.left, y: e.clientY - r.top });
  };

  let tipNode: React.ReactNode = null;
  if (hover) {
    if (hover.type === "nak") {
      const ic = NAKSHATRA_ICONS[hover.i]!;
      tipNode = (
        <div className={wheelTip(true)} style={{ left: tip.x, top: tip.y }}>
          <div className={wheelTipKind}>{bilingualText(lang, "नक्षत्र", "Nakshatra")} · {num(hover.i + 1)}</div>
          <div className={wheelTipTitle}>{bilingualText(lang, ic.ne, ic.en)}</div>
          <div className={wheelTipRow}>
            <span>{bilingualText(lang, "स्वामी", "Lord")}</span>
            <b>{bilingualText(lang, ic.lord_ne, NAK_LORD_EN[ic.lord_ne] ?? ic.lord_ne)}</b>
          </div>
          <div className={wheelTipSym}>{ic.sym_ne}</div>
        </div>
      );
    } else {
      const rs = getWheelRashis()[hover.i]!;
      tipNode = (
        <div className={wheelTip(true)} style={{ left: tip.x, top: tip.y }}>
          <div className={wheelTipKind}>{bilingualText(lang, "राशि", "Rashi")} · {num(hover.i + 1)}</div>
          <div className={wheelTipTitle}>
            {bilingualText(lang, rs.ne, rs.en)}
          </div>
          <div className={wheelTipRow}>
            <span>{bilingualText(lang, "महिना", "Month")}</span>
            <b>{bilingualText(lang, bsMonthNe, bsMonthEnOf(bsMonthNe))}</b>
          </div>
        </div>
      );
    }
  }

  const wheelNode = (
    <div
      className={cn(
        "pn-wheel",
        expanded ? wheelExpandedShell : patroWheelShell,
      )}
    >
      <div
        className={cn(wheelStage, expanded && wheelStageExpanded)}
        ref={stageRef}
        onMouseMove={onStageMove}
      >
        <WheelHead
          eyebrow={bilingualText(lang, "पञ्चाङ्ग चक्र", "Nepali Patro · Panchanga Wheel")}
          title={
            <>
              {isToday && !scrubPinned ? bilingualText(lang, "आजको", "Today's") : ""}{" "}
              {bilingualText(lang, "ग्रह–नक्षत्र · तिथि–करण चक्र", "Graha–Nakshatra · Tithi–Karana wheel")}{" "}
              <span className="yr">{num(bsYear)}</span>
            </>
          }
          sub={
            <>
              {bilingualText(lang, det.weekday.ne, det.weekday.en)},{" "}
              {bilingualText(lang, bsMonthNe, bsMonthEnOf(bsMonthNe))} {num(bsDay)}, {num(bsYear)} ·{" "}
              <span className="font-num tabular-nums text-[var(--w-ink)]">{num(scrubClock)}</span>
              {" · "}
              {bilingualText(lang, tithiNe, tithiEn)} · {locLabel}
            </>
          }
          playRate={
            yearScrub?.playbackRateLabel && yearScrub.direction !== 0 ? (
              <span aria-live="polite">
                {yearScrub.playbackRateLabel}
                <span className="text-[var(--w-ink)]"> · {num(yearScrub.speed)}×</span>
              </span>
            ) : undefined
          }
        />

        <div className="pointer-events-auto absolute top-4 right-3 z-30 flex items-center gap-1.5">
          {activeCalendar ? (
            <button
              type="button"
              className={wheelCornerBtn}
              title={bilingualText(lang, "मिति र समय छान्नुहोस्", "Pick date and time")}
              aria-label={bilingualText(lang, "मिति र समय छान्नुहोस्", "Pick date and time")}
              onClick={openYearCalendar}
            >
              <CalendarDays className="h-4 w-4" strokeWidth={2} aria-hidden />
            </button>
          ) : null}
          <button
            type="button"
            className={wheelCornerBtn}
            title={bilingualText(
              lang,
              `रिलोड · जुम रिसेट · ${civil ? "मध्यरात" : "सूर्योदय"}`,
              `Reload · reset zoom · ${civil ? "midnight" : "sunrise"}`,
            )}
            aria-label={bilingualText(lang, "रिलोड", "Reload")}
            onClick={resetToSunrise}
          >
            <RotateCcw className="h-4 w-4" strokeWidth={2} aria-hidden />
          </button>
          <button
            type="button"
            className={wheelCornerBtn}
            title={
              expanded
                ? bilingualText(lang, "सामान्य दृश्य", "Exit full width")
                : bilingualText(lang, "पूर्ण चौडाइ", "Full width view")
            }
            aria-label={
              expanded
                ? bilingualText(lang, "सामान्य दृश्य", "Exit full width")
                : bilingualText(lang, "पूर्ण चौडाइ", "Full width view")
            }
            aria-pressed={expanded}
            onClick={toggleExpanded}
          >
            {expanded ? (
              <Minimize2 className="h-4 w-4" strokeWidth={2} aria-hidden />
            ) : (
              <Fullscreen className="h-4 w-4" strokeWidth={2} aria-hidden />
            )}
          </button>
        </div>

        <WheelChart
          det={det}
          markers={markers}
          spin={spin}
          tw={DEFAULT_WHEEL_TWEAKS}
          bsYear={bsYear}
          hover={hover}
          onHover={setHover}
          onLeave={handleLeave}
          onSpin={setSpin}
          zoom={zoom}
          onZoom={handleZoom}
          pan={pan}
          onPan={handlePan}
          lineTarget={lineTarget}
          onLineTargetChange={setLineTarget}
        />

        {tipNode}

        <div className={wheelLegend}>
          <div className={wheelLegendRow}>
            <span className={wheelLegendDot} style={{ background: "var(--w-accent)" }} />
            {bilingualText(lang, "वर्तमान नक्षत्र · तिथि", "Current nakshatra · tithi")}
          </div>
          <div className={wheelLegendRow}>
            <span className={wheelLegendDot} style={{ background: "#f2a81d" }} />
            {bilingualText(lang, "सूर्य राशि", "Sun sign")}
          </div>
          <div className={wheelLegendRow}>
            <span className={wheelLegendDot} style={{ background: "#d3dce4" }} />
            {bilingualText(lang, "चन्द्र राशि", "Moon sign")}
          </div>
          <div className={cn(wheelLegendRow, "mt-0.5 opacity-70")}>
            {bilingualText(lang, "घुमाउन तान्नुहोस् · स्क्रोल गरेर जुम गर्नुहोस्", "Drag to rotate · scroll to zoom")}
          </div>
        </div>

        <div className={wheelDock}>
          {yearScrub ? (
            <>
              <WheelYearPlayback scrub={yearScrub} />
              <div className={wheelDockSep} />
              <div className={cn(wheelDockGrp, "shrink-0")}>
                <PlanetSelectMenu
                  grahas={det.grahas}
                  selected={lineTarget}
                  onSelect={setLineTarget}
                  className={wheelIconBtn}
                  iconSize={18}
                />
              </div>
            </>
          ) : (
            <>
              <div className={wheelDockTimeGrp}>
                <span className={wheelDockLabel}>{bilingualText(lang, "समय", "Time")}</span>
                <input
                  className={wheelScrub}
                  type="range"
                  min="0"
                  max="60"
                  step="0.25"
                  value={scrubG}
                  style={{ "--fill": `${(scrubG / 60) * 100}%` } as React.CSSProperties}
                  onChange={(e) => handleScrubChange(+e.target.value)}
                />
                <span className={wheelDockVal}>{num(scrubClock)}</span>
              </div>
              <div className={wheelDockSep} />
              <div className={cn(wheelDockGrp, "shrink-0")}>
                {isToday && (
                  <button
                    type="button"
                    className={wheelDockTodayBtn}
                    title={bilingualText(lang, "अहिलेको समय", "Current time")}
                    onClick={snapToNow}
                  >
                    {bilingualText(lang, "आज", "Now")}
                  </button>
                )}
                <PlanetSelectMenu
                  grahas={det.grahas}
                  selected={lineTarget}
                  onSelect={setLineTarget}
                  className={wheelIconBtn}
                  iconSize={18}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {activeCalendar ? (
        <Dialog open={calendarOpen} onOpenChange={setCalendarOpen}>
          <DialogContent
            overlayClassName="z-[125] bg-black/70"
            className="z-[130] max-w-[22rem] border-[#3d5c58] bg-[#0d2428] p-4 text-[#e9f3f1] shadow-2xl"
            onCloseAutoFocus={(e) => e.preventDefault()}
            onPointerDownOutside={(e) => {
              const t = e.target as HTMLElement | null;
              if (t?.closest("[data-slot='popover-content']")) e.preventDefault();
            }}
            onFocusOutside={(e) => {
              const t = e.target as HTMLElement | null;
              if (t?.closest("[data-slot='popover-content']")) e.preventDefault();
            }}
            onInteractOutside={(e) => {
              const t = e.target as HTMLElement | null;
              if (t?.closest("[data-slot='popover-content']")) e.preventDefault();
            }}
          >
            <DialogHeader>
              <DialogTitle className="text-[#e9f3f1]">
                {bilingualText(lang, "मिति र समय", "Date and time")}
              </DialogTitle>
            </DialogHeader>
            <BsDateTimePicker
              gridEra={activeCalendar.gridEra ?? "bs"}
              displayEra={activeCalendar.era}
              onEraChange={activeCalendar.onEraChange}
              year={activeCalendar.year}
              month={activeCalendar.month}
              day={activeCalendar.day}
              yearOptions={activeCalendar.yearOptions}
              todayAd={activeCalendar.todayAd}
              onSelectDate={() => {}}
              monthAriaLabel={bilingualText(lang, "महिना", "Month")}
              yearAriaLabel={bilingualText(lang, "वर्ष", "Year")}
              clock={activeCalendar.clock}
              hourAriaLabel={bilingualText(lang, "घण्टा", "Hour")}
              minuteAriaLabel={bilingualText(lang, "मिनेट", "Minute")}
              showTime
              locationParams={activeCalendar.locationParams}
              onCommitDateTime={commitCalendarJump}
              afterCommit={() => setCalendarOpen(false)}
              solidSurface
            />
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );

  return expanded ? createPortal(wheelNode, document.body) : wheelNode;
}

function PanchangaWheelImpl(props: Props) {
  const { loading = false, p, atTimeScrubOnly, yearScrub, calendarPick, ...rest } = props;
  if (loading || !p) {
    return (
      <PanchangaWheelSkeleton
        bsYear={rest.bsYear}
        bsMonthNe={rest.bsMonthNe}
        bsDay={rest.bsDay}
        locationLabel={rest.locationLabel}
      />
    );
  }
  return (
    <PanchangaWheelBody
      p={p}
      atTimeScrubOnly={atTimeScrubOnly}
      yearScrub={yearScrub}
      calendarPick={calendarPick}
      {...rest}
    />
  );
}

export const PanchangaWheel = memo(PanchangaWheelImpl);
