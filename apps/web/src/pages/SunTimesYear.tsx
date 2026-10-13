import { useState } from "react";
import { Link, getRouteApi } from "@tanstack/react-router";
import { Trans, useTranslation } from "react-i18next";
import { ArrowLeft, CalendarRange } from "lucide-react";
import { SunTimesYearGrid } from "@/components/SunTimesYearGrid";
import { PatroYearNavBlock } from "@/components/patro-page/PatroYearNavBlock";
import { PageShell } from "@/components/PageShell";
import { usePatroYearDataPage } from "@/hooks/use-patro-year-data-page";
import { useRouteLoading } from "@/lib/route-loading";
import { displayLocationLabel } from "@/components/panchanga/use-panchanga-location";
import { useLocale } from "@/i18n/locale";
import { cn } from "@vedic-patro/domain/utils";
import { sunTimesClasses } from "@vedic-patro/design-tokens/classes/sun-times-classes";


const routeApi = getRouteApi("/panchanga-shell/suryakranti");

export function SunTimesYear() {
  const { t } = useTranslation();
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const { location, setLocation, yearBrowse } = usePatroYearDataPage(search, navigate);
  const { year, era, setYear, setEra } = yearBrowse;
  const { lang, digits } = useLocale();
  const locationLabel = displayLocationLabel(location, undefined, lang);
  const [gridLoading, setGridLoading] = useState(true);

  const pageSubtitle = t("sun_times.subtitle", { year: digits(year) });

  useRouteLoading(gridLoading);

  return (
    <PageShell className="space-y-4 overflow-x-hidden pb-16">
      <div>
        <Link
          to="/"
          className={cn("inline-flex hover:text-foreground", sunTimesClasses.backLink, sunTimesClasses.backLinkText)}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {t("common.back_home")}
        </Link>
        <h1 className={cn("m-0", sunTimesClasses.title)}>
          {t("sun_times.title")}
        </h1>
        <p className={cn("m-0", sunTimesClasses.subtitle)}>{pageSubtitle}</p>
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

      <SunTimesYearGrid
        era={era}
        year={year}
        locationLabel={locationLabel}
        locationParams={location.params}
        hideHeader
        onLoadingChange={setGridLoading}
      />

      <section className={cn(sunTimesClasses.ayanaCard, sunTimesClasses.ayanaCardText, "space-y-3")}>
        <h2 className={cn("m-0 flex", sunTimesClasses.ayanaTitleRow, sunTimesClasses.ayanaTitle)}>
          <CalendarRange className="h-4 w-4 text-secondary shrink-0 dark:text-primary" />
          {t("sun_times.ayana_title")}
        </h2>
        <p className={cn("m-0", sunTimesClasses.ayanaBody)}>
          <Trans
            i18nKey="sun_times.ayana_body"
            components={{
              north: <span className={cn("mb-0.5 inline-block", sunTimesClasses.ayanaNorth)} />,
              south: <span className={cn("mb-0.5 inline-block", sunTimesClasses.ayanaSouth)} />,
            }}
          />
        </p>
        {locationLabel ? (
          <p className={cn("m-0", sunTimesClasses.ayanaLocation)}>
            {t("location.label")}: {locationLabel}
          </p>
        ) : null}
      </section>
    </PageShell>
  );
}
