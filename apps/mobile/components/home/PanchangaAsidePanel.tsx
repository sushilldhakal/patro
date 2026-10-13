import { useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { useRouter } from "expo-router";
import { TodayHighlightCard } from "./TodayHighlightCard";
import { PanchangaVivaranPanel } from "./PanchangaVivaranPanel";
import { MuhurtaAsidePanel } from "./MuhurtaAsidePanel";
import { SaitAsidePanel } from "./SaitAsidePanel";
import type { CalendarDay, LocationParams, PanchangaDay, SaitMonthAllResponse } from "@/lib/api";
import { useLocale } from "@/lib/i18n";
import { cn } from "@vedic-patro/domain/utils";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { panchangaMatchesAside } from "@/lib/panchanga-aside-match";
import { type Era, isGregorianEra } from "@vedic-patro/domain/era";
import { homeClasses } from "@vedic-patro/design-tokens/classes/home-classes";

const TABS = ["panchanga", "sait", "muhurta"] as const;
type TabId = (typeof TABS)[number];

type Props = {
  month: number;
  year: number;
  selectedAd: string;
  todayAd: string;
  selectedDay: CalendarDay | null;
  contextDays: CalendarDay[];
  p?: PanchangaDay;
  loading: boolean;
  error: boolean;
  onRetry?: () => void;
  saitData?: SaitMonthAllResponse;
  saitLoading?: boolean;
  saitError?: boolean;
  onSaitRetry?: () => void;
  location?: LocationParams;
  browseEra?: Era;
};

export function PanchangaAsidePanel({
  month,
  year,
  selectedAd,
  todayAd,
  selectedDay,
  contextDays,
  p,
  loading,
  error,
  onRetry,
  saitData,
  saitLoading,
  saitError,
  onSaitRetry,
  location,
  browseEra = "bs",
}: Props) {
  const { pick, t } = useLocale();
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("panchanga");

  const contextDay =
    selectedDay ??
    contextDays.find((d) => d.date_ad === selectedAd) ??
    contextDays.find((d) => d.day === 1) ??
    contextDays[0] ??
    null;

  const isSelectedToday = selectedAd === todayAd;
  const highlightDay = contextDay?.day;
  const isAdCalendar = isGregorianEra(browseEra);
  const activeP = panchangaMatchesAside(p, selectedAd, { year, month, isAdCalendar }, contextDay)
    ? p
    : undefined;

  return (
    <View className={homeClasses.asideShell}>
      <View className={homeClasses.asideHeader}>
        <Text className={homeClasses.asideTitle}>
          {isSelectedToday ? pick("आजको पञ्चाङ्ग", "Today's Panchanga") : pick("पञ्चाङ्ग", "Panchanga")}
        </Text>
        <Pressable onPress={() => router.push({ pathname: "/panchanga", params: { date: selectedAd } })}>
          <Text className={homeClasses.asideLink}>{pick("पूरा विवरण →", "Full detail →")}</Text>
        </Pressable>
      </View>

      <TodayHighlightCard
        selectedDay={contextDay}
        selectedAdDate={selectedAd}
        todayAd={todayAd}
        isAdCalendar={isAdCalendar}
        year={year}
        month={month}
        p={activeP}
      />

      <View className={homeClasses.asideBody}>
        <View className={cn("flex-row", homeClasses.asideTabBar)}>
          {TABS.map((id) => (
            <Pressable
              key={id}
              onPress={() => setTab(id)}
              className={cn(
                homeClasses.asideTab,
                "items-center justify-center",
                tab === id && homeClasses.asideTabActive,
              )}
            >
              <Text
                className={cn(
                  homeClasses.asideTabLabel,
                  tab === id ? homeClasses.asideTabLabelActive : homeClasses.asideTabLabelIdle,
                )}
              >
                {t(`panchanga.tabs.${id}`)}
              </Text>
              {tab === id ? (
                <View className={homeClasses.asideTabIndicator} />
              ) : null}
            </Pressable>
          ))}
        </View>

        <View className={homeClasses.asidePanel}>
          {error && !p && tab !== "sait" ? (
            <ErrorState
              message={pick("पञ्चाङ्ग लोड गर्न सकिएन।", "Could not load panchanga.")}
              onRetry={onRetry}
            />
          ) : loading && !p && tab !== "sait" ? (
            <LoadingState />
          ) : tab === "panchanga" ? (
            <PanchangaVivaranPanel
              p={activeP}
              selectedDay={contextDay}
              selectedAd={selectedAd}
              loading={loading && !activeP}
            />
          ) : tab === "muhurta" ? (
            activeP ? (
              <MuhurtaAsidePanel p={activeP} />
            ) : (
              <Text className="text-body py-6 text-center text-muted-foreground">
                {pick("मुहूर्त विवरण उपलब्ध छैन।", "Muhurta details unavailable.")}
              </Text>
            )
          ) : (
            <SaitAsidePanel
              year={year}
              month={month}
              highlightDay={highlightDay}
              location={location}
              data={saitData}
              loading={saitLoading}
              error={saitError}
              onRetry={onSaitRetry}
            />
          )}
        </View>
      </View>
    </View>
  );
}
