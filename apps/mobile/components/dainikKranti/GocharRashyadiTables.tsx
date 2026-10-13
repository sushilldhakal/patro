import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { TableHeader, TableRow, TableScrollShell } from "@/components/ui/DataTable";
import type { GocharGraha } from "@/lib/api";
import {
  mergeKundaliRashi,
  RASHYADI_PLANET_ABBREV,
  RASHYADI_PLANET_KEYS,
  RASHYADI_ROW_KEYS,
  RASHYADI_ROW_LABEL,
  rashyadiCellValue,
  type RashyadiRowKey,
  type RashyadiSegment,
} from "@vedic-patro/domain/dainikKranti/rashyadi";
import { cn } from "@vedic-patro/domain/utils";
import { dainikKrantiClasses } from "@vedic-patro/design-tokens/classes/dainik-kranti-classes";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { rowLabelFor } from "@vedic-patro/domain/dainikKranti/gochar-rows";

type GrahaRow = GocharGraha & { key: string };

type TableProps = {
  segment: RashyadiSegment;
  kundaliGrahas?: GrahaRow[];
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
  const { pick, digits } = useLocale();
  const planets =
    kundaliGrahas &&
    kundaliDateAd &&
    segment.anchorDateAd === kundaliDateAd &&
    segment.anchor === "start"
      ? mergeKundaliRashi(segment.planets, kundaliGrahas)
      : segment.planets;

  if (loading) {
    return (
      <View
        className={cn(
          "min-h-[280px]",
          dainikKrantiClasses.rashyadiLoading,
          className,
        )}
      >
        <Text className="text-sm" style={nepaliTextStyle()}>{pick("लोड हुँदैछ…", "Loading…")}</Text>
      </View>
    );
  }

  return (
    <View className={cn(dainikKrantiClasses.rashyadiCard, "overflow-hidden", className)}>
      <View className={dainikKrantiClasses.rashyadiHead}>
        {!hideVersionHeader ? (
          <Text className={dainikKrantiClasses.rashyadiVersion} style={nepaliTextStyle()}>
            {segment.versionNe}
          </Text>
        ) : null}
        <Text className={cn(dainikKrantiClasses.rashyadiLabel, "mt-0", !hideVersionHeader && "mt-0.5")} style={nepaliTextStyle()}>
          {segment.labelNe}
          {segment.bsDay != null ? (
            <Text className={dainikKrantiClasses.rashyadiDay} style={nepaliTextStyle()}>
              {" "}
              ({digits(segment.bsDay)}
              {pick(" गते", "")})
            </Text>
          ) : null}
        </Text>
        {segment.moonRashiNe ? (
          <Text className={dainikKrantiClasses.rashyadiMoon} style={nepaliTextStyle()}>
            {pick("च.रा.", "Moon")}:{" "}
            <Text className={dainikKrantiClasses.rashyadiMoonValue}>{segment.moonRashiNe}</Text>
          </Text>
        ) : null}
      </View>

      <TableScrollShell bordered={false} rounded={false}>
        <View className="min-w-full">
          <TableHeader>
            <View className="w-10" />
            {RASHYADI_PLANET_KEYS.map((key) => (
              <View key={key} className="min-w-[2.25rem]">
                <Text className={dainikKrantiClasses.rashyadiTh} style={nepaliTextStyle()}>
                  {RASHYADI_PLANET_ABBREV[key]}
                </Text>
              </View>
            ))}
          </TableHeader>

          <View className="flex-row border-b border-border/60">
            <View className="w-10 items-center justify-center">
              <Text className={dainikKrantiClasses.rashyadiTdPaksha} style={nepaliTextStyle()}>{digits(segment.pakshaDayCount)}</Text>
            </View>
            {RASHYADI_PLANET_KEYS.map((key) => (
              <View key={`${segment.id}-hdr-${key}`} className="min-w-[2.25rem]" />
            ))}
          </View>

          {RASHYADI_ROW_KEYS.map((rowKey, rowIndex) => (
            <TableRow
              key={rowKey}
              rowIndex={rowIndex}
              borderTop={false}
              className="border-b border-border/60 last:border-b-0"
            >
              <View className="w-10 items-center justify-center">
                <Text className={dainikKrantiClasses.rashyadiTdLabel} style={nepaliTextStyle()}>
                  {rowLabelFor(segment, rowKey)}
                </Text>
              </View>
              {RASHYADI_PLANET_KEYS.map((key) => {
                const row = planets[key];
                return (
                  <View key={`${segment.id}-${key}-${rowKey}`} className="min-w-[2.25rem]">
                    <Text className={dainikKrantiClasses.rashyadiTdValue} style={nepaliTextStyle()}>
                      {row ? rashyadiCellValue(row, rowKey) : "—"}
                    </Text>
                  </View>
                );
              })}
            </TableRow>
          ))}
        </View>
      </TableScrollShell>

      <Text className={dainikKrantiClasses.rashyadiFoot} style={nepaliTextStyle()}>
        {pick(
          "अं=अंश · ग=कला · वि=विकला · प्र=तटपरा · त्र=प्रतितत्परा",
          "Deg=degree · Ka=kala · Vi=vikala · Pr=prati-tatpara · Tr=prati-vikala",
        )}
      </Text>
    </View>
  );
}
