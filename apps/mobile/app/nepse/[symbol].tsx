import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { space } from "@vedic-patro/design-tokens";
import {
  NEPSE_RANGES,
  nepseNumber,
  useNepseStock,
  useMarketDate,
  type NepseRange,
} from "@vedic-patro/features/home";
import { BackHeader } from "@/components/home/BackHeader";
import { RateChart } from "@/components/home/RateChart";
import { Change, MarketSection, StarButton, SymbolAvatar } from "@/components/market/MarketParts";
import { SkeletonPulse } from "@/components/ui/SkeletonPulse";
import { Text } from "@/components/ui/Text";
import { useLocale } from "@/lib/i18n";
import { useNavBottomPadding, PAGE_HORIZONTAL_PADDING } from "@/lib/mobile-nav";
import { useThemeColors } from "@/lib/theme-context";

/**
 * One NEPSE scrip, laid out like a trading app's asset page: name and badge, the big last price with
 * its change, a chart from today's ticks to the whole listed history, then the key stats. The star
 * adds it to the market page's watchlist. Prices refresh every 30 s while trading is open.
 */
export default function NepseStockScreen() {
  const { symbol: raw } = useLocalSearchParams<{ symbol: string }>();
  const symbol = String(raw ?? "").toUpperCase();
  const { t, digits } = useLocale();
  const colors = useThemeColors();
  const navBottom = useNavBottomPadding(false);
  const [range, setRange] = useState<NepseRange>("1D");
  const page = useNepseStock(symbol, range);
  const day = useMarketDate();
  const q = page.quote;
  const money = (v: number) => digits(nepseNumber(v));
  const up = !q || q.change === 0 ? null : q.change > 0;
  const tone = up === null ? colors.mutedForeground : up ? colors.success : colors.destructive;
  const first = page.chart.values[0];
  const last = page.chart.values.at(-1);
  // The change over the chosen range, as the chart shows it (today's is the quote's own).
  const rangeChange = range !== "1D" && first && last ? last - first : null;
  const stats: [string, string][] = q
    ? [
        [t("market.shares_open"), money(q.open)],
        [t("market.shares_high"), money(q.high)],
        [t("market.shares_low"), money(q.low)],
        [t("market.shares_prev"), money(q.prev_close)],
        ...(page.week52
          ? ([
              [t("market.high_52w"), money(page.week52.high)],
              [t("market.low_52w"), money(page.week52.low)],
            ] as [string, string][])
          : []),
        [t("market.shares_volume"), digits(nepseNumber(q.volume, 0))],
        [t("market.shares_turnover_rs"), money(q.turnover)],
      ]
    : [];

  return (
    <View className="flex-1 bg-background">
      <BackHeader title={symbol} right={<StarButton kind="share" id={symbol} />} />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: PAGE_HORIZONTAL_PADDING,
          paddingTop: space.sm,
          paddingBottom: navBottom + space["2xl"],
          gap: space.lg,
        }}
      >
        <View className="flex-row items-center gap-3">
          <View className="flex-1">
            <Text className="text-base font-semibold text-foreground" numberOfLines={2}>
              {symbol}
              {q?.name ? ` · ${q.name}` : ""}
            </Text>
            <Text className="text-sm text-muted-foreground">{t("market.shares_kicker")}</Text>
          </View>
          <SymbolAvatar label={symbol} size={56} />
        </View>

        {q ? (
          <View className="gap-0.5">
            <Text className="text-5xl font-extrabold tabular-nums text-foreground">{money(q.ltp)}</Text>
            <View className="flex-row flex-wrap items-center gap-x-2">
              <Text className="text-sm tabular-nums text-muted-foreground">
                {digits(`${q.change > 0 ? "+" : ""}${nepseNumber(q.change)}`)}
              </Text>
              <Change up={up} value={q.percent} />
              <Text className="text-sm text-muted-foreground">
                ·{" "}
                {t(page.marketOpen ? "market.shares_live" : "market.shares_closed", {
                  date: page.asOf ? day(page.asOf.slice(0, 10)) : "",
                  time: digits(page.asOf?.slice(11, 16) ?? ""),
                })}
              </Text>
            </View>
            {rangeChange !== null && first ? (
              <View className="flex-row flex-wrap items-center gap-x-2">
                <Text className="text-sm tabular-nums text-muted-foreground">
                  {digits(`${rangeChange > 0 ? "+" : ""}${nepseNumber(rangeChange)}`)}
                </Text>
                <Change up={rangeChange === 0 ? null : rangeChange > 0} value={(rangeChange / first) * 100} />
                <Text className="text-sm text-muted-foreground">· {t(`market.range_past_${range}`)}</Text>
              </View>
            ) : null}
          </View>
        ) : page.loading ? (
          <SkeletonPulse className="h-24 rounded-2xl" />
        ) : (
          <Text className="text-base text-muted-foreground">{t("market.shares_not_traded")}</Text>
        )}

        <View className="gap-3">
          {page.chart.values.length > 1 ? (
            <RateChart
              labels={page.chart.labels.map((l) => digits(l))}
              format={money}
              series={[{ label: symbol, values: page.chart.values, color: tone }]}
              height={240}
            />
          ) : page.loading ? (
            <SkeletonPulse className="h-60 rounded-xl" />
          ) : (
            <Text className="py-16 text-center text-sm text-muted-foreground">
              {t(page.error ? "market.shares_error" : "market.shares_no_chart")}
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
                    numberOfLines={1}
                  >
                    {t(`market.range_${r}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {stats.length ? (
          <MarketSection title={t("market.key_stats")}>
            {stats.map(([label, value]) => (
              <View key={label} className="flex-row items-center justify-between py-2">
                <Text className="text-base text-muted-foreground">{label}</Text>
                <Text className="text-base font-semibold tabular-nums text-foreground">{value}</Text>
              </View>
            ))}
          </MarketSection>
        ) : null}
        <Text className="text-xs text-muted-foreground">{t("market.shares_source")}</Text>
      </ScrollView>
    </View>
  );
}
