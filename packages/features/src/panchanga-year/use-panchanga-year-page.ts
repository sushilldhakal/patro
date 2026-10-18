/**
 * Annual panchanga wheel logic, shared by the website
 * (`apps/web/src/pages/PanchangaYear.tsx`) and the app
 * (`apps/mobile/app/(tabs)/panchanga/year.tsx`).
 *
 * The wheel shows a moving window of days around a chosen date (two months to
 * start). Playback walks it a day at a time; the window grows ahead of
 * playback to three months either side and then slides. Days come from the
 * bulk year payload (a window straddling Chaitra pulls the next year too).
 *
 * Each app owns the browsed date and the clock (the URL on the website,
 * screen state in the app) and passes them in; this holds the window, the
 * needle, playback, the clock's sunrise sync, the fetches and the copy.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { keepPreviousData, useQueries } from "@tanstack/react-query";
import { fetchYearWheelCalendar, locationCacheKey, yearWheelKeys, type PanchangaDay } from "@vedic-patro/api-client";
import {
  adToBS,
  BS_MONTH_NAMES,
  BS_MONTHS_NE,
  BS_SUPPORTED_END_YEAR,
  BS_SUPPORTED_START_YEAR,
} from "@vedic-patro/domain/bs-calendar";
import type { Era } from "@vedic-patro/domain/era";
import { displayLocationLabel, type PanchangaLocation } from "@vedic-patro/read-models/panchanga-location";
import { formatTimeShort, getSunrise } from "@vedic-patro/read-models/panchanga-format";
import { defaultClockForTimezone } from "@vedic-patro/domain/panchanga-mode";
import { civilIsoFromDate } from "@vedic-patro/domain/patro-day";
import { parseAdStr, shiftAnchorMonths } from "@vedic-patro/domain/panchanga-year-page";
import {
  buildYearWheelDays,
  sliceWheelWindow,
  wheelWindowAtLimit,
  wheelWindowBounds,
  yearWheelIndexOfAdDate,
  type YearWheelDay,
} from "@vedic-patro/read-models/panchanga-year-wheel";
import { formatWheelPlaybackRate, WHEEL_MAX_PLAY_SPEED, WHEEL_PLAY_BASE_MS } from "@vedic-patro/domain/wheel-year-playback";
import { resolveTimeZone, todayAdStringInTimezone } from "@vedic-patro/domain/zoned-time";
import { useLocale } from "@vedic-patro/i18n/react";

/** Days from an edge (at 1×) at which the window grows toward it. */
const EXTEND_MARGIN = 45;
/** Window half-width cap — past this the window slides rather than grows. */
const MAX_MONTHS_EACH = 3;

const toAdStr = (d: Date) => civilIsoFromDate(d);

export type PanchangaYearScope = {
  /** Browse era: BBS fetches the BBS year payload, every other era BS. */
  era: Era;
  location: PanchangaLocation;
  /** The browsed date (follows playback once it settles). */
  date: Date;
  setDate: (d: Date) => void;
  setClock: (clock: string) => void;
  /** False until the app's stored place has loaded. */
  enabled?: boolean;
};

