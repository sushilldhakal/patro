import type { RefObject } from "react";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import type { LearnArticle, LearnNeighbour } from "@vedic-patro/features/learn";
import { Ionicons } from "@/components/icons/Ionicons";
import { Text } from "@/components/ui/Text";
import { MERGED_BY_SLUG } from "@/lib/learn/merged-pages";
import { DATA_ARTICLES } from "@/lib/learn/articles";
import { MergedArticleBody } from "@/components/learn/MergedArticleBody";
import { ArticleBody } from "@/components/learn/article-render";
import { hrefForLearnSlug } from "@/lib/learn/learn-href";
import { DayPlayground } from "@/components/learn/playground/DayPlayground";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";
import { learnPageClasses } from "@vedic-patro/design-tokens/classes/learn-page-classes";
import { cn } from "@vedic-patro/design-tokens/cn";

function TopicNavCard({
  topic,
  kicker,
  direction,
  onPress,
}: {
  topic: LearnNeighbour;
  kicker: string;
  direction: "prev" | "next";
  onPress: () => void;
}) {
  const colors = useThemeColors();
  return (
    <Pressable onPress={onPress} className={cn(learnPageClasses.navCard, "w-full min-w-0 active:opacity-90 sm:flex-1")}>
      {direction === "prev" ? <Ionicons name="arrow-back" size={16} color={colors.secondary} /> : null}
      <View className={`min-w-0 flex-1 ${direction === "next" ? "items-end" : ""}`}>
        <Text className={cn(learnPageClasses.navKicker, "text-foreground")} style={nepaliTextStyle()}>
          {kicker}
        </Text>
        <Text numberOfLines={1} className={learnPageClasses.navTitle} style={nepaliTextStyle()}>
          {topic.title}
        </Text>
      </View>
      {direction === "next" ? <Ionicons name="arrow-forward" size={16} color={colors.secondary} /> : null}
    </Pressable>
  );
}

/** One Learn article — draws `useLearnArticle` (@vedic-patro/features) with the app's article renderer. */
export function LearnArticleView({
  article,
  scrollRef,
  initialChapter,
}: {
  article: LearnArticle;
  scrollRef?: RefObject<ScrollView | null>;
  initialChapter?: string;
}) {
  const router = useRouter();
  const colors = useThemeColors();
  const { topic, copy, prev, next } = article;
  const merged = topic ? MERGED_BY_SLUG[topic.slug] : undefined;
  const data = topic ? DATA_ARTICLES[topic.slug] : undefined;

  if (!topic || (!merged && !data)) {
    return (
      <View className="items-center justify-center py-12">
        <Text className="text-center text-muted-foreground">{copy.notFound}</Text>
      </View>
    );
  }

  return (
    <View className={learnPageClasses.articleCard}>
      <View className="gap-8 px-4 py-8 sm:px-6">
        {/* Hero: category eyebrow, title, summary — as web's article header. */}
        <View className="items-center pb-5 pt-12">
          <Text className="text-center text-xs font-semibold uppercase tracking-eyebrow-wide text-accent" style={nepaliTextStyle()}>
            {topic.sectionLabel}
          </Text>
          <Text className="mt-3.5 text-center text-3xl font-bold leading-tight tracking-tight text-foreground" style={nepaliTextStyle()}>
            {topic.title}
          </Text>
          <Text className="mt-4 max-w-2xl text-center text-base leading-relaxed text-muted-foreground" style={nepaliTextStyle()}>
            {topic.summary}
          </Text>
        </View>

        {/* Above the prose, as on web: a topic that has a playground is one you
            can watch, and the reader should meet it before the words. */}
        {article.playground ? <DayPlayground key={topic.slug} config={article.playground} title={copy.playgroundTitle} /> : null}

        {article.hasGuidedTour ? null : merged ? (
          <MergedArticleBody page={merged} scrollRef={scrollRef} initialChapter={initialChapter} />
        ) : data ? (
          <ArticleBody article={data} />
        ) : null}

        <View className={cn(learnPageClasses.navRow, "mt-4")}>
          {prev ? (
            <TopicNavCard topic={prev} kicker={copy.prev} direction="prev" onPress={() => router.push(hrefForLearnSlug(prev.slug))} />
          ) : (
            <View className="hidden flex-1 sm:flex" />
          )}
          {next ? (
            <TopicNavCard topic={next} kicker={copy.next} direction="next" onPress={() => router.push(hrefForLearnSlug(next.slug))} />
          ) : (
            <View className="hidden flex-1 sm:flex" />
          )}
        </View>

        <Pressable onPress={() => router.push("/learn")} className={cn(learnPageClasses.inlineLink, "-mt-2 flex-row justify-center active:opacity-80")}>
          <Ionicons name="book-outline" size={16} color={colors.secondary} />
          <Text className={learnPageClasses.inlineLinkText} style={nepaliTextStyle()}>
            {copy.allTopics}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
