import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@/components/icons/Ionicons";
import { Text } from "@/components/ui/Text";
import { LEARN_LIBRARY_BY_SLUG, type LibraryTopic } from "@/lib/learn/learn-library";
import { hrefForLearnSlug } from "@/lib/learn/learn-href";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@/lib/utils";

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
  const { pick } = useLocale();
  const colors = useThemeColors();
  const resolvedHeading = heading ?? pick("थप जान्नुहोस्", "Learn more");
  const topics = slugs.map(topicForSlug).filter((t): t is LibraryTopic => Boolean(t));

  if (topics.length === 0) return null;

  return (
    <View
      style={{ borderColor: colors.border }}
      className={cn("rounded-2xl border bg-card/40 p-4 sm:p-5", className)}
    >
      <View className="mb-3 flex-row items-center gap-2">
        <Ionicons name="book-outline" size={16} color={colors.secondary} />
        <Text className="text-sm font-semibold text-foreground" style={nepaliTextStyle(14)}>
          {resolvedHeading}
        </Text>
      </View>
      <View className="gap-2">
        {topics.map((topic) => (
          <Pressable
            key={topic.slug}
            accessibilityRole="button"
            onPress={() => router.push(hrefForLearnSlug(topic.slug))}
            style={{ borderColor: colors.border }}
            className="flex-row items-center gap-2.5 rounded-xl border bg-background/40 px-3 py-2.5 active:opacity-90"
          >
            <View
              style={{ backgroundColor: `${colors.secondary}1a` }}
              className="h-7 w-7 shrink-0 items-center justify-center rounded-lg"
            >
              <Ionicons name={topic.icon} size={16} color={colors.secondary} />
            </View>
            <Text
              numberOfLines={1}
              className="min-w-0 flex-1 text-sm text-foreground"
              style={nepaliTextStyle(14)}
            >
              {pick(topic.title.ne, topic.title.en)}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={colors.mutedForeground} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}
