import { getRouteApi } from "@tanstack/react-router";
import { useVivahSaitPage } from "@vedic-patro/features/sait";
import { useRouteLoading } from "@/lib/route-loading";
import { usePatroYearDataPage } from "@/hooks/use-patro-year-data-page";
import { SaitCeremonyLayout } from "@/components/sait/SaitCeremonyLayout";
import { SaitProfilePicker } from "@/components/sait/SaitProfilePicker";
import { SaitSources } from "@/components/sait/SaitSources";
import { SuitabilityLegend } from "@/components/sait/sait-suitability";

const routeApi = getRouteApi("/vivah-sait");

/** Vivah sait — the website's drawing of `useVivahSaitPage` (@vedic-patro/features). */
export function MarriageSait() {
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const { location, setLocation, yearBrowse } = usePatroYearDataPage(search, navigate);
  const { year, era, setYear, setEra } = yearBrowse;
  const page = useVivahSaitPage(year, era, location.params);
  const { personalize } = page;
  useRouteLoading(page.loading);

  return (
    <SaitCeremonyLayout
      title={page.copy.title}
      subtitle={page.copy.subtitle}
      year={year}
      onYearChange={setYear}
      onEraChange={setEra}
      era={era}
      location={location}
      onLocationChange={setLocation}
      method={page.content.method}
      rules={page.content.rules}
      engineVersion={page.engineVersion}
      days={page.days}
      profileControl={
        <>
          <SaitProfilePicker selectedId={personalize.selectedProfile?.id ?? null} onSelect={personalize.setSelectedProfile} />
          {personalize.selectedProfile && personalize.data ? <SuitabilityLegend counts={personalize.data.counts} /> : null}
        </>
      }
      suitabilityByDay={personalize.suitabilityByDay}
      personalizeByDay={personalize.personalizeByDay}
      loading={page.loading}
      emptyLabel={page.copy.empty}
      countLabel={page.countLabel}
      footer={<SaitSources category="vivah" />}
    />
  );
}

export default MarriageSait;
