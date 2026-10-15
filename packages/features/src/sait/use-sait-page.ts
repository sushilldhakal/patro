/**
 * Sait (auspicious dates) page logic, shared by the website
 * (`apps/web/src/pages/SaitPage.tsx`, `MarriageSait.tsx`) and the app
 * (`apps/mobile/app/(tabs)/sait/[category].tsx`, `vivah-sait.tsx`).
 */
import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  fetchSait,
  fetchSaitDetail,
  fetchSaitPersonalize,
  saitDetailKey,
  saitKeys,
  saitPersonalizeKey,
  type BratabandhaNakshatraMode,
  type LocationParams,
  type Profile,
  type SaitPersonalizeDay,
  type SaitSuitability,
} from "@vedic-patro/api-client";
import { profileChartParams } from "@vedic-patro/domain/kundali/profile-chart";
import { SAIT_CATEGORY_LABELS, isMuhurtaSaitCategory, type SaitCategoryId } from "@vedic-patro/domain/sait-data";
import { SAIT_RULES_CONTENT } from "@vedic-patro/domain/sait-rules-content";
import { useLocale } from "@vedic-patro/i18n/react";

const HOUR = 1000 * 60 * 60;

/**
 * Profile-based personalisation: the profile supplies only the birth chart
 * (janma Moon); the viewing location stays whatever the reader picked, since
 * they may be planning from somewhere other than their birth place.
 */
export function useSaitPersonalize(year: number, category: string, location: LocationParams | undefined) {
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const birth = selectedProfile ? profileChartParams(selectedProfile) : null;
  const birthTz = selectedProfile?.timezone ?? "Asia/Kathmandu";
  const gender = selectedProfile?.gender ?? "";

  const query = useQuery({
    queryKey: saitPersonalizeKey(year, category, location, birth?.moment ?? null, birthTz, gender),
    queryFn: () => fetchSaitPersonalize(year, category, location, birth!.moment, birthTz, gender),
    enabled: Boolean(category) && Boolean(selectedProfile) && Boolean(birth?.moment),
    staleTime: HOUR,
    placeholderData: keepPreviousData,
  });

  const days = query.data?.days;
  const suitabilityByDay = useMemo(() => new Map<string, SaitSuitability>((days ?? []).map((d) => [`${d.bs_month}-${d.bs_day}`, d.suitability])), [days]);
  const personalizeByDay = useMemo(() => new Map<string, SaitPersonalizeDay>((days ?? []).map((d) => [`${d.bs_month}-${d.bs_day}`, d])), [days]);

  return { selectedProfile, setSelectedProfile, counts: query.data?.counts ?? null, suitabilityByDay, personalizeByDay, data: query.data };
}

