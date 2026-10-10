import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useLocale } from "@/i18n/locale";
import { Link, getRouteApi } from "@tanstack/react-router";
import { CalendarRange } from "lucide-react";
import {
  ApiError,
  fetchCivilTimeline,
  fetchPanchangaCivilDay,
  fetchPanchangaDay,
  locationCacheKey,
  panchangaKeys,
} from "@/lib/api";
import { civilAnchorFromPanchangaDay, civilPartsFromPickerDate, parseCivilIso } from "@/lib/patro-day";
import { adToBS, BS_MONTHS_NE } from "@/lib/bs-calendar";
import { isGregorianEraBrowse } from "@/components/patro-date/patro-month-labels";
import {
  fetchEphemerisPanchangaDay,
  isEphemerisPanchanga,
} from "@/lib/ephemeris-adapters";
import { formatTimeShort, getSunrise, getSunset } from "@/lib/panchanga-format";
import { resolveTimeZone, todayAdStringInTimezone } from "@/lib/zoned-time";
import { PatroDayTimeNav } from "@/components/patro-date";
import { useCalendarEra } from "@/hooks/use-calendar-era";
import { usePatroPanchangaUrlBrowse } from "@/hooks/use-patro-url-browse";
import { GhatiClock } from "@/components/panchanga/GhatiClock";
import { DayTimeline, DayCycleToggle, type DayCycleMode } from "@/components/panchanga/DayTimeline";
import { PanchangaWheel } from "@/components/panchanga/PanchangaWheel";
import { LocationSelector } from "@/components/panchanga/LocationSelector";
import { LearnMoreCard } from "@/components/LearnMoreCard";
import { SeoContentSection } from "@/components/seo/SeoContentSection";
import { PlanetEventsPanel } from "@/components/panchanga/PlanetEventsPanel";
import { GocharPromoCard } from "@/components/gochar/GocharPromoCard";
import { RelatedPageLinks } from "@/components/related/RelatedPageLinks";
import {
  EphemerisModeBanner,
} from "@/components/panchanga/MuhurtaNowPanel";
import { SunriseD1ChartPanel } from "@/components/panchanga/SunriseD1ChartPanel";
import { usePanchangaLocation, displayLocationLabel } from "@/components/panchanga/use-panchanga-location";
import { defaultClockForTimezone } from "@/components/panchanga/use-panchanga-mode";
import {
  currentPatroYearRangeLinkSearch,
  searchToLocation,
} from "@/lib/url-state";
import {
  DinVisheshSection,
  FestivalsSection,
  NivasShoolSection,
  PanchangCoreSection,
  BalamSection,
  PanchakaLagnaSection,
  RashiSection,
  RituSection,
  SunMoonSamvatSection,
} from "@/components/panchanga/PanchangaSections";
import { useRouteLoading } from "@/lib/route-loading";
import { buildPatroBrowseYearOptions, pickAdDate, pickBrowseVikramDate } from "@/lib/patro-date-options";
import type { Era } from "@/lib/era";

/** Panchanga scrubs date/time in-place; never block the whole page with the route overlay. */
const PANCHANGA_ROUTE_LOADING = false;

const routeApi = getRouteApi("/panchanga");

