import { Link, getRouteApi } from "@tanstack/react-router";
import { Trans } from "@vedic-patro/i18n/react";
import { ArrowLeft, CalendarRange } from "lucide-react";
import { useSunTimesPage } from "@vedic-patro/features/sun-times";
import { SunTimesYearGrid } from "@vedic-patro/ui/kit/shell";
import { PatroYearNavBlock } from "@/components/patro-page/PatroYearNavBlock";
import { PageShell } from "@/components/PageShell";
import { usePatroYearDataPage } from "@/hooks/use-patro-year-data-page";
import { useRouteLoading } from "@/lib/route-loading";
import { cn } from "@vedic-patro/design-tokens/cn";
import { sunTimesClasses } from "@vedic-patro/design-tokens/classes/sun-times-classes";

const routeApi = getRouteApi("/panchanga-shell/suryakranti");

/**
 * Sun times — the website's drawing of `useSunTimesPage` (@vedic-patro/features).
 * The year, era and place live in the URL here.
 */
export function SunTimesYear() {
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const { location, setLocation, yearBrowse } = usePatroYearDataPage(search, navigate);
  const { year, era, setYear, setEra } = yearBrowse;
  const page = useSunTimesPage({ year, era, location });
  const { copy } = page;

  useRouteLoading(page.loading);

  return (
    <PageShell className="space-y-4 overflow-x-hidden pb-16">
      <div>
        <Link to="/" className={cn("inline-flex hover:text-foreground", sunTimesClasses.backLink, sunTimesClasses.backLinkText)}>
          <ArrowLeft className="w-3.5 h-3.5" />
          {copy.backHome}
        </Link>
        <h1 className={cn("m-0", sunTimesClasses.title)}>{copy.title}</h1>
        <p className={cn("m-0", sunTimesClasses.subtitle)}>{copy.subtitle}</p>
      </div>

      <PatroYearNavBlock
        era={era}
        year={year}
        onYearChange={setYear}
        onEraChange={setEra}
        location={location}
        onLocationChange={setLocation}
        className=""
      />

      <SunTimesYearGrid page={page} hideHeader />

      <section className={cn(sunTimesClasses.ayanaCard, sunTimesClasses.ayanaCardText, "space-y-3")}>
        <h2 className={cn("m-0 flex", sunTimesClasses.ayanaTitleRow, sunTimesClasses.ayanaTitle)}>
          <CalendarRange className="h-4 w-4 text-secondary shrink-0 dark:text-primary" />
          {copy.ayanaTitle}
        </h2>
        <p className={cn("m-0", sunTimesClasses.ayanaBody)}>
          <Trans
            i18nKey={copy.ayanaBodyKey}
            components={{
              north: <span className={cn("mb-0.5 inline-block", sunTimesClasses.ayanaNorth)} />,
              south: <span className={cn("mb-0.5 inline-block", sunTimesClasses.ayanaSouth)} />,
            }}
          />
        </p>
        {copy.locationLine ? <p className={cn("m-0", sunTimesClasses.ayanaLocation)}>{copy.locationLine}</p> : null}
      </section>
    </PageShell>
  );
}
