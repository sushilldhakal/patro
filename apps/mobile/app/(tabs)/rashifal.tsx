import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useRashifalPage } from "@vedic-patro/features/rashifal";
import { RASHIFAL_PERIODS, type RashifalPeriod } from "@vedic-patro/api-client";
import { cn } from "@vedic-patro/design-tokens/cn";
import { resolveTimeZone, todayAdStringInTimezone } from "@vedic-patro/domain/zoned-time";
import { rashifalClasses } from "@vedic-patro/design-tokens/classes/rashifal-classes";
import { AppNavIcon } from "@/components/icons/AppNavIcon";
import { Ionicons } from "@/components/icons/Ionicons";
import { PageHeader } from "@/components/ui/PageHeader";
import { Text } from "@/components/ui/Text";
import { AppShell } from "@/components/AppShell";
import { RashifalSignCard } from "@/components/rashifal/RashifalSignCard";
import { PanchangaDateNav } from "@/components/panchanga/PanchangaDateNav";
import { defaultClockForTimezone } from "@/components/panchanga/use-panchanga-mode";
import { RashifalPersonalCard } from "@/components/rashifal/RashifalPersonalCard";
import { RashifalProfilePicker } from "@/components/rashifal/RashifalProfilePicker";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { useLocale } from "@/lib/i18n";
import { RASHIFAL_PERIOD_ICON } from "@/lib/rashifal-ui";
import { useBreakpoint } from "@/lib/responsive";
import { useThemeColors } from "@/lib/theme-context";
import { usePanchangaLocation } from "@/lib/use-panchanga-location";
import { nepaliTextStyle } from "@/lib/nepali-text";

function toAdStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Rashifal — the app's drawing of `useRashifalPage` (@vedic-patro/features). */
export default function RashifalScreen() {
  const params = useLocalSearchParams<{ period?: string }>();
  const initialPeriod = RASHIFAL_PERIODS.includes(params.period as RashifalPeriod) ? (params.period as RashifalPeriod) : "daily";
  const { t } = useLocale();
  const colors = useThemeColors();
  const { width: screenWidth } = useBreakpoint();
  const signCols = screenWidth >= 1280 ? 3 : screenWidth >= 640 ? 2 : 1;
  const { location, setLocation } = usePanchangaLocation();
  const tz = resolveTimeZone(undefined, location.params.timezone);
  const todayAd = todayAdStringInTimezone(new Date(), tz);
  const [date, setDate] = useState(() => new Date(`${todayAd}T12:00:00`));
  const [clock, setClock] = useState(() => defaultClockForTimezone(tz));
  const dateAd = toAdStr(date);
  // The app addresses a day by its AD date.
  const day = useMemo(() => ({ key: [dateAd], query: new URLSearchParams({ date: dateAd, era: "ad" }) }), [dateAd]);
  const page = useRashifalPage({ day, location: location.params, initialPeriod });

  const loading = page.profile ? page.personal.status === "loading" : page.general.status === "loading";
  const error = page.profile ? page.personal.status === "error" : page.general.status === "error";

  return (
    <AppShell title={t("nav.jyotish_rashifal")} showHeader={false}>
      <View className="gap-8">
        <PageHeader icon={<AppNavIcon name="sparkles" size={28} color={colors.secondary} />} title={page.copy.title} subtitle={page.copy.subtitle} />
        <Text className={rashifalClasses.eyebrow} style={nepaliTextStyle()}>
          {page.copy.eyebrow}
        </Text>

        <View className={rashifalClasses.navWrap}>
          <PanchangaDateNav
            date={date}
            onDateChange={setDate}
            todayAd={todayAd}
            clock={clock}
            onClockChange={setClock}
            location={location}
            onLocationChange={setLocation}
            crossEraSubtitleOverride={page.rangeLabel}
            onPrev={page.stepDate ? () => setDate(page.stepDate!(date, -1)) : undefined}
            onNext={page.stepDate ? () => setDate(page.stepDate!(date, 1)) : undefined}
          />
        </View>

        <View className={cn("flex-row", rashifalClasses.tabBar)} accessibilityRole="tablist" accessibilityLabel={page.copy.tabsLabel}>
          {page.periods.map(({ id, label, active }) => (
            <Pressable
              key={id}
              onPress={() => page.setPeriod(id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={label}
              className={cn(
                "relative min-w-0 flex-row items-center justify-center",
                rashifalClasses.tab,
                active ? cn(rashifalClasses.tabGapActive, rashifalClasses.tabActiveSurface) : rashifalClasses.tabGapIdle,
              )}
            >
              <Ionicons name={RASHIFAL_PERIOD_ICON[id]} size={20} color={active ? colors.foreground : colors.mutedForeground} />
              {active ? (
                <Text className={rashifalClasses.tabLabel} style={nepaliTextStyle()} numberOfLines={1}>
                  {label}
                </Text>
              ) : null}
              {active ? <View className={rashifalClasses.tabIndicator} /> : null}
            </Pressable>
          ))}
        </View>

        <View className={rashifalClasses.profileWrap}>
          <RashifalProfilePicker selectedId={page.profile?.id ?? null} onSelect={page.selectProfile} />
          {page.profileError ? (
            <Text className={cn("text-center", rashifalClasses.profileError)} style={nepaliTextStyle()}>
              {page.copy.missingBirthData}
            </Text>
          ) : null}
        </View>

        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={page.copy.error} onRetry={page.profile ? page.personal.retry : page.general.retry} />
        ) : page.profile && page.personal.data ? (
          <View className={cn("mt-6 sm:self-center", rashifalClasses.personalWrap)}>
            <Text className={rashifalClasses.methodNote} style={nepaliTextStyle()}>
              {page.copy.personalMethodNote}
            </Text>
            <RashifalPersonalCard name={page.profile.full_name} personal={page.personal.data} />
          </View>
        ) : page.general.status === "ready" ? (
          <View className={rashifalClasses.panel}>
            {page.copy.intro ? (
              <Text className={rashifalClasses.intro} style={nepaliTextStyle()}>
                {page.copy.intro}
              </Text>
            ) : null}
            {page.copy.moon ? (
              <Text className={rashifalClasses.intro} style={nepaliTextStyle()}>
                {page.copy.moon}
              </Text>
            ) : null}
            <Text className={rashifalClasses.methodNote} style={nepaliTextStyle()}>
              {page.copy.methodNote}
            </Text>
            <View className="-m-2 flex-row flex-wrap">
              {page.general.signs.map(({ sign, taraLine }) => (
                <View key={sign.id} style={{ width: `${100 / signCols}%` }} className="p-2">
                  <RashifalSignCard sign={sign} period={page.period} taraLine={taraLine} />
                </View>
              ))}
            </View>
          </View>
        ) : (
          <Text className={cn("mt-6 py-8", rashifalClasses.intro)} style={nepaliTextStyle()}>
            {page.copy.noData}
          </Text>
        )}
      </View>
    </AppShell>
  );
}
