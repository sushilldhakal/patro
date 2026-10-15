import { Box, Icon, Text } from "@vedic-patro/ui";
import { cn } from "@vedic-patro/domain/utils";
import { useLearnMoreCard } from "@vedic-patro/features/common";
import { learnPageClasses } from "@vedic-patro/design-tokens/classes/learn-page-classes";
import type { LearnMoreCardProps, LearnTopicCardProps } from "../contract";
import { learnIcons } from "../icons";

const SECTION_RING: Record<string, string> = {
  start: "group-hover:ring-emerald-500/25",
  foundation: "group-hover:ring-emerald-500/25",
  sun: "group-hover:ring-amber-500/25",
  moon: "group-hover:ring-sky-500/25",
  "five-limbs": "group-hover:ring-teal-500/25",
  "earth-sky": "group-hover:ring-lime-500/25",
  zodiac: "group-hover:ring-indigo-500/25",
  "vedic-time": "group-hover:ring-slate-500/25",
  panchanga: "group-hover:ring-teal-500/25",
  "bs-construction": "group-hover:ring-red-500/25",
  eclipses: "group-hover:ring-violet-500/25",
  calculation: "group-hover:ring-cyan-500/25",
  comparison: "group-hover:ring-orange-500/25",
  deeper: "group-hover:ring-rose-500/25",
};

function openLink(onOpen: () => void) {
  return (event: { preventDefault: () => void; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean; button: number }) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    onOpen();
  };
}

export function LearnMoreCard({ slugs, heading, className, headingIcon, renderIcon, hrefFor, onOpen }: LearnMoreCardProps) {
  const card = useLearnMoreCard(slugs, heading);
  if (card.topics.length === 0) return null;
  return (
    <Box as="section" className={cn(learnPageClasses.moreCard, className)}>
      <Box className={learnPageClasses.moreHead}>
        {headingIcon}
        <Text as="h2" className={learnPageClasses.moreHeading}>
          {card.heading}
        </Text>
      </Box>
      <Box className="grid gap-2" webClassName="sm:grid-cols-2 lg:grid-cols-3">
        {card.topics.map((topic) => (
          <a
            key={topic.slug}
            href={hrefFor(topic.slug)}
            onClick={openLink(() => onOpen(topic.slug))}
            className={cn(learnPageClasses.moreItem, "group transition-colors hover:border-secondary/60 hover:bg-secondary/[0.04]")}
          >
            <Box className={learnPageClasses.moreIcon}>{renderIcon(topic.icon)}</Box>
            <Text as="span" className={learnPageClasses.moreLabel} webClassName="truncate">
              {topic.title}
            </Text>
            <Icon node={learnIcons.arrowRight} size="sm" tone="muted" webClassName="transition-transform group-hover:translate-x-0.5 group-hover:text-secondary" />
          </a>
        ))}
      </Box>
    </Box>
  );
}

export function LearnTopicCard({ topic, readMore, icon, href, onOpen }: LearnTopicCardProps) {
  const ring = SECTION_RING[topic.section];
  const chip = learnPageClasses.sectionChip[topic.section];
  return (
    <a
      href={href}
      onClick={openLink(onOpen)}
      className={cn(
        learnPageClasses.topicCard,
        "group relative h-full transition-all hover:-translate-y-0.5 hover:border-secondary/45 hover:shadow-md",
        ring && `hover:ring-2 ${ring}`,
      )}
    >
      <Box className={learnPageClasses.topicHead}>
        <Box className={learnPageClasses.topicIcon} webClassName="text-secondary transition-colors group-hover:bg-secondary/15">
          {icon}
        </Box>
        <Box className={learnPageClasses.topicTitleWrap}>
          <Text as="h3" className={learnPageClasses.topicTitle}>
            {topic.title}
          </Text>
        </Box>
        {topic.sectionLabel && chip ? (
          <Text as="span" className={cn(learnPageClasses.topicBadge, learnPageClasses.topicBadgeText, chip)}>
            {topic.sectionLabel}
          </Text>
        ) : null}
      </Box>
      <Text as="p" className={learnPageClasses.topicSummary} webClassName="flex-1">
        {topic.summary}
      </Text>
      <Box className={learnPageClasses.topicFooter}>
        <Text as="span" className={learnPageClasses.topicFooterText}>
          {readMore}
        </Text>
        <Icon node={learnIcons.arrowRight} size="md" tone="secondary" webClassName="transition-transform group-hover:translate-x-0.5" />
      </Box>
    </a>
  );
}
