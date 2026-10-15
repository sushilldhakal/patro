import type { ReactNode } from "react";
import { View } from "react-native";
import Svg, { G, Line, Polygon, Rect, Text as SvgText } from "react-native-svg";
import { useColorScheme } from "nativewind";
import { Box, Icon, Pressable, Text } from "@vedic-patro/ui";
import { cn } from "@vedic-patro/domain/utils";
import { brand, mobileRoles } from "@vedic-patro/design-tokens";
import { kundaliDetailClasses as k } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";
import { clampPct, type StrengthBand } from "@vedic-patro/domain/kundali/bhava-bala-chart";
import { useBhavaBalaChart, useShadbalaChart, type BhavaBalaTone, type ShadbalaMeterRow } from "@vedic-patro/features/kundali";
import { columnStack } from "../column-stack";
import type { BhavaBalaChartProps, ShadbalaChartProps } from "../contract";
import { iconCheck, iconChevronLeft, iconChevronRight, iconX } from "../icons";

const BRAND_FILL: Record<string, string> = {
  "var(--brand-saffron)": brand.saffron,
  "var(--brand-saffron-bright)": brand.saffronBright,
  "var(--brand-green)": brand.green,
  "var(--brand-blue)": brand.blue,
  "var(--brand-vermilion)": brand.vermilion,
  "var(--brand-gold)": brand.gold,
};

function ink(color: string): string {
  return BRAND_FILL[color] ?? color;
}

const SUB_COLOR = { sthana: brand.saffron, kala: brand.blue } as const;

const TONE_BAR: Record<BhavaBalaTone, string> = {
  primary: k.bhavaChart.barPrimary,
  secondary: k.bhavaChart.barSecondary,
  accent: k.bhavaChart.barAccent,
};

const BAND_DOT: Record<StrengthBand, string> = {
  strong: k.bhavaChart.barPrimary,
  average: "bg-muted-foreground",
  weak: "bg-destructive",
};

function useRoles() {
  const { colorScheme } = useColorScheme();
  return mobileRoles(colorScheme === "dark" ? "dark" : "light");
}

/** react-native-svg's web typings (what app `tsc` resolves) reject `onPress`. */
function svgPress(handler: () => void): any {
  return handler;
}

function ColorMeter({ value, max, color }: { value: number; max: number; color: string }) {
  const width = max <= 0 ? 0 : Math.min(100, Math.max(0, (Math.abs(value) / max) * 100));
  return (
    <Box className={cn(k.shadbalaChart.meter, "flex-1")}>
      <Svg width="100%" height="100%" viewBox="0 0 100 8" preserveAspectRatio="none">
        <Rect x={0} y={0} width={width} height={8} fill={ink(color)} />
      </Svg>
    </Box>
  );
}

function ClassMeter({ value, max, className }: { value: number; max: number; className: string }) {
  return (
    <Box className={k.bhavaChart.meter}>
      <Box className={cn(k.bhavaChart.meterFill, className)} widthPercent={clampPct(Math.abs(value), max)} />
    </Box>
  );
}

type ShadbalaView = ReturnType<typeof useShadbalaChart>;
type Column = ShadbalaView["columns"][number];

