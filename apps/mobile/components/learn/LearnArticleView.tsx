import type { RefObject } from "react";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { Text } from "@/components/ui/Text";
import {
  LEARN_LIBRARY_BY_SLUG,
  LEARN_SECTIONS_BY_ID,
  adjacentPublishedTopics,
  type LibraryTopic,
} from "@/lib/learn/learn-library";
import { MERGED_BY_SLUG } from "@/lib/learn/merged-pages";
import { DATA_ARTICLES } from "@/lib/learn/articles";
import { MergedArticleBody } from "@/components/learn/MergedArticleBody";
import { ArticleBody } from "@/components/learn/article-render";
import { hrefForLearnSlug } from "@/lib/learn/learn-href";
import { playgroundFor } from "@vedic-patro/domain/learn/playground-config";
import { DayPlayground } from "@/components/learn/playground/DayPlayground";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";
import { learnPageClasses } from "@vedic-patro/design-tokens/classes/learn-page-classes";
import { cn } from "@vedic-patro/domain/utils";

function TopicNavCard({
  topic,
  direction,
  onPress,
}: {
  topic: LibraryTopic;
  direction: "prev" | "next";
  onPress: () => void;
}) {
  const { t, pick } = useLocale();
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      className={cn(learnPageClasses.navCard, "w-full min-w-0 active:opacity-90 sm:flex-1")}
    >
      {direction === "prev" ? <Ionicons name="arrow-back" size={16} color={colors.secondary} /> : null}
      <View className={`min-w-0 flex-1 ${direction === "next" ? "items-end" : ""}`}>
        <Text className={cn(learnPageClasses.navKicker, "text-foreground")} style={nepaliTextStyle()}>
          {direction === "prev" ? t("learn_page.prev") : t("learn_page.next")}
        </Text>
        <Text numberOfLines={1} className={learnPageClasses.navTitle} style={nepaliTextStyle()}>
          {pick(topic.title.ne, topic.title.en)}
        </Text>
      </View>
      {direction === "next" ? <Ionicons name="arrow-forward" size={16} color={colors.secondary} /> : null}
    </Pressable>
  );
}

export function LearnArticleView({
  slug,
  scrollRef,
  initialChapter,
}: {
  slug: string;
  scrollRef?: RefObject<ScrollView | null>;
  initialChapter?: string;
}) {
  const router = useRouter();
  const { t, pick } = useLocale();
  const colors = useThemeColors();
  const topic = LEARN_LIBRARY_BY_SLUG[slug];
  const section = topic ? LEARN_SECTIONS_BY_ID[topic.section] : undefined;
  const merged = MERGED_BY_SLUG[slug];
  const data = DATA_ARTICLES[slug];
  const { prev, next } = adjacentPublishedTopics(slug);
  /* Not every topic gets one: a topic with no entry in the config is one the
     sim cannot honestly illustrate. Same map as web. */
  const playground = playgroundFor(slug);
  /* A topic with a guided (narrated) tour explains itself through the
     playground and its voiceover — the written prose below it would be saying
     the same thing twice. Same rule as web's LearnArticle. */
  const hasGuidedTour = Boolean(playground?.guided);

  if (!topic || (!merged && !data)) {
    return (
      <View className="items-center justify-center py-12">
        <Text className="text-center text-muted-foreground">{t("ui.learn.article_not_found")}</Text>
      </View>
    );
  }

  return (
    <View className={learnPageClasses.articleCard}>
      <View className="gap-8 px-4 py-8 sm:px-6">
        {/* Hero: category eyebrow, title, summary — as web's article header. */}
        <View className="items-center pb-5 pt-12">
          <Text
            className="text-center text-xs font-semibold uppercase tracking-eyebrow-wide text-accent"
            style={nepaliTextStyle()}
          >
            {section ? pick(section.title.ne, section.title.en) : ""}
          </Text>
          <Text
            className="mt-3.5 text-center text-3xl font-bold leading-tight tracking-tight text-foreground"
            style={nepaliTextStyle()}
          >
            {pick(topic.title.ne, topic.title.en)}
          </Text>
          <Text
            className="mt-4 max-w-2xl text-center text-base leading-relaxed text-muted-foreground"
            style={nepaliTextStyle()}
          >
            {pick(topic.summary.ne, topic.summary.en)}
          </Text>
        </View>

        {/* Above the prose, as on web: a topic that has a playground is one you
            can watch, and the reader should meet it before the words. */}
        {playground ? (
          <DayPlayground
            key={slug}
            config={playground}
            title={pick(`${topic.title.ne} · आकाश`, `${topic.title.en} · sky`)}
          />
        ) : null}

        {hasGuidedTour ? null : merged ? (
          <MergedArticleBody page={merged} scrollRef={scrollRef} initialChapter={initialChapter} />
        ) : data ? (
          <ArticleBody article={data} />
        ) : null}

        <View className={cn(learnPageClasses.navRow, "mt-4")}>
          {prev ? (
            <TopicNavCard topic={prev} direction="prev" onPress={() => router.push(hrefForLearnSlug(prev.slug))} />
          ) : (
            <View className="hidden flex-1 sm:flex" />
          )}
          {next ? (
            <TopicNavCard topic={next} direction="next" onPress={() => router.push(hrefForLearnSlug(next.slug))} />
          ) : (
            <View className="hidden flex-1 sm:flex" />
          )}
        </View>

        <Pressable
          onPress={() => router.push("/learn")}
          className={cn(learnPageClasses.inlineLink, "-mt-2 flex-row justify-center active:opacity-80")}
        >
          <Ionicons name="book-outline" size={16} color={colors.secondary} />
          <Text className={learnPageClasses.inlineLinkText} style={nepaliTextStyle()}>
            {t("ui.learn.all_topics")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
