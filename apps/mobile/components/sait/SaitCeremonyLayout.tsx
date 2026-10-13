import { useMemo } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { useRouter } from "expo-router";
import { AppShell } from "@/components/AppShell";
import { PatroYearNavBlock } from "@/components/patro-date/PatroYearNavBlock";
import { SaitDayCard } from "@/components/sait/SaitDayCard";
import { SaitRulesSection } from "@/components/sait/SaitRulesSection";
import type { SaitRuleEntry } from "@vedic-patro/domain/sait-rules-content";
import { Text } from "@/components/ui/Text";
import type {
  BratabandhaNakshatraMode,
  SaitDetailDay,
  SaitPersonalizeDay,
  SaitSuitability,
} from "@/lib/api";
import { AppNavIcon } from "@/components/icons/AppNavIcon";
import { PageHeader } from "@/components/ui/PageHeader";
import { SkeletonPulse } from "@/components/ui/SkeletonPulse";
import { cn } from "@vedic-patro/domain/utils";
import { saitClasses } from "@vedic-patro/design-tokens/classes/sait-classes";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { type Era } from "@vedic-patro/domain/era";
import { useBreakpoint } from "@/lib/responsive";
import { useThemeColors } from "@/lib/theme-context";
import type { PanchangaLocation } from "@/lib/use-panchanga-location";

/**
 * Shared ceremonial sāit layout — page header, rules, year/location bar, then
 * month-grouped day cards. Mirrors the web SaitCeremonyLayout.
 */
