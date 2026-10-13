import { useMemo, useState } from "react";
import { AppNavIcon } from "@/components/icons/AppNavIcon";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { useLocalSearchParams } from "expo-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Ionicons } from "@/components/icons/Ionicons";
import { AppShell } from "@/components/AppShell";
import { RashifalSignCard } from "@/components/rashifal/RashifalSignCard";
import { formatRashiDisplay } from "@vedic-patro/domain/rashi-i18n";
import { PanchangaDateNav } from "@/components/panchanga/PanchangaDateNav";
import { defaultClockForTimezone } from "@/components/panchanga/use-panchanga-mode";
import { RashifalPersonalCard } from "@/components/rashifal/RashifalPersonalCard";
import { RashifalProfilePicker } from "@/components/rashifal/RashifalProfilePicker";
import { ErrorState } from "@/components/ui/States";
import { VedicPatroLoader } from "@/components/branding/VedicPatroLoader";
import type { Profile } from "@/lib/auth/client";
import {
  RASHIFAL_PERIODS,
  fetchPersonalRashifal,
  fetchRashifal,
  rashifalKeys,
  type RashifalPeriod,
} from "@/lib/api";
import { profileChartParams } from "@vedic-patro/domain/kundali/profile-chart";
import { instantCacheKey } from "@vedic-patro/domain/instant-query";
import { useLocale } from "@/lib/i18n";
import {
  RASHIFAL_PERIOD_ICON,
  rashifalRangeLabel,
  rashifalStepDate,
} from "@/lib/rashifal-ui";
import { useBreakpoint } from "@/lib/responsive";
import { useThemeColors } from "@/lib/theme-context";
import { usePanchangaLocation } from "@/lib/use-panchanga-location";
import { cn } from "@vedic-patro/domain/utils";
import { resolveTimeZone, todayAdStringInTimezone } from "@vedic-patro/domain/zoned-time";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { rashifalClasses } from "@vedic-patro/design-tokens/classes/rashifal-classes";

function toAdStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const PERIOD_LABEL: Record<RashifalPeriod, { ne: string; en: string }> = {
  daily: { ne: "दैनिक", en: "Daily" },
  weekly: { ne: "साप्ताहिक", en: "Weekly" },
  monthly: { ne: "मासिक", en: "Monthly" },
  yearly: { ne: "वार्षिक", en: "Yearly" },
};

