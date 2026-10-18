import { Box, Icon, Text } from "@vedic-patro/ui";
import { cn } from "@vedic-patro/design-tokens/cn";
import { isTopicOf, type DocumentCategoryId } from "@vedic-patro/domain/document-categories";
import { useDocumentCard } from "@vedic-patro/features/documents";
import { documentsClasses } from "@vedic-patro/design-tokens/classes/documents-classes";
import type { DocumentCardProps } from "../contract";
import { iconBookOpen, iconChevronRight } from "../icons";

function cardHref(slug: string, category?: string, topic?: string) {
  if (!category || category === "all") return `/documents/${slug}`;
  const topicOk = topic && isTopicOf(category as DocumentCategoryId, topic) ? topic : undefined;
  const q = new URLSearchParams(topicOk ? { category, topic: topicOk } : { category });
  return `/documents/${slug}?${q.toString()}`;
}

export function DocumentCard({ doc, category, topic, onPress }: DocumentCardProps) {
  const { title, subtitle, description, meta } = useDocumentCard(doc);
  return (
    <a
      href={cardHref(doc.slug, category, topic)}
      onClick={(e) => {
        if (!onPress || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        onPress();
      }}
      className={cn(documentsClasses.card, "group transition-colors hover:border-secondary/60")}
    >
      <Box className={documentsClasses.cardTop}>
        <Box className={documentsClasses.cardIcon}>
          <Icon node={iconBookOpen} size="xl" tone="secondary" />
        </Box>
        <Icon node={iconChevronRight} size="md" tone="muted" webClassName="transition-transform group-hover:translate-x-0.5" />
      </Box>
      <Box>
        <Text as="h2" className={documentsClasses.cardTitle}>
          {title}
        </Text>
        {subtitle ? (
          <Text as="p" className={documentsClasses.cardSubtitle}>
            {subtitle}
          </Text>
        ) : null}
      </Box>
      {description ? (
        <Text as="p" className={documentsClasses.cardDescription} numberOfLines={2}>
          {description}
        </Text>
      ) : null}
      <Box className={cn(documentsClasses.cardMeta, documentsClasses.cardMetaText)} webClassName="mt-auto">
        {meta.map((m) => (
          <Text as="span" key={m}>
            {m}
          </Text>
        ))}
      </Box>
    </a>
  );
}
