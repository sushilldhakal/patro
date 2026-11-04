import { Pressable, View } from "react-native";
import { cn } from "@vedic-patro/design-tokens/cn";
import { documentsClasses } from "@vedic-patro/design-tokens/classes/documents-classes";
import { useDocumentCard } from "@vedic-patro/features/documents";
import type { DocumentSummary } from "@vedic-patro/api-client";
import { AppNavIcon } from "@/components/icons/AppNavIcon";
import { Text } from "@/components/ui/Text";
import { useThemeColors } from "@/lib/theme-context";

/** Compact list rows for the documents library's "सूची" view (the card view uses DocumentCard). */
export function DocumentListRows({
  documents,
  onOpen,
}: {
  documents: readonly DocumentSummary[];
  onOpen: (doc: DocumentSummary) => void;
}) {
  return (
    <View className={documentsClasses.listShell}>
      {documents.map((doc, i) => (
        <DocumentListRow key={doc.slug} doc={doc} last={i === documents.length - 1} onPress={() => onOpen(doc)} />
      ))}
    </View>
  );
}

function DocumentListRow({ doc, last, onPress }: { doc: DocumentSummary; last: boolean; onPress: () => void }) {
  const colors = useThemeColors();
  const card = useDocumentCard(doc);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={card.title}
      className={cn(documentsClasses.listDocRow, documentsClasses.listDocRowApp, !last && documentsClasses.listDocRowDivider)}
    >
      <View className={cn(documentsClasses.listDocIcon, "bg-secondary/10")}>
        <AppNavIcon name="book-open" size={16} color={colors.secondary} />
      </View>
      <View className={documentsClasses.listDocText}>
        <Text className={documentsClasses.listDocTitle} numberOfLines={1}>
          {card.title}
        </Text>
        {card.subtitle ? (
          <Text className="text-xs text-muted-foreground" numberOfLines={1}>
            {card.subtitle}
          </Text>
        ) : null}
        <Text className={documentsClasses.listDocMetaApp} numberOfLines={1}>
          {card.meta.join(" · ")}
        </Text>
      </View>
      <AppNavIcon name="chevron-right" size={16} color={colors.mutedForeground} />
    </Pressable>
  );
}
