import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { keepPreviousData, useQueries } from "@tanstack/react-query";
import { Link, getRouteApi } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import {
  fetchYearWheelCalendar,
  locationCacheKey,
  yearWheelKeys,
  type PanchangaDay,
} from "@/lib/api";
import {
  adToBS,
  bsToAD,
  BS_MONTH_NAMES,
  BS_MONTHS_NE,
  BS_SUPPORTED_END_YEAR,
  BS_SUPPORTED_START_YEAR,
  getBSMonthLength,
  shiftBsMonth,
} from "@/lib/bs-calendar";
import { useLocale, bilingualText } from "@/i18n/locale";
import { formatTimeShort, getSunrise, toNepaliDigits } from "@/lib/panchanga-format";
import { resolveTimeZone, todayAdStringInTimezone } from "@/lib/zoned-time";
import { useRouteLoading } from "@/lib/route-loading";
import { PanchangaWheel } from "@/components/panchanga/PanchangaWheel";
import { LocationSelector } from "@/components/panchanga/LocationSelector";
import { PatroDayTimeNav } from "@/components/patro-date";
import {
  displayLocationLabel,
  usePanchangaLocation,
} from "@/components/panchanga/use-panchanga-location";
import { defaultClockForTimezone } from "@/components/panchanga/use-panchanga-mode";
import { useCalendarEra } from "@/hooks/use-calendar-era";
import { usePatroPanchangaUrlBrowse } from "@/hooks/use-patro-url-browse";
import { civilIsoFromDate } from "@/lib/patro-day";
import { patroDayFetchFromApiBsParts } from "@/lib/patro-day-url";
import {
  buildYearWheelDays,
  sliceWheelWindow,
  wheelWindowAtLimit,
  wheelWindowBounds,
  yearWheelIndexOfAdDate,
  type YearWheelDay,
} from "@/lib/panchanga-year-wheel";
import {
  formatWheelPlaybackRate,
  WHEEL_MAX_PLAY_SPEED,
  WHEEL_PLAY_BASE_MS,
} from "@/lib/wheel-year-playback";
import { buildPatroBrowseYearOptions, pickBrowseVikramDate } from "@/lib/patro-date-options";
import type { Era } from "@/lib/era";
import { RelatedPageLinks } from "@/components/related/RelatedPageLinks";
import {
  currentPatroDayLinkSearch,
  patroDayBrowseNavigateSearch,
  sameSearch,
  searchToLocation,
  type PanchangaSearch,
} from "@/lib/url-state";

const PLAY_BASE_MS = WHEEL_PLAY_BASE_MS;
const MAX_PLAY_SPEED = WHEEL_MAX_PLAY_SPEED;
const EXTEND_MARGIN_PLAY = 45;
const MAX_MONTHS_EACH = 3;
const YEAR_ROUTE_LOADING = false;

const routeApi = getRouteApi("/panchanga-shell/panchanga/year");

function toAdStr(d: Date): string {
  return civilIsoFromDate(d);
}

