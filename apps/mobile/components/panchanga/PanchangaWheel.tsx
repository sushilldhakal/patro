import { cn } from "@vedic-patro/domain/utils";
import { memo, useCallback, useEffect, useMemo, useRef, useState, type FC, type ReactNode } from "react";
import { Modal, Pressable, StatusBar, View } from "react-native";
import { Text } from "@/components/ui/Text"
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Slider from "@react-native-community/slider";
import { Ionicons } from "@/components/icons/Ionicons";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { PanchangaDay } from "@/lib/api";
import { fetchPanchangaAtTime, panchangaKeys } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { BottomSheetModal } from "@/components/ui/BottomSheetModal";
import { SkeletonPulse } from "@/components/ui/SkeletonPulse";
import { nepaliLineHeight } from "@/lib/nepali-text";
import { useLocale } from "@/lib/i18n";
import { getPanchangaDetail } from "@vedic-patro/domain/panchanga-format";
import { BS_MONTHS_NE } from "@vedic-patro/domain/bs-calendar";
import { windowedBrowseYears } from "@/lib/patro-browse-years";
import { minutesSinceMidnightInTimezone, resolveTimeZone } from "@vedic-patro/domain/zoned-time";
import { useThemeColors } from "@/lib/theme-context";
import { buildWheelDetail, buildWheelMarkers, buildWheelMarkersAtTime, buildWheelMarkersFromDetail, DEFAULT_WHEEL_TWEAKS, gClock, type WheelGraha } from "@vedic-patro/domain/wheel-data";
import { scrubGToDatetime } from "@/lib/wheel-scrub";
import { useBreakpoint } from "@/lib/responsive";
import {
  computeFullscreenWheelHeight,
  computeInlineWheelStageSize,
} from "@/lib/wheel-layout";
import { wheelPlaceFromClock } from "@vedic-patro/domain/wheel-bodies";
import { WheelChart, type WheelHover, type WheelPick } from "./WheelChart";
import { WheelPanel } from "./WheelPanel";
import { PlanetSelectMenu, WheelDateSheet } from "@vedic-patro/ui/kit/panchanga";
import { SkyTimeSheet } from "@/components/sky3d/SkyTimeSheet";
import { parseClockParts } from "./use-panchanga-mode";
import {
  wheelLegendDot,
  wheelLegendRow,
} from "@/lib/wheel-classes";
import type { YearWheelScrub } from "@/lib/wheel-year-scrub";
import { brand, illustration, midnight, nativeShadow, neutral, radius, wheel, withAlpha } from "@vedic-patro/design-tokens";
import { usePanchangaWheelCopy } from "@vedic-patro/features/panchanga-drawing";

export type { YearWheelScrub };

export type WheelCalendarPick = {
  year: number;
  month: number;
  day: number;
  clock: string;
  todayAd?: string;
  onCommit: (year: number, month: number, day: number, clock: string) => void;
};

const W_BG = wheel.sky1;
const W_ACCENT = brand.vermilion;
const W_INK = midnight.foam;
const W_INK_DIM = withAlpha(wheel.ink, 0.65);
const W_INK_FAINT = withAlpha(wheel.ink, 0.45);
const W_DOCK_BG = withAlpha(wheel.surface, 0.94);
const W_DOCK_BORDER = withAlpha(wheel.line, 0.28);
const wheelDockIconStyle = {
  width: 32,
  height: 32,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  borderRadius: radius.pill,
  borderWidth: 1,
  borderColor: W_DOCK_BORDER,
};
const wheelCornerBtnStyle = {
  width: 36,
  height: 36,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  borderRadius: radius.pill,
  borderWidth: 1,
  borderColor: W_DOCK_BORDER,
  backgroundColor: W_DOCK_BG,
  ...nativeShadow("lg"),
};

const headEyebrowStyle = {
  color: W_INK_FAINT,
  fontWeight: "600" as const,
  letterSpacing: 1.6,
  textTransform: "uppercase" as const,
};
const headTitleStyle = {
  color: W_INK,
  fontWeight: "700" as const,
  /* Devanagari line box, not a Latin one — 24 for 18 px cropped the matras. */
  lineHeight: nepaliLineHeight(18),
};
const headSubStyle = {
  color: W_INK_DIM,
};

