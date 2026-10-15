import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@/components/icons/Ionicons";
import { Text } from "@/components/ui/Text";
import { LEARN_ICONS } from "@/lib/learn/learn-library";
import { hrefForLearnSlug } from "@/lib/learn/learn-href";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/domain/utils";
import { useLearnMoreCard } from "@vedic-patro/features/common";
import { learnPageClasses } from "@vedic-patro/design-tokens/classes/learn-page-classes";

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
  const colors = useThemeColors();
  const card = useLearnMoreCard(slugs, heading);

  if (card.topics.length === 0) return null;

  return (
    <View className={cn(learnPageClasses.moreCard, className)}>
      <View className={learnPageClasses.moreHead}>
        <Ionicons name="book-outline" size={16} color={colors.secondary} />
        <Text className={learnPageClasses.moreHeading} style={nepaliTextStyle(14)}>
          {card.heading}
        </Text>
      </View>
      <View className="gap-2">
        {card.topics.map((topic) => (
          <Pressable
            key={topic.slug}
            accessibilityRole="button"
            onPress={() => router.push(hrefForLearnSlug(topic.slug))}
            className={cn(learnPageClasses.moreItem, "active:opacity-90")}
          >
            <View className={learnPageClasses.moreIcon}>
              <Ionicons name={LEARN_ICONS[topic.icon]} size={16} color={colors.secondary} />
            </View>
            <Text
              numberOfLines={1}
              className={learnPageClasses.moreLabel}
              style={nepaliTextStyle(14)}
            >
              {topic.title}
            </Text>
            <Ionicons name="arrow-forward" size={14} color={colors.mutedForeground} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}
