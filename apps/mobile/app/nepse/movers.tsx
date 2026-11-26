import { useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { NEPSE_PERIODS, nepseNumber, useNepseMovers, type NepsePeriod } from "@vedic-patro/features/home";
import { __iconNode as ListFilterNode } from "lucide-react/dist/esm/icons/list-filter";
import { __iconNode as CalendarNode } from "lucide-react/dist/esm/icons/calendar";
import { LargeTitlePage } from "@/components/market/LargeTitlePage";
import { Change, FilterChip, OptionSheet, QuoteRow } from "@/components/market/MarketParts";
import { RankingPage } from "@/components/market/NepseCards";
import { useLocale } from "@/lib/i18n";

/** Every NEPSE gainer or loser over a day to five years, among scrips that traded enough to count. */
export default function NepseMoversScreen() {
  const params = useLocalSearchParams<{ direction?: string }>();
  const { t, digits } = useLocale();
  const router = useRouter();
  const [direction, setDirection] = useState<"up" | "down">(params.direction === "down" ? "down" : "up");
  const [period, setPeriod] = useState<NepsePeriod>("1D");
  const [sheet, setSheet] = useState<"direction" | "period" | null>(null);
  const movers = useNepseMovers(direction, period);
  const directions = [
    { id: "up" as const, label: t("market.top_gainers") },
    { id: "down" as const, label: t("market.top_losers") },
  ];
  const periods = NEPSE_PERIODS.map((p) => ({ id: p, label: t(`market.period_${p}`) }));
  return (
    <View className="flex-1 bg-background">
      <LargeTitlePage title={t("market.top_movers_title")} subtitle={t("market.top_movers_note")}>
        <RankingPage
          loading={movers.loading}
          empty={!movers.list.length}
          chips={
            <>
              <FilterChip icon={ListFilterNode} label={directions.find((d) => d.id === direction)!.label} onPress={() => setSheet("direction")} />
              <FilterChip icon={CalendarNode} label={t(`market.period_${period}`)} onPress={() => setSheet("period")} />
            </>
          }
        >
          {movers.list.slice(0, 50).map(({ quote: s, percent }) => (
            <QuoteRow
              key={s.symbol}
              avatar={s.symbol}
              title={s.name ?? s.symbol}
              subtitle={s.symbol}
              value={digits(nepseNumber(s.ltp))}
              change={<Change up={percent > 0} value={percent} />}
              onPress={() => router.push(`/nepse/${s.symbol}`)}
            />
          ))}
        </RankingPage>
      </LargeTitlePage>
      <OptionSheet open={sheet === "direction"} title={t("market.filter")} value={direction} options={directions} onChange={setDirection} onClose={() => setSheet(null)} />
      <OptionSheet open={sheet === "period"} title={t("market.timeframe")} value={period} options={periods} onChange={setPeriod} onClose={() => setSheet(null)} />
    </View>
  );
}
