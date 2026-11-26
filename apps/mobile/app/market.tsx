import { useState, type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  convertForex,
  lakhGrouped,
  metalCost,
  nepseCrore,
  nepseNumber,
  useNepseLive,
  useMarketDate,
  useForexRates,
  useMetalPrices,
  type ForexSide,
  type MetalId,
  type MetalUnit,
} from "@vedic-patro/features/home";
import type { NepseQuote } from "@vedic-patro/api-client";
import { brand, space, withAlpha } from "@vedic-patro/design-tokens";
import { Sheet } from "@vedic-patro/ui";
import { __iconNode as ChevronLeftNode } from "lucide-react/dist/esm/icons/chevron-left";
import { __iconNode as GemNode } from "lucide-react/dist/esm/icons/gem";
import { __iconNode as RepeatNode } from "lucide-react/dist/esm/icons/repeat";
import { __iconNode as ArrowLeftRightNode } from "lucide-react/dist/esm/icons/arrow-left-right";
import { __iconNode as ChevronDownNode } from "lucide-react/dist/esm/icons/chevron-down";
import { __iconNode as ClockNode } from "lucide-react/dist/esm/icons/clock";
import { __iconNode as TrendingUpNode } from "lucide-react/dist/esm/icons/trending-up";
import { __iconNode as SearchNode } from "lucide-react/dist/esm/icons/search";
import {
  LucideNative,
  type LucideIconNode,
} from "@/components/icons/LucideNative";
import { MetalPriceLines } from "@/components/home/MarketCards";
import { RateTable } from "@/components/home/RateTable";
import { SLIDER_TINT, metalTint } from "@/components/home/TintCard";
import { SkeletonPulse } from "@/components/ui/SkeletonPulse";
import { Change, MarketSection, QuoteRow, SearchField } from "@/components/market/MarketParts";
import { MostTradedCard, TopMoversCard } from "@/components/market/NepseCards";
import { useWatchlist, type WatchKind } from "@/lib/watchlist";
import { Text } from "@/components/ui/Text";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useNavBottomPadding, PAGE_HORIZONTAL_PADDING } from "@/lib/mobile-nav";
import { useThemeColors } from "@/lib/theme-context";

type Tab = "metals" | "forex" | "shares";

/**
 * The market: gold and silver, and foreign currency, as two tabs under a sticky header (back,
 * title, tabs). Each tab has a hero with the day's source, a calculator, and the day's rates.
 */