export function Panchanga() {
  const { t } = useTranslation();
  const { lang } = useLocale();
  const langEra = useCalendarEra();
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();

  const { location, setLocation } = usePanchangaLocation(searchToLocation(search));
  const dayBrowse = usePatroPanchangaUrlBrowse(search, navigate, location, setLocation);
  const {
    dayState,
    date,
    setDate,
    syncPickerFromDateAd,
    syncResolvedPatroDay,
    clock,
    setClock,
    setDisplayEra,
  } = dayBrowse;
  const browseEra = dayState.display.era;
  const [clockUserAdjusted, setClockUserAdjusted] = useState(false);

  const udayaQuery = useQuery({
    queryKey: panchangaKeys.daySelection(dayState, location.params),
    queryFn: () => fetchPanchangaDay(dayState, location.params),
    staleTime: 1000 * 60 * 30,
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    // keepPreviousData leaves yesterday's payload in `data` while the new day
    // loads. Syncing that back undoes the wheel date jump and scrolls to top.
    if (udayaQuery.isPlaceholderData) return;
    const payload = udayaQuery.data;
    if (!payload) return;
    const ad = civilAnchorFromPanchangaDay(payload);
    if (ad) syncPickerFromDateAd(ad);
    syncResolvedPatroDay({
      date_ad: payload.date_ad,
      date_parts: payload.date_parts,
      bs_date:
        payload.bs_date && typeof payload.bs_date === "object"
          ? {
              year: payload.bs_date.year,
              month: payload.bs_date.month,
              day: payload.bs_date.day,
            }
          : undefined,
    });
  }, [udayaQuery.data, udayaQuery.isPlaceholderData, syncPickerFromDateAd, syncResolvedPatroDay]);

  const wheelData = udayaQuery.data;
  const civilAnchor = wheelData ? civilAnchorFromPanchangaDay(wheelData) : "";
  const hasCivilAnchor = civilAnchor.trim().length > 0;
  const adDateStr = civilAnchor;
  const isCeCivilDay = useMemo(() => {
    const gEra = wheelData?.date_parts?.gregorian?.era;
    if (gEra === "bc") return false;
    if (!hasCivilAnchor) return false;
    try {
      return parseCivilIso(civilAnchor).year >= 1;
    } catch {
      return false;
    }
  }, [wheelData?.date_parts?.gregorian?.era, civilAnchor, hasCivilAnchor]);
  const jdUt = wheelData?.jd_ut;
  const atTimeClock =
    clock.split(":").length >= 3 ? clock : `${clock}:00`;

  const atTimeReady =
    wheelData != null &&
    (dayState.kind === "input" ||
      (jdUt != null && wheelData.date_parts?.gregorian?.era !== "bc"));

  const instantQuery = useQuery({
    queryKey: panchangaKeys.atTimeDay(dayState, atTimeClock, location.params),
    queryFn: () =>
      fetchEphemerisPanchangaDay(dayState, atTimeClock, location.params, {
        resolvedJdUt: jdUt ?? undefined,
      }),
    staleTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
    enabled: atTimeReady,
  });

  // दिन-चक्र day boundary: sunrise→sunrise (default) vs midnight→midnight.
  // The civil timeline is fetched lazily, only when Calendar Day is active.
  const [dayCycleMode, setDayCycleMode] = useState<DayCycleMode>("Day-Night");
  const civilQuery = useQuery({
    queryKey: panchangaKeys.civil(civilAnchor, location.params),
    queryFn: () => fetchCivilTimeline(civilAnchor, browseEra, location.params),
    enabled: dayCycleMode === "Calendar Day" && hasCivilAnchor,
    staleTime: 1000 * 60 * 30,
    placeholderData: keepPreviousData,
  });

  const midnightDayQuery = useQuery({
    queryKey: panchangaKeys.civilDay(civilAnchor, location.params),
    queryFn: () =>
      fetchPanchangaCivilDay(civilAnchor, dayState.display, location.params),
    enabled: dayCycleMode === "Calendar Day" && hasCivilAnchor,
    staleTime: 1000 * 60 * 30,
    placeholderData: keepPreviousData,
  });

  const instantData = instantQuery.data;
  const data = instantData ?? (isCeCivilDay ? undefined : wheelData);
  const isError = udayaQuery.isError && !wheelData;
  const ephemeris = isEphemerisPanchanga(instantData);

  const showWheelSkeleton = udayaQuery.isLoading && !wheelData;

  // The backend already resolved this day in every era, so read its answer.
  // `adToBS` is the offline skeleton only — it is built from a Vikram-era month
  // table and cannot date a pre-epoch day, which is how a BBS day rendered as
  // "पू.वि.सं. १" no matter which year was asked for.
  const bs = useMemo(() => {
    const vikram = wheelData?.date_parts?.vikram;
    if (vikram) {
      return {
        year: vikram.year,
        month: vikram.month,
        day: vikram.day,
        monthName: BS_MONTHS_NE[vikram.month - 1] ?? "",
      };
    }
    return adToBS(date);
  }, [wheelData?.date_parts?.vikram, date]);

  // Reference source for the "moving" anga sections (तिथि/नक्षत्र/योग/करण, rashi,
  // balam, panchaka/lagna). दिन-रात reads them at midnight; अहोरात्र at sunrise.
  // Date-property sections (festivals, ritu, samvat, sun/moon) always use the
  // civil-date udaya day, so they stay identical across modes.
  const isCivilMode = dayCycleMode === "Calendar Day";
  const angaData = isCivilMode
    ? midnightDayQuery.data ?? wheelData ?? data
    : wheelData ?? data;

  const sunrise = udayaQuery.data
    ? getSunrise(udayaQuery.data)
    : data
      ? getSunrise(data)
      : undefined;
  const sunset = udayaQuery.data
    ? getSunset(udayaQuery.data)
    : data
      ? getSunset(data)
      : undefined;
  const effectiveTimezone = resolveTimeZone(data?.location?.timezone, location.params.timezone);
  const isToday = adDateStr === todayAdStringInTimezone(new Date(), effectiveTimezone);

  const locationLabel = displayLocationLabel(location, data?.location?.name, lang);
  const todayAd = todayAdStringInTimezone(new Date(), effectiveTimezone);

  const hadUrlTimeRef = useRef(Boolean(search.time));
  const clockSyncedKeyRef = useRef<string | null>(null);
  const keepClockOnDateRef = useRef(false);
  const [trackedAdDate, setTrackedAdDate] = useState(adDateStr);
  if (adDateStr !== trackedAdDate) {
    setTrackedAdDate(adDateStr);
    if (keepClockOnDateRef.current) {
      keepClockOnDateRef.current = false;
      clockSyncedKeyRef.current = `${adDateStr}|${locationCacheKey(location.params)}`;
    } else {
      setClockUserAdjusted(false);
    }
  }

  const handleClockChange = useCallback(
    (next: string) => {
      setClockUserAdjusted(true);
      setClock(next);
    },
    [setClock],
  );

  const pickerYearOptions = useMemo(
    () => buildPatroBrowseYearOptions(browseEra),
    [browseEra],
  );
  const isGregorianBrowse = isGregorianEraBrowse(browseEra);
  const civilParts = civilPartsFromPickerDate(date);
  const pickerYear = isGregorianBrowse ? civilParts.year : bs.year;
  const pickerMonth = isGregorianBrowse ? civilParts.month : bs.month;
  const pickerDay = isGregorianBrowse ? civilParts.day : bs.day;

  const handleCalendarCommit = useCallback(
    (nextEra: Era, y: number, m: number, d: number, nextClock: string) => {
      const dateChanged =
        nextEra !== browseEra || y !== pickerYear || m !== pickerMonth || d !== pickerDay;
      if (dateChanged) keepClockOnDateRef.current = true;
      setClockUserAdjusted(true);
      setClock(nextClock);
      if (nextEra !== browseEra) {
        setDisplayEra(nextEra, { year: y, month: m, day: d });
        return;
      }
      if (isGregorianEraBrowse(nextEra)) {
        pickAdDate(setDate, y, m, d);
        return;
      }
      pickBrowseVikramDate(setDate, nextEra, y, m, d, location.params);
    },
    [setClock, setDate, setDisplayEra, browseEra, location.params, pickerYear, pickerMonth, pickerDay],
  );

  // Seed the chosen time once per date/location. When the viewed date is today,
  // open at the current wall-clock time in that place so the दिन-चक्र needle and
  // the wheel point at "now" without the user having to scrub. Other days fall
  // back to that day's sunrise. A manual pick (clockUserAdjusted) is preserved.
  useEffect(() => {
    const syncKey = `${adDateStr}|${locationCacheKey(location.params)}`;
    if (clockSyncedKeyRef.current === syncKey) return;
    if (clockUserAdjusted) return;

    if (isToday) {
      clockSyncedKeyRef.current = syncKey;
      hadUrlTimeRef.current = false;
      setClock(defaultClockForTimezone(effectiveTimezone));
      return;
    }

    // Non-today: honor an explicitly shared time on the very first load, then
    // default a subsequent day/location change to that day's sunrise.
    const sunrise = formatTimeShort(
      udayaQuery.data ? getSunrise(udayaQuery.data) : undefined,
    );
    if (!sunrise) return;

    if (hadUrlTimeRef.current && clockSyncedKeyRef.current === null) {
      hadUrlTimeRef.current = false;
      clockSyncedKeyRef.current = syncKey;
      return;
    }

    clockSyncedKeyRef.current = syncKey;
    setClock(sunrise);
  }, [
    adDateStr,
    location.params,
    isToday,
    effectiveTimezone,
    clockUserAdjusted,
    udayaQuery.data,
    setClock,
  ]);

  useRouteLoading(PANCHANGA_ROUTE_LOADING);

  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-16 pt-4 max-md:px-4 max-md:pb-16 max-md:pt-0">
      {/* Timeline + aside share a grid; aside sticks only through the ग्रह row,
          then releases before the wheel so everything below spans full width. */}
      <div className="mt-2 grid grid-cols-1 items-start gap-x-5 gap-y-4 max-md:pt-3 xl:grid-cols-[1fr_330px]">
        <div className="flex min-w-0 flex-col gap-4">
          {/* Page-level day-boundary tab: drives the WHOLE page, not just the
              chart. दिन-रात re-reads the moving angas at midnight; date sections
              stay tied to the calendar date. Rides in the header toolbar row
              alongside the location picker — same single-row layout as home. */}
          <PatroDayTimeNav
            era={browseEra}
            date={date}
            vikram={wheelData?.date_parts?.vikram}
            civilDateAd={hasCivilAnchor ? civilAnchor : wheelData?.date_ad}
            gregorian={wheelData?.date_parts?.gregorian}
            onDateChange={setDate}
            onEraChange={setDisplayEra}
            todayAd={todayAd}
            clock={clock}
            onClockChange={handleClockChange}
            toolbar={
              <>
                <DayCycleToggle mode={dayCycleMode} onModeChange={setDayCycleMode} size="md" />
                <LocationSelector
                  compact
                  location={location}
                  onLocationChange={setLocation}
                  className="h-[30px] min-w-0 w-auto max-w-[10rem] shrink-0 px-1.5 md:h-8 md:max-w-[12.5rem] md:px-3"
                />
              </>
            }
            location={location}
            onLocationChange={setLocation}
            mobileToolbar={
              <DayCycleToggle mode={dayCycleMode} onModeChange={setDayCycleMode} size="md" />
            }
          />

          {ephemeris && data && (
            <EphemerisModeBanner p={data} clock={clock} viewedDateAd={adDateStr} />
          )}

          {/* Timeline shares the wheel's udaya (sunrise-to-sunrise) day for the
              viewed civil date so the two never disagree. Feeding it the
              ephemeris at-time day instead made a near-sunrise time (e.g. the
              default clock) roll to the previous vedic day, desyncing it from
              the wheel. On today the needle tracks the live current time; once
              the user scrubs, it pins to their chosen time. */}
          {(wheelData || showWheelSkeleton) && (
            <DayTimeline
              p={wheelData}
              loading={showWheelSkeleton}
              dateAd={adDateStr}
              isToday={isToday}
              timezone={effectiveTimezone}
              needleClock={clockUserAdjusted ? clock : undefined}
              showNeedle={clockUserAdjusted || isToday}
              mode={dayCycleMode}
              onModeChange={setDayCycleMode}
              showToggle={false}
              civil={civilQuery.data}
              civilLoading={civilQuery.isLoading}
            />
          )}
        </div>

        <aside className="flex min-w-0 flex-col gap-4 xl:sticky xl:top-[76px] xl:self-start">
          <GhatiClock sunrise={sunrise} sunset={sunset} timezone={effectiveTimezone} />
          {data && <SunriseD1ChartPanel p={data} />}
          {jdUt != null && hasCivilAnchor ? (
            <PlanetEventsPanel
              jdUt={jdUt}
              refDateAd={civilAnchor}
              location={location.params}
              browseLocation={location}
            />
          ) : null}
        </aside>
      </div>

      <div className="mt-4 flex min-w-0 flex-col gap-4">
        {(wheelData || showWheelSkeleton) && (
          <>
            <PanchangaWheel
              p={wheelData}
              loading={showWheelSkeleton}
              bsYear={bs.year}
              bsMonthNe={bs.monthName}
              bsDay={bs.day}
              isToday={isToday}
              timezone={effectiveTimezone}
              locationLabel={locationLabel}
              civil={isCivilMode}
              atTimeDayState={dayState.kind === "input" ? dayState : undefined}
              calendarPick={{
                era: browseEra,
                year: pickerYear,
                month: pickerMonth,
                day: pickerDay,
                yearOptions: pickerYearOptions,
                todayAd,
                clock,
                locationParams: location.params,
                onCommit: handleCalendarCommit,
                onEraChange: setDisplayEra,
                gridEra: isGregorianBrowse ? "ad" : "bs",
              }}
            />
            {wheelData ? (
              <Link
                to="/panchanga/year"
                search={currentPatroYearRangeLinkSearch(location, langEra)}
                className="inline-flex h-9 items-center justify-center gap-2 self-start rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:bg-secondary/10 hover:text-secondary"
              >
                <CalendarRange className="size-4" />
                {t("panchanga.year_link")}
              </Link>
            ) : null}
          </>
        )}

        {isError && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
            {/* Prefer the backend's own explanation — for an unreachable date
                ("bbs year must be 1..12942", "outside the installed ephemeris
                range") that is the only thing that tells the user what to fix. */}
            {udayaQuery.error instanceof ApiError && udayaQuery.error.detail
              ? udayaQuery.error.detail
              : t("panchanga.error_load")}
          </div>
        )}

        {data && (
          <div className="flex flex-col gap-3">
            <SunMoonSamvatSection p={data} />
            {/* तिथि/नक्षत्र/योग/करण and the rashi / balam / lagna sections read
                from `angaData`: sunrise (udaya) in अहोरात्र mode, or the civil
                date's 00:00 reference in दिन-रात mode, so the text agrees with
                the day-boundary tab above and the midnight-anchored chart. */}
            <PanchangCoreSection p={angaData ?? data} />
            <RashiSection p={angaData ?? data} />
            <RituSection p={data} />
            <BalamSection p={angaData ?? data} clock={clock} />
            <PanchakaLagnaSection p={angaData ?? data} clock={clock} />
            <NivasShoolSection p={data} fallback={wheelData} />
            <DinVisheshSection p={data} />
            <FestivalsSection p={data} />
          </div>
        )}
      </div>

      <GocharPromoCard location={location} className="mt-7 max-sm:px-2.5" />

      <LearnMoreCard
        className="mt-7 max-sm:px-2.5"
        heading={t("panchanga.learn_heading")}
        slugs={["what-is-panchang", "tithi", "nakshatra", "yoga", "karana", "hora"]}
      />

      <RelatedPageLinks className="max-sm:px-2.5" />

      <SeoContentSection route="panchanga" />
    </div>
  );
}
