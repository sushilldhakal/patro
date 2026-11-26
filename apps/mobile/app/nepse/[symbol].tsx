import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { brand, space } from "@vedic-patro/design-tokens";
import {
  NEPSE_RANGES,
  nepseNumber,
  useNepseStock,
  type NepseRange,
} from "@vedic-patro/features/home";
import { BackHeader } from "@/components/home/BackHeader";
import { RateChart } from "@/components/home/RateChart";
import { SkeletonPulse } from "@/components/ui/SkeletonPulse";
import { Text } from "@/components/ui/Text";
import { useLocale } from "@/lib/i18n";
import { useNavBottomPadding } from "@/lib/mobile-nav";
import { useThemeColors } from "@/lib/theme-context";

/**
 * One NEPSE scrip: its live price (refreshed every 30 s while trading is open), the day's
 * intraday chart and daily closes over a month to its whole listed history.
 */
export default function NepseStockScreen() {
  const { symbol: raw } = useLocalSearchParams<{ symbol: string }>();
  const symbol = String(raw ?? "").toUpperCase();
  const { t, digits } = useLocale();
  const colors = useThemeColors();
  const navBottom = useNavBottomPadding(false);
  const [range, setRange] = useState<NepseRange>("1D");
  const page = useNepseStock(symbol, range);
  const q = page.quote;
  const money = (v: number) => digits(nepseNumber(v));
  const tone = !q
    ? colors.foreground
    : q.change > 0
      ? brand.green
      : q.change < 0
        ? brand.vermilion
        : colors.mutedForeground;
  const time = page.asOf?.slice(11, 16) ?? "";

  return (
    <View className="flex-1 bg-background">
      <BackHeader title={symbol} subtitle={q?.name ?? t("market.shares_kicker")} />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: space.lg,
          paddingTop: space.sm,
          paddingBottom: navBottom + space["2xl"],
          gap: space.lg,
        }}
      >
        {q ? (
          <View className="gap-1">
            <Text className="text-4xl font-extrabold tabular-nums text-foreground">
              {money(q.ltp)}
            </Text>
            <Text className="text-base font-semibold tabular-nums" style={{ color: tone }}>
              {digits(
                `${q.change > 0 ? "+" : ""}${nepseNumber(q.change)} (${q.percent > 0 ? "+" : ""}${q.percent.toFixed(2)}%)`,
              )}
            </Text>
            <Text className="text-sm text-muted-foreground">
              {t(page.marketOpen ? "market.shares_live" : "market.shares_closed", {
                date: digits(page.asOf?.slice(0, 10) ?? ""),
                time: digits(time),
              })}
            </Text>
          </View>
        ) : page.loading ? (
          <SkeletonPulse className="h-24 rounded-2xl" />
        ) : (
          <Text className="text-base text-muted-foreground">
            {t("market.shares_not_traded")}
          </Text>
        )}

        <View className="flex-row rounded-full border border-border bg-card p-1">
          {NEPSE_RANGES.map((r) => {
            const on = r === range;
            return (
              <Pressable
                key={r}
                onPress={() => setRange(r)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                className={`flex-1 items-center rounded-full py-2 ${on ? "bg-secondary" : ""}`}
              >
                <Text
                  className={`text-sm font-semibold ${on ? "text-secondary-foreground" : "text-muted-foreground"}`}
                >
                  {t(`market.range_${r}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View className="rounded-2xl border border-border bg-card p-3">
          {page.chart.values.length > 1 ? (
            <RateChart
              labels={page.chart.labels.map((l) => digits(l))}
              format={money}
              series={[{ label: symbol, values: page.chart.values, color: tone }]}
            />
          ) : page.loading ? (
            <SkeletonPulse className="h-48 rounded-xl" />
          ) : (
            <Text className="py-16 text-center text-sm text-muted-foreground">
              {t(page.error ? "market.shares_error" : "market.shares_no_chart")}
            </Text>
          )}
        </View>

        {q ? (
          <View className="flex-row flex-wrap gap-3">
            {[
              [t("market.shares_open"), money(q.open)],
              [t("market.shares_high"), money(q.high)],
              [t("market.shares_low"), money(q.low)],
              [t("market.shares_prev"), money(q.prev_close)],
              [t("market.shares_volume"), digits(nepseNumber(q.volume, 0))],
              [t("market.shares_turnover_rs"), money(q.turnover)],
            ].map(([label, value]) => (
              <View
                key={label}
                className="rounded-2xl border border-border bg-card p-3"
                style={{ flexBasis: "47%", flexGrow: 1 }}
              >
                <Text className="text-xs text-muted-foreground">{label}</Text>
                <Text
                  className="text-lg font-bold tabular-nums text-foreground"
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {value}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
        <Text className="text-xs text-muted-foreground">{t("market.shares_source")}</Text>
      </ScrollView>
    </View>
  );
}
