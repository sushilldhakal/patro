import { Box, Icon, Pressable, Text } from "@vedic-patro/ui";
import { cn } from "@vedic-patro/domain/utils";
import { useDocumentCard } from "@vedic-patro/features/documents";
import { documentsClasses } from "@vedic-patro/design-tokens/classes/documents-classes";
import type { DocumentCardProps } from "../contract";
import { iconBookOpen, iconChevronRight } from "../icons";

export function DocumentCard({ doc, onPress }: DocumentCardProps) {
  const { title, subtitle, description, meta } = useDocumentCard(doc);
  return (
    <Pressable onPress={onPress} label={title} className={documentsClasses.card}>
      <Box className={documentsClasses.cardTop}>
        <Box className={documentsClasses.cardIcon}>
          <Icon node={iconBookOpen} size="xl" tone="secondary" />
        </Box>
        <Icon node={iconChevronRight} size="md" tone="muted" />
      </Box>
      <Box>
        <Text className={documentsClasses.cardTitle}>{title}</Text>
        {subtitle ? <Text className={documentsClasses.cardSubtitle}>{subtitle}</Text> : null}
      </Box>
      {description ? (
        <Text className={documentsClasses.cardDescription} numberOfLines={2}>
          {description}
        </Text>
      ) : null}
      <Box className={documentsClasses.cardMeta}>
        {meta.map((m) => (
          <Text key={m} className={documentsClasses.cardMetaText}>
            {m}
          </Text>
        ))}
      </Box>
    </Pressable>
  );
}
