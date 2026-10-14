import { useMemo, useState, type ReactNode } from "react";
import { Pressable, View, type ViewStyle } from "react-native";
import { Text } from "@/components/ui/Text";
import { GrahaInline } from "@/components/kundali/KundaliGlyphLabels";
import { BhavaBalaChart } from "@/components/kundali/BhavaBalaChart";
import { DataTable, type Column } from "@/components/ui/DataTable";
import type { BhavaBalaData, VargaCharts } from "@/lib/api";
import { useBhavaBalaSelection, useBhavaBalaTable } from "@vedic-patro/features/kundali";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useBreakpoint } from "@/lib/responsive";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";

const GLANCE_GAP = 8;
/** Column widths, in the order of `columns` from the hook. */
const COLUMN_WIDTHS = [72, 108, 88, 64, 64, 80, 72];

function glanceTileLayout(contentWidth: number, twoCol: boolean): ViewStyle {
  if (!twoCol) return { width: "100%" };
  if (contentWidth <= 0) return { flexBasis: "48%", flexGrow: 1, minWidth: 160 };
  const w = Math.floor((contentWidth - GLANCE_GAP) / 2);
  return { width: w };
}

function GlanceTile({
  label,
  children,
  layout,
}: {
  label: string;
  children: ReactNode;
  layout: ViewStyle;
}) {
  return (
    <View style={layout} className={kundaliDetailClasses.glance.card}>
      <Text className={kundaliDetailClasses.glance.label} style={nepaliTextStyle(11)}>
        {label}
      </Text>
      {children}
    </View>
  );
}

export function BhavaBalaCard({
  data,
  compactHeader = false,
  vargaCharts,
  combustion,
}: {
  data: BhavaBalaData;
  compactHeader?: boolean;
  vargaCharts?: VargaCharts;
  combustion?: Record<string, boolean | null>;
}) {
  const { selectedHouse, selectHouse } = useBhavaBalaSelection(data);
  const table = useBhavaBalaTable(data);
  const { width: windowWidth } = useBreakpoint();
  const [contentWidth, setContentWidth] = useState(0);
  const effectiveWidth = contentWidth || windowWidth;
  const twoGlanceCols = effectiveWidth >= 400;
  const tileLayout = useMemo(
    () => glanceTileLayout(contentWidth || effectiveWidth, twoGlanceCols),
    [contentWidth, effectiveWidth, twoGlanceCols],
  );

  const columns: Column[] = table.columns.map((c, i) => ({ key: c.key, ne: c.label, en: c.label, width: COLUMN_WIDTHS[i] ?? 72 }));

  const numCell = (value: string) => (
    <View className="items-end">
      <Text className="font-mono text-sm text-foreground" style={nepaliTextStyle(11)} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );

  const rows = table.rows.map((h) => ({
    key: String(h.house),
    highlight: selectedHouse === h.house,
    cells: [
      <Pressable key="h" onPress={() => selectHouse(h.house)} className="active:opacity-70">
        <Text className={kundaliDetailClasses.prose.heading} style={nepaliTextStyle(11)} numberOfLines={1}>
          {h.label}
        </Text>
      </Pressable>,
      <View key="l" className="items-end">
        <GrahaInline grahaKey={h.lordKey} label={h.lordName} size={18} textSize={11} />
      </View>,
      numCell(h.bhavadhipati),
      numCell(h.disha),
      numCell(h.drishti),
      numCell(h.totalPinda),
      numCell(h.percent),
    ],
  }));

  return (
    <View
      className="gap-4"
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0 && Math.abs(w - contentWidth) > 1) setContentWidth(w);
      }}
    >
      <BhavaBalaChart
        data={data}
        selectedHouse={selectedHouse}
        onSelectHouse={selectHouse}
        vargaCharts={vargaCharts}
        combustion={combustion}
      />

      {!compactHeader ? (
        <Text className={kundaliDetailClasses.glance.heading} style={nepaliTextStyle(13)}>
          {table.title}
        </Text>
      ) : null}
      <Text className={kundaliDetailClasses.glance.intro} style={nepaliTextStyle(12)}>
        {table.intro}
      </Text>

      <View className="flex-row flex-wrap" style={{ gap: GLANCE_GAP }}>
        {[table.strongest, table.weakest].map((s) => (
          <GlanceTile key={s.label} layout={tileLayout} label={s.label}>
            <Text className={kundaliDetailClasses.glance.name} style={nepaliTextStyle(17)}>
              {s.name}
            </Text>
            <Text className={kundaliDetailClasses.glance.subTight} style={nepaliTextStyle(11)}>
              {s.lordLabel} {s.lordName} · {s.percent}
            </Text>
          </GlanceTile>
        ))}
      </View>

      <DataTable compact stretch columns={columns} rows={rows} />
    </View>
  );
}
