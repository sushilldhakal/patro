import { useCallback, useEffect, useMemo } from "react";
import { Link, getRouteApi } from "@tanstack/react-router";
import { CalendarRange } from "lucide-react";
import { usePanchangaPage } from "@vedic-patro/features/panchanga";
import { fetchPanchangaCivilDay, fetchPanchangaDay, panchangaKeys } from "@/lib/api";
import { civilAnchorFromPanchangaDay, civilPartsFromPickerDate } from "@vedic-patro/domain/patro-day";
import { isGregorianEraBrowse } from "@vedic-patro/domain/patro-month-labels";
import { fetchEphemerisPanchangaDay } from "@/lib/ephemeris-adapters";
import { PatroDayTimeNav } from "@/components/patro-date";
import { useCalendarEra } from "@/hooks/use-calendar-era";
import { usePatroPanchangaUrlBrowse } from "@/hooks/use-patro-url-browse";
import { GhatiClock } from "@/components/panchanga/GhatiClock";
import { DayTimeline, DayCycleToggle } from "@/components/panchanga/DayTimeline";
import { PanchangaWheel } from "@/components/panchanga/PanchangaWheel";
import { LocationSelector } from "@/components/panchanga/LocationSelector";
import { LearnMoreCard } from "@/components/LearnMoreCard";
import { SeoContentSection } from "@/components/seo/SeoContentSection";
import { cn } from "@vedic-patro/domain/utils";
import { panchangaPageClasses } from "@vedic-patro/design-tokens/classes/panchanga-page-classes";
import { PlanetEventsPanel } from "@/components/panchanga/PlanetEventsPanel";
import { GocharPromoCard } from "@/components/gochar/GocharPromoCard";
import { RelatedPageLinks } from "@/components/related/RelatedPageLinks";
import { EphemerisModeBanner } from "@/components/panchanga/MuhurtaNowPanel";
import { SunriseD1ChartPanel } from "@/components/panchanga/SunriseD1ChartPanel";
import { usePanchangaLocation } from "@/components/panchanga/use-panchanga-location";
import { currentPatroYearRangeLinkSearch, searchToLocation } from "@/lib/url-state";
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
import type { Era } from "@vedic-patro/domain/era";

/** Panchanga scrubs date/time in-place; never block the whole page with the route overlay. */
const PANCHANGA_ROUTE_LOADING = false;

const routeApi = getRouteApi("/panchanga");

