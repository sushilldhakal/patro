import { useMemo, useState } from "react";
import { View } from "react-native";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { AppShell } from "@/components/AppShell";
import { SaitCeremonyLayout } from "@/components/sait/SaitCeremonyLayout";
import { SaitProfilePicker } from "@/components/sait/SaitProfilePicker";
import { SuitabilityLegend } from "@/components/sait/SaitSuitability";
import { SkeletonPulse } from "@/components/ui/SkeletonPulse";
import { Text } from "@/components/ui/Text";
import {
  fetchSait,
  fetchSaitDetail,
  saitDetailKey,
  saitKeys,
  type BratabandhaNakshatraMode,
} from "@/lib/api";
import { Ionicons } from "@/components/icons/Ionicons";
import { SUITABILITY_STYLE } from "@/lib/sait-suitability-style";
import { cn } from "@vedic-patro/domain/utils";
import { saitClasses } from "@vedic-patro/design-tokens/classes/sait-classes";
import { useThemeColors } from "@/lib/theme-context";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { SaitSources } from "@/components/sait/SaitSources";
import { SAIT_CATEGORY_LABELS, isMuhurtaSaitCategory, type SaitCategoryId } from "@vedic-patro/domain/sait-data";
import { SAIT_RULES_CONTENT } from "@vedic-patro/domain/sait-rules-content";
import { useSaitPersonalize } from "@/lib/sait-personalize";
import { usePanchangaLocation } from "@/lib/use-panchanga-location";
import { usePatroYearBrowse } from "@/lib/use-patro-year-browse";
import { brand, withAlpha } from "@vedic-patro/design-tokens";

