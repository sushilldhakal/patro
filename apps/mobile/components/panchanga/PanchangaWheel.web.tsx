import { useTranslation } from "@/lib/i18n";
import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import CalendarDays from "lucide-react/dist/esm/icons/calendar-days";
import Clock from "lucide-react/dist/esm/icons/clock";
import FastForward from "lucide-react/dist/esm/icons/fast-forward";
import Fullscreen from "lucide-react/dist/esm/icons/fullscreen";
import Minimize2 from "lucide-react/dist/esm/icons/minimize-2";
import Pause from "lucide-react/dist/esm/icons/pause";
import Play from "lucide-react/dist/esm/icons/play";
import Rewind from "lucide-react/dist/esm/icons/rewind";
import RotateCcw from "lucide-react/dist/esm/icons/rotate-ccw";
import ZoomIn from "lucide-react/dist/esm/icons/zoom-in";
import ZoomOut from "lucide-react/dist/esm/icons/zoom-out";
import type { PanchangaDay } from "@/lib/api";
import { fetchPanchangaAtTime, panchangaKeys } from "@/lib/api";
import { getPanchangaDetail } from "@/lib/panchanga-format.web";
import { minutesSinceMidnightInTimezone, resolveTimeZone } from "@/lib/zoned-time";
import {
  buildWheelDetail,
  buildWheelMarkers,
  buildWheelMarkersAtTime,
  buildWheelMarkersFromDetail,
  DEFAULT_WHEEL_TWEAKS,
  gClock,
  scrubGToDatetime,
  WHEEL_RASHIS,
  type WheelDetail,
} from "@/lib/wheel-data";
import { NAKSHATRA_ICONS } from "@vedic-patro/domain/nakshatra-icons";
import type { YearWheelScrub } from "@/lib/wheel-year-scrub";
import { WheelChart, type WheelHover, type WheelPick } from "./WheelChart";
import { WheelPanel } from "./WheelPanel";
import { PlanetSelectMenu } from "./PlanetSelectMenu";
import { BsDateTimePicker } from "./BsDateTimePicker";
import { windowedBrowseYears } from "@/lib/patro-browse-years";
import { useLocale } from "@/lib/i18n";
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
} from "@/lib/wheel-classes";
import { cn } from "@/lib/utils";
import { BS_MONTHS_NE, BS_MONTH_NAMES } from "@/lib/bs-calendar";
import { NAK_LORD_EN } from "@vedic-patro/domain/wheel-locale";

function bsMonthEnOf(ne: string): string {
  const i = BS_MONTHS_NE.indexOf(ne);
  return i >= 0 ? BS_MONTH_NAMES[i] : ne;
}

const wheelDockIcon = "h-3.5 w-3.5 max-[480px]:h-3 max-[480px]:w-3";
const wheelCornerBtn =
  "flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(143,191,193,0.32)] bg-[rgba(11,20,22,0.96)] text-[var(--w-ink)] shadow-[0_8px_20px_rgba(0,0,0,0.4)] transition-colors hover:border-[var(--w-accent)] max-[480px]:h-8 max-[480px]:w-8";

export type { YearWheelScrub };

