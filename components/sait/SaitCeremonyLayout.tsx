import { useMemo } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { AppShell } from "@/components/AppShell";
import { PatroYearNavBlock } from "@/components/patro-date/PatroYearNavBlock";
import { SaitDayCard } from "@/components/sait/SaitDayCard";
import { SaitRulesSection, type SaitRule } from "@/components/sait/SaitRulesSection";
import { Text } from "@/components/ui/Text";
import type { SaitDetailDay, SaitPersonalizeDay, SaitSuitability } from "@/lib/api";
import { BS_MONTH_NAMES } from "@/lib/bs-calendar";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import type { PatroBrowseEra } from "@/lib/patro-era";
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
  era: PatroBrowseEra;
  onEraChange: (era: PatroBrowseEra) => void;
  year: number;
  onYearChange: (year: number) => void;
  location: PanchangaLocation;
  onLocationChange: (loc: PanchangaLocation) => void;
  method?: { ne?: string; en?: string } | null;
  rules?: SaitRule[] | null;
  engineVersion?: string;
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
  const { lang, pick, digits } = useLocale();
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

  const countText = countLabel
    ? countLabel(days.length, year)
    : pick(
        `${digits(year)} मा ${digits(days.length)} शुभ दिन`,
        `${days.length} auspicious days in ${year}`,
      );

  return (
    <AppShell title={title} showHeader={false}>
      <SaitRulesSection method={method} rules={rules} engineVersion={engineVersion} />

      <PatroYearNavBlock
        era={era}
        onEraChange={onEraChange}
        year={year}
        onYearChange={onYearChange}
        location={location}
        onLocationChange={onLocationChange}
      />

      {profileControl ? (
        <View
          style={{ backgroundColor: colors.surfaceInset, borderColor: colors.border }}
          className="mb-3 gap-2 rounded-xl border p-3"
        >
          {profileControl}
        </View>
      ) : null}

      {!loading && days.length > 0 ? (
        <Text className="mb-3 text-sm text-muted-foreground" style={nepaliTextStyle(14)}>
          {countText}
        </Text>
      ) : null}

      {loading ? (
        <Text className="text-sm text-muted-foreground" style={nepaliTextStyle(14)}>
          {pick("लोड हुँदै…", "Loading…")}
        </Text>
      ) : days.length > 0 ? (
        <View className="gap-6">
          {byMonth.map(([month, monthDays]) => {
            const monthLabel =
              lang === "en"
                ? (BS_MONTH_NAMES[month - 1] ?? `Month ${month}`)
                : (monthDays[0]?.bs_month_name_ne ?? `महिना ${digits(month)}`);
            return (
              <View key={month} className="gap-3">
                <View className="flex-row items-end justify-between gap-3">
                  <Text className="text-lg font-bold text-foreground" style={nepaliTextStyle(18)}>
                    {monthLabel}
                  </Text>
                  <Text className="text-sm text-muted-foreground" style={nepaliTextStyle(13)}>
                    {pick(`${digits(monthDays.length)} दिन`, `${monthDays.length} days`)}
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
          })}
        </View>
      ) : (
        <Text
          className="py-8 text-center text-sm text-muted-foreground"
          style={nepaliTextStyle(14)}
        >
          {emptyLabel ?? pick("यस वर्ष कुनै शुभ दिन भेटिएन।", "No auspicious days found this year.")}
        </Text>
      )}

      {footer}

      <Pressable
        onPress={() => router.push("/panchanga/details" as never)}
        className="mt-6 flex-row items-center gap-1.5 self-start"
      >
        <Ionicons name="grid-outline" size={14} color={colors.primary} />
        <Text style={{ color: colors.primary }} className="text-sm underline">
          {pick("सबै संस्कारका साइत", "All ceremonies")}
        </Text>
      </Pressable>
    </AppShell>
  );
}

export default SaitCeremonyLayout;