type PanchangaWheelProps = {
  p?: PanchangaDay;
  loading?: boolean;
  bsYear: number;
  bsMonthNe: string;
  bsDay: number;
  isToday?: boolean;
  timezone?: string;
  locationLabel?: string;
  /** When true, only fetch at-time state after the user moves the time slider. */
  atTimeScrubOnly?: boolean;
  /**
   * Range view: playback across a window of days. Replaces the whole time dock —
   * the day and the time both come from the page's own date chrome instead.
   */
  yearScrub?: YearWheelScrub;
  /** "HH:MM" — where the needle sits when the wheel has no time slider of its own. */
  clock?: string;
  /** Year / month / day / time picker opened from the top-right date icon. */
  calendarPick?: WheelCalendarPick;
  /** @deprecated Prefer {@link calendarPick}. Still used if the page owns the sheet. */
  onOpenDatePicker?: () => void;
  /** Rendered inside the fullscreen modal so a picker can sit above the wheel. */
  fullscreenOverlay?: ReactNode;
  /** Override the inline stage height (year page fills the remaining viewport). */
  stageHeight?: number;
};


function GhatiScrubber({
  value,
  onChange,
  trackWidth = 120,
}: {
  value: number;
  onChange: (g: number) => void;
  trackWidth?: number;
}) {
  return (
    <Slider
      style={{ width: trackWidth, height: 32 }}
      minimumValue={0}
      maximumValue={60}
      step={0.25}
      value={value}
      onValueChange={onChange}
      minimumTrackTintColor={W_ACCENT}
      maximumTrackTintColor={withAlpha(neutral.white, 0.14)}
      thumbTintColor={W_ACCENT}
      accessibilityLabel="Time scrubber"
    />
  );
}

/** The wheel's date + time dialog: the sky's time sheet in a transparent modal. */
function WheelCalendarModal({
  open,
  onClose,
  year,
  month,
  day,
  clock,
  timeZone,
  playback,
  onCommit,
}: {
  open: boolean;
  onClose: () => void;
  year: number;
  month: number;
  day: number;
  clock: string;
  timeZone?: string;
  playback?: YearWheelScrub;
  onCommit: (year: number, month: number, day: number, clock: string) => void;
}) {
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        {open ? (
          <WheelDateSheet
            year={year}
            month={month}
            day={day}
            clock={clock}
            timeZone={timeZone}
            playback={playback}
            onCommit={(_era, y, m, d, c) => onCommit(y, m, d, c)}
            onClose={onClose}
            renderSheet={(slot) => (
              <SkyTimeSheet
                timeMs={slot.timeMs}
                zoneOffsetMs={slot.zoneOffsetMs}
                transport={slot.transport}
                onApplyMs={slot.onApplyMs}
                onClose={slot.onClose}
              />
            )}
          />
        ) : null}
      </View>
    </Modal>
  );
}

function WheelChrome({
  pick,
  top,
  expanded,
  onReset,
  onToggleFullscreen,
  onOpenDatePicker,
}: {
  pick: (ne: string, en: string) => string;
  top: number;
  expanded: boolean;
  onReset: () => void;
  onToggleFullscreen: () => void;
  onOpenDatePicker: () => void;
}) {
  const copy = usePanchangaWheelCopy();
  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        top,
        right: 12,
        zIndex: 40,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
      }}
    >
      <Pressable
        onPress={onOpenDatePicker}
        style={wheelCornerBtnStyle}
        accessibilityLabel={copy.labels.pickDateTime}
      >
        <Ionicons name="calendar-outline" size={16} color={W_INK} />
      </Pressable>
      <Pressable
        onPress={onReset}
        style={wheelCornerBtnStyle}
        accessibilityLabel={copy.labels.reload}
      >
        <Ionicons name="refresh-outline" size={16} color={W_INK} />
      </Pressable>
      <Pressable
        onPress={onToggleFullscreen}
        style={wheelCornerBtnStyle}
        accessibilityLabel={
          expanded ? copy.labels.exitFullWidth : copy.labels.fullWidth
        }
      >
        <Ionicons name={expanded ? "contract-outline" : "expand-outline"} size={16} color={W_INK} />
      </Pressable>
    </View>
  );
}

