import { ActivityIndicator, Pressable, TextInput, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Text } from "@/components/ui/Text";
import { useYogaReferenceCatalog } from "@vedic-patro/features/kundali";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/domain/utils";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";

type Props = {
  /** 162-ids present in this chart — hidden here so they are not shown twice. */
  excludeIds?: ReadonlySet<string>;
};

/** Column widths, in the order of `columns` from the hook. */
const COLUMN_WIDTHS = [48, 100, 220, 200];

export function YogaReferenceCatalog({ excludeIds }: Props) {
  const colors = useThemeColors();
  const cat = useYogaReferenceCatalog({ excludeIds });

  const columns: Column[] = cat.columns.map((c, i) => ({ key: c.key, ne: c.label, en: c.label, width: COLUMN_WIDTHS[i] ?? 100 }));

  const tableRows = cat.rows.map((e) => ({
    key: e.id,
    cells: [
      <Text key="id" className={kundaliDetailClasses.yogaCatalog.idText}>
        {e.id}
      </Text>,
      <Text key="n" className={kundaliDetailClasses.yogaCatalog.nameText} style={nepaliTextStyle(11)}>
        {e.name}
      </Text>,
      <Text key="d" className={kundaliDetailClasses.yogaCatalog.cellText} style={nepaliTextStyle(11)}>
        {e.definition}
      </Text>,
      <Text key="r" className={kundaliDetailClasses.yogaCatalog.cellText} style={nepaliTextStyle(11)}>
        {e.result}
      </Text>,
    ],
  }));

  return (
    <View className={cn(kundaliDetailClasses.yogaCatalog.root, "overflow-hidden")}>
      <Pressable
        onPress={cat.toggle}
        className={cn(kundaliDetailClasses.yogaCatalog.toggle, "active:opacity-80")}
        accessibilityRole="button"
        accessibilityState={{ expanded: cat.open }}
      >
        <View className="min-w-0 flex-1">
          <Text className={kundaliDetailClasses.yogaCatalog.title} style={nepaliTextStyle(14)}>
            {cat.title}
          </Text>
          <Text className={kundaliDetailClasses.yogaCatalog.source} style={nepaliTextStyle(11)}>
            {cat.source}
          </Text>
        </View>
        <Ionicons
          name={cat.open ? "chevron-up" : "chevron-down"}
          size={18}
          color={colors.mutedForeground}
        />
      </Pressable>

      {cat.open ? (
        <View className={kundaliDetailClasses.yogaCatalog.body}>
          {cat.status === "error" ? (
            <Text className={kundaliDetailClasses.yogaCatalog.message} style={nepaliTextStyle(14)}>
              {cat.errorText}
            </Text>
          ) : cat.status === "loading" ? (
            <View className={kundaliDetailClasses.yogaCatalog.loadingRow}>
              <ActivityIndicator color={colors.secondary} />
              <Text className={kundaliDetailClasses.yogaCatalog.loadingText} style={nepaliTextStyle(14)}>
                {cat.loadingText}
              </Text>
            </View>
          ) : (
            <>
              <View className={kundaliDetailClasses.yogaCatalog.search}>
                <Ionicons name="search" size={16} color={colors.mutedForeground} />
                <TextInput
                  value={cat.query}
                  onChangeText={cat.setQuery}
                  placeholder={cat.searchPlaceholder}
                  placeholderTextColor={colors.mutedForeground}
                  className={cn(kundaliDetailClasses.yogaCatalog.searchInput, "min-w-0 flex-1 text-foreground")}
                  style={nepaliTextStyle(14)}
                  autoCapitalize="none"
                  autoCorrect={false}
                  clearButtonMode="while-editing"
                />
              </View>

              {cat.rows.length === 0 ? (
                <Text className={kundaliDetailClasses.yogaCatalog.message} style={nepaliTextStyle(14)}>
                  {cat.noMatch}
                </Text>
              ) : (
                <DataTable compact columns={columns} rows={tableRows} />
              )}

              <Text className={kundaliDetailClasses.yogaCatalog.note} style={nepaliTextStyle(11)}>
                {cat.note}
              </Text>
            </>
          )}
        </View>
      ) : null}
    </View>
  );
}
