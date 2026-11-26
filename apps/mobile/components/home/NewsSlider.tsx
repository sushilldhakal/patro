import { Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { useNewsPage, type NewsCardView } from "@vedic-patro/features/news";
import { useThemeColors } from "@/lib/theme-context";
import { openInApp } from "@/lib/open-in-app";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { Text } from "@/components/ui/Text";
import { withAlpha } from "@vedic-patro/design-tokens";
import { SLIDER_TINT, TintCard } from "./TintCard";
import {
  SLIDER_CARD_HEIGHT,
  SLIDER_GAP,
  sliderCardWidth,
} from "./UpcomingFestivalsSlider";

/**
 * Latest news on the home page, under the festival slider and drawn the same
 * way: a left-right row of cards (three on a phone, more on an iPad), each
 * with the category, how long ago, the headline and the outlet. Tapping a card
 * opens the outlet's article; "सबै हेर्नुहोस्" opens the news page. On error or
 * with no stories it shows nothing.
 */
export function NewsSlider({
  horizontalInset = 0,
}: {
  horizontalInset?: number;
}) {
  const { t } = useLocale();
  const colors = useThemeColors();
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const page = useNewsPage();
  const cardWidth = sliderCardWidth(windowWidth, horizontalInset);
  // Top stories first, then the rest of the latest, without repeats.
  const seen = new Set<string>();
  const stories = [...page.topStories, ...page.latest]
    .filter((s) => !seen.has(s.id) && seen.add(s.id))
    .slice(0, 15);

  if (
    page.status === "error" ||
    (page.status === "ready" && stories.length === 0)
  )
    return null;

  return (
    <View>
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-lg font-bold text-foreground">
          {page.copy.latest}
        </Text>
        <Pressable
          onPress={() => router.push("/news")}
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
        {page.status === "loading"
          ? [0, 1, 2].map((i) => (
              <View
                key={i}
                className="rounded-3xl bg-muted"
                style={{ width: cardWidth, height: SLIDER_CARD_HEIGHT }}
              />
            ))
          : stories.map((s) => (
              <NewsCard key={s.id} story={s} width={cardWidth} />
            ))}
      </ScrollView>
    </View>
  );
}

function NewsCard({ story, width }: { story: NewsCardView; width: number }) {
  const ne = story.language === "ne" ? nepaliTextStyle() : undefined;
  const url = story.sources[0]?.url;
  const source = story.sources[0]?.name;
  return (
    <TintCard
      tint={SLIDER_TINT.news}
      width={width}
      minHeight={SLIDER_CARD_HEIGHT}
      onPress={url ? () => openInApp(url, source) : undefined}
    >
      <View className="flex-row">
        <View
          className="shrink rounded-full px-2 py-0.5"
          style={{ backgroundColor: withAlpha(SLIDER_TINT.news, 0.18) }}
        >
          <Text className="text-xs font-bold text-foreground" numberOfLines={1}>
            {story.category}
          </Text>
        </View>
      </View>
      <Text
        className="mt-1.5 text-base font-semibold leading-snug text-foreground"
        style={ne}
        numberOfLines={3}
      >
        {story.title}
      </Text>
      {/* The outlet on its own line, so it is never cut off by the time. */}
      <View className="mt-auto pt-1">
        <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
          {story.sources[0]?.name}
        </Text>
        <Text className="text-sm text-muted-foreground" numberOfLines={1}>
          {story.ago}
        </Text>
      </View>
    </TintCard>
  );
}
