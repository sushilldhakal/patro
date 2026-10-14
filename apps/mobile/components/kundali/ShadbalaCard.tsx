import { useMemo, useState, type ReactNode } from "react";
import { Pressable, View, type ViewStyle } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { Text } from "@/components/ui/Text";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import { ShadbalaChart } from "@/components/kundali/ShadbalaChart";
import {
  TableHeader,
  TableHeaderCell,
  TableHeaderLabel,
  TableRow,
  TableScrollShell,
  tableColumnLayout,
} from "@/components/ui/DataTable";
import type { BhavaBalaData, ShadbalaResponse, ShadbalaStatus, YuddhaData } from "@/lib/api";
import type { GrahaKey } from "@vedic-patro/domain/graha-details";
import { useShadbalaCard, type ShadbalaMatrixRow } from "@vedic-patro/features/kundali";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useBreakpoint } from "@/lib/responsive";
import { colorWithAlpha } from "@/lib/theme";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/domain/utils";
import { illustration } from "@vedic-patro/design-tokens";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";

const STATUS_COLORS: Record<ShadbalaStatus, string> = {
  Exceptional: illustration.teal39,
  Strong: illustration.teal48,
  Adequate: illustration.orange50,
  Borderline: illustration.orange53c,
  Weak: illustration.red51,
};

const LABEL_COL = 132;
const PLANET_COL = 88;
const TABLE_STRETCH = true;
const GLANCE_GAP = 8;

/** Glance summary tiles: 4-across → 2 → 1 by available content width. */
function glanceColumnCount(contentWidth: number): 1 | 2 | 4 {
  if (contentWidth >= 840) return 4;
  if (contentWidth >= 420) return 2;
  return 1;
}

function glanceTileLayout(contentWidth: number, cols: 1 | 2 | 4): ViewStyle {
  if (cols === 1) return { width: "100%" };
  if (contentWidth <= 0) {
    return cols === 4
      ? { flexBasis: "23%", flexGrow: 1, minWidth: 150 }
      : { flexBasis: "48%", flexGrow: 1, minWidth: 160 };
  }
  const w = Math.floor((contentWidth - GLANCE_GAP * (cols - 1)) / cols);
  return { width: w };
}

function StatusBadge({ status, label }: { status: ShadbalaStatus; label: string }) {
  const color = STATUS_COLORS[status];
  return (
    <View
      style={{ backgroundColor: colorWithAlpha(color, 0.15), borderColor: colorWithAlpha(color, 0.35) }}
      className={cn(kundaliDetailClasses.parts.pill, "self-end")}
    >
      <Text style={{ color, ...nepaliTextStyle(11) }} className="text-caption font-semibold">
        {label}
      </Text>
    </View>
  );
}

function GlanceTile({ label, children, layout }: { label: string; children: ReactNode; layout: ViewStyle }) {
  return (
    <View style={layout} className={kundaliDetailClasses.glance.card}>
      <Text className={kundaliDetailClasses.glance.label} style={nepaliTextStyle(11)}>
        {label}
      </Text>
      {children}
    </View>
  );
}

function MatrixRow({
  row,
  planetKeys,
  rowIndex,
  selectedKey,
}: {
  row: ShadbalaMatrixRow;
  planetKeys: string[];
  rowIndex: number;
  selectedKey: string;
}) {
  const colors = useThemeColors();
  return (
    <TableRow rowIndex={rowIndex} borderTop>
      <View
        style={{
          ...tableColumnLayout(TABLE_STRETCH, LABEL_COL),
          backgroundColor: row.sub ? colorWithAlpha(colors.muted, 0.35) : undefined,
        }}
        className={row.sub ? "justify-center px-5 py-1.5" : "justify-center px-2.5 py-1.5"}
      >
        {row.expandable ? (
          <Pressable onPress={row.toggle} className="flex-row items-center gap-1 active:opacity-70">
            <Ionicons name={row.open ? "chevron-down" : "chevron-forward"} size={14} color={colors.foreground} />
            <Text className="text-sm font-semibold text-foreground" style={nepaliTextStyle(11)} numberOfLines={2}>
              {row.label}
            </Text>
          </Pressable>
        ) : (
          <Text className={cn("text-sm text-foreground", row.sub ? "" : "font-semibold")} style={nepaliTextStyle(11)} numberOfLines={2}>
            {row.label}
          </Text>
        )}
      </View>
      {row.values.map((value, i) => (
        <View
          key={planetKeys[i]}
          style={{
            ...tableColumnLayout(TABLE_STRETCH, PLANET_COL),
            backgroundColor: selectedKey === planetKeys[i] ? colorWithAlpha(colors.primary, 0.1) : undefined,
          }}
          className="items-end justify-center px-1.5 py-1.5"
        >
          {row.statuses ? (
            <StatusBadge status={row.statuses[i]!} label={value} />
          ) : (
            <Text
              className={cn("font-mono text-sm text-foreground", row.bold ? "font-semibold" : "text-foreground/90")}
              style={nepaliTextStyle(11)}
              numberOfLines={1}
            >
              {value}
            </Text>
          )}
        </View>
      ))}
    </TableRow>
  );
}

