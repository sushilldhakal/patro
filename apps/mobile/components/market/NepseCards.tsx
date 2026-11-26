import { useState, type ReactNode } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { space, withAlpha } from "@vedic-patro/design-tokens";
import {
  nepseCrore,
  nepseNumber,
  useForexRates,
  useMetalPrices,
  useNepseLive,
  useNepseMostTraded,
  useNepseMovers,
} from "@vedic-patro/features/home";
import { Change, MarketSection, PillSwitch, QuoteRow, SymbolAvatar } from "@/components/market/MarketParts";
import { Text } from "@/components/ui/Text";
import { useLocale } from "@/lib/i18n";
import { useThemeColors } from "@/lib/theme-context";
import { useWatchlistAll } from "@/lib/watchlist";

/** Today's top gainers or losers as a 4 × 2 grid of badges; the title opens the full ranking. */
export function TopMoversCard() {
  const { t } = useLocale();
  const router = useRouter();
  const [direction, setDirection] = useState<"up" | "down">("up");
  const movers = useNepseMovers(direction, "1D");
  if (!movers.live.data) return null;
  return (
    <MarketSection title={t("market.top_movers")} onPress={() => router.push(`/nepse/movers?direction=${direction}`)}>
      <PillSwitch
        value={direction}
        options={[
          { id: "up", label: t("market.top_gainers") },
          { id: "down", label: t("market.top_losers") },
        ]}
        onChange={setDirection}
      />
      <View className="flex-row flex-wrap pt-2">
        {movers.list.slice(0, 8).map(({ quote: s, percent }) => (
          <Pressable
            key={s.symbol}
            onPress={() => router.push(`/nepse/${s.symbol}`)}
            accessibilityRole="button"
            accessibilityLabel={`${s.symbol} ${percent.toFixed(2)}%`}
            className="w-1/4 items-center gap-1 py-2 active:opacity-70"
          >
            <SymbolAvatar label={s.symbol} size={56} />
            <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
              {s.symbol}
            </Text>
            <Change up={percent > 0} value={percent} size="xs" />
          </Pressable>
        ))}
      </View>
    </MarketSection>
  );
}

