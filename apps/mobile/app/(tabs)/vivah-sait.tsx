import { useVivahSaitPage } from "@vedic-patro/features/sait";
import { SaitSources } from "@/components/sait/SaitSources";
import { SaitCeremonyLayout } from "@/components/sait/SaitCeremonyLayout";
import { SaitProfilePicker } from "@/components/sait/SaitProfilePicker";
import { SuitabilityLegend } from "@/components/sait/SaitSuitability";
import { usePanchangaLocation } from "@/lib/use-panchanga-location";
import { usePatroYearBrowse } from "@/lib/use-patro-year-browse";

/** Vivah sait — the app's drawing of `useVivahSaitPage` (@vedic-patro/features). */
export default function VivahSaitScreen() {
  const { location, setLocation } = usePanchangaLocation();
  const { era, setEra, year, setYear } = usePatroYearBrowse();
  const page = useVivahSaitPage(year, era, location.params);
  const { personalize } = page;

  return (
    <SaitCeremonyLayout
      title={page.copy.title}
      subtitle={page.copy.subtitle}
      era={era}
      onEraChange={setEra}
      year={year}
      onYearChange={setYear}
      location={location}
      onLocationChange={setLocation}
      method={page.content.method}
      rules={page.content.rules}
      engineVersion={page.engineVersion}
      days={page.days}
      profileControl={
        <>
          <SaitProfilePicker selectedId={personalize.selectedProfile?.id ?? null} onSelect={personalize.setSelectedProfile} />
          {personalize.selectedProfile ? <SuitabilityLegend counts={personalize.counts} /> : null}
        </>
      }
      suitabilityByDay={personalize.suitabilityByDay}
      personalizeByDay={personalize.personalizeByDay}
      loading={page.loading}
      footer={<SaitSources category="vivah" />}
      emptyLabel={page.copy.empty}
      countLabel={page.countLabel}
    />
  );
}
