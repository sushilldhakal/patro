import { Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { useForexRates, useMetalPrices } from "@vedic-patro/features/home";
import { useLocale } from "@/lib/i18n";
import { useThemeColors } from "@/lib/theme-context";
import { Text } from "@/components/ui/Text";
import { ForexCard, MetalCard } from "./MarketCards";
import {
  RATE_CARD_HEIGHT,
  SLIDER_GAP,
  sliderCardWidth,
} from "./UpcomingFestivalsSlider";

/**
 * The market on the home page, under the news: hallmark gold and silver, then every NRB currency,
 * in one left-right row. A card opens its own page; "सबै हेर्नुहोस्" opens the market page.
 * Each half shows once its data is in; the row hides only when both failed.
 */
export function MarketSlider({
  horizontalInset = 0,
}: {
  horizontalInset?: number;
}) {
  const { t } = useLocale();
  const colors = useThemeColors();
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const metals = useMetalPrices();
  const forex = useForexRates();
  const cardWidth = sliderCardWidth(windowWidth, horizontalInset);
  const loading = metals.status === "loading" && forex.status === "loading";

  if (metals.status === "error" && forex.status === "error") return null;

  return (
    <View>
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-lg font-bold text-foreground">
          {t("market.title")}
        </Text>
        <Pressable
          onPress={() => router.push("/market")}
          accessibilityRole="button"
          hitSlop={8}
        >
          <Text
            className="text-base font-semibold"
            style={{ color: colors.secondary }}
          >
            {t("common.view_all")} ›
          </Text>
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={cardWidth + SLIDER_GAP}
        snapToAlignment="start"
        // The cards start on the line of the cards above (the page's card inset) and scroll out to its edge.
        style={{ marginHorizontal: -horizontalInset }}
        contentContainerStyle={{ paddingHorizontal: horizontalInset, gap: SLIDER_GAP }}
      >
        {loading
          ? [0, 1, 2].map((i) => (
              <View
                key={i}
                className="rounded-3xl bg-muted"
                style={{ width: cardWidth, height: RATE_CARD_HEIGHT }}
              />
            ))
          : null}
        {metals.cards.map((c) => (
          <MetalCard
            key={c.id}
            card={c}
            width={cardWidth}
            tola={metals.copy.tola}
            tenGram={metals.copy.tenGram}
          />
        ))}
        {forex.cards.map((c) => (
          <ForexCard
            key={c.code}
            card={c}
            width={cardWidth}
            buy={forex.copy.buy}
            sell={forex.copy.sell}
          />
        ))}
      </ScrollView>
    </View>
  );
}