/** Year-view playback controls (rewind / play-pause / fast-forward) for the dock. */
function WheelYearPlayback({ scrub }: { scrub: YearWheelScrub }) {
  const { t } = useTranslation();
  const { pick, digits } = useLocale();
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
        aria-label={pick("पछाडि", "Rewind")}
        aria-pressed={direction === -1}
        title={speedTitle(pick("पछाडि चलाउनुहोस्", "Play backward"))}
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
        aria-label={pick("अगाडि", "Fast forward")}
        aria-pressed={direction === 1}
        title={speedTitle(pick("अगाडि चलाउनुहोस्", "Play forward"))}
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
}: {
  eyebrow: React.ReactNode;
  title: React.ReactNode;
  sub: React.ReactNode;
  playRate?: React.ReactNode;
}) {
  return (
    <div className={wheelHead}>
      <div className={wheelHeadEyebrow}>{eyebrow}</div>
      <div className={wheelHeadTitle}>{title}</div>
      <div className={wheelHeadSub}>{sub}</div>
      {playRate ? (
        <div className="text-body mt-1 font-bold tabular-nums text-[#f9c800]">{playRate}</div>
      ) : null}
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
  /**
   * Range view: playback across a window of days. Replaces the whole time dock —
   * the day and the time both come from the page's own date chrome instead.
   */
  yearScrub?: YearWheelScrub;
  /** "HH:MM" — where the needle sits when the wheel has no time slider of its own. */
  clock?: string;
  calendarPick?: {
    year: number;
    month: number;
    day: number;
    clock: string;
    todayAd?: string;
    onCommit: (year: number, month: number, day: number, clock: string) => void;
  };
  /** @deprecated Prefer {@link calendarPick}. */
  onOpenDatePicker?: () => void;
  /** Rendered inside the fullscreen view so a picker can sit above the wheel. */
  fullscreenOverlay?: ReactNode;
  /** Override the inline stage height (native year page). Ignored on web. */
  stageHeight?: number;
}

function PanchangaWheelSkeleton({
  bsYear,
  bsMonthNe,
  bsDay,
  locationLabel,
}: Pick<Props, "bsYear" | "bsMonthNe" | "bsDay" | "locationLabel">) {
  const { pick, digits } = useLocale();
  const num = (n: number | string) => digits(n);
  const locLabel = locationLabel ?? pick("काठमाडौं", "Kathmandu");

  return (
    <div className={cn("pn-wheel", patroWheelShell)} aria-busy="true">
      <div className={wheelStage}>
        <WheelHead
          eyebrow={pick("पञ्चाङ्ग चक्र", "Nepali Patro · Panchanga Wheel")}
          title={
            <>
              {pick("ग्रह–नक्षत्र · तिथि–करण चक्र", "Graha–Nakshatra · Tithi–Karana wheel")}{" "}
              <span className="yr">{num(bsYear)}</span>
            </>
          }
          sub={
            <>
              {pick(bsMonthNe, bsMonthEnOf(bsMonthNe))} {num(bsDay)} · {locLabel}
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
  yearScrub,
  clock,
  calendarPick,
  onOpenDatePicker,
  fullscreenOverlay,
}: WheelBodyProps & { atTimeScrubOnly?: boolean; yearScrub?: YearWheelScrub }) {
  const det: WheelDetail = useMemo(() => buildWheelDetail(p), [p]);
  const tz = resolveTimeZone(p?.location?.timezone, timezone);
  const [now, setNow] = useState(() => new Date());

  const [spin, setSpin] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [picked, setPicked] = useState<WheelPick | null>(null);
  const [hover, setHover] = useState<WheelHover | null>(null);
  const [lineTarget, setLineTarget] = useState(1);
  const [tip, setTip] = useState({ x: 0, y: 0 });
  const [scrubPinned, setScrubPinned] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const expandedHistoryRef = useRef(false);
  const ignorePopRef = useRef(false);

  const setExpandedMode = useCallback((next: boolean) => {
    setPicked(null);
    if (next) {
      if (!expandedHistoryRef.current) {
        window.history.pushState({ panchangaWheelExpanded: true }, "");
        expandedHistoryRef.current = true;
      }
      setExpanded(true);
      return;
    }
    setExpanded(false);
    if (expandedHistoryRef.current) {
      expandedHistoryRef.current = false;
      ignorePopRef.current = true;
      window.history.back();
    }
  }, []);

  const toggleExpanded = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setExpandedMode(!expanded);
    },
    [expanded, setExpandedMode],
  );

  const handleZoom = useCallback(
    (z: number) => {
      const next = Math.max(0.55, Math.min(14, z));
      if (next <= 1) {
        setZoom(next);
        setPan({ x: 0, y: 0 });
        return;
      }
      /* Scaling happens around the view's own center (transformOrigin:
       * center), so leaving pan untouched pulls the image back toward the
       * wheel's absolute center on every zoom step instead of holding what's
       * currently on screen in place — scale it by the same ratio as the
       * zoom change to compensate. The pinch/drag path also calls this, but
       * follows up with its own handlePan in the same tick, which overwrites
       * this with its focal-anchored value. */
      const ratio = next / zoom;
      setZoom(next);
      setPan((p) => ({ x: p.x * ratio, y: p.y * ratio }));
    },
    [zoom],
  );

  const handlePan = useCallback((x: number, y: number) => setPan({ x, y }), []);

  const handleLeave = useCallback(() => setHover(null), []);
  const handlePick = useCallback(
    (pick: WheelPick) =>
      setPicked((prev) =>
        prev && prev.type === pick.type && prev.i === pick.i ? null : pick
      ),
    []
  );

  const nowG = useMemo(() => {
    const mins = minutesSinceMidnightInTimezone(now, tz, true);
    let g = (mins - det.sunriseMin) / 24;
    if (g < 0) g += 60;
    return Math.max(0, Math.min(60, g));
  }, [now, det.sunriseMin, tz]);

  /* Range view: the wheel has no time slider, so the needle follows the clock
     the page's date chrome is holding. */
  const rangeMode = Boolean(yearScrub);
  const clockG = useMemo(() => {
    if (!clock) return null;
    const [h, m] = clock.split(":").map(Number);
    let g = ((h ?? 0) * 60 + (m ?? 0) - det.sunriseMin) / 24;
    if (g < 0) g += 60;
    return Math.max(0, Math.min(60, g));
  }, [clock, det.sunriseMin]);

  const [scrubG, setScrubG] = useState(() => (isToday ? nowG : 0));
  const [debouncedScrubG, setDebouncedScrubG] = useState(scrubG);
  const effectiveG = rangeMode ? (clockG ?? 0) : scrubG;

  useEffect(() => {
    const id = setTimeout(() => setDebouncedScrubG(scrubG), 400);
    return () => clearTimeout(id);
  }, [scrubG]);

  const anchorAd = p.panchanga_date_ad ?? p.date_ad ?? "";
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

  const scrubDatetime = useMemo(
    () => scrubGToDatetime(anchorAd, debouncedScrubG, det.sunriseMin),
    [anchorAd, debouncedScrubG, det.sunriseMin]
  );

  const scrubbing =
    scrubPinned || Math.abs(scrubG - (isToday && !scrubPinned ? nowG : 0)) > 0.05;

  /* Playback would queue an at-time request per tick and draw none of them, so
     the range view stays on the day's own state and moves the needle locally. */
  const needsAtTime =
    Boolean(anchorAd) &&
    !rangeMode &&
    (scrubbing || (isToday && !atTimeScrubOnly));

  const scrubQ = useQuery({
    queryKey: panchangaKeys.atTime(scrubDatetime, locationParams),
    queryFn: () => fetchPanchangaAtTime(scrubDatetime, locationParams),
    staleTime: 1000 * 60,
    placeholderData: keepPreviousData,
    enabled: needsAtTime,
  });

  /**
   * The exact-moment `/panchanga/at-time` payload is only trustworthy when the
   * at-time query is actually driving the current view (`needsAtTime`) AND the
   * data belongs to the settled datetime rather than a leftover from a previous
   * scrub/day (`!isPlaceholderData`). A disabled query keeps its last `data`, so
   * without this guard the wheel would freeze on stale markers when the day
   * changes via the year-view autoplay / day slider (and would lag the time
   * slider during the debounced refetch). When the guard fails we fall back to
   * the live sunrise-extrapolated estimate, which tracks `p`/`scrubG` instantly.
   */
  const atTimeData =
    needsAtTime && !scrubQ.isPlaceholderData ? scrubQ.data : undefined;

  const markers = useMemo(() => {
    if (atTimeData) return buildWheelMarkersAtTime(atTimeData);
    /* Year playback steps a day at a time. Each payload already has that day's
       sunrise graha longitudes. Feeding `effectiveG` (from the page clock)
       through `moonLonAtG` then extrapolates another half-day of motion on top
       — and when the clock later snaps to the new sunrise, the moon jumps
       back. At 2×/4×/8× that reads as planets circling, then reversing. Use
       the day's own snapshot so they only ever advance along the orbit. */
    if (rangeMode) return buildWheelMarkersFromDetail(det);
    return buildWheelMarkers(p, det, effectiveG);
  }, [atTimeData, p, det, effectiveG, rangeMode]);

  const handleScrubChange = useCallback((g: number) => {
    setScrubG(g);
    setScrubPinned(true);
  }, []);

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
    /* Re-renders the whole chart body, not just the needle — see the native
       PanchangaWheel.tsx for the on-device jank this caused at 1s. The needle
       only needs to look live, not be to-the-second accurate. */
    const id = setInterval(() => setNow(new Date()), 20000);
    return () => clearInterval(id);
  }, [isToday]);

  useEffect(() => {
    if (scrubPinned || !isToday) return;
    setScrubG(nowG);
  }, [nowG, isToday, scrubPinned]);

  useEffect(() => {
    setScrubPinned(false);
    setSpin(0);
    if (isToday) {
      setScrubG(nowG);
    } else {
      setScrubG(0);
    }
    // Only when the civil/vedic day changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.date_ad, p.panchanga_date_ad]);

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

  useEffect(() => {
    const onPopState = () => {
      if (ignorePopRef.current) {
        ignorePopRef.current = false;
        return;
      }
      expandedHistoryRef.current = false;
      setExpanded(false);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const { pick, digits } = useLocale();
  const stageRef = useRef<HTMLDivElement>(null);
  const num = (n: number | string) => digits(n);
  const scrubClock = gClock(effectiveG, det.sunriseMin);
  const scrubTithi = atTimeData
    ? (getPanchangaDetail(atTimeData)?.tithi as { name_ne?: string; name?: string } | undefined) ??
      (atTimeData.tithi as { name_ne?: string; name?: string } | undefined)
    : undefined;
  const tithiNe = scrubTithi?.name_ne ?? det.tithi2[0]?.ne ?? "—";
  const tithiEn = scrubTithi?.name ?? det.tithi2[0]?.en ?? tithiNe;
  const locLabel = locationLabel ?? p.location?.name ?? pick("काठमाडौं", "Kathmandu");
  const pickerYear = calendarPick?.year ?? bsYear;
  const pickerMonth = calendarPick?.month ?? (BS_MONTHS_NE.indexOf(bsMonthNe) + 1 || 1);
  const pickerDay = calendarPick?.day ?? bsDay;
  const pickerClock = calendarPick?.clock ?? clock ?? scrubClock;
  const pickerYears = useMemo(() => windowedBrowseYears("bs", pickerYear), [pickerYear]);
  const calendarDraftRef = useRef({
    year: pickerYear,
    month: pickerMonth,
    day: pickerDay,
    clock: pickerClock,
  });

  const openCalendar = useCallback(() => {
    yearScrub?.onPause();
    if (onOpenDatePicker && !calendarPick) {
      onOpenDatePicker();
      return;
    }
    calendarDraftRef.current = {
      year: pickerYear,
      month: pickerMonth,
      day: pickerDay,
      clock: pickerClock,
    };
    setCalendarOpen(true);
  }, [calendarPick, onOpenDatePicker, pickerClock, pickerDay, pickerMonth, pickerYear, yearScrub]);

  const handleCalendarCommit = useCallback(
    (year: number, month: number, day: number, nextClock: string) => {
      if (!rangeMode) {
        const [h, m] = nextClock.split(":").map(Number);
        let g = ((h ?? 0) * 60 + (m ?? 0) - det.sunriseMin) / 24;
        if (g < 0) g += 60;
        setScrubG(Math.max(0, Math.min(60, g)));
        setScrubPinned(true);
      }
      calendarPick?.onCommit(year, month, day, nextClock);
      setCalendarOpen(false);
    },
    [calendarPick, det.sunriseMin, rangeMode],
  );

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
          <div className={wheelTipKind}>{pick("नक्षत्र", "Nakshatra")} · {num(hover.i + 1)}</div>
          <div className={wheelTipTitle}>{pick(ic.ne, ic.en)}</div>
          <div className={wheelTipRow}>
            <span>{pick("स्वामी", "Lord")}</span>
            <b>{pick(ic.lord_ne, NAK_LORD_EN[ic.lord_ne] ?? ic.lord_ne)}</b>
          </div>
          <div className={wheelTipSym}>{ic.sym_ne}</div>
        </div>
      );
    } else {
      const rs = WHEEL_RASHIS[hover.i]!;
      tipNode = (
        <div className={wheelTip(true)} style={{ left: tip.x, top: tip.y }}>
          <div className={wheelTipKind}>{pick("राशि", "Rashi")} · {num(hover.i + 1)}</div>
          <div className={wheelTipTitle}>
            {pick(rs.ne, rs.en)}
          </div>
          <div className={wheelTipRow}>
            <span>{pick("महिना", "Month")}</span>
            <b>{pick(bsMonthNe, bsMonthEnOf(bsMonthNe))}</b>
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
          eyebrow={pick("पञ्चाङ्ग चक्र", "Nepali Patro · Panchanga Wheel")}
          title={
            <>
              {isToday && !scrubPinned ? pick("आजको", "Today's") : ""}{" "}
              {pick("ग्रह–नक्षत्र · तिथि–करण चक्र", "Graha–Nakshatra · Tithi–Karana wheel")}
            </>
          }
          sub={
            <>
              {pick(bsMonthNe, bsMonthEnOf(bsMonthNe))} {num(bsDay)}, {num(bsYear)} · {num(pickerClock)}
              {" · "}
              {pick(det.weekday.ne, det.weekday.en)}
              {" · "}
              {pick(tithiNe, tithiEn)}
            </>
          }
          playRate={
            yearScrub?.playbackRateLabel && yearScrub.direction !== 0 ? (
              <>
                {yearScrub.playbackRateLabel}
                <span className="text-[var(--w-ink)]"> · {num(yearScrub.speed)}×</span>
              </>
            ) : undefined
          }
        />

        <div className="pointer-events-auto absolute top-4 right-3 z-[40] flex items-center gap-1.5">
          <button
            type="button"
            className={wheelCornerBtn}
            title={pick("मिति र समय", "Date and time")}
            aria-label={pick("मिति र समय", "Date and time")}
            onClick={openCalendar}
          >
            <CalendarDays className="h-4 w-4" strokeWidth={2} aria-hidden />
          </button>
          <button
            type="button"
            className={wheelCornerBtn}
            title={pick("रिलोड · जुम रिसेट · सूर्योदय", "Reload · reset zoom · sunrise")}
            aria-label={pick("रिलोड", "Reload")}
            onClick={resetToSunrise}
          >
            <RotateCcw className="h-4 w-4" strokeWidth={2} aria-hidden />
          </button>
          <button
            type="button"
            className={wheelCornerBtn}
            title={
              expanded
                ? pick("सामान्य दृश्य", "Exit full width")
                : pick("पूर्ण चौडाइ", "Full width view")
            }
            aria-label={
              expanded
                ? pick("सामान्य दृश्य", "Exit full width")
                : pick("पूर्ण चौडाइ", "Full width view")
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
          sel={picked}
          hover={hover}
          onHover={setHover}
          onLeave={handleLeave}
          onPick={handlePick}
          onSpin={setSpin}
          zoom={zoom}
          onZoom={handleZoom}
          pan={pan}
          onPan={handlePan}
          lineTarget={lineTarget}
          onLineTargetChange={setLineTarget}
        />

        {tipNode}

        <WheelPanel
          sel={picked}
          open={!!picked}
          num={num}
          onClose={() => setPicked(null)}
        />

        <div className={wheelLegend}>
          <div className={wheelLegendRow}>
            <span className={wheelLegendDot} style={{ background: "var(--w-accent)" }} />
            {pick("वर्तमान नक्षत्र · तिथि", "Current nakshatra · tithi")}
          </div>
          <div className={wheelLegendRow}>
            <span className={wheelLegendDot} style={{ background: "#f2a81d" }} />
            {pick("सूर्य राशि", "Sun sign")}
          </div>
          <div className={wheelLegendRow}>
            <span className={wheelLegendDot} style={{ background: "#d3dce4" }} />
            {pick("चन्द्र राशि", "Moon sign")}
          </div>
          <div className={cn(wheelLegendRow, "mt-0.5 opacity-70")}>
            {pick("घुमाउन तान्नुहोस् · जुम गर्नुहोस् · दुई औंलाले सार्नुहोस्", "Drag to rotate · pinch to zoom · two fingers to pan")}
          </div>
        </div>

        <div className={wheelDock}>
          {yearScrub ? (
            <>
              <WheelYearPlayback scrub={yearScrub} />
              <div className={wheelDockSep} />
              <div className={cn(wheelDockGrp, "min-w-0 justify-center")}>
                <span className={cn(wheelDockVal, "min-w-0 whitespace-nowrap")}>
                  {num(yearScrub.dayInYear ?? yearScrub.day)}
                  <span className="text-[var(--w-ink-dim)]">
                    /{num(yearScrub.daysInYear ?? yearScrub.totalDays)}
                  </span>
                </span>
              </div>
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
                <span className={wheelDockLabel}>{pick("समय", "Time")}</span>
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
                    title={pick("अहिलेको समय", "Current time")}
                    onClick={snapToNow}
                  >
                    {pick("आज", "Now")}
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
    </div>
  );

  const calendarDialog = calendarOpen ? (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/70 p-4">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label={pick("बन्द गर्नुहोस्", "Close")}
        onClick={() => setCalendarOpen(false)}
      />
      <div className="relative z-[141] w-full max-w-[22rem] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between px-4 pt-3.5 pb-1">
          <h2 className="text-body font-bold text-foreground">{pick("मिति र समय", "Date and time")}</h2>
          <button
            type="button"
            className="text-body text-muted-foreground"
            onClick={() => setCalendarOpen(false)}
          >
            {pick("बन्द", "Close")}
          </button>
        </div>
        <BsDateTimePicker
          year={pickerYear}
          month={pickerMonth}
          day={pickerDay}
          yearOptions={pickerYears}
          todayAd={calendarPick?.todayAd}
          onSelectDate={(y, m, d) => {
            calendarDraftRef.current = { ...calendarDraftRef.current, year: y, month: m, day: d };
          }}
          monthAriaLabel={pick("महिना", "Month")}
          yearAriaLabel={pick("वर्ष", "Year")}
          clock={pickerClock}
          onClockChange={(next) => {
            calendarDraftRef.current = { ...calendarDraftRef.current, clock: next };
          }}
          hourAriaLabel={pick("घण्टा", "Hour")}
          minuteAriaLabel={pick("मिनेट", "Minute")}
          showTime
          onDone={() => {
            const next = calendarDraftRef.current;
            handleCalendarCommit(next.year, next.month, next.day, next.clock);
          }}
        />
      </div>
    </div>
  ) : null;

  const withOverlay = (
    <>
      {wheelNode}
      {expanded ? fullscreenOverlay : null}
      {calendarDialog}
    </>
  );

  return expanded ? createPortal(withOverlay, document.body) : (
    <>
      {wheelNode}
      {calendarDialog}
    </>
  );
}

function PanchangaWheelImpl(props: Props) {
  const { loading = false, p, atTimeScrubOnly, yearScrub, ...rest } = props;
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
      {...rest}
    />
  );
}

export const PanchangaWheel = memo(PanchangaWheelImpl);
