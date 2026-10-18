/**
 * Daily panchanga page logic, shared by the website (`apps/web/src/pages/Panchanga.tsx`)
 * and the app (`apps/mobile/app/(tabs)/panchanga/index.tsx`).
 *
 * The day is read three ways: the udaya (sunrise→sunrise) day drives the
 * wheel, the timeline and the date sections; the panchanga at the chosen time
 * drives the at-time sections; in दिन-रात (Calendar Day) mode the moving angas
 * are read at midnight and the timeline is the civil one.
 *
 * How each of those is requested differs by platform (the website resolves
 * the URL's day in any era; the app fetches by AD date and answers offline),
 * so each app passes its query sources. Everything else — the clock and when
 * it follows the day, the day-cycle mode, which payload each section reads,
 * the date shown and the copy — is decided here.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { keepPreviousData, useQuery, type QueryKey } from "@tanstack/react-query";
import { ApiError, fetchCivilTimeline, locationCacheKey, PANCHANGA_CACHE_VERSION, type PanchangaDay } from "@vedic-patro/api-client";
import { adToBS, BS_MONTHS_NE } from "@vedic-patro/domain/bs-calendar";
import type { Era } from "@vedic-patro/domain/era";
import { chartDateAd, isEphemerisPanchanga } from "@vedic-patro/read-models/ephemeris-adapters";
import { formatTimeShort, getSunrise, getSunset } from "@vedic-patro/read-models/panchanga-format";
import { displayLocationLabel, type PanchangaLocation } from "@vedic-patro/read-models/panchanga-location";
import { defaultClockForTimezone } from "@vedic-patro/domain/panchanga-mode";
import { civilAnchorFromPanchangaDay, parseCivilIso } from "@vedic-patro/domain/patro-day";
import { resolveTimeZone, todayAdStringInTimezone } from "@vedic-patro/domain/zoned-time";
import { useLocale } from "@vedic-patro/i18n/react";

/** दिन-चक्र day boundary: sunrise→sunrise (default) or midnight→midnight. */
export type DayCycleMode = "Day-Night" | "Calendar Day";

type Source = { queryKey: QueryKey; queryFn: () => Promise<PanchangaDay>; enabled?: boolean };

export type PanchangaSources = {
  /** The udaya day for the browsed date. */
  udaya: Source;
  /** The panchanga at `clock` on the browsed day (`wheel` is the udaya day once loaded). */
  atTime: (ctx: { clock: string; wheel?: PanchangaDay }) => Source;
  /** The browsed day read at midnight (Calendar Day mode); without it the udaya day is used. */
  midnight?: (civilDateAd: string) => Source;
  /** Era the civil timeline is requested in. */
  civilEra: Era;
};

export type PanchangaScope = {
  location: PanchangaLocation;
  /** The browsed date (the picker's day). */
  date: Date;
  clock: string;
  setClock: (clock: string) => void;
  sources: PanchangaSources;
  /** False until the app's stored place has loaded. */
  enabled?: boolean;
  /** The page opened with a time in its link: keep it on the first (non-today) day. */
  openedWithTime?: boolean;
};

const HALF_HOUR = 1000 * 60 * 30;