/** Year playback + planet needle. Date / reset / fullscreen live in WheelChrome. */
function WheelRangeDock({
  pick,
  digits,
  scrub,
  grahas,
  lineTarget,
  onSelectPlanet,
  bottomInset,
}: {
  pick: (ne: string, en: string) => string;
  digits: (n: number | string) => string | number;
  scrub: YearWheelScrub;
  grahas: WheelGraha[];
  lineTarget: number;
  onSelectPlanet: (index: number) => void;
  bottomInset: number;
}) {
  const copy = usePanchangaWheelCopy();
  const playing = scrub.direction !== 0;
  const dayLabel = scrub.dayInYear ?? scrub.day;
  const totalLabel = scrub.daysInYear ?? scrub.totalDays;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 8,
        right: 8,
        bottom: 14 + bottomInset,
        alignItems: "center",
        zIndex: 22,
      }}
    >
      <View
        className="px-3 py-2"
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          maxWidth: "100%",
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: W_DOCK_BORDER,
          backgroundColor: W_DOCK_BG,
          ...nativeShadow("lg"),
        }}
      >
        <Pressable
          onPress={scrub.onBackward}
          style={[
            wheelDockIconStyle,
            scrub.direction === -1 ? { backgroundColor: W_ACCENT } : null,
          ]}
          accessibilityLabel={copy.labels.playBackward}
        >
          <Ionicons name="play-back" size={15} color={W_INK} />
        </Pressable>
        <Pressable
          onPress={playing ? scrub.onPause : scrub.onForward}
          style={wheelDockIconStyle}
          accessibilityLabel={playing ? copy.labels.pause : copy.labels.play}
        >
          <Ionicons name={playing ? "pause" : "play"} size={15} color={W_INK} />
        </Pressable>
        <Pressable
          onPress={scrub.onForward}
          style={[
            wheelDockIconStyle,
            scrub.direction === 1 ? { backgroundColor: W_ACCENT } : null,
          ]}
          accessibilityLabel={copy.labels.playForward}
        >
          <Ionicons name="play-forward" size={15} color={W_INK} />
        </Pressable>

        <Text className="text-sm" style={{ color: W_INK, fontWeight: "600", flexShrink: 0 }}>
          {digits(dayLabel)}
          <Text style={{ color: W_INK_DIM }}>
            /{digits(totalLabel)}
            {playing ? ` · ${digits(scrub.speed)}×` : ""}
          </Text>
        </Text>

        <View style={{ width: 1, height: 22, backgroundColor: W_DOCK_BORDER }} />
        <PlanetSelectMenu
          grahas={grahas}
          selected={lineTarget}
          onSelect={onSelectPlanet}
          compact
        />
      </View>
    </View>
  );
}

function WheelDock({
  pick,
  digits,
  scrubG,
  scrubClock,
  isToday,
  onScrubChange,
  onSnapNow,
  grahas,
  lineTarget,
  onSelectPlanet,
  scrubTrackWidth,
  bottomInset,
}: {
  pick: (ne: string, en: string) => string;
  digits: (n: number | string) => string | number;
  scrubG: number;
  scrubClock: string;
  isToday?: boolean;
  onScrubChange: (g: number) => void;
  onSnapNow: () => void;
  grahas: WheelGraha[];
  lineTarget: number;
  onSelectPlanet: (index: number) => void;
  scrubTrackWidth: number;
  bottomInset?: number;
}) {
  const copy = usePanchangaWheelCopy();
  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 8,
        right: 8,
        bottom: 14 + (bottomInset ?? 0),
        alignItems: "center",
        zIndex: 22,
      }}
    >
      <View
        pointerEvents="box-none"
        className="px-3.5 py-2.5"
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          maxWidth: "100%",
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: W_DOCK_BORDER,
          backgroundColor: W_DOCK_BG,
          ...nativeShadow("lg"),
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1, minWidth: 0 }}>
          <Text className="text-sm" style={{ color: W_INK_DIM, flexShrink: 0 }}>{copy.labels.time}</Text>
          <GhatiScrubber value={scrubG} onChange={onScrubChange} trackWidth={scrubTrackWidth} />
          <Text className="text-sm" style={{ color: W_INK, minWidth: 52, textAlign: "center", fontWeight: "600" }}>
            {digits(scrubClock)}
          </Text>
        </View>

        <View style={{ width: 1, height: 26, backgroundColor: W_DOCK_BORDER }} />

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {isToday ? (
            <Pressable
              onPress={onSnapNow}
              className="px-3.5"
              style={{
                height: 30,
                borderRadius: radius.pill,
                backgroundColor: W_ACCENT,
                justifyContent: "center",
              }}
              accessibilityLabel={copy.labels.currentTime}
            >
              <Text className="text-sm" style={{ fontWeight: "700", color: neutral.white }}>{copy.labels.now}</Text>
            </Pressable>
          ) : null}
          <PlanetSelectMenu
            grahas={grahas}
            selected={lineTarget}
            onSelect={onSelectPlanet}
            compact
          />
        </View>
      </View>
    </View>
  );
}