export function ShadbalaChart({ planets, selectedKey, onSelect, yuddha, scale, onScaleChange, renderGraha }: ShadbalaChartProps) {
  const roles = useRoles();
  const chart = useShadbalaChart({ planets, selectedKey, yuddha, scale });
  return (
    <Box className={k.shadbalaChart.root}>
      <Box className={k.shadbalaChart.headRow}>
        <Box>
          <Text as="h3" className={k.shadbalaChart.title}>{chart.title}</Text>
          <Text as="p" className={k.shadbalaChart.hint}>{chart.hint}</Text>
        </Box>
        <Box className={cn(k.shadbalaChart.scaleBar, "self-start")}>
          {chart.scales.map((item) => (
            <Pressable key={item.id} role="tab" selected={item.active} onPress={() => onScaleChange(item.id)} className={cn(k.shadbalaChart.scaleTab, item.active && k.shadbalaChart.scaleActive)}>
              <Text className={cn(k.shadbalaChart.scaleText, item.active ? k.shadbalaChart.scaleActiveText : k.shadbalaChart.scaleIdleText)}>{item.label}</Text>
            </Pressable>
          ))}
        </Box>
      </Box>

      <Box className={k.shadbalaChart.panel}>
        <Box nativeClassName="flex-row" className="gap-2">
          <View className="relative mt-6" style={{ width: 40, height: 256 }}>
            {chart.ticks.map((tick) => (
              <View key={tick.key} className="absolute right-0" style={{ bottom: `${tick.pct}%`, transform: [{ translateY: 6 }] }}>
                <Text numberOfLines={1} className={k.shadbalaChart.axisLabel}>{tick.label}</Text>
              </View>
            ))}
          </View>
          <Box className="min-w-0 flex-1">
            <View className="relative mt-6" style={{ height: 256 }}>
              {chart.ticks.map((tick) => (
                <View key={`grid-${tick.key}`} className="absolute inset-x-0 border-t border-border/60" style={{ bottom: `${tick.pct}%` }} />
              ))}
              <Box className="absolute inset-0" nativeClassName="flex-row" >
                {chart.columns.map((column) => (
                  <PlanetColumn key={column.key} chart={chart} column={column} accent={roles.accent} onSelect={() => onSelect(column.key)} />
                ))}
              </Box>
            </View>
            <Box className="mt-2" nativeClassName="flex-row">
              {chart.columns.map((column) => (
                <Pressable key={column.key} onPress={() => onSelect(column.key)} className="min-w-0 flex-1 items-center gap-0.5">
                  {renderGraha({ graha: column.key, size: 18 })}
                  <Text numberOfLines={1} className={k.shadbalaChart.barLabel}>{column.name}</Text>
                </Pressable>
              ))}
            </Box>
          </Box>
        </Box>
        <Box className={k.shadbalaChart.legend}>
          {chart.legend.map((bala) => (
            <Box key={bala.key} className={k.shadbalaChart.legendItem}>
              <Svg width={10} height={10} viewBox="0 0 10 10">
                <Rect width={10} height={10} fill={ink(bala.color)} />
              </Svg>
              <Text className={k.shadbalaChart.legendText}>{bala.label}</Text>
            </Box>
          ))}
          <Box className={k.shadbalaChart.legendItem}>
            <View style={{ width: 16, borderTopWidth: 1, borderStyle: "dashed", borderTopColor: roles.accent }} />
            <Text className={k.shadbalaChart.legendText}>{chart.requiredLabel}</Text>
          </Box>
        </Box>
      </Box>

      <Box>
        <Text as="p" className={k.shadbalaChart.pickLabel}>{chart.pickLabel}</Text>
        <Box className={k.shadbalaChart.pickRow}>
          {chart.columns.map((column) => (
            <Pressable
              key={column.key}
              role="tab"
              selected={column.selected}
              onPress={() => onSelect(column.key)}
              className={cn(k.shadbalaChart.pickChip, column.selected ? k.shadbalaChart.pickActive : k.shadbalaChart.pickIdle)}
            >
              {renderGraha({ graha: column.key, size: 16 })}
              <Text className={cn(k.shadbalaChart.pickChipText, column.selected ? k.shadbalaChart.pickActiveText : k.shadbalaChart.pickIdleText)}>{column.name}</Text>
            </Pressable>
          ))}
        </Box>
      </Box>

      {chart.inspector ? <PlanetInspector inspector={chart.inspector} renderGraha={renderGraha} /> : null}
    </Box>
  );
}