export function usePanchangaPage({ location, date, clock, setClock, sources, enabled = true, openedWithTime = false }: PanchangaScope) {
  const { t, lang } = useLocale();
  const params = location.params;

  const udayaQuery = useQuery({
    queryKey: sources.udaya.queryKey,
    queryFn: sources.udaya.queryFn,
    enabled: enabled && (sources.udaya.enabled ?? true),
    staleTime: HALF_HOUR,
    placeholderData: keepPreviousData,
  });
  const wheelData = udayaQuery.data;

  const civilAnchor = wheelData ? civilAnchorFromPanchangaDay(wheelData) : "";
  const hasCivilAnchor = civilAnchor.trim().length > 0;
  const isCeCivilDay = useMemo(() => {
    if (wheelData?.date_parts?.gregorian?.era === "bc" || !hasCivilAnchor) return false;
    try {
      return parseCivilIso(civilAnchor).year >= 1;
    } catch {
      return false;
    }
  }, [wheelData?.date_parts?.gregorian?.era, civilAnchor, hasCivilAnchor]);

  const atTimeSource = sources.atTime({ clock, wheel: wheelData });
  const instantQuery = useQuery({
    queryKey: atTimeSource.queryKey,
    queryFn: atTimeSource.queryFn,
    enabled: enabled && (atTimeSource.enabled ?? true),
    staleTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
  });

  const [dayCycleMode, setDayCycleMode] = useState<DayCycleMode>("Day-Night");
  const isCivilMode = dayCycleMode === "Calendar Day";
  const civilQuery = useQuery({
    queryKey: ["panchanga", "civil", PANCHANGA_CACHE_VERSION, civilAnchor, locationCacheKey(params)] as const,
    queryFn: () => fetchCivilTimeline(civilAnchor, sources.civilEra, params),
    enabled: enabled && isCivilMode && hasCivilAnchor,
    staleTime: HALF_HOUR,
    placeholderData: keepPreviousData,
  });
  const midnightSource = sources.midnight?.(civilAnchor);
  const midnightQuery = useQuery({
    queryKey: midnightSource?.queryKey ?? ["panchanga", "civil-day", "none"],
    queryFn: midnightSource?.queryFn ?? (() => Promise.reject(new Error("no midnight source"))),
    enabled: enabled && Boolean(midnightSource) && isCivilMode && hasCivilAnchor,
    staleTime: HALF_HOUR,
    placeholderData: keepPreviousData,
  });

  const instantData = instantQuery.data;
  /** The at-time day; a BCE day has none, so it falls back to the udaya day. */
  const data = instantData ?? (isCeCivilDay ? undefined : wheelData);
  /* The moving angas (tithi/nakshatra/yoga/karana, rashi, balam, panchaka/lagna)
     follow the day-cycle tab; date properties stay on the udaya day. */
  const angaData = (isCivilMode ? (midnightQuery.data ?? wheelData) : wheelData) ?? data;

  const timeZone = resolveTimeZone(data?.location?.timezone, params.timezone);
  const todayAd = todayAdStringInTimezone(new Date(), timeZone);
  const isToday = civilAnchor === todayAd;
  const sunrise = wheelData ? getSunrise(wheelData) : data ? getSunrise(data) : undefined;
  const sunset = wheelData ? getSunset(wheelData) : data ? getSunset(data) : undefined;

  /* The day the wheel names: the backend's own Vikram parts (adToBS cannot
     date a pre-epoch day), the offline table only until it answers. */
  const bs = useMemo(() => {
    const v = wheelData?.date_parts?.vikram;
    if (v) return { year: v.year, month: v.month, day: v.day, monthName: BS_MONTHS_NE[v.month - 1] ?? "" };
    return adToBS(date);
  }, [wheelData?.date_parts?.vikram, date]);

  /* ── the clock ──
     Once per date/place the clock is seeded: now on today, otherwise the
     day's sunrise. A time the reader picks is kept until the date changes;
     a date jump that carries its own time keeps that one. */
  const [clockUserAdjusted, setClockUserAdjusted] = useState(false);
  const hadUrlTimeRef = useRef(openedWithTime);
  const clockSyncedKeyRef = useRef<string | null>(null);
  const [keepClockOnDate, setKeepClockOnDate] = useState(false);
  const [jumpSyncKey, setJumpSyncKey] = useState<string | null>(null);
  const [trackedAdDate, setTrackedAdDate] = useState(civilAnchor);
  if (civilAnchor !== trackedAdDate) {
    setTrackedAdDate(civilAnchor);
    if (keepClockOnDate) {
      setKeepClockOnDate(false);
      setJumpSyncKey(`${civilAnchor}|${locationCacheKey(params)}`);
    } else {
      setClockUserAdjusted(false);
    }
  }
  useEffect(() => {
    if (jumpSyncKey) clockSyncedKeyRef.current = jumpSyncKey;
  }, [jumpSyncKey]);

  const changeClock = useCallback(
    (next: string) => {
      setClockUserAdjusted(true);
      setClock(next);
    },
    [setClock],
  );

  /** The wheel's own date/time picker: keep its time across the date it moves to. */
  const commitClock = useCallback(
    (nextClock: string, dateChanged: boolean) => {
      if (dateChanged) setKeepClockOnDate(true);
      changeClock(nextClock);
    },
    [changeClock],
  );

  useEffect(() => {
    const syncKey = `${civilAnchor}|${locationCacheKey(params)}`;
    if (clockSyncedKeyRef.current === syncKey || clockUserAdjusted) return;
    if (isToday) {
      clockSyncedKeyRef.current = syncKey;
      hadUrlTimeRef.current = false;
      setClock(defaultClockForTimezone(timeZone));
      return;
    }
    const sunriseClock = formatTimeShort(wheelData ? getSunrise(wheelData) : undefined);
    if (!sunriseClock) return;
    // An explicitly shared time is honoured on the very first load.
    if (hadUrlTimeRef.current && clockSyncedKeyRef.current === null) {
      hadUrlTimeRef.current = false;
      clockSyncedKeyRef.current = syncKey;
      return;
    }
    clockSyncedKeyRef.current = syncKey;
    setClock(sunriseClock);
  }, [civilAnchor, params, isToday, timeZone, clockUserAdjusted, wheelData, setClock]);

  const loadError = udayaQuery.isError && !wheelData;
  const errorDetail = udayaQuery.error instanceof ApiError ? udayaQuery.error.detail : undefined;

  return {
    copy: {
      yearLink: t("panchanga.year_link"),
      /* Prefer the backend's own explanation (an unreachable date says what to fix). */
      error: errorDetail || t("panchanga.error_load"),
      learnHeading: t("panchanga.learn_heading"),
    },
    learnSlugs: ["what-is-panchang", "tithi", "nakshatra", "yoga", "karana", "hora"],
    /** The udaya day (wheel, timeline, date sections). */
    wheelData,
    /** `wheelData` is still the previous day while the browsed one loads. */
    wheelIsPlaceholder: udayaQuery.isPlaceholderData,
    /** The at-time day (at-time sections, chart). */
    data,
    /** What the moving-anga sections read. */
    angaData,
    ephemeris: isEphemerisPanchanga(instantData),
    showWheelSkeleton: udayaQuery.isLoading && !wheelData,
    loadError,
    /** The at-time request failed too (nothing at all to show). */
    failed: enabled && !wheelData && !data && (udayaQuery.isError || instantQuery.isError),
    retry: () => {
      void udayaQuery.refetch();
      void instantQuery.refetch();
    },
    civilAnchor,
    chartAd: chartDateAd(data, civilAnchor),
    jdUt: wheelData?.jd_ut,
    bs,
    timeZone,
    todayAd,
    isToday,
    sunrise,
    sunset,
    locationLabel: displayLocationLabel(location, data?.location?.name, lang),
    dayCycleMode,
    setDayCycleMode,
    isCivilMode,
    civilTimeline: civilQuery.data,
    civilLoading: civilQuery.isLoading,
    clockUserAdjusted,
    changeClock,
    commitClock,
  };
}

export type PanchangaPage = ReturnType<typeof usePanchangaPage>;
