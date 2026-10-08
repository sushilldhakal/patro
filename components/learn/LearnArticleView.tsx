import type { RefObject } from "react";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
import { playgroundFor } from "@/lib/learn/playground-config";
import { DayPlayground } from "@/components/learn/playground/DayPlayground";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";

function TopicNavCard({
  topic,
  direction,
  onPress,
}: {
  topic: LibraryTopic;
  direction: "prev" | "next";
  onPress: () => void;
}) {
  const { pick } = useLocale();
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      className="min-w-0 flex-1 rounded-xl border border-border bg-card p-3 active:opacity-90"
    >
      <View className={`flex-row items-center gap-2 ${direction === "next" ? "justify-end" : ""}`}>
        {direction === "prev" ? (
          <Ionicons name="chevron-back" size={18} color={colors.secondary} />
        ) : null}
        <View className={`min-w-0 flex-1 ${direction === "next" ? "items-end" : ""}`}>
          <Text className="text-[12px] font-bold uppercase tracking-wide text-muted-foreground">
            {direction === "prev" ? pick("अघिल्लो", "Previous") : pick("अर्को", "Next")}
          </Text>
          <Text numberOfLines={2} className="text-sm font-semibold text-foreground" style={nepaliTextStyle(14)}>
            {pick(topic.title.ne, topic.title.en)}
          </Text>
        </View>
        {direction === "next" ? (
          <Ionicons name="chevron-forward" size={18} color={colors.secondary} />
        ) : null}
      </View>
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
  const { pick } = useLocale();
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
        <Text className="text-center text-muted-foreground">{pick("लेख फेला परेन।", "Article not found.")}</Text>
      </View>
    );
  }

  return (
    <View className="gap-4">
      {/* Hero: category eyebrow, title, summary — as web's article header. */}
      <View className="gap-1.5 rounded-2xl border border-border bg-card p-5">
        <Text
          className="text-xs font-semibold uppercase tracking-wide text-secondary"
          style={nepaliTextStyle(12)}
        >
          {section ? pick(section.title.ne, section.title.en) : ""}
        </Text>
        <Text className="text-2xl font-bold leading-tight text-foreground" style={nepaliTextStyle(24)}>
          {pick(topic.title.ne, topic.title.en)}
        </Text>
        <Text className="text-base leading-relaxed text-foreground/80" style={nepaliTextStyle(16)}>
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

      {hasGuidedTour ? null : (
      <View className="rounded-2xl border border-border bg-card p-4">
        {merged ? (
          <MergedArticleBody page={merged} scrollRef={scrollRef} initialChapter={initialChapter} />
        ) : data ? (
          <ArticleBody article={data} />
        ) : null}
      </View>
      )}

      <View className="flex-row gap-2">
        {prev ? (
          <TopicNavCard topic={prev} direction="prev" onPress={() => router.push(hrefForLearnSlug(prev.slug))} />
        ) : (
          <View className="flex-1" />
        )}
        {next ? (
          <TopicNavCard topic={next} direction="next" onPress={() => router.push(hrefForLearnSlug(next.slug))} />
        ) : (
          <View className="flex-1" />
        )}
      </View>

      <Pressable
        onPress={() => router.push("/learn")}
        className="flex-row items-center justify-center gap-1.5 py-3 active:opacity-80"
      >
        <Ionicons name="book-outline" size={16} color={colors.secondary} />
        <Text className="text-sm font-semibold text-secondary" style={nepaliTextStyle(14)}>
          {pick("सबै विषय", "All topics")}
        </Text>
      </Pressable>
    </View>
  );
}