function PlanetColumn({ chart, column, accent, onSelect }: { chart: ShadbalaView; column: Column; accent: string; onSelect: () => void }) {
  const rects = columnStack(column.segments);
  return (
    <Pressable onPress={onSelect} selected={column.selected} label={`${column.name}, ${column.value}`} className="relative min-w-0 flex-1">
      {column.selected ? <View className="absolute bottom-0 top-0 rounded-sm border-2 border-primary" style={{ left: "12%", right: "12%" }} /> : null}
      <View style={{ position: "absolute", left: "12%", right: "12%", bottom: 0, height: `${column.columnPct}%` }}>
        <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
          {rects.map((rect) => (
            <Rect key={rect.key} x={0} y={rect.y} width={100} height={Math.max(rect.height, 0)} fill={ink(rect.color)} />
          ))}
        </Svg>
      </View>
      <View className="absolute items-center" style={{ left: 0, right: 0, bottom: `${column.columnPct}%`, transform: [{ translateY: -16 }] }}>
        <Box nativeClassName="flex-row" className="items-center gap-0.5">
          <Text numberOfLines={1} className="font-mono text-xs font-semibold text-foreground">{column.value}</Text>
          <Icon node={column.meets ? iconCheck : iconX} size={12} tone={column.meets ? "primary" : "destructive"} label={column.meets ? chart.meetsLabel : chart.belowLabel} />
        </Box>
      </View>
      {column.requiredPct != null ? (
        <View style={{ position: "absolute", left: "4%", right: "4%", bottom: `${column.requiredPct}%`, borderTopWidth: 1, borderStyle: "dashed", borderTopColor: accent }} />
      ) : null}
    </Pressable>
  );
}

function PlanetInspector({ inspector, renderGraha }: { inspector: NonNullable<ShadbalaView["inspector"]>; renderGraha: ShadbalaChartProps["renderGraha"] }) {
  return (
    <Box className={k.shadbalaChart.inspector}>
      <Box className={k.shadbalaChart.inspectorHead}>
        <Box className={k.shadbalaChart.inspectorTitleRow}>
          {renderGraha({ graha: inspector.key, size: 22 })}
          <Text className={k.shadbalaChart.inspectorTitle}>{inspector.name}</Text>
        </Box>
        <Text className={cn(k.shadbalaChart.inspectorValue, inspector.meets ? k.shadbalaChart.inspectorMeets : k.shadbalaChart.inspectorBelow)}>{inspector.value}</Text>
      </Box>
      <Box className={k.shadbalaChart.breakdown}>
        {inspector.breakdown.map((bala) => (
          <Box key={bala.key} className={k.shadbalaChart.breakdownRow}>
            <Text numberOfLines={1} className={cn(k.shadbalaChart.breakdownLabel, "w-24")}>{bala.label}</Text>
            <ColorMeter value={bala.value} max={inspector.breakdownMax} color={bala.color} />
            <Text className={cn(k.shadbalaChart.breakdownValue, "w-14")}>{bala.display}</Text>
          </Box>
        ))}
      </Box>
      {inspector.subs ? (
        <Box className="gap-4">
          {inspector.subs.map((sub) => (
            <SubBalaList key={sub.key} title={sub.title} rows={sub.rows} max={sub.max} color={SUB_COLOR[sub.key]} />
          ))}
        </Box>
      ) : null}
    </Box>
  );
}

