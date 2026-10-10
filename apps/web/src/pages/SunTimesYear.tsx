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
import { patroAyanaNorth, patroAyanaSouth } from "@/lib/patro-classes";

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
          className="inline-flex items-center gap-1 text-xs text-base hover:text-foreground mb-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {t("common.back_home")}
        </Link>
        <h1 className="text-xl font-bold leading-tight tracking-tight m-0">
          {t("sun_times.title")}
        </h1>
        <p className="text-sm mt-1 m-0">{pageSubtitle}</p>
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

      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5 text-sm leading-relaxed space-y-3">
        <h2 className="text-base font-bold m-0 flex items-center gap-2">
          <CalendarRange className="h-4 w-4 text-secondary shrink-0 dark:text-primary" />
          {t("sun_times.ayana_title")}
        </h2>
        <p className="m-0 text-base">
          <Trans
            i18nKey="sun_times.ayana_body"
            components={{
              north: <span className={patroAyanaNorth} />,
              south: <span className={patroAyanaSouth} />,
            }}
          />
        </p>
        {locationLabel ? (
          <p className="m-0 text-xs text-base">
            {t("location.label")}: {locationLabel}
          </p>
        ) : null}
      </section>
    </PageShell>
  );
}
