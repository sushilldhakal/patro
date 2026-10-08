import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { AppShell } from "@/components/AppShell";
import { SaitCeremonyLayout } from "@/components/sait/SaitCeremonyLayout";
import { SaitProfilePicker } from "@/components/sait/SaitProfilePicker";
import { SuitabilityLegend } from "@/components/sait/SaitSuitability";
import { Text } from "@/components/ui/Text";
import { fetchSaitDetail, saitDetailKey } from "@/lib/api";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { isGregorianBrowseEra } from "@/lib/patro-era";
import { SaitSources } from "@/components/sait/SaitSources";
import { SAIT_CATEGORY_LABELS, type SaitCategoryId } from "@/lib/sait-data";
import { SAIT_RULES_CONTENT } from "@/lib/sait-rules-content";
import { useSaitPersonalize } from "@/lib/sait-personalize";
import { usePanchangaLocation } from "@/lib/use-panchanga-location";
import { usePatroYearBrowse } from "@/lib/use-patro-year-browse";

export default function SaitCategoryScreen() {
  const { category } = useLocalSearchParams<{ category: string }>();
  const { pick, digits } = useLocale();
  const { location, setLocation } = usePanchangaLocation();
  const { era, setEra, year, setYear } = usePatroYearBrowse();

  const id = category as SaitCategoryId | undefined;
  const labels = id ? SAIT_CATEGORY_LABELS[id] : undefined;
  const content = id ? SAIT_RULES_CONTENT[id] : undefined;
  const personalize = useSaitPersonalize(year, category ?? "", location.params);

  const detailQuery = useQuery({
    queryKey: saitDetailKey(year, category ?? "", location.params),
    queryFn: () => fetchSaitDetail(year, category!, location.params),
    enabled: Boolean(category && labels),
    staleTime: 1000 * 60 * 60,
    placeholderData: keepPreviousData,
  });

  if (!category || !labels) {
    return (
      <AppShell title={pick("साइत", "Sait")}>
        <Text className="text-sm text-muted-foreground" style={nepaliTextStyle(14)}>
          {pick("यो संस्कार फेला परेन।", "That ceremony was not found.")}
        </Text>
      </AppShell>
    );
  }

  const title = pick(labels.ne, labels.en);

  return (
    <SaitCeremonyLayout
      title={pick(`${labels.ne} साइत`, `${labels.en} Sait`)}
      subtitle={pick(
        "शास्त्रीय नियमबाट गणना गरिएका शुभ मुहूर्त",
        "Auspicious windows computed from the classical rules",
      )}
      era={era}
      onEraChange={setEra}
      year={year}
      onYearChange={setYear}
      location={location}
      onLocationChange={setLocation}
      method={content?.method}
      rules={content?.rules}
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
      footer={id ? <SaitSources category={id} /> : null}
      loading={detailQuery.isLoading && !detailQuery.data}
      emptyLabel={pick(
        `यस वर्ष ${labels.ne}को साइत भेटिएन।`,
        `No ${labels.en} muhurta found for this year.`,
      )}
      countLabel={(count, y) =>
        isGregorianBrowseEra(era)
          ? pick(
              `ई.सं. ${digits(y)} मा ${digits(count)} ${labels.ne} साइत`,
              `${count} ${title} muhurtas in ${y} AD`,
            )
          : pick(
              `वि.सं. ${digits(y)} मा ${digits(count)} ${labels.ne} साइत`,
              `${count} ${title} muhurtas in BS ${y}`,
            )
      }
    />
  );
}
