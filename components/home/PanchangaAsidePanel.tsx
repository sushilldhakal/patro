import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { TodayHighlightCard } from "./TodayHighlightCard";
import { PanchangaVivaranPanel } from "./PanchangaVivaranPanel";
import { MuhurtaAsidePanel } from "./MuhurtaAsidePanel";
import { SaitAsidePanel } from "./SaitAsidePanel";
import type { CalendarDay, LocationParams, PanchangaDay, SaitMonthAllResponse } from "@/lib/api";
import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { panchangaMatchesAside } from "@/lib/panchanga-aside-match";
import type { PatroBrowseEra } from "@/lib/patro-era";
import { isGregorianBrowseEra } from "@/lib/patro-era";

const TABS = ["panchanga", "muhurta", "sait"] as const;
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
  browseEra?: PatroBrowseEra;
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
  const { pick } = useLocale();
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
  const isAdCalendar = isGregorianBrowseEra(browseEra);
  const activeP = panchangaMatchesAside(p, selectedAd, { year, month, isAdCalendar }, contextDay)
    ? p
    : undefined;

  return (
    <View className="overflow-hidden rounded-2xl border border-border bg-card">
      <View className="flex-row items-baseline gap-2.5 border-b border-border px-4 py-3.5">
        <Text className="flex-1 text-lg font-bold text-foreground">
          {isSelectedToday ? pick("आजको पञ्चाङ्ग", "Today's Panchanga") : pick("पञ्चाङ्ग", "Panchanga")}
        </Text>
        <Pressable onPress={() => router.push({ pathname: "/panchanga", params: { date: selectedAd } })}>
          <Text className="text-xs text-secondary">{pick("पूरा विवरण →", "Full detail →")}</Text>
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

      <View className="overflow-hidden bg-card">
        <View className="flex-row border-b border-border bg-surface-muted">
          {TABS.map((id) => (
            <Pressable
              key={id}
              onPress={() => setTab(id)}
              className={cn(
                "min-h-10 flex-1 items-center justify-center border-b-2 px-1 py-2.5",
                tab === id ? "border-primary bg-tab-active" : "border-transparent",
              )}
            >
              <Text
                className={cn(
                  "text-center text-xs font-semibold",
                  tab === id ? "font-bold text-foreground" : "text-muted-foreground",
                )}
              >
                {pick(
                  id === "panchanga" ? "पञ्चाङ्ग" : id === "muhurta" ? "मुहूर्त" : "साइत",
                  id === "panchanga" ? "Panchanga" : id === "muhurta" ? "Muhurta" : "Sait",
                )}
              </Text>
            </Pressable>
          ))}
        </View>

        <View className="min-h-[12rem] p-3">
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
              <Text className="py-6 text-center text-sm text-muted-foreground">
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