export default function RashifalScreen() {
  const params = useLocalSearchParams<{ period?: string }>();
  const initialPeriod = RASHIFAL_PERIODS.includes(params.period as RashifalPeriod)
    ? (params.period as RashifalPeriod)
    : "daily";

  const { pick, lang, digits, t } = useLocale();
  const colors = useThemeColors();
  const { width: screenWidth } = useBreakpoint();
  const signCols = screenWidth >= 1280 ? 3 : screenWidth >= 640 ? 2 : 1;
  const { location, setLocation } = usePanchangaLocation();
  const tz = resolveTimeZone(undefined, location.params.timezone);
  const todayAd = todayAdStringInTimezone(new Date(), tz);
  const [date, setDate] = useState(() => new Date(`${todayAd}T12:00:00`));
  const [clock, setClock] = useState(() => defaultClockForTimezone(tz));
  const [period, setPeriod] = useState<RashifalPeriod>(initialPeriod);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState(false);

  const dateAd = useMemo(() => toAdStr(date), [date]);

  const profileChart = selectedProfile ? profileChartParams(selectedProfile) : null;
  const hasBirthChart = Boolean(
    profileChart &&
      profileChart.location.params.lat != null &&
      profileChart.location.params.lon != null,
  );

  const generalQ = useQuery({
    queryKey: rashifalKeys.block(dateAd, period, location.params),
    queryFn: () => fetchRashifal(dateAd, period, location.params),
    enabled: !selectedProfile,
    staleTime: 1000 * 60 * 15,
    placeholderData: keepPreviousData,
  });

  const personalQ = useQuery({
    queryKey: rashifalKeys.personal(
      dateAd,
      period,
      selectedProfile?.id ?? "",
      location.params,
      profileChart ? instantCacheKey(profileChart.moment) : "",
    ),
    queryFn: () =>
      fetchPersonalRashifal(
        dateAd,
        period,
        {
          moment: profileChart!.moment,
          birthLat: profileChart!.location.params.lat as number,
          birthLon: profileChart!.location.params.lon as number,
          birthTz: profileChart!.location.params.timezone ?? "Asia/Kathmandu",
        },
        location.params,
      ),
    enabled: Boolean(selectedProfile && hasBirthChart),
    staleTime: 1000 * 60 * 10,
    placeholderData: keepPreviousData,
  });

  const windowSource = selectedProfile ? personalQ.data : generalQ.data;
  const rangeLabel = useMemo(
    () => rashifalRangeLabel(windowSource, period, lang),
    [windowSource, period, lang, digits],
  );

  const handleSelectProfile = (profile: Profile | null) => {
    const chart = profile ? profileChartParams(profile) : null;
    if (profile && (!chart || chart.location.params.lat == null || chart.location.params.lon == null)) {
      setProfileError(true);
      setSelectedProfile(null);
      return;
    }
    setProfileError(false);
    setSelectedProfile(profile);
  };

  const loading = selectedProfile
    ? personalQ.isFetching && !personalQ.data
    : generalQ.isFetching && !generalQ.data;
  const error = selectedProfile ? personalQ.isError : generalQ.isError;

  const moonRef = useMemo(() => {
    const d = generalQ.data;
    if (!d) return undefined;
    const label = formatRashiDisplay(d.moon_label, d.moon_label_en, lang);
    return label ? t("rashifal.moon_at_sunrise", { sign: label }) : undefined;
  }, [generalQ.data, lang, t]);

  return (
    <AppShell title={pick("राशिफल", "Rashifal")} showHeader={false}>
      {/* AppShell already supplies the page scroller and horizontal padding —
          a second ScrollView + padding here is what made this screen inset more
          than every other page. */}
      <View className="gap-8">
        <PageHeader
          icon={<AppNavIcon name="sparkles" size={28} color={colors.secondary} />}
          title={t("rashifal.title")}
          subtitle={t("rashifal.subtitle")}
        />
        <Text className={rashifalClasses.eyebrow} style={nepaliTextStyle()}>
          {t("rashifal.eyebrow")}
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
          crossEraSubtitleOverride={period !== "daily" ? rangeLabel : undefined}
          onPrev={
            period !== "daily"
              ? () => setDate(rashifalStepDate(windowSource, period, date, -1))
              : undefined
          }
          onNext={
            period !== "daily"
              ? () => setDate(rashifalStepDate(windowSource, period, date, 1))
              : undefined
          }
        />
        </View>

        <View className={cn("flex-row", rashifalClasses.tabBar)}>
          {RASHIFAL_PERIODS.map((p) => {
            const active = p === period;
            const icon = RASHIFAL_PERIOD_ICON[p];
            return (
              <Pressable
                key={p}
                onPress={() => setPeriod(p)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                className={cn(
                  "relative min-w-0 flex-row items-center justify-center",
                  rashifalClasses.tab,
                  active
                    ? cn(rashifalClasses.tabGapActive, rashifalClasses.tabActiveSurface)
                    : rashifalClasses.tabGapIdle,
                )}
              >
                <Ionicons
                  name={icon}
                  size={20}
                  color={active ? colors.foreground : colors.mutedForeground}
                />
                {active ? (
                  <Text
                    className={rashifalClasses.tabLabel}
                    style={nepaliTextStyle()}
                    numberOfLines={1}
                  >
                    {pick(PERIOD_LABEL[p].ne, PERIOD_LABEL[p].en)}
                  </Text>
                ) : null}
                {active ? <View className={rashifalClasses.tabIndicator} /> : null}
              </Pressable>
            );
          })}
        </View>

        <View className={rashifalClasses.profileWrap}>
        <RashifalProfilePicker selectedId={selectedProfile?.id ?? null} onSelect={handleSelectProfile} />
        {profileError ? (
          <Text className={cn("text-center", rashifalClasses.profileError)} style={nepaliTextStyle()}>
            {pick("जन्म मिति र स्थान प्रोफाइलमा भर्नुहोस्।", "Add birth date and place to the profile.")}
          </Text>
        ) : null}
        </View>

        {loading && !windowSource ? (
          <View className="mt-6 py-16">
            <VedicPatroLoader />
          </View>
        ) : error ? (
          <ErrorState
            message={pick("राशिफल लोड गर्न सकिएन।", "Could not load rashifal.")}
            onRetry={() => (selectedProfile ? personalQ.refetch() : generalQ.refetch())}
          />
        ) : selectedProfile && personalQ.data ? (
          <View className={cn("mt-6 sm:self-center", rashifalClasses.personalWrap)}>
            <RashifalPersonalCard name={selectedProfile.full_name} personal={personalQ.data} />
          </View>
        ) : generalQ.data?.signs?.length ? (
          <View className={rashifalClasses.panel}>
            {period !== "daily" ? (
              <Text className={rashifalClasses.intro} style={nepaliTextStyle()}>
                {t(`rashifal.period_intro.${period}`)}
              </Text>
            ) : null}
            {moonRef ? (
              <Text className={rashifalClasses.intro} style={nepaliTextStyle()}>
                {moonRef}
              </Text>
            ) : null}
            <Text className={rashifalClasses.methodNote} style={nepaliTextStyle()}>
              {t("rashifal.method_note")}
            </Text>
            <View className="-m-2 flex-row flex-wrap">
              {generalQ.data.signs.map((sign) => (
                <View key={sign.id} style={{ width: `${100 / signCols}%` }} className="p-2">
                  <RashifalSignCard sign={sign} period={period} />
                </View>
              ))}
            </View>
          </View>
        ) : (
          <Text className={cn("mt-6 py-8", rashifalClasses.intro)} style={nepaliTextStyle()}>
            {pick("यस अवधिको राशिफल उपलब्ध छैन।", "Rashifal unavailable for this period.")}
          </Text>
        )}
      </View>
    </AppShell>
  );
}