export function usePanchangaYearPage({ era, location, date, setDate, setClock, enabled = true }: PanchangaYearScope) {
  const { t, lang, digits } = useLocale();
  const adDateStr = toAdStr(date);
  const tz = resolveTimeZone(undefined, location.params.timezone);
  const todayAd = todayAdStringInTimezone(new Date(), tz);
  const isToday = adDateStr === todayAd;

  /* The window's centre, moved only by a date the reader picks (playback moves
     the needle, and centring on it would make the window chase it). */
  const [anchor, setAnchor] = useState(() => new Date(date.getTime()));
  /* The needle is a date, not an index: growing the window backwards prepends
     days and would shift every index out from under it. */
  const [dayAd, setDayAd] = useState(() => toAdStr(date));
  const [play, setPlay] = useState<{ dir: -1 | 0 | 1; speed: number }>({ dir: 0, speed: 1 });
  const [monthsBack, setMonthsBack] = useState(1);
  const [monthsFwd, setMonthsFwd] = useState(1);
  const scrubbingRef = useRef(false);
  const prevPlayDirRef = useRef(play.dir);
  const [clockUserAdjusted, setClockUserAdjusted] = useState(false);
  const clockSyncedKeyRef = useRef<string | null>(null);
  const [lastGoodRow, setLastGoodRow] = useState<YearWheelDay | undefined>(undefined);
  const [lastWheelData, setLastWheelData] = useState<PanchangaDay | undefined>(undefined);

  /* Once playback has settled, pull the needle back to a date browsed from elsewhere. */
  useEffect(() => {
    const wasPlaying = prevPlayDirRef.current !== 0;
    prevPlayDirRef.current = play.dir;
    if (scrubbingRef.current || play.dir !== 0) return;
    // On the frame autoplay stops the needle is ahead of the date; the date
    // follows it (below) rather than the other way round, or the two loop.
    if (wasPlaying) return;
    if (dayAd === adDateStr) return;
    setDayAd(adDateStr);
    setAnchor(parseAdStr(adDateStr));
  }, [adDateStr, play.dir, dayAd]);

  const bounds = useMemo(() => wheelWindowBounds(anchor, monthsBack, monthsFwd), [anchor, monthsBack, monthsFwd]);
  const atLimit = useMemo(() => wheelWindowAtLimit(bounds), [bounds]);

  /* The window's years, plus the needle's, plus the next one in the direction of play. */
  const queryYears = useMemo(() => {
    const years = new Set(bounds.years);
    const bs = adToBS(parseAdStr(dayAd));
    years.add(bs.year);
    if (play.dir === 1 && bs.year < BS_SUPPORTED_END_YEAR) years.add(bs.year + 1);
    if (play.dir === -1 && bs.year > BS_SUPPORTED_START_YEAR) years.add(bs.year - 1);
    const endBs = adToBS(parseAdStr(bounds.endAd));
    const startBs = adToBS(parseAdStr(bounds.startAd));
    if (play.dir === 1 && endBs.year < BS_SUPPORTED_END_YEAR) years.add(endBs.year + 1);
    if (play.dir === -1 && startBs.year > BS_SUPPORTED_START_YEAR) years.add(startBs.year - 1);
    return [...years].sort((a, b) => a - b);
  }, [bounds.years, bounds.endAd, bounds.startAd, dayAd, play.dir]);

  const fetchEra: Era = era === "bbs" ? "bbs" : "bs";
  const yearQueries = useQueries({
    queries: queryYears.map((y) => ({
      queryKey: yearWheelKeys.year(y, location.params, fetchEra),
      queryFn: () => fetchYearWheelCalendar(y, location.params, fetchEra),
      enabled,
      staleTime: Number.POSITIVE_INFINITY,
      // Years the sliding window has left go inactive; release them fairly soon.
      gcTime: 1000 * 60 * 10,
      placeholderData: keepPreviousData,
    })),
  });

  const windowLoading = yearQueries.some((q) => q.isLoading && !q.data);
  const windowFetching = yearQueries.some((q) => q.isFetching);
  const windowError = yearQueries.some((q) => q.isError);
  const yearsStamp = yearQueries.map((q) => q.dataUpdatedAt).join("|");

  const days = useMemo(() => {
    const all = yearQueries.flatMap((q) => buildYearWheelDays(q.data)).sort((a, b) => a.dateAd.localeCompare(b.dateAd));
    return sliceWheelWindow(all, bounds);
    // yearsStamp stands in for the query data itself, which is a new array each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearsStamp, bounds]);

  const total = days.length;
  const foundIndex = yearWheelIndexOfAdDate(days, dayAd);
  const foundRow = foundIndex !== null ? days[foundIndex - 1] : undefined;
  /* `foundIndex` is null for a render whenever `days` is mid-rebuild; showing
     `days[0]` then flashed another day's sky. Repeat the last row that resolved. */
  const current = foundIndex !== null ? foundRow : lastGoodRow;
  if (current && current !== lastGoodRow) setLastGoodRow(current);
  const clamped = foundIndex ?? (current ? yearWheelIndexOfAdDate(days, current.dateAd) : null) ?? 1;
  const wheelData = current?.p;
  if (wheelData && wheelData !== lastWheelData) setLastWheelData(wheelData);

  /* The browsed date follows the needle once playback is still. */
  useEffect(() => {
    if (scrubbingRef.current || play.dir !== 0) return;
    if (!dayAd || dayAd === adDateStr) return;
    setDate(parseAdStr(dayAd));
  }, [dayAd, adDateStr, setDate, play.dir]);

  useEffect(() => {
    if (play.dir === 0 || !total) return;
    const tick = Math.max(33, Math.round(WHEEL_PLAY_BASE_MS / play.speed));
    const id = setInterval(() => {
      setDayAd((ad) => {
        const i = days.findIndex((d) => d.dateAd === ad);
        // A missed lookup holds position (it used to jump to the window's start).
        if (i < 0) return ad;
        return days[i + play.dir]?.dateAd ?? ad;
      });
    }, tick);
    return () => clearInterval(id);
  }, [play, total, days]);

  /* Run the window out ahead of playback: grow to MAX_MONTHS_EACH, then slide. */
  useEffect(() => {
    if (play.dir === 0 || !total) return;
    const grow = (dir: 1 | -1) => {
      if (dir === 1) {
        if (monthsFwd < MAX_MONTHS_EACH) setMonthsFwd((m) => m + 1);
        else setAnchor((a) => shiftAnchorMonths(a, 1));
      } else if (monthsBack < MAX_MONTHS_EACH) setMonthsBack((m) => m + 1);
      else setAnchor((a) => shiftAnchorMonths(a, -1));
    };
    if (foundIndex === null) {
      // Playback outran the window: grow toward it straight away.
      if (play.dir === 1 && !atLimit.end) grow(1);
      if (play.dir === -1 && !atLimit.start) grow(-1);
      return;
    }
    const margin = Math.max(EXTEND_MARGIN, play.speed);
    if (play.dir === 1 && total - clamped <= margin && !atLimit.end) grow(1);
    if (play.dir === -1 && clamped <= margin && !atLimit.start) grow(-1);
  }, [play.dir, play.speed, foundIndex, clamped, total, atLimit, monthsBack, monthsFwd]);

  const pausePlay = useCallback(() => setPlay({ dir: 0, speed: 1 }), []);

  const jumpToIndex = useCallback(
    (i: number) => {
      const row = days[Math.min(Math.max(1, Math.round(i)), days.length) - 1];
      if (!row) return;
      scrubbingRef.current = true;
      setDayAd(row.dateAd);
      setDate(parseAdStr(row.dateAd));
      requestAnimationFrame(() => {
        scrubbingRef.current = false;
      });
    },
    [days, setDate],
  );

  const step = useCallback((dir: 1 | -1) => {
    setPlay((p) => (p.dir === dir ? { dir, speed: Math.min(p.speed * 2, WHEEL_MAX_PLAY_SPEED) } : { dir, speed: 1 }));
  }, []);

  /** Re-centre the window on a date and put the needle there. */
  const landOn = useCallback(
    (d: Date) => {
      setDate(d);
      setAnchor(d);
      setDayAd(toAdStr(d));
      setMonthsBack(1);
      setMonthsFwd(1);
    },
    [setDate],
  );

  /** A date from the header: the clock goes back to following the day. */
  const changeDate = useCallback(
    (d: Date) => {
      pausePlay();
      scrubbingRef.current = false;
      setClockUserAdjusted(false);
      landOn(d);
    },
    [pausePlay, landOn],
  );

  /** A time the reader picks rides along with playback instead of snapping to each sunrise. */
  const changeClock = useCallback(
    (next: string) => {
      setClockUserAdjusted(true);
      setClock(next);
    },
    [setClock],
  );

  /**
   * The wheel's own date/time picker: the time is set now; the app resolves
   * the picked calendar day (a BBS day may need the server) and calls
   * `land` with it.
   */
  const startCalendarCommit = useCallback(
    (nextClock: string) => {
      pausePlay();
      scrubbingRef.current = false;
      changeClock(nextClock);
      return (picked: Date) => {
        clockSyncedKeyRef.current = `${toAdStr(picked)}|${locationCacheKey(location.params)}`;
        landOn(picked);
      };
    },
    [pausePlay, changeClock, landOn, location.params],
  );

  /* The clock follows the day (now for today, sunrise otherwise) until the reader sets it. */
  useEffect(() => {
    // During autoplay the day changes every tick; skip the resync so the chrome does not flicker.
    if (play.dir !== 0) return;
    const syncKey = `${adDateStr}|${locationCacheKey(location.params)}`;
    if (clockSyncedKeyRef.current === syncKey) return;
    if (clockUserAdjusted) return;
    if (isToday) {
      clockSyncedKeyRef.current = syncKey;
      setClock(defaultClockForTimezone(tz));
      return;
    }
    const sunriseClock = formatTimeShort(wheelData ? getSunrise(wheelData) : undefined);
    if (!sunriseClock) return;
    clockSyncedKeyRef.current = syncKey;
    setClock(sunriseClock);
  }, [play.dir, adDateStr, location.params, isToday, tz, clockUserAdjusted, wheelData, setClock]);

  const monthName = (m: number) => (lang === "en" ? BS_MONTH_NAMES[m - 1] : BS_MONTHS_NE[m - 1]) ?? "";
  const from = adToBS(parseAdStr(bounds.startAd));
  const to = adToBS(parseAdStr(bounds.endAd));
  const windowLabel = `${monthName(from.month)} ${digits(from.day)} — ${monthName(to.month)} ${digits(to.day)}`;
  const browsed = adToBS(date);
  const pick = (ne: string, en: string) => (lang === "en" ? en : ne);

  return {
    copy: {
      title: t("panchanga_year.title"),
      back: t("panchanga_year.back"),
      error: t("panchanga_year.error"),
      loading: t("common.loading"),
    },
    /** Under the wheel: the error, "loading", or "Shrawan 1 — Ashwin 1 · 62 days". */
    statusLine: windowError
      ? { kind: "error" as const, text: t("panchanga_year.error") }
      : windowFetching
        ? { kind: "loading" as const, text: t("common.loading") }
        : total
          ? { kind: "window" as const, text: `${windowLabel} · ${t("panchanga_year.window_days", { count: digits(total) })}` }
          : undefined,
    timeZone: tz,
    todayAd,
    /** The day the wheel shows (the last one that resolved while the window rebuilds). */
    current,
    wheelData: wheelData ?? lastWheelData,
    wheelLoading: !(wheelData ?? lastWheelData) && windowLoading,
    bsYear: current?.bsYear ?? browsed.year,
    bsMonth: current?.bsMonth ?? browsed.month,
    bsDay: current?.bsDay ?? browsed.day,
    bsMonthNe: (current ? BS_MONTHS_NE[current.bsMonth - 1] : undefined) || BS_MONTHS_NE[0]!,
    isToday: current?.dateAd === todayAd,
    locationLabel: displayLocationLabel(location, wheelData?.location?.name, lang),
    changeDate,
    changeClock,
    startCalendarCommit,
    scrub: {
      day: clamped,
      totalDays: total || 1,
      direction: play.dir,
      speed: play.speed,
      playbackRateLabel: play.dir === 0 ? undefined : formatWheelPlaybackRate(play.speed, (n) => digits(n), pick),
      onForward: () => step(1),
      onBackward: () => step(-1),
      onPause: pausePlay,
      onSetPlayback: (dir: -1 | 0 | 1, speed: number) => setPlay(dir === 0 ? { dir: 0, speed: 1 } : { dir, speed: Math.min(Math.max(1, speed), WHEEL_MAX_PLAY_SPEED) }),
      onDayChange: (d: number) => {
        pausePlay();
        jumpToIndex(d);
      },
      onJumpDay: (d: number) => {
        pausePlay();
        jumpToIndex(d);
      },
      onScrubStart: () => {
        pausePlay();
        scrubbingRef.current = true;
      },
      onScrubEnd: () => {
        scrubbingRef.current = false;
      },
    },
  };
}

export type PanchangaYearPage = ReturnType<typeof usePanchangaYearPage>;