function SubBalaList({ title, rows, max, color }: { title: string; rows: ShadbalaMeterRow[]; max: number; color: string }) {
  return (
    <Box>
      <Text as="p" className={k.shadbalaChart.subTitle}>{title}</Text>
      <Box className={k.shadbalaChart.subRows}>
        {rows.map((row) => (
          <Box key={row.key} className={k.shadbalaChart.breakdownRow}>
            <Text numberOfLines={1} className={cn(k.shadbalaChart.subLabel, "w-24")}>{row.label}</Text>
            <ColorMeter value={row.value} max={max} color={color} />
            <Text className={cn(k.shadbalaChart.subValue, "w-12")}>{row.display}</Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

type BhavaView = ReturnType<typeof useBhavaBalaChart>;

const BAND_ROLE: Record<StrengthBand, "primary" | "mutedForeground" | "destructive"> = {
  strong: "primary",
  average: "mutedForeground",
  weak: "destructive",
};

export function BhavaBalaChart(props: BhavaBalaChartProps) {
  const chart = useBhavaBalaChart(props);
  return (
    <Box className={k.bhavaChart.root}>
      <Box>
        <Text as="h3" className={k.bhavaChart.title}>{chart.title}</Text>
        <Text as="p" className={k.prose.mutedMt1}>{chart.hint}</Text>
      </Box>
      <BhavaDiamond chart={chart} />
      <HouseInspector inspector={chart.inspector} renderGraha={props.renderGraha} />
      <Box className={k.bhavaChart.legend}>
        {chart.legend.map((item) => (
          <Box key={item.band} className={k.bhavaChart.swatch}>
            <Box className={cn(k.bhavaChart.swatchDot, BAND_DOT[item.band])} />
            <Text className={k.bhavaChart.legendText}>{item.label}</Text>
          </Box>
        ))}
      </Box>
      <Text as="p" className={k.prose.muted}>{chart.legendNote}</Text>
    </Box>
  );
}

function BhavaDiamond({ chart }: { chart: BhavaView }) {
  const roles = useRoles();
  return (
    <Box className={k.bhavaChart.panel}>
      <View className="aspect-square w-full">
        <Svg width="100%" height="100%" viewBox="0 0 300 300" accessibilityLabel={chart.chartLabel}>
          <Rect x={0} y={0} width={300} height={300} rx={4} fill={roles.background} stroke={roles.border} strokeWidth={1.5} />
          <Line x1={0} y1={0} x2={300} y2={300} stroke={roles.border} strokeWidth={1.25} strokeOpacity={0.8} />
          <Line x1={300} y1={0} x2={0} y2={300} stroke={roles.border} strokeWidth={1.25} strokeOpacity={0.8} />
          <Polygon points="150,0 300,150 150,300 0,150" fill="none" stroke={roles.border} strokeWidth={1.25} strokeOpacity={0.8} />
          {chart.cells.map((cell) => (
            <G key={cell.house} accessibilityLabel={cell.label}>
              <Polygon points={cell.points} fill={cell.selected ? roles.primary : "transparent"} fillOpacity={cell.selected ? 0.2 : 0} onPress={svgPress(cell.select)} />
              {cell.selected ? <Polygon points={cell.points} fill="none" stroke={roles.primary} strokeWidth={1.6} /> : null}
              <SvgText x={cell.numberPos.x} y={cell.numberPos.y} textAnchor="middle" fill={roles.mutedForeground} fontSize={11} fontWeight="600" onPress={svgPress(cell.select)}>
                {cell.number}
              </SvgText>
              <SvgText x={cell.center.x} y={cell.center.y + 4} textAnchor="middle" fill={roles[BAND_ROLE[cell.band]]} fontSize={16} fontWeight="700" onPress={svgPress(cell.select)}>
                {cell.score}
              </SvgText>
            </G>
          ))}
        </Svg>
      </View>
    </Box>
  );
}

function HouseInspector({ inspector: h, renderGraha }: { inspector: BhavaView["inspector"]; renderGraha: BhavaBalaChartProps["renderGraha"] }) {
  return (
    <Box className={k.bhavaChart.inspector}>
      <Box className={k.bhavaChart.inspectorHead}>
        <Box className="min-w-0 flex-1">
          <Box nativeClassName="flex-row" className="items-center gap-2">
            <Box className={k.bhavaChart.houseNum}>
              <Text className={k.bhavaChart.houseNumText}>{h.number}</Text>
            </Box>
            <Text className={k.bhavaChart.houseTitle}>{h.rashiName}</Text>
          </Box>
          {h.classical ? <Text className={k.bhavaChart.classical}>{h.classical}</Text> : null}
        </Box>
        <Box className={k.bhavaChart.navRow}>
          <Pressable label={h.prevLabel} onPress={h.prev} className="size-8 items-center justify-center rounded-md border border-border">
            <Icon node={iconChevronLeft} size={16} />
          </Pressable>
          <Pressable label={h.nextLabel} onPress={h.next} className="size-8 items-center justify-center rounded-md border border-border">
            <Icon node={iconChevronRight} size={16} />
          </Pressable>
        </Box>
      </Box>
      <Box className={k.bhavaChart.metaRow}>
        <Text className={k.bhavaChart.metaText}>{h.ruledBy}</Text>
        {renderGraha({ graha: h.lordKey, size: 18 })}
        <Text className={k.prose.strong}>{h.lordName}</Text>
        {h.classes ? <Text className={k.bhavaChart.metaText}>· {h.classes}</Text> : null}
        <Text className={k.bhavaChart.metaText}>· {h.rank}</Text>
        <StrengthBadge badge={h.badge} />
      </Box>
      <Box>
        <Box className={k.bhavaChart.scoreHead}>
          <Text as="p" className={k.prose.heading}>{h.scoreTitle}</Text>
          <Text as="p" className={cn(k.bhavaChart.score, h.band === "strong" ? k.bhavaChart.scoreStrong : h.band === "weak" ? k.bhavaChart.scoreWeak : k.bhavaChart.scoreAvg)}>{h.score}</Text>
        </Box>
        <ClassMeter value={h.totalPinda} max={h.totalScale} className={k.bhavaChart.barPrimary} />
      </Box>
      <Box nativeClassName="flex-row" className="gap-2">
        {h.tiles.map((tile) => (
          <Box key={tile.key} className={cn(k.bhavaChart.tile, "flex-1")}>
            <Text numberOfLines={1} className={k.bhavaChart.tileLabel}>{tile.label}</Text>
            <Text numberOfLines={1} className={k.bhavaChart.tileValue}>{tile.display}</Text>
            <Box className={k.bhavaChart.tileMeter}>
              <ClassMeter value={tile.value} max={tile.max} className={TONE_BAR[tile.tone]} />
            </Box>
          </Box>
        ))}
      </Box>
      <Box className="gap-4">
        <Box>
          <Text as="p" className={k.bhavaChart.groupLabel}>{h.signifiesLabel}</Text>
          <Box className={k.bhavaChart.chips}>
            {h.signifies.length > 0 ? h.signifies.map((item) => <Chip key={item}>{item}</Chip>) : <Text className={k.prose.muted}>—</Text>}
          </Box>
        </Box>
        <Box>
          <Text as="p" className={k.bhavaChart.groupLabel}>{h.occupantsLabel}</Text>
          {h.occupants.length > 0 ? (
            <Box className={k.bhavaChart.chips}>
              {h.occupants.map((planet) => (
                <Chip key={planet.key}>
                  {renderGraha({ graha: planet.key, size: 16 })}
                  <Text className={k.bhavaChart.chipText}>{planet.name}</Text>
                </Chip>
              ))}
            </Box>
          ) : (
            <Text className={k.prose.muted}>{h.noOccupants}</Text>
          )}
        </Box>
      </Box>
    </Box>
  );
}

function StrengthBadge({ badge }: { badge: BhavaView["inspector"]["badge"] }) {
  const box = badge.tone === "good" ? k.bhavaChart.badgeGood : badge.tone === "weak" ? k.bhavaChart.badgeWeak : k.bhavaChart.badgeAvg;
  const text = badge.tone === "good" ? k.bhavaChart.badgeGoodText : badge.tone === "weak" ? k.bhavaChart.badgeWeakText : k.bhavaChart.badgeAvgText;
  return (
    <Box className={cn(k.bhavaChart.badge, box)}>
      <Text className={cn(k.bhavaChart.badgeText, text)}>{badge.label}</Text>
    </Box>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <Box className={k.bhavaChart.chip}>
      {typeof children === "string" ? <Text className={k.bhavaChart.chipText}>{children}</Text> : children}
    </Box>
  );
}
