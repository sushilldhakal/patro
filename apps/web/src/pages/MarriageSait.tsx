import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useLocale } from "@/i18n/locale";
import { useRouteLoading } from "@/lib/route-loading";
import { usePatroYearDataPage } from "@/hooks/use-patro-year-data-page";
import { SaitCeremonyLayout } from "@/components/sait/SaitCeremonyLayout";
import { SaitProfilePicker } from "@/components/sait/SaitProfilePicker";
import { SaitSources } from "@/components/sait/SaitSources";
import { SuitabilityLegend } from "@/components/sait/sait-suitability";
import { SAIT_RULES_CONTENT } from "@/lib/sait-rules-content";
import {
  fetchSaitDetail,
  fetchSaitPersonalize,
  saitDetailKey,
  saitPersonalizeKey,
  type SaitSuitability,
} from "@/lib/api";
import type { Profile } from "@/lib/auth/client";
import { profileChartParams } from "@/lib/kundali/profile-chart";

const routeApi = getRouteApi("/vivah-sait");

export function MarriageSait() {
  const { digits } = useLocale();
  const { t } = useTranslation();
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const { location, setLocation, yearBrowse } = usePatroYearDataPage(search, navigate);
  const { year, era, setYear, setEra } = yearBrowse;
  const content = SAIT_RULES_CONTENT.vivah;

  const detailQuery = useQuery({
    queryKey: saitDetailKey(year, "vivah", location.params),
    queryFn: () => fetchSaitDetail(year, "vivah", location.params),
    staleTime: 1000 * 60 * 60,
    placeholderData: keepPreviousData,
  });

  useRouteLoading(detailQuery.isLoading && !detailQuery.data);

  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const birth = selectedProfile ? profileChartParams(selectedProfile) : null;
  const birthTz = selectedProfile?.timezone ?? "Asia/Kathmandu";

  const personalizeQuery = useQuery({
    queryKey: saitPersonalizeKey(year, "vivah", location.params, birth?.moment ?? null, birthTz),
    queryFn: () => fetchSaitPersonalize(year, "vivah", location.params, birth!.moment, birthTz),
    enabled: Boolean(selectedProfile) && Boolean(birth),
    staleTime: 1000 * 60 * 60,
    placeholderData: keepPreviousData,
  });

  const suitabilityByDay = useMemo(() => {
    const map = new Map<string, SaitSuitability>();
    for (const d of personalizeQuery.data?.days ?? []) {
      map.set(`${d.bs_month}-${d.bs_day}`, d.suitability);
    }
    return map;
  }, [personalizeQuery.data]);

  const profileControl = (
    <>
      <SaitProfilePicker
        selectedId={selectedProfile?.id ?? null}
        onSelect={setSelectedProfile}
      />
      {selectedProfile && personalizeQuery.data ? (
        <SuitabilityLegend counts={personalizeQuery.data.counts} />
      ) : null}
    </>
  );

  return (
    <SaitCeremonyLayout
      title={t("sait.marriage.title")}
      subtitle={t("sait.marriage.subtitle")}
      year={year}
      onYearChange={setYear}
      onEraChange={setEra}
      era={era}
      location={location}
      onLocationChange={setLocation}
      method={content.method}
      rules={content.rules}
      engineVersion={detailQuery.data?.engine_version}
      days={detailQuery.data?.days ?? []}
      profileControl={profileControl}
      suitabilityByDay={suitabilityByDay}
      loading={detailQuery.isLoading && !detailQuery.data}
      emptyLabel={t("sait.marriage.empty_year")}
      countLabel={(count, y) =>
        t(
          era === "ad" || era === "bc"
            ? "sait.marriage.count_label_ad"
            : "sait.marriage.count_label_bs",
          { count: digits(count), year: digits(y) },
        )
      }
      footer={<SaitSources category="vivah" />}
    />
  );
}

export default MarriageSait;
