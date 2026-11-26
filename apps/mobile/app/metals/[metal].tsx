import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { space } from "@vedic-patro/design-tokens";
import { useMetalDetail, type MetalId } from "@vedic-patro/features/home";
import { BackHeader } from "@/components/home/BackHeader";
import { useNavBottomPadding } from "@/lib/mobile-nav";
import { MetalPriceLines } from "@/components/home/MarketCards";
import { RateChart } from "@/components/home/RateChart";
import { RateTable } from "@/components/home/RateTable";
import { metalTint } from "@/components/home/TintCard";
import { SkeletonPulse } from "@/components/ui/SkeletonPulse";
import { Text } from "@/components/ui/Text";
import { useThemeColors } from "@/lib/theme-context";
import { useLocale } from "@/lib/i18n";

/** One metal: today's price per tola and per 10 grams, then every published day. */
export default function MetalScreen() {
  const { metal } = useLocalSearchParams<{ metal: string }>();
  const id: MetalId = metal === "silver" || metal === "gold22" ? metal : "gold";
  const page = useMetalDetail(id);
  const { t } = useLocale();
  const [rangeDays, setRangeDays] = useState(90);
  const from = Math.max(0, page.chart.labels.length - rangeDays);
  const colors = useThemeColors();
  const navBottom = useNavBottomPadding(false);
  const title = page.card?.name ?? page.copy.title;
  return (
    <View className="flex-1 bg-background">
      <BackHeader title={title} subtitle={page.copy.subtitle} />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: space.lg,
          paddingTop: space.sm,
          paddingBottom: navBottom + space["2xl"],
          gap: space.lg,
        }}
      >
        {page.status === "loading" ? (
          <SkeletonPulse className="h-96 rounded-2xl" />
        ) : null}
        {page.card ? (
          <View className="gap-4">
            <View className="rounded-2xl border border-border bg-card p-4">
              <MetalPriceLines
                card={page.card}
                tola={page.copy.tola}
                tenGram={page.copy.tenGram}
                large
              />
              <Text className="mt-2 text-xs text-muted-foreground">
                {page.card.date} · {page.copy.note}
              </Text>
              {id === "gold22" ? (
                <Text className="mt-1 text-xs text-muted-foreground">
                  {t("metals.gold22_note")}
                </Text>
              ) : null}
            </View>
            <Text className="text-base font-bold text-foreground">
              {page.copy.history}
            </Text>
            <View className="gap-3 rounded-2xl border border-border bg-card p-3">
              <View className="flex-row gap-2">
                {page.copy.ranges.map((r) => (
                  <Pressable
                    key={r.days}
                    onPress={() => setRangeDays(r.days)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: r.days === rangeDays }}
                    className={`rounded-full px-3 py-1 ${r.days === rangeDays ? "bg-secondary" : "bg-muted"}`}
                  >
                    <Text
                      className={`text-sm font-semibold ${r.days === rangeDays ? "text-secondary-foreground" : "text-muted-foreground"}`}
                    >
                      {r.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <RateChart
                labels={page.chart.labels.slice(from)}
                format={page.chart.format}
                series={[
                  {
                    label: page.copy.tola,
                    values: page.chart.values.slice(from),
                    color:
                      id === "silver" ? colors.mutedForeground : metalTint(id),
                  },
                ]}
              />
            </View>
            <RateTable
              head={[page.copy.date, page.copy.tola, page.copy.tenGram]}
              rows={page.rows.map((r) => ({
                key: r.date,
                cells: [r.date, r.tola, r.tenGram],
              }))}
            />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
