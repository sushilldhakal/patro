import { useRef } from "react";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { useLearnArticle } from "@vedic-patro/features/learn";
import { Ionicons } from "@/components/icons/Ionicons";
import { AppShell } from "@/components/AppShell";
import { LearnArticleView } from "@/components/learn/LearnArticleView";
import { Text } from "@/components/ui/Text";
import { useThemeColors } from "@/lib/theme-context";
import { learnPageClasses } from "@vedic-patro/design-tokens/classes/learn-page-classes";
import { cn } from "@vedic-patro/domain/utils";

function resolveSlug(raw: string | string[] | undefined): string | undefined {
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) return raw[0];
  return undefined;
}

/** Learn article — the app's drawing of `useLearnArticle` (@vedic-patro/features). */
export default function LearnArticleScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const scrollRef = useRef<ScrollView>(null);
  const params = useLocalSearchParams<{ slug: string | string[]; chapter?: string }>();
  const article = useLearnArticle(resolveSlug(params.slug));
  const { copy } = article;

  if (article.redirect) {
    const { slug, anchor } = article.redirect;
    return <Redirect href={anchor ? `/learn/${slug}?chapter=${anchor}` : `/learn/${slug}`} />;
  }

  return (
    <AppShell scroll scrollRef={scrollRef} showHeader={false} title={copy.navTitle}>
      {/* Web's "← Learn" link above the article. */}
      <Pressable
        onPress={() => router.push("/learn")}
        accessibilityRole="button"
        className={cn(learnPageClasses.backLink, "mb-8 flex-row self-start active:opacity-70")}
      >
        <Ionicons name="arrow-back" size={16} color={colors.foreground} />
        <Text className={cn(learnPageClasses.backLinkText, "text-foreground")}>{copy.backToHub}</Text>
      </Pressable>
      {article.topic ? (
        <LearnArticleView article={article} scrollRef={scrollRef} initialChapter={params.chapter} />
      ) : (
        <View className={cn(learnPageClasses.notFound, "justify-center")}>
          <Text className="text-center text-sm text-foreground">{copy.notFound}</Text>
          <Pressable onPress={() => router.replace("/learn")} className={cn(learnPageClasses.inlineLink, "flex-row active:opacity-80")}>
            <Ionicons name="arrow-back" size={16} color={colors.secondary} />
            <Text className={learnPageClasses.inlineLinkText}>{copy.backHub}</Text>
          </Pressable>
        </View>
      )}
    </AppShell>
  );
}