export function useSaitPage(category: string | undefined, year: number, location: LocationParams | undefined) {
  const { t, lang, digits } = useLocale();
  const id = category as SaitCategoryId | undefined;
  const known = Boolean(id && SAIT_CATEGORY_LABELS[id]);
  const content = known ? SAIT_RULES_CONTENT[id!] : undefined;
  const isMuhurta = category ? isMuhurtaSaitCategory(category) : false;
  const isBratabandha = category === "bratabandha";

  // Community rule toggles: ids switched OFF. Reset when the ceremony changes
  // so one ceremony's picks don't leak into another.
  const [disabledRules, setDisabledRules] = useState<Set<string>>(() => new Set());
  const [nakshatraMode, setNakshatraMode] = useState<BratabandhaNakshatraMode>("classical");
  const [trackedCategory, setTrackedCategory] = useState(category);
  if (category !== trackedCategory) {
    setTrackedCategory(category);
    setDisabledRules(new Set());
    setNakshatraMode("classical");
  }

  const toggleableIds = useMemo(() => (content?.rules ?? []).map((r) => r.id).filter((x): x is string => Boolean(x)), [content]);
  const hasToggles = isMuhurta && toggleableIds.length > 0;
  const enabledRuleIds = useMemo(() => new Set(toggleableIds.filter((x) => !disabledRules.has(x))), [toggleableIds, disabledRules]);
  const excludeRules = useMemo(() => [...disabledRules], [disabledRules]);

  const detailQuery = useQuery({
    queryKey: saitDetailKey(year, category ?? "", location, excludeRules, isBratabandha ? nakshatraMode : null),
    queryFn: () => fetchSaitDetail(year, category!, location, excludeRules, isBratabandha ? nakshatraMode : null),
    enabled: known && isMuhurta,
    staleTime: HOUR,
    placeholderData: keepPreviousData,
  });
  const datesQuery = useQuery({
    queryKey: saitKeys.entries(year, category ?? "", location),
    queryFn: () => fetchSait(year, category!, location),
    enabled: known && !isMuhurta,
    staleTime: HOUR,
    placeholderData: keepPreviousData,
  });
  const active = isMuhurta ? detailQuery : datesQuery;
  const personalize = useSaitPersonalize(year, category ?? "", location);

  const count = isMuhurta
    ? (detailQuery.data?.days?.length ?? 0)
    : (datesQuery.data?.months?.reduce((sum, m) => sum + m.days.length, 0) ?? 0);

  return {
    known,
    id,
    content,
    isMuhurta,
    copy: {
      title: id ? t("sidebar_nav.sait_label", { category: t(`sait.categories.${id}`) }) : t("sait.unknown_ceremony"),
      subtitle: id ? t(`sait.descriptions.${id}`) : "",
      unknown: t("sait.unknown_ceremony"),
      requiresBirthDate: content?.requiresBirthDate ? t("sait.requires_birth_date") : undefined,
      empty: t("sait.empty_year"),
      noDates: t("sait.no_dates_year"),
    },
    countLabel: (n: number, y: number) => t("sait.count_label", { count: digits(n), year: digits(y) }),
    // Rule toggles (muhūrta categories)
    enabledRuleIds: hasToggles ? enabledRuleIds : undefined,
    toggleRule: hasToggles
      ? (ruleId: string, enabled: boolean) =>
          setDisabledRules((prev) => {
            const next = new Set(prev);
            if (enabled) next.delete(ruleId);
            else next.add(ruleId);
            return next;
          })
      : undefined,
    rulesBusy: detailQuery.isFetching && !detailQuery.isLoading,
    nakshatraMode: isBratabandha ? nakshatraMode : null,
    setNakshatraMode: isBratabandha ? setNakshatraMode : undefined,
    engineVersion: detailQuery.data?.engine_version,
    // Results
    loading: active.isLoading && !active.data,
    days: isMuhurta ? (detailQuery.data?.days ?? []) : [],
    count,
    /** Day-pill months for the non-muhūrta (vās) categories. */
    months: (datesQuery.data?.months ?? []).map((m) => ({
      key: m.month,
      label: lang === "en" ? t("sait.month_number", { month: digits(m.month) }) : m.month_name_ne,
      days: m.days.map((d) => ({ day: d, label: digits(d), verdict: personalize.suitabilityByDay.get(`${m.month}-${d}`) })),
    })),
    personalize,
  };
}

/** Vivah (marriage) sait — its own page in both apps, always a muhūrta category. */
export function useVivahSaitPage(year: number, era: string, location: LocationParams | undefined) {
  const { t, digits } = useLocale();
  const detailQuery = useQuery({
    queryKey: saitDetailKey(year, "vivah", location),
    queryFn: () => fetchSaitDetail(year, "vivah", location),
    staleTime: HOUR,
    placeholderData: keepPreviousData,
  });
  const gregorian = era === "ad" || era === "bc";
  return {
    content: SAIT_RULES_CONTENT.vivah,
    copy: { title: t("sait.marriage.title"), subtitle: t("sait.marriage.subtitle"), empty: t("sait.marriage.empty_year") },
    countLabel: (n: number, y: number) =>
      t(gregorian ? "sait.marriage.count_label_ad" : "sait.marriage.count_label_bs", { count: digits(n), year: digits(y) }),
    engineVersion: detailQuery.data?.engine_version,
    days: detailQuery.data?.days ?? [],
    loading: detailQuery.isLoading && !detailQuery.data,
    personalize: useSaitPersonalize(year, "vivah", location),
  };
}