function parseAdStr(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function shiftAnchorMonths(centre: Date, delta: number): Date {
  const bs = adToBS(centre);
  const next = shiftBsMonth(bs.year, bs.month, delta);
  return bsToAD(next.year, next.month, Math.min(bs.day, getBSMonthLength(next.year, next.month)));
}

function isLegacyYearRangeSearch(search: PanchangaSearch & { to?: number; toMonth?: number }): boolean {
  if (search.to != null || search.toMonth != null) return true;
  return search.year != null && search.month == null && search.day == null;
}

export function PanchangaYear() {
  const { t } = useTranslation();
  const { lang, digits } = useLocale();
  const langEra = useCalendarEra();
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const { location, setLocation } = usePanchangaLocation(searchToLocation(search));

  const dayBrowse = usePatroPanchangaUrlBrowse(search, navigate, location, setLocation);
  const {
    dayState,
    date,
    setDate,
    setDisplayEra,
    clock,
    setClock,
  } = dayBrowse;
  const browseEra = dayState.display.era;

  const [clockUserAdjusted, setClockUserAdjusted] = useState(false);
  const clockSyncedKeyRef = useRef<string | null>(null);

  const [anchor, setAnchor] = useState(() => new Date(date.getTime()));
  const adDateStr = toAdStr(date);
  const bsYear = adToBS(date).year;

  const tz = resolveTimeZone(undefined, location.params.timezone);
  const todayAd = todayAdStringInTimezone(new Date(), tz);
  const isToday = adDateStr === todayAd;

  const [dayAd, setDayAd] = useState(() => toAdStr(date));
  const [play, setPlay] = useState<{ dir: -1 | 0 | 1; speed: number }>({ dir: 0, speed: 1 });
  const [monthsBack, setMonthsBack] = useState(1);
  const [monthsFwd, setMonthsFwd] = useState(1);
  const scrubbingRef = useRef(false);
  const [lastWheelData, setLastWheelData] = useState<PanchangaDay | undefined>(undefined);
  const lastGoodRowRef = useRef<YearWheelDay | undefined>(undefined);
  const prevPlayDirRef = useRef(play.dir);

  useEffect(() => {
    const legacy = search as PanchangaSearch & { to?: number; toMonth?: number };
    if (!isLegacyYearRangeSearch(legacy)) return;
    const cur = adToBS(new Date());
    const y = legacy.year ?? cur.year;
    const m = legacy.month ?? (y === cur.year ? cur.month : 1);
    const d = legacy.day ?? (y === cur.year && m === cur.month ? cur.day : 1);
    const desired = patroDayBrowseNavigateSearch(
      location,
      patroDayFetchFromApiBsParts({ year: y, month: m, day: d }, dayState.display),
    );
    if (!sameSearch(desired, search)) {
      navigate({ search: desired, replace: true });
    }
  }, [search, location, navigate, dayState.display]);

  useEffect(() => {
    const wasPlaying = prevPlayDirRef.current !== 0;
    prevPlayDirRef.current = play.dir;

    if (scrubbingRef.current || play.dir !== 0) return;
    // On the frame autoplay stops, the wheel day is ahead of the URL — sync URL
    // first (effect below). Pulling dayAd back to stale adDateStr here caused a
    // setDate ↔ setDayAd loop and "Maximum update depth exceeded".
    if (wasPlaying) return;
    if (dayAd === adDateStr) return;
    // Syncing the wheel back to the browsed date once autoplay has settled —
    // not a prop mirrored into state, but a resync gated on `wasPlaying` and
    // `scrubbingRef` above. Moving it out of the effect reintroduces the
    // setDate <-> setDayAd loop the comment above this effect documents.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDayAd(adDateStr);
    setAnchor(parseAdStr(adDateStr));
  }, [adDateStr, play.dir, dayAd]);

  const bounds = useMemo(
    () => wheelWindowBounds(anchor, monthsBack, monthsFwd),
    [anchor, monthsBack, monthsFwd],
  );
  const atLimit = useMemo(() => wheelWindowAtLimit(bounds), [bounds]);

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

  const yearQueries = useQueries({
    queries: queryYears.map((y) => ({
      queryKey: yearWheelKeys.year(y, location.params, browseEra === "bbs" ? "bbs" : "bs"),
      queryFn: () =>
        fetchYearWheelCalendar(y, location.params, browseEra === "bbs" ? "bbs" : "bs"),
      staleTime: Number.POSITIVE_INFINITY,
      gcTime: 1000 * 60 * 10,
      placeholderData: keepPreviousData,
    })),
  });

  const windowLoading = yearQueries.some((q) => q.isLoading && !q.data);
  const windowFetching = yearQueries.some((q) => q.isFetching);
  const windowError = yearQueries.some((q) => q.isError);
  const yearsStamp = yearQueries.map((q) => q.dataUpdatedAt).join("|");

  const days = useMemo(() => {
    const all = yearQueries
      .flatMap((q) => buildYearWheelDays(q.data))
      .sort((a, b) => a.dateAd.localeCompare(b.dateAd));
    return sliceWheelWindow(all, bounds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearsStamp, bounds]);

  const total = days.length;
  const foundIndex = yearWheelIndexOfAdDate(days, dayAd);
  const foundRow = foundIndex !== null ? days[foundIndex - 1] : undefined;
  /* `foundIndex` is null for one render whenever `days` is mid-rebuild
     (window growing/sliding, or a high-speed tick that outran the slice).
     Falling back to `days[0]` used to flash the window-start day's planets
     — the moon jumping forward, then snapping back. Repeat the last row
     that resolved instead. */
  const current = foundIndex !== null ? foundRow : lastGoodRowRef.current;
  if (current) lastGoodRowRef.current = current;
  const clamped = foundIndex ?? (current ? yearWheelIndexOfAdDate(days, current.dateAd) : null) ?? 1;
  const wheelData = current?.p;
  if (wheelData && wheelData !== lastWheelData) {
    setLastWheelData(wheelData);
  }
  const displayWheelData = wheelData ?? lastWheelData;

  useEffect(() => {
    if (scrubbingRef.current || play.dir !== 0) return;
    if (!dayAd || dayAd === adDateStr) return;
    setDate(parseAdStr(dayAd));
  }, [dayAd, adDateStr, setDate, play.dir]);

  useEffect(() => {
    if (play.dir === 0 || !total) return;
    const tick = Math.max(33, Math.round(PLAY_BASE_MS / play.speed));
    const id = setInterval(() => {
      setDayAd((ad) => {
        const i = days.findIndex((d) => d.dateAd === ad);
        /* A missed lookup used to treat the current day as index 0, so
           playback jumped to the start of the window and the moon reversed. */
        if (i < 0) return ad;
        const next = i + play.dir;
        return days[next]?.dateAd ?? ad;
      });
    }, tick);
    return () => clearInterval(id);
  }, [play, total, days]);

  useEffect(() => {
    if (play.dir === 0 || !total) return;
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
    const margin = Math.max(EXTEND_MARGIN_PLAY, play.speed);
    if (play.dir === 1 && total - clamped <= margin && !atLimit.end) {
      // Autoplay approaching the loaded window's edge: widen it, which feeds
      // back through `bounds`/`queryYears` to fetch the next year-wheel data.
      // A data fetch triggered from derived state, not a prop mirrored into
      // state — see react.dev's "Update external systems" case for effects.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (monthsFwd < MAX_MONTHS_EACH) setMonthsFwd((m) => m + 1);
      else setAnchor((a) => shiftAnchorMonths(a, 1));
    }
    if (play.dir === -1 && clamped <= margin && !atLimit.start) {
      if (monthsBack < MAX_MONTHS_EACH) setMonthsBack((m) => m + 1);
      else setAnchor((a) => shiftAnchorMonths(a, -1));
    }
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
    [pausePlay, setDate],
  );

  const handleClockChange = useCallback(
    (next: string) => {
      setClockUserAdjusted(true);
      setClock(next);
    },
    [setClock],
  );

  useEffect(() => {
    /* During autoplay the day changes every tick; snapping the clock to each
       day's sunrise used to feed a stale ghati into planet interpolation.
       Planets now use the day's snapshot, but skip the resync while playing
       so the chrome does not flicker either. */
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
  const locationLabel = displayLocationLabel(location, wheelData?.location?.name, lang);

  const windowLabel = useMemo(() => {
    const from = adToBS(parseAdStr(bounds.startAd));
    const to = adToBS(parseAdStr(bounds.endAd));
    const name = (m: number) =>
      lang === "en" ? BS_MONTH_NAMES[m - 1] ?? "" : BS_MONTHS_NE[m - 1] ?? "";
    return `${name(from.month)} ${digits(from.day)} — ${name(to.month)} ${digits(to.day)}`;
  }, [bounds, lang, digits]);

  const pickerYearOptions = useMemo(
    () => buildPatroBrowseYearOptions(browseEra),
    [browseEra],
  );

  const playbackRateLabel = useMemo(() => {
    if (play.dir === 0) return undefined;
    return formatWheelPlaybackRate(play.speed, digits, (ne, en) => bilingualText(lang, ne, en));
  }, [play.dir, play.speed, digits, lang]);

  const handleCalendarCommit = useCallback(
    (nextEra: Era, y: number, m: number, d: number, nextClock: string) => {
      pausePlay();
      scrubbingRef.current = false;
      setClockUserAdjusted(true);
      setClock(nextClock);
      if (nextEra !== browseEra) {
        setDisplayEra(nextEra, { year: y, month: m, day: d });
      }
      pickBrowseVikramDate(
        (picked) => {
          const ad = toAdStr(picked);
          clockSyncedKeyRef.current = `${ad}|${locationCacheKey(location.params)}`;
          setDate(picked);
          setAnchor(picked);
          setDayAd(ad);
          setMonthsBack(1);
          setMonthsFwd(1);
        },
        nextEra,
        y,
        m,
        d,
        location.params,
      );
    },
    [pausePlay, setClock, setDate, setDisplayEra, browseEra, location.params],
  );

  useRouteLoading(YEAR_ROUTE_LOADING);

  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-16 pt-4 max-md:px-0 max-md:pb-16 max-md:pt-0">
      <div className="mb-3 mt-2">
        <Link
          to="/panchanga"
          search={currentPatroDayLinkSearch(location, { era: langEra })}
          className="mb-1.5 inline-flex items-center gap-1 text-xs text-base hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("panchanga_year.back")}
        </Link>
        <h1 className="m-0 text-xl font-bold leading-tight tracking-tight">
          {t("panchanga_year.title")}
        </h1>
      </div>

      <PatroDayTimeNav
        era={browseEra}
        date={date}
        vikram={wheelData?.date_parts?.vikram}
        civilDateAd={wheelData?.date_ad}
        gregorian={wheelData?.date_parts?.gregorian}
        onDateChange={handleDateChange}
        onEraChange={setDisplayEra}
        todayAd={todayAd}
        clock={clock}
        onClockChange={handleClockChange}
        location={location}
        onLocationChange={setLocation}
        toolbar={
          <LocationSelector
            compact
            location={location}
            onLocationChange={setLocation}
            className="h-[30px] min-w-0 w-auto max-w-[10rem] shrink-0 px-1.5 md:h-8 md:max-w-[12.5rem] md:px-3"
          />
        }
        /* `toolbar` is desktop-only furniture — on mobile PatroDateNavCore
           already adds its own location chip in the lower slot from
           `location`/`onLocationChange` below, so without this the same
           city showed twice (see Panchanga.tsx, which overrides
           `mobileToolbar` the same way). `false` (not `undefined`) so the
           `resolvedMobileToolbar ?? toolbar` fallback in PatroDayTimeNav
           doesn't quietly put the desktop toolbar back. */
        mobileToolbar={false}
      />

      <div className="mt-4 flex flex-col gap-4">
        <PanchangaWheel
          p={displayWheelData}
          loading={!displayWheelData && windowLoading}
          bsYear={current?.bsYear ?? bsYear}
          bsMonthNe={monthNe || BS_MONTHS_NE[0]!}
          bsDay={current?.bsDay ?? 1}
          isToday={current?.dateAd === todayAd}
          timezone={tz}
          locationLabel={locationLabel}
          clock={clock}
          atTimeDayState={dayState.kind === "input" ? dayState : undefined}
          yearScrub={{
            day: clamped,
            totalDays: total || 1,
            direction: play.dir,
            speed: play.speed,
            playbackRateLabel,
            onForward: stepForward,
            onBackward: stepBackward,
            onPause: pausePlay,
            calendarPick: {
              era: browseEra,
              year: current?.bsYear ?? bsYear,
              month: current?.bsMonth ?? adToBS(date).month,
              day: current?.bsDay ?? adToBS(date).day,
              yearOptions: pickerYearOptions,
              todayAd,
              clock,
              locationParams: location.params,
              onCommit: handleCalendarCommit,
              onEraChange: setDisplayEra,
            },
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
          }}
        />

        {windowError ? (
          <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
            {t("panchanga_year.error")}
          </div>
        ) : windowFetching ? (
          <p className="m-0 px-1 text-xs text-base">
            {bilingualText(lang, "लोड हुँदै…", "Loading…")}
          </p>
        ) : total ? (
          <p className="m-0 px-1 text-xs text-base">
            {windowLabel} · {bilingualText(lang, `${toNepaliDigits(total)} दिन`, `${total} days`)}
          </p>
        ) : null}
      </div>

      <RelatedPageLinks />
    </div>
  );
}
