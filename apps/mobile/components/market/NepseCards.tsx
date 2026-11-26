import { useState, type ReactNode } from "react";
import { Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { withAlpha } from "@vedic-patro/design-tokens";
import { SLIDER_TINT, TintCard } from "@/components/home/TintCard";
import { SLIDER_CARD_HEIGHT, SLIDER_GAP, sliderCardWidth } from "@/components/home/UpcomingFestivalsSlider";
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

/**
 * A home-style row, like the market slider: the title and "सबै हेर्नुहोस् ›" on one line, then cards
 * to swipe that start on the page's card line and scroll out to the screen edge.
 */
function NepseSlider({
  title,
  onViewAll,
  horizontalInset,
  above,
  children,
}: {
  title: string;
  onViewAll: () => void;
  horizontalInset: number;
  above?: ReactNode;
  children: ReactNode;
}) {
  const { t } = useLocale();
  const colors = useThemeColors();
  return (
    <View>
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-lg font-bold text-foreground">{title}</Text>
        <Pressable onPress={onViewAll} accessibilityRole="button" hitSlop={8}>
          <Text className="text-base font-semibold" style={{ color: colors.secondary }}>
            {t("common.view_all")} ›
          </Text>
        </Pressable>
      </View>
      {above}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -horizontalInset }}
        contentContainerStyle={{ paddingHorizontal: horizontalInset, gap: SLIDER_GAP }}
      >
        {children}
      </ScrollView>
    </View>
  );
}

/** One scrip on a slider card: badge, symbol, price, change, and an optional last line. */
function ScripCard({
  symbol,
  name,
  ltp,
  change,
  foot,
  rank,
  tint,
  width,
}: {
  symbol: string;
  name?: string | null;
  ltp: number;
  change: ReactNode;
  foot?: string;
  rank?: string;
  tint: string;
  width: number;
}) {
  const router = useRouter();
  const colors = useThemeColors();
  const { digits } = useLocale();
  return (
    <TintCard tint={tint} width={width} minHeight={SLIDER_CARD_HEIGHT} onPress={() => router.push(`/nepse/${symbol}`)} accessibilityLabel={name ?? symbol}>
      {rank ? (
        <Text className="absolute -top-1 right-2 text-5xl font-extrabold" style={{ color: withAlpha(colors.foreground, 0.08) }}>
          {rank}
        </Text>
      ) : null}
      <SymbolAvatar label={symbol} size={36} />
      <Text className="mt-2 text-base font-extrabold text-foreground" numberOfLines={1}>
        {symbol}
      </Text>
      {name ? (
        <Text className="text-xs text-muted-foreground" numberOfLines={1}>
          {name}
        </Text>
      ) : null}
      <View className="mt-auto">
        <Text className="text-base font-bold tabular-nums text-foreground">{digits(nepseNumber(ltp))}</Text>
        {change}
        {foot ? (
          <Text className="text-xs text-muted-foreground" numberOfLines={1}>
            {foot}
          </Text>
        ) : null}
      </View>
    </TintCard>
  );
}

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
      {/* Two rows of four narrow columns spread edge to edge, so the badges span the switch's width. */}
      {[0, 4].map((from) => (
        <View key={from} className="flex-row justify-between">
          {movers.list.slice(from, from + 4).map(({ quote: s, percent }) => (
            <Pressable
              key={s.symbol}
              onPress={() => router.push(`/nepse/${s.symbol}`)}
              accessibilityRole="button"
              accessibilityLabel={`${s.symbol} ${percent.toFixed(2)}%`}
              className="w-16 items-center gap-0.5 py-1 active:opacity-70"
            >
              <SymbolAvatar label={s.symbol} size={44} />
              <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
                {s.symbol}
              </Text>
              <Change up={percent > 0} value={percent} size="xs" />
            </Pressable>
          ))}
        </View>
      ))}
    </MarketSection>
  );
}

/** The day's ten most traded scrips by rupees, as cards to swipe; "view all" opens the full ranking. */
export function MostTradedCard({ horizontalInset = 0 }: { horizontalInset?: number }) {
  const { t, digits } = useLocale();
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = sliderCardWidth(windowWidth, horizontalInset);
  const most = useNepseMostTraded("turnover", "1D");
  if (!most.live.data) return null;
  return (
    <NepseSlider title={t("market.most_traded")} onViewAll={() => router.push("/nepse/most-traded")} horizontalInset={horizontalInset}>
      {most.list.slice(0, 10).map(({ quote: s, turnover }, i) => (
        <ScripCard
          key={s.symbol}
          symbol={s.symbol}
          name={s.name}
          ltp={s.ltp}
          rank={digits(i + 1)}
          change={<Change up={s.change === 0 ? null : s.change > 0} value={s.percent} />}
          foot={t("market.shares_turnover_short", { value: digits(nepseCrore(turnover)) })}
          tint={SLIDER_TINT.news}
          width={cardWidth}
        />
      ))}
    </NepseSlider>
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
      <View className="rounded-3xl border border-border bg-card px-3 py-1">
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
