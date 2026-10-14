import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { TableHeader, TableRow, TableScrollShell } from "@/components/ui/DataTable";
import type { RashyadiSegment } from "@vedic-patro/domain/dainikKranti/rashyadi";
import { useGocharRashyadiTable, type GocharGrahaRow } from "@vedic-patro/features/dainik-kranti";
import { cn } from "@vedic-patro/domain/utils";
import { dainikKrantiClasses } from "@vedic-patro/design-tokens/classes/dainik-kranti-classes";
import { nepaliTextStyle } from "@/lib/nepali-text";

type TableProps = {
  segment: RashyadiSegment;
  kundaliGrahas?: GocharGrahaRow[];
  kundaliDateAd?: string | null;
  loading?: boolean;
  className?: string;
  /** When true, omit the paksha version line (shown in GocharRashyadiBlock header row). */
  hideVersionHeader?: boolean;
};

export function GocharRashyadiTable({
  segment,
  kundaliGrahas,
  kundaliDateAd,
  loading,
  className,
  hideVersionHeader,
}: TableProps) {
  const table = useGocharRashyadiTable({ segment, kundaliGrahas, kundaliDateAd });

  if (loading) {
    return (
      <View
        className={cn(
          "min-h-[280px]",
          dainikKrantiClasses.rashyadiLoading,
          className,
        )}
      >
        <Text className="text-sm" style={nepaliTextStyle()}>{table.loadingText}</Text>
      </View>
    );
  }

  return (
    <View className={cn(dainikKrantiClasses.rashyadiCard, "overflow-hidden", className)}>
      <View className={dainikKrantiClasses.rashyadiHead}>
        {!hideVersionHeader ? (
          <Text className={dainikKrantiClasses.rashyadiVersion} style={nepaliTextStyle()}>
            {table.version}
          </Text>
        ) : null}
        <Text className={cn(dainikKrantiClasses.rashyadiLabel, "mt-0", !hideVersionHeader && "mt-0.5")} style={nepaliTextStyle()}>
          {table.label}
          {table.day ? (
            <Text className={dainikKrantiClasses.rashyadiDay} style={nepaliTextStyle()}>
              {" "}
              {table.day}
            </Text>
          ) : null}
        </Text>
        {table.moon ? (
          <Text className={dainikKrantiClasses.rashyadiMoon} style={nepaliTextStyle()}>
            {table.moon.label}{" "}
            <Text className={dainikKrantiClasses.rashyadiMoonValue}>{table.moon.value}</Text>
          </Text>
        ) : null}
      </View>

      <TableScrollShell bordered={false} rounded={false}>
        <View className="min-w-full">
          <TableHeader>
            <View className="w-10" />
            {table.columns.map((col) => (
              <View key={col.key} className="min-w-[2.25rem]">
                <Text className={dainikKrantiClasses.rashyadiTh} style={nepaliTextStyle()}>
                  {col.label}
                </Text>
              </View>
            ))}
          </TableHeader>

          <View className="flex-row border-b border-border/60">
            <View className="w-10 items-center justify-center">
              <Text className={dainikKrantiClasses.rashyadiTdPaksha} style={nepaliTextStyle()}>{table.pakshaDays}</Text>
            </View>
            {table.columns.map((col) => (
              <View key={`hdr-${col.key}`} className="min-w-[2.25rem]" />
            ))}
          </View>

          {table.rows.map((row, rowIndex) => (
            <TableRow
              key={row.key}
              rowIndex={rowIndex}
              borderTop={false}
              className="border-b border-border/60 last:border-b-0"
            >
              <View className="w-10 items-center justify-center">
                <Text className={dainikKrantiClasses.rashyadiTdLabel} style={nepaliTextStyle()}>
                  {row.label}
                </Text>
              </View>
              {row.cells.map((cell) => (
                <View key={cell.key} className="min-w-[2.25rem]">
                  <Text className={dainikKrantiClasses.rashyadiTdValue} style={nepaliTextStyle()}>
                    {cell.value}
                  </Text>
                </View>
              ))}
            </TableRow>
          ))}
        </View>
      </TableScrollShell>

      <Text className={dainikKrantiClasses.rashyadiFoot} style={nepaliTextStyle()}>
        {table.footnote}
      </Text>
    </View>
  );
}
