import { Pressable, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { useRouter } from "expo-router";
import { Text } from "@/components/ui/Text";
import type { DocumentSummary } from "@/lib/documents/api";
import { useLocale } from "@/lib/i18n";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/domain/utils";
import { documentsClasses } from "@vedic-patro/design-tokens/classes/documents-classes";

export function DocumentCard({ doc }: { doc: DocumentSummary }) {
  const { t, lang, digits } = useLocale();
  const router = useRouter();
  const colors = useThemeColors();
  const title = lang === "ne" ? doc.title_ne || doc.title_en : doc.title_en || doc.title_ne;
  const subtitle = lang === "ne" ? doc.subtitle_ne || doc.subtitle_en : doc.subtitle_en || doc.subtitle_ne;
  const description = lang === "ne" ? doc.description_ne || doc.description_en : doc.description_en || doc.description_ne;

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
        {doc.has_chapters ? (
          <Text className={documentsClasses.cardMetaText}>
            {t("documents.chapters_count", { count: digits(doc.chapter_count) })}
          </Text>
        ) : null}
        <Text className={documentsClasses.cardMetaText}>
          {t("documents.shlokas_count", { count: digits(doc.shloka_count) })}
        </Text>
      </View>
    </Pressable>
  );
}
