import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useRashifalPage } from "@vedic-patro/features/rashifal";
import { RASHIFAL_PERIODS, type RashifalPeriod } from "@vedic-patro/api-client";
import { cn } from "@vedic-patro/design-tokens/cn";
import { resolveTimeZone, todayAdStringInTimezone } from "@vedic-patro/domain/calendar/zoned-time";
import { rashifalClasses } from "@vedic-patro/design-tokens/classes/rashifal-classes";
import { AppNavIcon } from "@/components/icons/AppNavIcon";
import { Ionicons } from "@/components/icons/Ionicons";
import { PageHeader } from "@/components/ui/PageHeader";
import { Text } from "@/components/ui/Text";
import { AppShell } from "@/components/AppShell";
import { RashifalSignChooser } from "@/components/rashifal/RashifalSignChooser";
import { PanchangaDateNav } from "@/components/panchanga/PanchangaDateNav";
import { defaultClockForTimezone } from "@/components/panchanga/use-panchanga-mode";
import { RashifalPersonalCard } from "@/components/rashifal/RashifalPersonalCard";
import { RashifalProfileViewMenu } from "@/components/navigation/ProfileViewMenu";
import { usePageViewMenu } from "@/lib/page-view-menu";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { useLocale } from "@/lib/i18n";
import { RASHIFAL_PERIOD_ICON } from "@/lib/rashifal-ui";
import { useThemeColors } from "@/lib/theme-context";
import { usePanchangaLocation } from "@/lib/use-panchanga-location";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useBrowsedDay } from "@vedic-patro/features/patro-date";

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
  const { location, setLocation } = usePanchangaLocation();
  const tz = resolveTimeZone(undefined, location.params.timezone);
  const todayAd = todayAdStringInTimezone(new Date(), tz);
  const [date, setDate] = useBrowsedDay(() => new Date(`${todayAd}T12:00:00`));
  const [clock, setClock] = useState(() => defaultClockForTimezone(tz));
  const [methodOpen, setMethodOpen] = useState(false);
  const dateAd = toAdStr(date);
  // The app addresses a day by its AD date.
  const day = useMemo(() => ({ key: [dateAd], query: new URLSearchParams({ date: dateAd, era: "ad" }) }), [dateAd]);
  const page = useRashifalPage({ day, location: location.params, initialPeriod });

  const loading = page.profile ? page.personal.status === "loading" : page.general.status === "loading";
  const error = page.profile ? page.personal.status === "error" : page.general.status === "error";

  // Daily | weekly | monthly | yearly, in the header's view menu (the profiles follow there too).
  usePageViewMenu([
    {
      key: "period",
      options: page.periods.map(({ id, label, active }) => ({ key: id, label, active, onPress: () => page.setPeriod(id) })),
    },
  ]);

  return (
    <AppShell title={t("nav.jyotish_rashifal")} showHeader={false}>
      {/* The page starts at the date picker, like every dated page; the view menu holds the periods and profiles. */}
      <View className="gap-5">
        <View>
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


        {/* The profile list is in the header's view menu. */}
        <RashifalProfileViewMenu selectedId={page.profile?.id ?? null} onSelect={page.selectProfile} />
        {page.profileError ? (
          <Text className={rashifalClasses.profileError} style={nepaliTextStyle()}>
            {page.copy.missingBirthData}
          </Text>
        ) : null}

        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={page.copy.error} onRetry={page.profile ? page.personal.retry : page.general.retry} />
        ) : page.profile && page.personal.data ? (
          <View className={rashifalClasses.personalWrap}>
            <Text className={rashifalClasses.methodNote} style={nepaliTextStyle()}>
              {page.copy.personalMethodNote}
            </Text>
            <RashifalPersonalCard name={page.profile.full_name} personal={page.personal.data} />
          </View>
        ) : page.general.status === "ready" ? (
          <View className={rashifalClasses.panel}>
            {page.copy.moon ? (
              <Text className={rashifalClasses.intro} style={nepaliTextStyle()}>
                {page.copy.moon}
              </Text>
            ) : null}
            {/* The twelve as a grid with the reader's own rashi open, not twelve long readings in a row. */}
            <RashifalSignChooser signs={page.general.signs} period={page.period} />
            {/* How the readings are worked out (gochar, ashtakavarga, sudarshana…): there for whoever asks. */}
            <Pressable onPress={() => setMethodOpen((v) => !v)} accessibilityRole="button" className={rashifalClasses.methodToggle}>
              <Text className={rashifalClasses.methodToggleText} style={nepaliTextStyle()}>
                {t("rashifal.how_worked_out")}
              </Text>
              <Ionicons name={methodOpen ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
            </Pressable>
            {methodOpen ? (
              <View className="gap-3">
                {page.copy.intro ? (
                  <Text className={rashifalClasses.intro} style={nepaliTextStyle()}>
                    {page.copy.intro}
                  </Text>
                ) : null}
                <Text className={rashifalClasses.methodNote} style={nepaliTextStyle()}>
                  {page.copy.methodNote}
                </Text>
              </View>
            ) : null}
          </View>
        ) : (
          <Text className={cn("py-8", rashifalClasses.intro)} style={nepaliTextStyle()}>
            {page.copy.noData}
          </Text>
        )}
      </View>
    </AppShell>
  );
}
