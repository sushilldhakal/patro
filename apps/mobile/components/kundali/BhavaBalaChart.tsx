import { cn } from "@vedic-patro/domain/utils";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";
import { Pressable, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import Svg, { G, Line, Polygon, Rect, Text as SvgText } from "react-native-svg";
import { Text } from "@/components/ui/Text";
import { GrahaInline } from "@/components/kundali/KundaliGlyphLabels";
import type { BhavaBalaData, VargaCharts } from "@/lib/api";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";
import { type StrengthBand, clampPct } from "@vedic-patro/domain/kundali/bhava-bala-chart";
import { useBhavaBalaChart, type BhavaBalaTone } from "@vedic-patro/features/kundali";
import { colorWithAlpha } from "@/lib/theme";

type Chart = ReturnType<typeof useBhavaBalaChart>;

const TONE_BAR: Record<BhavaBalaTone, string> = {
  primary: kundaliDetailClasses.bhavaChart.barPrimary,
  secondary: kundaliDetailClasses.bhavaChart.barSecondary,
  accent: kundaliDetailClasses.bhavaChart.barAccent,
};

const BAND_COLOR: Record<StrengthBand, "primary" | "mutedForeground" | "destructive"> = {
  strong: "primary",
  average: "mutedForeground",
  weak: "destructive",
};

/**
 * Under plain `tsc` this project's `moduleSuffixes` (".web" first) resolves
 * react-native-svg's *web* type declarations even for this native-only file,
 * and those describe `onPress` with a broken, un-satisfiable intersection
 * type. Casting here is the narrow, contained workaround, mirroring D1Chart.
 */
function svgOnPress(handler: (() => void) | undefined): any {
  return handler;
}

function Meter({ value, max, color }: { value: number; max: number; color: string }) {
  const width = clampPct(Math.abs(value), max);
  return (
    <View className={kundaliDetailClasses.bhavaChart.meter}>
      <View style={{ width: `${width}%` }} className={cn(kundaliDetailClasses.bhavaChart.meterFill, color)} />
    </View>
  );
}

function ComponentTile({ tile }: { tile: Chart["inspector"]["tiles"][number] }) {
  return (
    <View className={cn(kundaliDetailClasses.bhavaChart.tile, "flex-1")}>
      <Text className={kundaliDetailClasses.bhavaChart.tileLabel} style={nepaliTextStyle(10)} numberOfLines={1}>
        {tile.label}
      </Text>
      <Text className={kundaliDetailClasses.bhavaChart.tileValue} numberOfLines={1}>
        {tile.display}
      </Text>
      <View className={kundaliDetailClasses.bhavaChart.tileMeter}>
        <Meter value={tile.value} max={tile.max} color={TONE_BAR[tile.tone]} />
      </View>
    </View>
  );
}

function StrengthBadge({ badge }: { badge: Chart["inspector"]["badge"] }) {
  const box = badge.tone === "good" ? kundaliDetailClasses.bhavaChart.badgeGood : badge.tone === "weak" ? kundaliDetailClasses.bhavaChart.badgeWeak : kundaliDetailClasses.bhavaChart.badgeAvg;
  const text = badge.tone === "good" ? kundaliDetailClasses.bhavaChart.badgeGoodText : badge.tone === "weak" ? kundaliDetailClasses.bhavaChart.badgeWeakText : kundaliDetailClasses.bhavaChart.badgeAvgText;
  return (
    <View className={cn(kundaliDetailClasses.bhavaChart.badge, box)}>
      <Text className={cn(kundaliDetailClasses.bhavaChart.badgeText, text)}>{badge.label}</Text>
    </View>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <View className={kundaliDetailClasses.bhavaChart.chip}>{children}</View>;
}

export function BhavaBalaChart(props: {
  data: BhavaBalaData;
  selectedHouse: number;
  onSelectHouse: (house: number) => void;
  vargaCharts?: VargaCharts;
  combustion?: Record<string, boolean | null>;
}) {
  const chart = useBhavaBalaChart(props);

  return (
    <View className={kundaliDetailClasses.bhavaChart.root}>
      <View>
        <Text className={kundaliDetailClasses.bhavaChart.title} style={nepaliTextStyle(15)}>
          {chart.title}
        </Text>
        <Text className={kundaliDetailClasses.prose.mutedMt1} style={nepaliTextStyle(13)}>
          {chart.hint}
        </Text>
      </View>

      <BhavaDiamond chart={chart} />

      <HouseInspector inspector={chart.inspector} />

      <View className={kundaliDetailClasses.bhavaChart.legend}>
        {chart.legend.map((item) => (
          <LegendSwatch key={item.band} colorToken={BAND_COLOR[item.band]} label={item.label} />
        ))}
      </View>
      <Text className={kundaliDetailClasses.prose.muted} style={nepaliTextStyle(12)}>
        {chart.legendNote}
      </Text>
    </View>
  );
}

function LegendSwatch({ colorToken, label }: { colorToken: "primary" | "mutedForeground" | "destructive"; label: string }) {
  const colors = useThemeColors();
  return (
    <View className={kundaliDetailClasses.bhavaChart.swatch}>
      <View className={kundaliDetailClasses.bhavaChart.swatchDot} style={{ backgroundColor: colors[colorToken] }} />
      <Text className={kundaliDetailClasses.prose.muted} style={nepaliTextStyle(12)}>
        {label}
      </Text>
    </View>
  );
}

function BhavaDiamond({ chart }: { chart: Chart }) {
  const colors = useThemeColors();

  return (
    <View className={kundaliDetailClasses.bhavaChart.panel}>
      <View className="w-full items-center" style={{ width: "100%", aspectRatio: 1 }}>
        <Svg width="100%" height="100%" viewBox="0 0 300 300" accessibilityLabel={chart.chartLabel}>
          <Rect x={0} y={0} width={300} height={300} rx={4} fill={colors.background} stroke={colors.border} strokeWidth={1.5} />
          <Line x1={0} y1={0} x2={300} y2={300} stroke={colors.border} strokeWidth={1.25} opacity={0.8} />
          <Line x1={300} y1={0} x2={0} y2={300} stroke={colors.border} strokeWidth={1.25} opacity={0.8} />
          <Polygon points="150,0 300,150 150,300 0,150" fill="none" stroke={colors.border} strokeWidth={1.25} opacity={0.8} />

          {chart.cells.map((cell) => (
            <G key={cell.house} accessibilityLabel={cell.label}>
              <Polygon
                points={cell.points}
                fill={cell.selected ? colorWithAlpha(colors.primary, 0.2) : "transparent"}
                onPress={svgOnPress(cell.select)}
              />
              {cell.selected ? (
                <Polygon points={cell.points} fill="none" stroke={colors.primary} strokeWidth={1.6} />
              ) : null}
              <SvgText
                x={cell.numberPos.x}
                y={cell.numberPos.y}
                textAnchor="middle"
                fill={colors.mutedForeground}
                fontSize={15}
                fontWeight="600"
                onPress={svgOnPress(cell.select)}
              >
                {cell.number}
              </SvgText>
              <SvgText
                x={cell.center.x}
                y={cell.center.y + 3}
                textAnchor="middle"
                fill={colors[BAND_COLOR[cell.band]]}
                fontSize={18}
                fontWeight="700"
                onPress={svgOnPress(cell.select)}
              >
                {cell.score}
              </SvgText>
            </G>
          ))}
        </Svg>
      </View>
    </View>
  );
}

function HouseInspector({ inspector: h }: { inspector: Chart["inspector"] }) {
  const colors = useThemeColors();

  return (
    <View className={cn(kundaliDetailClasses.bhavaChart.inspector, "rounded-xl border border-border bg-card p-3.5")}>
      <View className={kundaliDetailClasses.bhavaChart.inspectorHead}>
        <View className="min-w-0 flex-1 flex-row flex-wrap items-center gap-1.5">
          <View className={kundaliDetailClasses.bhavaChart.houseNum}>
            <Text className={kundaliDetailClasses.bhavaChart.houseNumText}>{h.number}</Text>
          </View>
          <Text className={kundaliDetailClasses.bhavaChart.houseTitle} style={nepaliTextStyle(18)}>
            {h.rashiName}
          </Text>
          {h.classical ? (
            <Text className={kundaliDetailClasses.bhavaChart.classical} style={nepaliTextStyle(14)}>
              · {h.classical}
            </Text>
          ) : null}
        </View>
        <View className={kundaliDetailClasses.bhavaChart.navRow}>
          <Pressable
            onPress={h.prev}
            accessibilityRole="button"
            accessibilityLabel={h.prevLabel}
            className="h-8 w-8 items-center justify-center rounded-lg border border-border active:opacity-70"
          >
            <Ionicons name="chevron-back" size={16} color={colors.foreground} />
          </Pressable>
          <Pressable
            onPress={h.next}
            accessibilityRole="button"
            accessibilityLabel={h.nextLabel}
            className="h-8 w-8 items-center justify-center rounded-lg border border-border active:opacity-70"
          >
            <Ionicons name="chevron-forward" size={16} color={colors.foreground} />
          </Pressable>
        </View>
      </View>

      <View className={kundaliDetailClasses.bhavaChart.metaRow}>
        <Text className={kundaliDetailClasses.prose.muted} style={nepaliTextStyle(12)}>
          {h.ruledBy}
        </Text>
        <GrahaInline grahaKey={h.lordKey} label={h.lordName} size={16} textSize={12} />
        {h.classes ? (
          <Text className={kundaliDetailClasses.prose.muted} style={nepaliTextStyle(12)}>
            · {h.classes}
          </Text>
        ) : null}
        <Text className={kundaliDetailClasses.prose.muted} style={nepaliTextStyle(12)}>
          · {h.rank}
        </Text>
        <StrengthBadge badge={h.badge} />
      </View>

      <View>
        <View className={kundaliDetailClasses.bhavaChart.scoreHead}>
          <Text className={kundaliDetailClasses.prose.heading} style={nepaliTextStyle(13)}>
            {h.scoreTitle}
          </Text>
          <Text
            className={cn(kundaliDetailClasses.bhavaChart.score, h.band === "strong" ? kundaliDetailClasses.bhavaChart.scoreStrong : h.band === "weak" ? kundaliDetailClasses.bhavaChart.scoreWeak : kundaliDetailClasses.bhavaChart.scoreAvg)}
          >
            {h.score}
          </Text>
        </View>
        <View className={kundaliDetailClasses.bhavaChart.tileMeter}>
          <Meter value={h.totalPinda} max={h.totalScale} color={kundaliDetailClasses.bhavaChart.barPrimary} />
        </View>
      </View>

      <View className="flex-row gap-2">
        {h.tiles.map((tile) => (
          <ComponentTile key={tile.key} tile={tile} />
        ))}
      </View>

      <View className="gap-3">
        <View>
          <Text className={kundaliDetailClasses.bhavaChart.groupLabel} style={nepaliTextStyle(10)}>
            {h.signifiesLabel}
          </Text>
          {h.signifies.length > 0 ? (
            <View className={kundaliDetailClasses.bhavaChart.chips}>
              {h.signifies.map((item) => (
                <Chip key={item}>
                  <Text className={kundaliDetailClasses.bhavaChart.chipText} style={nepaliTextStyle(12)}>
                    {item}
                  </Text>
                </Chip>
              ))}
            </View>
          ) : (
            <Text className={kundaliDetailClasses.prose.muted}>—</Text>
          )}
        </View>
        <View>
          <Text className={kundaliDetailClasses.bhavaChart.groupLabel} style={nepaliTextStyle(10)}>
            {h.occupantsLabel}
          </Text>
          {h.occupants.length > 0 ? (
            <View className={kundaliDetailClasses.bhavaChart.chips}>
              {h.occupants.map((planet) => (
                <Chip key={planet.key}>
                  <GrahaInline grahaKey={planet.key} label={planet.name} size={14} textSize={12} />
                </Chip>
              ))}
            </View>
          ) : (
            <Text className={kundaliDetailClasses.prose.muted} style={nepaliTextStyle(12)}>
              {h.noOccupants}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}
