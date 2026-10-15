import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSaitPage } from "@vedic-patro/features/sait";
import { brand, withAlpha } from "@vedic-patro/design-tokens";
import { saitClasses } from "@vedic-patro/design-tokens/classes/sait-classes";
import { cn } from "@vedic-patro/domain/utils";
import { AppShell } from "@/components/AppShell";
import { SaitCeremonyLayout } from "@/components/sait/SaitCeremonyLayout";
import { SaitProfilePicker } from "@/components/sait/SaitProfilePicker";
import { SaitSources, SuitabilityLegend } from "@vedic-patro/ui/kit/jyotish";
import { SkeletonPulse } from "@/components/ui/SkeletonPulse";
import { Text } from "@/components/ui/Text";
import { Ionicons } from "@/components/icons/Ionicons";
import { SUITABILITY_STYLE } from "@/lib/sait-suitability-style";
import { useThemeColors } from "@/lib/theme-context";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { usePanchangaLocation } from "@/lib/use-panchanga-location";
import { usePatroYearBrowse } from "@/lib/use-patro-year-browse";

/** A sait ceremony — the app's drawing of `useSaitPage` (@vedic-patro/features). */
export default function SaitCategoryScreen() {
  const { category } = useLocalSearchParams<{ category: string }>();
  const { t } = useLocale();
  const colors = useThemeColors();
  const { location, setLocation } = usePanchangaLocation();
  const { era, setEra, year, setYear } = usePatroYearBrowse();
  const page = useSaitPage(category, year, location.params);
  const { personalize } = page;

  if (!page.known || !page.id) {
    return (
      <AppShell title={t("panchanga.tabs.sait")}>
        <Text className="text-sm text-muted-foreground" style={nepaliTextStyle()}>
          {page.copy.unknown}
        </Text>
      </AppShell>
    );
  }

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
      method={page.content?.method}
      rules={page.content?.rules}
      engineVersion={page.engineVersion}
      enabledRuleIds={page.enabledRuleIds}
      onToggleRule={page.toggleRule}
      rulesBusy={page.rulesBusy}
      nakshatraMode={page.nakshatraMode}
      onNakshatraModeChange={page.setNakshatraMode}
      days={page.days}
      count={page.count}
      notice={
        page.copy.requiresBirthDate ? (
          <View className={saitClasses.notice}>
            <View className={saitClasses.noticeIconWrap}>
              <Ionicons name="information-circle-outline" size={16} color={colors.secondary} />
            </View>
            <Text className={cn("flex-1", saitClasses.noticeText)} style={nepaliTextStyle()}>
              {page.copy.requiresBirthDate}
            </Text>
          </View>
        ) : null
      }
      profileControl={
        <>
          <SaitProfilePicker selectedId={personalize.selectedProfile?.id ?? null} onSelect={personalize.setSelectedProfile} />
          {personalize.selectedProfile ? <SuitabilityLegend counts={personalize.counts} /> : null}
        </>
      }
      suitabilityByDay={personalize.suitabilityByDay}
      personalizeByDay={personalize.personalizeByDay}
      footer={<SaitSources category={page.id} />}
      loading={page.loading}
      emptyLabel={page.copy.empty}
      countLabel={page.countLabel}
    >
      {!page.isMuhurta ? (
        page.loading ? (
          <View className={saitClasses.dateSkeletonList}>
            {[0, 1, 2].map((i) => (
              <SkeletonPulse key={i} className={saitClasses.dateSkeleton} />
            ))}
          </View>
        ) : page.months.length > 0 ? (
          <View className={saitClasses.dateList}>
            {page.months.map((m) => (
              <View key={m.key} className={saitClasses.dateRow}>
                <Text className={saitClasses.dateRowMonth} style={nepaliTextStyle()}>
                  {m.label}
                </Text>
                <View className={saitClasses.dateRowDays}>
                  {m.days.map((d) => {
                    const style = d.verdict ? SUITABILITY_STYLE[d.verdict] : null;
                    return (
                      <View
                        key={d.day}
                        style={style ? { backgroundColor: style.bg, borderColor: style.ring, borderWidth: 2 } : { backgroundColor: withAlpha(brand.green, 0.12) }}
                        className={saitClasses.dateChip}
                      >
                        <Text className={saitClasses.dateChipText} style={{ color: style ? style.fg : brand.green, ...nepaliTextStyle() }}>
                          {d.label}
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
              {page.copy.noDates}
            </Text>
          </View>
        )
      ) : null}
    </SaitCeremonyLayout>
  );
}
