import { View } from "react-native";
import { Icon, Pressable, Text } from "@vedic-patro/ui";
import { useDocumentCard } from "@vedic-patro/features/documents";
import { documentsClasses } from "@vedic-patro/design-tokens/classes/documents-classes";
import type { DocumentCardProps } from "../contract";
import { iconBookOpen, iconChevronRight } from "../icons";

export function DocumentCard({ doc, onPress }: DocumentCardProps) {
  const { title, subtitle, description, meta } = useDocumentCard(doc);
  return (
    <Pressable onPress={onPress} label={title} className={`${documentsClasses.card} flex-1`}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View className={documentsClasses.cardIcon} style={{ width: 36, height: 36, flexGrow: 0 }}>
          <Icon node={iconBookOpen} size="md" tone="secondary" />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text className={documentsClasses.cardTitle}>{title}</Text>
          {subtitle ? <Text className={documentsClasses.cardSubtitle}>{subtitle}</Text> : null}
        </View>
        <Icon node={iconChevronRight} size="md" tone="muted" />
      </View>
      {description ? (
        <Text className={documentsClasses.cardDescription} numberOfLines={2}>
          {description}
        </Text>
      ) : null}
      <View className={documentsClasses.cardMeta} style={{ flexDirection: "row", alignItems: "center" }}>
        {meta.map((m) => (
          <Text key={m} className={documentsClasses.cardMetaText}>
            {m}
          </Text>
        ))}
      </View>
    </Pressable>
  );
}