function WheelBody({
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
  stageHeight,
}: Omit<PanchangaWheelProps, "loading" | "p"> & { p: PanchangaDay }) {
  const copy = usePanchangaWheelCopy();
  const { pick, digits } = useLocale();
  const { width: screenW, height: screenH, isTablet, isLandscape } = useBreakpoint();
  const insets = useSafeAreaInsets();
  const [containerWidth, setContainerWidth] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const inlineStageSize =
    stageHeight ??
    computeInlineWheelStageSize({
      containerWidth,
      screenW,
      screenH,
      safeAreaTop: insets.top,
    });
  const fullscreenStageHeight = computeFullscreenWheelHeight(screenH);
  const compactHead = isTablet || isLandscape;
  const scrubTrackWidth = isTablet ? (isLandscape ? 120 : 168) : Math.min(120, Math.max(88, screenW * 0.22));
  const det = useMemo(() => buildWheelDetail(p), [p]);
  const tz = resolveTimeZone(p?.location?.timezone, timezone);
  const [now, setNow] = useState(() => new Date());
  const [spin, setSpin] = useState(0);
  const [scrubPinned, setScrubPinned] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [picked, setPicked] = useState<WheelPick | null>(null);
  const [hover, setHover] = useState<WheelHover | null>(null);
  const [lineTarget, setLineTarget] = useState(1);
  const [calendarOpen, setCalendarOpen] = useState(false);

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
    const { hour, minute } = parseClockParts(clock);
    let g = (hour * 60 + minute - det.sunriseMin) / 24;
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
          ? { lat: p.location.lat as number, lon: p.location.lon as number, timezone: p.location.timezone }
          : undefined,
    [p.location],
  );

  const scrubDatetime = useMemo(
    () => scrubGToDatetime(anchorAd, debouncedScrubG, det.sunriseMin),
    [anchorAd, debouncedScrubG, det.sunriseMin],
  );

  /* In the year view the day itself is what moves, so at-time state is only
     worth fetching once the user reaches for the time slider — otherwise every
     playback tick would queue a request the wheel never gets to draw. */
  const scrubbing = atTimeScrubOnly
    ? scrubPinned
    : scrubPinned || Math.abs(scrubG - (isToday && !scrubPinned ? nowG : 0)) > 0.05;
  /* Playback would queue an at-time request per tick and draw none of them, so
     the range view stays on the day's own state and moves the needle locally. */
  const needsAtTime = Boolean(anchorAd) && scrubbing && !rangeMode;

  const scrubQ = useQuery({
    queryKey: panchangaKeys.atTime(scrubDatetime, locationParams),
    queryFn: () => fetchPanchangaAtTime(scrubDatetime, locationParams),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
    enabled: needsAtTime,
  });

  const atTimeData = needsAtTime && !scrubQ.isPlaceholderData ? scrubQ.data : undefined;
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
    const freshNow = new Date();
    setNow(freshNow);
    const mins = minutesSinceMidnightInTimezone(freshNow, tz, true);
    let g = (mins - det.sunriseMin) / 24;
    if (g < 0) g += 60;
    setScrubPinned(false);
    setSpin(0);
    setPan({ x: 0, y: 0 });
    setZoom(1);
    setScrubG(Math.max(0, Math.min(60, g)));
  }, [det.sunriseMin, tz]);

  const resetToSunrise = useCallback(() => {
    setScrubPinned(true);
    setSpin(0);
    setScrubG(0);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleLeave = useCallback(() => setHover(null), []);
  const ignorePickUntilRef = useRef(0);
  const handlePick = useCallback((next: WheelPick) => {
    if (Date.now() < ignorePickUntilRef.current) return;
    setPicked(next);
  }, []);

  /* Latest zoom for `handleZoom`, so it can keep one identity (see below). */
  const zoomRef = useRef(1);
  zoomRef.current = zoom;
  /* Stable identity: an inline arrow here rebuilt the chart's PanResponder on
     every parent render — including mid-gesture — which is how the wheel
     stopped responding. */
  const handlePan = useCallback((x: number, y: number) => setPan({ x, y }), []);

  const handleZoom = useCallback(
    (next: number) => {
      const z = Math.max(0.55, Math.min(14, next));
      if (z <= 1) {
        zoomRef.current = z;
        setZoom(z);
        setPan({ x: 0, y: 0 });
        return;
      }
      /* The chart scales around the view's own center (a plain RN
       * `transform: [translate, translate, scale]`, no focal point of its
       * own), so leaving `pan` untouched doesn't hold the current view in
       * place — it was pulling the image back toward the wheel's absolute
       * center on every zoom step, which is what "zoom only ever points at
       * the middle" was: with pan fixed, the point rendering at screen-center
       * is `cx - pan/zoom`, and that converges on the wheel's own center `cx`
       * as zoom grows, wherever you'd panned to. Scaling `pan` by the same
       * ratio as the zoom change keeps whatever's on screen exactly where it
       * is — the standard "zoom about the viewport center" a +/- button
       * should do. (The pinch gesture is unaffected: it calls this too, but
       * always follows up with its own `onPan` in the same frame, which
       * overwrites this with its focal-anchored value.) */
      const ratio = z / zoomRef.current;
      zoomRef.current = z;
      setZoom(z);
      setPan((p) => ({ x: p.x * ratio, y: p.y * ratio }));
    },
    [],
  );

  const toggleExpanded = useCallback(() => {
    setPicked(null);
    ignorePickUntilRef.current = Date.now() + 600;
    setExpanded((v) => !v);
  }, []);

  useEffect(() => {
    if (!isToday) return;
    /* This re-renders the whole chart body (~350 lines of SVG), not just the
       needle — confirmed on device via logcat: "Skipped 298 frames" / "Davey!
       duration=8790ms" once a second while this screen sits open. A 1s tick
       was pegging the JS thread badly enough that taps anywhere on the page
       (not just on the wheel) were getting lost or misdirected during the
       stall. The needle only needs to look live, not be to-the-second
       accurate, so 20s cuts the render frequency 20x without a visible
       difference in the marker's position. */
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
    setScrubG(isToday ? nowG : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.date_ad, p.panchanga_date_ad]);

  const scrubClock = gClock(effectiveG, det.sunriseMin);
  const place = useMemo(
    () => wheelPlaceFromClock(p.location, p.panchanga_date_ad ?? p.date_ad, scrubClock, tz),
    [p.location, p.panchanga_date_ad, p.date_ad, scrubClock, tz],
  );
  const scrubTithi = atTimeData
    ? ((getPanchangaDetail(atTimeData)?.tithi as { name_ne?: string; name?: string } | undefined) ??
      (atTimeData.tithi as { name_ne?: string; name?: string } | undefined))
    : undefined;
  const tithiNe = scrubTithi?.name_ne ?? det.tithi2[0]?.ne ?? "—";
  const tithiEn = scrubTithi?.name ?? det.tithi2[0]?.en ?? tithiNe;
  const pickerYear = calendarPick?.year ?? bsYear;
  const pickerMonth = calendarPick?.month ?? (BS_MONTHS_NE.indexOf(bsMonthNe) + 1 || 1);
  const pickerDay = calendarPick?.day ?? bsDay;
  const pickerClock = calendarPick?.clock ?? clock ?? scrubClock;

  const openCalendar = useCallback(() => {
    yearScrub?.onPause();
    if (onOpenDatePicker && !calendarPick) {
      onOpenDatePicker();
      return;
    }
    setCalendarOpen(true);
  }, [calendarPick, onOpenDatePicker, yearScrub]);

  const handleCalendarCommit = useCallback(
    (year: number, month: number, day: number, nextClock: string) => {
      if (!rangeMode) {
        const { hour, minute } = parseClockParts(nextClock);
        let g = (hour * 60 + minute - det.sunriseMin) / 24;
        if (g < 0) g += 60;
        setScrubG(Math.max(0, Math.min(60, g)));
        setScrubPinned(true);
      }
      calendarPick?.onCommit(year, month, day, nextClock);
    },
    [calendarPick, det.sunriseMin, rangeMode],
  );

  const renderHeader = (fullscreen?: boolean) => {
    const eyebrow = compactHead
      ? { ...headEyebrowStyle, letterSpacing: 1.2 }
      : headEyebrowStyle;
    const title = compactHead
      ? {
          ...headTitleStyle,
          lineHeight: nepaliLineHeight(fullscreen ? 14 : 15),
        }
      : headTitleStyle;
    const sub = compactHead
      ? { ...headSubStyle }
      : headSubStyle;
    const top = fullscreen ? insets.top + 6 : compactHead ? 8 : 10;

    return (
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top,
          left: 16,
          right: 132,
          zIndex: 20,
        }}
      >
        {!compactHead ? (
          <Text className="text-sm font-semibold uppercase" style={eyebrow}>{copy.eyebrow}</Text>
        ) : null}
        <Text className={compactHead ? "mt-1.5 text-lg font-bold leading-tight" : "mt-1.5 text-xl font-bold leading-tight"} style={title}>
          {copy.title(Boolean(isToday && !scrubPinned))}
        </Text>
        <Text className="mt-1.5 text-base" style={sub} numberOfLines={compactHead ? 2 : 3}>
          {copy.sub({
            weekday: det.weekday,
            bsMonthNe,
            bsDay,
            bsYear,
            clock: pickerClock,
            tithi: { ne: tithiNe, en: tithiEn },
            location: locationLabel ?? p?.location?.name,
          })}
        </Text>
        {yearScrub?.playbackRateLabel && yearScrub.direction !== 0 ? (
          <Text
            className={cn("mt-2.5 text-lg font-bold tabular-nums leading-snug tracking-tight", !compactHead && "text-base")}
            style={{
              color: illustration.amber49,
              fontWeight: "700",
            }}
          >
            {yearScrub.playbackRateLabel}
            <Text style={{ color: W_INK }}> · {digits(yearScrub.speed)}×</Text>
          </Text>
        ) : null}
      </View>
    );
  };

  const renderStage = (size: number | "fill", fullscreen: boolean) => (
    <View
      style={
        size === "fill"
          ? {
              width: "100%",
              height: fullscreenStageHeight,
              overflow: "hidden",
              backgroundColor: W_BG,
            }
          : {
              width: "100%",
              height: size,
              overflow: "hidden",
              backgroundColor: W_BG,
            }
      }
      onLayout={(e) => {
        setContainerWidth(e.nativeEvent.layout.width);
      }}
    >
      {renderHeader(fullscreen)}
      <View className="flex-1">
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
          place={place}
        />
      </View>
      <WheelChrome
        pick={pick}
        top={fullscreen ? insets.top + 6 : compactHead ? 8 : 10}
        expanded={fullscreen}
        onReset={resetToSunrise}
        onToggleFullscreen={toggleExpanded}
        onOpenDatePicker={openCalendar}
      />

      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: 16,
          // The year row takes a band of its own above the time dock.
          bottom: (fullscreen ? 88 + insets.bottom : 72) + (yearScrub ? 60 : 0),
          gap: 6,
          maxWidth: size === "fill" ? "45%" : "45%",
          zIndex: 20,
        }}
      >
        <View className={`${wheelLegendRow} flex-row items-center gap-1.5`}>
          <View className={wheelLegendDot} style={{ backgroundColor: W_ACCENT }} />
          <Text className="text-sm" style={{ color: W_INK_DIM }}>
            {copy.labels.currentNakTithi}
          </Text>
        </View>
        {!isTablet && !fullscreen ? (
          <Text className="text-sm" style={{ color: W_INK_FAINT }}>
            {copy.labels.dragHint}
          </Text>
        ) : null}
        {isTablet || fullscreen ? (
          <>
            <View className={`${wheelLegendRow} flex-row items-center gap-1.5`}>
              <View className={wheelLegendDot} style={{ backgroundColor: illustration.orange53b }} />
              <Text className="text-sm" style={{ color: W_INK_DIM }}>{copy.labels.sunSign}</Text>
            </View>
            <View className={`${wheelLegendRow} flex-row items-center gap-1.5`}>
              <View className={wheelLegendDot} style={{ backgroundColor: illustration.sky84 }} />
              <Text className="text-sm" style={{ color: W_INK_DIM }}>{copy.labels.moonSign}</Text>
            </View>
          </>
        ) : null}
      </View>

      {yearScrub ? (
        <WheelRangeDock
          pick={pick}
          digits={digits}
          scrub={yearScrub}
          grahas={det.grahas}
          lineTarget={lineTarget}
          onSelectPlanet={setLineTarget}
          bottomInset={fullscreen ? insets.bottom : 0}
        />
      ) : (
        <WheelDock
          pick={pick}
          digits={digits}
          scrubG={scrubG}
          scrubClock={scrubClock}
          isToday={isToday}
          onScrubChange={handleScrubChange}
          onSnapNow={snapToNow}
          grahas={det.grahas}
          lineTarget={lineTarget}
          onSelectPlanet={setLineTarget}
          scrubTrackWidth={scrubTrackWidth}
          bottomInset={fullscreen ? insets.bottom : 0}
        />
      )}
    </View>
  );

  const wheelShell = renderStage(inlineStageSize, false);

  return (
    <>
      <View
        className="overflow-hidden rounded-2xl border border-border"
        style={{ backgroundColor: W_BG }}
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      >
        {wheelShell}
      </View>

      {/* No detail dialog for a नक्षत्र tap — the wheel only highlights it. The
          राशि panel stays. */}
      <WheelPanel
        sel={picked?.type === "rashi" ? picked : null}
        open={picked?.type === "rashi"}
        num={digits}
        onClose={() => setPicked(null)}
      />

      <Modal
        visible={expanded}
        animationType="fade"
        presentationStyle="fullScreen"
        statusBarTranslucent
        onRequestClose={toggleExpanded}
      >
        <StatusBar barStyle="light-content" backgroundColor={W_BG} translucent />
        <View style={{ flex: 1, backgroundColor: W_BG }}>
          {renderStage("fill", true)}
          {/* Inside the fullscreen modal on purpose: a sheet mounted by the page
              would open behind it, and closing fullscreen to pick a date is
              exactly what the calendar button exists to avoid. */}
          {fullscreenOverlay}
        </View>
      </Modal>

      <WheelCalendarModal
        open={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        year={pickerYear}
        month={pickerMonth}
        day={pickerDay}
        clock={pickerClock}
        timeZone={tz}
        playback={yearScrub}
        onCommit={handleCalendarCommit}
      />
    </>
  );
}

