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
import { saitDayKey, useSaitCeremonyList } from "@vedic-patro/features/sait";
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
  const colors = useThemeColors();
  const router = useRouter();
  const { width } = useBreakpoint();
  const list = useSaitCeremonyList({ days, count, year, emptyLabel, countLabel });

  const cols = width >= 1024 ? 3 : width >= 640 ? 2 : 1;
  const cardWidth = cols === 1 ? "100%" : `${(100 / cols - 1.5).toFixed(2)}%`;

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
              {list.nakshatra.label}
            </Text>
            <View className={cn(saitClasses.nakshatraGroup, "self-start")}>
              {list.nakshatra.modes.map(({ id, label }) => {
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
                      {label}
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

        {!loading && list.displayCount > 0 ? (
          <Text className={saitClasses.countText} style={nepaliTextStyle()}>
            {list.countText}
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
            list.months.map((m) => (
              <View key={m.month} className={saitClasses.monthBlock}>
                <View className={saitClasses.monthHeader}>
                  <Text className={saitClasses.monthTitle} style={nepaliTextStyle()}>
                    {m.label}
                  </Text>
                  <Text className={saitClasses.monthCount} style={nepaliTextStyle()}>
                    {m.count}
                  </Text>
                </View>
                <View className="flex-row flex-wrap gap-3">
                  {m.days.map((d) => (
                    <SaitDayCard
                      key={`${saitDayKey(d)}-${d.window_start}`}
                      d={d}
                      width={cardWidth}
                      suitability={suitabilityByDay?.get(saitDayKey(d))}
                      personalize={personalizeByDay?.get(saitDayKey(d))}
                    />
                  ))}
                </View>
              </View>
            ))
          ) : (
            <Text className={saitClasses.emptyText} style={nepaliTextStyle()}>
              {list.empty}
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
            {list.allCeremonies}
          </Text>
        </Pressable>
      </View>
    </AppShell>
  );
}

export default SaitCeremonyLayout;
