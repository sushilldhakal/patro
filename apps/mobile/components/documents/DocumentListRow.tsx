import { Pressable, View } from "react-native";
import { cn } from "@vedic-patro/design-tokens/cn";
import { Grid } from "@vedic-patro/ui";
import { documentsClasses } from "@vedic-patro/design-tokens/classes/documents-classes";
import { useDocumentCard } from "@vedic-patro/features/documents";
import type { DocumentSummary } from "@vedic-patro/api-client";
import { AppNavIcon } from "@/components/icons/AppNavIcon";
import { Text } from "@/components/ui/Text";
import { useThemeColors } from "@/lib/theme-context";

/** Compact list rows (wrapping into columns on wide screens) for the documents library's "सूची" view (the card view uses DocumentCard). */
export function DocumentListRows({
  documents,
  onOpen,
}: {
  documents: readonly DocumentSummary[];
  onOpen: (doc: DocumentSummary) => void;
}) {
  return (
    // One row per line on a phone; two or three side by side on an iPad, so a long category isn't a
    // screen-tall column. Each row is its own bordered box, so the columns need no shared dividers.
    <Grid cols={3} minCellWidth={300} gap={8}>
      {documents.map((doc) => (
        <View key={doc.slug} className={cn(documentsClasses.listShell, "flex-1")}>
          <DocumentListRow doc={doc} last onPress={() => onOpen(doc)} />
        </View>
      ))}
    </Grid>
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
