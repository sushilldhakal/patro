import { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { NEPSE_PERIODS, nepseCrore, nepseNumber, useNepseMostTraded, type NepsePeriod } from "@vedic-patro/features/home";
import { __iconNode as ListFilterNode } from "lucide-react/dist/esm/icons/list-filter";
import { __iconNode as CalendarNode } from "lucide-react/dist/esm/icons/calendar";
import { LargeTitlePage } from "@/components/market/LargeTitlePage";
import { Change, FilterChip, OptionSheet, QuoteRow } from "@/components/market/MarketParts";
import { RankingPage } from "@/components/market/NepseCards";
import { useLocale } from "@/lib/i18n";

/** NEPSE scrips by rupees or shares traded, over a day to five years. */
export default function NepseMostTradedScreen() {
  const { t, digits } = useLocale();
  const router = useRouter();
  const [by, setBy] = useState<"turnover" | "volume">("turnover");
  const [period, setPeriod] = useState<NepsePeriod>("1D");
  const [sheet, setSheet] = useState<"by" | "period" | null>(null);
  const most = useNepseMostTraded(by, period);
  const sorts = [
    { id: "turnover" as const, label: t("market.by_turnover") },
    { id: "volume" as const, label: t("market.by_volume") },
  ];
  const periods = NEPSE_PERIODS.map((p) => ({ id: p, label: t(`market.period_${p}`) }));
  return (
    <View className="flex-1 bg-background">
      <LargeTitlePage title={t("market.most_traded")} subtitle={t("market.most_traded_note")}>
        <RankingPage
          loading={most.loading}
          empty={!most.list.length}
          chips={
            <>
              <FilterChip icon={ListFilterNode} label={sorts.find((s) => s.id === by)!.label} onPress={() => setSheet("by")} />
              <FilterChip icon={CalendarNode} label={t(`market.period_${period}`)} onPress={() => setSheet("period")} />
            </>
          }
        >
          {most.list.slice(0, 50).map(({ quote: s, turnover, volume, percent }, i) => (
            <QuoteRow
              key={s.symbol}
              avatar={s.symbol}
              title={`${digits(i + 1)}. ${s.name ?? s.symbol}`}
              subtitle={`${s.symbol} · ${
                by === "turnover"
                  ? t("market.shares_turnover_short", { value: digits(nepseCrore(turnover)) })
                  : t("market.shares_count", { value: digits(nepseNumber(volume, 0)) })
              }`}
              value={digits(nepseNumber(s.ltp))}
              change={<Change up={percent === 0 ? null : percent > 0} value={percent} />}
              onPress={() => router.push(`/nepse/${s.symbol}`)}
            />
          ))}
        </RankingPage>
      </LargeTitlePage>
      <OptionSheet open={sheet === "by"} title={t("market.rank_by")} value={by} options={sorts} onChange={setBy} onClose={() => setSheet(null)} />
      <OptionSheet open={sheet === "period"} title={t("market.timeframe")} value={period} options={periods} onChange={setPeriod} onClose={() => setSheet(null)} />
    </View>
  );
}