export function ShadbalaCard({
  data,
  yuddha,
  bhavaBala,
  compactHeader = false,
}: {
  data: ShadbalaResponse;
  yuddha?: YuddhaData;
  bhavaBala?: BhavaBalaData | null;
  /** When true, omit in-card title (parent KundaliSection already shows it). */
  compactHeader?: boolean;
}) {
  const colors = useThemeColors();
  const { width: windowWidth } = useBreakpoint();
  const [contentWidth, setContentWidth] = useState(0);
  const card = useShadbalaCard({ data, yuddha, bhavaBala });
  const planetKeys = card.planets.map((p) => p.key);

  const effectiveWidth = contentWidth || windowWidth;
  const glanceCols = useMemo(() => glanceColumnCount(effectiveWidth), [effectiveWidth]);
  const tileLayout = useMemo(() => glanceTileLayout(contentWidth || effectiveWidth, glanceCols), [contentWidth, effectiveWidth, glanceCols]);

  return (
    <View
      className="gap-5"
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0 && Math.abs(w - contentWidth) > 1) setContentWidth(w);
      }}
    >
      <View>
        {!compactHeader ? (
          <Text className={kundaliDetailClasses.glance.heading} style={nepaliTextStyle(13)}>
            {card.title}
          </Text>
        ) : null}
        <Text className={kundaliDetailClasses.glance.introSpaced} style={nepaliTextStyle(12)}>
          {card.method}
        </Text>

        <View className="flex-row flex-wrap" style={{ gap: GLANCE_GAP }}>
          {[card.strongest, card.weakest].map((g) => (
            <GlanceTile key={g.label} layout={tileLayout} label={g.label}>
              <View className={cn(kundaliDetailClasses.glance.nameRow, "flex-wrap")}>
                <GrahaPlanetIcon graha={g.key as GrahaKey} size={28} />
                <Text className={kundaliDetailClasses.glance.name} style={nepaliTextStyle(17)}>
                  {g.name}
                </Text>
              </View>
              <View className={cn(kundaliDetailClasses.glance.badgeRow, "flex-wrap")}>
                <StatusBadge status={g.status} label={card.statusLabel(g.status)} />
                <Text className={kundaliDetailClasses.glance.sub} style={nepaliTextStyle(11)}>
                  {g.sub}
                </Text>
              </View>
            </GlanceTile>
          ))}

          <GlanceTile layout={tileLayout} label={card.average.label}>
            <Text className={cn(kundaliDetailClasses.glance.big, "font-num")} style={nepaliTextStyle(22)}>
              {card.average.rupas}
            </Text>
            <Text className={kundaliDetailClasses.glance.subTight} style={nepaliTextStyle(11)}>
              {card.average.virupas}
            </Text>
          </GlanceTile>

          <GlanceTile layout={tileLayout} label={card.threshold.label}>
            <Text className={cn(kundaliDetailClasses.glance.big, "font-num")} style={nepaliTextStyle(22)}>
              {card.threshold.count}
              <Text className={kundaliDetailClasses.glance.bigOf}>{card.threshold.of}</Text>
            </Text>
            <Text className={kundaliDetailClasses.glance.subTight} style={nepaliTextStyle(11)}>
              {card.threshold.sub}
            </Text>
            <View className={kundaliDetailClasses.glance.chips}>
              {card.threshold.chips.map((c) => {
                const color = STATUS_COLORS[c.status];
                return (
                  <View
                    key={c.status}
                    style={{
                      backgroundColor: c.active ? colorWithAlpha(color, 0.12) : colors.card,
                      borderColor: c.active ? colorWithAlpha(color, 0.35) : colors.border,
                    }}
                    className={kundaliDetailClasses.glance.chip}
                  >
                    <Text style={{ color: c.active ? color : colors.mutedForeground, ...nepaliTextStyle(10) }} className="text-caption">
                      {c.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </GlanceTile>
        </View>
      </View>

      <ShadbalaChart planets={card.planets} selectedKey={card.selectedKey} onSelect={card.select} yuddha={yuddha} />

      <View>
        <Text className={kundaliDetailClasses.glance.tableTitle} style={nepaliTextStyle(13)}>
          {card.tableTitle}
        </Text>

        <TableScrollShell stretch={TABLE_STRETCH} scroll={false} bordered rounded>
          <View className="w-full">
            <TableHeader>
              <TableHeaderCell flex={LABEL_COL} minWidth={Math.round(LABEL_COL * 0.72)} compact>
                <TableHeaderLabel compact uppercase={false}>
                  {card.balaHeader}
                </TableHeaderLabel>
              </TableHeaderCell>
              {card.planets.map((p) => (
                <TableHeaderCell
                  key={p.key}
                  flex={PLANET_COL}
                  minWidth={Math.round(PLANET_COL * 0.72)}
                  compact
                  onPress={() => card.select(p.key)}
                  className={p.key === card.selectedKey ? "bg-primary/10" : undefined}
                >
                  <View className="w-full flex-row items-center justify-end gap-1">
                    <GrahaPlanetIcon graha={p.key as GrahaKey} size={18} />
                    <TableHeaderLabel compact uppercase={false} numberOfLines={1}>
                      {card.grahaName(p.key)}
                    </TableHeaderLabel>
                  </View>
                </TableHeaderCell>
              ))}
            </TableHeader>

            {card.rows.map((row, i) => (
              <MatrixRow key={row.key} row={row} planetKeys={planetKeys} rowIndex={i} selectedKey={card.selectedKey} />
            ))}
          </View>
        </TableScrollShell>

        <Text className={kundaliDetailClasses.glance.tableNote} style={nepaliTextStyle(11)}>
          {card.note}
        </Text>

        {card.yuddhaLine ? (
          <Text className={kundaliDetailClasses.glance.warn} style={nepaliTextStyle(11)}>
            {card.yuddhaLine}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
