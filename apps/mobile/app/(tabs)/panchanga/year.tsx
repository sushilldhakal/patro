import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { keepPreviousData, useQueries } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { PanchangaDateNav } from "@/components/panchanga/PanchangaDateNav";
import { LocationSelector } from "@/components/panchanga/LocationSelector";
import { PanchangaWheel } from "@/components/panchanga/PanchangaWheel";
import { Text } from "@/components/ui/Text";
import {
  defaultClockForTimezone,
  usePanchangaClock,
} from "@/components/panchanga/use-panchanga-mode";
import { fetchYearWheelCalendar, locationCacheKey, yearWheelKeys } from "@/lib/api";
import {
  adToBS,
  bsToAD,
  BS_MONTHS_NE,
  BS_MONTH_NAMES,
  getBSMonthLength,
  shiftBsMonth,
} from "@/lib/bs-calendar";
import { formatTimeShort, getSunrise } from "@/lib/panchanga-format";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import {
  buildYearWheelDays,
  sliceWheelWindow,
  wheelWindowAtLimit,
  wheelWindowBounds,
  yearWheelIndexOfAdDate,
  type YearWheelDay,
} from "@/lib/panchanga-year-wheel";
import { useBreakpoint } from "@/lib/responsive";
import { computeYearWheelStageHeight } from "@/lib/wheel-layout";
import { formatWheelPlaybackRate } from "@vedic-patro/domain/wheel-year-playback";
import { displayLocationLabel, usePanchangaLocation } from "@/lib/use-panchanga-location";
import { resolveTimeZone, todayAdStringInTimezone } from "@vedic-patro/domain/zoned-time";

/** Slowest tick; the scrub's speed multiplier divides into it. */
const PLAY_BASE_MS = 900;
const MAX_PLAY_SPEED = 32;
/** Days from an edge at which the next stretch is requested. */
const EXTEND_MARGIN = 7;
/** Window half-width cap — past this the window slides rather than grows. */
const MAX_MONTHS_EACH = 3;

function toAdStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseAdStr(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** Move the window's centre a whole BS month, keeping the day of the month. */
function shiftAnchorMonths(centre: Date, delta: number): Date {
  const bs = adToBS(centre);
  const next = shiftBsMonth(bs.year, bs.month, delta);
  return bsToAD(next.year, next.month, Math.min(bs.day, getBSMonthLength(next.year, next.month)));
}

/**
 * Panchanga wheel over a moving two-month window — header matches daily `/panchanga`.
 *
 * The date chrome picks the centre (Shrawan 17 opens Ashar 17 → Bhadra 17) and
 * playback walks that window a day at a time, so a tithi's drift against the
 * nakshatras is something you watch rather than infer.
 */
export default function PanchangaYearScreen() {
  const { pick, digits, lang } = useLocale();
  const { isCompact, isTablet, height: screenH } = useBreakpoint();
  const insets = useSafeAreaInsets();
  const [dateNavHeight, setDateNavHeight] = useState(88);
  const [bodyHeight, setBodyHeight] = useState(0);
  const { location, setLocation, ready } = usePanchangaLocation();

  const [date, setDate] = useState(() => new Date());
  /* The window's centre, moved only by a date the user picks. `date` itself
     follows playback, so centring on it would make the window chase the needle. */
  const [anchor, setAnchor] = useState(() => new Date());
  const adDateStr = toAdStr(date);
  const bsYear = adToBS(date).year;

  const tz = resolveTimeZone(undefined, location.params.timezone);
  const todayAd = todayAdStringInTimezone(new Date(), tz);
  const isToday = adDateStr === todayAd;

  const { clock, setClock } = usePanchangaClock(tz);
  const [clockUserAdjusted, setClockUserAdjusted] = useState(false);
  const clockSyncedKeyRef = useRef<string | null>(null);

  /* The needle's position is a date, not an index: growing the window backwards
     prepends days and would shift every index out from under it. */
  const [dayAd, setDayAd] = useState(() => toAdStr(new Date()));
  const [play, setPlay] = useState<{ dir: -1 | 0 | 1; speed: number }>({ dir: 0, speed: 1 });

  /* How far the window has grown past its opening two months. Playback pushes
     whichever edge it is running into; picking a date resets both. */
  const [monthsBack, setMonthsBack] = useState(1);
  const [monthsFwd, setMonthsFwd] = useState(1);

  const bounds = useMemo(
    () => wheelWindowBounds(anchor, monthsBack, monthsFwd),
    [anchor, monthsBack, monthsFwd],
  );
  const atLimit = useMemo(() => wheelWindowAtLimit(bounds), [bounds]);

  /* Days still come from the bulk year payload — ~5 KB a day against the month
     endpoint's ~55 KB — and get sliced down to the window. A window straddling
     Chaitra pulls the next year too; both are cached for the session. */
  const yearQueries = useQueries({
    queries: bounds.years.map((y) => ({
      queryKey: yearWheelKeys.year(y, location.params),
      queryFn: () => fetchYearWheelCalendar(y, location.params),
      enabled: ready,
      staleTime: Number.POSITIVE_INFINITY,
      // Years the sliding window has left go inactive; release them fairly soon.
      gcTime: 1000 * 60 * 10,
      placeholderData: keepPreviousData,
    })),
  });

  const windowLoading = yearQueries.some((q) => q.isLoading);
  const windowFetching = yearQueries.some((q) => q.isFetching);
  const windowError = yearQueries.some((q) => q.isError);
  const yearsStamp = yearQueries.map((q) => q.dataUpdatedAt).join("|");

  const days = useMemo(() => {
    const all = yearQueries
      .flatMap((q) => buildYearWheelDays(q.data))
      .sort((a, b) => a.dateAd.localeCompare(b.dateAd));
    return sliceWheelWindow(all, bounds);
    // yearsStamp stands in for the query data itself, which is a new array each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearsStamp, bounds]);
  const total = days.length;

  /* No landing effect: `dayAd` starts on today, which the opening window is
     centred on, and only a date the user picks moves it. That is what lets the
     window grow and slide underneath without tugging the needle. */
  const foundIndex = yearWheelIndexOfAdDate(days, dayAd);
  const foundRow = foundIndex !== null ? days[foundIndex - 1] : undefined;
  /* `foundIndex` comes back null for one render whenever `days` is
   * mid-rebuild (window growing/sliding, or briefly at high playback speed)
   * and doesn't yet contain `dayAd`. Falling back to `days[0]` used to mean
   * that render showed whatever day sits at the *start* of the window
   * instead — a completely different day's planets, tithi, everything — for
   * however many renders the miss lasted. At speed that reads as the chart
   * flickering, and every graha moves at once because the whole snapshot is a
   * different day's, not one thing drawn wrong. It also fed the date-sync
   * effect below, so `date` itself briefly jumped to that wrong day too.
   *
   * Caching the last row that *did* resolve — not just its index — means a
   * miss repeats the last good frame outright. Caching the index instead
   * would not be enough: `days` can reshape (grow, or renumber after a
   * window slide) in the same render that produces the miss, so the same
   * index could already point at a different day by the time it's read. */
  const lastGoodRowRef = useRef<YearWheelDay | undefined>(undefined);
  const current = foundIndex !== null ? foundRow : lastGoodRowRef.current;
  if (current) lastGoodRowRef.current = current;
  const clamped = foundIndex ?? (current ? yearWheelIndexOfAdDate(days, current.dateAd) : null) ?? 1;
  const wheelData = current?.p;

  const scrubbingRef = useRef(false);
  useEffect(() => {
    if (scrubbingRef.current || !current?.dateAd) return;
    if (current.dateAd === adDateStr) return;
    setDate(parseAdStr(current.dateAd));
  }, [current?.dateAd, adDateStr]);

  useEffect(() => {
    if (play.dir === 0 || !total) return;
    /* 900/32 = 28ms, so the floor has to come down with the top speed or 16×
       and 32× would both land on the old 70ms clamp and look identical. 33ms is
       one frame at 30fps — past that the wheel cannot redraw in time anyway. */
    const tick = Math.max(33, Math.round(PLAY_BASE_MS / play.speed));
    const id = setInterval(() => {
      setDayAd((ad) => {
        const i = days.findIndex((d) => d.dateAd === ad);
        /* `i < 0` used to fall back to treating the current day as index 0,
           so a single missed lookup sent playback to whatever date sits at
           the *start* of the currently-materialised window — near the
           opposite end from where it actually was. That is the forward-then-
           snap-back stutter: the window-growth effect below only asks for
           more days once we're within EXTEND_MARGIN of an edge, and at high
           speed (or during a stall on the JS thread, which queues this timer
           up and fires several ticks back-to-back once it resumes) playback
           can outrun that growth and land on a day the window hasn't
           re-sliced in yet, right as `days` is mid-rebuild. Holding position
           until the next tick's `days` has caught up is a stall, same as
           running off the end already does below — not a jump to a
           different part of the year. */
        if (i < 0) return ad;
        const next = i + play.dir;
        /* Sitting still at the edge is the pause while the next stretch loads —
           the growth effect below has already asked for it. */
        return days[next]?.dateAd ?? ad;
      });
    }, tick);
    return () => clearInterval(id);
  }, [play, total, days]);

  /* Run the window out ahead of playback so there is always more to play into.
     It grows to MAX_MONTHS_EACH either side and then slides — the centre moves
     a month at a time instead. Growing without bound would pin every BS year it
     ever crossed in memory, and each one is a couple of MB parsed. Sliding keeps
     playback endless with two years live at most. */
  useEffect(() => {
    if (play.dir === 0 || !total || windowFetching) return;

    /* `foundIndex === null` means `dayAd` has already run past whichever edge
     * of the window play is heading toward — `clamped`'s own fallback to `1`
     * would otherwise read as "at the start," the opposite edge, and the
     * checks below would ask for more room on the wrong side (or see
     * `total - 1` and think there's plenty of room left, when the real
     * position ran out of window a render ago). Growing unconditionally here,
     * ahead of the margin check, is the recovery: it does not fix the render
     * that already showed the held-over last-good frame, but it gets the
     * window to include `dayAd` again as fast as this effect can act. */
    if (foundIndex === null) {
      if (play.dir === 1 && !atLimit.end) {
        if (monthsFwd < MAX_MONTHS_EACH) setMonthsFwd((m) => m + 1);
        else setAnchor((a) => shiftAnchorMonths(a, 1));
      }
      if (play.dir === -1 && !atLimit.start) {
        if (monthsBack < MAX_MONTHS_EACH) setMonthsBack((m) => m + 1);
        else setAnchor((a) => shiftAnchorMonths(a, -1));
      }
      return;
    }

    /* A fixed 7-day margin is fine at 1×, but at 32× the tick fires every
       33ms — about 30 days a second — and burns through 7 days in ~230ms.
       That's not much runway for a state update to land and `days` to
       re-slice before playback reaches a day the window hasn't grown to
       cover yet (the recovery above catches it when it happens, but better to
       not need it). Scaling the margin with speed keeps roughly the same
       time-to-edge at every speed instead of a shrinking one. */
    const margin = Math.max(EXTEND_MARGIN, play.speed);

    if (play.dir === 1 && total - clamped <= margin && !atLimit.end) {
      if (monthsFwd < MAX_MONTHS_EACH) setMonthsFwd((m) => m + 1);
      else setAnchor((a) => shiftAnchorMonths(a, 1));
    }
    if (play.dir === -1 && clamped <= margin && !atLimit.start) {
      if (monthsBack < MAX_MONTHS_EACH) setMonthsBack((m) => m + 1);
      else setAnchor((a) => shiftAnchorMonths(a, -1));
    }
  }, [play.dir, play.speed, foundIndex, clamped, total, windowFetching, atLimit, monthsBack, monthsFwd]);

  const pausePlay = useCallback(() => setPlay({ dir: 0, speed: 1 }), []);

  /* The web dock still hands back a 1-based index; translate it to the date the
     rest of the page runs on. */
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
    [days],
  );

  const stepForward = useCallback(() => {
    setPlay((p) =>
      p.dir === 1 ? { dir: 1, speed: Math.min(p.speed * 2, MAX_PLAY_SPEED) } : { dir: 1, speed: 1 },
    );
  }, []);
  const stepBackward = useCallback(() => {
    setPlay((p) =>
      p.dir === -1
        ? { dir: -1, speed: Math.min(p.speed * 2, MAX_PLAY_SPEED) }
        : { dir: -1, speed: 1 },
    );
  }, []);

  /* A date from the header or the fullscreen picker re-centres the window on it;
     the landing effect then puts the needle on that day. */
  const handleDateChange = useCallback(
    (d: Date) => {
      pausePlay();
      scrubbingRef.current = false;
      setClockUserAdjusted(false);
      setDate(d);
      setAnchor(d);
      setDayAd(toAdStr(d));
      setMonthsBack(1);
      setMonthsFwd(1);
    },
    [pausePlay],
  );

  const handleClockChange = useCallback(
    (next: string) => {
      setClockUserAdjusted(true);
      setClock(next);
    },
    [setClock],
  );

  /* Deliberately not reset per day: playback changes the date every tick, and a
     time you set in the picker should ride along with it instead of snapping
     back to each day's sunrise. Picking a new date clears it (see
     handleDateChange). */

  useEffect(() => {
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

  const monthNe = current ? (BS_MONTHS_NE[current.bsMonth - 1] ?? "") : "";
  const locationLabel = displayLocationLabel(location, current?.p?.location?.name, lang);
  const playbackRateLabel = useMemo(() => {
    if (play.dir === 0) return undefined;
    return formatWheelPlaybackRate(play.speed, (n) => String(digits(n)), pick);
  }, [play.dir, play.speed, digits, pick]);
  const fallbackStageHeight = computeYearWheelStageHeight({
    screenH,
    safeAreaTop: insets.top,
    dateNavHeight,
    isTablet,
  });
  const stageHeight = Math.max(500, bodyHeight > 80 ? bodyHeight - 32 : fallbackStageHeight);

  const windowLabel = useMemo(() => {
    const from = adToBS(parseAdStr(bounds.startAd));
    const to = adToBS(parseAdStr(bounds.endAd));
    const name = (m: number) => pick(BS_MONTHS_NE[m - 1] ?? "", BS_MONTH_NAMES[m - 1] ?? "");
    return `${name(from.month)} ${digits(from.day)} — ${name(to.month)} ${digits(to.day)}`;
  }, [bounds, pick, digits]);

  const headerToolbar = !isCompact ? (
    <LocationSelector
      location={location}
      onLocationChange={setLocation}
      className="max-w-[8rem]"
    />
  ) : undefined;

  return (
    <AppShell title="" showHeader={false} scroll={false}>
      <View
        onLayout={(e) => setDateNavHeight(e.nativeEvent.layout.height)}
      >
        <PanchangaDateNav
          date={date}
          onDateChange={handleDateChange}
          todayAd={todayAd}
          adDateStr={adDateStr}
          wheelData={wheelData}
          clock={clock}
          onClockChange={handleClockChange}
          location={location}
          onLocationChange={setLocation}
          toolbar={headerToolbar}
          hideNavLocation={!isCompact}
        />
      </View>

      <View
        className="min-h-0 flex-1 gap-3"
        onLayout={(e) => setBodyHeight(e.nativeEvent.layout.height)}
      >
        <PanchangaWheel
          p={current?.p}
          loading={windowLoading || !current}
          bsYear={bsYear}
          bsMonthNe={monthNe || BS_MONTHS_NE[0]!}
          bsDay={current?.bsDay ?? 1}
          isToday={current?.dateAd === todayAd}
          timezone={tz}
          locationLabel={locationLabel}
          clock={clock}
          stageHeight={stageHeight}
          calendarPick={{
            year: current?.bsYear ?? bsYear,
            month: current?.bsMonth ?? 1,
            day: current?.bsDay ?? 1,
            clock,
            todayAd,
            onCommit: (year, month, day, nextClock) => {
              const nextDay = Math.min(day, getBSMonthLength(year, month));
              handleDateChange(bsToAD(year, month, nextDay));
              handleClockChange(nextClock);
            },
          }}
          yearScrub={{
            day: clamped,
            totalDays: total || 1,
            direction: play.dir,
            speed: play.speed,
            onForward: stepForward,
            onBackward: stepBackward,
            onPause: pausePlay,
            onDayChange: (d) => {
              pausePlay();
              jumpToIndex(d);
            },
            onJumpDay: (d) => {
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
            playbackRateLabel,
          }}
        />

        {windowError ? (
          <View className="rounded-xl border border-destructive/20 bg-destructive/10 p-4">
            <Text className="text-body text-destructive" style={nepaliTextStyle(13)}>
              {pick("पञ्चाङ्ग लोड गर्न सकिएन।", "Could not load the panchanga.")}
            </Text>
          </View>
        ) : windowFetching ? (
          <Text className="text-caption px-1 text-muted-foreground" style={nepaliTextStyle(11)}>
            {pick("लोड हुँदै…", "Loading…")}
          </Text>
        ) : total ? (
          <Text className="text-caption px-1 text-muted-foreground" style={nepaliTextStyle(11)}>
            {windowLabel} · {pick(`${digits(total)} दिन`, `${total} days`)}
          </Text>
        ) : null}
      </View>
    </AppShell>
  );
}
