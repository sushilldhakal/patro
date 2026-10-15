import { Pressable, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { useRouter } from "expo-router";
import { Text } from "@/components/ui/Text";
import type { DocumentSummary } from "@/lib/documents/api";
import { useDocumentCard } from "@vedic-patro/features/documents";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/domain/utils";
import { documentsClasses } from "@vedic-patro/design-tokens/classes/documents-classes";

export function DocumentCard({ doc }: { doc: DocumentSummary }) {
  const router = useRouter();
  const colors = useThemeColors();
  const { title, subtitle, description, meta } = useDocumentCard(doc);

  return (
    <Pressable
      onPress={() => router.push(`/documents/${doc.slug}` as never)}
      accessibilityRole="button"
      accessibilityLabel={title}
      className={cn(documentsClasses.card, "active:opacity-80")}
    >
      <View className={documentsClasses.cardTop}>
        <View className={documentsClasses.cardIcon}>
          <Ionicons name="book-outline" size={20} color={colors.secondary} />
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
      </View>
      <View>
        <Text className={documentsClasses.cardTitle}>{title}</Text>
        {subtitle ? <Text className={documentsClasses.cardSubtitle}>{subtitle}</Text> : null}
      </View>
      {description ? (
        <Text className={documentsClasses.cardDescription} numberOfLines={2}>
          {description}
        </Text>
      ) : null}
      <View className={documentsClasses.cardMeta}>
        {meta.map((m) => (
          <Text key={m} className={documentsClasses.cardMetaText}>
            {m}
          </Text>
        ))}
      </View>
    </Pressable>
  );
}
