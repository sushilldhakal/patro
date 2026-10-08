import { SaitSources } from "@/components/sait/SaitSources";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { SaitCeremonyLayout } from "@/components/sait/SaitCeremonyLayout";
import { SaitProfilePicker } from "@/components/sait/SaitProfilePicker";
import { SuitabilityLegend } from "@/components/sait/SaitSuitability";
import { fetchSaitDetail, saitDetailKey } from "@/lib/api";
import { useLocale } from "@/lib/i18n";
import { isGregorianBrowseEra } from "@/lib/patro-era";
import { SAIT_RULES_CONTENT } from "@/lib/sait-rules-content";
import { useSaitPersonalize } from "@/lib/sait-personalize";
import { usePanchangaLocation } from "@/lib/use-panchanga-location";
import { usePatroYearBrowse } from "@/lib/use-patro-year-browse";

export default function VivahSaitScreen() {
  const { pick, digits } = useLocale();
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
      title={pick("विवाह साइत", "Marriage Sait")}
      subtitle={pick(
        "शास्त्रीय नियमबाट गणना गरिएका विवाहका शुभ मुहूर्त",
        "Auspicious marriage windows computed from the classical rules",
      )}
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
      emptyLabel={pick(
        "यस वर्ष विवाहको साइत भेटिएन।",
        "No marriage muhurta found for this year.",
      )}
      countLabel={(count, y) =>
        isGregorianBrowseEra(era)
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
