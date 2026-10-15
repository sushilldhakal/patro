import { useCallback, useEffect, useMemo } from "react";
import { Link, getRouteApi } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { usePanchangaYearPage } from "@vedic-patro/features/panchanga-year";
import { adToBS } from "@vedic-patro/domain/bs-calendar";
import { useRouteLoading } from "@/lib/route-loading";
import { PanchangaWheel } from "@/components/panchanga/PanchangaWheel";
import { PatroDayTimeNav } from "@/components/patro-date";
import { usePanchangaLocation } from "@/components/panchanga/use-panchanga-location";
import { useCalendarEra } from "@/hooks/use-calendar-era";
import { usePatroPanchangaUrlBrowse } from "@/hooks/use-patro-url-browse";
import { patroDayFetchFromApiBsParts } from "@/lib/patro-day-url";
import { buildPatroBrowseYearOptions, pickBrowseVikramDate } from "@/lib/patro-date-options";
import type { Era } from "@vedic-patro/domain/era";
import { RelatedPageLinks } from "@/components/related/RelatedPageLinks";
import {
  currentPatroDayLinkSearch,
  patroDayBrowseNavigateSearch,
  sameSearch,
  searchToLocation,
  type PanchangaSearch,
} from "@/lib/url-state";
import { cn } from "@vedic-patro/domain/utils";
import { panchangaYearClasses } from "@vedic-patro/design-tokens/classes/panchanga-year-classes";

const YEAR_ROUTE_LOADING = false;

const routeApi = getRouteApi("/panchanga-shell/panchanga/year");

function isLegacyYearRangeSearch(search: PanchangaSearch & { to?: number; toMonth?: number }): boolean {
  if (search.to != null || search.toMonth != null) return true;
  return search.year != null && search.month == null && search.day == null;
}

/** Annual panchanga wheel — the website's drawing of `usePanchangaYearPage` (@vedic-patro/features). */
export function PanchangaYear() {
  const langEra = useCalendarEra();
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const { location, setLocation } = usePanchangaLocation(searchToLocation(search));

  const dayBrowse = usePatroPanchangaUrlBrowse(search, navigate, location, setLocation);
  const { dayState, date, setDate, setDisplayEra, clock, setClock } = dayBrowse;
  const browseEra = dayState.display.era;

  const page = usePanchangaYearPage({ era: browseEra, location, date, setDate, setClock });
  const { wheelData } = page;

  /* Older year-range URLs (`?year=` alone, `to`, `toMonth`) open on a day instead. */
  useEffect(() => {
    const legacy = search as PanchangaSearch & { to?: number; toMonth?: number };
    if (!isLegacyYearRangeSearch(legacy)) return;
    const cur = adToBS(new Date());
    const y = legacy.year ?? cur.year;
    const m = legacy.month ?? (y === cur.year ? cur.month : 1);
    const d = legacy.day ?? (y === cur.year && m === cur.month ? cur.day : 1);
    const desired = patroDayBrowseNavigateSearch(location, patroDayFetchFromApiBsParts({ year: y, month: m, day: d }, dayState.display));
    if (!sameSearch(desired, search)) {
      navigate({ search: desired, replace: true });
    }
  }, [search, location, navigate, dayState.display]);

  const pickerYearOptions = useMemo(() => buildPatroBrowseYearOptions(browseEra), [browseEra]);

  const handleCalendarCommit = useCallback(
    (nextEra: Era, y: number, m: number, d: number, nextClock: string) => {
      const land = page.startCalendarCommit(nextClock);
      if (nextEra !== browseEra) setDisplayEra(nextEra, { year: y, month: m, day: d });
      pickBrowseVikramDate(land, nextEra, y, m, d, location.params);
    },
    [page, setDisplayEra, browseEra, location.params],
  );

  useRouteLoading(YEAR_ROUTE_LOADING);

  return (
    <div className={cn(panchangaYearClasses.shell, "max-md:px-0 max-md:pb-16 max-md:pt-0")}>
      <div className={panchangaYearClasses.header}>
        <Link
          to="/panchanga"
          search={currentPatroDayLinkSearch(location, { era: langEra })}
          className={cn(panchangaYearClasses.backLink, "inline-flex hover:text-foreground")}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {page.copy.back}
        </Link>
        <h1 className={panchangaYearClasses.title}>{page.copy.title}</h1>
      </div>

      <PatroDayTimeNav
        era={browseEra}
        date={date}
        vikram={wheelData?.date_parts?.vikram}
        civilDateAd={wheelData?.date_ad}
        gregorian={wheelData?.date_parts?.gregorian}
        onDateChange={page.changeDate}
        onEraChange={setDisplayEra}
        todayAd={page.todayAd}
        clock={clock}
        onClockChange={page.changeClock}
        location={location}
        onLocationChange={setLocation}
      />

      <div className={cn(panchangaYearClasses.body, "flex flex-col")}>
        <PanchangaWheel
          p={wheelData}
          loading={page.wheelLoading}
          bsYear={page.bsYear}
          bsMonthNe={page.bsMonthNe}
          bsDay={page.bsDay}
          isToday={page.isToday}
          timezone={page.timeZone}
          locationLabel={page.locationLabel}
          clock={clock}
          atTimeDayState={dayState.kind === "input" ? dayState : undefined}
          yearScrub={{
            ...page.scrub,
            calendarPick: {
              era: browseEra,
              year: page.bsYear,
              month: page.bsMonth,
              day: page.bsDay,
              yearOptions: pickerYearOptions,
              todayAd: page.todayAd,
              clock,
              locationParams: location.params,
              onCommit: handleCalendarCommit,
              onEraChange: setDisplayEra,
            },
          }}
        />

        {page.statusLine?.kind === "error" ? (
          <div className={cn(panchangaYearClasses.errorBox, panchangaYearClasses.errorText)}>{page.statusLine.text}</div>
        ) : page.statusLine ? (
          <p className={panchangaYearClasses.status}>{page.statusLine.text}</p>
        ) : null}
      </div>

      <RelatedPageLinks />
    </div>
  );
}
