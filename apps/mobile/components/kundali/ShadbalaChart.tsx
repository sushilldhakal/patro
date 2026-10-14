import { Pressable, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { Text } from "@/components/ui/Text";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import type { ShadbalaPlanet, YuddhaData } from "@/lib/api";
import type { GrahaKey } from "@vedic-patro/domain/graha-details";
import { useShadbalaChart, type ShadbalaMeterRow } from "@vedic-patro/features/kundali";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";
import { colorWithAlpha } from "@/lib/theme";
import { brand, radius } from "@vedic-patro/design-tokens";
import type { ShadbalaScale } from "@vedic-patro/domain/kundali/shadbala-chart";
import { cn } from "@vedic-patro/domain/utils";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";
export { type ShadbalaScale } from "@vedic-patro/domain/kundali/shadbala-chart";

type Chart = ReturnType<typeof useShadbalaChart>;

const CHART_HEIGHT = 220;
const SUB_COLOR = { sthana: brand.saffron, kala: brand.blue } as const;

function Meter({ value, max, color }: { value: number; max: number; color: string }) {
  const width = max <= 0 ? 0 : Math.min(100, Math.max(0, (Math.abs(value) / max) * 100));
  return (
    <View className={cn(kundaliDetailClasses.shadbalaChart.meter, "flex-1")}>
      <View style={{ width: `${width}%`, backgroundColor: color }} className={kundaliDetailClasses.shadbalaChart.meterFill} />
    </View>
  );
}

export function ShadbalaChart({
  planets,
  selectedKey,
  onSelect,
  yuddha,
  scale,
  onScaleChange,
}: {
  planets: ShadbalaPlanet[];
  selectedKey: string;
  onSelect: (key: string) => void;
  yuddha?: YuddhaData;
  scale: ShadbalaScale;
  onScaleChange: (scale: ShadbalaScale) => void;
}) {
  const colors = useThemeColors();
  const chart = useShadbalaChart({ planets, selectedKey, yuddha, scale });

  return (
    <View className={kundaliDetailClasses.shadbalaChart.root}>
      <View className={kundaliDetailClasses.shadbalaChart.headRow}>
        <View>
          <Text className={kundaliDetailClasses.shadbalaChart.title} style={nepaliTextStyle(15)}>
            {chart.title}
          </Text>
          <Text className={kundaliDetailClasses.shadbalaChart.hint} style={nepaliTextStyle(13)}>
            {chart.hint}
          </Text>
        </View>
        <View className={cn(kundaliDetailClasses.shadbalaChart.scaleBar, "self-start")}>
          {chart.scales.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => onScaleChange(item.id)}
              accessibilityState={{ selected: item.active }}
              className={cn(kundaliDetailClasses.shadbalaChart.scaleTab, "active:opacity-80", item.active && kundaliDetailClasses.shadbalaChart.scaleActive)}
            >
              <Text
                className={cn(kundaliDetailClasses.shadbalaChart.scaleText, item.active ? kundaliDetailClasses.shadbalaChart.scaleActiveText : kundaliDetailClasses.shadbalaChart.scaleIdleText)}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View className={kundaliDetailClasses.shadbalaChart.panel}>
        <View className="flex-row gap-2">
          <View className="mt-6" style={{ width: 32, height: CHART_HEIGHT }}>
            {chart.ticks.map((tick) => (
              <Text
                key={tick.key}
                numberOfLines={1}
                className={cn(kundaliDetailClasses.shadbalaChart.axisLabel, "absolute right-0")}
                style={{ bottom: `${tick.pct}%`, transform: [{ translateY: 6 }] }}
              >
                {tick.label}
              </Text>
            ))}
          </View>
          <View className="flex-1">
            <View style={{ height: CHART_HEIGHT }} className="relative mt-6">
              {chart.ticks.map((tick) => (
                <View
                  key={`grid-${tick.key}`}
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: `${tick.pct}%`,
                    borderTopWidth: 1,
                    borderTopColor: colorWithAlpha(colors.border, 0.6),
                  }}
                />
              ))}
              <View className="absolute inset-0 flex-row gap-1.5 px-0.5">
                {chart.columns.map((column) => (
                  <PlanetColumn
                    key={column.key}
                    chart={chart}
                    column={column}
                    onSelect={() => onSelect(column.key)}
                    colors={colors}
                  />
                ))}
              </View>
            </View>
            <View className="mt-2 flex-row gap-1.5 px-0.5">
              {chart.columns.map((column) => (
                <Pressable
                  key={column.key}
                  onPress={() => onSelect(column.key)}
                  className="min-w-0 flex-1 items-center gap-0.5"
                >
                  <GrahaPlanetIcon graha={column.key as GrahaKey} size={16} />
                  <Text
                    numberOfLines={1}
                    className={cn(kundaliDetailClasses.shadbalaChart.barLabel, "max-w-full")}
                    style={nepaliTextStyle(10)}
                  >
                    {column.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        <View className={kundaliDetailClasses.shadbalaChart.legend}>
          {chart.legend.map((bala) => (
            <View key={bala.key} className={kundaliDetailClasses.shadbalaChart.legendItem}>
              <View className={kundaliDetailClasses.shadbalaChart.legendDot} style={{ backgroundColor: bala.color }} />
              <Text className={kundaliDetailClasses.shadbalaChart.legendText} style={nepaliTextStyle(12)}>
                {bala.label}
              </Text>
            </View>
          ))}
          <View className={kundaliDetailClasses.shadbalaChart.legendItem}>
            <View style={{ width: 16, borderTopWidth: 1, borderStyle: "dashed", borderTopColor: colors.accent }} />
            <Text className={kundaliDetailClasses.shadbalaChart.legendText} style={nepaliTextStyle(12)}>
              {chart.requiredLabel}
            </Text>
          </View>
        </View>
      </View>

      <View>
        <Text className={kundaliDetailClasses.shadbalaChart.pickLabel} style={nepaliTextStyle(10)}>
          {chart.pickLabel}
        </Text>
        <View className={kundaliDetailClasses.shadbalaChart.pickRow}>
          {chart.columns.map((column) => (
            <Pressable
              key={column.key}
              onPress={() => onSelect(column.key)}
              accessibilityState={{ selected: column.selected }}
              className={cn(
                kundaliDetailClasses.shadbalaChart.pickChip,
                "active:opacity-80",
                column.selected ? kundaliDetailClasses.shadbalaChart.pickActive : kundaliDetailClasses.shadbalaChart.pickIdle,
              )}
            >
              <GrahaPlanetIcon graha={column.key as GrahaKey} size={14} />
              <Text
                className={cn(kundaliDetailClasses.shadbalaChart.pickChipText, column.selected ? kundaliDetailClasses.shadbalaChart.pickActiveText : kundaliDetailClasses.shadbalaChart.pickIdleText)}
              >
                {column.name}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {chart.inspector ? <PlanetInspector inspector={chart.inspector} /> : null}
    </View>
  );
}

function PlanetColumn({
  chart,
  column,
  onSelect,
  colors,
}: {
  chart: Chart;
  column: Chart["columns"][number];
  onSelect: () => void;
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <Pressable onPress={onSelect} accessibilityLabel={`${column.name}, ${column.value}`} className="relative min-w-0 flex-1">
      {column.requiredPct != null ? (
        <View
          style={{
            position: "absolute",
            left: -3,
            right: -3,
            bottom: `${column.requiredPct}%`,
            borderTopWidth: 1,
            borderStyle: "dashed",
            borderTopColor: colors.accent,
          }}
        />
      ) : null}
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: `${column.columnPct}%`,
          flexDirection: "column-reverse",
          overflow: "hidden",
          borderRadius: radius.md,
          ...(column.selected ? { borderWidth: 2, borderColor: colors.primary } : null),
        }}
      >
        {column.segments.map((segment) => (
          <View key={segment.key} style={{ flex: segment.value, backgroundColor: segment.color }} />
        ))}
      </View>
      <View
        style={{
          position: "absolute",
          left: -8,
          right: -8,
          bottom: `${column.columnPct}%`,
          alignItems: "center",
          transform: [{ translateY: -16 }],
        }}
      >
        <View className="flex-row items-center gap-0.5">
          <Text numberOfLines={1} className="text-caption font-mono font-semibold text-foreground">
            {column.value}
          </Text>
          <Ionicons
            name={column.meets ? "checkmark" : "close"}
            size={10}
            color={column.meets ? colors.primary : colors.destructive}
            accessibilityLabel={column.meets ? chart.meetsLabel : chart.belowLabel}
          />
        </View>
      </View>
    </Pressable>
  );
}

function PlanetInspector({ inspector }: { inspector: NonNullable<Chart["inspector"]> }) {
  return (
    <View className={kundaliDetailClasses.shadbalaChart.inspector}>
      <View className={kundaliDetailClasses.shadbalaChart.inspectorHead}>
        <View className={kundaliDetailClasses.shadbalaChart.inspectorTitleRow}>
          <GrahaPlanetIcon graha={inspector.key as GrahaKey} size={22} />
          <Text className={kundaliDetailClasses.shadbalaChart.inspectorTitle} style={nepaliTextStyle(15)}>
            {inspector.name}
          </Text>
        </View>
        <Text
          className={cn(kundaliDetailClasses.shadbalaChart.inspectorValue, inspector.meets ? kundaliDetailClasses.shadbalaChart.inspectorMeets : kundaliDetailClasses.shadbalaChart.inspectorBelow)}
        >
          {inspector.value}
        </Text>
      </View>

      <View className={kundaliDetailClasses.shadbalaChart.breakdown}>
        {inspector.breakdown.map((bala) => (
          <View key={bala.key} className={kundaliDetailClasses.shadbalaChart.breakdownRow}>
            <Text className={cn(kundaliDetailClasses.shadbalaChart.breakdownLabel, "w-20 shrink-0")} style={nepaliTextStyle(12)} numberOfLines={1}>
              {bala.label}
            </Text>
            <Meter value={bala.value} max={inspector.breakdownMax} color={bala.color} />
            <Text className={cn(kundaliDetailClasses.shadbalaChart.breakdownValue, "w-14 shrink-0")}>{bala.display}</Text>
          </View>
        ))}
      </View>

      {inspector.subs ? (
        <View className="gap-4">
          {inspector.subs.map((sub) => (
            <SubBalaList key={sub.key} title={sub.title} rows={sub.rows} max={sub.max} color={SUB_COLOR[sub.key]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function SubBalaList({
  title,
  rows,
  max,
  color,
}: {
  title: string;
  rows: ShadbalaMeterRow[];
  max: number;
  color: string;
}) {
  return (
    <View>
      <Text className={kundaliDetailClasses.shadbalaChart.subTitle} style={nepaliTextStyle(10)}>
        {title}
      </Text>
      <View className={kundaliDetailClasses.shadbalaChart.subRows}>
        {rows.map((row) => (
          <View key={row.key} className={kundaliDetailClasses.shadbalaChart.breakdownRow}>
            <Text className={cn(kundaliDetailClasses.shadbalaChart.subLabel, "w-24 shrink-0")} style={nepaliTextStyle(11)} numberOfLines={1}>
              {row.label}
            </Text>
            <Meter value={row.value} max={max} color={color} />
            <Text className={cn(kundaliDetailClasses.shadbalaChart.subValue, "w-12 shrink-0")}>{row.display}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
