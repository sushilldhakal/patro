import { Box, Icon, Pressable, Text } from "@vedic-patro/ui";
import { cn } from "@vedic-patro/domain/utils";
import { useLearnMoreCard } from "@vedic-patro/features/common";
import { learnPageClasses } from "@vedic-patro/design-tokens/classes/learn-page-classes";
import type { LearnMoreCardProps, LearnTopicCardProps } from "../contract";
import { learnIcons } from "../icons";

function chipText(chip: string) {
  return chip
    .split(" ")
    .filter((part) => part.startsWith("text-") || part.startsWith("dark:text-"))
    .join(" ");
}

export function LearnMoreCard({ slugs, heading, className, headingIcon, renderIcon, onOpen }: LearnMoreCardProps) {
  const card = useLearnMoreCard(slugs, heading);
  if (card.topics.length === 0) return null;
  return (
    <Box className={cn(learnPageClasses.moreCard, className)}>
      <Box className={learnPageClasses.moreHead}>
        {headingIcon}
        <Text as="h2" className={learnPageClasses.moreHeading}>
          {card.heading}
        </Text>
      </Box>
      <Box className="gap-2">
        {card.topics.map((topic) => (
          <Pressable key={topic.slug} onPress={() => onOpen(topic.slug)} label={topic.title} className={learnPageClasses.moreItem}>
            <Box className={learnPageClasses.moreIcon}>{renderIcon(topic.icon)}</Box>
            <Text className={learnPageClasses.moreLabel} numberOfLines={1}>
              {topic.title}
            </Text>
            <Icon node={learnIcons.arrowRight} size="sm" tone="muted" />
          </Pressable>
        ))}
      </Box>
    </Box>
  );
}

export function LearnTopicCard({ topic, readMore, icon, onOpen }: LearnTopicCardProps) {
  const chip = learnPageClasses.sectionChip[topic.section];
  return (
    <Pressable onPress={onOpen} label={topic.title} className={cn(learnPageClasses.topicCard, "w-full")}>
      <Box className={learnPageClasses.topicHead}>
        <Box className={learnPageClasses.topicIcon}>{icon}</Box>
        <Box className={learnPageClasses.topicTitleWrap}>
          <Text className={learnPageClasses.topicTitle}>{topic.title}</Text>
        </Box>
        {topic.sectionLabel ? (
          <Box className={cn(learnPageClasses.topicBadge, chip ?? "border-border bg-muted")} nativeClassName="shrink">
            <Text className={cn(learnPageClasses.topicBadgeText, chip ? chipText(chip) : "text-foreground")} numberOfLines={1}>
              {topic.sectionLabel}
            </Text>
          </Box>
        ) : null}
      </Box>
      <Text className={learnPageClasses.topicSummary}>{topic.summary}</Text>
      <Box className={learnPageClasses.topicFooter}>
        <Text className={learnPageClasses.topicFooterText}>{readMore}</Text>
        <Icon node={learnIcons.arrowRight} size="md" tone="secondary" />
      </Box>
    </Pressable>
  );
}
