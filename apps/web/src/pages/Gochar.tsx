import { Orbit } from "lucide-react";
import { getRouteApi } from "@tanstack/react-router";
import { useGocharPage } from "@vedic-patro/features/gochar";
import { PageShell, PageHeader } from "@/components/PageShell";
import { PatroDayTimeNav } from "@/components/patro-date";
import { GocharSkySection } from "@/components/gochar/GocharSkySection";
import { GocharIngressSection } from "@/components/gochar/GocharIngressSection";
import { GocharPlanetDeepDive } from "@/components/gochar/GocharPlanetDeepDive";
import { usePanchangaLocation } from "@/components/panchanga/use-panchanga-location";
import { usePatroDayUrlBrowse } from "@/hooks/use-patro-url-browse";
import { useResolvedPatroDayQuery } from "@/hooks/use-resolved-patro-day-query";
import { useRouteLoading } from "@/lib/route-loading";
import { todayAdStringInTimezone, resolveTimeZone } from "@vedic-patro/domain/zoned-time";
import { searchToLocation } from "@/lib/url-state";
import { fetchMonthCalendar } from "@/lib/api";
import { pickAdDate, pickBrowseVikramDate } from "@/lib/patro-date-options";
import { gocharClasses } from "@vedic-patro/design-tokens/classes/gochar-classes";
import { cn } from "@vedic-patro/domain/utils";

const routeApi = getRouteApi("/panchanga-shell/gochar");

/**
 * Gochar — the website's drawing of `useGocharPage` (@vedic-patro/features).
 * The browsed day lives in the URL and is resolved by the panchanga day query here.
 */
export function Gochar() {
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const { location, setLocation } = usePanchangaLocation(searchToLocation(search));
  const dayBrowse = usePatroDayUrlBrowse(search, navigate, location, setLocation);
  const { dayState, date, setDate, setDisplayEra, syncPickerFromDateAd, syncResolvedPatroDay } = dayBrowse;
  const patroEra = dayState.display.era;
  const todayAd = todayAdStringInTimezone(new Date(), resolveTimeZone(undefined, location.params.timezone));

  const dayQ = useResolvedPatroDayQuery(dayState, location.params, { syncPickerFromDateAd, syncResolvedPatroDay });
  const dayData = dayQ.data;

  const page = useGocharPage({
    era: patroEra,
    location,
    todayAd,
    day: {
      dateAd: dayData?.date_ad,
      jdUt: dayData?.jd_ut,
      vikram: dayData?.date_parts?.vikram,
      gregorian: dayData?.date_parts?.gregorian,
      dateBs: dayData?.date_bs,
      input:
        dayState.kind === "input"
          ? { era: dayState.inputEra, year: dayState.year, month: dayState.month, day: dayState.day }
          : undefined,
      isLoading: dayQ.isLoading,
      isError: dayQ.isError,
    },
    fetchMonth: fetchMonthCalendar,
    onPickMonth: (target) =>
      target.calendar === "ad"
        ? pickAdDate(setDate, target.year, target.month, target.day)
        : pickBrowseVikramDate(setDate, target.era, target.year, target.month, target.day, location.params),
  });

  useRouteLoading(page.loading);

  return (
    <PageShell>
      <PageHeader icon={<Orbit className="size-7 text-secondary" strokeWidth={1.75} />} title={page.copy.title} subtitle={page.copy.subtitle} />

      <PatroDayTimeNav
        era={patroEra}
        displayLanguage={dayState.display.language}
        date={date}
        vikram={dayData?.date_parts?.vikram}
        civilDateAd={dayData?.date_ad}
        gregorian={dayData?.date_parts?.gregorian}
        onDateChange={setDate}
        onEraChange={setDisplayEra}
        todayAd={todayAd}
        location={location}
        onLocationChange={setLocation}
      />

      {page.gochar ? (
        <div className="min-w-0 max-w-full space-y-6 overflow-x-hidden">
          <GocharSkySection gochar={page.gochar} dateLabel={page.dateLabel} onSelectPlanet={page.setSelectedPlanet} />

          <div className={cn("grid min-w-0 max-w-full lg:grid-cols-2 [&>*]:min-w-0", gocharClasses.columns)}>
            <GocharIngressSection page={page} />
            <GocharPlanetDeepDive gochar={page.gochar} selected={page.selectedPlanet} onSelect={page.setSelectedPlanet} />
          </div>
        </div>
      ) : page.status === "error" ? (
        <p className={gocharClasses.errorText}>{page.copy.error}</p>
      ) : (
        <p className={gocharClasses.mutedText}>{page.copy.loading}</p>
      )}

      <p className={gocharClasses.mutedText}>{page.copy.footnote}</p>
    </PageShell>
  );
}

export default Gochar;
