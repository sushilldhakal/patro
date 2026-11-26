import { View } from "react-native";
import { useRouter } from "expo-router";
import type { ForexCardView, MetalCardView } from "@vedic-patro/features/home";
import { Text } from "@/components/ui/Text";
import { useThemeColors } from "@/lib/theme-context";
import { RATE_CARD_HEIGHT } from "./UpcomingFestivalsSlider";
import { SLIDER_TINT, Sparkline, TintCard, metalTint } from "./TintCard";

/** One currency on the market row: code, unit, name, its 30-day line, buying and selling. */
export function ForexCard({
  card,
  width,
  buy,
  sell,
}: {
  card: ForexCardView;
  width: number;
  buy: string;
  sell: string;
}) {
  const colors = useThemeColors();
  const router = useRouter();
  return (
    <TintCard
      tint={SLIDER_TINT.forex}
      width={width}
      minHeight={RATE_CARD_HEIGHT}
      onPress={() =>
        router.push({ pathname: "/forex/[code]", params: { code: card.code } })
      }
      accessibilityLabel={`${card.name}, ${card.perUnit}: ${buy} ${card.buy}, ${sell} ${card.sell}`}
    >
      <View className="flex-row items-center justify-between gap-2">
        <Text className="text-lg font-extrabold text-foreground">
          {card.code}
        </Text>
        <Text
          className="shrink text-sm text-muted-foreground"
          numberOfLines={1}
        >
          {card.perUnit}
        </Text>
      </View>
      <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
        {card.name}
      </Text>
      <View className="my-1.5">
        <Sparkline
          values={card.spark}
          color={card.rising ? colors.success : colors.destructive}
          width={width - 24}
        />
      </View>
      <View className="mt-auto flex-row justify-between">
        <View>
          <Text className="text-sm font-medium text-muted-foreground">
            {buy}
          </Text>
          <Text
            className="text-base font-bold tabular-nums"
            style={{ color: colors.secondary }}
          >
            {card.buy}
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-sm font-medium text-muted-foreground">
            {sell}
          </Text>
          <Text className="text-base font-bold tabular-nums text-foreground">
            {card.sell}
          </Text>
        </View>
      </View>
    </TintCard>
  );
}

/** Hallmark gold or silver on the market row: name, 30-day line, per tola and per 10 g. */
export function MetalCard({
  card,
  width,
  tola,
  tenGram,
}: {
  card: MetalCardView;
  width: number;
  tola: string;
  tenGram: string;
}) {
  const colors = useThemeColors();
  const router = useRouter();
  return (
    <TintCard
      tint={metalTint(card.id)}
      width={width}
      minHeight={RATE_CARD_HEIGHT}
      onPress={() =>
        router.push({ pathname: "/metals/[metal]", params: { metal: card.id } })
      }
      accessibilityLabel={`${card.name}: ${tola} ${card.tola}, ${tenGram} ${card.tenGram}`}
    >
      <Text
        className="text-base font-extrabold text-foreground"
        numberOfLines={1}
      >
        {card.name}
      </Text>
      {card.change ? (
        <Text
          className="text-sm font-bold tabular-nums"
          style={{ color: card.rising ? colors.success : colors.destructive }}
        >
          {card.rising ? "▲" : "▼"} {card.change}
        </Text>
      ) : null}
      <View className="my-1.5">
        <Sparkline
          values={card.spark}
          color={card.rising ? colors.success : colors.destructive}
          width={width - 24}
        />
      </View>
      <View className="mt-auto">
        <MetalPriceLines card={card} tola={tola} tenGram={tenGram} hideChange />
      </View>
    </TintCard>
  );
}

/** "tola Rs 2,42,800 ▲1,400" over "10 g Rs 2,08,160", as Nepal quotes gold and silver. */
export function MetalPriceLines({
  card,
  tola,
  tenGram,
  large,
  hideChange,
}: {
  card: MetalCardView;
  tola: string;
  tenGram: string;
  large?: boolean;
  /** The home card shows the change by the name instead. */
  hideChange?: boolean;
}) {
  const colors = useThemeColors();
  const changeColor = card.rising ? colors.success : colors.destructive;
  return (
    <View className="pt-1">
      <View className="flex-row flex-wrap items-baseline gap-x-1">
        <Text className="text-sm font-medium text-muted-foreground">
          {tola}
        </Text>
        <Text
          className={`${large ? "text-2xl" : "text-lg"} font-bold tabular-nums text-foreground`}
          numberOfLines={1}
        >
          {card.tola}
        </Text>
        {card.change && !hideChange ? (
          <Text
            className="text-sm font-semibold tabular-nums"
            style={{ color: changeColor }}
          >
            {card.rising ? "▲" : "▼"}
            {card.change}
          </Text>
        ) : null}
      </View>
      <View className="flex-row items-baseline gap-x-1">
        <Text className="text-sm font-medium text-muted-foreground">
          {tenGram}
        </Text>
        <Text
          className={`${large ? "text-lg" : "text-base"} font-semibold tabular-nums text-foreground`}
          numberOfLines={1}
        >
          {card.tenGram}
        </Text>
      </View>
    </View>
  );
}