export default function SaitCategoryScreen() {
  const { category } = useLocalSearchParams<{ category: string }>();
  const { pick, digits, lang, t } = useLocale();
  const colors = useThemeColors();
  const { location, setLocation } = usePanchangaLocation();
  const { era, setEra, year, setYear } = usePatroYearBrowse();

  const id = category as SaitCategoryId | undefined;
  const labels = id ? SAIT_CATEGORY_LABELS[id] : undefined;
  const content = id ? SAIT_RULES_CONTENT[id] : undefined;
  const personalize = useSaitPersonalize(year, category ?? "", location.params);

  const isMuhurta = category ? isMuhurtaSaitCategory(category) : false;
  const isBratabandha = category === "bratabandha";

  // Community rule toggles: ids the user switched OFF. Reset when the ceremony
  // changes so one ceremony's picks don't leak into another.
  const [disabledRules, setDisabledRules] = useState<Set<string>>(() => new Set());
  const [nakshatraMode, setNakshatraMode] = useState<BratabandhaNakshatraMode>("classical");
  const [trackedCategory, setTrackedCategory] = useState(category);
  if (category !== trackedCategory) {
    setTrackedCategory(category);
    setDisabledRules(new Set());
    setNakshatraMode("classical");
  }

  const toggleableIds = useMemo(
    () => (content?.rules ?? []).map((r) => r.id).filter((x): x is string => Boolean(x)),
    [content],
  );
  const hasToggles = isMuhurta && toggleableIds.length > 0;
  const enabledRuleIds = useMemo(
    () => new Set(toggleableIds.filter((x) => !disabledRules.has(x))),
    [toggleableIds, disabledRules],
  );
  const excludeRules = useMemo(() => [...disabledRules], [disabledRules]);
  const handleToggleRule = (ruleId: string, enabled: boolean) =>
    setDisabledRules((prev) => {
      const next = new Set(prev);
      if (enabled) next.delete(ruleId);
      else next.add(ruleId);
      return next;
    });

  const detailQuery = useQuery({
    queryKey: saitDetailKey(year, category ?? "", location.params, excludeRules, isBratabandha ? nakshatraMode : null),
    queryFn: () =>
      fetchSaitDetail(year, category!, location.params, excludeRules, isBratabandha ? nakshatraMode : null),
    enabled: Boolean(category && labels) && isMuhurta,
    staleTime: 1000 * 60 * 60,
    placeholderData: keepPreviousData,
  });

  const datesQuery = useQuery({
    queryKey: saitKeys.entries(year, category ?? "", location.params),
    queryFn: () => fetchSait(year, category!, location.params),
    enabled: Boolean(category && labels) && !isMuhurta,
    staleTime: 1000 * 60 * 60,
    placeholderData: keepPreviousData,
  });
  const activeQuery = isMuhurta ? detailQuery : datesQuery;
  const totalCount = isMuhurta
    ? (detailQuery.data?.days?.length ?? 0)
    : (datesQuery.data?.months?.reduce((sum, m) => sum + m.days.length, 0) ?? 0);

  if (!category || !labels) {
    return (
      <AppShell title={pick("साइत", "Sait")}>
        <Text className="text-sm text-muted-foreground" style={nepaliTextStyle()}>
          {pick("यो संस्कार फेला परेन।", "That ceremony was not found.")}
        </Text>
      </AppShell>
    );
  }

  return (
    <SaitCeremonyLayout
      title={t("sidebar_nav.sait_label", { category: t(`sait.categories.${id}`) })}
      subtitle={t(`sait.descriptions.${id}`)}
      era={era}
      onEraChange={setEra}
      year={year}
      onYearChange={setYear}
      location={location}
      onLocationChange={setLocation}
      method={content?.method}
      rules={content?.rules}
      engineVersion={detailQuery.data?.engine_version}
      enabledRuleIds={hasToggles ? enabledRuleIds : undefined}
      onToggleRule={hasToggles ? handleToggleRule : undefined}
      rulesBusy={detailQuery.isFetching && !detailQuery.isLoading}
      nakshatraMode={isBratabandha ? nakshatraMode : null}
      onNakshatraModeChange={isBratabandha ? setNakshatraMode : undefined}
      days={isMuhurta ? (detailQuery.data?.days ?? []) : []}
      count={totalCount}
      notice={
        content?.requiresBirthDate ? (
          <View className={saitClasses.notice}>
            <View className={saitClasses.noticeIconWrap}>
              <Ionicons name="information-circle-outline" size={16} color={colors.secondary} />
            </View>
            <Text className={cn("flex-1", saitClasses.noticeText)} style={nepaliTextStyle()}>
              {t("sait.requires_birth_date")}
            </Text>
          </View>
        ) : null
      }
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
      loading={activeQuery.isLoading && !activeQuery.data}
      emptyLabel={t("sait.empty_year")}
      countLabel={(count, y) => t("sait.count_label", { count: digits(count), year: digits(y) })}
    >
      {!isMuhurta ? (
        datesQuery.isLoading && !datesQuery.data ? (
          <View className={saitClasses.dateSkeletonList}>
            {[0, 1, 2].map((i) => (
              <SkeletonPulse key={i} className={saitClasses.dateSkeleton} />
            ))}
          </View>
        ) : datesQuery.data && datesQuery.data.months.length > 0 ? (
          <View className={saitClasses.dateList}>
            {datesQuery.data.months.map((m) => (
              <View
                key={m.month}
                className={saitClasses.dateRow}
              >
                <Text className={saitClasses.dateRowMonth} style={nepaliTextStyle()}>
                  {lang === "en" ? t("sait.month_number", { month: digits(m.month) }) : m.month_name_ne}
                </Text>
                <View className={saitClasses.dateRowDays}>
                  {m.days.map((d) => {
                    const verdict = personalize.suitabilityByDay?.get(`${m.month}-${d}`);
                    const style = verdict ? SUITABILITY_STYLE[verdict] : null;
                    return (
                      <View
                        key={d}
                        style={
                          style
                            ? { backgroundColor: style.bg, borderColor: style.ring, borderWidth: 2 }
                            : { backgroundColor: withAlpha(brand.green, 0.12) }
                        }
                        className={saitClasses.dateChip}
                      >
                        <Text
                          className={saitClasses.dateChipText}
                          style={{ color: style ? style.fg : brand.green, ...nepaliTextStyle() }}
                        >
                          {digits(d)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View className={saitClasses.noDates}>
            <Text className={saitClasses.noDatesText} style={nepaliTextStyle()}>
              {t("sait.no_dates_year")}
            </Text>
          </View>
        )
      ) : null}
    </SaitCeremonyLayout>
  );
}