export default function MarketScreen() {
  const { t } = useLocale();
  const router = useRouter();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const navBottom = useNavBottomPadding(false);
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>(
    params.tab === "forex" || params.tab === "shares" ? params.tab : "metals",
  );
  const back = () => (router.canGoBack() ? router.back() : router.replace("/"));

  const tabs: { id: Tab; label: string; icon: LucideIconNode }[] = [
    { id: "metals", label: t("market.tab_metals"), icon: GemNode },
    { id: "forex", label: t("market.tab_forex"), icon: RepeatNode },
    { id: "shares", label: t("market.tab_shares"), icon: TrendingUpNode },
  ];

  return (
    <View className="flex-1 bg-background">
      {/* Outside the scroll, so the page never scrolls behind the status bar or the tabs. */}
      <View
        className="gap-3 border-b border-border bg-background px-2.5 pb-3"
        style={{ paddingTop: insets.top + 4 }}
      >
        <View className="h-11 flex-row items-center justify-center">
          <Pressable
            onPress={back}
            accessibilityRole="button"
            accessibilityLabel={t("market.back")}
            hitSlop={10}
            className="absolute left-0 size-11 items-center justify-center rounded-full border border-border bg-card active:opacity-70"
          >
            <LucideNative
              node={ChevronLeftNode}
              size={28}
              color={colors.foreground}
              strokeWidth={2.2}
            />
          </Pressable>
          <Text className="text-xl font-bold text-foreground">
            {t("market.title")}
          </Text>
        </View>
        <View className="flex-row rounded-full border border-border bg-card p-1">
          {tabs.map((x) => {
            const on = x.id === tab;
            return (
              <Pressable
                key={x.id}
                onPress={() => setTab(x.id)}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-full px-1 py-2.5 ${on ? "bg-secondary" : ""}`}
              >
                <LucideNative
                  node={x.icon}
                  size={16}
                  color={on ? brand.offWhite : colors.mutedForeground}
                  strokeWidth={2}
                />
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                  className={`shrink text-sm font-semibold ${on ? "text-secondary-foreground" : "text-muted-foreground"}`}
                >
                  {x.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "android" ? "height" : undefined}>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{
          paddingTop: space.lg,
          paddingBottom: navBottom + space["2xl"],
        }}
      >
        <View className="gap-4 px-2.5">
          {tab === "metals" ? (
            <MetalsTab />
          ) : tab === "forex" ? (
            <ForexTab />
          ) : (
            <SharesTab />
          )}
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/** The tab's opening card on a wash of its colour: kicker, title, a line about the source, the date. */
function Hero({
  tint,
  icon,
  kicker,
  title,
  body,
  chip,
}: {
  tint: string;
  icon: LucideIconNode;
  kicker: string;
  title: string;
  body: string;
  chip: string;
}) {
  const colors = useThemeColors();
  const ne = nepaliTextStyle();
  return (
    <View
      className="overflow-hidden rounded-3xl border p-4"
      style={{ borderColor: withAlpha(tint, 0.35) }}
    >
      <LinearGradient
        colors={[withAlpha(tint, 0.32), withAlpha(tint, 0.06)]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View className="flex-row items-center gap-2">
        <LucideNative
          node={icon}
          size={18}
          color={colors.mutedForeground}
          strokeWidth={2}
        />
        <Text className="text-sm font-semibold text-muted-foreground">
          {kicker}
        </Text>
      </View>
      <Text className="mt-2 text-2xl font-extrabold text-foreground" style={ne}>
        {title}
      </Text>
      <Text
        className="mt-1 text-base leading-relaxed text-muted-foreground"
        style={ne}
      >
        {body}
      </Text>
      {chip ? (
        <View className="mt-3 flex-row items-center gap-2 self-start rounded-full bg-muted px-3 py-1.5">
          <LucideNative
            node={ClockNode}
            size={16}
            color={colors.mutedForeground}
            strokeWidth={2}
          />
          <Text className="text-sm text-foreground">{chip}</Text>
        </View>
      ) : null}
    </View>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  const colors = useThemeColors();
  return (
    <View className="gap-3 rounded-3xl border border-border bg-card p-4">
      <View className="flex-row items-center gap-2">
        <View
          className="h-5 w-1 rounded-full"
          style={{ backgroundColor: colors.secondary }}
        />
        <Text className="text-lg font-bold text-foreground">{title}</Text>
      </View>
      {children}
    </View>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <View className="flex-row rounded-full border border-border bg-background p-1">
      {options.map((o) => {
        const on = o.id === value;
        return (
          <Pressable
            key={o.id}
            onPress={() => onChange(o.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            className={`flex-1 items-center rounded-full py-2 ${on ? "bg-secondary" : ""}`}
          >
            <Text
              className={`text-base font-semibold ${on ? "text-secondary-foreground" : "text-muted-foreground"}`}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function AmountInput({
  value,
  onChange,
  prefix,
}: {
  value: string;
  onChange: (v: string) => void;
  prefix: string;
}) {
  const colors = useThemeColors();
  return (
    <View className="flex-row items-center gap-2 rounded-2xl border border-border bg-background px-4 py-3">
      <Text className="text-xl font-bold text-muted-foreground">{prefix}</Text>
      <TextInput
        value={value}
        onChangeText={(v) => onChange(v.replace(/[^0-9.]/g, ""))}
        keyboardType="decimal-pad"
        className="flex-1 text-xl font-bold text-foreground"
        placeholderTextColor={colors.mutedForeground}
        placeholder="0"
      />
    </View>
  );
}

function ResultBox({
  label,
  value,
  unit,
  line,
}: {
  label: string;
  value: string;
  unit: string;
  line: string;
}) {
  const colors = useThemeColors();
  return (
    <View
      className="gap-1 rounded-2xl border p-4"
      style={{
        borderColor: withAlpha(colors.secondary, 0.4),
        backgroundColor: withAlpha(colors.secondary, 0.08),
      }}
    >
      <Text
        className="text-sm font-semibold"
        style={{ color: colors.secondary }}
      >
        {label}
      </Text>
      <View className="flex-row flex-wrap items-baseline gap-2">
        <Text className="text-4xl font-extrabold tabular-nums text-foreground">
          {value}
        </Text>
        <Text className="text-base font-semibold text-muted-foreground">
          {unit}
        </Text>
      </View>
      {line ? (
        <Text className="text-sm text-muted-foreground">{line}</Text>
      ) : null}
    </View>
  );
}

/** 148.66 → "१४८.६६", 160000 → "१,६०,०००.००": lakh grouping, two decimals. */
function useMoney() {
  const { digits } = useLocale();
  return (v: number) => {
    const [whole, frac] = Math.abs(v).toFixed(2).split(".");
    return digits(`${v < 0 ? "-" : ""}${lakhGrouped(Number(whole))}.${frac}`);
  };
}

function MetalsTab() {
  const { t, digits } = useLocale();
  const router = useRouter();
  const metals = useMetalPrices();
  const money = useMoney();
  const [metal, setMetal] = useState<MetalId>("gold");
  const [unit, setUnit] = useState<MetalUnit>("tola");
  const [qty, setQty] = useState("1");
  const card = metals.cards.find((c) => c.id === metal) ?? null;
  const cost = card ? metalCost(Number(qty || 0), unit, card.price) : null;
  const unitLabel = (u: MetalUnit) => t(`market.unit.${u}`);

  return (
    <>
      <Hero
        tint={SLIDER_TINT.gold}
        icon={GemNode}
        kicker={t("market.metal_kicker")}
        title={t("market.metal_hero")}
        body={t("market.metal_hero_body")}
        chip={
          metals.cards[0]
            ? t("market.date_chip", {
                date: metals.cards[0].date,
                source: "FENEGOSIDA",
              })
            : ""
        }
      />
      {metals.status === "loading" ? (
        <SkeletonPulse className="h-48 rounded-3xl" />
      ) : null}
      <WatchlistRows
        kind="metal"
        rows={metals.cards.map((c) => ({
          id: c.id,
          avatar: c.name,
          title: c.name,
          subtitle: metals.copy.tola,
          value: c.tola,
          change: c.change ? { text: c.change, up: c.rising } : null,
          onPress: () => router.push({ pathname: "/metals/[metal]", params: { metal: c.id } }),
        }))}
      />
      {metals.cards.length ? (
        <Panel title={t("market.today_rates")}>
          {metals.cards.map((c) => (
            <Pressable
              key={c.id}
              onPress={() =>
                router.push({
                  pathname: "/metals/[metal]",
                  params: { metal: c.id },
                })
              }
              accessibilityRole="button"
              className="rounded-2xl border p-3 active:opacity-70"
              style={{
                borderColor: withAlpha(metalTint(c.id), 0.4),
              }}
            >
              <Text className="text-lg font-bold text-foreground">
                {c.name} ›
              </Text>
              <MetalPriceLines
                card={c}
                tola={metals.copy.tola}
                tenGram={metals.copy.tenGram}
                large
              />
            </Pressable>
          ))}
          <Text className="text-xs text-muted-foreground">
            {t("metals.gold22_note")}
          </Text>
        </Panel>
      ) : null}
      {card ? (
        <Panel title={t("market.calculator")}>
          <Segmented<MetalId>
            value={metal}
            onChange={setMetal}
            options={metals.cards.map((c) => ({ id: c.id, label: c.name }))}
          />
          <Text className="text-sm font-medium text-muted-foreground">
            {t("market.weight")}
          </Text>
          <AmountInput value={qty} onChange={setQty} prefix={unitLabel(unit)} />
          <Segmented<MetalUnit>
            value={unit}
            onChange={setUnit}
            options={(["tola", "aana", "gram"] as const).map((u) => ({
              id: u,
              label: unitLabel(u),
            }))}
          />
          <ResultBox
            label={t("market.result")}
            value={
              cost === null ? "—" : t("metals.amount", { amount: money(cost) })
            }
            unit="NPR"
            line={`${digits(qty || "0")} ${unitLabel(unit)} ${card.name} · ${card.date}`}
          />
        </Panel>
      ) : null}
    </>
  );
}

function ForexTab() {
  const { t, digits } = useLocale();
  const router = useRouter();
  const colors = useThemeColors();
  const forex = useForexRates();
  const money = useMoney();
  const [amount, setAmount] = useState("1");
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState("NPR");
  const [side, setSide] = useState<ForexSide>("mid");
  const [picking, setPicking] = useState<"from" | "to" | null>(null);
  const value = convertForex(Number(amount || 0), from, to, side, forex.cards);
  const date = forex.copy.source.split("·").pop()?.trim() ?? "";
  const options = [
    { code: "NPR", name: t("market.npr") },
    ...forex.cards.map((c) => ({ code: c.code, name: c.name })),
  ];

  return (
    <>
      <Hero
        tint={SLIDER_TINT.forex}
        icon={RepeatNode}
        kicker={t("market.forex_kicker")}
        title={t("market.forex_hero")}
        body={t("market.forex_hero_body")}
        chip={date ? t("market.date_chip", { date, source: "NRB" }) : ""}
      />
      {forex.status === "loading" ? (
        <SkeletonPulse className="h-96 rounded-3xl" />
      ) : null}
      <WatchlistRows
        kind="forex"
        rows={forex.cards.map((c) => ({
          id: c.code,
          avatar: c.code,
          title: `${c.code} · ${c.name}`,
          subtitle: c.perUnit,
          value: c.sell,
          change: c.change ? { text: c.change, up: c.rising } : null,
          onPress: () => router.push({ pathname: "/forex/[code]", params: { code: c.code } }),
        }))}
      />
      {forex.cards.length ? (
        <Panel title={t("market.converter")}>
          <Text className="text-sm font-medium text-muted-foreground">
            {t("market.amount")}
          </Text>
          <AmountInput value={amount} onChange={setAmount} prefix={from} />
          <View className="flex-row items-end gap-3">
            <CurrencyButton
              label={t("market.from")}
              code={from}
              onPress={() => setPicking("from")}
            />
            <Pressable
              onPress={() => {
                setFrom(to);
                setTo(from);
              }}
              accessibilityRole="button"
              accessibilityLabel={t("market.swap")}
              className="size-12 items-center justify-center rounded-full bg-secondary active:opacity-80"
            >
              <LucideNative
                node={ArrowLeftRightNode}
                size={22}
                color={brand.offWhite}
                strokeWidth={2.2}
              />
            </Pressable>
            <CurrencyButton
              label={t("market.to")}
              code={to}
              onPress={() => setPicking("to")}
            />
          </View>
          <Segmented<ForexSide>
            value={side}
            onChange={setSide}
            options={[
              { id: "buy", label: forex.copy.buy },
              { id: "sell", label: forex.copy.sell },
              { id: "mid", label: t("market.mid") },
            ]}
          />
          <ResultBox
            label={t("market.result")}
            value={value === null ? "—" : money(value)}
            unit={to}
            line={
              value === null
                ? ""
                : t("market.rate_line", {
                    amount: digits(amount || "0"),
                    from,
                    value: money(value),
                    to,
                    date,
                  })
            }
          />
        </Panel>
      ) : null}
      {forex.cards.length ? (
        <Panel title={t("market.rate_table")}>
          <RateTable
            head={[forex.copy.currency, forex.copy.buy, forex.copy.sell]}
            rows={forex.cards.map((c) => ({
              key: c.code,
              cells: [`${c.code} · ${c.name}`, c.buy, c.sell],
              sub: c.perUnit,
              change: c.change ? { text: c.change, up: c.rising } : null,
            }))}
            onPressRow={(code) =>
              router.push({ pathname: "/forex/[code]", params: { code } })
            }
          />
        </Panel>
      ) : null}
      <Sheet
        open={picking !== null}
        onClose={() => setPicking(null)}
        title={t("market.choose_currency")}
        closeLabel={t("common.close")}
      >
        <ScrollView style={{ maxHeight: 480 }}>
          {options.map((o) => (
            <Pressable
              key={o.code}
              onPress={() => {
                if (picking === "from") setFrom(o.code);
                else setTo(o.code);
                setPicking(null);
              }}
              accessibilityRole="button"
              className="flex-row items-center gap-3 border-b border-border py-3 active:opacity-70"
            >
              <Text className="w-14 text-base font-bold text-foreground">
                {o.code}
              </Text>
              <Text
                className="flex-1 text-base text-muted-foreground"
                numberOfLines={1}
              >
                {o.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </Sheet>
    </>
  );
}

function CurrencyButton({
  label,
  code,
  onPress,
}: {
  label: string;
  code: string;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  return (
    <View className="flex-1 gap-1">
      <Text className="text-sm font-medium text-muted-foreground">{label}</Text>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${label} ${code}`}
        className="flex-row items-center justify-between rounded-2xl border border-border bg-background px-4 py-3 active:opacity-70"
      >
        <Text className="text-xl font-bold text-foreground">{code}</Text>
        <LucideNative
          node={ChevronDownNode}
          size={20}
          color={colors.mutedForeground}
          strokeWidth={2}
        />
      </Pressable>
    </View>
  );
}

/** The starred rows of one kind, in the order they were starred; a hint when there are none. */
function WatchlistRows({
  kind,
  rows,
}: {
  kind: WatchKind;
  rows: { id: string; avatar: string; title: string; subtitle: string; value: string; change: { text: string; up: boolean } | null; onPress: () => void }[];
}) {
  const { t } = useLocale();
  const watch = useWatchlist(kind);
  const starred = watch.ids.flatMap((id) => rows.filter((r) => r.id === id));
  return (
    <MarketSection title={t("market.watchlist")}>
      {starred.length ? (
        starred.map((r) => (
          <QuoteRow
            key={r.id}
            avatar={r.avatar}
            title={r.title}
            subtitle={r.subtitle}
            value={r.value}
            change={r.change ? <Change up={r.change.up} text={r.change.text} /> : <Change up={null} text="" />}
            onPress={r.onPress}
          />
        ))
      ) : (
        <Text className="py-2 text-sm text-muted-foreground">{t("market.watch_empty")}</Text>
      )}
    </MarketSection>
  );
}

/** Rows shown before "show all", so the first paint stays light. */
const SHARES_FIRST = 30;

/**
 * NEPSE, laid out like a trading app's market page: the day's totals, the reader's starred scrips,
 * today's top gainers and losers, the most traded, then every traded scrip with search. Prices refresh
 * every 30 seconds while trading is open; a scrip opens its own chart page.
 */
function SharesTab() {
  const { t, digits } = useLocale();
  const router = useRouter();
  const colors = useThemeColors();
  const live = useNepseLive();
  const day = useMarketDate();
  const watch = useWatchlist("share");
  const [query, setQuery] = useState("");
  const [all, setAll] = useState(false);
  const data = live.data;
  const stocks = data?.stocks ?? [];
  const open = (symbol: string) => router.push(`/nepse/${symbol}`);
  const q = query.trim().toLowerCase();
  const rows = stocks.filter(
    (s) => !q || s.symbol.toLowerCase().includes(q) || (s.name ?? "").toLowerCase().includes(q),
  );
  const shown = all || q ? rows : rows.slice(0, SHARES_FIRST);
  const watched = watch.ids.flatMap((id) => stocks.filter((s) => s.symbol === id));
  const time = data?.as_of?.slice(11, 16) ?? "";
  const chip = data
    ? t(data.market_open ? "market.shares_live" : "market.shares_closed", {
        date: data.date ? day(data.date) : "",
        time: digits(time),
      })
    : "";
  const quoteRow = (s: NepseQuote) => (
    <QuoteRow
      key={s.symbol}
      avatar={s.symbol}
      title={s.symbol}
      subtitle={s.name}
      value={digits(nepseNumber(s.ltp))}
      change={<Change up={s.change === 0 ? null : s.change > 0} value={s.percent} />}
      onPress={() => open(s.symbol)}
    />
  );

  return (
    <>
      {q ? null : (
        <Hero
          tint={brand.blue}
          icon={TrendingUpNode}
          kicker={t("market.shares_kicker")}
          title={t("market.shares_hero")}
          body={t("market.shares_hero_body")}
          chip={chip}
        />
      )}
      {live.isLoading ? <SkeletonPulse className="h-96 rounded-3xl" /> : null}
      {live.isError && !data ? (
        <Text className="text-base text-muted-foreground">{t("market.shares_error")}</Text>
      ) : null}
      {data ? (
        <>
          {/* Near the top, and the only thing left while typing: matches stay above the keyboard. */}
          <View className="flex-row">
            <SearchField value={query} onChange={setQuery} placeholder={t("market.shares_search")} />
          </View>
          {q ? (
            <MarketSection title={t("market.search_results", { count: digits(rows.length) })}>
              {rows.length ? rows.slice(0, 50).map(quoteRow) : (
                <Text className="py-2 text-sm text-muted-foreground">{t("market.search_none")}</Text>
              )}
            </MarketSection>
          ) : (
            <>
              <View className="flex-row gap-3">
                {[
                  [t("market.shares_turnover"), digits(nepseCrore(data.turnover))],
                  [t("market.shares_volume"), digits(nepseNumber(data.volume, 0))],
                  [t("market.shares_trades"), digits(nepseNumber(data.transactions, 0))],
                ].map(([label, value]) => (
                  <View key={label} className="flex-1 rounded-2xl border border-border bg-card p-3">
                    <Text className="text-xs text-muted-foreground" numberOfLines={2}>
                      {label}
                    </Text>
                    <Text className="text-base font-bold tabular-nums text-foreground" numberOfLines={1} adjustsFontSizeToFit>
                      {value}
                    </Text>
                  </View>
                ))}
              </View>

              <MarketSection title={t("market.watchlist")} onPress={() => router.push("/watchlist")}>
                {watched.length ? watched.slice(0, 5).map(quoteRow) : (
                  <Text className="py-2 text-sm text-muted-foreground">{t("market.watch_empty")}</Text>
                )}
              </MarketSection>

              <TopMoversCard horizontalInset={PAGE_HORIZONTAL_PADDING} />

              <MostTradedCard horizontalInset={PAGE_HORIZONTAL_PADDING} />

              <MarketSection title={t("market.shares_list", { count: digits(data.scrips) })}>
                {shown.map(quoteRow)}
                {!all && rows.length > SHARES_FIRST ? (
                  <Pressable
                    onPress={() => setAll(true)}
                    accessibilityRole="button"
                    className="items-center rounded-full border border-border py-2.5 active:opacity-70"
                  >
                    <Text className="text-base font-semibold text-foreground">
                      {t("market.shares_all", { count: digits(rows.length) })}
                    </Text>
                  </Pressable>
                ) : null}
              </MarketSection>
            </>
          )}
          <Text className="text-xs text-muted-foreground">{t("market.shares_source")}</Text>
        </>
      ) : null}
    </>
  );
}
