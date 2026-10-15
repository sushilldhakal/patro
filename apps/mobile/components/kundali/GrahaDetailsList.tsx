import { View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { Text } from "@/components/ui/Text";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { GrahaInline, GrahaInlineChildren } from "@/components/kundali/KundaliGlyphLabels";
import { NakshatraGlyphIcon, RashiGlyphIcon } from "@/components/panchanga/element/ElementGlyphIcon";
import type { VargaCharts } from "@/lib/api";
import { useGrahaDetailsList } from "@vedic-patro/features/kundali";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/domain/utils";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";

const g = kundaliDetailClasses.grahaList;
/** Column widths, in the order of `columns` from the hook. */
const COLUMN_WIDTHS = [116, 196, 64, 168, 164, 132, 96, 96, 88];

export function GrahaDetailsList({
  division,
  anchorKey,
  vargaCharts,
}: {
  division: number;
  anchorKey: string;
  vargaCharts: VargaCharts;
}) {
  const colors = useThemeColors();
  const list = useGrahaDetailsList({ division, anchorKey, vargaCharts });

  if (list.rows.length === 0) return null;

  const columns: Column[] = list.columns.map((c, i) => ({ key: c.key, ne: c.label, en: c.label, width: COLUMN_WIDTHS[i] ?? 96 }));

  return (
    <DataTable
      compact
      columns={columns}
      rows={list.rows.map((row) => ({
        key: row.key,
        highlight: row.retrograde,
        cells: [
          <GrahaInlineChildren key="g" grahaKey={row.key} size={18}>
            <Text className={g.name} style={nepaliTextStyle(11)}>
              {row.name}
            </Text>
            {row.retrograde ? (
              <View className={g.retroBadge} accessibilityLabel={list.retroTitle}>
                <Ionicons name="refresh" size={10} color={colors.secondary} />
                <Text className={g.retroText}>{list.retroLabel}</Text>
              </View>
            ) : null}
          </GrahaInlineChildren>,
          <View key="dms" className="flex-row items-center gap-1">
            <Text className={cn(g.dms, g.dmsDeg)} style={nepaliTextStyle(11)}>
              {row.deg}
            </Text>
            <RashiGlyphIcon number={row.rashiNum} size={14} />
            <Text className={g.dmsRashi} style={nepaliTextStyle(11)}>
              {row.rashiName}
            </Text>
            <Text className={g.dms} style={nepaliTextStyle(11)}>
              {row.min} {row.sec}
            </Text>
          </View>,
          <Text key="b" className={cn(g.dms, g.bhava)} style={nepaliTextStyle(11)}>
            {row.bhava}
          </Text>,
          <View key="nak" className="flex-row items-center gap-1.5">
            <NakshatraGlyphIcon name={row.nakshatraNe} number={row.nakshatraIndex + 1} size={16} />
            <Text className="text-sm text-foreground" style={nepaliTextStyle(11)} numberOfLines={1}>
              {row.nakName} {row.pada}
            </Text>
          </View>,
          <View key="ls" className="flex-row items-center gap-0.5">
            <GrahaInline grahaKey={row.nakLord.key} label={row.nakLord.name} size={14} textSize={11} />
            <Text style={nepaliTextStyle(11)}>/</Text>
            <GrahaInline grahaKey={row.subLord.key} label={row.subLord.name} size={14} textSize={11} />
          </View>,
          <GrahaInline
            key="o"
            grahaKey={row.owner.key}
            label={row.owner.bhava != null ? `${row.owner.name} ${row.owner.bhava}` : row.owner.name}
            size={14}
            textSize={11}
          />,
          row.relation,
          row.dignity,
          row.rules,
        ],
      }))}
    />
  );
}