/** Daily panchanga — the website's drawing of `usePanchangaPage` (@vedic-patro/features). */
export function Panchanga() {
  const langEra = useCalendarEra();
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();

  const { location, setLocation } = usePanchangaLocation(searchToLocation(search));
  const dayBrowse = usePatroPanchangaUrlBrowse(search, navigate, location, setLocation);
  const { dayState, date, setDate, syncPickerFromDateAd, syncResolvedPatroDay, clock, setClock, setDisplayEra } = dayBrowse;
  const browseEra = dayState.display.era;
  const atTimeClock = clock.split(":").length >= 3 ? clock : `${clock}:00`;

  const page = usePanchangaPage({
    location,
    date,
    clock,
    setClock,
    openedWithTime: Boolean(search.time),
    sources: {
      udaya: {
        queryKey: panchangaKeys.daySelection(dayState, location.params),
        queryFn: () => fetchPanchangaDay(dayState, location.params),
      },
      atTime: ({ wheel }) => ({
        queryKey: panchangaKeys.atTimeDay(dayState, atTimeClock, location.params),
        queryFn: () => fetchEphemerisPanchangaDay(dayState, atTimeClock, location.params, { resolvedJdUt: wheel?.jd_ut ?? undefined }),
        enabled: wheel != null && (dayState.kind === "input" || (wheel.jd_ut != null && wheel.date_parts?.gregorian?.era !== "bc")),
      }),
      midnight: (civilDateAd) => ({
        queryKey: panchangaKeys.civilDay(civilDateAd, location.params),
        queryFn: () => fetchPanchangaCivilDay(civilDateAd, dayState.display, location.params),
      }),
      civilEra: browseEra,
    },
  });
  const { wheelData, data, angaData, bs, showWheelSkeleton, dayCycleMode, setDayCycleMode } = page;

  /* The resolved day drives the picker and the URL — but not while
     keepPreviousData still shows the day being left (that undid the jump). */
  const udayaPlaceholder = page.wheelIsPlaceholder;
  useEffect(() => {
    if (!wheelData || udayaPlaceholder) return;
    const ad = civilAnchorFromPanchangaDay(wheelData);
    if (ad) syncPickerFromDateAd(ad);
    syncResolvedPatroDay({
      date_ad: wheelData.date_ad,
      date_parts: wheelData.date_parts,
      bs_date:
        wheelData.bs_date && typeof wheelData.bs_date === "object"
          ? { year: wheelData.bs_date.year, month: wheelData.bs_date.month, day: wheelData.bs_date.day }
          : undefined,
    });
  }, [wheelData, udayaPlaceholder, syncPickerFromDateAd, syncResolvedPatroDay]);

  const pickerYearOptions = useMemo(() => buildPatroBrowseYearOptions(browseEra), [browseEra]);
  const isGregorianBrowse = isGregorianEraBrowse(browseEra);
  const civilParts = civilPartsFromPickerDate(date);
  const pickerYear = isGregorianBrowse ? civilParts.year : bs.year;
  const pickerMonth = isGregorianBrowse ? civilParts.month : bs.month;
  const pickerDay = isGregorianBrowse ? civilParts.day : bs.day;

  const handleCalendarCommit = useCallback(
    (nextEra: Era, y: number, m: number, d: number, nextClock: string) => {
      const dateChanged = nextEra !== browseEra || y !== pickerYear || m !== pickerMonth || d !== pickerDay;
      page.commitClock(nextClock, dateChanged);
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
    [page, setDate, setDisplayEra, browseEra, location.params, pickerYear, pickerMonth, pickerDay],
  );

  useRouteLoading(PANCHANGA_ROUTE_LOADING);

  return (
    <div className={cn(panchangaPageClasses.page.shell, "px-4 max-md:px-4 max-md:pb-16 max-md:pt-0")}>
      {/* Timeline + aside share a grid; aside sticks only through the ग्रह row,
          then releases before the wheel so everything below spans full width. */}
      <div className={cn(panchangaPageClasses.page.grid, "grid grid-cols-1 items-start max-md:pt-3 xl:grid-cols-[1fr_330px]")}>
        <div className={cn("flex flex-col", panchangaPageClasses.page.mainColumn)}>
          {/* Page-level day-boundary tab: drives the WHOLE page, not just the
              chart. दिन-रात re-reads the moving angas at midnight; date sections
              stay tied to the calendar date. Rides in the header toolbar row
              alongside the location picker — same single-row layout as home. */}
          <PatroDayTimeNav
            era={browseEra}
            date={date}
            vikram={wheelData?.date_parts?.vikram}
            civilDateAd={page.civilAnchor || wheelData?.date_ad}
            gregorian={wheelData?.date_parts?.gregorian}
            onDateChange={setDate}
            onEraChange={setDisplayEra}
            todayAd={page.todayAd}
            clock={clock}
            onClockChange={page.changeClock}
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

          {page.ephemeris && data && (
            <EphemerisModeBanner p={data} clock={clock} viewedDateAd={page.civilAnchor} />
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
              dateAd={page.civilAnchor}
              isToday={page.isToday}
              timezone={page.timeZone}
              needleClock={page.clockUserAdjusted ? clock : undefined}
              showNeedle={page.clockUserAdjusted || page.isToday}
              mode={dayCycleMode}
              onModeChange={setDayCycleMode}
              showToggle={false}
              civil={page.civilTimeline}
              civilLoading={page.civilLoading}
            />
          )}
        </div>

        <aside className={cn("flex flex-col", panchangaPageClasses.page.aside, "xl:sticky xl:top-[76px] xl:self-start")}>
          <GhatiClock sunrise={page.sunrise} sunset={page.sunset} timezone={page.timeZone} />
          {data && <SunriseD1ChartPanel p={data} />}
          {page.jdUt != null && page.civilAnchor ? (
            <PlanetEventsPanel
              jdUt={page.jdUt}
              refDateAd={page.civilAnchor}
              location={location.params}
              browseLocation={location}
            />
          ) : null}
        </aside>
      </div>

      <div className={cn("flex flex-col", panchangaPageClasses.page.sections)}>
        {(wheelData || showWheelSkeleton) && (
          <>
            <PanchangaWheel
              p={wheelData}
              loading={showWheelSkeleton}
              bsYear={bs.year}
              bsMonthNe={bs.monthName}
              bsDay={bs.day}
              isToday={page.isToday}
              timezone={page.timeZone}
              locationLabel={page.locationLabel}
              civil={page.isCivilMode}
              atTimeDayState={dayState.kind === "input" ? dayState : undefined}
              calendarPick={{
                era: browseEra,
                year: pickerYear,
                month: pickerMonth,
                day: pickerDay,
                yearOptions: pickerYearOptions,
                todayAd: page.todayAd,
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
                className={cn(
                  "inline-flex justify-center",
                  panchangaPageClasses.page.yearLink,
                  panchangaPageClasses.page.yearLinkText,
                  "transition-colors hover:bg-secondary/10 hover:text-secondary",
                )}
              >
                <CalendarRange className="size-4" />
                {page.copy.yearLink}
              </Link>
            ) : null}
          </>
        )}

        {page.loadError && (
          <div className={cn(panchangaPageClasses.page.errorBox, panchangaPageClasses.page.errorText)}>{page.copy.error}</div>
        )}

        {data && (
          <div className={cn("flex flex-col", panchangaPageClasses.page.sectionStack)}>
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
        heading={page.copy.learnHeading}
        slugs={page.learnSlugs}
      />

      <RelatedPageLinks className="max-sm:px-2.5" />

      <SeoContentSection route="panchanga" />
    </div>
  );
}
