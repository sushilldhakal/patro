import { useRef } from "react";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { AppShell } from "@/components/AppShell";
import { LearnArticleView } from "@/components/learn/LearnArticleView";
import { Text } from "@/components/ui/Text";
import { LEARN_LIBRARY_BY_SLUG } from "@/lib/learn/learn-library";
import { RETIRED_SLUG_REDIRECTS } from "@/lib/learn/merged-pages";
import { useLocale } from "@/lib/i18n";
import { useThemeColors } from "@/lib/theme-context";
import { learnPageClasses } from "@vedic-patro/design-tokens/classes/learn-page-classes";
import { cn } from "@vedic-patro/domain/utils";

function resolveSlug(raw: string | string[] | undefined): string | undefined {
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) return raw[0];
  return undefined;
}

export default function LearnArticleScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const scrollRef = useRef<ScrollView>(null);
  const params = useLocalSearchParams<{ slug: string | string[]; chapter?: string }>();
  const slug = resolveSlug(params.slug);
  const { pick } = useLocale();

  const retiredTo = slug ? RETIRED_SLUG_REDIRECTS[slug] : undefined;
  if (retiredTo) {
    const [to, chapter] = retiredTo.split("#");
    return <Redirect href={chapter ? `/learn/${to}?chapter=${chapter}` : `/learn/${to}`} />;
  }

  const topic = slug ? LEARN_LIBRARY_BY_SLUG[slug] : undefined;
  const valid = Boolean(topic && topic.status === "published");

  return (
    <AppShell
      scroll
      scrollRef={scrollRef}
      showHeader={false}
      title={topic ? pick(topic.title.ne, topic.title.en) : pick("सिकाइ", "Learn")}
    >
      {/* Web's "← Learn" link above the article. */}
      <Pressable
        onPress={() => router.push("/learn")}
        accessibilityRole="button"
        className={cn(learnPageClasses.backLink, "mb-8 flex-row self-start active:opacity-70")}
      >
        <Ionicons name="arrow-back" size={16} color={colors.foreground} />
        <Text className={cn(learnPageClasses.backLinkText, "text-foreground")}>{pick("सिकाइ", "Learn")}</Text>
      </Pressable>
      {valid && slug ? (
        <LearnArticleView slug={slug} scrollRef={scrollRef} initialChapter={params.chapter} />
      ) : (
        <View className={cn(learnPageClasses.notFound, "justify-center")}>
          <Text className="text-center text-sm text-foreground">
            {pick("लेख फेला परेन।", "Article not found.")}
          </Text>
          <Pressable onPress={() => router.replace("/learn")} className={cn(learnPageClasses.inlineLink, "flex-row active:opacity-80")}>
            <Ionicons name="arrow-back" size={16} color={colors.secondary} />
            <Text className={learnPageClasses.inlineLinkText}>{pick("सिकाइमा फर्कनुहोस्", "Back to Learn")}</Text>
          </Pressable>
        </View>
      )}
    </AppShell>
  );
}
