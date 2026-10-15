import { ScrollView, View } from "react-native";
import type { RashyadiSegment } from "@vedic-patro/domain/dainikKranti/rashyadi";
import { useGocharRashyadiTable, type GocharGrahaRow } from "@vedic-patro/features/dainik-kranti";
import { cn } from "@vedic-patro/domain/utils";
import { Box, Text } from "@vedic-patro/ui";
import { dainikKrantiClasses } from "@vedic-patro/design-tokens/classes/dainik-kranti-classes";

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
      <Box className={cn("min-h-[280px]", dainikKrantiClasses.rashyadiLoading, className)}>
        <Text className="text-sm">{table.loadingText}</Text>
      </Box>
    );
  }

  return (
    <Box className={cn(dainikKrantiClasses.rashyadiCard, "overflow-hidden", className)}>
      <Box className={dainikKrantiClasses.rashyadiHead}>
        {hideVersionHeader ? null : <Text className={dainikKrantiClasses.rashyadiVersion}>{table.version}</Text>}
        <Text className={cn(dainikKrantiClasses.rashyadiLabel, hideVersionHeader ? "mt-0" : "mt-0.5")}>
          {table.label}
          {table.day ? <Text className={dainikKrantiClasses.rashyadiDay}> {table.day}</Text> : null}
        </Text>
        {table.moon ? (
          <Text className={dainikKrantiClasses.rashyadiMoon}>
            {table.moon.label} <Text className={dainikKrantiClasses.rashyadiMoonValue}>{table.moon.value}</Text>
          </Text>
        ) : null}
      </Box>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="min-w-full">
          <Box className="flex-row border-b border-border/60">
            <Box className="w-10" />
            {table.columns.map((col) => (
              <Box key={col.key} className="min-w-[2.25rem]">
                <Text className={dainikKrantiClasses.rashyadiTh}>{col.label}</Text>
              </Box>
            ))}
          </Box>
          <Box className="flex-row border-b border-border/60">
            <Box className="w-10 items-center justify-center">
              <Text className={dainikKrantiClasses.rashyadiTdPaksha}>{table.pakshaDays}</Text>
            </Box>
            {table.columns.map((col) => (
              <Box key={`hdr-${col.key}`} className="min-w-[2.25rem]" />
            ))}
          </Box>
          {table.rows.map((row) => (
            <Box key={row.key} className="flex-row border-b border-border/60">
              <Box className="w-10 items-center justify-center">
                <Text className={dainikKrantiClasses.rashyadiTdLabel}>{row.label}</Text>
              </Box>
              {row.cells.map((cell) => (
                <Box key={cell.key} className="min-w-[2.25rem]">
                  <Text className={dainikKrantiClasses.rashyadiTdValue}>{cell.value}</Text>
                </Box>
              ))}
            </Box>
          ))}
        </View>
      </ScrollView>
      <Text className={dainikKrantiClasses.rashyadiFoot}>{table.footnote}</Text>
    </Box>
  );
}
