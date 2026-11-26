import { ScrollView, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { space } from "@vedic-patro/design-tokens";
import { useForexDetail } from "@vedic-patro/features/home";
import { BackHeader } from "@/components/home/BackHeader";
import { useNavBottomPadding, PAGE_HORIZONTAL_PADDING } from "@/lib/mobile-nav";
import { RateChart } from "@/components/home/RateChart";
import { RateTable } from "@/components/home/RateTable";
import { StarButton } from "@/components/market/MarketParts";
import { SkeletonPulse } from "@/components/ui/SkeletonPulse";
import { Text } from "@/components/ui/Text";
import { useThemeColors } from "@/lib/theme-context";

/** One currency: today's NRB buying and selling rate, then the last 30 days. */
export default function ForexCurrencyScreen() {
  const { code: raw } = useLocalSearchParams<{ code: string }>();
  const code = String(raw ?? "").toUpperCase();
  const page = useForexDetail(code);
  const colors = useThemeColors();
  const navBottom = useNavBottomPadding(false);
  const title = page.card ? `${page.card.code} · ${page.card.name}` : code;
  return (
    <View className="flex-1 bg-background">
      <BackHeader
        title={title}
        subtitle={page.card?.perUnit ?? page.copy.subtitle}
        right={<StarButton kind="forex" id={code} />}
      />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: PAGE_HORIZONTAL_PADDING,
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
            <View className="flex-row gap-3">
              {[
                [page.copy.buy, page.card.buy],
                [page.copy.sell, page.card.sell],
              ].map(([label, value]) => (
                <View
                  key={label}
                  className="flex-1 rounded-2xl border border-border bg-card p-3"
                >
                  <Text className="text-xs text-muted-foreground">{label}</Text>
                  <Text className="text-xl font-bold tabular-nums text-foreground">
                    {value}
                  </Text>
                  {label === page.copy.sell && page.card?.change ? (
                    <Text
                      className="text-sm font-semibold tabular-nums"
                      style={{ color: page.card.rising ? colors.success : colors.destructive }}
                    >
                      {page.card.rising ? "▲" : "▼"} {page.card.change}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
            <Text className="text-xs text-muted-foreground">
              {page.copy.source}
            </Text>
            <Text className="text-base font-bold text-foreground">
              {page.copy.history}
            </Text>
            <View className="rounded-2xl border border-border bg-card p-3">
              <RateChart
                labels={page.chart.labels}
                format={page.chart.format}
                series={page.chart.series.map((s) => ({
                  label: s.label,
                  values: s.values,
                  color: s.key === "buy" ? colors.secondary : colors.primary,
                }))}
              />
            </View>
            <RateTable
              head={[page.copy.date, page.copy.buy, page.copy.sell]}
              rows={page.rows.map((r) => ({
                key: r.date,
                cells: [r.date, r.buy, r.sell],
                change: r.change ? { text: r.change, up: r.rising } : null,
              }))}
            />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
