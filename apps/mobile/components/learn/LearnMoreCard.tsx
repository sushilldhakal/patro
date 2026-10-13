import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@/components/icons/Ionicons";
import { Text } from "@/components/ui/Text";
import { LEARN_LIBRARY_BY_SLUG, type LibraryTopic } from "@/lib/learn/learn-library";
import { hrefForLearnSlug } from "@/lib/learn/learn-href";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/domain/utils";
import { learnPageClasses } from "@vedic-patro/design-tokens/classes/learn-page-classes";

function topicForSlug(slug: string): LibraryTopic | undefined {
  const topic = LEARN_LIBRARY_BY_SLUG[slug];
  return topic?.status === "published" ? topic : undefined;
}

/** Contextual learn links — web `LearnMoreCard`. */
export function LearnMoreCard({
  slugs,
  heading,
  className,
}: {
  slugs: string[];
  heading?: string;
  className?: string;
}) {
  const router = useRouter();
  const { t, pick } = useLocale();
  const colors = useThemeColors();
  const resolvedHeading = heading ?? t("learn_more.default_heading");
  const topics = slugs.map(topicForSlug).filter((t): t is LibraryTopic => Boolean(t));

  if (topics.length === 0) return null;

  return (
    <View className={cn(learnPageClasses.moreCard, className)}>
      <View className={learnPageClasses.moreHead}>
        <Ionicons name="book-outline" size={16} color={colors.secondary} />
        <Text className={learnPageClasses.moreHeading} style={nepaliTextStyle(14)}>
          {resolvedHeading}
        </Text>
      </View>
      <View className="gap-2">
        {topics.map((topic) => (
          <Pressable
            key={topic.slug}
            accessibilityRole="button"
            onPress={() => router.push(hrefForLearnSlug(topic.slug))}
            className={cn(learnPageClasses.moreItem, "active:opacity-90")}
          >
            <View className={learnPageClasses.moreIcon}>
              <Ionicons name={topic.icon} size={16} color={colors.secondary} />
            </View>
            <Text
              numberOfLines={1}
              className={learnPageClasses.moreLabel}
              style={nepaliTextStyle(14)}
            >
              {pick(topic.title.ne, topic.title.en)}
            </Text>
            <Ionicons name="arrow-forward" size={14} color={colors.mutedForeground} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}
