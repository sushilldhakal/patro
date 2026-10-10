import { useMemo, useState } from "react";
import { AppNavIcon } from "@/components/icons/AppNavIcon";
import { PatroPageHeader } from "@/components/patro-date/PatroPageHeader";
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
import { profileChartParams } from "@/lib/kundali/profile-chart";
import { instantCacheKey } from "@vedic-patro/domain/instant-query";
import { useLocale } from "@/lib/i18n";
import {
  RASHIFAL_PERIOD_ICON,
  rashifalRangeLabel,
  rashifalStepDate,
} from "@/lib/rashifal-ui";
import { useThemeColors } from "@/lib/theme-context";
import { usePanchangaLocation } from "@/lib/use-panchanga-location";
import { cn } from "@vedic-patro/domain/utils";
import { resolveTimeZone, todayAdStringInTimezone } from "@vedic-patro/domain/zoned-time";
import { nepaliTextStyle } from "@/lib/nepali-text";

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
      <View className="gap-4">
        <PatroPageHeader
          icon={<AppNavIcon name="sparkles" size={28} color={colors.secondary} />}
          title={t("rashifal.title")}
          subtitle={t("rashifal.subtitle")}
        />
        <Text className="text-caption -mt-2 uppercase tracking-widest text-muted-foreground" style={nepaliTextStyle(12)}>
          {t("rashifal.eyebrow")}
        </Text>

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

        <View className="flex-row rounded-xl border border-border bg-card p-1">
          {RASHIFAL_PERIODS.map((p) => {
            const active = p === period;
            const icon = RASHIFAL_PERIOD_ICON[p];
            return (
              <Pressable
                key={p}
                onPress={() => setPeriod(p)}
                className={cn(
                  "min-h-10 flex-1 flex-row items-center justify-center gap-1 rounded-lg px-1 py-2",
                  active ? "bg-tab-active" : "",
                )}
              >
                <Ionicons
                  name={icon}
                  size={16}
                  color={active ? colors.primary : colors.mutedForeground}
                />
                {active ? (
                  <Text
                    className="text-caption font-bold text-foreground"
                    style={nepaliTextStyle(10)}
                    numberOfLines={1}
                  >
                    {pick(PERIOD_LABEL[p].ne, PERIOD_LABEL[p].en)}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <RashifalProfilePicker selectedId={selectedProfile?.id ?? null} onSelect={handleSelectProfile} />
        {profileError ? (
          <Text className="text-caption text-center text-destructive">
            {pick("जन्म मिति र स्थान प्रोफाइलमा भर्नुहोस्।", "Add birth date and place to the profile.")}
          </Text>
        ) : null}

        {loading && !windowSource ? (
          <View className="py-16">
            <VedicPatroLoader />
          </View>
        ) : error ? (
          <ErrorState
            message={pick("राशिफल लोड गर्न सकिएन।", "Could not load rashifal.")}
            onRetry={() => (selectedProfile ? personalQ.refetch() : generalQ.refetch())}
          />
        ) : selectedProfile && personalQ.data ? (
          <RashifalPersonalCard name={selectedProfile.full_name} personal={personalQ.data} />
        ) : generalQ.data?.signs?.length ? (
          <View className="gap-4">
            {period !== "daily" ? (
              <Text className="text-body text-center text-muted-foreground" style={nepaliTextStyle(14)}>
                {t(`rashifal.period_intro.${period}`)}
              </Text>
            ) : null}
            {moonRef ? (
              <Text className="text-body text-center text-muted-foreground" style={nepaliTextStyle(14)}>
                {moonRef}
              </Text>
            ) : null}
            <Text className="text-caption text-center text-muted-foreground" style={nepaliTextStyle(13)}>
              {t("rashifal.method_note")}
            </Text>
            {generalQ.data.signs.map((sign) => (
              <RashifalSignCard key={sign.id} sign={sign} period={period} />
            ))}
          </View>
        ) : (
          <Text className="text-body py-8 text-center text-muted-foreground">
            {pick("यस अवधिको राशिफल उपलब्ध छैन।", "Rashifal unavailable for this period.")}
          </Text>
        )}
      </View>
    </AppShell>
  );
}