/** The day's ten most traded scrips by rupees, as cards to swipe; the title opens the full ranking. */
export function MostTradedCard() {
  const { t, digits } = useLocale();
  const router = useRouter();
  const colors = useThemeColors();
  const most = useNepseMostTraded("turnover", "1D");
  if (!most.live.data) return null;
  return (
    <MarketSection title={t("market.most_traded")} onPress={() => router.push("/nepse/most-traded")}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.md }}>
        {most.list.slice(0, 10).map(({ quote: s, turnover }, i) => (
          <Pressable
            key={s.symbol}
            onPress={() => router.push(`/nepse/${s.symbol}`)}
            accessibilityRole="button"
            className="w-44 overflow-hidden rounded-3xl border border-border bg-background p-4 active:opacity-70"
          >
            <Text className="absolute -top-2 right-2 text-7xl font-extrabold" style={{ color: withAlpha(colors.foreground, 0.08) }}>
              {digits(i + 1)}
            </Text>
            <SymbolAvatar label={s.symbol} />
            <Text className="mt-6 text-base font-bold text-foreground" numberOfLines={1}>
              {s.name ?? s.symbol}
            </Text>
            <Text className="text-sm text-muted-foreground">{s.symbol}</Text>
            <Text className="mt-1 text-base font-semibold tabular-nums text-foreground">{digits(nepseNumber(s.ltp))}</Text>
            <Change up={s.change === 0 ? null : s.change > 0} value={s.percent} />
            <Text className="mt-1 text-xs text-muted-foreground" numberOfLines={1}>
              {t("market.shares_turnover_short", { value: digits(nepseCrore(turnover)) })}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </MarketSection>
  );
}

/** One starred item ready to draw: who it is, its price and change, and its page. */
export type WatchRow = {
  entry: string;
  avatar: string;
  title: string;
  subtitle: string;
  value: string;
  up: boolean | null;
  /** Percent for scrips; a rupee change for currencies and metals. */
  percent?: number;
  text?: string;
  /** For sorting by change: percent, or the signed rupee change. */
  move: number;
  href: Parameters<ReturnType<typeof useRouter>["push"]>[0];
};

/** Every starred scrip, currency and metal in the order starred, with today's numbers. */
export function useWatchRows(): WatchRow[] {
  const { t, digits } = useLocale();
  const all = useWatchlistAll();
  const live = useNepseLive();
  const forex = useForexRates();
  const metals = useMetalPrices();
  return all.flatMap((entry): WatchRow[] => {
    const [kind, id] = entry.split(":") as [string, string];
    if (kind === "share") {
      const s = live.data?.stocks.find((x) => x.symbol === id);
      return s
        ? [{
            entry, avatar: s.symbol, title: s.name ?? s.symbol, subtitle: `${s.symbol} · ${t("market.shares_kicker")}`,
            value: digits(nepseNumber(s.ltp)), up: s.change === 0 ? null : s.change > 0, percent: s.percent, move: s.percent,
            href: `/nepse/${s.symbol}`,
          }]
        : [];
    }
    if (kind === "forex") {
      const c = forex.cards.find((x) => x.code === id);
      return c
        ? [{
            entry, avatar: c.code, title: c.name, subtitle: `${c.code} · ${c.perUnit}`, value: c.sell,
            up: c.change ? c.rising : null, text: c.change ?? "", move: c.change ? (c.rising ? 1 : -1) * Number.parseFloat(c.change) : 0,
            href: { pathname: "/forex/[code]", params: { code: c.code } },
          }]
        : [];
    }
    const m = metals.cards.find((x) => x.id === id);
    return m
      ? [{
          entry, avatar: m.name, title: m.name, subtitle: metals.copy.tola, value: m.tola,
          up: m.change ? m.rising : null, text: m.change ?? "", move: 0,
          href: { pathname: "/metals/[metal]", params: { metal: m.id } },
        }]
      : [];
  });
}

/** One starred row as a quote row. */
export function WatchQuoteRow({ row }: { row: WatchRow }) {
  const router = useRouter();
  return (
    <QuoteRow
      avatar={row.avatar}
      title={row.title}
      subtitle={row.subtitle}
      value={row.value}
      change={<Change up={row.up} value={row.percent} text={row.text} />}
      onPress={() => router.push(row.href)}
    />
  );
}

/**
 * Everything the reader starred (scrips, currencies, gold and silver) on the home page, as on a
 * trading app's home: the first five, and the title opens the whole watchlist. With nothing starred
 * it offers to open the market page to add some.
 */
export function WatchlistCard() {
  const { t } = useLocale();
  const router = useRouter();
  const rows = useWatchRows();
  return (
    <MarketSection title={t("market.watchlist")} onPress={() => router.push("/watchlist" as never)}>
      {rows.length ? (
        <>
          {rows.slice(0, 5).map((r) => (
            <WatchQuoteRow key={r.entry} row={r} />
          ))}
          {rows.length > 5 ? (
            <Pressable onPress={() => router.push("/watchlist" as never)} accessibilityRole="button" className="items-center py-2 active:opacity-70">
              <Text className="text-base font-semibold text-foreground">{t("market.see_all")}</Text>
            </Pressable>
          ) : null}
        </>
      ) : (
        <View className="items-start gap-3 py-1">
          <Text className="text-sm text-muted-foreground">{t("market.watch_home_empty")}</Text>
          <Pressable
            onPress={() => router.push("/market?tab=shares")}
            accessibilityRole="button"
            className="rounded-full bg-secondary px-5 py-2.5 active:opacity-80"
          >
            <Text className="text-base font-semibold text-secondary-foreground">{t("market.watch_add_button")}</Text>
          </Pressable>
        </View>
      )}
    </MarketSection>
  );
}

/** A full ranking page's body (under its large title): filter chips, then the rows. Top movers and most traded share it. */
export function RankingPage({
  chips,
  loading,
  empty,
  children,
}: {
  chips: ReactNode;
  loading: boolean;
  empty: boolean;
  children: ReactNode;
}) {
  const { t } = useLocale();
  return (
    <>
      <View className="flex-row flex-wrap gap-2">{chips}</View>
      <View className="rounded-3xl border border-border bg-card px-4 py-1">
        {loading ? (
          <Text className="py-10 text-center text-sm text-muted-foreground">{t("market.loading")}</Text>
        ) : empty ? (
          <Text className="py-10 text-center text-sm text-muted-foreground">{t("market.ranking_empty")}</Text>
        ) : (
          children
        )}
      </View>
      <Text className="text-xs text-muted-foreground">{t("market.shares_source")}</Text>
    </>
  );
}
