import { SaitSources } from "@/components/sait/SaitSources";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { SaitCeremonyLayout } from "@/components/sait/SaitCeremonyLayout";
import { SaitProfilePicker } from "@/components/sait/SaitProfilePicker";
import { SuitabilityLegend } from "@/components/sait/SaitSuitability";
import { fetchSaitDetail, saitDetailKey } from "@/lib/api";
import { useLocale } from "@/lib/i18n";
import { isGregorianEra } from "@vedic-patro/domain/era";
import { SAIT_RULES_CONTENT } from "@vedic-patro/domain/sait-rules-content";
import { useSaitPersonalize } from "@/lib/sait-personalize";
import { usePanchangaLocation } from "@/lib/use-panchanga-location";
import { usePatroYearBrowse } from "@/lib/use-patro-year-browse";

export default function VivahSaitScreen() {
  const { t, pick, digits } = useLocale();
  const { location, setLocation } = usePanchangaLocation();
  const { era, setEra, year, setYear } = usePatroYearBrowse();
  const content = SAIT_RULES_CONTENT.vivah;
  const personalize = useSaitPersonalize(year, "vivah", location.params);

  const detailQuery = useQuery({
    queryKey: saitDetailKey(year, "vivah", location.params),
    queryFn: () => fetchSaitDetail(year, "vivah", location.params),
    staleTime: 1000 * 60 * 60,
    placeholderData: keepPreviousData,
  });

  return (
    <SaitCeremonyLayout
      title={t("ui.vivah_sait.marriage_sait")}
      subtitle={t("ui.vivah_sait.auspicious_marriage_windows_computed_from_the")}
      era={era}
      onEraChange={setEra}
      year={year}
      onYearChange={setYear}
      location={location}
      onLocationChange={setLocation}
      method={content.method}
      rules={content.rules}
      engineVersion={detailQuery.data?.engine_version}
      days={detailQuery.data?.days ?? []}
      profileControl={
        <>
          <SaitProfilePicker
            selectedId={personalize.selectedProfile?.id ?? null}
            onSelect={personalize.setSelectedProfile}
          />
          {personalize.selectedProfile ? (
            <SuitabilityLegend counts={personalize.counts} />
          ) : null}
        </>
      }
      suitabilityByDay={personalize.suitabilityByDay}
      personalizeByDay={personalize.personalizeByDay}
      loading={detailQuery.isLoading && !detailQuery.data}
      footer={<SaitSources category="vivah" />}
      emptyLabel={t("ui.vivah_sait.no_marriage_muhurta_found_for_this")}
      countLabel={(count, y) =>
        isGregorianEra(era)
          ? pick(
              `ई.सं. ${digits(y)} मा ${digits(count)} विवाह साइत`,
              `${count} marriage muhurtas in ${y} AD`,
            )
          : pick(
              `वि.सं. ${digits(y)} मा ${digits(count)} विवाह साइत`,
              `${count} marriage muhurtas in BS ${y}`,
            )
      }
    />
  );
}