export function SaitCeremonyLayout({
  title,
  subtitle,
  era,
  onEraChange,
  year,
  onYearChange,
  location,
  onLocationChange,
  method,
  rules,
  engineVersion,
  enabledRuleIds,
  onToggleRule,
  rulesBusy,
  nakshatraMode,
  onNakshatraModeChange,
  count,
  notice,
  children,
  days = [],
  profileControl,
  suitabilityByDay,
  personalizeByDay,
  loading,
  emptyLabel,
  countLabel,
  footer,
}: {
  title: string;
  subtitle: string;
  /** Browse era, owned by the page (web `usePatroYearDataPage().yearBrowse`). */
  era: Era;
  onEraChange: (era: Era) => void;
  year: number;
  onYearChange: (year: number) => void;
  location: PanchangaLocation;
  onLocationChange: (loc: PanchangaLocation) => void;
  method?: { ne?: string; en?: string } | null;
  rules?: SaitRuleEntry[] | null;
  engineVersion?: string;
  /** Applied (ON) toggleable rule ids; enables per-rule switches when set. */
  enabledRuleIds?: Set<string> | null;
  onToggleRule?: (id: string, enabled: boolean) => void;
  rulesBusy?: boolean;
  /** Bratabandha nakṣatra tradition selector. */
  nakshatraMode?: BratabandhaNakshatraMode | null;
  onNakshatraModeChange?: (mode: BratabandhaNakshatraMode) => void;
  /** Total for the summary line; falls back to `days.length`. */
  count?: number;
  notice?: React.ReactNode;
  /** Replaces the day-card list (the date-only Vās categories). */
  children?: React.ReactNode;
  days?: SaitDetailDay[];
  /** Profile picker + legend, shown below the year/location row. */
  profileControl?: React.ReactNode;
  /** Native verdict per `${bs_month}-${bs_day}`, overlaid on the day cards. */
  suitabilityByDay?: Map<string, SaitSuitability>;
  /** Full per-day annotation (same key) for the card's reason lines. */
  personalizeByDay?: Map<string, SaitPersonalizeDay>;
  loading: boolean;
  emptyLabel?: string;
  countLabel?: (count: number, year: number) => string;
  /** Rendered after the day list (the classical sources card). */
  footer?: React.ReactNode;
}) {
  const { lang, pick, digits, t } = useLocale();
  const colors = useThemeColors();
  const router = useRouter();
  const { width } = useBreakpoint();

  const byMonth = useMemo(() => {
    const map = new Map<number, SaitDetailDay[]>();
    for (const d of days) {
      const list = map.get(d.bs_month) ?? [];
      list.push(d);
      map.set(d.bs_month, list);
    }
    return [...map.entries()].sort(([a], [b]) => a - b);
  }, [days]);

  const cols = width >= 1024 ? 3 : width >= 640 ? 2 : 1;
  const cardWidth = cols === 1 ? "100%" : `${(100 / cols - 1.5).toFixed(2)}%`;

  const displayCount = count ?? days.length;
  const countText = countLabel
    ? countLabel(displayCount, year)
    : pick(
        `${digits(year)} मा ${digits(displayCount)} शुभ दिन`,
        `${displayCount} auspicious days in ${year}`,
      );

  return (
    <AppShell title={title} showHeader={false}>
      <View className="gap-8">
        <PageHeader
          icon={<AppNavIcon name="heart-handshake" size={24} color={colors.secondary} />}
          title={title}
          subtitle={subtitle}
        />

        <SaitRulesSection
          method={method}
          rules={rules}
          engineVersion={engineVersion}
          enabledRuleIds={enabledRuleIds}
          onToggleRule={onToggleRule}
          busy={rulesBusy}
        />

        {nakshatraMode && onNakshatraModeChange ? (
          <View className={saitClasses.nakshatraRow}>
            <Text className={saitClasses.nakshatraLabel} style={nepaliTextStyle()}>
              {t("sait.nakshatra_tradition")}
            </Text>
            <View className={cn(saitClasses.nakshatraGroup, "self-start")}>
              {(["classical", "nepali", "liberal"] as const).map((id) => {
                const active = nakshatraMode === id;
                return (
                  <Pressable
                    key={id}
                    onPress={() => onNakshatraModeChange(id)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    className={cn(saitClasses.nakshatraBtn, active ? saitClasses.nakshatraBtnActive : "active:bg-surface-muted")}
                  >
                    <Text
                      className={cn(
                        saitClasses.nakshatraBtnText,
                        active ? saitClasses.nakshatraBtnTextActive : saitClasses.nakshatraBtnTextIdle,
                      )}
                      style={nepaliTextStyle()}
                    >
                      {t(`sait.nakshatra_modes.${id}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        <PatroYearNavBlock
          era={era}
          onEraChange={onEraChange}
          year={year}
          onYearChange={onYearChange}
          location={location}
          onLocationChange={onLocationChange}
          className=""
        />

        {!loading && displayCount > 0 ? (
          <Text className={saitClasses.countText} style={nepaliTextStyle()}>
            {countText}
          </Text>
        ) : null}

        {profileControl ? (
          <View className={saitClasses.profileBox}>{profileControl}</View>
        ) : null}

        {notice}

        <View className={saitClasses.body}>
          {children ? (
            children
          ) : loading ? (
            <View className="flex-row flex-wrap gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonPulse
                  key={i}
                  style={{ width: cardWidth as never }}
                  className={saitClasses.skeletonCard}
                />
              ))}
            </View>
          ) : days.length > 0 ? (
            byMonth.map(([month, monthDays]) => {
              const monthLabel =
                lang === "en"
                  ? t("sait.month_number", { month: digits(month) })
                  : (monthDays[0]?.bs_month_name_ne ?? t("sait.month_number", { month: digits(month) }));
              return (
                <View key={month} className={saitClasses.monthBlock}>
                  <View className={saitClasses.monthHeader}>
                    <Text className={saitClasses.monthTitle} style={nepaliTextStyle()}>
                      {monthLabel}
                    </Text>
                    <Text className={saitClasses.monthCount} style={nepaliTextStyle()}>
                      {t("sait.days_count", { count: digits(monthDays.length) })}
                    </Text>
                  </View>
                  <View className="flex-row flex-wrap gap-3">
                    {monthDays.map((d) => {
                      const key = `${d.bs_month}-${d.bs_day}`;
                      return (
                        <SaitDayCard
                          key={`${key}-${d.window_start}`}
                          d={d}
                          width={cardWidth}
                          suitability={suitabilityByDay?.get(key)}
                          personalize={personalizeByDay?.get(key)}
                        />
                      );
                    })}
                  </View>
                </View>
              );
            })
          ) : (
            <Text className={saitClasses.emptyText} style={nepaliTextStyle()}>
              {emptyLabel ?? t("ui.sait.no_auspicious_days_found_this_year")}
            </Text>
          )}
        </View>

        {footer}

        <Pressable
          onPress={() => router.push("/panchanga/details" as never)}
          className="flex-row items-center gap-1.5 self-start"
        >
          <Ionicons name="grid-outline" size={14} color={colors.primary} />
          <Text className="text-sm text-primary underline" style={nepaliTextStyle()}>
            {t("sait.all_ceremonies")}
          </Text>
        </Pressable>
      </View>
    </AppShell>
  );
}

export default SaitCeremonyLayout;