function WheelSkeleton(_props: Pick<PanchangaWheelProps, "bsYear" | "bsMonthNe" | "bsDay" | "locationLabel">) {

  return (
    <Card className="overflow-hidden p-0" style={{ backgroundColor: W_BG }}>
      <SkeletonPulse className="mx-auto bg-muted/20" style={{ width: 320, height: 320 }} />
    </Card>
  );
}

function PanchangaWheelImpl({
  p,
  loading = false,
  bsYear,
  bsMonthNe,
  bsDay,
  isToday,
  timezone,
  locationLabel,
  atTimeScrubOnly,
  yearScrub,
  clock,
  calendarPick,
  onOpenDatePicker,
  fullscreenOverlay,
  stageHeight,
}: PanchangaWheelProps) {
  if (loading || !p) {
    return <WheelSkeleton bsYear={bsYear} bsMonthNe={bsMonthNe} bsDay={bsDay} locationLabel={locationLabel} />;
  }
  return (
    <WheelBody
      p={p}
      bsYear={bsYear}
      bsMonthNe={bsMonthNe}
      bsDay={bsDay}
      isToday={isToday}
      timezone={timezone}
      locationLabel={locationLabel}
      atTimeScrubOnly={atTimeScrubOnly}
      yearScrub={yearScrub}
      clock={clock}
      calendarPick={calendarPick}
      onOpenDatePicker={onOpenDatePicker}
      fullscreenOverlay={fullscreenOverlay}
      stageHeight={stageHeight}
    />
  );
}

export const PanchangaWheel: FC<PanchangaWheelProps> = memo(PanchangaWheelImpl);
