import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Text } from "@/components/ui/Text";
import type { DocumentSummary } from "@/lib/documents/api";
import { useLocale } from "@/lib/i18n";
import { useThemeColors } from "@/lib/theme-context";

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
      className="mb-3 rounded-2xl border border-border bg-card p-4 active:opacity-80"
    >
      <View className="flex-row items-start justify-between gap-2">
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-secondary/10">
          <Ionicons name="book-outline" size={20} color={colors.secondary} />
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
      </View>
      <Text className="mt-3 text-lg font-semibold">{title}</Text>
      {subtitle ? <Text className="mt-0.5 text-sm text-muted-foreground">{subtitle}</Text> : null}
      {description ? (
        <Text className="mt-2 text-sm text-muted-foreground" numberOfLines={2}>
          {description}
        </Text>
      ) : null}
      <View className="mt-3 flex-row items-center gap-3">
        {doc.has_chapters ? (
          <Text className="text-xs font-semibold text-muted-foreground">
            {t("documents.chapters_count", { count: digits(doc.chapter_count) })}
          </Text>
        ) : null}
        <Text className="text-xs font-semibold text-muted-foreground">
          {t("documents.shlokas_count", { count: digits(doc.shloka_count) })}
        </Text>
      </View>
    </Pressable>
  );
}
