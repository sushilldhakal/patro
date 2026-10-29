import { Pressable, TextInput, View } from "react-native";
import { useAvakahadaPage, type AvakahadaRow, type AvakahadaColumnKey } from "@vedic-patro/features/avakahada";
import { webTypeScale } from "@vedic-patro/design-tokens";
import { avakahadaClasses } from "@vedic-patro/design-tokens/classes/avakahada-classes";
import { cn } from "@vedic-patro/design-tokens/cn";
import { Ionicons } from "@/components/icons/Ionicons";
import { AppShell } from "@/components/AppShell";
import { AvakahadaWheel } from "@/components/avakahada/AvakahadaWheel";
import { Text } from "@/components/ui/Text";
import { TableCell, TableHeader, TableHeaderCell, TableHeaderLabel, TableRow, TableScrollShell } from "@/components/ui/DataTable";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useBreakpoint } from "@/lib/responsive";
import { useThemeColors } from "@/lib/theme-context";

/** Avakahada chakra — the app's drawing of `useAvakahadaPage` (@vedic-patro/features). */
export default function AvakahadaScreen() {
  const { t } = useLocale();
  const colors = useThemeColors();
  const { width, isTablet } = useBreakpoint();
  const page = useAvakahadaPage();
  const tableMinWidth = page.columns.reduce((sum, c) => sum + c.width, 0);

  return (
    <AppShell
      title={t("nav.avakahada_chakra")}
      subtitle={page.copy.subtitle}
      headerRight={<Ionicons name="grid-outline" size={26} color={colors.secondary} />}
    >
      <View className={cn("mb-4", avakahadaClasses.note)}>
        <Text className={avakahadaClasses.noteText} style={nepaliTextStyle(14)}>
          {page.copy.note}
        </Text>
      </View>

      <View className={cn("flex-row", avakahadaClasses.searchBox, isTablet && avakahadaClasses.searchWrap)}>
        <Ionicons name="search" size={16} color={colors.mutedForeground} />
        <TextInput
          className="flex-1 py-2.5"
          value={page.search}
          onChangeText={page.setSearch}
          placeholder={page.copy.searchPlaceholder}
          placeholderTextColor={colors.mutedForeground}
          style={{ color: colors.foreground, fontSize: webTypeScale.sm.size }}
        />
        {page.search ? (
          <Pressable onPress={() => page.setSearch("")} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={colors.mutedForeground} />
          </Pressable>
        ) : null}
      </View>

      <TableScrollShell stretch={false}>
        <View style={{ minWidth: tableMinWidth }}>
          <TableHeader>
            {page.columns.map((col) => (
              <TableHeaderCell
                key={col.key}
                width={col.width}
                disabled={!col.sortable}
                onPress={col.sortable ? () => page.toggleSort(col.key) : undefined}
              >
                <TableHeaderLabel uppercase={false} numberOfLines={2} className={avakahadaClasses.headLabel}>
                  {col.label}
                </TableHeaderLabel>
                {col.sortable ? (
                  <Ionicons
                    name={col.sorted ? (col.sorted === "asc" ? "chevron-up" : "chevron-down") : "swap-vertical"}
                    size={11}
                    color={col.sorted ? colors.foreground : colors.mutedForeground}
                  />
                ) : null}
              </TableHeaderCell>
            ))}
          </TableHeader>

          {page.rows.length === 0 ? (
            <View className={cn("px-4", avakahadaClasses.emptyCell)}>
              <Text className={avakahadaClasses.emptyText} style={nepaliTextStyle(14)}>
                {page.copy.noResults}
              </Text>
            </View>
          ) : (
            page.rows.map((row, rowIndex) => (
              <TableRow key={row.index} rowIndex={rowIndex}>
                {page.columns.map((col) => (
                  <TableCell key={col.key} width={col.width}>
                    <Cell row={row} column={col.key} />
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </View>
      </TableScrollShell>

      <AvakahadaWheel highlighted={page.highlighted} />

      <View className={cn("mt-8", avakahadaClasses.notes)}>
        <Text className={avakahadaClasses.notesTitle} style={nepaliTextStyle(20)}>
          {page.copy.bhoomadoshaTitle}
        </Text>
        <View className={cn(width >= 640 && "flex-row", avakahadaClasses.notesGrid)}>
          <View className={cn("flex-1", avakahadaClasses.notesCard)}>
            <Text className={avakahadaClasses.notesCardTitle} style={nepaliTextStyle(14)}>
              {page.copy.nameGroups}
            </Text>
            <View className={avakahadaClasses.vargaList}>
              {page.vargas.map((v) => (
                <View key={v.key} className={cn("flex-row", avakahadaClasses.vargaRow)}>
                  <Text className={avakahadaClasses.vargaName} style={nepaliTextStyle(14)}>
                    {v.varga}
                  </Text>
                  <Text className={avakahadaClasses.vargaVs}>⚔</Text>
                  <Text className={avakahadaClasses.vargaName} style={nepaliTextStyle(14)}>
                    {v.shatru}
                  </Text>
                </View>
              ))}
            </View>
            <Text className={avakahadaClasses.vargaNote} style={nepaliTextStyle(12)}>
              {page.copy.bhoomadoshaNote}
            </Text>
          </View>
          <View className={cn("flex-1", avakahadaClasses.notesCard)}>
            <Text className={avakahadaClasses.notesCardTitle} style={nepaliTextStyle(14)}>
              {page.copy.shloka}
            </Text>
            <View className={avakahadaClasses.shlokaList}>
              {page.shlokas.map((s, i) => (
                <Text key={i} className={avakahadaClasses.shloka} style={nepaliTextStyle(14)}>
                  {s}
                </Text>
              ))}
            </View>
          </View>
        </View>
        <Text className={avakahadaClasses.footnote} style={nepaliTextStyle(12)}>
          {page.copy.footnote}
        </Text>
      </View>
    </AppShell>
  );
}

function Cell({ row, column }: { row: AvakahadaRow; column: AvakahadaColumnKey }) {
  const { digits } = useLocale();
  switch (column) {
    case "nakshatra":
      return (
        <Text className={avakahadaClasses.nakLabel} style={nepaliTextStyle(13)}>
          {digits(row.index)}. {row.label}
        </Text>
      );
    case "akshara":
      return (
        <View className={cn("flex-row", avakahadaClasses.aksharaList)}>
          {row.aksharas.map((a, i) => (
            <View key={`${row.index}-${i}`} className={avakahadaClasses.aksharaChip}>
              <Text className={avakahadaClasses.aksharaText} style={nepaliTextStyle(13)}>
                {a}
              </Text>
            </View>
          ))}
        </View>
      );
    case "gana":
      return (
        <View className={cn("self-start", avakahadaClasses.ganaBadge, avakahadaClasses.ganaBg[row.gana])}>
          <Text style={nepaliTextStyle(12)} className={cn(avakahadaClasses.ganaBadgeText, avakahadaClasses.ganaFg[row.gana])}>
            {row.ganaLabel}
          </Text>
        </View>
      );
    default:
      return <Text>{row[column]}</Text>;
  }
}
